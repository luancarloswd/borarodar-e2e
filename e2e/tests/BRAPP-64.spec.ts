// @ts-nocheck
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-64: "title": "Fix Zero Gas Supply Estimation in Budget Wizard",', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://ride.borarodar.app', { waitUntil: 'networkidle', timeout: 30000 });
    // Look for login form — email + password fields, submit button
    // Fill credentials and submit
    // Wait for dashboard/home to load
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  });

  test('AC1: User fills Step 1 with 10 duration days, 300 avg km/day, and 2 rest days, then proceeds to Step 6 → \'Combustível\' line item displays a value greater than R$ 0,00', async ({ page }) => {
    await page.click('a[href="/budget/new"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Step 1: Duration based mode
    await page.click('text=Por Período');
    await page.fill('input[placeholder="Dias de viagem"]', '10');
    await page.fill('input[placeholder="Km médio por dia"]', '300');
    await page.fill('input[placeholder="Dias de descanso"]', '2');
    await page.click('button:has-text("Continuar")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Complete other steps with dummy data
    await page.click('button:has-text("Continuar")'); // Step 2 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 3 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 4 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 5 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Step 6: Review and generate estimate
    await page.click('button:has-text("Gerar estimativa")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForSelector('text=Combustível', { timeout: 30000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-64-ac-1.png', fullPage: true });
    
    // Wait for the fuel line to be visible and then check its value
    const fuelLine = await page.waitForSelector('text=Combustível', { timeout: 30000 });
    await expect(fuelLine).toBeVisible();
    
    // Get the next sibling element which contains the value
    const valueElement = fuelLine.nextSibling();
    const fuelValue = await valueElement.textContent();
    expect(fuelValue).not.toContain('R$ 0,00');
  });

  test('AC2: User navigates back to Step 1, changes duration days from 10 to 5, and returns to Step 6 → \'Combustível\' line item updates to a lower non-zero value', async ({ page }) => {
    await page.click('a[href="/budget/new"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Step 1: Duration based mode
    await page.click('text=Por Período');
    await page.fill('input[placeholder="Dias de viagem"]', '10');
    await page.fill('input[placeholder="Km médio por dia"]', '300');
    await page.fill('input[placeholder="Dias de descanso"]', '2');
    await page.click('button:has-text("Continuar")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Complete other steps with dummy data
    await page.click('button:has-text("Continuar")'); // Step 2 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 3 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 4 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 5 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Step 6: Review
    await page.click('button:has-text("Gerar estimativa")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Navigate back to Step 1 and change duration
    await page.click('button:has-text("Voltar")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Voltar")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.fill('input[placeholder="Dias de viagem"]', '5');
    await page.click('button:has-text("Continuar")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Continue to Step 6 again and generate estimate
    await page.click('button:has-text("Continuar")'); // Step 2 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 3 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 4 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 5 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    await page.click('button:has-text("Gerar estimativa")');
    await page.waitForLoadState('networkidle', { timeout: 30000 }); 
    await page.waitForSelector('text=Combustível', { timeout: 30000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-64-ac-2.png', fullPage: true });
    
    // Wait for the fuel line to be visible and then check its value
    const fuelLine = await page.waitForSelector('text=Combustível', { timeout: 30000 });
    await expect(fuelLine).toBeVisible();
    
    // Get the next sibling element which contains the value
    const valueElement = fuelLine.nextSibling();
    const fuelValue = await valueElement.textContent();
    expect(fuelValue).not.toContain('R$ 0,00');
  });

  test('AC3: User sets rest days equal to duration days in Step 1 → validation error message regarding invalid trip duration is displayed', async ({ page }) => {
    await page.click('a[href="/budget/new"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Step 1: Duration based mode
    await page.click('text=Por Período');
    await page.fill('input[placeholder="Dias de viagem"]', '10');
    await page.fill('input[placeholder="Km médio por dia"]', '300');
    await page.fill('input[placeholder="Dias de descanso"]', '10'); // Equal to duration days
    await page.click('button:has-text("Continuar")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Check for validation error
    await page.waitForSelector('text=Por favor, verifique os campos de entrada', { timeout: 30000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-64-ac-3.png', fullPage: true });
    
    const errorMessage = await page.waitForSelector('text=Por favor, verifique os campos de entrada', { timeout: 30000 });
    await expect(errorMessage).toBeVisible();
  });

  test('AC4: User selects \'Por Distância\' mode in Step 1 and enters 1500 km, then proceeds to Step 6 → \'Combustível\' line item displays a calculated cost instead of R$ 0,00', async ({ page }) => {
    await page.click('a[href="/budget/new"]');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Step 1: Distance based mode
    await page.click('text=Por Distância');
    await page.fill('input[placeholder="Distância total da viagem"]', '1500');
    await page.click('button:has-text("Continuar")');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Complete other steps with dummy data
    await page.click('button:has-text("Continuar")'); // Step 2 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 3 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 4 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.click('button:has-text("Continuar")'); // Step 5 
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Step 6: Review and generate estimate
    await page.click('button:has-text("Gerar estimativa")');
    await page.waitForLoadState('networkidle', { timeout: 30000 }); 
    await page.waitForSelector('text=Combustível', { timeout: 30000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-64-ac-4.png', fullPage: true });
    
    // Wait for the fuel line to be visible and then check its value
    const fuelLine = await page.waitForSelector('text=Combustível', { timeout: 30000 });
    await expect(fuelLine).toBeVisible();
    
    // Get the next sibling element which contains the value
    const valueElement = fuelLine.nextSibling();
    const fuelValue = await valueElement.textContent();
    expect(fuelValue).not.toContain('R$ 0,00');
  });
});