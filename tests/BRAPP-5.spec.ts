import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
  test.skip(
    'Skipping: Required environment variables are not set.',
    { annotation: { type: 'error', description: 'Missing env vars' } }
  );
}

test.describe('BRAPP-5: Fix text encoding and spurious \'0\' rendering on Novo Roteiro and route pages', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.LOGIN_EMAIL || !process.env.LOGIN_PASSWORD,
      'Skipping: set LOGIN_EMAIL and LOGIN_PASSWORD to run E2E tests');
    const baseUrl = process.env.BASE_URL || '/';

    await page.goto(baseUrl);
    // Look for login form ╬ô├ç├╢ email + password fields, submit button
    await page.fill('input[name="email"], input[type="email"]', LOGIN_EMAIL!);
    await page.fill('input[name="password"], input[type="password"]', LOGIN_PASSWORD!);
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    // Wait for dashboard/home to load
    await page.waitForLoadState('networkidle');
  });

  test('AC1: User navigates to the Novo Rote/itineraries/new form ╬ô├Ñ├å all Portuguese accented characters (e.g., \'Γö£├¡\', \'Γö£├║\', \'Γö£┬║\') display correctly.', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'https://ride.borarodar.app';
    await page.goto(`${baseUrl}/itineraries/new`); 
    await page.waitForLoadState('networkidle');
    
    // Search for elements that should contain accented characters
    // In a real scenario, we'd target specific labels or text content
    const content = page.locator('body');
    await expect(content).toContainText('Γö£├¡');
    await expect(content).toContainText('Γö£├║');
    await expect(content).toContainText('Γö£┬║');
    
    await page.screenshot({ path: 'screenshots/BRAPP-5-ac-1.png', fullPage: true });
  });

  test('AC2: User views a route or itinerary page ╬ô├Ñ├å all Portuguese accented characters (e.g., \'Γö£├¡\', \'Γö£├║\', \'Γö£┬║\') display correctly.', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'https://ride.borarodar.app';
    // Targeting /itineraries/:id (or similar) as per reviewer suggestion to ensure target page exists and has accented strings
    // For this test, we use /routes as a fallback if we can't find a specific ID, but we'll check for specific stable strings.
    await page.goto(`${baseUrl}/routes`); 
    await page.waitForLoadState('networkidle');
    
    const content = page.locator('body');
    // Check for stable UI strings that should have accents
    await expect(content).toContainText('Paradas intermediΓö£├¡rias');
    await expect(content).toContainText('DuraΓö£┬║Γö£├║o e estilo');
    
    await page.screenshot({ path: 'screenshots/BRAPP-5-ac-2.png', fullPage: true });
  });

  test('AC3: User navigates to the Novo Roteiro form ╬ô├Ñ├å no spurious \'0\' appears after section labels such as \'Paradas intermediΓö£├¡rias\'.', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'https://ride.borarodar.app';
    await page.goto(`${baseUrl}/itineraries/new`);
    await page.waitForLoadState('networkidle');
    
    const expectedText = 'Paradas intermediΓö£├¡rias';
    const forbiddenText = 'Paradas intermediΓö£├¡rias0';
    const content = page.locator('body');
    
    // Positive assertion to ensure the element is actually there
    await expect(content).toContainText(expectedText);
    // Negative assertion to ensure the '0' is gone
    await expect(content).not.toContainText(forbiddenText);
    
    await page.screenshot({ path: 'screenshots/BRAPP-5-ac-3.png', fullPage: true });
  });

  test('AC4: User views a route or itinerary page ╬ô├Ñ├å no spurious \'0\' appears after section labels.', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'https://ride.borarodar.app';
    await page.goto(`${baseUrl}/routes`);
    await page.waitForLoadState('networkidle');
    
    const expectedText = 'Paradas intermediΓö£├¡rias';
    const forbiddenText = 'Paradas intermediΓö£├¡rias0';
    const content = page.locator('body');

    // Positive assertion
    await expect(content).toContainText(expectedText);
    // Negative assertion
    await expect(content).not.toContainText(forbiddenText);
    
    await page.screenshot({ path: 'screenshots/BRAPP-5-ac-4.png', fullPage: true });
  });
});
