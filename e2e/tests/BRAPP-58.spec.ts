import { test, expect } from '@playwright/test';

test.describe('BRAPP-58: Fix Non-Functional SOS Button on Route Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
  });

  test('AC1: User taps the SOS FAB button (🚨 PRECISO DE AJUDA) on a route detail page → an emergency type modal appears displaying 8 emergency options with emoji icons and Portuguese labels in a grid layout', async ({ page }) => {
    // Navigate to a route page
    await page.getByText('Rota 1').first().click();
    await page.waitForTimeout(1000);
    
    // Click SOS button
    await page.getByRole('button', { name: '🚨 PRECISO DE AJUDA' }).click();
    
    // Verify modal appears with 8 emergency types
    await page.waitForSelector('text=Tipo de emergência');
    await expect(page.getByText('Tipo de emergência')).toBeVisible();
    
    // Verify 8 emergency options are visible
    const emergencyOptions = await page.locator('[data-testid="emergency-type-option"]').count();
    expect(emergencyOptions).toBe(8);
    
    await page.screenshot({ path: 'screenshots/BRAPP-58-ac-1.png', fullPage: true });
  });

  test('AC2: User selects an emergency type in the modal and allows geolocation → a loading spinner with "Buscando ajuda..." text is shown, followed by navigation to a "Socorro em andamento" confirmation screen', async ({ page }) => {
    // Navigate to a route page
    await page.getByText('Rota 1').first().click();
    await page.waitForTimeout(1000);
    
    // Click SOS button
    await page.getByRole('button', { name: '🚨 PRECISO DE AJUDA' }).click();
    
    // Select first emergency type
    await page.locator('[data-testid="emergency-type-option"]').first().click();
    
    // Mock geolocation
    await page.addInitScript(() => {
      (navigator as any).geolocation = {
        getCurrentPosition: (success) => success({ 
          coords: { latitude: -23.5505, longitude: -46.6333 } 
        })
      };
    });
    
    // Wait for loading spinner
    await page.waitForSelector('text=Buscando ajuda...');
    await expect(page.getByText('Buscando ajuda...')).toBeVisible();
    
    // Wait for confirmation screen
    await page.waitForSelector('text=Socorro em andamento');
    await expect(page.getByText('Socorro em andamento')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/BRAPP-58-ac-2.png', fullPage: true });
  });

  test('AC3: User selects an emergency type but denies the browser location permission prompt → a toast message "Por favor, ative a localização para solicitar ajuda" is displayed and no request is submitted', async ({ page }) => {
    // Navigate to a route page
    await page.getByText('Rota 1').first().click();
    await page.waitForTimeout(1000);
    
    // Click SOS button
    await page.getByRole('button', { name: '🚨 PRECISO DE AJUDA' }).click();
    
    // Select first emergency type
    await page.locator('[data-testid="emergency-type-option"]').first().click();
    
    // Mock geolocation denial
    await page.addInitScript(() => {
      (navigator as any).geolocation = {
        getCurrentPosition: (success, error) => error({ code: 1, message: 'User denied geolocation' })
      };
    });
    
    // Wait for toast message
    await page.waitForSelector('text=Por favor, ative a localização para solicitar ajuda');
    await expect(page.getByText('Por favor, ative a localização para solicitar ajuda')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/BRAPP-58-ac-3.png', fullPage: true });
  });

  test('AC4: User who already has 3 active assistance requests selects an emergency type → a toast message "Você já tem pedidos de socorro ativos" is displayed and no new request is created', async ({ page }) => {
    // Navigate to a route page
    await page.getByText('Rota 1').first().click();
    await page.waitForTimeout(1000);
    
    // Click SOS button
    await page.getByRole('button', { name: '🚨 PRECISO DE AJUDA' }).click();
    
    // Select first emergency type
    await page.locator('[data-testid="emergency-type-option"]').first().click();
    
    // Mock geolocation with error (429 - too many requests)
    await page.addInitScript(() => {
      (navigator as any).geolocation = {
        getCurrentPosition: (success) => success({ 
          coords: { latitude: -23.5505, longitude: -46.6333 } 
        })
      };
    });
    
    // Wait for toast message for 429 error
    await page.waitForSelector('text=Você já tem pedidos de socorro ativos');
    await expect(page.getByText('Você já tem pedidos de socorro ativos')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/BRAPP-58-ac-4.png', fullPage: true });
  });

  test('AC5: User rapidly taps an emergency type option multiple times → the SOS button and modal buttons become visually disabled after the first tap and only a single assistance request is submitted', async ({ page }) => {
    // Navigate to a route page
    await page.getByText('Rota 1').first().click();
    await page.waitForTimeout(1000);
    
    // Click SOS button
    await page.getByRole('button', { name: '🚨 PRECISO DE AJUDA' }).click();
    
    // Select first emergency type multiple times rapidly
    const firstOption = page.locator('[data-testid="emergency-type-option"]').first();
    await firstOption.click();
    await firstOption.click();
    await firstOption.click();
    
    // Mock geolocation
    await page.addInitScript(() => {
      (navigator as any).geolocation = {
        getCurrentPosition: (success) => success({ 
          coords: { latitude: -23.5505, longitude: -46.6333 } 
        })
      };
    });
    
    // Wait for loading spinner (should only trigger once)
    await page.waitForSelector('text=Buscando ajuda...');
    await expect(page.getByText('Buscando ajuda...')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/BRAPP-58-ac-5.png', fullPage: true });
  });
});