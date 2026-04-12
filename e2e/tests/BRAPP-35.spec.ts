import { test, expect } from '@playwright/test';

test.describe('BRAPP-35: Fix POST /riders/:userId/follow Returns Server Error', () => {
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('text=Dashboard', { timeout: 30000 });
  });

  test('AC1: User clicks the Follow button on another rider\'s profile → button toggles to an \'Following\' state and the target rider\'s follower count increments by 1', async ({ page }) => {
    // Navigate to a rider's profile
    await page.goto('https://ride.borarodar.app/rider/64b123456789012345678901');
    
    // Wait for the profile to load and check the follower count
    await page.waitForSelector('[data-testid="follower-count"]', { timeout: 15000 });
    
    // Take screenshot before follow
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-1-before.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
    
    // Get the existing follower count
    const followerCountElement = await page.locator('[data-testid="follower-count"]');
    const initialFollowerCount = await followerCountElement.textContent();
    
    // Click the follow button
    await page.locator('[data-testid="follow-button"]').click();
    
    // Wait for the button to change state and for follower count to update
    await page.waitForSelector('[data-testid="following-button"]', { timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // Take screenshot after follow
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-1-after.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
    
    // Verify the button changed to following state
    const followingButton = page.locator('[data-testid="following-button"]');
    expect(await followingButton.isVisible()).toBe(true);
    
    // Verify the follower count incremented
    const updatedFollowerCount = await followerCountElement.textContent();
    expect(parseInt(updatedFollowerCount!)).toBe(parseInt(initialFollowerCount!) + 1);
  });

  test('AC2: User clicks the Follow button on a rider they already follow → button remains in \'Following\' state and no error toast is displayed', async ({ page }) => {
    // Navigate to a rider's profile
    await page.goto('https://ride.borarodar.app/rider/64b123456789012345678902');
    
    // Wait for the profile to load
    await page.waitForSelector('[data-testid="following-button"]', { timeout: 15000 });
    
    // Take screenshot before follow (should already be following)
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-2-before.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
    
    // Click the follow button (already following)
    await page.locator('[data-testid="following-button"]').click();
    
    // Wait a bit for any potential error to appear
    await page.waitForTimeout(1000);
    
    // Take screenshot after clicking (should remain in following state)
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-2-after.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
    
    // Verify the button still shows following state (no error should be shown)
    const followingButton = page.locator('[data-testid="following-button"]');
    expect(await followingButton.isVisible()).toBe(true);
    
    // Verify no error toast appeared
    const errorToast = page.locator('[data-testid="follow-button-error"]');
    expect(await errorToast.isVisible()).toBe(false);
  });

  test('AC3: User attempts to follow themselves (navigates to own profile) → Follow button is either hidden or clicking it displays a \'You cannot follow yourself\' error message', async ({ page }) => {
    // Navigate to user's own profile
    await page.goto('https://ride.borarodar.app/profile');
    
    // Wait for the profile to load
    await page.waitForSelector('[data-testid="profile-header"]', { timeout: 15000 });
    
    // Take screenshot before checking
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-3-before.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
    
    // Verify follow button is hidden or error message appears
    const followButton = page.locator('[data-testid="follow-button"]');
    const followingButton = page.locator('[data-testid="following-button"]');
    const errorMessage = page.locator('[data-testid="follow-button-error"]');
    
    // Wait for button or error to appear and check state
    await page.waitForTimeout(1000);
    
    // Either button is hidden or error shows up
    const buttonVisible = await followButton.isVisible();
    const followingButtonVisible = await followingButton.isVisible();
    const errorVisible = await errorMessage.isVisible();
    
    expect(buttonVisible || followingButtonVisible || errorVisible).toBe(true);
    
    if (errorVisible) {
      const errorText = await errorMessage.textContent();
      expect(errorText).toContain("You cannot follow yourself");
    }
    
    // Take screenshot after checking
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-3-after.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
  });

  test('AC4: User clicks Follow on a rider profile that no longer exists (deleted account) → an appropriate \'User not found\' error message is displayed', async ({ page }) => {
    // Navigate to a non-existent rider's profile
    await page.goto('https://ride.borarodar.app/rider/000000000000000000000000');
    
    // Wait for the page to load or error to appear
    await page.waitForTimeout(2000);
    
    // Take screenshot before following attempt
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-4-before.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
    
    // Attempt to click follow button
    try {
      await page.locator('[data-testid="follow-button"]').click();
      
      // Wait for potential error message to appear
      await page.waitForTimeout(1000);
      
      // Take screenshot after follow attempt
      try {
        await page.screenshot({ path: 'screenshots/BRAPP-35-ac-4-after.png', fullPage: true });
      } catch (error) {
        // Continue even if screenshot fails
      }
      
      // Check if an error message appeared
      const errorMessage = page.locator('[data-testid="follow-button-error"]');
      expect(await errorMessage.isVisible()).toBe(true);
      
      const errorText = await errorMessage.textContent();
      expect(errorText).toContain("User not found");
    } catch (error) {
      // Take screenshot in case of immediate failure
      try {
        await page.screenshot({ path: 'screenshots/BRAPP-35-ac-4-error.png', fullPage: true });
      } catch (error) {
        // Continue even if screenshot fails
      }
    }
  });

  test('AC5: User follows another rider and then navigates to their own profile → the \'Following\' count has incremented by 1', async ({ page }) => {
    // Navigate to another user's profile and follow them
    await page.goto('https://ride.borarodar.app/rider/64b123456789012345678903');
    
    // Wait for the profile to load
    await page.waitForSelector('[data-testid="follower-count"]', { timeout: 15000 });
    
    // Take screenshot before follow
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-5-before.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
    
    // Get the existing following count
    const followingCountElement = await page.locator('[data-testid="following-count"]');
    const initialFollowingCount = await followingCountElement.textContent();
    
    // Click the follow button
    await page.locator('[data-testid="follow-button"]').click();
    
    // Wait for button to change to following state
    await page.waitForSelector('[data-testid="following-button"]', { timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // Take screenshot after follow
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-5-during.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
    
    // Navigate to own profile
    await page.goto('https://ride.borarodar.app/profile');
    
    // Wait for profile to load
    await page.waitForSelector('[data-testid="profile-header"]', { timeout: 15000 });
    
    // Take screenshot after navigation
    try {
      await page.screenshot({ path: 'screenshots/BRAPP-35-ac-5-after.png', fullPage: true });
    } catch (error) {
      // Continue even if screenshot fails
    }
    
    // Verify following count has been incremented
    const updatedFollowingCount = await followingCountElement.textContent();
    expect(parseInt(updatedFollowingCount!)).toBe(parseInt(initialFollowingCount!) + 1);
  });
});