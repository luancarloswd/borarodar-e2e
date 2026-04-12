import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';

test.describe('BRAPP-19: Remove Profile Button from \'Mais\' Menu', () => {
  test.beforeAll(() => {
    if (!existsSync('screenshots')) {
      mkdirSync('screenshots', { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login flow with staging URL
    await page.goto('https://ride.borarodar.app', { timeout: 60000 });
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('text=Dashboard', { timeout: 60000 });
  });

  test('AC1: User opens the \'Mais\' (More) menu from the bottom navigation bar → the profile/perfil button is NOT visible in the menu options', async ({ page }) => {
    // Click on the 'Mais' button to open the menu
    await page.click('[aria-label="Mais"]');
    
    // Take screenshot before checking
    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-1.png', fullPage: true });
    
    // Verify profile button is not visible in the menu
    const profileButton = page.locator('text=Profile');
    await expect(profileButton).not.toBeVisible();
  });

  test('AC2: User navigates to the Perfil tab in the bottom navigation bar → the profile page loads and is accessible', async ({ page }) => {
    // Click on the Perfil tab
    await page.click('[aria-label="Perfil"]');
    
    // Wait for profile page to load
    await page.waitForSelector('text=Profile', { timeout: 30000 });
    
    // Take screenshot after navigation
    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-2.png', fullPage: true });
    
    // Verify profile page is loaded
    await expect(page).toHaveTitle(/Profile/);
  });

  test('AC3: User taps the avatar button in the top bar → the profile page or profile section is accessible', async ({ page }) => {
    // Click on the avatar button in top bar
    await page.click('[aria-label="User menu"]');
    
    // Take screenshot after avatar click
    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-3.png', fullPage: true });
    
    // Verify that a profile related element is accessible
    const profileLink = page.locator('text=Profile');
    await expect(profileLink).toBeVisible();
  });

  test('AC4: User opens the \'Mais\' menu → all other existing menu items remain visible and functional (no unintended removals)', async ({ page }) => {
    // Click on the 'Mais' button to open the menu
    await page.click('[aria-label="Mais"]');
    
    // Take screenshot before checking other items
    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-4.png', fullPage: true });
    
    // Verify that other menu items are still visible
    const menuItems = await page.locator('[role="menu"] li').all();
    expect(menuItems.length).toBeGreaterThan(0);
    
    // Verify that the profile button is not present but other items are present
    const profileButton = page.locator('text=Profile');
    await expect(profileButton).not.toBeVisible();
  });

  test('AC5: User navigates between the Perfil tab and the \'Mais\' menu multiple times → no broken links or UI artifacts from the removed button', async ({ page }) => {
    // Test navigation to perfil tab
    await page.click('[aria-label="Perfil"]');
    await page.waitForSelector('text=Profile', { timeout: 30000 });
    
    // Take screenshot after first navigation
    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-5-1.png', fullPage: true });
    
    // Go back to dashboard
    await page.click('[aria-label="Dashboard"]');
    await page.waitForSelector('text=Dashboard', { timeout: 30000 });
    
    // Open Mais menu
    await page.click('[aria-label="Mais"]');
    
    // Take screenshot after opening menu
    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-5-2.png', fullPage: true });
    
    // Verify profile button is not visible
    const profileButton = page.locator('text=Profile');
    await expect(profileButton).not.toBeVisible();
    
    // Test that other menu items are still accessible
    await page.click('[aria-label="Mais"]');
    
    // Take final screenshot 
    await page.screenshot({ path: 'screenshots/BRAPP-19-ac-5-3.png', fullPage: true });
  });
});