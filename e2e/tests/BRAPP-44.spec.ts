import { test, expect } from '@playwright/test';

test.describe('BRAPP-44: Offline Handling for Route Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL with shorter timeout
    await page.goto('https://ride.borarodar.app', { timeout: 10000 });
    
    // Wait for login form elements to be present with shorter timeout
    try {
      const emailField = page.getByLabel('Email');
      const passwordField = page.getByLabel('Password');
      const submitButton = page.getByRole('button', { name: 'Sign in' });
      
      await Promise.all([
        emailField.waitFor({ timeout: 5000 }),
        passwordField.waitFor({ timeout: 5000 }),
        submitButton.waitFor({ timeout: 5000 })
      ]);
      
      // Fill credentials and submit
      await emailField.fill('test@borarodar.app');
      await passwordField.fill('borarodarapp');
      await submitButton.click();
      
      // Wait for dashboard/home to load with shorter timeout
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
    } catch (error) {
      // If login fails, try navigating directly to dashboard
      console.log('Login failed, navigating to dashboard directly');
      await page.goto('https://ride.borarodar.app/dashboard', { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    }
  });

  test('AC1: User refreshes a route page while offline with cached route data → route page renders correctly without showing an offline error message', async ({ page }) => {
    // Enable offline mode
    const context = page.context();
    await context.setOffline(true);
    
    // Navigate to a route page (example: dashboard)
    await page.goto('https://ride.borarodar.app/dashboard', { timeout: 10000 });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence - use relative path
    await page.screenshot({ path: 'screenshots/BRAPP-44-ac-1.png', fullPage: true });
    
    // Verify no offline error message by checking for specific offline error elements
    const offlineError = page.getByText(/offline/i).or(page.getByText(/no connectivity/i));
    const isOfflineErrorVisible = await offlineError.isVisible();
    await expect(isOfflineErrorVisible).toBeFalsy();
    
    // Verify route page content is rendered
    const routeContent = page.locator('[data-testid="route-content"]');
    await expect(routeContent).toBeAttached();
  });

  test('AC2: User navigates to a route page while offline with no cached data → a meaningful offline fallback message is displayed', async ({ page }) => {
    // Enable offline mode
    const context = page.context();
    await context.setOffline(true);
    
    // Navigate to a route page (example: dashboard) with no cached data
    await page.goto('https://ride.borarodar.app/dashboard', { timeout: 10000 });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-44-ac-2.png', fullPage: true });
    
    // Verify offline fallback message is displayed
    const offlineFallback = page.getByText(/offline/i).or(page.getByText(/no connectivity/i));
    await expect(offlineFallback).toBeVisible();
    
    // Check for the fallback content 
    await expect(page.getByText('No connectivity')).toBeVisible();
  });

  test('AC3: User loads a route page while online, goes offline, then refreshes the page → route page still displays using locally available route data', async ({ page }) => {
    // First, load a page while online
    await page.goto('https://ride.borarodar.app/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Enable offline mode
    const context = page.context();
    await context.setOffline(true);
    
    // Refresh the page
    await page.reload({ waitUntil: 'networkidle', timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-44-ac-3.png', fullPage: true });
    
    // Verify page still displays using locally available data
    const routeContent = page.locator('[data-testid="route-content"]');
    await expect(routeContent).toBeAttached();
    
    // No offline error should be visible
    const offlineError = page.getByText(/offline/i).or(page.getByText(/no connectivity/i));
    const isOfflineErrorVisible = await offlineError.isVisible();
    await expect(isOfflineErrorVisible).toBeFalsy();
  });

  test('AC4: User is viewing an offline fallback on a route page and connectivity is restored → route page automatically updates to show the full route data', async ({ page }) => {
    // Enable offline mode
    const context = page.context();
    await context.setOffline(true);
    
    // Navigate to a route page
    await page.goto('https://ride.borarodar.app/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-44-ac-4.png', fullPage: true });
    
    // Verify offline fallback is displayed
    const offlineFallback = page.getByText(/offline/i).or(page.getByText(/no connectivity/i));
    await expect(offlineFallback).toBeVisible();
    
    // Enable online mode
    await context.setOffline(false);
    
    // Wait for connectivity to be restored and page to update
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence  
    await page.screenshot({ path: 'screenshots/BRAPP-44-ac-4-2.png', fullPage: true });
    
    // Verify page displays full route data (not offline fallback)
    const offlineFallback2 = page.getByText(/offline/i).or(page.getByText(/no connectivity/i));
    await expect(offlineFallback2).not.toBeVisible();
    
    // Ensure route content is visible
    const routeContent = page.locator('[data-testid="route-content"]');
    await expect(routeContent).toBeAttached();
  });

  test('AC5: User navigates between multiple route pages while offline with cached data → all cached route pages render without offline errors', async ({ page }) => {
    // Enable offline mode
    const context = page.context();
    await context.setOffline(true);
    
    // Navigate to multiple route pages
    const routes = ['/dashboard', '/profile', '/settings'];
    
    for (const route of routes) {
      // Navigate to route
      await page.goto(`https://ride.borarodar.app${route}`, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Take screenshot for evidence
      await page.screenshot({ path: `screenshots/BRAPP-44-ac-5-${route.replace('/', '')}.png`, fullPage: true });
      
      // Verify no offline error messages
      const offlineError = page.getByText(/offline/i).or(page.getByText(/no connectivity/i));
      const isOfflineErrorVisible = await offlineError.isVisible();
      await expect(isOfflineErrorVisible).toBeFalsy();
      
      // Verify page content is rendered
      const routeContent = page.locator('[data-testid="route-content"]');
      await expect(routeContent).toBeAttached();
    }
  });
});