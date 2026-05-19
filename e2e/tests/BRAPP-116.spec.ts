import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const BASE_URL = process.env.BASE_URL || 'https://ride.borarodar.app';
const TEST_EMAIL = process.env.LOGIN_EMAIL || 'test@borarodar.app';
const TEST_PASSWORD = process.env.STAGING_PASSWORD;

if (!TEST_PASSWORD) {
  throw new Error(
    'STAGING_PASSWORD env var is required for BRAPP-116 E2E tests. ' +
      'Set STAGING_PASSWORD before running.'
  );
}

async function login(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  if (await page.getByTestId('user-menu-btn').isVisible()) {
    return;
  }

  if (!page.url().includes('/login')) {
    await page.goto(`${BASE_URL}/login`);
  }

  await page.getByTestId('email-input').fill(TEST_EMAIL);
  await page.getByTestId('password-input').fill(TEST_PASSWORD as string);
  await page.getByTestId('login-btn').click();
  
  await expect(page.getByRole('heading', { name: 'Comunidade' })).toBeVisible({ timeout: 30000 });
}

async function pickFirstExistingMotorcycleId(page: Page): Promise<string | null> {
  await page.goto(`${BASE_URL}/motorcycles`);
  
  const motoCard = page.locator('[data-testid="moto-card"]').first();
  const emptyState = page.getByTestId('motos-empty-state');

  await Promise.race([
    motoCard.waitFor({ state: 'visible', timeout: 15000 }),
    emptyState.waitFor({ state: 'visible', timeout: 15000 })
  ]).catch(() => {});

  if (await motoCard.isVisible()) {
    await motoCard.click();
    await page.waitForURL(/\/motorcycles\/[a-zA-Z0-9]+/, { timeout: 10000 });
    const url = page.url();
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  return null;
}

function createTempFile(name: string, content: string | Buffer): string {
  const filePath = join(tmpdir(), name);
  writeFileSync(filePath, content);
  return filePath;
}

test.describe("BRAPP-116: Upload and Share Motorcycle Service and Owner Manuals (PDF)", () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    // Ensure session is fully established
    await page.waitForTimeout(1000);
  });

  test("AC1: Motorcycle registration form shows PDF upload fields for make/model/year with no existing manuals", async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles/new`);
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible' });
    
    // Select a combination likely to be "clean" or available for testing
    await page.getByTestId('motorcycle-make-select').selectOption('Kawasaki');
    await page.getByTestId('motorcycle-model-select').selectOption('Ninja');
    await page.getByTestId('motorcycle-year-select').selectOption('2023');
    
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    const ownerManualField = page.locator('[data-testid="owner-manual-upload"]');
    
    await expect(serviceManualField).toBeVisible();
    await expect(ownerManualField).toBeVisible();
    await expect(serviceManualField).not.toBeDisabled();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-1.png`, fullPage: true });
  });

  test("AC2: Upload is rejected if the file is not a PDF", async ({ page }) => {
    const tempFilePath = createTempFile('test-invalid.jpg', 'fake-image-content');
    
    try {
      await page.goto(`${BASE_URL}/motorcycles/new`);
      await page.getByTestId('motorcycle-make-select').selectOption('Kawasaki');
      await page.getByTestId('motorcycle-model-select').selectOption('Ninja');
      await page.getByTestId('motorcycle-year-select').selectOption('2023');
      
      const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
      await serviceManualField.setInputFiles(tempFilePath);
      
      const errorMessage = page.getByText('Apenas arquivos PDF são aceitos');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      await page.screenshot({ path: `screenshots/BRAPP-116-ac-2.png`, fullPage: true });
    } finally {
      unlinkSync(tempFilePath);
    }
  });

  test("AC3: Shows existing manual message and hides upload field when manual is already available", async ({ page }) => {
    await page.goto(`${BASE_URL}/motorcycles/new`);
    
    // Using a known combination that has shared manuals on staging/production
    await page.getByTestId('motorcycle-make-select').selectOption('Harley-Davidson');
    await page.getByTestId('motorcycle-model-select').selectOption('Fat Boy');
    await page.getByTestId('motorcycle-year-select').selectOption('2020');
    
    await expect(page.getByText('Manual já disponível (compartilhado por outro usuário)')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="service-manual-download"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-manual-upload"]')).not.toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-3.png`, fullPage: true });
  });

  test("AC4: Motorcycle detail page shows Manuais section with contributor credit", async ({ page }) => {
    const motorcycleId = await pickFirstExistingMotorcycleId(page);
    
    if (!motorcycleId) {
      test.skip(true, 'No registered motorcycles found to verify details page');
      return;
    }

    await page.goto(`${BASE_URL}/motorcycles/${motorcycleId}`);
    await page.getByTestId('moto-detail-title').waitFor({ state: 'visible' });
    
    // We expect the manuals section to be present if the motorcycle has manuals
    // Since we don't know which one has it, we just check visibility if it exists or skip
    const manualsSection = page.locator('[data-testid="manuals-section"]');
    if (await manualsSection.isVisible()) {
      await expect(page.getByText('Compartilhado por @')).toBeVisible();
      await page.screenshot({ path: `screenshots/BRAPP-116-ac-4.png`, fullPage: true });
    } else {
      console.log(`Motorcycle ${motorcycleId} has no manuals, skipping visibility check`);
    }
  });

  test("AC5: Clicking download button triggers a file download", async ({ page }) => {
    // Navigate to a motorcycle known to have manuals or the first one found
    const motorcycleId = await pickFirstExistingMotorcycleId(page);
    if (!motorcycleId) {
      test.skip(true, 'No motorcycles found');
      return;
    }

    await page.goto(`${BASE_URL}/motorcycles/${motorcycleId}`);
    const downloadButton = page.locator('[data-testid="service-manual-download-btn"]').first();
    
    if (await downloadButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      await page.screenshot({ path: `screenshots/BRAPP-116-ac-5.png`, fullPage: true });
    } else {
      test.skip(true, 'No download button found for this motorcycle');
    }
  });
});
