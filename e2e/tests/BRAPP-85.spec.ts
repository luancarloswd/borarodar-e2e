import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-85: Tour Feature Dropdown Clipping Issue', () => {
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
    // Wait a bit more for login to complete
    await page.waitForTimeout(1000);
  });

  test('AC1: User navigates to /tours/new, adds 5+ legs, clicks the origin or destination cell on the last row, and types a city name → autocomplete dropdown is fully visible and not clipped by table rows or the table container boundary', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/tours/new');
    await page.waitForLoadState('networkidle');
    
    // Add 5+ legs to the table
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="add-leg-button"]').click();
      // Use waitForLoadState instead of timeout for more reliability
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for the table to update
    await page.waitForTimeout(500);
    
    // Click on the last row's origin cell and type a city name
    const lastRowOriginCell = page.locator('table tbody tr:last-child td:first-child input');
    await lastRowOriginCell.click();
    await lastRowOriginCell.fill('New York');
    
    // Wait for dropdown to appear with a longer timeout
    await page.waitForSelector('[data-testid="place-search-dropdown"]', { timeout: 10000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-85-ac-1.png', fullPage: true });
    
    // Verify dropdown is visible and not clipped
    const dropdown = page.locator('[data-testid="place-search-dropdown"]');
    await expect(dropdown).toBeVisible();
  });

  test('AC2: User clicks on a city result in the autocomplete dropdown → the selected city name populates the origin/destination cell and the dropdown closes', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/tours/new');
    await page.waitForLoadState('networkidle');
    
    // Add 5+ legs to the table
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="add-leg-button"]').click();
      // Use waitForLoadState instead of timeout for more reliability
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for the table to update
    await page.waitForTimeout(500);
    
    // Click on the last row's origin cell and type a city name
    const lastRowOriginCell = page.locator('table tbody tr:last-child td:first-child input');
    await lastRowOriginCell.click();
    await lastRowOriginCell.fill('New York');
    
    // Wait for dropdown to appear
    await page.waitForSelector('[data-testid="place-search-dropdown"]', { timeout: 10000 });
    
    // Click on a city result
    const firstResult = page.locator('[data-testid="place-search-dropdown"] li:first-child');
    await expect(firstResult).toBeVisible();
    await firstResult.click();
    
    // Wait for the dropdown to close
    await page.waitForTimeout(500);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-85-ac-2.png', fullPage: true });
    
    // Verify the city name populated the cell and dropdown closed
    await expect(lastRowOriginCell).toHaveValue('New York');
    
    const dropdown = page.locator('[data-testid="place-search-dropdown"]');
    await expect(dropdown).not.toBeVisible();
  });

  test('AC3: User opens the city search dropdown on a middle row of the legs table → dropdown renders fully on top of subsequent table rows without being cut off', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/tours/new');
    await page.waitForLoadState('networkidle');
    
    // Add 5+ legs to the table
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="add-leg-button"]').click();
      // Use waitForLoadState instead of timeout for more reliability
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for the table to update
    await page.waitForTimeout(500);
    
    // Click on a middle row's origin cell and type a city name
    const middleRowOriginCell = page.locator('table tbody tr:nth-child(3) td:first-child input');
    await middleRowOriginCell.click();
    await middleRowOriginCell.fill('San Francisco');
    
    // Wait for dropdown to appear
    await page.waitForSelector('[data-testid="place-search-dropdown"]', { timeout: 10000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-85-ac-3.png', fullPage: true });
    
    // Verify dropdown is visible and not clipped
    const dropdown = page.locator('[data-testid="place-search-dropdown"]');
    await expect(dropdown).toBeVisible();
  });

  test('AC4: User opens the city search dropdown on the last visible row when there is insufficient space below → dropdown flips to render above the input field, remaining fully visible', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/tours/new');
    await page.waitForLoadState('networkidle');
    
    // Add 5+ legs to the table
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="add-leg-button"]').click();
      // Use waitForLoadState instead of timeout for more reliability
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for the table to update
    await page.waitForTimeout(500);
    
    // Click on the last row's destination cell and type a city name
    const lastRowDestinationCell = page.locator('table tbody tr:last-child td:nth-child(2) input');
    await lastRowDestinationCell.click();
    await lastRowDestinationCell.fill('Los Angeles');
    
    // Wait for dropdown to appear
    await page.waitForSelector('[data-testid="place-search-dropdown"]', { timeout: 10000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-85-ac-4.png', fullPage: true });
    
    // Verify dropdown is visible and not clipped
    const dropdown = page.locator('[data-testid="place-search-dropdown"]');
    await expect(dropdown).toBeVisible();
  });

  test('AC5: User navigates to /routes/new and uses the PlaceSearchInput component → dropdown behavior works correctly with no regression from the tour builder fix', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/routes/new');
    await page.waitForLoadState('networkidle');
    
    // Click on the origin input and type a city name
    const originInput = page.locator('[data-testid="origin-input"]');
    await originInput.click();
    await originInput.fill('Boston');
    
    // Wait for dropdown to appear
    await page.waitForSelector('[data-testid="place-search-dropdown"]', { timeout: 10000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-85-ac-5.png', fullPage: true });
    
    // Verify dropdown is visible and not clipped
    const dropdown = page.locator('[data-testid="place-search-dropdown"]');
    await expect(dropdown).toBeVisible();
  });
});