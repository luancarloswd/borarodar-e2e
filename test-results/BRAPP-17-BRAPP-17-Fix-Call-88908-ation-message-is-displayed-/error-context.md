# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: BRAPP-17.spec.ts >> BRAPP-17: Fix: Callback Events Not Found When Clicking Approve/Edit/Cancel >> AC1: User clicks the 'Approve' button on the web requests page → The request is approved, and an approval confirmation message is displayed.
- Location: tests\BRAPP-17.spec.ts:27:7

# Error details

```
Error: Missing required environment variables: LOGIN_EMAIL and/or LOGIN_PASSWORD
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { mkdirSync } from 'fs';
  3   | 
  4   | const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
  5   | const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
  6   | 
  7   | test.describe('BRAPP-17: Fix: Callback Events Not Found When Clicking Approve/Edit/Cancel', () => {
  8   |   test.describe.configure({ mode: 'serial' });
  9   | 
  10  |   test.beforeAll(() => {
  11  |     mkdirSync('screenshots', { recursive: true });
  12  |   });
  13  | 
  14  |   test.beforeEach(async ({ page }) => {
  15  |     if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
> 16  |       throw new Error('Missing required environment variables: LOGIN_EMAIL and/or LOGIN_PASSWORD');
      |             ^ Error: Missing required environment variables: LOGIN_EMAIL and/or LOGIN_PASSWORD
  17  |     }
  18  | 
  19  |     // Login flow
  20  |     await page.goto('/');
  21  |     await page.locator('input[name="email"]').fill(LOGIN_EMAIL);
  22  |     await page.locator('input[name="password"]').fill(LOGIN_PASSWORD);
  23  |     await page.locator('button[type="submit"]').click();
  24  |     await expect(page.getByRole('link', { name: 'Requests' })).toBeVisible();
  25  |   });
  26  | 
  27  |   test('AC1: User clicks the \'Approve\' button on the web requests page → The request is approved, and an approval confirmation message is displayed.', async ({ page }) => {
  28  |     // Navigate to the requests page
  29  |     await page.getByRole('link', { name: 'Requests' }).click();
  30  |     await page.waitForLoadState('networkidle');
  31  |     
  32  |     // Wait for requests to load
  33  |     await page.waitForSelector('table', { timeout: 10000 });
  34  |     
  35  |     // Take screenshot after navigating to requests
  36  |     await page.screenshot({ path: 'screenshots/BRAPP-17-ac-1-1.png', fullPage: true });
  37  |     
  38  |     // Assert an approvable request exists before clicking
  39  |     const approveButton = page.locator('button:has-text("Approve")').first();
  40  |     await expect(approveButton).toBeVisible();
  41  |     await approveButton.click();
  42  |     
  43  |     // Wait for the approval confirmation message to appear
  44  |     await page.waitForSelector('text=Request approved successfully', { timeout: 10000 });
  45  |     
  46  |     // Take screenshot after approval
  47  |     await page.screenshot({ path: 'screenshots/BRAPP-17-ac-1-2.png', fullPage: true });
  48  |     
  49  |     // Verify approval confirmation message
  50  |     await expect(page.locator('text=Request approved successfully')).toBeVisible();
  51  |   });
  52  | 
  53  |   test('AC2: User clicks the \'Edit\' button on the web requests page → The request details are presented for editing.', async ({ page }) => {
  54  |     // Navigate to the requests page
  55  |     await page.getByRole('link', { name: 'Requests' }).click();
  56  |     await page.waitForLoadState('networkidle');
  57  |     
  58  |     // Wait for requests to load
  59  |     await page.waitForSelector('table', { timeout: 10000 });
  60  |     
  61  |     // Take screenshot after navigating to requests
  62  |     await page.screenshot({ path: 'screenshots/BRAPP-17-ac-2-1.png', fullPage: true });
  63  |     
  64  |     // Assert an editable request exists before clicking
  65  |     const editButton = page.locator('button:has-text("Edit")').first();
  66  |     await expect(editButton).toBeVisible();
  67  |     await editButton.click();
  68  |     
  69  |     // Wait for request-edit-specific editable fields to load, not just any form
  70  |     const requestEditField = page.locator(
  71  |       'form input:not([type="hidden"]):not([name="email"]):not([name="password"]), form textarea, form select'
  72  |     ).first();
  73  |     await requestEditField.waitFor({ state: 'visible', timeout: 10000 });
  74  |     
  75  |     // Take screenshot after clicking edit
  76  |     await page.screenshot({ path: 'screenshots/BRAPP-17-ac-2-2.png', fullPage: true });
  77  |     
  78  |     // Verify request edit UI is displayed with an editable request field
  79  |     await expect(requestEditField).toBeVisible();
  80  |     await expect(requestEditField).toBeEditable();
  81  |   });
  82  | 
  83  |   test('AC3: User clicks the \'Cancel\' button on the web requests page → The request is cancelled, and a cancellation confirmation message is displayed.', async ({ page }) => {
  84  |     // Navigate to the requests page
  85  |     await page.getByRole('link', { name: 'Requests' }).click();
  86  |     await page.waitForLoadState('networkidle');
  87  |     
  88  |     // Wait for requests to load
  89  |     await page.waitForSelector('table', { timeout: 10000 });
  90  |     
  91  |     // Take screenshot after navigating to requests
  92  |     await page.screenshot({ path: 'screenshots/BRAPP-17-ac-3-1.png', fullPage: true });
  93  |     
  94  |     // Assert a cancellable request exists before clicking
  95  |     const cancelButton = page.locator('button:has-text("Cancel")').first();
  96  |     await expect(cancelButton).toBeVisible();
  97  |     await cancelButton.click();
  98  |     
  99  |     // Wait for the cancellation confirmation message to appear
  100 |     await page.waitForSelector('text=Request cancelled successfully', { timeout: 10000 });
  101 |     
  102 |     // Take screenshot after cancellation
  103 |     await page.screenshot({ path: 'screenshots/BRAPP-17-ac-3-2.png', fullPage: true });
  104 |     
  105 |     // Verify cancellation confirmation message
  106 |     await expect(page.locator('text=Request cancelled successfully')).toBeVisible();
  107 |   });
  108 | });
```