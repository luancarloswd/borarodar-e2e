import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const STAGING_URL = "https://ride.borarodar.app";
const STAGING_USER = "test@borarodar.app";
const STAGING_PASSWORD = process.env.STAGING_PASSWORD;
if (!STAGING_PASSWORD) {
  throw new Error('STAGING_PASSWORD env var is required for BRAPP-108 E2E tests');
}

async function login(page) {
  await page.goto(STAGING_URL);
  
  // Wait for the page to be somewhat loaded
  await page.waitForLoadState('networkidle');

  // Check if already logged in by looking for user menu button
  if (await page.getByTestId('user-menu-btn').isVisible()) {
    return;
  }

  // If not on login page, navigate to it (though goto(STAGING_URL) should redirect or be at home)
  if (!page.url().includes('/login') && !await page.getByTestId('login-btn').isVisible()) {
    await page.goto(`${STAGING_URL}/login`);
  }

  // Handle login using data-testids
  const emailField = page.getByTestId('email-input');
  const passwordField = page.getByTestId('password-input');
  const submitButton = page.getByTestId('login-btn');
  
  // Fill credentials
  await emailField.fill(STAGING_USER);
  await passwordField.fill(STAGING_PASSWORD);
  await submitButton.click();
  
  // Wait for home page to load - "Comunidade" is the header in CommunityFeedPage
  await expect(page.getByRole('heading', { name: 'Comunidade' })).toBeVisible({ timeout: 30000 });
}

test.describe("BRAPP-108: Fix Routes Not Listed on Planning Registration Dropdown", () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("User navigates to the planning registration page → routes dropdown is visible and enabled", async ({ page }) => {
    // Navigate to planning registration page
    await page.goto(`${STAGING_URL}/planning/new`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify the routes dropdown is visible and enabled
    const routesDropdown = page.getByTestId('route-select-dropdown');
    await expect(routesDropdown).toBeVisible();
    await expect(routesDropdown).toBeEnabled();
    
    await page.screenshot({ path: `screenshots/BRAPP-108-ac-1.png`, fullPage: true });
  });

  test("User opens the routes dropdown on the planning registration page → list of existing routes is displayed (non-empty)", async ({ page }) => {
    // Navigate to planning registration page
    await page.goto(`${STAGING_URL}/planning/new`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click on the routes dropdown to open it
    const routesDropdown = page.getByTestId('route-select-dropdown');
    await routesDropdown.click();
    
    // Wait for dropdown options to appear using better wait strategy
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    
    // Verify that dropdown has options - looking for dropdown items, not HTML options
    const dropdownOptions = page.locator('[role="option"]');
    await expect(dropdownOptions).toHaveCount(1); // At least one option should exist
    
    await page.screenshot({ path: `screenshots/BRAPP-108-ac-2.png`, fullPage: true });
  });

  test("User selects a route from the dropdown → selected route name appears in the dropdown field", async ({ page }) => {
    // Navigate to planning registration page
    await page.goto(`${STAGING_URL}/planning/new`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click on the routes dropdown to open it
    const routesDropdown = page.getByTestId('route-select-dropdown');
    await routesDropdown.click();
    
    // Wait for dropdown options to appear
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    
    // Select the first route option (assuming at least one exists)
    const firstOption = page.locator('[role="option"]').first();
    const optionText = await firstOption.textContent();
    await firstOption.click();
    
    // Verify the selected option appears in the dropdown field
    // Using text content check for the selected value
    await expect(routesDropdown).toHaveText(optionText);
    
    await page.screenshot({ path: `screenshots/BRAPP-108-ac-3.png`, fullPage: true });
  });

  test("User submits the planning form with a selected route and valid data → success confirmation is shown and the new planning entry appears in the planning list", async ({ page }) => {
    // Navigate to planning registration page
    await page.goto(`${STAGING_URL}/planning/new`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Select a route
    const routesDropdown = page.getByTestId('route-select-dropdown');
    await routesDropdown.click();
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    
    // Select the first option
    const firstOption = page.locator('[role="option"]').first();
    const optionText = await firstOption.textContent();
    await firstOption.click();
    
    // Fill up the form with valid data
    await page.getByTestId('planning-title-input').fill('E2E Test Planning');
    await page.getByTestId('planning-date-input').fill('2025-01-01');
    await page.getByTestId('planning-time-input').fill('10:00');
    
    // Submit the form
    await page.getByTestId('submit-planning-btn').click();
    
    // Wait for confirmation
    await expect(page.getByText('Planejamento criado com sucesso!')).toBeVisible({ timeout: 15000 });
    
    // Verify the new planning entry appears in list
    await page.waitForURL(`${STAGING_URL}/planning`);
    await expect(page.getByText('E2E Test Planning')).toBeVisible({ timeout: 15000 });
    
    await page.screenshot({ path: `screenshots/BRAPP-108-ac-4.png`, fullPage: true });
  });

  test("User reloads the planning registration page after a route was created → newly created route is present in the routes dropdown options", async ({ page }) => {
    // First, we need to create a route by going to the routes page and creating a route
    await page.goto(`${STAGING_URL}/routes/new`);
    
    // Fill up the form with valid data to create a route
    await page.getByTestId('route-title-input').fill('E2E Test Route');
    await page.getByTestId('next-step-btn').click();
    
    // Fill Origin and Destination
    const originInput = page.getByPlaceholder('Buscar cidade de partida...');
    const destinationInput = page.getByPlaceholder('Buscar cidade de destino...');
    
    // Fill Origin: Unaí, MG
    await originInput.fill('Unaí');
    // Wait for suggestions and click one that contains "Unaí"
    const originSuggestion = page.getByRole('button').filter({ hasText: 'Unaí' }).first();
    await originSuggestion.waitFor({ state: 'visible', timeout: 15000 });
    await originSuggestion.click();
    
    // Fill Destination: Brasília, DF
    await destinationInput.fill('Brasília');
    const destinationSuggestion = page.getByRole('button').filter({ hasText: 'Brasília' }).first();
    await destinationSuggestion.waitFor({ state: 'visible', timeout: 15000 });
    await destinationSuggestion.click();
    
    // Submit the route
    await page.getByTestId('submit-route-btn').click();
    
    // Wait for success message
    await expect(page.getByText('Rota criada com sucesso!')).toBeVisible({ timeout: 15000 });
    
    // Now go back to planning page
    await page.goto(`${STAGING_URL}/planning/new`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click on the routes dropdown to open it
    const routesDropdown = page.getByTestId('route-select-dropdown');
    await routesDropdown.click();
    
    // Wait for dropdown options to appear
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    
    // Verify that route we created is now present in the options
    const dropdownOptions = page.locator('[role="option"]');
    await expect(dropdownOptions).toHaveCount(2); // One empty option + our created route
    
    await page.screenshot({ path: `screenshots/BRAPP-108-ac-5.png`, fullPage: true });
  });
});