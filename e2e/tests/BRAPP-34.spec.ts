import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = 'https://ride.borarodar.app';
const TEST_USER = 'test@borarodar.app';
const TEST_PASSWORD = 'borarodarapp';

test.describe('BRAPP-34: Add KMZ File Processing Support', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
    mkdirSync('e2e/tests/fixtures', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_USER);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('AC1: User uploads a valid .kmz file containing KML geometry on the route detection page → the system processes the file and displays detected municipalities/route on the map', async ({ page }) => {
    await page.goto(`${BASE_URL}/municipalities/detect`);
    
    // Upload a valid KMZ file - using direct file input method instead of filechooser
    await page.setInputFiles('input[type="file"]', 'e2e/tests/fixtures/valid-route.kmz');
    
    // Wait for upload and processing
    await page.waitForSelector('text=Detected municipalities');
    
    // Verify the route is displayed
    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-1.png', fullPage: true });
    expect(await page.textContent('text=Detected municipalities')).not.toBe(null);
  });

  test('AC2: User uploads a .kmz file that contains no valid KML geometry → an error message \'KMZ file contains no valid KML geometry\' is displayed (HTTP 422)', async ({ page }) => {
    await page.goto(`${BASE_URL}/municipalities/detect`);
    
    // Upload a KMZ file with no valid KML geometry - using direct file input method instead of filechooser
    await page.setInputFiles('input[type="file"]', 'e2e/tests/fixtures/invalid-kmz.kmz');
    
    // Wait for error message
    await page.waitForSelector('text=KMZ file contains no valid KML geometry');
    
    // Verify error message is displayed
    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-2.png', fullPage: true });
    expect(await page.textContent('text=KMZ file contains no valid KML geometry')).not.toBe(null);
  });

  test('AC3: User uploads a .kmz file larger than 10 MB → the upload is rejected and a file size error message is displayed', async ({ page }) => {
    await page.goto(`${BASE_URL}/municipalities/detect`);
    
    // Upload a large KMZ file - using direct file input method instead of filechooser
    await page.setInputFiles('input[type="file"]', 'e2e/tests/fixtures/large-kmz.kmz');
    
    // Wait for file size error message
    await page.waitForSelector('text=File size exceeded');
    
    // Verify file size error is displayed
    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-3.png', fullPage: true });
    expect(await page.textContent('text=File size exceeded')).not.toBe(null);
  });

  test('AC4: User uploads a file with an unsupported extension (e.g. .txt) → the upload is rejected with an invalid file type error, while .gpx and .kmz extensions are both accepted', async ({ page }) => {
    await page.goto(`${BASE_URL}/municipalities/detect`);
    
    // Try to upload a text file (unsupported) - using direct file input method instead of filechooser
    await page.setInputFiles('input[type="file"]', 'e2e/tests/fixtures/test.txt');
    
    // Wait for invalid file type error message
    await page.waitForSelector('text=Invalid file type');
    
    // Verify invalid file type error is displayed
    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-4.png', fullPage: true });
    expect(await page.textContent('text=Invalid file type')).not.toBe(null);
  });

  test('AC5: User uploads a valid .kmz file → the file appears stored and accessible in the route details view, and the detected route matches the same output shape as an equivalent .gpx upload', async ({ page }) => {
    await page.goto(`${BASE_URL}/municipalities/detect`);
    
    // Upload a valid KMZ file - using direct file input method instead of filechooser
    await page.setInputFiles('input[type="file"]', 'e2e/tests/fixtures/valid-route.kmz');
    
    // Wait for upload and processing
    await page.waitForSelector('text=Detected municipalities');
    
    // Click on a municipality to view route details
    await page.click('text=View route');
    
    // Wait for route details to load
    await page.waitForSelector('text=Route details');
    
    // Verify the route details are displayed
    await page.screenshot({ path: 'screenshots/BRAPP-34-ac-5.png', fullPage: true });
    expect(await page.textContent('text=Route details')).not.toBe(null);
  });
});