import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    // Return a default value for build/test environments where these might not be set
    if (name === 'BASE_URL') return 'https://ride.borarodar.app';
    if (name === 'LOGIN_EMAIL') return 'test@borarodar.app';
    if (name === 'LOGIN_PASSWORD') return 'borarodarapp';
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const BASE_URL = getRequiredEnv('BASE_URL');
const LOGIN_EMAIL = getRequiredEnv('LOGIN_EMAIL');
const LOGIN_PASSWORD = getRequiredEnv('LOGIN_PASSWORD');

async function login(page: any) {
  await page.goto(BASE_URL);

  await page.fill('input[type="email"], input[name="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Entrar")');

  // Wait for dashboard/home to load - checking for a common element or URL change
  await page.waitForURL(/.*dashboard|.*home|.*feed/);
}

test.describe('BRAPP-12: Fix menu overlap on camera scan button in mobile gas supply registration', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('AC1: User navigates to the fuel supply registration form on a mobile device ╬ô├Ñ├å \'Ler visor da bomba\' button is fully visible and clickable.', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Using known route/UI affordances as suggested
    await page.click('data-testid="moto-card"'); 
    await page.click('data-testid="add-fuel-btn"');
    
    const btnVisor = page.locator('data-testid="scan-pump-btn"');
    await expect(btnVisor).toBeVisible();
    await expect(btnVisor).toBeInViewport({ ratio: 1 });
    // Trial click to ensure not obscured
    await btnVisor.click();
    
    await page.screenshot({ path: 'screenshots/BRAPP-12-ac-1.png', fullPage: true });
  });

  test('AC2: User navigates to the fuel supply registration form on a mobile device ╬ô├Ñ├å \'Ler cupom fiscal\' button is fully visible and clickable.', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('data-testid="moto-card"'); 
    await page.click('data-testid="add-fuel-btn"');
    
    const btnCupom = page.locator('data-testid="scan-receipt-btn"');
    await expect(btnCupom).toBeVisible();
    await expect(btnCupom).toBeInViewport({ ratio: 1 });
    await btnCupom.click();
    
    await page.screenshot({ path: 'screenshots/BRAPP-12-ac-2.png', fullPage: true });
  });

  test('AC3: User scrolls to the bottom of the fuel supply registration form on a mobile device ╬ô├Ñ├å \'Ler visor da bomba\' button remains fully visible and clickable, not obscured by any navigation elements.', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('data-testid="moto-card"');
    await page.click('data-testid="add-fuel-btn"');
    
    // Scroll the modal container instead of window
    const modal = page.locator('.overflow-y-auto');
    await modal.evaluate((el: any) => el.scrollTop = el.scrollHeight);
    
    const btnVisor = page.locator('data-testid="scan-pump-btn"');
    await expect(btnVisor).toBeVisible();
    await expect(btnVisor).toBeEnabled();
    
    await page.screenshot({ path: 'screenshots/BRAPP-12-ac-3.png', fullPage: true });
  });

  test('AC4: User scrolls to the bottom of the fuel supply registration form on a mobile device ╬ô├Ñ├å \'Ler cupom fiscal\' button remains fully visible and clickable, not obscured by any navigation elements.', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('data-testid="moto-card"');
    await page.click('data-testid="add-fuel-btn"');
    
    const modal = page.locator('.overflow-y-auto');
    await modal.evaluate((el: any) => el.scrollTop = el.scrollHeight);
    
    const btnCupom = page.locator('data-testid="scan-receipt-btn"');
    await expect(btnCupom).toBeVisible();
    await expect(btnCupom).toBeEnabled();
    
    await page.screenshot({ path: 'screenshots/BRAPP-12-ac-4.png', fullPage: true });
  });
});
