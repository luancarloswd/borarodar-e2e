import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import JSZip from 'jszip';

const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const VALID_KMZ = path.join(FIXTURES_DIR, 'test.kmz');
const INVALID_KML_KMZ = path.join(FIXTURES_DIR, 'invalid-kml.kmz');
const LARGE_KMZ = path.join(FIXTURES_DIR, 'large.kmz');
const INVALID_TXT = path.join(FIXTURES_DIR, 'invalid-file.txt');

test.describe('BRAPP-34: Add KMZ File Processing Support', () => {
  test.beforeAll(async () => {
    mkdirSync('screenshots', { recursive: true });

    // Build invalid-kml.kmz from invalid.kml (no valid route geometry)
    const invalidKmlContent = readFileSync(path.join(FIXTURES_DIR, 'invalid.kml'));
    const zipInvalid = new JSZip();
    zipInvalid.file('doc.kml', invalidKmlContent);
    const invalidKmzBuffer = await zipInvalid.generateAsync({ type: 'nodebuffer' });
    writeFileSync(INVALID_KML_KMZ, invalidKmzBuffer);

    // Build large.kmz (>10 MB, stored uncompressed to guarantee size)
    const zipLarge = new JSZip();
    zipLarge.file('padding.bin', Buffer.alloc(11 * 1024 * 1024), { compression: 'STORE' });
    const largeKmzBuffer = await zipLarge.generateAsync({ type: 'nodebuffer' });
    writeFileSync(LARGE_KMZ, largeKmzBuffer);

    // Create invalid-file.txt
    writeFileSync(INVALID_TXT, 'This is not a valid KMZ or GPX file.');
  });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !LOGIN_EMAIL || !LOGIN_PASSWORD,
      'LOGIN_EMAIL and LOGIN_PASSWORD environment variables are required for login-dependent tests.',
    );

    await page.goto('/');

    await page.fill('input[name="email"], input[type="email"]', LOGIN_EMAIL!);
    await page.fill('input[name="password"], input[type="password"]', LOGIN_PASSWORD!);
    await page.click('button[type="submit"], button:has-text("Login")');

    // Wait for dashboard/home to load
    await page.waitForLoadState('networkidle');
  });

  test('AC1: User uploads a valid .kmz file via the file upload interface → the system displays the successfully detected route or a confirmation of successful processing.', async ({ page }) => {
    // Navigate to route creation/upload
    await page.click('[aria-label="Upload Route"]');
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });

    await page.locator('input[type="file"]').setInputFiles(VALID_KMZ);

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

    await page.locator('input[type="file"]').setInputFiles(INVALID_KML_KMZ);

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

    await page.locator('input[type="file"]').setInputFiles(LARGE_KMZ);

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

    await page.locator('input[type="file"]').setInputFiles(INVALID_TXT);

    // Wait for error message
    await page.waitForSelector('.error-message', { timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-4.png', fullPage: true });

    // Verify unsupported file format error message
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toContainText('unsupported file format');
  });
});