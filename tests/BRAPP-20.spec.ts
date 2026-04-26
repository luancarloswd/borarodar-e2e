import { test, expect } from '@playwright/test';

const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
  test.skip(
    'Skipping: Required environment variables are not set.',
    { annotation: { type: 'error', description: 'Missing env vars' } }
  );
}

test.describe('BRAPP-20: Fix: Leaderboard must include all registered riders regardless of points', () => {
  test.beforeEach(async ({ page }) => {
    const email = LOGIN_EMAIL!.trim();
    const password = LOGIN_PASSWORD!.trim();

    await page.goto('/');
    // Login flow: Look for login form email + password fields, submit button
    // Fill credentials and submit
    await page.fill('input[name="email"], input[type="email"]', email);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('button[type="submit"]');
    // Wait for authentication to complete using explicit post-login signals
    await page.waitForURL((url) => !/\/(login|signin|auth)(\/|$)/i.test(url.pathname), { timeout: 15000 });
    await expect(page.locator('input[name="email"], input[type="email"]')).not.toBeVisible({ timeout: 15000 });
  });

  test('AC1: User navigates to the global leaderboard page. A newly registered user who has earned 0 points is displayed in the leaderboard.', async ({ page }, testInfo) => {
    const zeroPointUserEmail = process.env.ZERO_POINT_USER_EMAIL?.trim();
    const zeroPointUserName = process.env.ZERO_POINT_USER_NAME?.trim();

    expect(
      zeroPointUserEmail || zeroPointUserName,
      'Set ZERO_POINT_USER_EMAIL and/or ZERO_POINT_USER_NAME to a fixture/API-created 0-point rider so AC1 can deterministically verify their presence in the leaderboard.'
    ).toBeTruthy();

    await page.goto('/leaderboard');
    await page.waitForSelector('.leaderboard-item, .rider-row, [role="listitem"]');

    const leaderboardRows = page.locator('.leaderboard-item, .rider-row, [role="listitem"]');
    const leaderboardText = (await leaderboardRows.allTextContents()).join(' ');
    expect(leaderboardText.length).toBeGreaterThan(0);

    if (zeroPointUserEmail) {
      expect(leaderboardText).toContain(zeroPointUserEmail);
    }
    if (zeroPointUserName) {
      expect(leaderboardText).toContain(zeroPointUserName);
    }

    await page.screenshot({ path: testInfo.outputPath('BRAPP-20-ac-1.png'), fullPage: true });
  });

  test('AC2: User views the global leaderboard page. Riders are ordered by total points in descending order, with riders who have 0 points appearing at the bottom of the list.', async ({ page }, testInfo) => {
    await page.goto('/leaderboard');
    await page.waitForSelector('.leaderboard-item, .rider-row, [role="listitem"]');

    const leaderboardRows = page.locator('.leaderboard-item, .rider-row, [role="listitem"]');
    const count = await leaderboardRows.count();
    expect(count).toBeGreaterThan(0);

    const pointsByRow = await leaderboardRows.evaluateAll((rows) =>
      rows.map((row) => {
        const pointElement = row.querySelector(
          '[data-testid*="point"], [class*="point"], [aria-label*="point" i], td[data-label*="point" i]'
        );

        if (!pointElement?.textContent) {
          return null;
        }

        const sourceText = pointElement.textContent.replace(/\s+/g, ' ').trim();
        const explicitPointsMatch = sourceText.match(/(\d+)\s*points?/i);

        if (explicitPointsMatch) {
          return Number.parseInt(explicitPointsMatch[1], 10);
        }

        const numericMatch = sourceText.match(/^\d+$/);
        return numericMatch ? Number.parseInt(numericMatch[0], 10) : null;
      })
    );

    expect(pointsByRow).not.toContain(null);

    const points = pointsByRow as number[];
    for (let i = 1; i < points.length; i++) {
      expect(points[i - 1]).toBeGreaterThanOrEqual(points[i]);
    }

    const firstZeroIndex = points.findIndex((point) => point === 0);
    expect(
      firstZeroIndex,
      'Expected at least one 0-point rider in the leaderboard. Ensure a 0-point rider exists in the test dataset.'
    ).not.toBe(-1);
    expect(points.slice(firstZeroIndex).every((point) => point === 0)).toBe(true);

    await page.screenshot({ path: testInfo.outputPath('BRAPP-20-ac-2.png'), fullPage: true });
  });

  test('AC3: User navigates to the global leaderboard page. Any inactive (soft-deleted) user accounts are not present in the displayed leaderboard.', async ({ page }, testInfo) => {
    const inactiveUserEmail = process.env.INACTIVE_USER_EMAIL?.trim();
    const inactiveUserName = process.env.INACTIVE_USER_NAME?.trim();

    expect(
      inactiveUserEmail || inactiveUserName,
      'Set INACTIVE_USER_EMAIL and/or INACTIVE_USER_NAME to a fixture/API-created inactive account so AC3 can deterministically verify exclusion from the leaderboard.'
    ).toBeTruthy();

    await page.goto('/leaderboard');
    await page.waitForSelector('.leaderboard-item, .rider-row, [role="listitem"]');

    const leaderboardRows = page.locator('.leaderboard-item, .rider-row, [role="listitem"]');
    const leaderboardText = (await leaderboardRows.allTextContents()).join(' ');
    expect(leaderboardText.length).toBeGreaterThan(0);

    if (inactiveUserEmail) {
      expect(leaderboardText).not.toContain(inactiveUserEmail);
    }
    if (inactiveUserName) {
      expect(leaderboardText).not.toContain(inactiveUserName);
    }

    await page.screenshot({ path: testInfo.outputPath('BRAPP-20-ac-3.png'), fullPage: true });
  });

  test('AC4: User views the global leaderboard page. The rank, total points, and other associated data for existing riders with points remain unchanged and are displayed correctly.', async ({ page }, testInfo) => {
    const knownRiderEmail = process.env.KNOWN_RIDER_EMAIL?.trim();
    const knownRiderName = process.env.KNOWN_RIDER_NAME?.trim();
    const knownRiderPoints = process.env.KNOWN_RIDER_POINTS?.trim();

    expect(
      (knownRiderEmail || knownRiderName) && knownRiderPoints,
      'Set KNOWN_RIDER_EMAIL (or KNOWN_RIDER_NAME) and KNOWN_RIDER_POINTS to a fixture/API-created rider so AC4 can deterministically verify data integrity in the leaderboard.'
    ).toBeTruthy();

    await page.goto('/leaderboard');
    await page.waitForSelector('.leaderboard-item, .rider-row, [role="listitem"]');

    const leaderboardRows = page.locator('.leaderboard-item, .rider-row, [role="listitem"]');
    const leaderboardText = (await leaderboardRows.allTextContents()).join(' ');
    expect(leaderboardText.length).toBeGreaterThan(0);

    if (knownRiderEmail) {
      expect(leaderboardText).toContain(knownRiderEmail);
    }
    if (knownRiderName) {
      expect(leaderboardText).toContain(knownRiderName);
    }
    if (knownRiderPoints) {
      expect(leaderboardText).toContain(knownRiderPoints);
    }

    // Verify data remains stable across a reload
    await page.reload();
    await page.waitForSelector('.leaderboard-item, .rider-row, [role="listitem"]');

    const leaderboardRowsAfterReload = page.locator('.leaderboard-item, .rider-row, [role="listitem"]');
    const leaderboardTextAfterReload = (await leaderboardRowsAfterReload.allTextContents()).join(' ');

    if (knownRiderEmail) {
      expect(leaderboardTextAfterReload).toContain(knownRiderEmail);
    }
    if (knownRiderName) {
      expect(leaderboardTextAfterReload).toContain(knownRiderName);
    }
    if (knownRiderPoints) {
      expect(leaderboardTextAfterReload).toContain(knownRiderPoints);
    }

    await page.screenshot({ path: testInfo.outputPath('BRAPP-20-ac-4.png'), fullPage: true });
  });
});
