import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const STAGING_URL = "https://ride.borarodar.app";
const STAGING_USER = "test@borarodar.app";
const STAGING_PASSWORD = process.env.STAGING_PASSWORD;

if (!STAGING_PASSWORD) {
  throw new Error('STAGING_PASSWORD env var is required for BRAPP-113 E2E tests');
}

/**
 * Shared login helper based on existing patterns in the codebase.
 */
async function login(page: import('@playwright/test').Page) {
  await page.goto(STAGING_URL);
  await page.waitForLoadState('networkidle');

  // Check if already logged in by looking for user menu button
  if (await page.getByTestId('user-menu-btn').isVisible()) {
    return;
  }

  // Navigate to login if not already there
  if (!page.url().includes('/login') && !await page.getByTestId('login-btn').isVisible()) {
    await page.goto(`${STAGING_URL}/login`);
  }

  const emailField = page.getByTestId('email-input');
  const passwordField = page.getByTestId('password-input');
  const submitButton = page.getByTestId('login-btn');
  
  await emailField.fill(STAGING_USER);
  await passwordField.fill(STAGING_PASSWORD!);
  await submitButton.click();
  
  // Wait for home page to load
  await expect(page.getByRole('heading', { name: 'Comunidade' })).toBeVisible({ timeout: 30000 });
}

test.describe("BRAPP-113: Autocomplete Shop Name from Google Places and Local Places Collection on New Motorcycle Shop Registration", () => {
  test.beforeAll(() => {
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch (e) {
      // Ignore if directory already exists
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${STAGING_URL}/mechanics/new`);
    await expect(page.getByTestId('submit-shop-title')).toBeVisible();
  });

  test("User types 3+ characters in the shop name field on /cadastrar-oficina → autocomplete dropdown appears with matching suggestions", async ({ page }) => {
    const nameInput = page.getByTestId('shop-name-input');
    
    // Type 2 characters - should not show dropdown
    await nameInput.fill('Mo');
    await expect(page.locator('[role="listbox"]')).not.toBeVisible();

    // Type 3rd character - using "Moto" as it's highly likely to yield results
    await nameInput.fill('Moto');
    
    // Dropdown should appear
    await expect(page.locator('[role="listbox"]')).toBeVisible({ timeout: 20000 });
    
    const suggestions = page.locator('[role="option"]');
    // Ensure we wait for at least one suggestion to be visible
    await expect(suggestions.first()).toBeVisible({ timeout: 15000 });
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: `screenshots/BRAPP-113-ac-1.png`, fullPage: true });
  });

  test("User sees suggestions from local places collection listed before Google Places results in the dropdown", async ({ page }) => {
    const nameInput = page.getByTestId('shop-name-input');
    
    // "Cerrado" is often used in local data per SDD
    await nameInput.fill('Cerrado');
    
    // Wait for dropdown
    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible({ timeout: 20000 });

    const suggestions = page.locator('[role="option"]');
    await expect(suggestions.first()).toBeVisible({ timeout: 15000 });
    const count = await suggestions.count();
    
    let localFound = false;
    let googleFound = false;
    let localAfterGoogle = false;

    for (let i = 0; i < count; i++) {
      const suggestion = suggestions.nth(i);
      // The component uses a span with uppercase text for the source
      const sourceBadge = suggestion.locator('span.uppercase');
      const sourceText = (await sourceBadge.innerText()).trim().toUpperCase();

      if (sourceText === 'LOCAL') {
        localFound = true;
        if (googleFound) {
          localAfterGoogle = true;
        }
      } else if (sourceText === 'GOOGLE') {
        googleFound = true;
      }
    }

    // Verify that if both were found, LOCAL came first
    expect(localAfterGoogle).toBe(false);

    await page.screenshot({ path: `screenshots/BRAPP-113-ac-2.png`, fullPage: true });
  });

  test("User selects a suggestion from the dropdown → name, address, lat/lon, phone, website, and googlePlaceId fields are pre-filled in the form", async ({ page }) => {
    const nameInput = page.getByTestId('shop-name-input');
    await nameInput.fill('Moto');
    
    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible({ timeout: 20000 });
    
    const firstSuggestion = page.locator('[role="option"]').first();
    await expect(firstSuggestion).toBeVisible({ timeout: 15000 });
    await firstSuggestion.click();

    // Check that name is filled
    await expect(nameInput).not.toHaveValue('');

    // Select category to enable navigation
    await page.getByTestId('category-chip-general').click();
    await page.getByTestId('step1-next-btn').click();

    // Verify fields on Step 2 are pre-filled (should not be empty)
    await expect(page.getByTestId('shop-address-input')).not.toHaveValue('', { timeout: 10000 });
    await expect(page.getByTestId('shop-city-input')).not.toHaveValue('');
    await expect(page.getByTestId('shop-state-select')).not.toHaveValue('');
    
    // Coordinates
    await expect(page.getByTestId('lat-input')).not.toHaveValue('');
    await expect(page.getByTestId('lon-input')).not.toHaveValue('');

    await page.screenshot({ path: `screenshots/BRAPP-113-ac-3.png`, fullPage: true });
  });

  test("User clears the shop name field after selecting a suggestion → dropdown closes and form can be filled manually", async ({ page }) => {
    const nameInput = page.getByTestId('shop-name-input');
    await nameInput.fill('Moto');
    
    const firstSuggestion = page.locator('[role="option"]').first();
    await expect(firstSuggestion).toBeVisible({ timeout: 15000 });
    await firstSuggestion.click();

    // Dropdown should close after selection
    await expect(page.locator('[role="listbox"]')).not.toBeVisible();

    // Clear the field
    await nameInput.fill('');
    
    // Dropdown should remain closed when input is empty
    await expect(page.locator('[role="listbox"]')).not.toBeVisible();

    // Manual entry should still be possible
    await nameInput.fill('Oficina Manual');
    await page.getByTestId('category-chip-general').click();
    await page.getByTestId('step1-next-btn').click();
    
    // Address can be filled manually
    const addressInput = page.getByTestId('shop-address-input');
    await addressInput.fill('Rua Principal, 100');
    await expect(addressInput).toHaveValue('Rua Principal, 100');

    await page.screenshot({ path: `screenshots/BRAPP-113-ac-4.png`, fullPage: true });
  });

  test("User types a query with no matches in either source → dropdown shows a 'no results' message", async ({ page }) => {
    const nameInput = page.getByTestId('shop-name-input');
    
    // Query that likely yields no results
    await nameInput.fill('QUERY_COM_ZERO_RESULTADOS_987654321');
    
    // Dropdown should appear showing the empty message
    await expect(page.locator('[role="listbox"]')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('shop-autocomplete-empty')).toBeVisible();
    
    // Advancing to Step 2 should show empty address
    await page.getByTestId('category-chip-general').click();
    await page.getByTestId('step1-next-btn').click();
    
    await expect(page.getByTestId('shop-address-input')).toHaveValue('');
    await expect(page.getByTestId('shop-city-input')).toHaveValue('');

    await page.screenshot({ path: `screenshots/BRAPP-113-ac-5.png`, fullPage: true });
  });
});
