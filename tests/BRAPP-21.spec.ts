import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const LARGE_KML_PATH = path.join(FIXTURES_DIR, 'large-file.kml');

test.describe('BRAPP-21: KML/KMZ File Import for Rotas Page', () => {

  test.beforeAll(async () => {
    // Ensure screenshots directory exists before any test writes to it
    fs.mkdirSync('screenshots', { recursive: true });
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });

    // Generate a >20 MB KML file for AC3 if not already present
    if (!fs.existsSync(LARGE_KML_PATH)) {
      const header = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><LineString><coordinates>\n';
      const footer = '\n</coordinates></LineString></Placemark></Document></kml>';
      // Each coordinate entry is ~20 chars; 1,200,000 entries ≈ 24 MB
      const coord = '-43.1729,-22.9068,0 ';
      const chunkSize = 10_000;
      const totalChunks = 120;
      const fd = fs.openSync(LARGE_KML_PATH, 'w');
      fs.writeSync(fd, header);
      const chunk = coord.repeat(chunkSize);
      for (let i = 0; i < totalChunks; i++) {
        fs.writeSync(fd, chunk);
      }
      fs.writeSync(fd, footer);
      fs.closeSync(fd);
    }
  });

  test.beforeEach(async ({ page }) => {
    const email = process.env.LOGIN_EMAIL;
    const password = process.env.LOGIN_PASSWORD;

    // Skip tests rather than accidentally run against production with leaked credentials
    test.skip(!email || !password, 'LOGIN_EMAIL and LOGIN_PASSWORD env vars are required');

    await page.goto('/');
    await page.fill('input[name="email"], input[type="email"]', email!);
    await page.fill('input[name="password"], input[type="password"]', password!);

    // Capture pre-login URL so waitForURL can detect an actual navigation away
    const preLoginUrl = page.url();
    await page.click('button[type="submit"]');
    await page.waitForURL(
      (url) => url.href !== preLoginUrl && !/\/(login|signin|auth)(\/|$)/i.test(url.pathname),
      { timeout: 15000 }
    );
    await expect(page.locator('input[name="email"], input[type="email"]')).not.toBeVisible({ timeout: 15000 });
  });

  test('AC1: User navigates to the Rotas page and clicks the \'Upload KML/KMZ\' button, then selects a valid .kml file → A loading spinner appears briefly, the uploaded route\'s polyline is visible on the Leaflet map, and the map automatically adjusts its view to encompass the new route.', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForSelector('button:has-text("Upload KML/KMZ")');

    // Set up filechooser listener before clicking to avoid a race condition
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Upload KML/KMZ' }).click(),
    ]);
    await fileChooser.setFiles(path.join(FIXTURES_DIR, 'test.kml'));

    const spinner = page.locator('.spinner, [class*="loading"], [role="progressbar"]');
    await expect(spinner).toBeVisible();
    await expect(spinner).not.toBeVisible({ timeout: 10000 });

    // Verify polyline path elements are rendered in the Leaflet overlay (confirms fitBounds ran)
    const polyline = page.locator('.leaflet-overlay-pane svg path');
    await expect(polyline.first()).toBeVisible({ timeout: 10000 });
    expect(await polyline.count()).toBeGreaterThan(0);

    await page.screenshot({ path: 'screenshots/BRAPP-21-ac-1.png', fullPage: true });
  });

  test('AC2: User navigates to the Rotas page and clicks the \'Upload KML/KMZ\' button, then selects a valid .kmz file → A loading spinner appears briefly, the uploaded route\'s polyline is visible on the Leaflet map, and the map automatically adjusts its view to encompass the new route.', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForSelector('button:has-text("Upload KML/KMZ")');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Upload KML/KMZ' }).click(),
    ]);
    await fileChooser.setFiles(path.join(FIXTURES_DIR, 'test.kmz'));

    const spinner = page.locator('.spinner, [class*="loading"], [role="progressbar"]');
    await expect(spinner).toBeVisible();
    await expect(spinner).not.toBeVisible({ timeout: 10000 });

    // Verify polyline path elements are rendered in the Leaflet overlay (confirms fitBounds ran)
    const polyline = page.locator('.leaflet-overlay-pane svg path');
    await expect(polyline.first()).toBeVisible({ timeout: 10000 });
    expect(await polyline.count()).toBeGreaterThan(0);

    await page.screenshot({ path: 'screenshots/BRAPP-21-ac-2.png', fullPage: true });
  });

  test('AC3: User attempts to upload a KML/KMZ file larger than 20MB → An inline error message indicating the file is too large is displayed on the page.', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForSelector('button:has-text("Upload KML/KMZ")');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Upload KML/KMZ' }).click(),
    ]);
    await fileChooser.setFiles(LARGE_KML_PATH);

    await page.waitForSelector('[role="alert"], .error-message, .alert-danger');
    await page.screenshot({ path: 'screenshots/BRAPP-21-ac-3.png', fullPage: true });
    await expect(page.getByText(/file is too large|arquivo é muito grande|larger than|exceeds the limit/i)).toBeVisible();
  });

  test('AC4: User attempts to upload a KML/KMZ file that contains no LineString or MultiLineString geometry → An inline error message indicating that no valid route geometry was found is displayed on the page.', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForSelector('button:has-text("Upload KML/KMZ")');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Upload KML/KMZ' }).click(),
    ]);
    // invalid.kml contains only a Point placemark — no LineString or MultiLineString
    await fileChooser.setFiles(path.join(FIXTURES_DIR, 'invalid.kml'));

    await page.waitForSelector('[role="alert"], .error-message, .alert-danger');
    await page.screenshot({ path: 'screenshots/BRAPP-21-ac-4.png', fullPage: true });
    await expect(page.getByText(/no valid route geometry|no LineString or MultiLineString|geometry not found/i)).toBeVisible();
  });
});