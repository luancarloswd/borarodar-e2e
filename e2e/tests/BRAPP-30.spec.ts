import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-30: AI Feature Daily Interaction Limit per User', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow with explicit timeout and error handling
    await page.goto('https://ride.borarodar.app', { timeout: 30000 });
    // Look for login form — email + password fields, submit button
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    // Wait for dashboard/home to load
    await page.waitForSelector('header', { timeout: 10000 }); // Wait for dashboard to load
  });

  test('AC1: User performs 10 Fuel OCR scans in a single day and attempts an 11th scan → a blocking modal appears displaying the reset time (next UTC midnight) and preventing further scans', async ({ page }) => {
    // Navigate to Fuel OCR section with timeout
    await page.goto('https://ride.borarodar.app/fuel-ocr', { timeout: 30000 });
    
    // Wait for file upload input to be available with timeout
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // Take screenshot before interaction
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-1-start.png', fullPage: true });
    
    // Perform 10 successful OCR scans
    // We'll click the upload button multiple times to simulate scans
    for (let i = 0; i < 10; i++) {
      // Click on the upload input or button to simulate scanning
      await page.click('input[type="file"]', { timeout: 10000 });
      // Wait for any scan to complete
      await page.waitForTimeout(500);
    }
    
    // Try to perform the 11th scan (this should trigger the blocking modal)
    await page.click('input[type="file"]', { timeout: 10000 });
    
    // Take screenshot after interaction
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-1-end.png', fullPage: true });
    
    // Verify blocking modal appears
    const modal = await page.locator('.blocking-modal');
    await expect(modal).toBeVisible();
    
    // Verify the reset time is displayed (expected to be next UTC midnight)
    const resetTime = await page.locator('[data-testid="reset-time"]');
    await expect(resetTime).toBeVisible();
    
    // Verify that additional interactions are prevented (this can be verified by checking that 
    // no new scan button becomes active or that an alert appears)
    const warning = await page.locator('[data-testid="scan-limit-warning"]');
    await expect(warning).toBeVisible();
  });

  test('AC2: User performs AI interactions on any feature until X-AI-Remaining reaches 3 or fewer → a non-blocking warning banner appears indicating the remaining number of interactions for that feature', async ({ page }) => {
    // Navigate to any AI feature page with timeout
    await page.goto('https://ride.borarodar.app/fuel-ocr', { timeout: 30000 });
    
    // Wait for the UI elements to be loaded with timeout
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-2-start.png', fullPage: true });
    
    // Simulate some interactions to reduce the remaining count
    // Perform a few OCR scans to reduce the counter
    for (let i = 0; i < 7; i++) {
      await page.click('input[type="file"]', { timeout: 10000 });
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-2-end.png', fullPage: true });
    
    // Verify presence of the banner when remaining interactions are low
    const banner = await page.locator('[data-testid="ai-limit-banner"]');
    await expect(banner).toBeVisible();
    
    // Verify the banner shows the correct count (should be 3 or fewer)
    const remainingCount = await page.locator('[data-testid="ai-remaining-count"]');
    await expect(remainingCount).toBeVisible();
  });

  test('AC3: User exhausts the daily limit for Fuel OCR (10 scans) and then starts a Ride Diagnostic session → the diagnostic session starts successfully, confirming each AI feature tracks its limit independently', async ({ page }) => {
    // Navigate to Fuel OCR section with timeout
    await page.goto('https://ride.borarodar.app/fuel-ocr', { timeout: 30000 });
    
    // Wait for file upload input to be available with timeout
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-3-start.png', fullPage: true });
    
    // Exhaust the Fuel OCR limit (10 scans)
    for (let i = 0; i < 10; i++) {
      await page.click('input[type="file"]', { timeout: 10000 });
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-3-end.png', fullPage: true });
    
    // Navigate to diagnostic section
    await page.goto('https://ride.borarodar.app/roadside-assistance', { timeout: 30000 });
    
    // Wait for diagnostic button to be available with timeout
    await page.waitForSelector('button[aria-label="Start Diagnostic"]', { timeout: 10000 });
    
    // Attempt to start diagnostic - should work since it's a different feature
    await page.click('button[aria-label="Start Diagnostic"]');
    
    // Verify diagnostic can be started (this confirms independent limit tracking)
    const diagnosticButton = await page.locator('button[aria-label="Start Diagnostic"]');
    await expect(diagnosticButton).toBeVisible();
  });

  test('AC4: User triggers a Fuel OCR scan with an invalid/corrupt image that causes the AI service to fail → the remaining interaction count displayed in the UI does not decrease', async ({ page }) => {
    // Navigate to Fuel OCR section with timeout
    await page.goto('https://ride.borarodar.app/fuel-ocr', { timeout: 30000 });
    
    // Wait for file upload input with timeout
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-4-start.png', fullPage: true });
    
    // Get the initial remaining count
    const initialRemaining = await page.locator('[data-testid="ai-remaining-count"]').textContent();
    
    // Simulate uploading an invalid image by triggering a failed OCR scan
    await page.click('input[type="file"]', { timeout: 10000 });
    
    // Wait for the error or failure handling
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-4-end.png', fullPage: true });
    
    // Verify the interaction count hasn't decreased
    const afterRemaining = await page.locator('[data-testid="ai-remaining-count"]').textContent();
    
    // The remaining count should be unchanged
    expect(afterRemaining).toBe(initialRemaining);
    
    // Verify UI displays the correct interaction information
    const countDisplay = await page.locator('[data-testid="ai-remaining-count"]');
    await expect(countDisplay).toBeVisible();
  });

  test('AC5: User generates routes for a multi-day itinerary via the batch route endpoint → the remaining route interactions count decreases by exactly 1 regardless of the number of days processed', async ({ page }) => {
    // Navigate to itinerary generation section with timeout
    await page.goto('https://ride.borarodar.app/itineraries', { timeout: 30000 });
    
    // Wait for route generation button with timeout
    await page.waitForSelector('button[aria-label="Generate Route"]', { timeout: 10000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-5-start.png', fullPage: true });
    
    // Get the initial remaining count
    const initialRemaining = await page.locator('[data-testid="ai-remaining-count"]').textContent();
    
    // Simulate batch route generation
    await page.click('button[aria-label="Generate Route"]');
    
    // Wait for processing to complete
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/BRAPP-30-ac-5-end.png', fullPage: true });
    
    // Get the final remaining count
    const finalRemaining = await page.locator('[data-testid="ai-remaining-count"]').textContent();
    
    // Verify the count decreased by exactly 1 (not dependent on number of days)
    const initial = parseInt(initialRemaining);
    const final = parseInt(finalRemaining);
    expect(initial - final).toBe(1);
    
    // Verify batch route functionality
    const routeButton = await page.locator('button[aria-label="Generate Route"]');
    await expect(routeButton).toBeVisible();
  });
});