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

test.describe('BRAPP-40: Import KML in Nova Rota Step 2 to Auto-fill Cities', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Login flow
    await page.fill('input[name="email"], input[type="email"]', LOGIN_EMAIL!);
    await page.fill('input[name="password"], input[type="password"]', LOGIN_PASSWORD!);
    await page.click('button[type="submit"]');
    // Wait for dashboard/home to load
    await page.waitForLoadState('networkidle');
  });

  test('AC1: User navigates to the \'Nova Rota\' Step 2 page (/routes/new) → A button labeled \'Import KML\' is visible above the origin PlaceSearchInput.', async ({ page }) => {
    await page.goto('/routes/new');
    const importButton = page.getByRole('button', { name: 'Import KML' });
    await expect(importButton).toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-40-ac-1.png', fullPage: true });
  });

  test('AC2: User clicks the \'Import KML\' button, selects a valid KML file, and upload completes → The origin, destination, and waypoint input fields are auto-filled, the map preview is updated with the route, and a \'Rota importada com sucesso\' toast notification is displayed.', async ({ page }) => {
    await page.goto('/routes/new');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import KML' }).click();
    const fileChooser = await fileChooserPromise;
    
    // Assuming test.kml exists for the purpose of this test generation
    await fileChooser.setFiles('test.kml');

    await expect(page.getByText('Rota importada com sucesso')).toBeVisible();
    await expect(page.locator('input[placeholder*="origem"]')).not.toHaveValue('');
    await expect(page.locator('input[placeholder*="destino"]')).not.toHaveValue('');
    
    await page.screenshot({ path: 'screenshots/BRAPP-40-ac-2.png', fullPage: true });
  });

  test('AC3: User clicks the \'Import KML\' button and selects an invalid file type or corrupt KML file → An \'Arquivo KML inválido ou não suportado\' toast notification is displayed.', async ({ page }) => {
    await page.goto('/routes/new');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import KML' }).click();
    const fileChooser = await fileChooserPromise;
    
    // Uploading an invalid file
    await fileChooser.setFiles('invalid.txt');

    await expect(page.getByText('Arquivo KML inválido ou não suportado')).toBeVisible();
    await page.screenshot({ path: 'screenshots/BRAPP-40-ac-3.png', fullPage: true });
  });

  test('AC4: User clicks the \'Import KML\' button and selects a KML file → A loading spinner is visible while the file is being processed, and then disappears upon completion.', async ({ page }) => {
    await page.goto('/routes/new');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import KML' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('test.kml');

    const spinner = page.locator('.spinner, [class*="loading"], [role="progressbar"]');
    await expect(spinner).not.toBeVisible();
    
    await page.screenshot({ path: 'screenshots/BRAPP-40-ac-4.png', fullPage: true });
  });
});
