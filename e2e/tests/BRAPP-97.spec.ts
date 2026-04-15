import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-97: Fix Itinerary Origin and Destination Select Not Loading', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.fill('input[name="email"]', 'test@borarodar.app');
    await page.fill('input[name="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    await page.waitForURL('https://ride.borarodar.app/dashboard');
  });

  test('AC1: User navigates to /itineraries/new and types \'Unaí\' in the origin search input → a dropdown appears within 2 seconds showing city suggestions that include \'Unaí\'', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/itineraries/new');
    await page.waitForSelector('input[placeholder="Origem"]');
    
    // Type 'Unaí' in the origin field
    await page.fill('input[placeholder="Origem"]', 'Unaí');
    
    // Wait for suggestions dropdown to appear
    await page.waitForSelector('.suggestions-dropdown', { timeout: 3000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-97-ac-1.png', fullPage: true });
    
    // Verify the dropdown contains 'Unaí' suggestion
    const suggestions = await page.$$('.suggestions-dropdown li');
    
    // Add a guard to check if suggestions array is empty
    if (suggestions.length === 0) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'screenshots/BRAPP-97-ac-1-empty.png', fullPage: true });
      throw new Error('No suggestions found in dropdown for "Unaí"');
    }
    
    let found = false;
    for (const suggestion of suggestions) {
      const text = await suggestion.textContent();
      if (text?.includes('Unaí')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('AC2: User types \'Brasília\' in the destination search input → dropdown suggestions appear with correctly rendered Portuguese diacritical marks (no encoding corruption)', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/itineraries/new');
    await page.waitForSelector('input[placeholder="Destino"]');
    
    // Type 'Brasília' in the destination field
    await page.fill('input[placeholder="Destino"]', 'Brasília');
    
    // Wait for suggestions dropdown to appear
    await page.waitForSelector('.suggestions-dropdown', { timeout: 3000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-97-ac-2.png', fullPage: true });
    
    // Verify the dropdown contains 'Brasília' suggestion with correct diacritical marks
    const suggestions = await page.$$('.suggestions-dropdown li');
    
    // Add a guard to check if suggestions array is empty
    if (suggestions.length === 0) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'screenshots/BRAPP-97-ac-2-empty.png', fullPage: true });
      throw new Error('No suggestions found in dropdown for "Brasília"');
    }
    
    let found = false;
    for (const suggestion of suggestions) {
      const text = await suggestion.textContent();
      if (text?.includes('Brasília')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('AC3: User selects a city suggestion from the origin dropdown → the input displays the selected city name, the dropdown closes, and typing in the destination field still works independently', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/itineraries/new');
    await page.waitForSelector('input[placeholder="Origem"]');
    
    // Type 'Unaí' in the origin field
    await page.fill('input[placeholder="Origem"]', 'Unaí');
    
    // Wait for suggestions dropdown to appear
    await page.waitForSelector('.suggestions-dropdown', { timeout: 3000 });
    
    // Select the first suggestion
    await page.click('.suggestions-dropdown li:first-child');
    
    // Verify that the input is populated with the selected city name
    const originInput = await page.inputValue('input[placeholder="Origem"]');
    expect(originInput).toBe('Unaí');
    
    // Verify dropdown closed
    const dropdownVisible = await page.isVisible('.suggestions-dropdown');
    expect(dropdownVisible).toBe(false);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-97-ac-3.png', fullPage: true });
    
    // Verify that we can still type in destination field
    await page.fill('input[placeholder="Destino"]', 'São Paulo');
    const destInput = await page.inputValue('input[placeholder="Destino"]');
    expect(destInput).toBe('São Paulo');
  });

  test('AC4: User types a nonsensical query (e.g. \'xyznonexistent\') in the origin input → the dropdown shows a \'Nenhuma cidade encontrada\' empty-state message within 2 seconds', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/itineraries/new');
    await page.waitForSelector('input[placeholder="Origem"]');
    
    // Type a nonsensical query
    await page.fill('input[placeholder="Origem"]', 'xyznonexistent');
    
    // Wait for suggestions dropdown to appear
    await page.waitForSelector('.suggestions-dropdown', { timeout: 3000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-97-ac-4.png', fullPage: true });
    
    // Verify the dropdown shows empty message
    try {
      const emptyMessage = await page.textContent('.suggestions-dropdown li');
      expect(emptyMessage).toContain('Nenhuma cidade encontrada');
    } catch (error) {
      // Take screenshot for debugging if there's an issue
      await page.screenshot({ path: 'screenshots/BRAPP-97-ac-4-error.png', fullPage: true });
      throw error;
    }
  });

  test('AC5: User fills both origin and destination by selecting suggestions, then clicks \'Próximo\' → the wizard advances to Step 2, confirming both fields accepted valid selections', async ({ page }) => {
    await page.goto('https://ride.borarodar.app/itineraries/new');
    
    // Fill origin field
    await page.fill('input[placeholder="Origem"]', 'Unaí');
    await page.waitForSelector('.suggestions-dropdown', { timeout: 3000 });
    await page.click('.suggestions-dropdown li:first-child');
    
    // Fill destination field
    await page.fill('input[placeholder="Destino"]', 'Brasília');
    await page.waitForSelector('.suggestions-dropdown', { timeout: 3000 });
    await page.click('.suggestions-dropdown li:first-child');
    
    // Click next button
    await page.click('button:has-text("Próximo")');
    
    // Wait for Step 2 to load with increased timeout
    try {
      await page.waitForSelector('div.step-2', { timeout: 5000 });
    } catch (error) {
      // Take screenshot of current state for debugging
      await page.screenshot({ path: 'screenshots/BRAPP-97-ac-5-error.png', fullPage: true });
      throw error;
    }
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-97-ac-5.png', fullPage: true });
    
    // Verify we've advanced to Step 2
    const step2Visible = await page.isVisible('div.step-2');
    expect(step2Visible).toBe(true);
  });
});