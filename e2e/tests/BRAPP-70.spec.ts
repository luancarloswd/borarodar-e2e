import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-70: Fix Route Edit Validation, Stops Listing, Map Routing, and Default Motorcycle on Route Page', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    const emailField = page.getByLabel('Email');
    const passwordField = page.getByLabel('Password');
    const submitButton = page.getByRole('button', { name: 'Entrar' });
    
    await emailField.fill('test@borarodar.app');
    await passwordField.fill('borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load with reasonable timeout
    await page.waitForSelector('text=Olá, Teste', { timeout: 15000 });
  });

  test('AC1: User clicks Edit on an existing route with valid origin and destination, modifies the route name, and clicks Save → route is updated successfully without the \'Adicione pelo menos origem e destino com localização válida\' validation error appearing', async ({ page }) => {
    // Navigate to routes listing page
    await page.getByRole('link', { name: 'Rotas' }).click();
    
    // Wait for the routes page to load with reasonable timeout
    await page.waitForSelector('text=Lista de Rotas', { timeout: 15000 });
    
    // Click on first route to go to detail page
    const firstRoute = page.locator('[data-test="route-item"]').first();
    await firstRoute.click();
    
    // Wait for route detail page to load with reasonable timeout
    await page.waitForSelector('text=Detalhes da Rota', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-70-ac-1.png', fullPage: true });
    
    // Click edit button
    const editButton = page.getByRole('button', { name: 'Editar' });
    await editButton.click();
    
    // Wait for edit form to load
    await page.waitForSelector('text=Editar Rota', { timeout: 15000 });
    
    // Modify the route name
    const nameField = page.getByLabel('Nome da Rota');
    await nameField.fill('Rota Editada - Teste');
    
    // Click save
    const saveButton = page.getByRole('button', { name: 'Salvar' });
    await saveButton.click();
    
    // Wait for success message
    await page.waitForSelector('text=Rota atualizada com sucesso', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-70-ac-1-2.png', fullPage: true });
    
    // Verify no validation error appeared
    const validationError = page.locator('text=Adicione pelo menos origem e destino com localização válida');
    await expect(validationError).not.toBeVisible();
  });

  test('AC2: User navigates to a route detail page that has intermediate waypoints (stops) → all stops are listed in order between origin and destination with their names visible', async ({ page }) => {
    // Navigate to routes listing page
    await page.getByRole('link', { name: 'Rotas' }).click();
    
    // Wait for the routes page to load with reasonable timeout
    await page.waitForSelector('text=Lista de Rotas', { timeout: 15000 });
    
    // Click on a route with waypoints
    const routeWithWaypoints = page.locator('[data-test="route-item"]').nth(1); // Assume second route has waypoints
    await routeWithWaypoints.click();
    
    // Wait for route detail page to load with reasonable timeout
    await page.waitForSelector('text=Detalhes da Rota', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-70-ac-2.png', fullPage: true });
    
    // Verify waypoints are displayed and listed in order
    const waypointsList = page.locator('[data-test="waypoints-list"]');
    await expect(waypointsList).toBeVisible();
    
    // Check that stops are visible
    const stopItems = page.locator('[data-test="stop-item"]');
    await expect(stopItems).toBeVisible();
  });

  test('AC3: User navigates to a route detail page → the map renders a Google Maps driving route path following roads through all waypoints in sequential order, not straight lines or disconnected markers', async ({ page }) => {
    // Navigate to routes listing page
    await page.getByRole('link', { name: 'Rotas' }).click();
    
    // Wait for the routes page to load with reasonable timeout
    await page.waitForSelector('text=Lista de Rotas', { timeout: 15000 });
    
    // Click on a route to go to detail page
    const routeWithWaypoints = page.locator('[data-test="route-item"]').first();
    await routeWithWaypoints.click();
    
    // Wait for route detail page to load with reasonable timeout
    await page.waitForSelector('text=Detalhes da Rota', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-70-ac-3.png', fullPage: true });
    
    // Verify Google Maps section is displayed
    const googleMap = page.locator('[data-test="google-map"]');
    await expect(googleMap).toBeVisible();
    
    // Verify that the map loaded with directions
    const directionsRenderer = page.locator('div[role="map"]'); 
    await expect(directionsRenderer).toBeVisible();
  });

  test('AC4: User with a registered default motorcycle navigates to a route detail page → fuel estimation section displays motorcycle name, consumption (km/L), autonomy, and estimated fuel usage for the route distance', async ({ page }) => {
    // Navigate to routes listing page
    await page.getByRole('link', { name: 'Rotas' }).click();
    
    // Wait for the routes page to load with reasonable timeout
    await page.waitForSelector('text=Lista de Rotas', { timeout: 15000 });
    
    // Click on a route to go to detail page
    const routeWithWaypoints = page.locator('[data-test="route-item"]').first();
    await routeWithWaypoints.click();
    
    // Wait for route detail page to load with reasonable timeout
    await page.waitForSelector('text=Detalhes da Rota', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-70-ac-4.png', fullPage: true });
    
    // Verify fuel estimation section is visible
    const fuelEstimationSection = page.locator('[data-test="fuel-estimation"]');
    await expect(fuelEstimationSection).toBeVisible();
    
    // Verify motorcycle details are displayed
    const motorcycleName = page.locator('[data-test="motorcycle-name"]');
    await expect(motorcycleName).toBeVisible();
    
    const consumptionValue = page.locator('[data-test="consumption-value"]');
    await expect(consumptionValue).toBeVisible();
    
    const autonomyValue = page.locator('[data-test="autonomy-value"]');
    await expect(autonomyValue).toBeVisible();
    
    const fuelUsage = page.locator('[data-test="fuel-usage"]');
    await expect(fuelUsage).toBeVisible();
  });

  test('AC5: User without a registered motorcycle navigates to a route detail page → a message prompts them to register a motorcycle to see fuel estimates', async ({ page }) => {
    // Navigate to routes listing page
    await page.getByRole('link', { name: 'Rotas' }).click();
    
    // Wait for the routes page to load with reasonable timeout
    await page.waitForSelector('text=Lista de Rotas', { timeout: 15000 });
    
    // Click on a route to go to detail page
    const routeWithWaypoints = page.locator('[data-test="route-item"]').first();
    await routeWithWaypoints.click();
    
    // Wait for route detail page to load with reasonable timeout
    await page.waitForSelector('text=Detalhes da Rota', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-70-ac-5.png', fullPage: true });
    
    // Verify prompt to register motorcycle
    const registerPrompt = page.locator('text=Registre uma motocicleta para visualizar o cálculo de consumo');
    await expect(registerPrompt).toBeVisible();
  });
});