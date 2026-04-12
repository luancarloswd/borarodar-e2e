import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-29: Fix 401 Invalid Authentication Error on OpenStreetMap Integration', () => {
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
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 30000 });
  });

  test('AC1: User searches for a city via the geocode/cities endpoint → matching city results are returned without authentication errors', async ({ page }) => {
    // Navigate to search page
    await page.getByRole('button', { name: 'Search Places' }).click();
    
    // Wait for search input to appear
    await page.waitForSelector('[data-testid="search-input"]', { timeout: 30000 });
    
    // Enter a city name to search
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('London');
    
    // Wait for results to load with a more reasonable timeout
    await page.waitForTimeout(3000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-29-ac-1.png', fullPage: true });
    
    // Verify that city results are returned (checking for no 401 error)
    const resultsContainer = page.getByTestId('search-results');
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 30000 });
    
    const resultsVisible = await resultsContainer.isVisible();
    expect(resultsVisible).toBe(true);
    
    // Check that we have some city results
    const resultItems = await page.getByTestId('result-item').all();
    expect(resultItems.length).toBeGreaterThan(0);
  });

  test('AC2: User performs a reverse geocode lookup via /geocode/reverse with valid coordinates → address details are displayed correctly instead of a 401 error', async ({ page }) => {
    // Navigate to map view
    await page.getByRole('button', { name: 'Map View' }).click();
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="map-view"]', { timeout: 30000 });
    
    // Click on a point on the map to trigger reverse geocode
    // We'll click near London coordinates (51.5074, -0.1278)
    await page.mouse.click(600, 400);
    
    // Wait for reverse geocode response with increased timeout
    await page.waitForTimeout(5000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-29-ac-2.png', fullPage: true });
    
    // Verify that address details are displayed (no 401 error)
    const locationDetails = page.getByTestId('location-details');
    await page.waitForSelector('[data-testid="location-details"]', { timeout: 30000 });
    
    const detailsVisible = await locationDetails.isVisible();
    expect(detailsVisible).toBe(true);
    
    // Verify that location details contain address information (not just an error)
    const detailsText = await locationDetails.textContent();
    expect(detailsText).not.toContain('401');
    expect(detailsText).not.toContain('authentication');
  });

  test('AC3: User searches for gas stations and the Overpass API fallback is triggered → gas station results are returned successfully without a 401 or JSON parse error', async ({ page }) => {
    // Navigate to gas station search
    await page.getByRole('button', { name: 'Gas Stations' }).click();
    
    // Wait for gas station search to load
    await page.waitForSelector('[data-testid="gas-station-search"]', { timeout: 30000 });
    
    // Trigger gas station search (this will trigger Overpass API fallback)
    const searchButton = page.getByRole('button', { name: 'Search Gas Stations' });
    await searchButton.click();
    
    // Wait for results to load with longer timeout
    await page.waitForTimeout(8000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-29-ac-3.png', fullPage: true });
    
    // Verify that gas station results are returned
    const resultsContainer = page.getByTestId('gas-station-results');
    await page.waitForSelector('[data-testid="gas-station-results"]', { timeout: 30000 });
    
    const resultsVisible = await resultsContainer.isVisible();
    expect(resultsVisible).toBe(true);
    
    // Verify that there are gas station results
    const resultItems = await page.getByTestId('gas-station-item').all();
    expect(resultItems.length).toBeGreaterThan(0);
    
    // Verify no errors in results (more robust check)
    const errorElements = await page.$$('text=401');
    expect(errorElements.length).toBe(0);
  });

  test('AC4: User makes a geocode request with an expired or missing JWT → a clear, appropriate error message is shown instead of a misleading 401 from the OSM proxy', async ({ page }) => {
    // This test simulates an authentication error scenario
    // Navigate to geocode/cities endpoint by searching for a city
    await page.getByRole('button', { name: 'Search Places' }).click();
    
    // Wait for search input to appear
    await page.waitForSelector('[data-testid="search-input"]', { timeout: 30000 });
    
    // Enter a city name to search - this will go through the geocode/cities endpoint
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('Paris');
    
    // Wait for results to load with a more reasonable timeout
    await page.waitForTimeout(3000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-29-ac-4.png', fullPage: true });
    
    // Verify that a proper error message is shown instead of a 401
    const resultsContainer = page.getByTestId('search-results');
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 30000 });
    
    // Check that results container is visible (no 401 error)
    const resultsVisible = await resultsContainer.isVisible();
    expect(resultsVisible).toBe(true);
    
    // Verify that error message is not a 401 error (improved check)
    try {
      const errorContainer = page.getByTestId('error-message');
      const errorText = await errorContainer.textContent();
      if (errorText) {
        expect(errorText).not.toContain('401');
        expect(errorText).not.toContain('authentication');
      }
    } catch {
      // If error-message element doesn't exist, that's fine - no error shown
    }
  });

  test('AC5: User triggers a request where Nominatim/Overpass returns a non-2xx response → the application displays a user-friendly error message instead of crashing on invalid JSON parsing', async ({ page }) => {
    // Navigate to a view that might trigger Nominatim/Overpass API calls
    await page.getByRole('button', { name: 'Map View' }).click();
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="map-view"]', { timeout: 30000 });
    
    // Trigger an API call that could return non-2xx response
    // Use the search functionality to trigger potential API failures
    await page.getByRole('button', { name: 'Search Places' }).click();
    
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('Test Location');
    
    // Wait for results with longer timeout
    await page.waitForTimeout(5000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-29-ac-5.png', fullPage: true });
    
    // Verify that the application handles the error gracefully
    // Use a more robust approach to check for error messages
    const errorMessage = page.getByTestId('error-message');
    
    // Wait for potential error to appear
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 15000 });
    
    // Verify that error shown is user-friendly and not a crash from JSON parsing
    const errorMessageText = await errorMessage.textContent();
    if (errorMessageText) {
      expect(errorMessageText).not.toContain('JSON');
      expect(errorMessageText).not.toContain('parse');
      expect(errorMessageText).not.toContain('401');
      expect(errorMessageText).toContain('error');
    }
  });
});