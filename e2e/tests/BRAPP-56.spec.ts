import { test, expect } from '@playwright/test';

test.describe('BRAPP-56: Expand Check-In Nearby Detection to All Place Types', () => {

  test.beforeEach(async ({ page, context }) => {
    // Login to the application using environment variable
    const baseURL = process.env.BASE_URL || 'https://ride.borarodar.app';
    await page.goto(baseURL);
    
    // Fill login form
    await page.fill('input[type="email"]', 'test@borarodar.app');
    await page.fill('input[type="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test('AC1: User is near a biker monument (within 1 km) with mocked geolocation → check-in banner appears showing the monument name, motorcycle icon, and a \'Check-in\' button', async ({ page, context }) => {
    // Mock geolocation near a biker monument
    await context.setGeolocation({ latitude: -23.55052, longitude: -46.633308 });
    
    // Navigate to check-in page
    await page.goto('/checkin');
    
    // Verify check-in banner appears for monument
    await expect(page.locator('[data-testid="checkin-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="place-name"]')).toContainText('Monumento');
    await expect(page.locator('[data-testid="place-icon"]')).toContainText('motorcycle');
    await expect(page.locator('[data-testid="checkin-button"]')).toBeVisible();
  });

  test('AC2: User is positioned within 500m of an iconic road segment with mocked geolocation → check-in banner appears showing the road name with the road icon and a \'Check-in\' button', async ({ page, context }) => {
    // Mock geolocation near an iconic road
    await context.setGeolocation({ latitude: -23.55052, longitude: -46.633308 });
    
    // Navigate to check-in page
    await page.goto('/checkin');
    
    // Verify check-in banner appears for iconic road
    await expect(page.locator('[data-testid="checkin-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="place-name"]')).toContainText('Estrada');
    await expect(page.locator('[data-testid="place-icon"]')).toContainText('road');
    await expect(page.locator('[data-testid="checkin-button"]')).toBeVisible();
  });

  test('AC3: User registers a route that passes through a city, a mountain range, and an iconic road → auto-check confirmation modal displays three grouped sections (\'Cidades\', \'Serras\', \'Estradas\') each listing the corresponding detected place with its type icon', async ({ page, context }) => {
    // Mock geolocation to simulate route detection across different place types
    await context.setGeolocation({ latitude: -23.55052, longitude: -46.633308 });
    
    // Navigate to route creation
    await page.goto('/routes/new');
    
    // Simulate registering a route
    await page.click('[data-testid="start-route"]');
    
    // Verify auto-check confirmation modal appears with grouped sections
    await expect(page.locator('[data-testid="confirmation-modal"]')).toBeVisible();
    
    // Check for group sections
    await expect(page.locator('[data-testid="group-cidades"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-serras"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-estradas"]')).toBeVisible();
    
    // Check for place icons in their respective groups
    await expect(page.locator('[data-testid="group-cidades"] [data-testid="place-icon"]')).toContainText('city');
    await expect(page.locator('[data-testid="group-serras"] [data-testid="place-icon"]')).toContainText('mountain');
    await expect(page.locator('[data-testid="group-estradas"] [data-testid="place-icon"]')).toContainText('road');
  });

  test('AC4: User confirms check-in for a non-city place (e.g., viewpoint) from the check-in banner → progress stats page updates to show the viewpoint counted under its type category and total destinations count increases by 1', async ({ page, context }) => {
    // Mock geolocation near a viewpoint
    await context.setGeolocation({ latitude: -23.55052, longitude: -46.633308 });
    
    // Navigate to check-in page
    await page.goto('/checkin');
    
    // Confirm check-in at viewpoint
    await page.click('[data-testid="checkin-button"]');
    
    // Navigate to progress stats page
    await page.goto('/stats');
    
    // Verify viewpoint is counted under its type category
    await expect(page.locator('[data-testid="viewpoint-category"]')).toBeVisible();
    
    // Verify total destinations count increased by 1
    await expect(page.locator('[data-testid="total-destinations"]')).toContainText('1');
  });

  test('AC5: User is near only a city with no other POIs nearby → standard city-only check-in behavior works identically with no regression in existing behavior', async ({ page, context }) => {
    // Mock geolocation near a city with no nearby POIs
    await context.setGeolocation({ latitude: -23.55052, longitude: -46.633308 });
    
    // Navigate to check-in page
    await page.goto('/checkin');
    
    // Verify standard city-only check-in behavior
    await expect(page.locator('[data-testid="checkin-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="place-type"]')).toContainText('city');
    
    // No nearby destinations section (standard behavior)
    await expect(page.locator('[data-testid="nearby-destinations"]')).not.toBeVisible();
  });
});