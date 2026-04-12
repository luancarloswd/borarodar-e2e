import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = 'https://ride.borarodar.app';
const LOGIN_EMAIL = 'test@borarodar.app';
const LOGIN_PASSWORD = 'borarodarapp';

test.describe('BRAPP-51: Frontend Error on KML Import with 200 OK Response', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
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

  test('AC1: User uploads a KML file containing valid routable LineString elements → import completes successfully and imported routes are displayed on the map without any error message', async ({ page }) => {
    // Navigate to KML import section
    await page.getByRole('link', { name: 'Import KML' }).click();
    
    // Wait for the import form to load
    await page.waitForSelector('input[type="file"]', { timeout: 15000 });
    
    // Upload KML file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/valid-routable.kml');
    
    // Wait for upload to complete and for routes to be displayed
    await page.waitForSelector('[data-testid="kml-import-success"], [data-testid="route-map-geometry"]', { timeout: 20000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-51-ac-1.png', fullPage: true });
    
    // Verify no error messages appear (this is the main focus of the bug fix)
    const errorMessage = page.locator('[class*="error"], [class*="alert"], [role="alert"]');
    await expect(errorMessage).not.toBeVisible({ timeout: 5000 });
  });

  test('AC2: User uploads a KML file containing no routable LineString elements (e.g., only Points or Polygons) → a specific, descriptive warning message is shown explaining that no routable lines were found, instead of the generic \'Error importing KML file\' message', async ({ page }) => {
    // Navigate to KML import section
    await page.getByRole('link', { name: 'Import KML' }).click();
    
    // Wait for the import form to load
    await page.waitForSelector('input[type="file"]', { timeout: 15000 });
    
    // Upload KML file with no routable elements
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/no-routable-elements.kml');
    
    // Wait for warning message to appear
    await page.waitForSelector('[data-testid="no-routable-lines-warning"]', { timeout: 20000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-51-ac-2.png', fullPage: true });
    
    // Verify that generic error message is NOT shown
    await expect(page.getByText('Error importing KML file')).not.toBeVisible({ timeout: 5000 });
    
    // Verify specific warning is shown
    await expect(page.getByTestId('no-routable-lines-warning')).toBeVisible({ timeout: 5000 });
  });

  test('AC3: User uploads a KML file containing a mix of routable LineString elements and non-routable elements → only the routable LineStrings are imported and displayed, with an informational message indicating how many elements were imported and how many were skipped', async ({ page }) => {
    // Navigate to KML import section
    await page.getByRole('link', { name: 'Import KML' }).click();
    
    // Wait for the import form to load
    await page.waitForSelector('input[type="file"]', { timeout: 15000 });
    
    // Upload mixed KML file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/mixed-elements.kml');
    
    // Wait for import to complete and for results to be displayed
    await page.waitForSelector('[data-testid="import-results"]', { timeout: 20000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-51-ac-3.png', fullPage: true });
    
    // Verify that no error message appears
    await expect(page.getByText('Error importing KML file')).not.toBeVisible({ timeout: 5000 });
    
    // Verify import results are displayed
    await expect(page.getByTestId('import-results')).toBeVisible({ timeout: 5000 });
  });

  test('AC4: User uploads an invalid or malformed KML file → a clear error message is shown indicating the file format is invalid, distinct from the \'no routable elements\' warning', async ({ page }) => {
    // Navigate to KML import section
    await page.getByRole('link', { name: 'Import KML' }).click();
    
    // Wait for the import form to load
    await page.waitForSelector('input[type="file"]', { timeout: 15000 });
    
    // Upload invalid KML file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/invalid-malformed.kml');
    
    // Wait for error message to appear
    await page.waitForSelector('[data-testid="invalid-file-error"]', { timeout: 20000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-51-ac-4.png', fullPage: true });
    
    // Verify that no routable lines warning is shown
    await expect(page.getByText('No routable lines found')).not.toBeVisible({ timeout: 5000 });
    
    // Verify that generic error message is NOT shown
    await expect(page.getByText('Error importing KML file')).not.toBeVisible({ timeout: 5000 });
    
    // Verify specific invalid file error is shown
    await expect(page.getByTestId('invalid-file-error')).toBeVisible({ timeout: 5000 });
  });

  test('AC5: User uploads a valid KML file and the API returns a 200 OK response with partial or empty route data → the frontend correctly interprets the response payload and displays the appropriate message (success, warning, or informational) based on the actual content, never showing a false error', async ({ page }) => {
    // Navigate to KML import section
    await page.getByRole('link', { name: 'Import KML' }).click();
    
    // Wait for the import form to load
    await page.waitForSelector('input[type="file"]', { timeout: 15000 });
    
    // Upload valid KML file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/empty-route-data.kml');
    
    // Wait for appropriate response message to appear
    await page.waitForSelector('[data-testid="empty-route-data-message"]', { timeout: 20000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-51-ac-5.png', fullPage: true });
    
    // Verify that generic error message is NOT shown
    await expect(page.getByText('Error importing KML file')).not.toBeVisible({ timeout: 5000 });
    
    // Verify appropriate message is displayed for empty data
    await expect(page.getByTestId('empty-route-data-message')).toBeVisible({ timeout: 5000 });
  });
});