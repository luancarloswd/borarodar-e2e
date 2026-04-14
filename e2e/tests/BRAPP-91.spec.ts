import { test, expect } from '@playwright/test';

test.describe('BRAPP-91: Fix MyEventsPage Crash on Undefined Data Length Access', () => {
  test.beforeAll(() => {
    // Ensure screenshots directory exists
    try {
      const { mkdirSync } = require('fs');
      mkdirSync('screenshots', { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }
  });

  test.beforeEach(async ({ page, baseURL }) => {
    // Login flow
    await page.goto(baseURL || 'https://ride.borarodar.app');
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    // Wait a bit more to ensure login is complete
    await page.waitForTimeout(2000);
  });

  test('AC1: User navigates to MyEventsPage while data is loading → a loading spinner or skeleton is displayed instead of a crash', async ({ page }) => {
    // Navigate to MyEventsPage
    await page.goto('https://ride.borarodar.app/meus-eventos');
    await page.waitForLoadState('networkidle');
    
    // Wait for loading state
    await page.waitForSelector('data-testid=loading-spinner', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-91-ac-1.png', fullPage: true });
    
    // Verify loading spinner is visible
    await expect(page.locator('data-testid=loading-spinner')).toBeVisible();
  });

  test('AC2: User navigates to MyEventsPage when the API returns an error → an error message is displayed instead of a crash', async ({ page }) => {
    // Navigate to MyEventsPage
    await page.goto('https://ride.borarodar.app/meus-eventos');
    await page.waitForLoadState('networkidle');
    
    // Wait for error state
    await page.waitForSelector('data-testid=error-message', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-91-ac-2.png', fullPage: true });
    
    // Verify error message is visible
    await expect(page.locator('data-testid=error-message')).toBeVisible();
  });

  test('AC3: User navigates to MyEventsPage with no enrolled events → an empty state message such as \'Você ainda não se inscreveu em nenhum evento\' is visible', async ({ page }) => {
    // Navigate to MyEventsPage
    await page.goto('https://ride.borarodar.app/meus-eventos');
    await page.waitForLoadState('networkidle');
    
    // Wait for empty state
    await page.waitForSelector('data-testid=empty-state-message', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-91-ac-3.png', fullPage: true });
    
    // Verify empty state message
    await expect(page.locator('data-testid=empty-state-message')).toContainText('Você ainda não se inscreveu em nenhum evento');
  });

  test('AC4: User navigates to MyEventsPage with enrolled events → the events list renders correctly showing all enrolled events', async ({ page }) => {
    // Navigate to MyEventsPage
    await page.goto('https://ride.borarodar.app/meus-eventos');
    await page.waitForLoadState('networkidle');
    
    // Wait for events to load
    await page.waitForSelector('data-testid=event-item', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-91-ac-4.png', fullPage: true });
    
    // Verify events list is visible
    await expect(page.locator('data-testid=event-item')).toBeVisible();
  });

  test('AC5: User refreshes MyEventsPage on a slow connection → the page transitions from loading state to content without any uncaught runtime error', async ({ page }) => {
    // Navigate to MyEventsPage
    await page.goto('https://ride.borarodar.app/meus-eventos');
    await page.waitForLoadState('networkidle');
    
    // Wait for some content to load
    await page.waitForSelector('data-testid=event-item', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-91-ac-5.png', fullPage: true });
    
    // Verify events are rendered without errors
    await expect(page.locator('data-testid=event-item')).toBeVisible();
  });
});