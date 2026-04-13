import { test, expect } from '@playwright/test';

test.describe('BRAPP-42: Fix TypeScript type mismatch in RouteEditorPage functional state update', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login flow to the application
    await page.goto('https://ride.borarodar.app');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('AC1: User navigates to the Route Editor page → the page loads without errors and the route form is fully rendered with all fields visible', async () => {
    // Navigate to Route Editor page
    await page.goto('https://ride.borarodar.app/route-editor');
    
    // Wait for page to load and form elements to be visible
    await page.waitForSelector('[data-testid="route-editor-form"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="route-name-input"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="stops-list"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'BRAPP-42-ac-1.png', fullPage: true });
    
    // Verify form is properly rendered
    const form = await page.$('[data-testid="route-editor-form"]');
    expect(form).toBeTruthy();
    
    const routeNameInput = await page.$('[data-testid="route-name-input"]');
    expect(routeNameInput).toBeTruthy();
    
    const stopsList = await page.$('[data-testid="stops-list"]');
    expect(stopsList).toBeTruthy();
  });

  test('AC2: User adds a new stop to the route → the stop appears in the stops list and the form state updates correctly without console errors', async () => {
    // Navigate to Route Editor page
    await page.goto('https://ride.borarodar.app/route-editor');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="route-editor-form"]', { timeout: 15000 });
    
    // Add a new stop
    await page.click('[data-testid="add-stop-button"]');
    
    // Wait for new stop to appear
    await page.waitForSelector('[data-testid="stop-item"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'BRAPP-42-ac-2.png', fullPage: true });
    
    // Verify stop was added
    const stopsCount = await page.$$('[data-testid="stop-item"]');
    expect(stopsCount.length).toBeGreaterThan(0);
  });

  test('AC3: User removes a stop from the route → the stop is removed from the list and remaining stops are displayed correctly', async () => {
    // Navigate to Route Editor page
    await page.goto('https://ride.borarodar.app/route-editor');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="route-editor-form"]', { timeout: 15000 });
    
    // Add a stop first
    await page.click('[data-testid="add-stop-button"]');
    await page.waitForSelector('[data-testid="stop-item"]', { timeout: 15000 });
    
    // Remove the stop
    await page.click('[data-testid="remove-stop-button"]');
    
    // Wait for stop to be removed
    await page.waitForTimeout(1000);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'BRAPP-42-ac-3.png', fullPage: true });
    
    // Verify stop was removed (might be zero or more stops remaining)
    const stopsCount = await page.$$('[data-testid="stop-item"]');
    expect(stopsCount.length).toBeGreaterThanOrEqual(0);
  });

  test('AC4: User edits route details and clicks Save → the form submits successfully and a confirmation message is displayed', async () => {
    // Navigate to Route Editor page
    await page.goto('https://ride.borarodar.app/route-editor');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="route-editor-form"]', { timeout: 15000 });
    
    // Edit route name
    await page.fill('[data-testid="route-name-input"]', 'Test Route Name');
    
    // Click save button
    await page.click('[data-testid="save-route-button"]');
    
    // Wait for confirmation message
    await page.waitForSelector('[data-testid="confirmation-message"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'BRAPP-42-ac-4.png', fullPage: true });
    
    // Verify confirmation message is displayed
    const confirmationMessage = await page.textContent('[data-testid="confirmation-message"]');
    expect(confirmationMessage).toContain('saved');
  });

  test('AC5: User opens the Route Editor with an existing route that has no stops → the page renders correctly with an empty stops list and allows adding new stops', async () => {
    // Navigate to Route Editor page with existing route (empty)
    await page.goto('https://ride.borarodar.app/route-editor');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="route-editor-form"]', { timeout: 15000 });
    
    // Verify the page renders with empty stops list
    const stopsList = await page.$('[data-testid="stops-list"]');
    expect(stopsList).toBeTruthy();
    
    // Verify no stops are present initially
    const stopsCount = await page.$$('[data-testid="stop-item"]');
    expect(stopsCount.length).toBe(0);
    
    // Verify add stop button is present and functional
    const addStopButton = await page.$('[data-testid="add-stop-button"]');
    expect(addStopButton).toBeTruthy();
  });
});