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

test.describe('BRAPP-19: Remove Profile Button from \'Mais\' Menu', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('/');

    // Wait for login elements to be visible
    await page.waitForSelector('input[name="email"]');
    await page.waitForSelector('input[name="password"]');
    await page.waitForSelector('button[type="submit"]');

    await page.fill('input[name="email"]', LOGIN_EMAIL!);
    await page.fill('input[name="password"]', LOGIN_PASSWORD!);
    await page.click('button[type="submit"]');

    // Wait for dashboard/home to load by checking for a known element (e.g., navigation bar)
    await page.waitForSelector('nav, [role="navigation"], .bottom-nav', { timeout: 30000 });
  });

  test('AC1: User clicks the \'Mais\' (More) button in the bottom navigation bar → The \'Perfil\' (Profile) option is not displayed in the opened menu.', async ({ page }) => {
    // Find the 'Mais' (More) button. Based on typical mobile bottom nav, it might have text or an icon.
    const maisButton = page.getByTestId('tab-mais');
    await expect(maisButton).toBeVisible();
    await maisButton.click();

    // Wait for menu to open
    await page.waitForSelector('[role="menu"], .menu, .loc-menu, .dropdown-menu', { timeout: 15000 });
    
    // Check if 'Perfil' is NOT in the menu
    const openedMenu = page.locator('[role="menu"], .menu, .loc-menu, .dropdown-menu').first();
    await expect(openedMenu).toBeVisible();
    const perfilOption = openedMenu.locator('text=Perfil').first();
    await expect(perfilOption).not.toBeVisible();

    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-1.png', fullPage: true });
  });

  test('AC2: User navigates through all menu items within the \'Mais\' (More) menu → The \'Perfil\' (Profile) option is consistently absent from the list of actions.', async ({ page }) => {
    const maisButton = page.getByTestId('tab-mais');
    await maisButton.click();

    // Wait for menu to open
    await page.waitForSelector('[role="menu"], .menu, .loc-menu, .dropdown-menu', { timeout: 15000 });
    
    // Get all visible menu items only within the opened menu
    const openedMenu = page.locator('[role="menu"], .menu, .loc-menu, .dropdown-menu').first();
    await expect(openedMenu).toBeVisible();
    
    const menuItems = openedMenu.locator('.menu-item:visible, [role="menuitem"]:visible, button:visible, a:visible');
    const count = await menuItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = menuItems.nth(i);
      const text = await item.innerText();
      expect(text.toLowerCase()).not.toContain('perfil');
      expect(text.toLowerCase()).not.toContain('profile');
    }

    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-2.png', fullPage: true });
  });

  test('AC3: User interacts with the bottom navigation bar to open the \'Mais\' (More) menu → No clickable element labeled \'Perfil\' or \'Profile\' is found within the menu\'s visible area.', async ({ page }) => {
    const maisButton = page.getByTestId('tab-mais');
    await maisButton.click();

    // Wait for menu to open
    await page.waitForSelector('[role="menu"], .menu, .loc-menu, .dropdown-menu', { timeout: 15000 });
    
    // Scope the search to the opened visible 'Mais' menu container
    const openedMenu = page.locator('[role="menu"], .menu, .loc-menu, .dropdown-menu').first();
    await expect(openedMenu).toBeVisible();

    // Check for any clickable element with 'Perfil' or 'Profile' text only within the opened menu
    const clickablePerfil = openedMenu.locator('button, a, [role="button"]').filter({ hasText: /perfil|profile/i });
    await expect(clickablePerfil).toHaveCount(0);

    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-3.png', fullPage: true });
  });
});
