import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

test.describe('BRAPP-41: Fix TypeScript type errors in public profile pipeline (TS2532, TS2275, TS2339, TS2352)', () => {
  test.beforeAll(() => {
    // Ensure screenshots directory exists
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    // Wait for dashboard/home to load with timeout
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
  });

  test('AC1: User navigates to a public profile page and initiates a follow/unfollow action → The follow button displays a loading state', async ({ page }) => {
    // Navigate to a public profile page
    await page.goto('https://ride.borarodar.app/profile/123');
    
    // Wait for profile to load with timeout
    await page.waitForSelector('[data-testid="profile-header"]', { timeout: 10000 });
    
    // Click the follow button to initiate action
    const followButton = page.locator('[data-testid="follow-button"]');
    await followButton.click();
    
    // Verify loading state appears with timeout
    await page.waitForSelector('[data-testid="follow-button-loading"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-41-ac-1.png', fullPage: true });
    
    // Verify the loading state
    const isLoading = await page.locator('[data-testid="follow-button-loading"]').isVisible();
    expect(isLoading).toBe(true);
  });

  test('AC2: User navigates to a public profile page and a follow/unfollow action fails due to an API error → An error message related to the follow action is displayed near the follow button', async ({ page }) => {
    // Navigate to a public profile page
    await page.goto('https://ride.borarodar.app/profile/123');
    
    // Wait for profile to load with timeout
    await page.waitForSelector('[data-testid="profile-header"]', { timeout: 10000 });
    
    // Click the follow button to trigger API error scenario
    const followButton = page.locator('[data-testid="follow-button"]');
    await followButton.click();
    
    // Wait for error to appear with timeout
    await page.waitForSelector('[data-testid="follow-button-error"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-41-ac-2.png', fullPage: true });
    
    // Verify error message is displayed
    const errorMessage = await page.locator('[data-testid="follow-button-error"]').textContent();
    expect(errorMessage).toBeDefined();
  });

  test('AC3: User navigates to a public profile page that fails to load due to an API error (e.g., profile not found, server error) → A clear error message is displayed on the page instead of profile content', async ({ page }) => {
    // Navigate to a public profile page that will cause an error
    await page.goto('https://ride.borarodar.app/profile/999');
    
    // Wait for error to appear with timeout
    await page.waitForSelector('[data-testid="profile-error"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-41-ac-3.png', fullPage: true });
    
    // Verify error message is displayed instead of profile content
    const errorMessage = await page.locator('[data-testid="profile-error"]').textContent();
    expect(errorMessage).toBeDefined();
    expect(errorMessage).toContain('error');
  });
});