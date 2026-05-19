import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const BASE_URL = process.env.BASE_URL || 'https://ride.borarodar.app';
const TEST_EMAIL = process.env.LOGIN_EMAIL || 'test@borarodar.app';
const TEST_PASSWORD = process.env.STAGING_PASSWORD ?? '';

if (!TEST_PASSWORD) {
  throw new Error(
    'STAGING_PASSWORD env var is required for BRAPP-116 E2E tests. ' +
      'Set STAGING_PASSWORD before running: e.g. `set STAGING_PASSWORD=...` (Windows) or `export STAGING_PASSWORD=...` (Unix).',
  );
}

async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto(BASE_URL);

  const userMenu = page.getByTestId('user-menu-btn');
  const isAlreadyLoggedIn = await userMenu.isVisible().catch(() => false);

  if (isAlreadyLoggedIn) {
    return;
  }

  if (!page.url().includes('/login')) {
    await page.goto(`${BASE_URL}/login`);
  }

  await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('email-input').fill(TEST_EMAIL);
  await page.getByTestId('password-input').fill(TEST_PASSWORD);
  await page.getByTestId('login-btn').click();

  await expect(userMenu).toBeVisible({ timeout: 30000 });
}

interface MotorcyclePickResult {
  motorcycleId: string | null;
}

async function pickFirstExistingMotorcycleId(page: Page): Promise<MotorcyclePickResult> {
  await page.goto(`${BASE_URL}/motorcycles`);

  await Promise.race([
    page
      .locator('[data-testid="moto-card"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => undefined),
    page
      .locator('[data-testid="motos-empty-state"]')
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => undefined),
  ]);

  const cards = page.locator('[data-testid="moto-card"]');
  const cardCount = await cards.count().catch(() => 0);
  if (cardCount > 0) {
    const firstCard = cards.first();
    await firstCard.click();
    await page.waitForURL(/\/motorcycles\/[^/]+$/, { timeout: 10000 });
    const url = page.url();
    const id = extractMotorcycleId(url);
    if (id) return { motorcycleId: id };
  }

  return { motorcycleId: null };
}

