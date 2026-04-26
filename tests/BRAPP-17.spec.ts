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

test.describe('BRAPP-17: Fix: Callback Events Not Found When Clicking Approve/Edit/Cancel', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!LOGIN_EMAIL || !LOGIN_PASSWORD,
      'Skipping: set LOGIN_EMAIL and LOGIN_PASSWORD to run E2E tests');

    // Login flow
    await page.goto('/');
    await page.locator('input[name="email"]').fill(LOGIN_EMAIL);
    await page.locator('input[name="password"]').fill(LOGIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('link', { name: 'Requests' })).toBeVisible();
  });

  test('AC1: User clicks the \'Approve\' button on the web requests page → The request is approved, and an approval confirmation message is displayed.', async ({ page }) => {
    // Navigate to the requests page
    await page.getByRole('link', { name: 'Requests' }).click();
    await page.waitForLoadState('networkidle');
    
    // Wait for requests to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Take screenshot after navigating to requests
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-1-1.png', fullPage: true });
    
    // Assert an approvable request exists before clicking
    const approveButton = page.locator('button:has-text("Approve")').first();
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    
    // Wait for the approval confirmation message to appear
    await page.waitForSelector('text=Request approved successfully', { timeout: 10000 });
    
    // Take screenshot after approval
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-1-2.png', fullPage: true });
    
    // Verify approval confirmation message
    await expect(page.locator('text=Request approved successfully')).toBeVisible();
  });

  test('AC2: User clicks the \'Edit\' button on the web requests page → The request details are presented for editing.', async ({ page }) => {
    // Navigate to the requests page
    await page.getByRole('link', { name: 'Requests' }).click();
    await page.waitForLoadState('networkidle');
    
    // Wait for requests to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Take screenshot after navigating to requests
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-2-1.png', fullPage: true });
    
    // Assert an editable request exists before clicking
    const editButton = page.locator('button:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    await editButton.click();
    
    // Wait for request-edit-specific editable fields to load, not just any form
    const requestEditField = page.locator(
      'form input:not([type="hidden"]):not([name="email"]):not([name="password"]), form textarea, form select'
    ).first();
    await requestEditField.waitFor({ state: 'visible', timeout: 10000 });
    
    // Take screenshot after clicking edit
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-2-2.png', fullPage: true });
    
    // Verify request edit UI is displayed with an editable request field
    await expect(requestEditField).toBeVisible();
    await expect(requestEditField).toBeEditable();
  });

  test('AC3: User clicks the \'Cancel\' button on the web requests page → The request is cancelled, and a cancellation confirmation message is displayed.', async ({ page }) => {
    // Navigate to the requests page
    await page.getByRole('link', { name: 'Requests' }).click();
    await page.waitForLoadState('networkidle');
    
    // Wait for requests to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Take screenshot after navigating to requests
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-3-1.png', fullPage: true });
    
    // Assert a cancellable request exists before clicking
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
    
    // Wait for the cancellation confirmation message to appear
    await page.waitForSelector('text=Request cancelled successfully', { timeout: 10000 });
    
    // Take screenshot after cancellation
    await page.screenshot({ path: 'screenshots/BRAPP-17-ac-3-2.png', fullPage: true });
    
    // Verify cancellation confirmation message
    await expect(page.locator('text=Request cancelled successfully')).toBeVisible();
  });
});