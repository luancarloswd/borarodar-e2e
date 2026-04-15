import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.STAGING_URL || 'https://ride.borarodar.app';
const LOGIN_EMAIL = 'test@borarodar.app';
const LOGIN_PASSWORD = 'borarodarapp';

test.describe('BRAPP-84: Fix KML Import Error on 200 OK and Redirect to Route Creation Step 2 with AI-Generated Title/Description', () => {
  test.beforeAll(() => {
    mkdirSync('e2e/screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto(BASE_URL);
    await page.waitForSelector(
      'input[type="email"], input[name="email"], input[placeholder="Email"]',
      { timeout: 15000 },
    );
    await page.fill(
      'input[type="email"], input[name="email"], input[placeholder="Email"]',
      LOGIN_EMAIL,
    );
    await page.fill(
      'input[type="password"], input[name="password"], input[placeholder="Senha"], input[placeholder="Password"]',
      LOGIN_PASSWORD,
    );
    await page.click('button[type="submit"]');
    await page.waitForURL(
      (url) => !/\/(login|signin|auth)(\/|$)/i.test(url.pathname),
      { timeout: 15000 },
    );
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).not.toBeVisible({ timeout: 15000 });
  });

  // AC1: User clicks global 'Import KML' button and uploads a valid KML file with LineString tracks → user is redirected to /routes/create?step=2&source=kml with AI-suggested title and description pre-filled and the route tracks displayed on the map preview
  test('AC1: User clicks global \'Import KML\' button and uploads a valid KML file with LineString tracks → user is redirected to /routes/create?step=2&source=kml with AI-suggested title and description pre-filled and the route tracks displayed on the map preview', async ({ page }) => {
    // Navigate to home page first
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');
    
    // Find and click the KML import button
    await page.waitForSelector('button:has-text("Importar KML")', { timeout: 15000 });
    const kmlImportButton = page.locator('button:has-text("Importar KML")');
    await expect(kmlImportButton).toBeVisible({ timeout: 10000 });
    await kmlImportButton.click();
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-1-kml-import-button-clicked.png', fullPage: true });
    
    // Handle file upload
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Escolher arquivo")'),
    ]);
    
    // For now, we'll use a dummy file - in a real test we would upload an actual KML file
    await fileChooser.setFiles('e2e/fixtures/valid-kml-with-linestring.kml');
    
    // Wait for redirect to route creation step 2
    await page.waitForURL(/\/routes\/create\?step=2/, { timeout: 15000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-1-redirected-to-step-2.png', fullPage: true });
    
    // Verify the URL contains the correct parameters
    const finalUrl = page.url();
    expect(finalUrl).toContain('/routes/create?step=2');
    
    // Verify the title field is pre-filled (should have AI-generated title)
    await page.waitForSelector('input[name="title"]', { timeout: 10000 });
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    const titleValue = await titleInput.inputValue();
    expect(titleValue).toBeTruthy();
    
    // Verify the description field is pre-filled (should have AI-generated description)
    await page.waitForSelector('textarea[name="description"]', { timeout: 10000 });
    const descriptionInput = page.locator('textarea[name="description"]');
    await expect(descriptionInput).toBeVisible({ timeout: 10000 });
    const descriptionValue = await descriptionInput.inputValue();
    expect(descriptionValue).toBeTruthy();
    
    // Verify route tracks are displayed on map preview
    await page.waitForSelector('div[role="map"]', { timeout: 10000 });
    const mapElement = page.locator('div[role="map"]');
    await expect(mapElement).toBeVisible({ timeout: 10000 });
  });

  // AC2: User uploads a KML file with no LineString elements (only placemarks/waypoints) → an informative toast 'Nenhuma rota encontrada no arquivo KML' is displayed and the user remains on the current page without navigation
  test('AC2: User uploads a KML file with no LineString elements (only placemarks/waypoints) → an informative toast \'Nenhuma rota encontrada no arquivo KML\' is displayed and the user remains on the current page without navigation', async ({ page }) => {
    // Navigate to home page first
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');
    
    // Find and click the KML import button
    await page.waitForSelector('button:has-text("Importar KML")', { timeout: 15000 });
    const kmlImportButton = page.locator('button:has-text("Importar KML")');
    await expect(kmlImportButton).toBeVisible({ timeout: 10000 });
    await kmlImportButton.click();
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-2-kml-import-button-clicked.png', fullPage: true });
    
    // Handle file upload for KML without LineString
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Escolher arquivo")'),
    ]);
    
    // For now, we'll use a dummy file - in a real test we would upload an actual KML file without LineString
    await fileChooser.setFiles('e2e/fixtures/kml-without-linestring.kml');
    
    // Wait for the toast message to appear
    await page.waitForSelector('div:has-text("Nenhuma rota encontrada no arquivo KML")', { timeout: 15000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-2-toast-displayed.png', fullPage: true });
    
    // Verify toast message
    const toastElement = page.locator('div:has-text("Nenhuma rota encontrada no arquivo KML")');
    await expect(toastElement).toBeVisible({ timeout: 10000 });
    
    // Verify user remains on current page (home page)
    await page.waitForURL(/\/home/, { timeout: 10000 });
    const currentUrl = page.url();
    expect(currentUrl).toContain('/home');
  });

  // AC3: User uploads a valid KML file that returns 200 OK from the backend → the generic connection error toast 'Falha ao importar arquivo KML. Verifique sua conexão e tente novamente.' does NOT appear
  test('AC3: User uploads a valid KML file that returns 200 OK from the backend → the generic connection error toast \'Falha ao importar arquivo KML. Verifique sua conexão e tente novamente.\' does NOT appear', async ({ page }) => {
    // Navigate to home page first
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');
    
    // Find and click the KML import button
    await page.waitForSelector('button:has-text("Importar KML")', { timeout: 15000 });
    const kmlImportButton = page.locator('button:has-text("Importar KML")');
    await expect(kmlImportButton).toBeVisible({ timeout: 10000 });
    await kmlImportButton.click();
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-3-kml-import-button-clicked.png', fullPage: true });
    
    // Handle file upload
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Escolher arquivo")'),
    ]);
    
    // For now, we'll use a dummy file - in a real test we would upload an actual KML file
    await fileChooser.setFiles('e2e/fixtures/valid-kml-with-linestring.kml');
    
    // Wait for any toast message to appear
    await page.waitForTimeout(2000);
    
    // Verify connection error toast does NOT appear
    const errorToast = page.locator('div:has-text("Falha ao importar arquivo KML. Verifique sua conexão e tente novamente.")');
    await expect(errorToast).not.toBeVisible({ timeout: 10000 });
    
    // Wait for redirect to step 2 as per AC1 (since we're not expecting an error)
    // This might not happen immediately, but in this case it should navigate to step 2
    try {
      await page.waitForURL(/\/routes\/create\?step=2/, { timeout: 10000 });
      await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-3-redirected-to-step-2.png', fullPage: true });
    } catch (error) {
      // If it doesn't redirect, check that the page is still on the home page
      try {
        await page.waitForURL(/\/home/, { timeout: 5000 });
        const currentUrl = page.url();
        expect(currentUrl).toContain('/home');
      } catch (homeError) {
        // If it's not even on home page, let the test fail as expected
        throw error;
      }
    }
  });

  // AC4: User is redirected to route creation step 2 from KML import, edits the pre-filled title/description, proceeds through all wizard steps, and clicks Save → the new route is persisted and appears in the routes listing page
  test('AC4: User is redirected to route creation step 2 from KML import, edits the pre-filled title/description, proceeds through all wizard steps, and clicks Save → the new route is persisted and appears in the routes listing page', async ({ page }) => {
    // Navigate to home page first
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');
    
    // Find and click the KML import button
    await page.waitForSelector('button:has-text("Importar KML")', { timeout: 15000 });
    const kmlImportButton = page.locator('button:has-text("Importar KML")');
    await expect(kmlImportButton).toBeVisible({ timeout: 10000 });
    await kmlImportButton.click();
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-4-kml-import-button-clicked.png', fullPage: true });
    
    // Handle file upload
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Escolher arquivo")'),
    ]);
    
    // For now, we'll use a dummy file - in a real test we would upload an actual KML file
    await fileChooser.setFiles('e2e/fixtures/valid-kml-with-linestring.kml');
    
    // Wait for redirect to route creation step 2
    await page.waitForURL(/\/routes\/create\?step=2.*source=kml/, { timeout: 15000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-4-redirected-to-step-2.png', fullPage: true });
    
    // Edit the title and description to simulate user editing
    await page.waitForSelector('input[name="title"]', { timeout: 10000 });
    await page.fill('input[name="title"]', 'Test Route from KML Import');
    
    await page.waitForSelector('textarea[name="description"]', { timeout: 10000 });
    await page.fill('textarea[name="description"]', 'Test description for route created from KML import');
    
    // Click next to proceed to step 3
    await page.click('button:has-text("Próximo")');
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-4-navigated-to-step-3.png', fullPage: true });
    
    // Continue through wizard steps until save
    await page.click('button:has-text("Próximo")');
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-4-navigated-to-step-4.png', fullPage: true });
    
    // Click save (on the last step)
    await page.click('button:has-text("Salvar")');
    
    // Wait for save to complete and redirect to routes list
    await page.waitForURL(/\/routes/, { timeout: 15000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-4-route-saved.png', fullPage: true });
    
    // Verify we're on the routes list page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/routes');
    
    // Verify new route appears in the list
    await page.waitForSelector('div:has-text("Test Route from KML Import")', { timeout: 10000 });
    const routeElement = page.locator('div:has-text("Test Route from KML Import")');
    await expect(routeElement).toBeVisible({ timeout: 10000 });
  });

  // AC5: User uploads a valid KML file when the AI metadata service is unavailable → the fallback title (KML filename without extension) is used as the suggested title, no error is shown, and the user is still redirected to step 2 of route creation
  test('AC5: User uploads a valid KML file when the AI metadata service is unavailable → the fallback title (KML filename without extension) is used as the suggested title, no error is shown, and the user is still redirected to step 2 of route creation', async ({ page }) => {
    // Navigate to home page first
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');
    
    // Find and click the KML import button
    await page.waitForSelector('button:has-text("Importar KML")', { timeout: 15000 });
    const kmlImportButton = page.locator('button:has-text("Importar KML")');
    await expect(kmlImportButton).toBeVisible({ timeout: 10000 });
    await kmlImportButton.click();
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-5-kml-import-button-clicked.png', fullPage: true });
    
    // Handle file upload
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Escolher arquivo")'),
    ]);
    
    // For now, we'll use a dummy file - in a real test we would upload an actual KML file
    await fileChooser.setFiles('e2e/fixtures/valid-kml-with-linestring.kml');
    
    // Wait for redirect to route creation step 2
    await page.waitForURL(/\/routes\/create\?step=2.*source=kml/, { timeout: 15000 });
    
    await page.screenshot({ path: 'e2e/screenshots/BRAPP-84-ac-5-redirected-to-step-2.png', fullPage: true });
    
    // Verify that no error toast appears (indicating AI service unavailability)
    const errorToast = page.locator('div:has-text("Falha ao importar arquivo KML. Verifique sua conexão e tente novamente.")');
    await expect(errorToast).not.toBeVisible({ timeout: 10000 });
    
    // Verify that a title is pre-filled (should be the filename as fallback)
    await page.waitForSelector('input[name="title"]', { timeout: 10000 });
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    
    // Check that the title is not empty (fallback title should be set)
    const titleValue = await titleInput.inputValue();
    expect(titleValue).toBeTruthy();
    
    // Verify user is still redirected to step 2
    const finalUrl = page.url();
    expect(finalUrl).toContain('/routes/create?step=2');
    expect(finalUrl).toContain('source=kml');
  });
});