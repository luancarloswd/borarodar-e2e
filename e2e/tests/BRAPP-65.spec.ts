import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-65', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
  });

  test('AC1: User with a registered motorcycle navigates to a route detail page → the motorcycle\'s nickname, tank capacity, and average consumption are displayed in the fuel info section', async ({ page }) => {
    // Navigate to route detail page
    await page.click('a[href="/routes"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 10000 });
    await page.click('[data-testid="route-list"] a:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
    
    // Wait for fuel section to load and verify motorcycle specs are displayed 
    await page.waitForSelector('[data-testid="fuel-info-section"]', { timeout: 15000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-65-ac-1.png', fullPage: true });
    
    // Verify the fuel information section exists and contains expected data
    const fuelInfo = page.locator('[data-testid="fuel-info-section"]');
    await expect(fuelInfo).toBeVisible({ timeout: 10000 });
    
    // Verify elements are visible with better error handling
    const motorcycleNickname = page.locator('[data-testid="motorcycle-nickname"]');
    await expect(motorcycleNickname).toBeVisible({ timeout: 10000 });
    
    const tankCapacity = page.locator('[data-testid="tank-capacity"]');
    await expect(tankCapacity).toBeVisible({ timeout: 10000 });
    
    const avgConsumption = page.locator('[data-testid="avg-consumption"]');
    await expect(avgConsumption).toBeVisible({ timeout: 10000 });
    
    // Verify values are actually present (not just visible)
    const nicknameText = await motorcycleNickname.textContent();
    const tankCapacityText = await tankCapacity.textContent();
    const avgConsumptionText = await avgConsumption.textContent();
    
    expect(nicknameText).not.toBe('');
    expect(tankCapacityText).not.toBe('');
    expect(avgConsumptionText).not.toBe('');
  });

  test('AC2: User with a registered motorcycle opens the Budget Wizard at Step 3 → the motorcycle\'s tank capacity and average consumption are automatically pre-filled from the registry data', async ({ page }) => {
    // Navigate to budget wizard
    await page.click('a[href="/budget"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="budget-wizard"]', { timeout: 15000 });
    
    // Navigate to step 3 (Bikes) in budget wizard
    await page.click('[data-testid="budget-step-3"]');
    await page.waitForSelector('[data-testid="budget-bikes-step"]', { timeout: 15000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-65-ac-2.png', fullPage: true });
    
    // Verify tank capacity is pre-filled
    const tankCapacityField = page.locator('[data-testid="tank-capacity-field"]');
    await expect(tankCapacityField).toBeVisible({ timeout: 10000 });
    
    // Verify average consumption is pre-filled
    const avgConsumptionField = page.locator('[data-testid="avg-consumption-field"]');
    await expect(avgConsumptionField).toBeVisible({ timeout: 10000 });
    
    // Verify values are pre-filled (not empty)
    const tankCapacityValue = await tankCapacityField.inputValue();
    const avgConsumptionValue = await avgConsumptionField.inputValue();
    
    expect(tankCapacityValue).not.toBe('');
    expect(avgConsumptionValue).not.toBe('');
  });

  test('AC3: User views the route detail page → a calculated autonomy value (e.g., \'360 km range\') is visible based on the motorcycle\'s tank size and average consumption', async ({ page }) => {
    // Navigate to route detail page
    await page.click('a[href="/routes"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 10000 });
    await page.click('[data-testid="route-list"] a:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
    
    // Wait for fuel section to load
    await page.waitForSelector('[data-testid="fuel-info-section"]', { timeout: 15000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-65-ac-3.png', fullPage: true });
    
    // Verify autonomy value is displayed
    const autonomyValue = page.locator('[data-testid="autonomy-value"]');
    await expect(autonomyValue).toBeVisible({ timeout: 10000 });
    
    // Verify autonomy value is displayed with proper format (e.g., '360 km range')
    const autonomyText = await autonomyValue.textContent();
    expect(autonomyText).toContain('km range');
  });

  test('AC4: User records a new fuel supply that triggers a real consumption calculation and returns to the route page → the updated consumption value and a \'real\' data indicator are visible', async ({ page }) => {
    // Navigate to motorcycle management page or fuel supply recording page
    await page.click('a[href="/motorcycles"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="motorcycle-list"]', { timeout: 15000 });
    
    // Find the default motorcycle and click to manage it
    const defaultMotorcycle = page.locator('[data-testid="default-motorcycle"]');
    if (await defaultMotorcycle.isVisible()) {
      await defaultMotorcycle.click({ timeout: 10000 });
      await page.waitForSelector('[data-testid="motorcycle-detail"]', { timeout: 15000 });
    } else {
      // Navigate directly to the fuel supply page if no default motorcycle
      await page.goto('https://ride.borarodar.app/fuel-supply', { timeout: 10000 });
      await page.waitForSelector('[data-testid="fuel-supply-form"]', { timeout: 15000 });
    }
    
    // Record a new fuel supply 
    // Fill the fuel supply form with odometer data to trigger real consumption calculation
    await page.fill('[data-testid="odometer-input"]', '12345');
    await page.click('[data-testid="submit-fuel-supply"]');
    await page.waitForTimeout(2000); // Wait for processing
    
    // Navigate back to route detail page
    await page.click('a[href="/routes"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 10000 });
    await page.click('[data-testid="route-list"] a:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-65-ac-4.png', fullPage: true });
    
    // Verify updated consumption value is displayed
    const updatedConsumption = page.locator('[data-testid="avg-consumption"]');
    await expect(updatedConsumption).toBeVisible({ timeout: 10000 });
    
    // Verify 'real' data indicator is visible
    const realIndicator = page.locator('[data-testid="real-consumption-indicator"]');
    await expect(realIndicator).toBeVisible({ timeout: 10000 });
    
    // Verify the consumption value has been updated (not the initial value)
    const consumptionText = await updatedConsumption.textContent();
    expect(consumptionText).not.toBe('');
    expect(consumptionText).not.toEqual('0.0');
  });

  test('AC5: User with no registered motorcycles navigates to the route detail page → the fuel section displays a prompt to register a motorcycle or a manual input fallback', async ({ page }) => {
    // Navigate to route detail page
    await page.click('a[href="/routes"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-list"]', { timeout: 10000 });
    await page.click('[data-testid="route-list"] a:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="route-detail"]', { timeout: 15000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-65-ac-5.png', fullPage: true });
    
    // Verify the fuel section exists - might be empty or show registration prompt
    const fuelInfo = page.locator('[data-testid="fuel-info-section"]');
    await expect(fuelInfo).toBeVisible({ timeout: 10000 });
    
    // Verify registration prompt is displayed for user with no motorcycle
    const noMotorcycleMessage = page.locator('[data-testid="no-motorcycle-prompt"]');
    await expect(noMotorcycleMessage).toBeVisible({ timeout: 10000 });
    
    // Alternative check for manual input fallback
    const manualInputField = page.locator('[data-testid="manual-consumption-input"]');
    await expect(manualInputField).toBeVisible({ timeout: 10000 });
  });
});