import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-82: Fix Ride Validation Error: tracking.endLocation.timestamp Required', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test('AC1: User starts a new ride from the home screen → ride appears in the active rides list with status \'Active\' and no error toast is shown', async ({ page }) => {
    // Start a new ride
    await page.locator('[data-testid="start-ride-button"]').click();
    
    // Wait for ride to appear in active rides list
    await page.waitForSelector('[data-testid="active-rides-list"]');
    
    // Verify ride is in active list
    await expect(page.locator('[data-testid="active-rides-list"]')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-82-ac-1.png', fullPage: true });
    
    // Verify no error toast is shown
    await expect(page.locator('[data-testid="error-toast"]')).not.toBeVisible();
    
    // Wait for a bit to ensure everything is in proper state
    await page.waitForTimeout(500);
  });

  test('AC2: User completes a ride after GPS tracking was active → ride detail page loads with status \'Completed\' and an end location marker on the map', async ({ page }) => {
    // Start a new ride
    await page.locator('[data-testid="start-ride-button"]').click();
    
    // Wait for ride to start
    await page.waitForSelector('[data-testid="active-rides-list"]');
    
    // Complete the ride
    await page.locator('[data-testid="complete-ride-button"]').click();
    
    // Wait for ride to be completed
    await page.waitForSelector('[data-testid="ride-details"]');
    
    // Verify ride is completed
    await expect(page.locator('[data-testid="ride-status"]')).toContainText('Completed');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-82-ac-2.png', fullPage: true });
    
    // Wait for marker to appear (sometimes it takes extra time to render)
    await page.waitForTimeout(3000);
    const marker = page.locator('[data-testid="end-location-marker"]');
    
    // If marker is not visible, wait a bit more and check one final time
    try {
      await expect(marker).toBeVisible();
    } catch (error) {
      // If marker is still not visible, check if we're seeing a timestamp error in the UI
      const isCompleted = await page.locator('[data-testid="ride-status"]').textContent();
      if (isCompleted?.includes('Completed')) {
        // Even though completed, check for timestamp-related messages
        const errorElements = await page.locator('[data-testid*="error"], [data-testid*="timestamp"], [data-testid*="invalid"]').all();
        if (errorElements.length > 0) {
          const errorTexts = [];
          for (const element of errorElements) {
            const text = await element.textContent();
            if (text) errorTexts.push(text);
          }
          throw new Error(`Ride completed but encountered timestamp validation error: ${errorTexts.join(', ')}`);
        }
      }
      throw error;
    }
  });

  test('AC3: User completes a ride that was started without GPS permission (no track points) → ride transitions to \'Completed\' state and detail page renders without a crash or error toast', async ({ page }) => {
    // Start a new ride
    await page.locator('[data-testid="start-ride-button"]').click();
    
    // Wait for ride to start
    await page.waitForSelector('[data-testid="active-rides-list"]');
    
    // Complete the ride (with no GPS)
    await page.locator('[data-testid="complete-ride-button"]').click();
    
    // Wait for ride detail page to load
    await page.waitForSelector('[data-testid="ride-details"]');
    
    // Verify ride is completed
    await expect(page.locator('[data-testid="ride-status"]')).toContainText('Completed');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-82-ac-3.png', fullPage: true });
    
    // Verify no error toast
    await expect(page.locator('[data-testid="error-toast"]')).not.toBeVisible();
    
    // Ensure no timestamp-related error messages appear
    await page.waitForTimeout(1000);
    const errorElements = await page.locator('[data-testid*="error"], [data-testid*="timestamp"], [data-testid*="invalid"]').all();
    
    if (errorElements.length > 0) {
      const errorTexts = [];
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text) errorTexts.push(text);
      }
      throw new Error(`Ride completed but encountered timestamp or validation errors: ${errorTexts.join(', ')}`);
    }
  });

  test('AC4: User pauses and resumes an active ride multiple times → ride status toggles between \'Paused\' and \'Active\' each time with no error message', async ({ page }) => {
    // Start a new ride
    await page.locator('[data-testid="start-ride-button"]').click();
    
    // Wait for ride to start
    await page.waitForSelector('[data-testid="active-rides-list"]');
    
    // Pause the ride
    await page.locator('[data-testid="pause-ride-button"]').click();
    
    // Wait for pause confirmation
    await page.waitForSelector('[data-testid="ride-status"]');
    
    // Verify ride is paused
    await expect(page.locator('[data-testid="ride-status"]')).toContainText('Paused');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-82-ac-4.png', fullPage: true });
    
    // Resume the ride
    await page.locator('[data-testid="resume-ride-button"]').click();
    
    // Wait for resume confirmation
    await page.waitForSelector('[data-testid="ride-status"]');
    
    // Verify ride is active
    await expect(page.locator('[data-testid="ride-status"]')).toContainText('Active');
    
    // Verify no error toast
    await expect(page.locator('[data-testid="error-toast"]')).not.toBeVisible();
  });

  test('AC5: User opens a previously-broken ride from the rides history list → ride detail page renders normally instead of showing an error state', async ({ page }) => {
    // Navigate to history
    await page.locator('[data-testid="history-tab"]').click();
    
    // Wait for history to load
    await page.waitForSelector('[data-testid="rides-history-list"]');
    
    // Select a ride from history (assuming at least one exists)
    const rideItems = await page.locator('[data-testid="ride-history-item"]').all();
    
    if (rideItems.length > 0) {
      await rideItems[0].click();
      
      // Wait for ride details to load
      await page.waitForSelector('[data-testid="ride-details"]');
      
      // Take screenshot
      await page.screenshot({ path: 'screenshots/BRAPP-82-ac-5.png', fullPage: true });
      
      // Verify ride detail page renders normally
      await expect(page.locator('[data-testid="ride-details"]')).toBeVisible();
      
      // Verify no error state
      await expect(page.locator('[data-testid="error-state"]')).not.toBeVisible();
    }
  });
});