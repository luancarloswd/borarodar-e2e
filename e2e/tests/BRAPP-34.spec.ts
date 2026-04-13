import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.STAGING_URL || 'https://ride.borarodar.app';
const LOGIN_EMAIL = 'test@borarodar.app';
const LOGIN_PASSWORD = 'borarodarapp';

test.describe('BRAPP-34: Add KMZ File Processing Support', () => {
  test.beforeAll(() => {
    mkdirSync('e2e/screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto(BASE_URL);
    await page.waitForSelector(
      'input[type="email"], input[name="email"], input[placeholder="Email"]',
      { timeout: 15000 },
    );
    await page.fill(
      'input[type="email"], input[name="email"], input[placeholder="Email"]',
      LOGIN_EMAIL,
    );
    await page.fill(
      'input[type="password"], input[name="password"], input[placeholder="Senha"], input[placeholder="Password"]',
      LOGIN_PASSWORD,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL(
      (url) => !/\/(login|signin|auth)(\/|$)/i.test(url.pathname),
      { timeout: 15000 },
    );
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).not.toBeVisible({ timeout: 15000 });
  });

  // AC1: User uploads a valid .kmz file on the route detection page → municipalities along the route are detected and displayed in the results list, matching the behavior of an equivalent .gpx upload
  test('AC1: User uploads a valid .kmz file on the route detection page → municipalities along the route are detected and displayed in the results list, matching the behavior of an equivalent .gpx upload', async ({ page }) => {
    // Navigate to the route detection page
    await page.goto(`${BASE_URL}/municipalities/detect`);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-1.png', fullPage: true });
    
    // Find the file upload input
    const fileInput = page.locator('input[type="file"][accept=".gpx,.kmz"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    
    // Upload a test KMZ file (this might fail if file doesn't exist, but test should be robust)
    await fileInput.setInputFiles('e2e/tests/test.kmz');
    
    // Wait for upload processing and results to appear
    // Using more robust selectors to check for municipality list or results
    await page.waitForSelector('[data-testid="municipalities-list"], [data-testid="municipality-item"], .municipalities-list, .municipality-item', { timeout: 30000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-1-results.png', fullPage: true });
    
    // Verify that municipalities are detected and displayed
    const municipalityItems = page.locator('[data-testid="municipality-item"], .municipality-item');
    
    // Wait for municipalities to be visible - using explicit timeout to help with reliability
    await expect(municipalityItems).toBeVisible({ timeout: 10000 });
    
    // Get the count of items
    const itemCount = await municipalityItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  // AC2: User uploads a corrupt or empty .kmz file → an error message containing 'KMZ file contains no valid KML geometry' is displayed and no route is created
  test('AC2: User uploads a corrupt or empty .kmz file → an error message containing \'KMZ file contains no valid KML geometry\' is displayed and no route is created', async ({ page }) => {
    // Navigate to the route detection page
    await page.goto(`${BASE_URL}/municipalities/detect`);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-2.png', fullPage: true });
    
    // Find the file upload input
    const fileInput = page.locator('input[type="file"][accept=".gpx,.kmz"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    
    // Upload a corrupt KMZ file
    await fileInput.setInputFiles('e2e/tests/corrupt.kmz');
    
    // Wait for error message to appear with more robust approach to check for error container
    await page.waitForSelector('[data-testid="error-message"], .error-message, .alert, .alert-danger, [data-testid="validation-error"]', { timeout: 15000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-2-error.png', fullPage: true });
    
    // Get error message text and verify it contains expected content
    const errorMessage = await page.locator('[data-testid="error-message"], .error-message, .alert, .alert-danger, [data-testid="validation-error"]').textContent();
    expect(errorMessage).toContain('KMZ file contains no valid KML geometry');
  });

  // AC3: User uploads a .kmz file larger than 10 MB → the upload is rejected and a file-size validation error is visible before any processing occurs
  test('AC3: User uploads a .kmz file larger than 10 MB → the upload is rejected and a file-size validation error is visible before any processing occurs', async ({ page }) => {
    // Navigate to the route detection page
    await page.goto(`${BASE_URL}/municipalities/detect`);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-3.png', fullPage: true });
    
    // Find the file upload input
    const fileInput = page.locator('input[type="file"][accept=".gpx,.kmz"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    
    // Try to upload a large file (simulating large KMZ)
    await fileInput.setInputFiles('e2e/tests/large.kmz');
    
    // Wait for file size validation error using more robust selectors
    await page.waitForSelector('[data-testid="file-size-error"], .error-message, .alert-danger, .alert, [data-testid="validation-error"]', { timeout: 15000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-3-file-size-error.png', fullPage: true });
    
    // Get error message text and verify it contains expected content
    const fileSizeError = await page.locator('[data-testid="file-size-error"], .error-message, .alert-danger, .alert, [data-testid="validation-error"]').textContent();
    expect(fileSizeError).toContain('file size exceeds the 10 MB limit');
  });

  // AC4: User opens the file upload dialog → the file picker accepts .kmz files in addition to .gpx files (both extensions are selectable)
  test('AC4: User opens the file upload dialog → the file picker accepts .kmz files in addition to .gpx files (both extensions are selectable)', async ({ page }) => {
    // Navigate to the route detection page
    await page.goto(`${BASE_URL}/municipalities/detect`);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-4.png', fullPage: true });
    
    // Find the file upload input
    const fileInput = page.locator('input[type="file"][accept=".gpx,.kmz"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    
    // Check file picker accepts both extensions
    const acceptAttribute = await fileInput.getAttribute('accept');
    expect(acceptAttribute).toContain('.gpx');
    expect(acceptAttribute).toContain('.kmz');
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-4-accept-attribute.png', fullPage: true });
  });

  // AC5: User uploads a valid .kmz file and navigates to the route detail page → the uploaded file is stored and the route geometry renders correctly on the map
  test('AC5: User uploads a valid .kmz file and navigates to the route detail page → the uploaded file is stored and the route geometry renders correctly on the map', async ({ page }) => {
    // Navigate to the route detection page
    await page.goto(`${BASE_URL}/municipalities/detect`);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-5.png', fullPage: true });
    
    // Find the file upload input
    const fileInput = page.locator('input[type="file"][accept=".gpx,.kmz"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    
    // Upload a test KMZ file
    await fileInput.setInputFiles('e2e/tests/test.kmz');
    
    // Wait for upload processing and results to appear
    await page.waitForSelector('[data-testid="municipalities-list"], [data-testid="municipality-item"], .municipalities-list, .municipality-item', { timeout: 30000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-5-results.png', fullPage: true });
    
    // Click on one of the detected municipalities to view the details
    const firstResult = page.locator('[data-testid="municipality-item"], .municipality-item').first();
    await expect(firstResult).toBeVisible({ timeout: 10000 });
    
    await firstResult.click();
    
    // Wait for route details page to load
    await page.waitForURL(/\/municipalities\/.\/route\/.*/, { timeout: 15000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-34-ac-5-detail-loaded.png', fullPage: true });
    
    // Verify route details page contains map with uploaded KMZ geometry
    const mapElement = page.locator('[data-testid="map"], .map-container, #map');
    await expect(mapElement).toBeVisible({ timeout: 10000 });
  });
});