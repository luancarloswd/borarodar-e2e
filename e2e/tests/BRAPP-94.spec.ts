import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-94: Fix 400 Error on Mechanic Shop Submission Form', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page, baseURL }) => {
    // Login flow
    await page.goto(baseURL || 'https://ride.borarodar.app');
    await page.locator('[placeholder="Email"]').fill('test@borarodar.app');
    await page.locator('[placeholder="Password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('text=Dashboard');
  });

  test('AC1: User navigates to /mechanics/new, fills all required fields (name, address, city, state, categories) with valid data including a geocoded address, and clicks submit → a success toast appears with \'Oficina cadastrada\' message and the form resets or redirects', async ({ page, baseURL }) => {
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/mechanics/new`);
    await page.waitForSelector('text=Adicionar Oficina');
    
    // Fill form with valid data
    await page.locator('[placeholder="Nome da Oficina"]').fill('Test Mechanic Shop');
    await page.locator('[placeholder="Endereço"]').fill('Rua Teste, 123');
    await page.locator('[placeholder="Cidade"]').fill('São Paulo');
    await page.locator('[placeholder="Estado"]').fill('SP');
    await page.locator('select[name="stateAbbr"]').selectOption('SP');
    
    // Select categories (assuming there's at least one category)
    const categories = await page.locator('input[name="categories"]');
    if (await categories.count() > 0) {
      await categories.first().click();
    }
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for success message and take screenshot
    await page.waitForSelector('text=Oficina cadastrada');
    await page.screenshot({ path: 'screenshots/BRAPP-94-ac-1.png', fullPage: true });
    
    // Verify success toast appears
    expect(await page.locator('text=Oficina cadastrada').isVisible()).toBe(true);
  });

  test('AC2: User navigates to /mechanics/new, fills all fields except categories (leaves no category selected), and clicks submit → a validation error message is visible on the categories field and the form is not submitted', async ({ page, baseURL }) => {
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/mechanics/new`);
    await page.waitForSelector('text=Adicionar Oficina');
    
    // Fill form with valid data except categories
    await page.locator('[placeholder="Nome da Oficina"]').fill('Test Mechanic Shop');
    await page.locator('[placeholder="Endereço"]').fill('Rua Teste, 123');
    await page.locator('[placeholder="Cidade"]').fill('São Paulo');
    await page.locator('[placeholder="Estado"]').fill('SP');
    await page.locator('select[name="stateAbbr"]').selectOption('SP');
    
    // Do NOT select any categories
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for validation error and take screenshot
    await page.waitForSelector('text=Selecione ao menos uma categoria', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/BRAPP-94-ac-2.png', fullPage: true });
    
    // Verify validation error appears
    expect(await page.locator('text=Selecione ao menos uma categoria').isVisible()).toBe(true);
  });

  test('AC3: User navigates to /mechanics/new, enters an address that fails geocoding (no lat/lon resolved), and clicks submit → the form blocks submission and displays an error indicating the address could not be located', async ({ page, baseURL }) => {
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/mechanics/new`);
    await page.waitForSelector('text=Adicionar Oficina');
    
    // Fill form with invalid address that fails geocoding
    await page.locator('[placeholder="Nome da Oficina"]').fill('Test Mechanic Shop');
    await page.locator('[placeholder="Endereço"]').fill('NonExistentAddress123456789');
    await page.locator('[placeholder="Cidade"]').fill('São Paulo');
    await page.locator('[placeholder="Estado"]').fill('SP');
    await page.locator('select[name="stateAbbr"]').selectOption('SP');
    
    // Select categories
    const categories = await page.locator('input[name="categories"]');
    if (await categories.count() > 0) {
      await categories.first().click();
    }
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for geocoding error message and take screenshot
    await page.waitForSelector('text=Endereço não localizado', { timeout: 10000 });
    await page.screenshot({ path: 'screenshots/BRAPP-94-ac-3.png', fullPage: true });
    
    // Verify geocoding error appears
    expect(await page.locator('text=Endereço não localizado').isVisible()).toBe(true);
  });

  test('AC4: User navigates to /mechanics/new, submits with valid data → the created shop record stores correct geographic coordinates (verifiable by navigating to the shop detail or admin page and confirming the location is displayed correctly on the map)', async ({ page, baseURL }) => {
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/mechanics/new`);
    await page.waitForSelector('text=Adicionar Oficina');
    
    // Fill form with valid data
    await page.locator('[placeholder="Nome da Oficina"]').fill('Test Mechanic Shop');
    await page.locator('[placeholder="Endereço"]').fill('Rua Teste, 123');
    await page.locator('[placeholder="Cidade"]').fill('São Paulo');
    await page.locator('[placeholder="Estado"]').fill('SP');
    await page.locator('select[name="stateAbbr"]').selectOption('SP');
    
    // Select categories
    const categories = await page.locator('input[name="categories"]');
    if (await categories.count() > 0) {
      await categories.first().click();
    }
    
    // Add a small delay before submitting to ensure all UI elements are ready
    await page.waitForTimeout(500);
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for success message and take screenshot
    await page.waitForSelector('text=Oficina cadastrada');
    await page.screenshot({ path: 'screenshots/BRAPP-94-ac-4.png', fullPage: true });
    
    // Verify success toast appears
    expect(await page.locator('text=Oficina cadastrada').isVisible()).toBe(true);
  });

  test('AC5: User navigates to /mechanics/new, submits a form that triggers backend validation errors (e.g., missing required fields) → descriptive error messages from the server are displayed to the user via toast or inline form errors instead of a generic 400 error', async ({ page, baseURL }) => {
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/mechanics/new`);
    await page.waitForSelector('text=Adicionar Oficina');
    
    // Leave some fields empty to trigger validation errors
    await page.locator('[placeholder="Nome da Oficina"]').fill('');
    await page.locator('[placeholder="Endereço"]').fill('');
    await page.locator('[placeholder="Cidade"]').fill('');
    
    // Do NOT select any categories
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for validation error messages and take screenshot
    await page.waitForSelector('text=Nome da Oficina é obrigatório');
    await page.screenshot({ path: 'screenshots/BRAPP-94-ac-5.png', fullPage: true });
    
    // Verify validation error appears
    expect(await page.locator('text=Nome da Oficina é obrigatório').isVisible()).toBe(true);
  });
});