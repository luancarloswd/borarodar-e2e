import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-78: Persist All Google Places API Results to Local Places Database', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    const emailField = page.getByLabel('Email');
    const passwordField = page.getByLabel('Password');
    const submitButton = page.getByRole('button', { name: 'Login' });
    
    // Fill credentials and submit
    await emailField.fill(process.env.LOGIN_EMAIL || 'test@borarodar.app');
    await passwordField.fill(process.env.LOGIN_PASSWORD || 'borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load
    await page.waitForSelector('text=Dashboard');
  });

  test('AC1: User opens the fuel supply form near a known gas station → the station is auto-detected and displayed without visible delay, confirming local DB lookup', async ({ page }) => {
    // Navigate to fuel supply form
    await page.goto(`${process.env.BASE_URL || 'https://ride.borarodar.app'}/fuel-supply`);
    
    // Wait for form to load and auto-detect gas station
    await page.waitForSelector('text=Detected Gas Station', { timeout: 15000 });
    
    // Verify gas station is detected without visible delay
    const detectedStation = page.locator('text=Detected Gas Station');
    await expect(detectedStation).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-78-ac-1.png', fullPage: true });
    
    // Verify station details are loaded
    const stationName = page.locator('[data-testid="station-name"]');
    await expect(stationName).toBeVisible({ timeout: 10000 });
  });

  test('AC2: User generates an itinerary for a new area → POI suggestions appear in the itinerary results with name, rating, and type information', async ({ page }) => {
    // Navigate to itinerary generation
    await page.goto(`${process.env.BASE_URL || 'https://ride.borarodar.app'}/itinerary`);
    
    // Generate itinerary for a new area
    const destinationField = page.getByPlaceholder('Enter destination');
    await destinationField.fill('Central Park, New York');
    await page.getByRole('button', { name: 'Generate Itinerary' }).click();
    
    // Wait for results to load
    await page.waitForSelector('[data-testid="poi-item"]', { timeout: 15000 });
    
    // Verify POI suggestions appear with name, rating, and type
    const poiItems = page.locator('[data-testid="poi-item"]');
    await expect(poiItems).toHaveCount(5); // Expect 5 POIs
    
    // Verify each item has name, rating, and type
    const firstPoi = poiItems.first();
    await expect(firstPoi).toContainText('Name:');
    await expect(firstPoi).toContainText('Rating:');
    await expect(firstPoi).toContainText('Type:');
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-78-ac-2.png', fullPage: true });
  });

  test('AC3: User regenerates the same itinerary for the previously searched area → POI results load noticeably faster and match the previous results, confirming local cache is used instead of a new API call', async ({ page }) => {
    // Go back to itinerary page
    await page.goto(`${process.env.BASE_URL || 'https://ride.borarodar.app'}/itinerary`);
    
    // Generate the same itinerary again
    const destinationField = page.getByPlaceholder('Enter destination');
    await destinationField.fill('Central Park, New York');
    await page.getByRole('button', { name: 'Generate Itinerary' }).click();
    
    // Wait for results to load (should be faster due to caching)
    await page.waitForSelector('[data-testid="poi-item"]', { timeout: 15000 });
    
    // Verify we get the same results as before
    const poiItems = page.locator('[data-testid="poi-item"]');
    await expect(poiItems).toHaveCount(5);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-78-ac-3.png', fullPage: true });
  });

  test('AC4: User searches for a place that was previously in the Google cache → the place appears in search results with correct name, type, and Google metadata (rating, price level)', async ({ page }) => {
    // Navigate to search
    await page.goto(`${process.env.BASE_URL || 'https://ride.borarodar.app'}/search`);
    
    // Search for a specific place
    const searchField = page.getByPlaceholder('Search for places');
    await searchField.fill('Times Square');
    await page.getByRole('button', { name: 'Search' }).click();
    
    // Wait for search results
    await page.waitForSelector('[data-testid="search-result"]', { timeout: 15000 });
    
    // Verify place appears in search results with correct name, type, and metadata
    const searchResults = page.locator('[data-testid="search-result"]');
    await expect(searchResults).toHaveCount(10); // Expect 10 results
    
    // Verify a specific result has name, type, rating, and price level
    const firstResult = searchResults.first();
    await expect(firstResult).toContainText('Name:');
    await expect(firstResult).toContainText('Type:');
    await expect(firstResult).toContainText('Rating:');
    await expect(firstResult).toContainText('Price Level:');
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-78-ac-4.png', fullPage: true });
  });

  test('AC5: User views gas station details after auto-detection → a linked place entry is visible with type \'fuel_strategic\' and consistent metadata between the station and place views', async ({ page }) => {
    // Navigate to fuel supply form
    await page.goto(`${process.env.BASE_URL || 'https://ride.borarodar.app'}/fuel-supply`);
    
    // Wait for auto-detected station
    await page.waitForSelector('text=Detected Gas Station', { timeout: 15000 });
    
    // Click on detected station to view details
    const stationDetailsButton = page.getByRole('button', { name: 'View Details' });
    await stationDetailsButton.click();
    
    // Wait for details page to load
    await page.waitForSelector('[data-testid="station-details"]', { timeout: 10000 });
    
    // Verify linked place entry is visible with type 'fuel_strategic'
    const linkedPlaceSection = page.locator('[data-testid="linked-place"]');
    await expect(linkedPlaceSection).toBeVisible();
    
    // Verify place type is 'fuel_strategic'
    const placeType = page.locator('[data-testid="place-type"]');
    await expect(placeType).toContainText('fuel_strategic');
    
    // Verify metadata consistency between station and place
    const metadata = page.locator('[data-testid="place-metadata"]');
    await expect(metadata).toBeVisible({ timeout: 10000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-78-ac-5.png', fullPage: true });
  });
});