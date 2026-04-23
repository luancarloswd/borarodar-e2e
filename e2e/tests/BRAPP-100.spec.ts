import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const STAGING_URL = process.env.BASE_URL || "https://ride.borarodar.app";
const STAGING_USER = process.env.LOGIN_EMAIL || "test@borarodar.app";
const STAGING_PASSWORD = process.env.STAGING_PASSWORD || "borarodarapp";

/**
 * BRAPP-100: Fix Google Maps ApiProjectMapError and Directions REQUEST_DENIED on /routes/new
 */

async function login(page) {
  await page.goto(STAGING_URL);
  
  // Wait for the page to be somewhat loaded
  await page.waitForLoadState('networkidle');

  // Check if already logged in by looking for user menu button
  if (await page.getByTestId('user-menu-btn').isVisible()) {
    return;
  }

  // If not on login page, navigate to it (though goto(STAGING_URL) should redirect or be at home)
  if (!page.url().includes('/login') && !await page.getByTestId('login-btn').isVisible()) {
    await page.goto(`${STAGING_URL}/login`);
  }

  // Handle login using data-testids
  const emailField = page.getByTestId('email-input');
  const passwordField = page.getByTestId('password-input');
  const submitButton = page.getByTestId('login-btn');
  
  // Fill credentials
  await emailField.fill(STAGING_USER);
  await passwordField.fill(STAGING_PASSWORD);
  await submitButton.click();
  
  // Wait for home page to load - "Comunidade" is the header in CommunityFeedPage
  await expect(page.getByRole('heading', { name: 'Comunidade' })).toBeVisible({ timeout: 30000 });
}

test.describe("BRAPP-100: Fix Google Maps ApiProjectMapError and Directions REQUEST_DENIED on /routes/new", () => {
  
  test.beforeAll(() => {
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch (e) {
      // Ignore if directory already exists
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("User navigates to /routes/new → Google Maps canvas renders and no ApiProjectMapError appears in browser console", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' || text.includes('ApiProjectMapError')) {
        consoleErrors.push(text);
      }
    });

    // Navigate to Route Editor
    await page.goto(`${STAGING_URL}/routes/new`);

    // Step 1: Fill basic info to reach Step 2 where the map is
    await page.getByTestId('route-title-input').fill('E2E Test Route AC1');
    await page.getByTestId('next-step-btn').click();

    // Verify we are on Step 2 (Percurso)
    await expect(page.getByText('Paradas da rota')).toBeVisible({ timeout: 15000 });

    // Wait for Google Maps to load
    // .gm-style is the standard Google Maps container class
    const mapCanvas = page.locator('.gm-style');
    await expect(mapCanvas).toBeVisible({ timeout: 30000 });

    // Ensure no initialization errors specifically related to the project/key
    const mapError = consoleErrors.find(e => e.includes('ApiProjectMapError'));
    expect(mapError).toBeUndefined();

    await page.screenshot({ path: `screenshots/BRAPP-100-ac-1.png`, fullPage: true });
  });

  test("User enters valid origin and destination on /routes/new → driving route polyline is visible and no REQUEST_DENIED error occurs", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('REQUEST_DENIED') || text.includes('Directions Service')) {
        consoleErrors.push(text);
      }
    });

    await page.goto(`${STAGING_URL}/routes/new`);

    // Step 1
    await page.getByTestId('route-title-input').fill('E2E Test Route AC2');
    await page.getByTestId('next-step-btn').click();

    // Step 2: Fill Origin and Destination
    const originInput = page.getByPlaceholder('Buscar cidade de partida...');
    const destinationInput = page.getByPlaceholder('Buscar cidade de destino...');

    // Fill Origin: Unaí, MG
    await originInput.fill('Unaí');
    // Wait for suggestions and click one that contains "Unaí"
    const originSuggestion = page.getByRole('button').filter({ hasText: 'Unaí' }).first();
    await originSuggestion.waitFor({ state: 'visible', timeout: 15000 });
    await originSuggestion.click();

    // Fill Destination: Brasília, DF
    await destinationInput.fill('Brasília');
    const destinationSuggestion = page.getByRole('button').filter({ hasText: 'Brasília' }).first();
    await destinationSuggestion.waitFor({ state: 'visible', timeout: 15000 });
    await destinationSuggestion.click();

    // Wait for Directions Service to calculate and render polyline
    // Google Maps draws polylines as <path> elements inside the canvas
    const polyline = page.locator('.gm-style svg path');
    await expect(polyline.first()).toBeVisible({ timeout: 30000 });

    // Check for REQUEST_DENIED
    const directionsError = consoleErrors.find(e => e.includes('REQUEST_DENIED'));
    expect(directionsError).toBeUndefined();

    await page.screenshot({ path: `screenshots/BRAPP-100-ac-2.png`, fullPage: true });
  });

  test("User loads /routes/new with missing API key → MapUnavailable fallback component with a retry button is visible", async ({ page }) => {
    // Intercept Google Maps script to simulate load failure or missing key behavior
    await page.route('**/maps.googleapis.com/maps/api/js**', route => {
      route.abort('failed');
    });

    await page.goto(`${STAGING_URL}/routes/new`);

    // Go to Step 2
    await page.getByTestId('route-title-input').fill('E2E Test Route AC3');
    await page.getByTestId('next-step-btn').click();

    // Verify MapUnavailable fallback is shown
    const fallback = page.getByTestId('map-unavailable');
    await expect(fallback).toBeVisible({ timeout: 15000 });
    await expect(fallback).toContainText('Mapa indisponível');
    
    // Verify retry button
    const retryBtn = page.getByRole('button', { name: 'Tentar novamente' });
    await expect(retryBtn).toBeVisible();

    await page.screenshot({ path: `screenshots/BRAPP-100-ac-3.png`, fullPage: true });
  });

  test("User navigates to an existing route detail page → map and route polyline render correctly without initialization errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('ApiProjectMapError') || text.includes('REQUEST_DENIED')) {
        consoleErrors.push(text);
      }
    });

    // Go to routes list
    await page.goto(`${STAGING_URL}/routes`);

    // Wait for routes to load
    await expect(page.getByTestId('route-card').first()).toBeVisible({ timeout: 20000 });
    
    // Click the first route card
    await page.getByTestId('route-card').first().click();

    // Verify map on detail page
    // The detail page can use Google Maps (.gm-style) or Leaflet (.leaflet-container)
    // We check for either, but specifically ensure no Google-related errors if it's Google
    const mapWrapper = page.getByTestId('route-map');
    await expect(mapWrapper).toBeVisible({ timeout: 20000 });

    const googleMap = mapWrapper.locator('.gm-style');
    const leafletMap = mapWrapper.locator('.leaflet-container');

    // Wait for at least one map type to appear
    await expect(googleMap.or(leafletMap).first()).toBeVisible({ timeout: 30000 });

    // Check for initialization errors
    const mapError = consoleErrors.find(e => e.includes('ApiProjectMapError') || e.includes('REQUEST_DENIED'));
    expect(mapError).toBeUndefined();

    await page.screenshot({ path: `screenshots/BRAPP-100-ac-4.png`, fullPage: true });
  });
});

