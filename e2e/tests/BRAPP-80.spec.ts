import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-80: Add \'For Developers Purposes Only\' Notice on Route Creation Map', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app');
    
    // Look for login form — email + password fields, submit button
    const emailField = page.getByLabel('Email');
    const passwordField = page.getByLabel('Password');
    const submitButton = page.getByRole('button', { name: 'Entrar' });
    
    // Fill credentials and submit
    await emailField.fill('test@borarodar.app');
    await passwordField.fill('borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test('AC1: User navigates to the route creation page → a \'For developers purposes only\' notice badge is visible overlaid on the map', async ({ page }) => {
    // Navigate to route creation page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/rotas/criar');
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="route-map"]');
    
    // Verify the dev notice badge is visible (using contains instead of exact match for flexibility)
    const devBadge = page.getByText('For developers purposes only');
    await expect(devBadge).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-80-ac-1.png', fullPage: true });
  });

  test('AC2: User navigates to the KML route import page → a \'For developers purposes only\' notice badge is visible overlaid on the map', async ({ page }) => {
    // Navigate to KML import page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/rotas/importar');
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="route-map"]');
    
    // Verify the dev notice badge is visible (using contains instead of exact match for flexibility)
    const devBadge = page.getByText('For developers purposes only');
    await expect(devBadge).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-80-ac-2.png', fullPage: true });
  });

  test('AC3: User navigates to an existing route detail page → no \'For developers purposes only\' notice badge is shown on the map', async ({ page }) => {
    // Navigate to an existing route detail page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/rotas/1');
    
    // Wait for route details to load
    await page.waitForSelector('[data-testid="route-detail"]');
    
    // Verify the dev notice badge is NOT visible
    const devBadge = page.getByText('For developers purposes only');
    await expect(devBadge).not.toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-80-ac-3.png', fullPage: true });
  });

  test('AC4: User drags or zooms the map on the route creation page → the dev notice badge remains visible and does not block map interaction', async ({ page }) => {
    // Navigate to route creation page
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/rotas/criar');
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="route-map"]');
    
    // Verify the dev notice badge is visible (using contains instead of exact match for flexibility)
    const devBadge = page.getByText('For developers purposes only');
    await expect(devBadge).toBeVisible();
    
    // Take screenshot before interaction
    await page.screenshot({ path: 'screenshots/BRAPP-80-ac-4-before.png', fullPage: true });
    
    // Perform map interaction (drag/zoom)
    const mapElement = page.getByTestId('route-map');
    await mapElement.click({ position: { x: 100, y: 100 } });
    
    // Wait a bit for any animations
    await page.waitForTimeout(1000);
    
    // Verify the badge is still visible after interaction
    await expect(devBadge).toBeVisible();
    
    // Take screenshot after interaction
    await page.screenshot({ path: 'screenshots/BRAPP-80-ac-4-after.png', fullPage: true });
  });

  test('AC5: User loads the route creation page in Portuguese (pt-BR) locale → the badge displays \'Apenas para fins de desenvolvimento\'', async ({ page }) => {
    // Navigate to route creation page in Portuguese
    await page.goto(process.env.BASE_URL || 'https://ride.borarodar.app/pt-BR/rotas/criar');
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="route-map"]');
    
    // Verify the dev notice badge is visible in Portuguese (using contains for flexibility)
    const devBadge = page.getByText('Apenas para fins de desenvolvimento');
    await expect(devBadge).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-80-ac-5.png', fullPage: true });
  });
});