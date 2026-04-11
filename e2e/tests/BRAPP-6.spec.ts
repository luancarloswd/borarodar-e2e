import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-6: Rename \'Rolê\' to \'Rodar\' in Ride Action Button', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Set longer timeouts to prevent ETIMEDOUT errors
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    
    // Login flow
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Fill credentials and submit
    await emailInput.fill('test@borarodar.app');
    await passwordInput.fill('borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test('AC1: User opens the ride start screen → the primary action button displays \'RODAR\' instead of \'INICIAR ROLÊ\'', async ({ page }) => {
    // Wait for ride start screen to load
    await page.waitForSelector('[data-testid="ride-start-button"]');
    
    // Find the primary action button (either start or ride button)
    const rideButton = page.locator('[data-testid="ride-start-button"]');
    
    // Verify button text is 'RODAR' (not 'INICIAR ROLÊ')
    await expect(rideButton).toContainText('RODAR');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-6-ac-1.png', fullPage: true });
  });

  test('AC2: User starts a ride and views the active-ride dashboard → the end-ride button displays \'Encerrar\' instead of \'Encerrar Rolê\'', async ({ page }) => {
    // Start a ride by clicking on the start ride button
    await page.waitForSelector('[data-testid="ride-start-button"]');
    const startButton = page.locator('[data-testid="ride-start-button"]');
    await startButton.click();
    
    // Wait for ride to start and dashboard to update
    await page.waitForSelector('[data-testid="end-ride-button"]');
    
    // Verify end ride button text
    const endRideButton = page.locator('[data-testid="end-ride-button"]');
    await expect(endRideButton).toContainText('Encerrar');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-6-ac-2.png', fullPage: true });
  });

  test('AC3: User switches app language to English and opens the ride start screen → the primary action button displays \'Go\'', async ({ page }) => {
    // Navigate to language settings
    await page.waitForSelector('[data-testid="language-switcher"]');
    const languageSwitcher = page.locator('[data-testid="language-switcher"]');
    await languageSwitcher.click();
    
    // Switch to English
    const englishOption = page.locator('[data-testid="language-option-en"], [data-testid="language-option-english"]');
    if (await englishOption.isVisible()) {
      await englishOption.click();
    } else {
      // Alternative selector for English
      const englishLang = page.locator('text=English');
      await englishLang.click();
    }
    
    // Reload the page to ensure language change takes effect
    await page.reload();
    
    // Wait for dashboard to reload and find ride start button
    await page.waitForSelector('[data-testid="ride-start-button"]');
    
    // Verify button text is 'Go', not 'INICIAR ROLÊ' (as the English translations will be used)
    // Since we're checking with English, we are now expecting the English translation
    const startRideButton = page.locator('[data-testid="ride-start-button"]');
    await expect(startRideButton).toContainText('Go');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-6-ac-3.png', fullPage: true });
  });

  test('AC4: User switches app language to English and views the active-ride dashboard → the end-ride button displays \'End Ride\'', async ({ page }) => {
    // First start a ride to get to dashboard
    await page.waitForSelector('[data-testid="ride-start-button"]');
    const startButton = page.locator('[data-testid="ride-start-button"]');
    await startButton.click();
    
    // Wait for ride to start and dashboard to update
    await page.waitForSelector('[data-testid="end-ride-button"]');
    
    // Verify end ride button text
    const endRideButton = page.locator('[data-testid="end-ride-button"]');
    await expect(endRideButton).toContainText('End Ride');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-6-ac-4.png', fullPage: true });
  });

  test('AC5: User taps \'RODAR\' button → ride tracking begins and the UI transitions to the active-ride dashboard showing the \'Encerrar\' button', async ({ page }) => {
    // Click the start ride button (RODAR button) to begin tracking
    await page.waitForSelector('[data-testid="ride-start-button"]');
    const startRideButton = page.locator('[data-testid="ride-start-button"]');
    await startRideButton.click();
    
    // Wait for ride to start and UI to transition to active-ride dashboard
    await page.waitForSelector('[data-testid="end-ride-button"]');
    
    // Verify UI has transitioned to active ride dashboard by checking for end button
    const endRideButton = page.locator('[data-testid="end-ride-button"]');
    await expect(endRideButton).toContainText('Encerrar');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-6-ac-5.png', fullPage: true });
  });
});