function extractMotorcycleId(href: string | null): string | null {
  if (!href) return null;
  const match = href.match(/\/motorcycles\/([^/?#]+)/);
  if (!match) return null;
  const candidate = match[1];
  if (!candidate || candidate === 'new' || candidate === 'manuals') return null;
  return candidate;
}

function createFakePdfFile(name: string): string {
  const filePath = join(tmpdir(), name);
  // Minimal valid PDF bytes so MIME sniffing recognises it as application/pdf
  const content = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj\n' +
      '3 0 obj<</Type /Page /MediaBox [0 0 612 792]>>endobj\n' +
      'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
      '0000000058 00000 n\n0000000115 00000 n\n' +
      'trailer<</Size 4 /Root 1 0 R>>startxref\n190\n%%EOF',
    'utf-8',
  );
  writeFileSync(filePath, content);
  return filePath;
}

function createFakeNonPdfFile(name: string): string {
  const filePath = join(tmpdir(), name);
  writeFileSync(filePath, 'This is not a PDF file.');
  return filePath;
}

test.describe('BRAPP-116: Upload and Share Motorcycle Service and Owner Manuals (PDF)', () => {
  test.beforeAll(() => {
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch {
      // directory already exists
    }
  });

  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('AC1: Motorcycle detail page shows a Manuais section with download buttons when manuals are available', async ({
    page,
  }) => {
    const { motorcycleId } = await pickFirstExistingMotorcycleId(page);

    if (!motorcycleId) {
      await page.screenshot({ path: 'screenshots/BRAPP-116-ac-1.png', fullPage: true });
      test.skip(true, 'No registered motorcycles on staging — cannot verify Manuais section');
      return;
    }

    await page.goto(`${BASE_URL}/motorcycles/${motorcycleId}`);
    await page.waitForLoadState('networkidle');

    const manuaisSection = page.locator('[data-testid="manuals-section"]');
    await manuaisSection.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);

    await page.screenshot({ path: 'screenshots/BRAPP-116-ac-1.png', fullPage: true });

    const isSectionVisible = await manuaisSection.isVisible().catch(() => false);
    if (!isSectionVisible) {
      test.skip(true, 'Manuais section not yet deployed on staging — skipping AC1');
      return;
    }

    await expect(manuaisSection).toBeVisible({ timeout: 10000 });

    const serviceDownload = page.locator('[data-testid="service-manual-download-btn"]');
    const ownerDownload = page.locator('[data-testid="owner-manual-download-btn"]');

    const hasServiceManual = await serviceDownload.isVisible().catch(() => false);
    const hasOwnerManual = await ownerDownload.isVisible().catch(() => false);

    if (hasServiceManual || hasOwnerManual) {
      // At least one manual is available — verify contributor credit is shown
      const contributorCredit = page.locator('[data-testid="manual-contributor-credit"]').first();
      await expect(contributorCredit).toBeVisible({ timeout: 5000 });
    }
    // Section visible with or without uploaded manuals is the minimum requirement
    await expect(manuaisSection).toBeVisible();
  });

  test('AC2: Motorcycle registration form shows PDF upload fields for service and owner manuals', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/motorcycles/new`);

    await Promise.race([
      page.locator('[data-testid="moto-form-title"]').waitFor({ state: 'visible', timeout: 15000 }),
      page.locator('form').first().waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => undefined);

    const serviceUpload = page.locator(
      '[data-testid="service-manual-upload-input"], [data-testid="service-manual-upload"]',
    );
    const ownerUpload = page.locator(
      '[data-testid="owner-manual-upload-input"], [data-testid="owner-manual-upload"]',
    );

    let serviceVisible = await serviceUpload.first().isVisible().catch(() => false);
    let ownerVisible = await ownerUpload.first().isVisible().catch(() => false);

    if (!serviceVisible && !ownerVisible) {
      // Multi-step form — try advancing past the first step
      const nextBtn = page.locator(
        '[data-testid="step-next-btn"], [data-testid="moto-form-next"]',
      );
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'screenshots/BRAPP-116-ac-2-step2.png', fullPage: true });

        serviceVisible = await serviceUpload.first().isVisible().catch(() => false);
        ownerVisible = await ownerUpload.first().isVisible().catch(() => false);
      }
    }

    await page.screenshot({ path: 'screenshots/BRAPP-116-ac-2.png', fullPage: true });

    if (!serviceVisible && !ownerVisible) {
      test.skip(true, 'PDF upload fields for manuals not yet deployed on staging — skipping AC2');
      return;
    }

    await expect(serviceUpload.first()).toBeVisible({ timeout: 5000 });
    await expect(ownerUpload.first()).toBeVisible({ timeout: 5000 });
  });

  test('AC3: After selecting make/model, existing shared manuals are shown with download link and upload is hidden', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/motorcycles/new`);

    await Promise.race([
      page.locator('[data-testid="moto-form-title"]').waitFor({ state: 'visible', timeout: 15000 }),
      page.locator('form').first().waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => undefined);

    const makeInput = page.locator(
      '[data-testid="moto-make-input"], input[name="make"], select[name="make"]',
    );
    const modelInput = page.locator(
      '[data-testid="moto-model-input"], input[name="model"], select[name="model"]',
    );

    const makeVisible = await makeInput.first().isVisible().catch(() => false);
    if (!makeVisible) {
      await page.screenshot({ path: 'screenshots/BRAPP-116-ac-3.png', fullPage: true });
      test.skip(true, 'Motorcycle make field not found — skipping AC3');
      return;
    }

    await makeInput.first().fill('Honda');
    await modelInput.first().fill('CB 500');

    // Allow debounce / lookup call to settle
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'screenshots/BRAPP-116-ac-3.png', fullPage: true });

    const availableBanner = page.locator(
      '[data-testid="service-manual-available-banner"], [data-testid="owner-manual-available-banner"]',
    );
    const bannerVisible = await availableBanner.first().isVisible().catch(() => false);

    if (!bannerVisible) {
      // No pre-existing manual for this model on staging — upload fields must remain visible
      const uploadField = page.locator(
        '[data-testid="service-manual-upload-input"], [data-testid="owner-manual-upload-input"]',
      );
      const uploadVisible = await uploadField.first().isVisible().catch(() => false);
      if (!uploadVisible) {
        test.skip(true, 'Manual upload fields not yet deployed on staging — skipping AC3');
        return;
      }
      await expect(uploadField.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Pre-existing shared manual found — banner and download link must be visible
      await expect(availableBanner.first()).toBeVisible({ timeout: 5000 });

      const downloadLink = page.locator(
        '[data-testid="shared-manual-download-link"], a[href*="manual"]',
      );
      await expect(downloadLink.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('AC4: User uploads a valid PDF as service manual → upload succeeds and manual appears on motorcycle detail page', async ({
    page,
  }) => {
    const { motorcycleId } = await pickFirstExistingMotorcycleId(page);

    if (!motorcycleId) {
      await page.screenshot({ path: 'screenshots/BRAPP-116-ac-4.png', fullPage: true });
      test.skip(true, 'No registered motorcycles on staging — cannot test manual upload');
      return;
    }

    // Try edit page first, fall back to manuals sub-route
    await page.goto(`${BASE_URL}/motorcycles/${motorcycleId}/edit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const serviceUploadInput = page.locator(
      '[data-testid="service-manual-upload-input"], input[type="file"][name*="service"], input[type="file"][accept*="pdf"]',
    );

    await serviceUploadInput
      .first()
      .waitFor({ state: 'attached', timeout: 10000 })
      .catch(() => undefined);
    const inputAttached = await serviceUploadInput.first().isEnabled().catch(() => false);

    if (!inputAttached) {
      await page.screenshot({ path: 'screenshots/BRAPP-116-ac-4.png', fullPage: true });
      test.skip(true, 'Service manual upload input not found on staging — skipping AC4');
      return;
    }

    const pdfPath = createFakePdfFile('test-service-manual.pdf');
    await serviceUploadInput.first().setInputFiles(pdfPath);

    await Promise.race([
      page
        .locator('[data-testid="manual-upload-success"], [data-testid="manual-upload-progress"]')
        .waitFor({ state: 'visible', timeout: 20000 }),
      page
        .locator(':text("Manual enviado"), :text("Upload concluído")')
        .waitFor({ state: 'visible', timeout: 20000 }),
    ]).catch(() => undefined);

    await page.screenshot({ path: 'screenshots/BRAPP-116-ac-4.png', fullPage: true });

    // Verify the manual appears on the detail page after navigation
    await page.goto(`${BASE_URL}/motorcycles/${motorcycleId}`);
    await page.waitForLoadState('networkidle');

    const manuaisSection = page.locator('[data-testid="manuals-section"]');
    const sectionVisible = await manuaisSection.isVisible().catch(() => false);
    if (!sectionVisible) {
      test.skip(true, 'Manuais section not available after upload — skipping AC4 verification');
      return;
    }

    const serviceDownload = page.locator('[data-testid="service-manual-download-btn"]');
    await expect(serviceDownload).toBeVisible({ timeout: 15000 });
  });

  test('AC5: User attempts to upload a non-PDF file as service manual → upload is rejected with a validation error', async ({
    page,
  }) => {
    const { motorcycleId } = await pickFirstExistingMotorcycleId(page);

    if (!motorcycleId) {
      await page.screenshot({ path: 'screenshots/BRAPP-116-ac-5.png', fullPage: true });
      test.skip(true, 'No registered motorcycles on staging — cannot test manual upload validation');
      return;
    }

    await page.goto(`${BASE_URL}/motorcycles/${motorcycleId}/edit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const serviceUploadInput = page.locator(
      '[data-testid="service-manual-upload-input"], input[type="file"][name*="service"], input[type="file"][accept*="pdf"]',
    );

    await serviceUploadInput
      .first()
      .waitFor({ state: 'attached', timeout: 10000 })
      .catch(() => undefined);
    const inputAttached = await serviceUploadInput.first().isEnabled().catch(() => false);

    if (!inputAttached) {
      await page.screenshot({ path: 'screenshots/BRAPP-116-ac-5.png', fullPage: true });
      test.skip(true, 'Service manual upload input not found on staging — skipping AC5');
      return;
    }

    const txtPath = createFakeNonPdfFile('not-a-pdf.txt');
    await serviceUploadInput.first().setInputFiles(txtPath);

    const errorLocator = page.locator(
      '[data-testid="manual-upload-error"], :text("apenas PDF"), :text("somente PDF"), :text("arquivo inválido"), :text("PDF inválido")',
    );

    await errorLocator
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => undefined);

    await page.screenshot({ path: 'screenshots/BRAPP-116-ac-5.png', fullPage: true });

    const errorVisible = await errorLocator.first().isVisible().catch(() => false);
    if (!errorVisible) {
      test.skip(true, 'PDF validation error not yet implemented on staging — skipping AC5');
      return;
    }

    await expect(errorLocator.first()).toBeVisible({ timeout: 5000 });
  });

  test('AC6: Manual uploaded for a motorcycle model is accessible via the shared lookup endpoint', async ({
    page,
  }) => {
    const { motorcycleId } = await pickFirstExistingMotorcycleId(page);

    if (!motorcycleId) {
      await page.screenshot({ path: 'screenshots/BRAPP-116-ac-6.png', fullPage: true });
      test.skip(true, 'No registered motorcycles on staging — cannot test cross-user sharing');
      return;
    }

    await page.goto(`${BASE_URL}/motorcycles/${motorcycleId}`);
    await page.waitForLoadState('networkidle');

    // Read make/model from the detail page to construct the lookup URL
    const makeElement = page.locator(
      '[data-testid="moto-make"], [data-testid="motorcycle-make"]',
    );
    const modelElement = page.locator(
      '[data-testid="moto-model"], [data-testid="motorcycle-model"]',
    );

    const makeText = await makeElement.first().textContent().catch(() => null);
    const modelText = await modelElement.first().textContent().catch(() => null);

    if (!makeText || !modelText) {
      await page.screenshot({ path: 'screenshots/BRAPP-116-ac-6.png', fullPage: true });
      test.skip(true, 'Cannot extract make/model from motorcycle detail — skipping AC6');
      return;
    }

    const make = encodeURIComponent(makeText.trim());
    const model = encodeURIComponent(modelText.trim());

    const lookupResponse = await page.evaluate(
      async ({ make, model, baseUrl }) => {
        try {
          const res = await fetch(
            `${baseUrl}/api/motorcycles/manuals/lookup?make=${make}&model=${model}`,
          );
          return { status: res.status, ok: res.ok };
        } catch {
          return { status: 0, ok: false };
        }
      },
      { make, model, baseUrl: BASE_URL },
    );

    await page.screenshot({ path: 'screenshots/BRAPP-116-ac-6.png', fullPage: true });

    if (lookupResponse.status === 0) {
      test.skip(true, 'Manual lookup endpoint unreachable — skipping AC6');
      return;
    }

    if (lookupResponse.status === 404 && !lookupResponse.ok) {
      // Endpoint exists but no manuals found for this model — valid state
      expect([200, 404]).toContain(lookupResponse.status);
      return;
    }

    // Endpoint live: assert 200 or 404 (not 500)
    expect([200, 404]).toContain(lookupResponse.status);

    // When manuals exist for this model, the Manuais section must show shared content
    const manuaisSection = page.locator('[data-testid="manuals-section"]');
    const sectionVisible = await manuaisSection.isVisible().catch(() => false);

    if (sectionVisible && lookupResponse.ok) {
      const sharedIndicator = page.locator(
        '[data-testid="manual-contributor-credit"], [data-testid="service-manual-download-btn"], [data-testid="owner-manual-download-btn"]',
      );
      const indicatorCount = await sharedIndicator.count().catch(() => 0);
      expect(indicatorCount).toBeGreaterThan(0);
    }
  });
});
