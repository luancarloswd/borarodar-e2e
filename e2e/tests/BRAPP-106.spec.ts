import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.BASE_URL ?? 'https://ride.borarodar.app';
const TEST_EMAIL = process.env.LOGIN_EMAIL ?? 'test@borarodar.app';

async function login(page: Page): Promise<void> {
  const password = process.env.STAGING_PASSWORD;
  if (!password) {
    throw new Error('STAGING_PASSWORD env var is required for BRAPP-106 tests');
  }

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle').catch(() => { /* best-effort */ });

  // Already authenticated? The Navbar exposes the user-menu button when logged in.
  if (await page.getByTestId('user-menu-btn').isVisible().catch(() => false)) {
    return;
  }

  // The home route is public, so reaching the login form requires either an explicit
  // navigation or a redirect from a protected route. Force /login when we're not there.
  if (!page.url().includes('/login')) {
    await page.goto(`${BASE_URL}/login`);
  }

  await page.getByTestId('email-input').fill(TEST_EMAIL);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-btn').click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
}

// Land on the detail page of an ACTIVE diary, creating one inline if the account has none.
// The add-entry FAB only renders when diary.status === 'active'.
async function ensureActiveDiaryDetail(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/diaries`);
  await page.locator('[data-testid="diaries-title"]').waitFor({ timeout: 20000 });

  // Filter to "Ativos" so the first card is guaranteed to be active.
  const ativosBtn = page.getByRole('button', { name: /^ativos$/i });
  if (await ativosBtn.isVisible().catch(() => false)) {
    await ativosBtn.click();
  }

  // Let the list shell (populated list OR empty-state) settle.
  await page
    .locator('[data-testid="diaries-list"], [data-testid="diaries-empty-state"]')
    .first()
    .waitFor({ timeout: 15000 });

  const cardCount = await page.locator('[data-testid="diary-card"]').count();

  if (cardCount > 0) {
    await page.locator('[data-testid="diary-card"]').first().click();
  } else {
    // No active diary — create one so the FAB exists.
    await page.goto(`${BASE_URL}/diaries/new`);
    await page.locator('input#title').waitFor({ timeout: 15000 });
    await page.fill('input#title', `BRAPP-106 e2e ${Date.now()}`);
    await page.locator('button[type="submit"]').click();
  }

  // The detail view is ready once the timeline OR empty-entries placeholder renders.
  await page
    .locator('[data-testid="diary-timeline"], [data-testid="diary-empty-entries"]')
    .first()
    .waitFor({ timeout: 30000 });
}

async function openComposerOnFirstDiary(page: Page): Promise<void> {
  await ensureActiveDiaryDetail(page);

  // FAB on the diary detail page opens the EntryComposer modal.
  const fab = page.locator('[data-testid="add-entry-fab"]');
  await fab.waitFor({ timeout: 20000 });
  await fab.click();

  // Composer is open once the type-picker grid renders.
  await page.getByRole('button', { name: /^audio$/i }).waitFor({ timeout: 10000 });
}

const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_AUDIO_MIME = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/wav'];

test.describe('BRAPP-106: Fix Diary Entry Add Button Reopens Same Picker for Audio/Video Types', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('AC1: User selects Áudio type → file picker accepts audio MIME types (not image/*)', async ({ page }) => {
    await openComposerOnFirstDiary(page);

    await page.getByRole('button', { name: /^audio$/i }).click();

    // The hidden audio file input is rendered inside the "Escolher arquivo" label
    const audioInput = page.locator('input[type="file"]').first();
    await audioInput.waitFor({ state: 'attached', timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-1-before.png', fullPage: true });

    const acceptValue = await audioInput.getAttribute('accept');

    expect(acceptValue, 'audio picker must NOT default to image/*').not.toBe('image/*');
    expect(acceptValue ?? '', 'audio picker accept must include audio MIME types').toMatch(/audio\//);

    // Every advertised MIME on the audio input must be an audio type
    const advertised = (acceptValue ?? '').split(',').map((m) => m.trim()).filter(Boolean);
    expect(advertised.length).toBeGreaterThan(0);
    for (const mime of advertised) {
      expect(ALLOWED_AUDIO_MIME).toContain(mime);
    }

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-1-picker.png', fullPage: true });
  });

  test('AC2: User selects an audio file under 25 MB → file is accepted client-side and submit becomes enabled', async ({ page }) => {
    await openComposerOnFirstDiary(page);

    await page.getByRole('button', { name: /^audio$/i }).click();

    const audioInput = page.locator('input[type="file"]').first();
    await audioInput.waitFor({ state: 'attached', timeout: 10000 });

    // Tiny in-memory audio payload — large enough to be a real file, well under the 25 MB limit
    const audioBuffer = Buffer.alloc(64 * 1024, 0); // 64 KB of silence
    await audioInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: audioBuffer,
    });

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-2-uploading.png', fullPage: true });

    // Client-side validation must NOT raise the size/format error for this file
    const errorAlert = page.getByRole('alert').filter({ hasText: /muito grande|não suportado/i });
    await expect(errorAlert).toHaveCount(0);

    // The selected file's name must appear in the composer (proves it was accepted)
    await expect(page.getByText('test-audio.mp3')).toBeVisible({ timeout: 10000 });

    // The "Adicionar entrada" submit button must become enabled
    const submitBtn = page.getByRole('button', { name: /adicionar entrada/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-2-after.png', fullPage: true });
  });

  test('AC3: User selects Vídeo type and an mp4 under 100 MB → picker accepts video MIME types and the file is accepted', async ({ page }) => {
    await openComposerOnFirstDiary(page);

    await page.getByRole('button', { name: /^video$/i }).click();

    const videoInput = page.locator('input[type="file"]').first();
    await videoInput.waitFor({ state: 'attached', timeout: 10000 });

    // The video picker accept attribute must include video MIME types and never be image/*
    const acceptValue = await videoInput.getAttribute('accept');
    expect(acceptValue, 'video picker must NOT default to image/*').not.toBe('image/*');
    expect(acceptValue ?? '', 'video picker accept must include video MIME types').toMatch(/video\//);

    const advertised = (acceptValue ?? '').split(',').map((m) => m.trim()).filter(Boolean);
    expect(advertised.length).toBeGreaterThan(0);
    for (const mime of advertised) {
      expect(ALLOWED_VIDEO_MIME).toContain(mime);
    }

    // Provide a small mp4 buffer (well under 100 MB) and verify it is accepted client-side
    const videoBuffer = Buffer.alloc(128 * 1024, 0); // 128 KB
    await videoInput.setInputFiles({
      name: 'test-video.mp4',
      mimeType: 'video/mp4',
      buffer: videoBuffer,
    });

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-3-uploading.png', fullPage: true });

    const errorAlert = page.getByRole('alert').filter({ hasText: /muito grande|não suportado/i });
    await expect(errorAlert).toHaveCount(0);

    await expect(page.getByText('test-video.mp4')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-3-after.png', fullPage: true });
  });

  test('AC4: User attempts to upload a >100 MB video → submission is blocked with a clear localized error and no file is attached', async ({ page }) => {
    await openComposerOnFirstDiary(page);

    await page.getByRole('button', { name: /^video$/i }).click();

    const videoInput = page.locator('input[type="file"]').first();
    await videoInput.waitFor({ state: 'attached', timeout: 10000 });

    // 100 MB + 1 byte — just over the limit so the size guard rejects it
    const oversized = Buffer.alloc(100 * 1024 * 1024 + 1, 0);
    await videoInput.setInputFiles({
      name: 'test-video-oversized.mp4',
      mimeType: 'video/mp4',
      buffer: oversized,
    });

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-4-error.png', fullPage: true });

    // A localized "muito grande" error must be visible
    const errorAlert = page.getByRole('alert').filter({ hasText: /muito grande/i });
    await expect(errorAlert).toBeVisible({ timeout: 10000 });

    const errorText = await errorAlert.textContent();
    expect(errorText?.trim().length ?? 0).toBeGreaterThan(0);

    // The rejected file's name must NOT be shown — no attachment occurred
    await expect(page.getByText('test-video-oversized.mp4')).toHaveCount(0);

    // The submit button must remain disabled because no valid file is attached
    const submitBtn = page.getByRole('button', { name: /adicionar entrada/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('AC5: User selects Foto type → photo picker accepts image/* (regression check, photo flow intact)', async ({ page }) => {
    await openComposerOnFirstDiary(page);

    await page.getByRole('button', { name: /^foto$/i }).click();

    const photoInput = page.locator('input[type="file"]').first();
    await photoInput.waitFor({ state: 'attached', timeout: 10000 });

    const acceptValue = await photoInput.getAttribute('accept');
    expect(acceptValue ?? '', 'photo picker accept must allow images').toMatch(/image/);

    // Provide a tiny in-memory JPEG-typed payload and confirm client acceptance
    const photoBuffer = Buffer.alloc(32 * 1024, 0); // 32 KB
    await photoInput.setInputFiles({
      name: 'test-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: photoBuffer,
    });

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-5-uploading.png', fullPage: true });

    const errorAlert = page.getByRole('alert').filter({ hasText: /muito grande|não suportado/i });
    await expect(errorAlert).toHaveCount(0);

    await expect(page.getByText('test-photo.jpg')).toBeVisible({ timeout: 10000 });

    const submitBtn = page.getByRole('button', { name: /adicionar entrada/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-5-after.png', fullPage: true });
  });
});
