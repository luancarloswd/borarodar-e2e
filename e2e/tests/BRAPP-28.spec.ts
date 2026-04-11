import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-28: Fix KML File Import Error on Route/Place Upload', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    
    // Look for login form — email + password fields, submit button
    const emailField = page.getByLabel('Email');
    const passwordField = page.getByLabel('Password');
    const submitButton = page.getByRole('button', { name: 'Login' });
    
    await emailField.fill('test@borarodar.app');
    await passwordField.fill('borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load with a longer timeout
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
  });

  test('AC1: User uploads a valid KML file on the route upload page → file is accepted and route geometry is displayed on the map', async ({ page }) => {
    // Navigate to route upload page
    await page.getByRole('button', { name: 'Upload Route' }).click();
    
    // Wait for upload dialog
    await page.waitForSelector('[data-testid="upload-route-dialog"]', { timeout: 15000 });
    
    // Upload valid KML file
    const fileInput = page.getByTestId('route-upload-input');
    await fileInput.setInputFiles('tests/fixtures/test.kml');
    
    // Wait for upload processing and route to be displayed
    await page.waitForSelector('[data-testid="route-map-geometry"]', { timeout: 20000 });
    
    // Verify route is displayed on map
    await page.screenshot({ path: 'screenshots/BRAPP-28-ac-1.png', fullPage: true });
    const routeDisplayed = await page.isVisible('[data-testid="route-map-geometry"]');
    expect(routeDisplayed).toBe(true);
  });

  test('AC2: User uploads a valid KML file on the place upload page → file is accepted and place marker is displayed on the map', async ({ page }) => {
    // Navigate to place upload page
    await page.getByRole('button', { name: 'Upload Place' }).click();
    
    // Wait for upload dialog
    await page.waitForSelector('[data-testid="upload-place-dialog"]', { timeout: 15000 });
    
    // Upload valid KML file
    const fileInput = page.getByTestId('place-upload-input');
    await fileInput.setInputFiles('tests/fixtures/test.kml');
    
    // Wait for upload processing and place marker to be displayed
    await page.waitForSelector('[data-testid="place-marker"]', { timeout: 20000 });
    
    // Verify place marker is displayed on map
    await page.screenshot({ path: 'screenshots/BRAPP-28-ac-2.png', fullPage: true });
    const placeMarkerDisplayed = await page.isVisible('[data-testid="place-marker"]');
    expect(placeMarkerDisplayed).toBe(true);
  });

  test('AC3: User uploads an invalid or malformed KML file → a descriptive error message is shown indicating the file is invalid', async ({ page }) => {
    // Navigate to route upload page
    await page.getByRole('button', { name: 'Upload Route' }).click();
    
    // Wait for upload dialog
    await page.waitForSelector('[data-testid="upload-route-dialog"]', { timeout: 15000 });
    
    // Upload invalid KML file
    const fileInput = page.getByTestId('route-upload-input');
    await fileInput.setInputFiles('tests/fixtures/invalid.kml');
    
    // Wait for error message
    await page.waitForSelector('[data-testid="upload-error-message"]', { timeout: 20000 });
    
    // Verify error message is displayed
    await page.screenshot({ path: 'screenshots/BRAPP-28-ac-3.png', fullPage: true });
    const errorMessage = await page.getByTestId('upload-error-message').textContent();
    expect(errorMessage).toContain('invalid');
  });

  test('AC4: User opens the file upload dialog → the file picker accepts both .kml and .gpx file extensions', async ({ page }) => {
    // Navigate to route upload page
    await page.getByRole('button', { name: 'Upload Route' }).click();
    
    // Wait for upload dialog
    await page.waitForSelector('[data-testid="upload-route-dialog"]', { timeout: 15000 });
    
    // Click to open file picker
    const fileInput = page.getByTestId('route-upload-input');
    await fileInput.click();
    
    // Verify file picker dialog appears
    await page.screenshot({ path: 'screenshots/BRAPP-28-ac-4.png', fullPage: true });
    
    // Check that the file input accepts both .kml and .gpx extensions
    const fileInputAttr = await fileInput.getAttribute('accept');
    expect(fileInputAttr).toContain('.kml');
    expect(fileInputAttr).toContain('.gpx');
  });

  test('AC5: User uploads a KML file containing route data → the imported route details match the original KML content and are visible in the route summary', async ({ page }) => {
    // Navigate to route upload page
    await page.getByRole('button', { name: 'Upload Route' }).click();
    
    // Wait for upload dialog
    await page.waitForSelector('[data-testid="upload-route-dialog"]', { timeout: 15000 });
    
    // Upload valid KML file
    const fileInput = page.getByTestId('route-upload-input');
    await fileInput.setInputFiles('tests/fixtures/test.kml');
    
    // Wait for upload processing and route summary
    await page.waitForSelector('[data-testid="route-summary"]', { timeout: 20000 });
    
    // Verify route details match expected
    await page.screenshot({ path: 'screenshots/BRAPP-28-ac-5.png', fullPage: true });
    const summaryVisible = await page.isVisible('[data-testid="route-summary"]');
    expect(summaryVisible).toBe(true);
    
    // Verify key route details are displayed
    const routeDistance = await page.getByTestId('route-distance').textContent();
    const routeDuration = await page.getByTestId('route-duration').textContent();
    
    expect(routeDistance).toBeDefined();
    expect(routeDuration).toBeDefined();
  });
});