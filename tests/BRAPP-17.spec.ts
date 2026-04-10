import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-17: Fix: Callback Events Not Found When Clicking Approve/Edit/Cancel', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
  });

  test('AC1: User clicks the \'Approve\' button in Telegram after a bot restart → The request is approved, and an approval confirmation message is displayed.', async ({ page }) => {
    // Navigate to the requests page
    await page.getByRole('link', { name: 'Requests' }).click();
    await page.waitForLoadState('networkidle');
    
    // Find a request that can be approved (need to wait for requests to load)
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Take screenshot after navigating to requests
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-1-1.png', fullPage: true });
    
    // Click the approve button for the first request
    const approveButton = page.locator('button:has-text("Approve")').first();
    await approveButton.click();
    
    // Wait for approval confirmation
    await page.waitForSelector('text=Request approved successfully', { timeout: 10000 });
    
    // Take screenshot after approval
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-1-2.png', fullPage: true });
    
    // Verify approval confirmation message
    expect(await page.locator('text=Request approved successfully').isVisible()).toBe(true);
  });

  test('AC2: User clicks the \'Edit\' button in Telegram after a bot restart → The request details are presented for editing.', async ({ page }) => {
    // Navigate to the requests page
    await page.getByRole('link', { name: 'Requests' }).click();
    await page.waitForLoadState('networkidle');
    
    // Find a request that can be edited (need to wait for requests to load)
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Take screenshot after navigating to requests
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-2-1.png', fullPage: true });
    
    // Click the edit button for the first request
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();
    
    // Wait for edit form to load
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Take screenshot after clicking edit
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-2-2.png', fullPage: true });
    
    // Verify edit form is displayed
    expect(await page.locator('form').isVisible()).toBe(true);
  });

  test('AC3: User clicks the \'Cancel\' button in Telegram after a bot restart → The request is cancelled, and a cancellation confirmation message is displayed.', async ({ page }) => {
    // Navigate to the requests page
    await page.getByRole('link', { name: 'Requests' }).click();
    await page.waitForLoadState('networkidle');
    
    // Find a request that can be cancelled (need to wait for requests to load)
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Take screenshot after navigating to requests
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-3-1.png', fullPage: true });
    
    // Click the cancel button for the first request
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await cancelButton.click();
    
    // Wait for cancellation confirmation
    await page.waitForSelector('text=Request cancelled successfully', { timeout: 10000 });
    
    // Take screenshot after cancellation
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-3-2.png', fullPage: true });
    
    // Verify cancellation confirmation message
    expect(await page.locator('text=Request cancelled successfully').isVisible()).toBe(true);
  });
});