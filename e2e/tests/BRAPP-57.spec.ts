// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('BRAPP-57: "title": "Add Harley-Davidson Fat Boy Variants to Motorcycle Catalog",', () => {

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    
    // Wait for dashboard/home to load
    await page.waitForURL('**/dashboard');
  });

  test('AC1: User selects \'Harley-Davidson\' make → \'Fat Boy\', \'Fat Boy Lo\', and \'Fat Boy S\' appear as options in the model dropdown', async ({ page }) => {
    // Navigate to motorcycle registration
    await page.getByRole('link', { name: 'Registrar Moto' }).click();
    
    // Select Harley-Davidson make
    await page.locator('select[name="make"]').selectOption('Harley-Davidson');
    
    // Wait for the model dropdown to update
    await page.waitForSelector('select[name="model"]');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-57-ac-1.png', fullPage: true });
    
    // Verify all three variants appear in the model dropdown
    const modelOptions = await page.locator('select[name="model"]').evaluate((el) => {
      return Array.from(el.options).map(option => option.text);
    });
    
    expect(modelOptions).toContain('Fat Boy');
    expect(modelOptions).toContain('Fat Boy Lo');
    expect(modelOptions).toContain('Fat Boy S');
  });

  test('AC2: User selects \'Fat Boy Lo\' → engine displacement field auto-fills with 1690 and power shows 78 HP', async ({ page }) => {
    // Navigate to motorcycle registration
    await page.getByRole('link', { name: 'Registrar Moto' }).click();
    
    // Select Harley-Davidson make and Fat Boy Lo model
    await page.locator('select[name="make"]').selectOption('Harley-Davidson');
    await page.locator('select[name="model"]').selectOption('Fat Boy Lo');
    
    // Wait for the form to update with new specs
    await page.waitForTimeout(500);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-57-ac-2.png', fullPage: true });
    
    // Verify engine displacement and power values
    const engineCc = await page.locator('input[name="engineCc"]').inputValue();
    const powerHp = await page.locator('input[name="powerHp"]').inputValue();
    
    expect(engineCc).toBe('1690');
    expect(powerHp).toBe('78');
  });

  test('AC3: User selects \'Fat Boy S\' → engine displacement field auto-fills with 1801 and consumption shows 14 km/L', async ({ page }) => {
    // Navigate to motorcycle registration
    await page.getByRole('link', { name: 'Registrar Moto' }).click();
    
    // Select Harley-Davidson make and Fat Boy S model
    await page.locator('select[name="make"]').selectOption('Harley-Davidson');
    await page.locator('select[name="model"]').selectOption('Fat Boy S');
    
    // Wait for the form to update with new specs
    await page.waitForTimeout(500);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-57-ac-3.png', fullPage: true });
    
    // Verify engine displacement and consumption values
    const engineCc = await page.locator('input[name="engineCc"]').inputValue();
    const consumption = await page.locator('input[name="defaultConsumptionKmL"]').inputValue();
    
    expect(engineCc).toBe('1801');
    expect(consumption).toBe('14');
  });

  test('AC4: User selects \'Fat Boy\' → engine displacement field displays 1868, verifying existing record integrity', async ({ page }) => {
    // Navigate to motorcycle registration
    await page.getByRole('link', { name: 'Registrar Moto' }).click();
    
    // Select Harley-Davidson make and Fat Boy model
    await page.locator('select[name="make"]').selectOption('Harley-Davidson');
    await page.locator('select[name="model"]').selectOption('Fat Boy');
    
    // Wait for the form to update with new specs
    await page.waitForTimeout(500);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-57-ac-4.png', fullPage: true });
    
    // Verify engine displacement value for the base Fat Boy
    const engineCc = await page.locator('input[name="engineCc"]').inputValue();
    
    expect(engineCc).toBe('1868');
  });

  test('AC5: User saves a \'Fat Boy Lo\' registration → the motorcycle details view displays 1690cc and 320 kg weight', async ({ page }) => {
    // Navigate to motorcycle registration
    await page.getByRole('link', { name: 'Registrar Moto' }).click();
    
    // Select Harley-Davidson make and Fat Boy Lo model
    await page.locator('select[name="make"]').selectOption('Harley-Davidson');
    await page.locator('select[name="model"]').selectOption('Fat Boy Lo');
    
    // Fill in remaining motorcycle details
    await page.locator('input[name="engineCc"]').fill('1690');
    await page.locator('input[name="weightKg"]').fill('320');
    await page.locator('input[name="tankCapacityL"]').fill('18.9');
    await page.locator('input[name="fuelType"]').fill('gasolina_aditivada');
    await page.locator('input[name="yearFrom"]').fill('2010');
    await page.locator('input[name="yearTo"]').fill('2017');
    await page.locator('input[name="powerHp"]').fill('78');
    await page.locator('input[name="torqueNm"]').fill('132');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for the success message or redirection
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-57-ac-5.png', fullPage: true });
    
    // Verify saved data in motorcycle details view
    const engineCc = await page.locator('text=1690').textContent();
    const weightKg = await page.locator('text=320 kg').textContent();
    
    expect(engineCc).toContain('1690');
    expect(weightKg).toContain('320 kg');
  });
});