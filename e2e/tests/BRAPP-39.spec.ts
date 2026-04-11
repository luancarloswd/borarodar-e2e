import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-39: Fix 400 VALIDATION_ERROR on POST /api/destinations: accessType enum mismatch and missing adminLevel1 object', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    // Fill credentials and submit
    await page.getByLabel('Email').fill('test@borarodar.app');
    await page.getByLabel('Password').fill('borarodarapp');
    await page.getByRole('button', { name: 'Entrar' }).click();
    // Wait for dashboard/home to load
    await page.waitForSelector('text=Dashboard');
  });

  test('AC1: User fills out the new destination form and selects an access type (e.g., \'Asfalto\') → the form submits successfully without a 400 error and the destination is created', async ({ page }) => {
    // Navigate to destinations page
    await page.getByRole('link', { name: 'Destinos' }).click();
    await page.waitForSelector('text=Lista de Destinos');
    
    // Click on "Adicionar" button to create a new destination
    await page.getByRole('button', { name: 'Adicionar' }).click();
    
    // Fill form with required fields including valid access type
    await page.getByLabel('Nome').fill('Test Destination 1');
    await page.getByLabel('Cidade').fill('Test City');
    await page.getByLabel('Bairro').fill('Test Neighborhood');
    await page.getByLabel('Tipo de acesso').selectOption({ label: 'Asfalto' });
    await page.getByLabel('Região').selectOption({ label: 'São Paulo' });
    
    // Submit the form
    await page.getByRole('button', { name: 'Salvar' }).click();
    
    // Wait for success confirmation or redirect
    await page.waitForSelector('text=Destino criado com sucesso', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-39-ac-1.png', fullPage: true });
    
    // Verify success
    expect(await page.getByText('Destino criado com sucesso').isVisible()).toBe(true);
  });

  test('AC2: User fills out the new destination form and selects an adminLevel1 region from the dropdown → the submitted payload includes the adminLevel1 object and the backend accepts it', async ({ page }) => {
    // Navigate to destinations page
    await page.getByRole('link', { name: 'Destinos' }).click();
    await page.waitForSelector('text=Lista de Destinos');
    
    // Click on "Adicionar" button to create a new destination
    await page.getByRole('button', { name: 'Adicionar' }).click();
    
    // Fill form with required fields
    await page.getByLabel('Nome').fill('Test Destination 2');
    await page.getByLabel('Cidade').fill('Test City 2');
    await page.getByLabel('Bairro').fill('Test Neighborhood 2');
    await page.getByLabel('Tipo de acesso').selectOption({ label: 'Asfalto' });
    await page.getByLabel('Região').selectOption({ label: 'São Paulo' });
    
    // Submit the form
    await page.getByRole('button', { name: 'Salvar' }).click();
    
    // Wait for success confirmation or redirect
    await page.waitForSelector('text=Destino criado com sucesso', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-39-ac-2.png', fullPage: true });
    
    // Verify success
    expect(await page.getByText('Destino criado com sucesso').isVisible()).toBe(true);
  });

  test('AC3: User submits the new destination form with all required fields filled → a success confirmation message or redirect to the destination detail page is displayed', async ({ page }) => {
    // Navigate to destinations page
    await page.getByRole('link', { name: 'Destinos' }).click();
    await page.waitForSelector('text=Lista de Destinos');
    
    // Click on "Adicionar" button to create a new destination
    await page.getByRole('button', { name: 'Adicionar' }).click();
    
    // Fill form with required fields
    await page.getByLabel('Nome').fill('Test Destination 3');
    await page.getByLabel('Cidade').fill('Test City 3');
    await page.getByLabel('Bairro').fill('Test Neighborhood 3');
    await page.getByLabel('Tipo de acesso').selectOption({ label: 'Asfalto' });
    await page.getByLabel('Região').selectOption({ label: 'São Paulo' });
    
    // Submit the form
    await page.getByRole('button', { name: 'Salvar' }).click();
    
    // Wait for success confirmation or redirect
    await page.waitForSelector('text=Destino criado com sucesso', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-39-ac-3.png', fullPage: true });
    
    // Verify success
    expect(await page.getByText('Destino criado com sucesso').isVisible()).toBe(true);
  });

  test('AC4: User submits the new destination form with each available accessType option → all options map to valid backend enum values and the destination is created successfully', async ({ page }) => {
    // Test different access types
    const accessTypes = ['Asfalto', 'Lama', 'Pavimentada', 'Terra'];
    
    for (const accessType of accessTypes) {
      // Navigate to destinations page
      await page.getByRole('link', { name: 'Destinos' }).click();
      await page.waitForSelector('text=Lista de Destinos');
      
      // Click on "Adicionar" button to create a new destination
      await page.getByRole('button', { name: 'Adicionar' }).click();
      
      // Fill form with required fields
      await page.getByLabel('Nome').fill(`Test Destination ${accessType}`);
      await page.getByLabel('Cidade').fill(`Test City ${accessType}`);
      await page.getByLabel('Bairro').fill(`Test Neighborhood ${accessType}`);
      await page.getByLabel('Tipo de acesso').selectOption({ label: accessType });
      await page.getByLabel('Região').selectOption({ label: 'São Paulo' });
      
      // Submit the form
      await page.getByRole('button', { name: 'Salvar' }).click();
      
      // Wait for success confirmation or redirect (with larger timeout)
      await page.waitForSelector('text=Destino criado com sucesso', { timeout: 30000 });
      
      // Take screenshot
      await page.screenshot({ path: `screenshots/BRAPP-39-ac-4-${accessType}.png`, fullPage: true });
      
    // Verify success
    expect(await page.getByText('Destino criado com sucesso').isVisible()).toBe(true);
    }
  });

  test('AC5: User leaves the adminLevel1 field empty and submits the form → a client-side validation error is shown prompting the user to select a region before submission', async ({ page }) => {
    // Navigate to destinations page
    await page.getByRole('link', { name: 'Destinos' }).click();
    await page.waitForSelector('text=Lista de Destinos');
    
    // Click on "Adicionar" button to create a new destination
    await page.getByRole('button', { name: 'Adicionar' }).click();
    
    // Fill form with required fields but skip admin level
    await page.getByLabel('Nome').fill('Test Destination 5');
    await page.getByLabel('Cidade').fill('Test City 5');
    await page.getByLabel('Bairro').fill('Test Neighborhood 5');
    await page.getByLabel('Tipo de acesso').selectOption({ label: 'Asfalto' });
    // Leave 'Região' field empty intentionally - using selectOption with empty value
    
    // Try to submit and verify client-side validation
    await page.getByRole('button', { name: 'Salvar' }).click();
    
    // Wait for validation error
    await page.waitForSelector('text=Selecione uma região', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-39-ac-5.png', fullPage: true });
    
    // Verify validation error
    expect(await page.getByText('Selecione uma região').isVisible()).toBe(true);
  });
});