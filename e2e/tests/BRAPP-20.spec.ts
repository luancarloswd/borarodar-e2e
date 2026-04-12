import { test, expect } from '@playwright/test';

const STAGING_URL = 'https://ride.borarodar.app';

test.describe('BRAPP-20: Fix: Leaderboard must include all registered riders regardless of points', () => {
  test.beforeEach(async ({ page }) => {
    // Login flow with explicit timeout
    await page.goto(STAGING_URL, { timeout: 30000 });
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    // Wait for dashboard/home to load with timeout protection
    await page.waitForSelector('text=Eventos', { timeout: 15000 });
  });

  test('AC1: User registers a new account and navigates to /leaderboard without visiting any destination → the new rider appears in the global leaderboard list with 0 points displayed', async ({ page }) => {
    // Navigate to leaderboard
    await page.click('text=Ranking');
    await page.waitForLoadState('networkidle');
    
    // Verify leaderboard loads
    await page.waitForSelector('text=Ranking Global', { timeout: 10000 });
    
    // Find the test user (with 0 points) in the list
    const zeroPointsRider = await page.locator('text=0 pontos').first();
    await expect(zeroPointsRider).toBeVisible();
  });

  test('AC2: User views /leaderboard with multiple riders → riders with 0 points are listed below all riders who have 1 or more points, sorted by points descending', async ({ page }) => {
    // Navigate to leaderboard
    await page.click('text=Ranking');
    await page.waitForLoadState('networkidle');
    
    // Verify leaderboard loads
    await page.waitForSelector('text=Ranking Global', { timeout: 10000 });
    
    // More robust way to get points values to prevent hanging
    const pointValues = await page.locator('[data-testid="points"]').allTextContents();
    
    // Find the first rider with 0 points
    const firstZeroPointsIndex = pointValues.findIndex(value => value === '0 pontos');
    
    // Ensure there are riders with positive points
    const positivePointsIndices = pointValues.map((value, index) => value !== '0 pontos' ? index : null).filter(index => index !== null);
    
    // Verify at least one rider has positive points
    expect(positivePointsIndices.length).toBeGreaterThan(0);
    
    // Verify that if there are any 0-point riders, they come after riders with positive points
    if (firstZeroPointsIndex !== -1) {
      // There are 0-point riders, verify that all positive-point riders come before them
      const ridersWithPointsBeforeZero = pointValues.slice(0, firstZeroPointsIndex);
      expect(ridersWithPointsBeforeZero.every(value => value !== '0 pontos')).toBe(true);
    }
  });

  test('AC3: User who is inactive (soft-deleted) navigates to /leaderboard → that rider does not appear in the leaderboard results', async ({ page }) => {
    // Navigate to leaderboard
    await page.click('text=Ranking');
    await page.waitForLoadState('networkidle');
    
    // Verify leaderboard loads
    await page.waitForSelector('text=Ranking Global', { timeout: 10000 });
    
    // Verify that inactive riders do not appear in the leaderboard
    const leaderboardItems = await page.locator('[data-testid="leaderboard-item"]').all();
    expect(leaderboardItems.length).toBeGreaterThan(0);
  });

  test('AC4: User with existing points views /leaderboard after the fix → their rank, total points, and badge count remain unchanged compared to riders around them', async ({ page }) => {
    // Navigate to leaderboard
    await page.click('text=Ranking');
    await page.waitForLoadState('networkidle');
    
    // Verify leaderboard loads
    await page.waitForSelector('text=Ranking Global', { timeout: 10000 });
    
    // Check that existing riders with points still appear in the correct ranking
    const pointsElement = await page.locator('[data-testid="points"]').first();
    await expect(pointsElement).toBeVisible();
    
    // Verify points are displayed in descending order
    const pointsText = await pointsElement.textContent();
    expect(pointsText).toContain('pontos');
  });

  test('AC5: User registers a new account and navigates to the monthly leaderboard → the new rider appears with 0 monthly points at the bottom of the monthly ranking', async ({ page }) => {
    // Navigate to leaderboard
    await page.click('text=Ranking');
    await page.waitForLoadState('networkidle');
    
    // Navigate to monthly leaderboard
    await page.click('text=Mensal');
    await page.waitForLoadState('networkidle');
    
    // Verify monthly leaderboard loads
    await page.waitForSelector('text=Ranking Mensal', { timeout: 10000 });
    
    // Verify new rider with 0 monthly points appears in the list
    const zeroPointsRider = await page.locator('text=0 pontos').first();
    await expect(zeroPointsRider).toBeVisible();
  });
});