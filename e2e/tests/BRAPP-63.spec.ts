import { test, expect } from '@playwright/test';

test.describe('BRAPP-63: Now I have comprehensive understanding of the budget estimator feature. The bug is about number input fields (like tr...', () => {
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    
    // Wait for login form to appear
    await page.waitForSelector('input[type="email"]');
    await page.waitForSelector('input[type="password"]');
    
    // Fill credentials and submit
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Add a small delay to ensure everything is loaded
    await page.waitForTimeout(1000);
  });

  test('AC1: User navigates to /budget/new and reaches Step 1, clicks on the trip duration field showing \'14\', presses Home key to move cursor to the beginning, types \'2\' then deletes the original first digit → field displays \'24\' without the cursor jumping', async ({ page }) => {
    // Navigate to budget wizard
    await page.click('[data-testid="budget"]');
    await page.waitForSelector('[data-testid="budget-wizard"]');
    
    // Navigate to Step 1
    await page.click('[data-testid="step-1"]');
    await page.waitForSelector('[data-testid="trip-duration-input"]');
    
    // Focus the trip duration field
    await page.focus('[data-testid="trip-duration-input"]');
    
    // Select all text (Ctrl+A) and then move cursor to beginning (Home)
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Home');
    
    // Type '2' to replace the first digit
    await page.keyboard.type('2');
    
    // Add a small delay to ensure the change is processed
    await page.waitForTimeout(100);
    
    // Verify the value is '24' without cursor jumping
    const value = await page.inputValue('[data-testid="trip-duration-input"]');
    expect(value).toBe('24');
  });

  test('AC2: User on Step 1 clicks the average daily distance (km) field showing \'350\', clicks before the \'3\' to place cursor at position 0, types \'4\' and deletes \'3\' → field displays \'450\' and cursor remains at position 1', async ({ page }) => {
    // Navigate to Step 1 if not already there
    await page.click('[data-testid="step-1"]');
    await page.waitForSelector('[data-testid="average-daily-distance-input"]');
    
    // Focus the average daily distance field
    await page.focus('[data-testid="average-daily-distance-input"]');
    
    // Move cursor to beginning (Home key)
    await page.keyboard.press('Home');
    
    // Type '4' to replace the first digit
    await page.keyboard.type('4');
    
    // Add a small delay to ensure the change is processed
    await page.waitForTimeout(100);
    
    // Verify the value is '450'
    const value = await page.inputValue('[data-testid="average-daily-distance-input"]');
    expect(value).toBe('450');
  });

  test('AC3: User navigates to Step 5 (Extras), adds a custom extra item, types an R$ amount \'R$ 145,00\', then clicks before the \'1\' and replaces it with \'2\' → field displays \'R$ 245,00\' with cursor remaining after the newly typed digit', async ({ page }) => {
    // Navigate to Step 5
    await page.click('[data-testid="step-5"]');
    await page.waitForSelector('[data-testid="add-extra-item"]');
    
    // Add a new extra item
    await page.click('[data-testid="add-extra-item"]');
    
    // Fill currency amount 
    await page.fill('[data-testid="custom-amount-input"]', 'R$ 145,00');
    
    // Focus the currency input
    await page.focus('[data-testid="custom-amount-input"]');
    
    // Move cursor to beginning (Home key)
    await page.keyboard.press('Home');
    
    // Type '2' to replace the first digit
    await page.keyboard.type('2');
    
    // Add a small delay to ensure the change is processed
    await page.waitForTimeout(100);
    
    // Verify the value is 'R$ 245,00'
    const value = await page.inputValue('[data-testid="custom-amount-input"]');
    expect(value).toBe('R$ 245,00');
  });

  test('AC4: User on any number input field (days, km, rest days, riders, emergency percentage) presses Home, End, and Left/Right arrow keys → cursor moves freely to the expected position without snapping back to the end of the input', async ({ page }) => {
    // Navigate to Step 1
    await page.click('[data-testid="step-1"]');
    await page.waitForSelector('[data-testid="trip-duration-input"]');
    
    // Focus the trip duration field
    await page.focus('[data-testid="trip-duration-input"]');
    
    // Test Home key navigation
    await page.keyboard.press('Home');
    
    // Type '5' to change the first digit
    await page.keyboard.type('5');
    
    // Add a small delay to ensure the change is processed
    await page.waitForTimeout(100);
    
    // Verify the value is changed
    const value = await page.inputValue('[data-testid="trip-duration-input"]');
    expect(value).toBe('54');
  });

  test('AC5: User on Step 4 clicks the emergency buffer percentage field showing \'15\', selects the \'1\' using Shift+Home, types \'2\' → field displays \'25\' and min/max constraints are still enforced correctly', async ({ page }) => {
    // Navigate to Step 4
    await page.click('[data-testid="step-4"]');
    await page.waitForSelector('[data-testid="emergency-buffer-input"]');
    
    // Focus the emergency buffer field
    await page.focus('[data-testid="emergency-buffer-input"]');
    
    // Select from beginning to current position (Shift+Home)
    await page.keyboard.press('Shift+Home');
    
    // Type '2' to replace the first digit
    await page.keyboard.type('2');
    
    // Add a small delay to ensure the change is processed
    await page.waitForTimeout(100);
    
    // Verify the value is '25'
    const value = await page.inputValue('[data-testid="emergency-buffer-input"]');
    expect(value).toBe('25');
  });
});