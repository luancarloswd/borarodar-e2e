import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-34: Add KMZ File Processing Support', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    
    // Login flow
    await page.fill('input[name="email"], input[type="email"]', 'test@borarodar.app');
    await page.fill('input[name="password"], input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"], button:has-text("Login")');

    // Wait for dashboard/home to load
    await page.waitForLoadState('networkidle');
  });

  test('AC1: User uploads a valid .kmz file via the file upload interface → the system displays the successfully detected route or a confirmation of successful processing.', async ({ page }) => {
    // Navigate to route creation/upload
    await page.click('[aria-label="Upload Route"]');
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // File upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/valid.kmz'); // Assuming valid.kmz exists or is mocked
    
    // Wait for processing to complete
    await page.waitForSelector('.success-message, .route-detected', { timeout: 30000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-1.png', fullPage: true });
    
    // Verify success message or route detection
    const successMessage = page.locator('.success-message, .route-detected');
    await expect(successMessage).toBeVisible();
  });

  test('AC2: User uploads a .kmz file that contains no valid KML geometry → the system displays an error message containing the text \'KMZ file contains no valid KML geometry\'.', async ({ page }) => {
    // Navigate to route creation/upload
    await page.click('[aria-label="Upload Route"]');
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // File upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/invalid-kml.kmz'); // Assuming invalid-kml.kmz exists or is mocked
    
    // Wait for error message
    await page.waitForSelector('.error-message', { timeout: 10000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-2.png', fullPage: true });
    
    // Verify error message contains required text
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toContainText('KMZ file contains no valid KML geometry');
  });

  test('AC3: User uploads a .kmz file larger than 10MB → the system displays an error message indicating the file size limit has been exceeded.', async ({ page }) => {
    // Navigate to route creation/upload
    await page.click('[aria-label="Upload Route"]');
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // File upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/large.kmz'); // Assuming large.kmz exists or is mocked
    
    // Wait for error message
    await page.waitForSelector('.error-message', { timeout: 10000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-3.png', fullPage: true });
    
    // Verify file size error message
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toContainText('file size limit has been exceeded');
  });

  test('AC4: User attempts to upload a non-KMZ/non-GPX file type (e.g., a .txt file) → the system displays an error message indicating an unsupported file format.', async ({ page }) => {
    // Navigate to route creation/upload
    await page.click('[aria-label="Upload Route"]');
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // File upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/invalid-file.txt'); // Assuming invalid-file.txt exists or is mocked
    
    // Wait for error message
    await page.waitForSelector('.error-message', { timeout: 10000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-4.png', fullPage: true });
    
    // Verify unsupported file format error message
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toContainText('unsupported file format');
  });
});