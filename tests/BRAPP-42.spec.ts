import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';

test.describe('BRAPP-42: Fix TypeScript type mismatch in RouteEditorPage functional state update', () => {
  test.beforeAll(() => {
    if (!existsSync('screenshots')) {
      mkdirSync('screenshots', { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    const loginEmail = process.env.LOGIN_EMAIL;
    const loginPassword = process.env.LOGIN_PASSWORD;

    test.skip(!loginEmail || !loginPassword, 'LOGIN_EMAIL and LOGIN_PASSWORD must be set to run this test.');

    // Login flow
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="Email"]', loginEmail!);
    await page.fill('input[placeholder="Password"]', loginPassword!);
    await page.click('button[type="submit"]');
    await page.waitForSelector('nav', { timeout: 15000 }); // Wait for dashboard to load with extended timeout
  });

  test('AC1: User navigates to a new route in the Route Editor → The \'Add Stop\' button is visible, and no existing stops are listed.', async ({ page }) => {
    // Navigate to Route Editor
    await page.click('text=Route Editor');
    await page.waitForSelector('[data-testid="route-editor"]', { timeout: 15000 });

    // Verify 'Add Stop' button is visible and no stops are listed
    const addStopButton = page.getByRole('button', { name: 'Add Stop' });
    await expect(addStopButton).toBeVisible();
    
    // Verify no stops are listed
    const noStopsMessage = page.getByText('No stops');
    await expect(noStopsMessage).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-1.png', fullPage: true });
  });

  test('AC2: User removes the last remaining stop from a route → The stop list area displays a message indicating no stops, and the \'Add Stop\' button remains visible.', async ({ page }) => {
    // Navigate to Route Editor
    await page.click('text=Route Editor');
    await page.waitForSelector('[data-testid="route-editor"]', { timeout: 15000 });

    // Add a stop first
    await page.click('button:has-text("Add Stop")');
    await page.waitForSelector('[data-testid="stop-input"]', { timeout: 15000 });

    // Add stop and save
    await page.fill('[data-testid="stop-input"]', 'Test Stop');
    await page.click('text=Save Stop');

    // Verify stop was added
    await page.waitForSelector('text=Test Stop', { timeout: 15000 });
    
    // Remove the stop
    const removeButton = page.getByRole('button', { name: 'Remove' });
    await expect(removeButton).toBeVisible();
    await removeButton.click();
    
    // Wait for the removed stop to disappear
    await page.waitForSelector('text=Test Stop', { state: 'detached', timeout: 15000 });

    // Verify no stops message and add stop button still visible
    const noStopsMessage = page.getByText('No stops');
    await expect(noStopsMessage).toBeVisible();
    
    const addStopButton = page.getByRole('button', { name: 'Add Stop' });
    await expect(addStopButton).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-2.png', fullPage: true });
  });

  test('AC3: User clicks \'Save\' on a route with zero stops → A success notification appears, and no error message related to stops is displayed.', async ({ page }) => {
    // Navigate to Route Editor
    await page.click('text=Route Editor');
    await page.waitForSelector('[data-testid="route-editor"]', { timeout: 15000 });

    // Verify initial state (no stops)
    await page.waitForSelector('text=No stops', { timeout: 15000 });
    
    // Try to save
    await page.click('text=Save');
    
    // Wait for the expected success notification instead of using a fixed delay
    const successNotification = page.getByRole('alert').filter({ hasText: /success|saved/i });
    await expect(successNotification).toBeVisible();

    // Check that no stop-related error alert is shown
    const stopErrorAlert = page.getByRole('alert').filter({ hasText: /stop/i });
    await expect(stopErrorAlert).toHaveCount(0);

    await page.screenshot({ path: 'screenshots/BRAPP-42-ac-3.png', fullPage: true });
  });
});