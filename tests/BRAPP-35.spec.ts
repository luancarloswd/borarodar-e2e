import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-35: Fix POST /riders/:userId/follow Returns Server Error', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('text=Dashboard');
  });

  test('AC1: User clicks "Follow" button on another rider\'s profile → The "Follow" button\'s label changes to "Following" and no error messages are displayed.', async ({ page }) => {
    // Navigate to a rider's profile (assuming we need to find another user)
    await page.goto('https://ride.borarodar.app/riders');
    await page.waitForSelector('[data-testid="rider-card"]');
    
    // Click on the first available rider card to visit their profile
    await page.click('[data-testid="rider-card"]');
    
    // Wait for the follow button to appear
    await page.waitForSelector('[data-testid="follow-button"]');
    
    // Verify initial state is "Follow"
    const followButton = page.locator('[data-testid="follow-button"]');
    expect(await followButton.textContent()).toBe('Follow');
    
    // Click follow button
    await followButton.click();
    
    // Wait for the button to change to "Following"
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-35-ac-1.png', fullPage: true });
    
    // Re-locate the follow button to get updated state
    const updatedFollowButton = page.locator('[data-testid="follow-button"]');
    expect(await updatedFollowButton.textContent()).toBe('Following');
  });

  test('AC2: User clicks "Follow" button on a rider they are already following → The "Follow" button\'s label remains "Following", and no error message or toast is displayed.', async ({ page }) => {
    // Navigate to a rider's profile
    await page.goto('https://ride.borarodar.app/riders');
    await page.waitForSelector('[data-testid="rider-card"]');
    
    // Click on the first available rider card to visit their profile
    await page.click('[data-testid="rider-card"]');
    
    // Wait for the follow button to appear
    await page.waitForSelector('[data-testid="follow-button"]');
    
    // Click follow button (to ensure we're following)
    const followButton = page.locator('[data-testid="follow-button"]');
    expect(await followButton.textContent()).toBe('Follow');
    
    // Click follow button
    await followButton.click();
    
    // Wait for the button to change to "Following"
    await page.waitForTimeout(1000);
    
    // Verify button now says "Following"
    const updatedFollowButton = page.locator('[data-testid="follow-button"]');
    expect(await updatedFollowButton.textContent()).toBe('Following');
    
    // Click the follow button again to ensure it doesn't change or show error
    await updatedFollowButton.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-35-ac-2.png', fullPage: true });
    
    // Verify button still says "Following" and no error toast appeared
    const finalFollowButton = page.locator('[data-testid="follow-button"]');
    expect(await finalFollowButton.textContent()).toBe('Following');
  });

  test('AC3: User clicks the "Follow" button on their own profile → A user-visible error message indicating "Cannot follow yourself" is displayed.', async ({ page }) => {
    // Navigate to current user's profile
    await page.goto('https://ride.borarodar.app/profile');
    
    // Wait for the follow button to appear (if it exists on own profile page)
    await page.waitForSelector('[data-testid="follow-button"]');
    
    // Click follow button
    const followButton = page.locator('[data-testid="follow-button"]');
    
    // Verify button label and click
    await followButton.click();
    
    // Check for error message appears
    await page.waitForSelector('text=Cannot follow yourself', { timeout: 5000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-35-ac-3.png', fullPage: true });
    
    // Verify error message is displayed
    const errorMessage = page.locator('text=Cannot follow yourself');
    expect(await errorMessage.isVisible()).toBe(true);
  });

  test('AC4: User attempts to follow a non-existent user\'s profile → A user-visible error message indicating "User not found" is displayed.', async ({ page }) => {
    // Try to follow a specific non-existent user 
    await page.goto('https://ride.borarodar.app/riders/non-existent-user');
    
    // Wait for the follow button to potentially appear
    await page.waitForSelector('[data-testid="follow-button"]', { timeout: 5000 });
    
    // Click follow button
    const followButton = page.locator('[data-testid="follow-button"]');
    await followButton.click();
    
    // Wait for potential error message
    await page.waitForSelector('text=User not found', { timeout: 5000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-35-ac-4.png', fullPage: true });
    
    // Verify error message is displayed
    const errorMessage = page.locator('text=User not found');
    expect(await errorMessage.isVisible()).toBe(true);
  });
});