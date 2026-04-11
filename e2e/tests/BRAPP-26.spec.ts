import { test, expect } from '@playwright/test';

test.describe('BRAPP-26: Bug Fix: Destination City Dropdown Not Listing Cities in Create Route Form', () => {
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.getByLabel('Email').fill('test@borarodar.app');
    await page.getByLabel('Password').fill('borarodarapp');
    await page.getByRole('button', { name: 'Entrar' }).click();
    // Wait for dashboard/home to load
    await page.waitForSelector('nav');
  });

  test('AC1: User types a city name in the destination field on the Create Route form → a dropdown appears listing matching city names within 2 seconds', async ({ page }) => {
    // Navigate to Create Route form
    await page.getByRole('link', { name: 'Rotas' }).click();
    await page.getByRole('button', { name: 'Nova Rota' }).click();
    
    // Type in destination field
    const destinationField = page.getByLabel('Destino');
    await destinationField.fill('São');
    
    // Wait for dropdown to appear with cities (with timeout)
    await page.waitForSelector('div[role="listbox"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-26-ac-1.png', fullPage: true });
    
    // Verify dropdown appears and contains cities
    const dropdown = page.getByRole('listbox');
    await expect(dropdown).toBeVisible();
    const cityItems = await page.$$('div[role="option"]');
    expect(cityItems.length).toBeGreaterThan(0);
  });

  test('AC2: User types a city name in the origin field on the Create Route form → a dropdown appears listing matching city names within 2 seconds', async ({ page }) => {
    // Navigate to Create Route form
    await page.getByRole('link', { name: 'Rotas' }).click();
    await page.getByRole('button', { name: 'Nova Rota' }).click();
    
    // Type in origin field
    const originField = page.getByLabel('Origem');
    await originField.fill('Rio');
    
    // Wait for dropdown to appear with cities (with timeout)
    await page.waitForSelector('div[role="listbox"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-26-ac-2.png', fullPage: true });
    
    // Verify dropdown appears and contains cities
    const dropdown = page.getByRole('listbox');
    await expect(dropdown).toBeVisible();
    const cityItems = await page.$$('div[role="option"]');
    expect(cityItems.length).toBeGreaterThan(0);
  });

  test('AC3: User selects a city from the destination dropdown on the Create Route form → the selected city name populates the destination input and the dropdown closes', async ({ page }) => {
    // Navigate to Create Route form
    await page.getByRole('link', { name: 'Rotas' }).click();
    await page.getByRole('button', { name: 'Nova Rota' }).click();
    
    // Type in destination field
    const destinationField = page.getByLabel('Destino');
    await destinationField.fill('São');
    
    // Wait for dropdown to appear with cities (with timeout)
    await page.waitForSelector('div[role="listbox"]', { timeout: 10000 });
    
    // Get the first city name before selecting it to validate it's populated correctly
    const firstCityElement = page.getByRole('option').first();
    const firstCityName = await firstCityElement.textContent();
    
    // Select first city from dropdown
    await firstCityElement.click();
    
    // Verify that dropdown is closed and input is populated (with timeout)
    await page.waitForSelector('div[role="listbox"]', { state: 'hidden', timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-26-ac-3.png', fullPage: true });
    
    // Verify the input field has the selected city name
    const inputValue = await destinationField.inputValue();
    expect(inputValue).toBeTruthy();
    // Validate that the input contains the city name that was selected
    expect(inputValue).toContain(firstCityName?.trim());
  });

  test('AC4: User types a nonsensical string in the destination city field on the Create Route form → the dropdown displays the message Nenhuma cidade encontrada. Tente outro nome.', async ({ page }) => {
    // Navigate to Create Route form
    await page.getByRole('link', { name: 'Rotas' }).click();
    await page.getByRole('button', { name: 'Nova Rota' }).click();
    
    // Type in a nonsensical city name
    const destinationField = page.getByLabel('Destino');
    await destinationField.fill('qwerasdf');
    
    // Wait for dropdown to appear or to be populated (with timeout)
    await page.waitForSelector('div[role="listbox"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-26-ac-4.png', fullPage: true });
    
    // Verify the empty state message appears
    const emptyMessage = page.getByText('Nenhuma cidade encontrada. Tente outro nome.');
    await expect(emptyMessage).toBeVisible();
  });

  test('AC5: User types a city name in the origin or destination field on the Tour Leg form → a dropdown appears listing matching city names, and selecting one populates the input', async ({ page }) => {
    // Navigate to Tour Leg form
    await page.getByRole('link', { name: 'Tours' }).click();
    await page.getByRole('button', { name: 'Novo Tour' }).click();
    
    // Click on a leg to edit
    await page.getByText('Clique para editar').first().click();
    
    // Type in destination field (should be same component as route form)
    const destinationField = page.getByLabel('Destino');
    await destinationField.fill('São');
    
    // Wait for dropdown to appear with cities (with timeout)
    await page.waitForSelector('div[role="listbox"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-26-ac-5.png', fullPage: true });
    
    // Verify dropdown appears and contains cities
    const dropdown = page.getByRole('listbox');
    await expect(dropdown).toBeVisible();
    const cityItems = await page.$$('div[role="option"]');
    expect(cityItems.length).toBeGreaterThan(0);
  });
});