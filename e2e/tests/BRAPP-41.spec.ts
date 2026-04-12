import { test, expect } from '@playwright/test';

test.describe('BRAPP-41: Fix TypeScript type errors in public profile pipeline (TS2532, TS2375, TS2339, TS2352)', () => {
  test.beforeAll(() => {
    // Ensure screenshots directory exists
    try {
      const { mkdirSync } = require('fs');
      mkdirSync('screenshots', { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    // Login flow
    await page.goto(baseURL || 'https://ride.borarodar.app');
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    // Wait a bit more to ensure login is complete
    await page.waitForTimeout(2000);
  });

  test('AC1: User navigates to /profile/:username with a valid username → public profile page renders with profile header and follow button visible', async ({ page, baseURL }) => {
    // Navigate to a profile page
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/profile/testuser`);
    await page.waitForLoadState('networkidle');
    
    // Verify profile header and follow button are visible
    await expect(page.locator('data-testid=profile-header')).toBeVisible();
    await expect(page.locator('data-testid=follow-button')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-41-ac-1.png', fullPage: true });
  });

  test('AC2: User clicks Follow button on a public profile → button shows loading spinner during request and then updates to \'Following\' state on success', async ({ page, baseURL }) => {
    // Navigate to a profile page
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/profile/testuser`);
    await page.waitForLoadState('networkidle');
    
    // Click follow button
    const followButton = page.locator('data-testid=follow-button');
    await followButton.click();
    
    // Wait for loading state
    await page.waitForSelector('data-testid=follow-button[aria-busy=true]');
    
    // Wait for successful state
    await page.waitForSelector('data-testid=follow-button:has-text("Following")');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-41-ac-2.png', fullPage: true });
  });

  test('AC3: User navigates to /profile/:username with a non-existent username → a 404 or \'profile not found\' message is displayed instead of a blank page or unhandled error', async ({ page, baseURL }) => {
    // Navigate to a non-existent profile page
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/profile/nonexistentuser`);
    await page.waitForLoadState('networkidle');
    
    // Verify 404 or not found message
    await expect(page.locator('data-testid=profile-not-found')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-41-ac-3.png', fullPage: true });
  });

  test('AC4: User views a public profile while unauthenticated → follow button renders in its default (not loading) state without console errors or broken UI', async ({ page, baseURL }) => {
    // Log out first
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/logout`);
    
    // Navigate to a profile page
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/profile/testuser`);
    await page.waitForLoadState('networkidle');
    
    // Verify follow button is visible in default state
    await expect(page.locator('data-testid=follow-button')).toBeVisible();
    await expect(page.locator('data-testid=follow-button[aria-busy=false]')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-41-ac-4.png', fullPage: true });
  });

  test('AC5: User clicks Follow button and the request fails due to a network error → an error message is displayed near the follow button and the button returns to its default state', async ({ page, baseURL }) => {
    // Navigate to a profile page
    await page.goto(`${baseURL || 'https://ride.borarodar.app'}/profile/testuser`);
    await page.waitForLoadState('networkidle');
    
    // Click follow button
    const followButton = page.locator('data-testid=follow-button');
    await followButton.click();
    
    // Wait for error to appear
    await page.waitForSelector('data-testid=error-message');
    
    // Verify button returns to default state
    await expect(page.locator('data-testid=follow-button[aria-busy=false]')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-41-ac-5.png', fullPage: true });
  });
});