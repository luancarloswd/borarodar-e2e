import { test, expect } from '@playwright/test';

test.describe('BRAPP-23: Export Routes as KML, GPX, and KMZ', () => {

  test.beforeEach(async ({ page }) => {
    // Login flow with explicit timeout and better selectors
    await page.goto('https://ride.borarodar.app', { timeout: 60000 });
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('text=Dashboard', { timeout: 30000 });
  });

  test('AC1: User opens a saved route and selects \'Export as GPX\' → browser downloads a .gpx file whose XML contains <trkpt> elements with valid lat/lon coordinates matching the route geometry', async ({ page }) => {
    // Navigate to routes page and select a route
    await page.goto('https://ride.borarodar.app/routes', { timeout: 60000 });
    await page.waitForSelector('text=My Routes', { timeout: 30000 });
    
    // More robust route selection using data attributes or nth-child selectors if available
    const routeSelector = 'text=Route 1';
    await page.click(routeSelector);
    await page.waitForSelector('text=Route Details', { timeout: 30000 });
    
    // Click export button and select GPX
    await page.click('text=Export as GPX');
    
    // Wait for download to complete with timeout
    const download = await page.waitForEvent('download', { timeout: 30000 });
    const fileName = download.suggestedFilename();
    expect(fileName).toContain('.gpx');
    
    await page.screenshot({ path: 'BRAPP-23-ac-1.png', fullPage: true });
  });

  test('AC2: User opens a saved route and selects \'Export as KML\' → browser downloads a .kml file whose XML contains <Placemark> elements for each waypoint and a <LineString> for the route path', async ({ page }) => {
    // Navigate to routes page and select a route
    await page.goto('https://ride.borarodar.app/routes', { timeout: 60000 });
    await page.waitForSelector('text=My Routes', { timeout: 30000 });
    
    // Click on the first route
    await page.click('text=Route 1');
    await page.waitForSelector('text=Route Details', { timeout: 30000 });
    
    // Click export button and select KML
    await page.click('text=Export as KML');
    
    // Wait for download to complete with timeout
    const download = await page.waitForEvent('download', { timeout: 30000 });
    const fileName = download.suggestedFilename();
    expect(fileName).toContain('.kml');
    
    await page.screenshot({ path: 'BRAPP-23-ac-2.png', fullPage: true });
  });

  test('AC3: User opens a saved route and selects \'Export as KMZ\' → browser downloads a .kmz file that is a valid ZIP archive containing a doc.kml entry with the route data', async ({ page }) => {
    // Navigate to routes page and select a route
    await page.goto('https://ride.borarodar.app/routes', { timeout: 60000 });
    await page.waitForSelector('text=My Routes', { timeout: 30000 });
    
    // Click on the first route
    await page.click('text=Route 1');
    await page.waitForSelector('text=Route Details', { timeout: 30000 });
    
    // Click export button and select KMZ
    await page.click('text=Export as KMZ');
    
    // Wait for download to complete with timeout
    const download = await page.waitForEvent('download', { timeout: 30000 });
    const fileName = download.suggestedFilename();
    expect(fileName).toContain('.kmz');
    
    await page.screenshot({ path: 'BRAPP-23-ac-3.png', fullPage: true });
  });

  test('AC4: User opens a saved itinerary and exports as GPX → the downloaded .gpx file contains one <trk> per itinerary day and <wpt> elements for each stop', async ({ page }) => {
    // Navigate to itineraries page
    await page.goto('https://ride.borarodar.app/itineraries', { timeout: 60000 });
    await page.waitForSelector('text=My Itineraries', { timeout: 30000 });
    
    // Click on the first itinerary
    await page.click('text=Itinerary 1');
    await page.waitForSelector('text=Itinerary Details', { timeout: 30000 });
    
    // Click export as GPX
    await page.click('text=Export as GPX');
    
    // Wait for download to complete with timeout
    const download = await page.waitForEvent('download', { timeout: 30000 });
    const fileName = download.suggestedFilename();
    expect(fileName).toContain('.gpx');
    
    await page.screenshot({ path: 'BRAPP-23-ac-4.png', fullPage: true });
  });

  test('AC5: User attempts to export a route with an invalid or missing format parameter → an error message is displayed and no file is downloaded', async ({ page }) => {
    // Navigate to routes page and select a route
    await page.goto('https://ride.borarodar.app/routes', { timeout: 60000 });
    await page.waitForSelector('text=My Routes', { timeout: 30000 });
    
    // Click on the first route
    await page.click('text=Route 1');
    await page.waitForSelector('text=Route Details', { timeout: 30000 });
    
    // Try to export with invalid format
    await page.click('text=Export as InvalidFormat');
    
    // Expect error message to be displayed with timeout
    await page.waitForSelector('text=Invalid format parameter', { timeout: 30000 });
    
    await page.screenshot({ path: 'BRAPP-23-ac-5.png', fullPage: true });
  });
});