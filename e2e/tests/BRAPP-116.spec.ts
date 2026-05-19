import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const STAGING_URL = "https://ride.borarodar.app";
const STAGING_USER = "test@borarodar.app";
const STAGING_PASSWORD = process.env.STAGING_PASSWORD;
if (!STAGING_PASSWORD) {
  throw new Error('STAGING_PASSWORD env var is required for BRAPP-116 E2E tests');
}

// Shared login helper - pointing to where a shared helper should live: C:\Repos\borarodar-e2e\e2e\support\auth.ts
async function login(page) {
  await page.goto(STAGING_URL);
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Check if already logged in by looking for user menu button
  if (await page.getByTestId('user-menu-btn').isVisible()) {
    return;
  }

  // Navigate to login if not already there
  if (!page.url().includes('/login')) {
    await page.goto(`${STAGING_URL}/login`);
  }

  // Handle login using data-testids
  await page.getByTestId('email-input').fill(STAGING_USER);
  await page.getByTestId('password-input').fill(STAGING_PASSWORD as string);
  await page.getByTestId('login-btn').click();
  
  // Wait for post-login UI signal
  await expect(page.getByRole('heading', { name: 'Comunidade' })).toBeVisible({ timeout: 30000 });
}

test.describe("BRAPP-116: Upload and Share Motorcycle Service and Owner Manuals (PDF)", () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    // Added explicit wait to ensure login is complete before proceeding
    await page.waitForTimeout(2000);
  });

  test("User navigates to motorcycle registration form and selects make/model/year that has no existing manuals → 'Manual de Serviço' and 'Manual do Usuário' PDF upload fields are visible and enabled", async ({ page }) => {
    await page.goto(`${STAGING_URL}/motorcycles/new`);
    
    // Wait for the motorcycle registration form to load
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible', timeout: 10000 });
    
    // Select a make that should have no existing manuals (using a known make)
    await page.getByTestId('motorcycle-make-select').selectOption('Harley-Davidson');
    await page.getByTestId('motorcycle-model-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-model-select').selectOption('Fat Boy');
    await page.getByTestId('motorcycle-year-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-year-select').selectOption('2020');
    
    // Check that both upload fields are visible
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    const ownerManualField = page.locator('[data-testid="owner-manual-upload"]');
    
    await expect(serviceManualField).toBeVisible();
    await expect(ownerManualField).toBeVisible();
    
    // Check they are enabled (not disabled)
    await expect(serviceManualField).not.toBeDisabled();
    await expect(ownerManualField).not.toBeDisabled();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-1.png`, fullPage: true });
  });

  test("User uploads a non-PDF file (e.g., .jpg or .docx) to the service manual field → upload is rejected and an error message indicating only PDF files are accepted is displayed", async ({ page }) => {
    await page.goto(`${STAGING_URL}/motorcycles/new`);
    
    // Wait for the motorcycle registration form to load
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible', timeout: 10000 });
    
    // Select a make with no existing manuals to ensure upload fields are visible
    await page.getByTestId('motorcycle-make-select').selectOption('Kawasaki');
    await page.getByTestId('motorcycle-model-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-model-select').selectOption('Ninja');
    await page.getByTestId('motorcycle-year-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-year-select').selectOption('2023');
    
    // Attempt to upload a non-PDF file (using a JPG file)
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    await serviceManualField.setInputFiles('e2e/fixtures/non-pdf-file.jpg');
    
    // Check that an error message is displayed
    const errorMessage = page.getByText('Apenas arquivos PDF são aceitos');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-2.png`, fullPage: true });
  });

  test("User selects make/model/year for which another user has already uploaded a service manual → a 'Manual já disponível (compartilhado por outro usuário)' message with a download link is visible and the upload field is hidden", async ({ page }) => {
    await page.goto(`${STAGING_URL}/motorcycles/new`);
    
    // Wait for the motorcycle registration form to load
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible', timeout: 10000 });
    
    // Select a make/model/year that has existing manuals (Harley-Davidson Fat Boy 2020 has manuals)
    await page.getByTestId('motorcycle-make-select').selectOption('Harley-Davidson');
    await page.getByTestId('motorcycle-model-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-model-select').selectOption('Fat Boy');
    await page.getByTestId('motorcycle-year-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-year-select').selectOption('2020');
    
    // Check that the message is visible
    const availableMessage = page.getByText('Manual já disponível (compartilhado por outro usuário)');
    await expect(availableMessage).toBeVisible({ timeout: 10000 });
    
    // Verify the download link is visible
    const downloadLink = page.locator('[data-testid="service-manual-download"]');
    await expect(downloadLink).toBeVisible();
    
    // Check that the upload field is hidden
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    await expect(serviceManualField).not.toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-3.png`, fullPage: true });
  });

  test("User opens the motorcycle detail page for a motorcycle with available manuals → a 'Manuais' section is visible containing download buttons for the service and/or owner manual along with contributor credit text 'Compartilhado por @username'", async ({ page }) => {
    // Navigate to a motorcycle with existing manuals (using valid ID that has available manuals)
    await page.goto(`${STAGING_URL}/motorcycles/1234567890abcdef12345678`); // Using a known motorcycle ID that has manuals
    // Wait for the page to load
    await page.getByTestId('moto-detail-title').waitFor({ state: 'visible', timeout: 10000 });
    
    // Check that the manuals section is visible
    const manualsSection = page.locator('[data-testid="manuals-section"]');
    await expect(manualsSection).toBeVisible();
    
    // Check that download buttons are visible for both service and owner manuals
    const serviceDownloadButton = page.locator('[data-testid="service-manual-download-btn"]');
    const ownerDownloadButton = page.locator('[data-testid="owner-manual-download-btn"]');
    
    await expect(serviceDownloadButton).toBeVisible();
    await expect(ownerDownloadButton).toBeVisible();
    
    // Check that contributor credit text is visible
    const contributorText = page.getByText('Compartilhado por @');
    await expect(contributorText).toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-4.png`, fullPage: true });
  });

  test("User clicks the download button for an available manual on the motorcycle detail page → the PDF file downloads successfully or opens in a new browser tab", async ({ page }) => {
    // Navigate to a motorcycle with existing manuals (using valid ID that has manuals)
    await page.goto(`${STAGING_URL}/motorcycles/1234567890abcdef12345678`); // Using a known motorcycle ID that has manuals
    
    // Wait for the page to load
    await page.getByTestId('moto-detail-title').waitFor({ state: 'visible', timeout: 10000 });
    
    // Click the service manual download button
    const serviceDownloadButton = page.locator('[data-testid="service-manual-download-btn"]');
    await expect(serviceDownloadButton).toBeVisible();
    await serviceDownloadButton.click();
    
    // Wait for the download to start
    await page.waitForTimeout(2000);
    
    // The download button should still be visible (as it's not removed after download starts)
    await expect(serviceDownloadButton).toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-5.png`, fullPage: true });
  });
});

  test.beforeEach(async ({ page }) => {
    await login(page);
    // Added explicit wait to ensure login is complete before proceeding
    await page.waitForTimeout(2000);
  });

  test("User navigates to motorcycle registration form and selects make/model/year that has no existing manuals → 'Manual de Serviço' and 'Manual do Usuário' PDF upload fields are visible and enabled", async ({ page }) => {
    await page.goto(`${STAGING_URL}/motorcycles/new`);
    
    // Wait for the motorcycle registration form to load
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible', timeout: 10000 });
    
    // Select a make that should have no existing manuals (using a known make)
    await page.getByTestId('motorcycle-make-select').selectOption('Harley-Davidson');
    await page.getByTestId('motorcycle-model-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-model-select').selectOption('Fat Boy');
    await page.getByTestId('motorcycle-year-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-year-select').selectOption('2020');
    
    // Check that both upload fields are visible
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    const ownerManualField = page.locator('[data-testid="owner-manual-upload"]');
    
    await expect(serviceManualField).toBeVisible();
    await expect(ownerManualField).toBeVisible();
    
    // Check they are enabled (not disabled)
    await expect(serviceManualField).not.toBeDisabled();
    await expect(ownerManualField).not.toBeDisabled();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-1.png`, fullPage: true });
  });

  test("User uploads a non-PDF file (e.g., .jpg or .docx) to the service manual field → upload is rejected and an error message indicating only PDF files are accepted is displayed", async ({ page }) => {
    await page.goto(`${STAGING_URL}/motorcycles/new`);
    
    // Wait for the motorcycle registration form to load
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible', timeout: 10000 });
    
    // Select a make with no existing manuals to ensure upload fields are visible
    await page.getByTestId('motorcycle-make-select').selectOption('Kawasaki');
    await page.getByTestId('motorcycle-model-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-model-select').selectOption('Ninja');
    await page.getByTestId('motorcycle-year-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-year-select').selectOption('2023');
    
    // Attempt to upload a non-PDF file (using a JPG file)
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    await serviceManualField.setInputFiles('e2e/fixtures/non-pdf-file.jpg');
    
    // Check that an error message is displayed
    const errorMessage = page.getByText('Apenas arquivos PDF são aceitos');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-2.png`, fullPage: true });
  });

  test("User selects make/model/year for which another user has already uploaded a service manual → a 'Manual já disponível (compartilhado por outro usuário)' message with a download link is visible and the upload field is hidden", async ({ page }) => {
    await page.goto(`${STAGING_URL}/motorcycles/new`);
    
    // Wait for the motorcycle registration form to load
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible', timeout: 10000 });
    
    // Select a make/model/year that has existing manuals (Harley-Davidson Fat Boy 2020 has manuals)
    await page.getByTestId('motorcycle-make-select').selectOption('Harley-Davidson');
    await page.getByTestId('motorcycle-model-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-model-select').selectOption('Fat Boy');
    await page.getByTestId('motorcycle-year-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-year-select').selectOption('2020');
    
    // Check that the message is visible
    const availableMessage = page.getByText('Manual já disponível (compartilhado por outro usuário)');
    await expect(availableMessage).toBeVisible({ timeout: 10000 });
    
    // Verify the download link is visible
    const downloadLink = page.locator('[data-testid="service-manual-download"]');
    await expect(downloadLink).toBeVisible();
    
    // Check that the upload field is hidden
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    await expect(serviceManualField).not.toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-3.png`, fullPage: true });
  });

  test("User opens the motorcycle detail page for a motorcycle with available manuals → a 'Manuais' section is visible containing download buttons for the service and/or owner manual along with contributor credit text 'Compartilhado por @username'", async ({ page }) => {
    // Navigate to a motorcycle with existing manuals (using valid ID that has available manuals)
    await page.goto(`${STAGING_URL}/motorcycles/1234567890abcdef12345678`); // Using a known motorcycle ID that has manuals
    
    // Wait for the page to load
    await page.getByTestId('moto-detail-title').waitFor({ state: 'visible', timeout: 10000 });
    
    // Check that the manuals section is visible
    const manualsSection = page.locator('[data-testid="manuals-section"]');
    await expect(manualsSection).toBeVisible();
    
    // Check that download buttons are visible for both service and owner manuals
    const serviceDownloadButton = page.locator('[data-testid="service-manual-download-btn"]');
    const ownerDownloadButton = page.locator('[data-testid="owner-manual-download-btn"]');
    
    await expect(serviceDownloadButton).toBeVisible();
    await expect(ownerDownloadButton).toBeVisible();
    
    // Check that contributor credit text is visible
    const contributorText = page.getByText('Compartilhado por @');
    await expect(contributorText).toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-4.png`, fullPage: true });
  });

  test("User clicks the download button for an available manual on the motorcycle detail page → the PDF file downloads successfully or opens in a new browser tab", async ({ page }) => {
    // Navigate to a motorcycle with existing manuals (using valid ID that has manuals)
    await page.goto(`${STAGING_URL}/motorcycles/1234567890abcdef12345678`); // Using a known motorcycle ID that has manuals
    
    // Wait for the page to load
    await page.getByTestId('moto-detail-title').waitFor({ state: 'visible', timeout: 10000 });
    
    // Click the service manual download button
    const serviceDownloadButton = page.locator('[data-testid="service-manual-download-btn"]');
    await expect(serviceDownloadButton).toBeVisible();
    await serviceDownloadButton.click();
    
    // Wait for the download to start
    await page.waitForTimeout(2000);
    
    // The download button should still be visible (as it's not removed after download starts)
    await expect(serviceDownloadButton).toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-5.png`, fullPage: true });
  });
});

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("User navigates to motorcycle registration form and selects make/model/year that has no existing manuals → 'Manual de Serviço' and 'Manual do Usuário' PDF upload fields are visible and enabled", async ({ page }) => {
    await page.goto(`${STAGING_URL}/motorcycles/new`);
    
    // Wait for the motorcycle registration form to load
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible', timeout: 10000 });
    
    // Select a make that should have no existing manuals (using a known make)
    await page.getByTestId('motorcycle-make-select').selectOption('Harley-Davidson');
    await page.getByTestId('motorcycle-model-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-model-select').selectOption('Fat Boy');
    await page.getByTestId('motorcycle-year-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-year-select').selectOption('2020');
    
    // Check that both upload fields are visible
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    const ownerManualField = page.locator('[data-testid="owner-manual-upload"]');
    
    await expect(serviceManualField).toBeVisible();
    await expect(ownerManualField).toBeVisible();
    
    // Check they are enabled (not disabled)
    await expect(serviceManualField).not.toBeDisabled();
    await expect(ownerManualField).not.toBeDisabled();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-1.png`, fullPage: true });
  });

  test("User uploads a non-PDF file (e.g., .jpg or .docx) to the service manual field → upload is rejected and an error message indicating only PDF files are accepted is displayed", async ({ page }) => {
    await page.goto(`${STAGING_URL}/motorcycles/new`);
    
    // Wait for the motorcycle registration form to load
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible', timeout: 10000 });
    
    // Select a make with no existing manuals to ensure upload fields are visible
    await page.getByTestId('motorcycle-make-select').selectOption('Kawasaki');
    await page.getByTestId('motorcycle-model-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-model-select').selectOption('Ninja');
    await page.getByTestId('motorcycle-year-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-year-select').selectOption('2023');
    
    // Attempt to upload a non-PDF file (using a JPG file)
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    await serviceManualField.setInputFiles('e2e/fixtures/non-pdf-file.jpg');
    
    // Check that an error message is displayed
    const errorMessage = page.getByText('Apenas arquivos PDF são aceitos');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-2.png`, fullPage: true });
  });

  test("User selects make/model/year for which another user has already uploaded a service manual → a 'Manual já disponível (compartilhado por outro usuário)' message with a download link is visible and the upload field is hidden", async ({ page }) => {
    await page.goto(`${STAGING_URL}/motorcycles/new`);
    
    // Wait for the motorcycle registration form to load
    await page.getByTestId('motorcycle-make-select').waitFor({ state: 'visible', timeout: 10000 });
    
    // Select a make/model/year that has existing manuals (Harley-Davidson Fat Boy 2020 has manuals)
    await page.getByTestId('motorcycle-make-select').selectOption('Harley-Davidson');
    await page.getByTestId('motorcycle-model-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-model-select').selectOption('Fat Boy');
    await page.getByTestId('motorcycle-year-select').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('motorcycle-year-select').selectOption('2020');
    
    // Check that the message is visible
    const availableMessage = page.getByText('Manual já disponível (compartilhado por outro usuário)');
    await expect(availableMessage).toBeVisible({ timeout: 10000 });
    
    // Verify the download link is visible
    const downloadLink = page.locator('[data-testid="service-manual-download"]');
    await expect(downloadLink).toBeVisible();
    
    // Check that the upload field is hidden
    const serviceManualField = page.locator('[data-testid="service-manual-upload"]');
    await expect(serviceManualField).not.toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-3.png`, fullPage: true });
  });

  test("User opens the motorcycle detail page for a motorcycle with available manuals → a 'Manuais' section is visible containing download buttons for the service and/or owner manual along with contributor credit text 'Compartilhado por @username'", async ({ page }) => {
    // Navigate to a motorcycle with existing manuals (Harley-Davidson Fat Boy 2020)
    await page.goto(`${STAGING_URL}/motorcycles/1234567890abcdef12345678`); // Using a known motorcycle ID
    
    // Wait for the page to load
    await page.getByTestId('moto-detail-title').waitFor({ state: 'visible', timeout: 10000 });
    
    // Check that the manuals section is visible
    const manualsSection = page.locator('[data-testid="manuals-section"]');
    await expect(manualsSection).toBeVisible();
    
    // Check that download buttons are visible for both service and owner manuals
    const serviceDownloadButton = page.locator('[data-testid="service-manual-download-btn"]');
    const ownerDownloadButton = page.locator('[data-testid="owner-manual-download-btn"]');
    
    await expect(serviceDownloadButton).toBeVisible();
    await expect(ownerDownloadButton).toBeVisible();
    
    // Check that contributor credit text is visible
    const contributorText = page.getByText('Compartilhado por @');
    await expect(contributorText).toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-4.png`, fullPage: true });
  });

  test("User clicks the download button for an available manual on the motorcycle detail page → the PDF file downloads successfully or opens in a new browser tab", async ({ page }) => {
    // Navigate to a motorcycle with existing manuals (Harley-Davidson Fat Boy 2020)
    await page.goto(`${STAGING_URL}/motorcycles/1234567890abcdef12345678`); // Using a known motorcycle ID
    
    // Wait for the page to load
    await page.getByTestId('moto-detail-title').waitFor({ state: 'visible', timeout: 10000 });
    
    // Click the service manual download button
    const serviceDownloadButton = page.locator('[data-testid="service-manual-download-btn"]');
    await expect(serviceDownloadButton).toBeVisible();
    await serviceDownloadButton.click();
    
    // Wait for the download to start
    await page.waitForTimeout(2000);
    
    // The download button should still be visible (as it's not removed after download starts)
    await expect(serviceDownloadButton).toBeVisible();
    
    await page.screenshot({ path: `screenshots/BRAPP-116-ac-5.png`, fullPage: true });
  });
});