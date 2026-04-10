import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

test.describe('BRAPP-41: Fix TypeScript type errors in public profile pipeline (TS2532, TS2275, TS2339, TS2352)', () => {
  test.beforeAll(() => {
    // Ensure screenshots directory exists
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !LOGIN_EMAIL || !LOGIN_PASSWORD,
      'LOGIN_EMAIL and LOGIN_PASSWORD environment variables are required for login-dependent tests.',
    );

    // Login flow
    await page.goto('/');
    // Look for login form — email + password fields, submit button
    await page.locator('input[type="email"]').fill(LOGIN_EMAIL!);
    await page.locator('input[type="password"]').fill(LOGIN_PASSWORD!);
    await page.locator('button[type="submit"]').click();
    // Wait for dashboard/home to load with timeout
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
  });

  test('AC1: User navigates to a public profile page and initiates a follow/unfollow action → The follow button displays a loading state', async ({ page }) => {
    // Navigate to a public profile page
    await page.goto('/profile/123');
    
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
    await page.goto('/profile/123');
    
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
    await expect(page.locator('[data-testid="follow-button-error"]')).toContainText(/\S+/);
  });

  test('AC3: User navigates to a public profile page that fails to load due to an API error (e.g., profile not found, server error) → A clear error message is displayed on the page instead of profile content', async ({ page }) => {
    // Navigate to a public profile page that will cause an error
    await page.goto('/profile/999');
    
    // Wait for error to appear with timeout
    await page.waitForSelector('[data-testid="profile-error"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-41-ac-3.png', fullPage: true });
    
    // Verify error message is displayed instead of profile content
    await expect(page.locator('[data-testid="profile-error"]')).toContainText(/\S+/);
    await expect(page.locator('[data-testid="profile-error"]')).toContainText(/error/i);
  });
});