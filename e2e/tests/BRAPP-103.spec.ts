import { test, expect, Page, Locator } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { deflateSync } from 'zlib';

const STAGING_URL = 'https://ride.borarodar.app';
const STAGING_USER = 'test@borarodar.app';
const STAGING_PASSWORD = process.env.STAGING_PASSWORD;
if (!STAGING_PASSWORD) {
  throw new Error('STAGING_PASSWORD env var is required for BRAPP-103 E2E tests');
}

// Frontend (VisitProofUploader) rejects:
//   - non-image MIME types
//   - files > 10 MB
//   - images smaller than 400x300
// So we synthesise small but valid PNGs at 800x600 and pipe a .txt file for AC5.
function crc32(buf: Buffer): number {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(width: number, height: number, color: [number, number, number]): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(2, 9);   // color type RGB
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace
  const rowBytes = 1 + width * 3;
  const raw = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowBytes] = 0;
    for (let x = 0; x < width; x++) {
      const i = y * rowBytes + 1 + x * 3;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
    }
  }
  const compressed = deflateSync(raw);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeTempFile(name: string, contents: Buffer): string {
  const p = join(tmpdir(), `BRAPP-103-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
  writeFileSync(p, contents);
  return p;
}

// NOTE: A shared login helper / Playwright `storageState` does not yet exist in this repo.
// When one is introduced, prefer it. The unauthenticated homepage at STAGING_URL renders the
// public community feed (no login form), so the helper navigates straight to /login and uses
// the Portuguese labels rendered by the app.
async function login(page: Page): Promise<void> {
  await page.goto(`${STAGING_URL}/login`, { waitUntil: 'domcontentloaded' });
  const emailField = page.getByLabel(/e-?mail/i).first();
  await emailField.waitFor({ state: 'visible', timeout: 15000 });
  await emailField.fill(STAGING_USER);
  await page.getByLabel(/senha|password/i).first().fill(STAGING_PASSWORD!);
  await page.getByRole('button', { name: /entrar|sign in|log in/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

// Navigate to the visited-destinations checklist (the surface that owns mark-visited + photo proof).
async function gotoDestinations(page: Page): Promise<void> {
  await page.goto(`${STAGING_URL}/destinations`, { waitUntil: 'domcontentloaded' });
  // Wait for either a row or the empty-state to render so we know the list mounted.
  await page.waitForSelector(
    '[data-testid="municipality-row"], [data-testid="checklist-empty-state"]',
    { timeout: 25000 },
  );
}

function unvisitedRow(page: Page): Locator {
  return page
    .locator('[data-testid="municipality-row"]')
    .filter({ has: page.locator('[data-testid="municipality-toggle"][aria-checked="false"]') })
    .first();
}

function visitedRow(page: Page): Locator {
  return page
    .locator('[data-testid="municipality-row"]')
    .filter({ has: page.locator('[data-testid="municipality-toggle"][aria-checked="true"]') })
    .first();
}

async function setStatusFilter(page: Page, which: 'todos' | 'visitados' | 'pendentes'): Promise<void> {
  const btn = page.locator(`[data-testid="filter-${which}"]`);
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    // Give the virtualised list a tick to recompute.
    await page.waitForTimeout(300);
  }
}

// Click an unvisited row → wait for VisitProofPrompt → click "Adicionar foto" → uploader is open.
async function markUnvisitedAndOpenUploader(page: Page): Promise<void> {
  await setStatusFilter(page, 'pendentes');
  await unvisitedRow(page).click({ timeout: 15000 });
  await page.locator('[data-testid="add-proof-photo-btn"]').click({ timeout: 20000 });
  await page.waitForSelector('[data-testid="close-uploader-btn"]', { timeout: 15000 });
}

// Open the visit-detail modal for an already-visited destination, then open the uploader from
// the empty "Adicionar" slot.
async function openUploaderForVisited(page: Page): Promise<void> {
  await setStatusFilter(page, 'visitados');
  await visitedRow(page).locator('[data-testid="proof-camera-btn"]').click({ timeout: 15000 });
  await page.locator('[data-testid="add-photo-slot-btn"]').click({ timeout: 15000 });
  await page.waitForSelector('[data-testid="close-uploader-btn"]', { timeout: 15000 });
}

// Ensure we land on the uploader regardless of the destination's current state.
async function openUploader(page: Page): Promise<void> {
  await setStatusFilter(page, 'pendentes');
  if (await unvisitedRow(page).count() > 0) {
    await markUnvisitedAndOpenUploader(page);
    return;
  }
  await openUploaderForVisited(page);
}

async function chooseFile(page: Page, filePath: string): Promise<void> {
  // The uploader's <input type="file"> is hidden — Playwright can still set its files.
  await page.locator('input[type="file"]').first().setInputFiles(filePath);
}

async function submitUpload(page: Page): Promise<void> {
  await page.locator('[data-testid="upload-photo-btn"]').click({ timeout: 15000 });
}

// The uploader renders an in-modal success panel ("Foto enviada com sucesso!") and then
// auto-closes ~1.2s later. Treat either signal as success.
async function expectUploadSuccessOrClosed(page: Page): Promise<void> {
  const success = page.getByText(/Foto enviada com sucesso/i);
  const closer = page.locator('[data-testid="close-uploader-btn"]');
  await expect
    .poll(
      async () =>
        (await success.isVisible().catch(() => false)) ||
        !(await closer.isVisible().catch(() => false)),
      { timeout: 30000 },
    )
    .toBe(true);
}

async function readPhotoCount(page: Page): Promise<number> {
  // Visit-detail modal renders "Fotos (n/3)" once the proof loads.
  const header = page.getByText(/Fotos \(\d+\/3\)/);
  await header.waitFor({ state: 'visible', timeout: 15000 });
  const text = (await header.textContent()) ?? '';
  const m = text.match(/\((\d+)\/3\)/);
  return m ? Number(m[1]) : 0;
}

async function closeAnyOpenModal(page: Page): Promise<void> {
  const closers = [
    '[data-testid="close-uploader-btn"]',
    '[data-testid="close-visit-detail-btn"]',
    '[data-testid="dismiss-proof-prompt-btn"]',
  ];
  for (const sel of closers) {
    const el = page.locator(sel);
    if (await el.isVisible().catch(() => false)) {
      await el.click().catch(() => undefined);
      await page.waitForTimeout(200);
    }
  }
}

test.describe('BRAPP-103: Fix 500 Error When Uploading Photo After Marking a Destination', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('AC1: User marks a destination as visited and uploads a photo for the first time → success confirmation appears and the photo is visible in the destination\'s visit proofs', async ({ page }) => {
    const serverErrors: { url: string; status: number }[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500) serverErrors.push({ url: resp.url(), status: resp.status() });
    });

    await gotoDestinations(page);
    await markUnvisitedAndOpenUploader(page);

    const photoPath = writeTempFile('ac1.png', makePng(800, 600, [180, 200, 220]));
    await chooseFile(page, photoPath);
    await submitUpload(page);
    await expectUploadSuccessOrClosed(page);

    // After success the modal auto-closes; reopen the destination's visit-detail to confirm
    // the photo lives in the proof set.
    await closeAnyOpenModal(page);
    await setStatusFilter(page, 'visitados');
    await visitedRow(page).locator('[data-testid="proof-camera-btn"]').click({ timeout: 15000 });
    expect(await readPhotoCount(page)).toBeGreaterThanOrEqual(1);

    expect(
      serverErrors,
      `No 5xx responses expected, got: ${serverErrors.map((e) => `${e.status} ${e.url}`).join(' | ')}`,
    ).toHaveLength(0);

    await page.screenshot({ path: 'screenshots/BRAPP-103-ac-1.png', fullPage: true });
  });

  test('AC2: User uploads a second photo to a destination already marked as visited → upload completes successfully without a 500 error and both photos are visible', async ({ page }) => {
    const serverErrors: { url: string; status: number }[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500) serverErrors.push({ url: resp.url(), status: resp.status() });
    });

    await gotoDestinations(page);

    // Need a destination that is visited AND has fewer than 3 photos already.
    // Bootstrap one if no candidate exists by marking + uploading once.
    await setStatusFilter(page, 'visitados');
    if (await visitedRow(page).count() === 0) {
      await openUploader(page);
      await chooseFile(page, writeTempFile('ac2-bootstrap.png', makePng(800, 600, [120, 160, 200])));
      await submitUpload(page);
      await expectUploadSuccessOrClosed(page);
      await closeAnyOpenModal(page);
      await setStatusFilter(page, 'visitados');
    }

    // Open the visit-detail modal and capture the starting photo count.
    await visitedRow(page).locator('[data-testid="proof-camera-btn"]').click({ timeout: 15000 });
    const startCount = await readPhotoCount(page);

    // If already at the 3-photo cap, AC2 cannot exercise an additive upload here. Skip rather
    // than assert a false positive — the AC is about adding a *second* photo successfully.
    if (startCount >= 3) {
      test.skip(true, 'Visit-detail already at 3/3 photos; cannot add a second one.');
      return;
    }

    await page.locator('[data-testid="add-photo-slot-btn"]').click({ timeout: 15000 });
    await page.waitForSelector('[data-testid="close-uploader-btn"]', { timeout: 15000 });

    // Distinct content so it cannot collide on a content hash.
    const secondPhoto = writeTempFile(
      'ac2-second.png',
      makePng(800, 600, [50 + Math.floor(Math.random() * 150), 90, 140]),
    );
    await chooseFile(page, secondPhoto);
    await submitUpload(page);
    await expectUploadSuccessOrClosed(page);

    // Reopen the visit-detail modal and confirm the photo count grew.
    await closeAnyOpenModal(page);
    await setStatusFilter(page, 'visitados');
    await visitedRow(page).locator('[data-testid="proof-camera-btn"]').click({ timeout: 15000 });
    await expect
      .poll(async () => readPhotoCount(page), { timeout: 15000 })
      .toBeGreaterThan(startCount);

    expect(
      serverErrors,
      `No 5xx responses expected, got: ${serverErrors.map((e) => `${e.status} ${e.url}`).join(' | ')}`,
    ).toHaveLength(0);

    await page.screenshot({ path: 'screenshots/BRAPP-103-ac-2.png', fullPage: true });
  });

  test('AC3: User attempts to upload the exact same photo file twice in succession to the same destination → second attempt is handled gracefully (either deduplicated or rejected with a clear message) instead of returning a server error', async ({ page }) => {
    const serverErrors: { url: string; status: number }[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500) serverErrors.push({ url: resp.url(), status: resp.status() });
    });

    await gotoDestinations(page);

    // Same content for both upload attempts — colour seeded with a stable marker.
    const duplicatePath = writeTempFile('ac3-duplicate.png', makePng(800, 600, [77, 88, 99]));

    await openUploader(page);
    await chooseFile(page, duplicatePath);
    await submitUpload(page);
    await expectUploadSuccessOrClosed(page);
    await closeAnyOpenModal(page);

    // Snapshot current count for the same destination.
    await setStatusFilter(page, 'visitados');
    await visitedRow(page).locator('[data-testid="proof-camera-btn"]').click({ timeout: 15000 });
    const countAfterFirst = await readPhotoCount(page);

    if (countAfterFirst < 3) {
      // Re-open the uploader on the same proof to attempt the duplicate-content upload.
      await page.locator('[data-testid="add-photo-slot-btn"]').click({ timeout: 15000 });
      await page.waitForSelector('[data-testid="close-uploader-btn"]', { timeout: 15000 });
      await chooseFile(page, duplicatePath);
      await submitUpload(page);
    } else {
      // Already at cap on this destination; exercise the duplicate-content path against a
      // fresh destination instead. If none is available, the cap path above is sufficient.
      await closeAnyOpenModal(page);
      await setStatusFilter(page, 'pendentes');
      if (await unvisitedRow(page).count() === 0) {
        test.skip(true, 'No fresh destination available to exercise duplicate-content path.');
        return;
      }
      await markUnvisitedAndOpenUploader(page);
      await chooseFile(page, duplicatePath);
      await submitUpload(page);
    }

    // Acceptable: success, a dedup-style error message, or any validation alert — never a 5xx.
    const successText = page.getByText(/Foto enviada com sucesso/i);
    const errorAlert = page.locator('[role="alert"]');
    await expect
      .poll(
        async () =>
          (await successText.isVisible().catch(() => false)) ||
          (await errorAlert.first().isVisible().catch(() => false)) ||
          !(await page.locator('[data-testid="close-uploader-btn"]').isVisible().catch(() => false)),
        { timeout: 30000 },
      )
      .toBe(true);

    expect(
      serverErrors,
      `Duplicate upload must not produce 5xx, got: ${serverErrors.map((e) => `${e.status} ${e.url}`).join(' | ')}`,
    ).toHaveLength(0);

    await page.screenshot({ path: 'screenshots/BRAPP-103-ac-3.png', fullPage: true });
  });

  test('AC4: User uploads a photo and refreshes the page → the uploaded photo persists and the destination remains marked as visited with correct progress count', async ({ page }) => {
    const serverErrors: { url: string; status: number }[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500) serverErrors.push({ url: resp.url(), status: resp.status() });
    });

    await gotoDestinations(page);
    await openUploader(page);

    const photoPath = writeTempFile(
      'ac4-persist.png',
      makePng(800, 600, [40 + Math.floor(Math.random() * 200), 130, 110]),
    );
    await chooseFile(page, photoPath);
    await submitUpload(page);
    await expectUploadSuccessOrClosed(page);
    await closeAnyOpenModal(page);

    // Capture the photo count and visited-row presence before reload.
    await setStatusFilter(page, 'visitados');
    const visitedCountBefore = await visitedRow(page).count();
    expect(visitedCountBefore).toBeGreaterThan(0);
    await visitedRow(page).locator('[data-testid="proof-camera-btn"]').click({ timeout: 15000 });
    const photosBeforeReload = await readPhotoCount(page);
    await closeAnyOpenModal(page);

    // Hard reload.
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="municipality-row"]', { timeout: 25000 });
    await setStatusFilter(page, 'visitados');

    // Visited rows must still exist, and the proof we just created must still be there.
    await expect
      .poll(async () => visitedRow(page).count(), { timeout: 15000 })
      .toBeGreaterThanOrEqual(visitedCountBefore);

    await visitedRow(page).locator('[data-testid="proof-camera-btn"]').click({ timeout: 15000 });
    const photosAfterReload = await readPhotoCount(page);
    expect(photosAfterReload).toBeGreaterThanOrEqual(photosBeforeReload);

    expect(
      serverErrors,
      `No 5xx responses expected, got: ${serverErrors.map((e) => `${e.status} ${e.url}`).join(' | ')}`,
    ).toHaveLength(0);

    await page.screenshot({ path: 'screenshots/BRAPP-103-ac-4.png', fullPage: true });
  });

  test('AC5: User uploads a photo with an unsupported file type or oversized file → a clear validation error message is shown and no 500 error occurs', async ({ page }) => {
    const serverErrors: { url: string; status: number }[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500) serverErrors.push({ url: resp.url(), status: resp.status() });
    });

    await gotoDestinations(page);
    await openUploader(page);

    // Unsupported file type: a plain .txt file masquerading as an image upload. The frontend
    // rejects on MIME type before any network request — exactly the shape AC5 calls for.
    const badFilePath = writeTempFile('ac5-not-an-image.txt', Buffer.from('this is not an image'));
    await chooseFile(page, badFilePath);

    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert.first()).toBeVisible({ timeout: 15000 });
    const errorText = (await errorAlert.first().textContent())?.trim() ?? '';
    expect(errorText.length).toBeGreaterThan(0);

    expect(
      serverErrors,
      `Validation failure must not surface as 5xx, got: ${serverErrors.map((e) => `${e.status} ${e.url}`).join(' | ')}`,
    ).toHaveLength(0);

    await page.screenshot({ path: 'screenshots/BRAPP-103-ac-5.png', fullPage: true });
  });
});
