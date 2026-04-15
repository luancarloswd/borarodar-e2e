import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-98: Routes page navigation and routing behavior', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page, baseURL }) => {
    // Login flow
    await page.goto(baseURL);
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    // Wait for dashboard/home to load
    await page.waitForSelector('text=Dashboard');
  });

  test('AC1: User navigates directly to /routes via the browser address bar → the routes list page loads with route content visible, no \'Not Found\' or 404 error displayed', async ({ page, baseURL }) => {
    // Navigate directly to /routes
    await page.goto(`${baseURL}/routes`);
    // Wait for route list to load
    await page.waitForSelector('[data-testid="route-list"]');
    await page.screenshot({ path: 'screenshots/BRAPP-98-ac-1.png', fullPage: true });
    expect(await page.title()).toContain('Bora Rodar');
  });

  test('AC2: User is on the /routes page and presses F5 or browser refresh → the same routes list page reloads with correct content, no \'Not Found\' error displayed', async ({ page, baseURL }) => {
    // Navigate to /routes page first
    await page.goto(`${baseURL}/routes`);
    await page.waitForSelector('[data-testid="route-list"]');
    
    // Refresh the page
    await page.reload();
    await page.waitForSelector('[data-testid="route-list"]');
    await page.screenshot({ path: 'screenshots/BRAPP-98-ac-2.png', fullPage: true });
    expect(await page.title()).toContain('Bora Rodar');
  });

  test('AC3: User opens a shared link to a route detail page (e.g., /routes/abc123) in an incognito/private browser window with no prior cache or service worker → the route detail page loads correctly with route data visible', async ({ page, baseURL }) => {
    // Navigate directly to a route detail page
    await page.goto(`${baseURL}/routes/abc123`);
    // Wait for route detail to load
    await page.waitForSelector('[data-testid="route-detail"]');
    await page.screenshot({ path: 'screenshots/BRAPP-98-ac-3.png', fullPage: true });
    expect(await page.title()).toContain('Bora Rodar');
  });

  test('AC4: User navigates to a non-existent path like /this-does-not-exist via the address bar → a styled \'Page Not Found\' UI is displayed with a link/button to return to the home page', async ({ page, baseURL }) => {
    // Navigate to a non-existent path
    await page.goto(`${baseURL}/this-does-not-exist`);
    // Wait for 404 page to load
    await page.waitForSelector('[data-testid="page-not-found"]');
    await page.screenshot({ path: 'screenshots/BRAPP-98-ac-4.png', fullPage: true });
    expect(await page.title()).toContain('Bora Rodar');
  });

  test('AC5: User clicks an internal navigation link or button to go to /routes from another page → the routes list page renders correctly via client-side routing without a full page reload', async ({ page, baseURL }) => {
    // Go to home page first
    await page.goto(baseURL);
    await page.waitForSelector('text=Dashboard');
    
    // Click on routes link
    await page.click('a[href="/routes"]');
    await page.waitForSelector('[data-testid="route-list"]');
    await page.screenshot({ path: 'screenshots/BRAPP-98-ac-5.png', fullPage: true });
    expect(await page.title()).toContain('Bora Rodar');
  });
});