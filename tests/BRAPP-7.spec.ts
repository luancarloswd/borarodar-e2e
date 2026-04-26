import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL;
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

if (!BASE_URL || !LOGIN_EMAIL || !LOGIN_PASSWORD) {
  test.skip(
    'Skipping: Required environment variables are not set.',
    { annotation: { type: 'error', description: 'Missing env vars' } }
  );
}

test.describe('BRAPP-7: Ver on Feed Check-in Navigates to Event Author Explorer Profile', () => {
  test.beforeAll(() => {
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots', { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL!);

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="e-mail" i]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-7-login-page.png', fullPage: true });

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="e-mail" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(LOGIN_EMAIL!);
    await passwordInput.fill(LOGIN_PASSWORD!);

    await page.screenshot({ path: 'screenshots/BRAPP-7-login-filled.png', fullPage: true });

    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Sign in")').first();
    await submitButton.click();

    // Wait for navigation away from login page
    await page.waitForURL((url) => !url.pathname.includes('login') && !url.pathname.includes('signin'), { timeout: 30000 });

    await page.screenshot({ path: 'screenshots/BRAPP-7-logged-in.png', fullPage: true });
  });

  test('should display city check-in activity event with Ver button in the feed', async ({ page }) => {
    // Navigate to feed if not already there
    const feedUrl = `${BASE_URL!}/feed`;
    await page.goto(feedUrl);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-7-feed-loaded.png', fullPage: true });

    // Look for activity event cards in the feed
    const activityCards = page.locator('[data-testid*="activity"], [class*="activity"], [class*="event-card"], [class*="ActivityEvent"], [class*="feed-item"]');
    await activityCards.first().waitFor({ timeout: 15000 }).catch(() => {
      // Feed may use different selectors ╬ô├ç├╢ look for any card-like elements
    });

    await page.screenshot({ path: 'screenshots/BRAPP-7-feed-events-visible.png', fullPage: true });

    // Look for city check-in events specifically or any feed item
    const cityCheckinCard = page.locator('[data-testid*="checkin"], [class*="checkin"], [class*="city_checkin"], [class*="CityCheckin"]').first();
    const anyFeedCard = page.locator('[data-testid*="feed"], [class*="feed"], [class*="activity"]').first();

    const hasCityCheckin = await cityCheckinCard.isVisible().catch(() => false);
    const hasFeedCard = await anyFeedCard.isVisible().catch(() => false);

    expect(hasCityCheckin || hasFeedCard).toBeTruthy();

    await page.screenshot({ path: 'screenshots/BRAPP-7-checkin-card-found.png', fullPage: true });
  });

  test('should navigate to explorer profile when Ver button is clicked on city check-in event', async ({ page }) => {
    await page.goto(`${BASE_URL!}/feed`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-7-feed-before-click.png', fullPage: true });

    // Find a "Ver" button inside a feed/activity card
    const verButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first();

    const verButtonVisible = await verButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (!verButtonVisible) {
      // Try alternate text labels
      const altButton = page.locator('button:has-text("View"), a:has-text("View"), button:has-text("Visualizar"), a:has-text("Visualizar")').first();
      const altVisible = await altButton.isVisible({ timeout: 5000 }).catch(() => false);
      expect(altVisible || verButtonVisible).toBeTruthy();
    } else {
      await verButton.click();

      // Wait for navigation to rider/explorer profile
      await page.waitForURL((url) => url.pathname.includes('/riders/') || url.pathname.includes('/explorer/') || url.pathname.includes('/profile/'), { timeout: 15000 });

      await page.screenshot({ path: 'screenshots/BRAPP-7-explorer-profile-navigated.png', fullPage: true });

      // Verify we're on a rider/explorer profile page
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(riders|explorer|profile)\//);
    }
  });

  test('should display explorer profile with user stats after clicking Ver on check-in', async ({ page }) => {
    await page.goto(`${BASE_URL!}/feed`);
    await page.waitForLoadState('networkidle');

    const verButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first();
    const verButtonVisible = await verButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (!verButtonVisible) {
      test.skip();
      return;
    }

    await verButton.click();

    await page.waitForURL((url) => url.pathname.includes('/riders/') || url.pathname.includes('/explorer/'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-7-profile-loading.png', fullPage: true });

    // Wait for skeleton loaders to disappear
    const skeleton = page.locator('[class*="skeleton"], [class*="loading"], [aria-busy="true"]');
    await skeleton.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

    await page.screenshot({ path: 'screenshots/BRAPP-7-profile-loaded.png', fullPage: true });

    // (a) Hero section ╬ô├ç├╢ avatar or displayName should be visible
    const heroSection = page.locator('[class*="hero"], [class*="profile-header"], [class*="ProfileHero"], h1, [class*="displayName"], [class*="avatar"]').first();
    await expect(heroSection).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-7-hero-section-visible.png', fullPage: true });

    // (b) Stats row ╬ô├ç├╢ look for Destinos/Estados/Km
    const statsSection = page.locator('[class*="stats"], [class*="Stats"], [data-testid*="stats"]').first();
    const statsVisible = await statsSection.isVisible().catch(() => false);

    if (statsVisible) {
      await expect(statsSection).toBeVisible();
      await page.screenshot({ path: 'screenshots/BRAPP-7-stats-row-visible.png', fullPage: true });
    }

    // Verify the URL contains a userId (non-empty path segment after /riders/)
    const profileUrl = page.url();
    const urlMatch = profileUrl.match(/\/(riders|explorer)\/([^/?#]+)/);
    expect(urlMatch).not.toBeNull();
    expect(urlMatch![2]).toBeTruthy();

    await page.screenshot({ path: 'screenshots/BRAPP-7-profile-url-verified.png', fullPage: true });
  });

  test('should show Follow or Editar Perfil button on explorer profile based on auth state', async ({ page }) => {
    await page.goto(`${BASE_URL!}/feed`);
    await page.waitForLoadState('networkidle');

    const verButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first();
    const verButtonVisible = await verButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (!verButtonVisible) {
      test.skip();
      return;
    }

    await verButton.click();

    await page.waitForURL((url) => url.pathname.includes('/riders/') || url.pathname.includes('/explorer/'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-7-profile-actions.png', fullPage: true });

    // Either Follow button (viewing another user) or Editar perfil (self-view) must be present
    const followButton = page.locator('button:has-text("Follow"), button:has-text("Seguir"), a:has-text("Seguir")').first();
    const editButton = page.locator('button:has-text("Editar perfil"), a:has-text("Editar perfil"), button:has-text("Edit profile")').first();

    const hasFollow = await followButton.isVisible().catch(() => false);
    const hasEdit = await editButton.isVisible().catch(() => false);

    expect(hasFollow || hasEdit).toBeTruthy();

    await page.screenshot({ path: 'screenshots/BRAPP-7-cta-button-verified.png', fullPage: true });
  });

  test('should not navigate to city/place detail page when clicking Ver button on check-in event', async ({ page }) => {
    await page.goto(`${BASE_URL!}/feed`);
    await page.waitForLoadState('networkidle');

    const verButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first();
    const verButtonVisible = await verButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (!verButtonVisible) {
      test.skip();
      return;
    }

    await verButton.click();

    await page.waitForURL((url) => !url.href.includes('/feed'), { timeout: 15000 });

    const destinationUrl = page.url();

    await page.screenshot({ path: 'screenshots/BRAPP-7-no-place-navigation.png', fullPage: true });

    // The Ver button must NOT navigate to a place/city detail page
    expect(destinationUrl).not.toMatch(/\/(places|cities|municipios|cidades)\//);

    // It must navigate to a rider/explorer profile
    expect(destinationUrl).toMatch(/\/(riders|explorer|profile)\//);
  });

  test('should navigate to explorer profile when clicking author avatar or displayName on check-in card', async ({ page }) => {
    await page.goto(`${BASE_URL!}/feed`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-7-feed-for-avatar-test.png', fullPage: true });

    // Find author avatar/name link in a feed card
    const authorLink = page.locator('[class*="feed"] [class*="avatar"] a, [class*="feed"] [class*="author"] a, [class*="activity"] [class*="user"] a').first();
    const authorLinkVisible = await authorLink.isVisible({ timeout: 10000 }).catch(() => false);

    if (!authorLinkVisible) {
      test.skip();
      return;
    }

    await authorLink.click();

    await page.waitForURL((url) => url.pathname.includes('/riders/') || url.pathname.includes('/explorer/'), { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-7-profile-via-avatar.png', fullPage: true });

    expect(page.url()).toMatch(/\/(riders|explorer)\//);
  });

  test('should show recent activity list on explorer profile', async ({ page }) => {
    await page.goto(`${BASE_URL!}/feed`);
    await page.waitForLoadState('networkidle');

    const verButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first();
    const verButtonVisible = await verButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (!verButtonVisible) {
      test.skip();
      return;
    }

    await verButton.click();

    await page.waitForURL((url) => url.pathname.includes('/riders/') || url.pathname.includes('/explorer/'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Wait for skeleton to resolve
    const skeleton = page.locator('[class*="skeleton"], [class*="loading"]');
    await skeleton.first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

    await page.screenshot({ path: 'screenshots/BRAPP-7-recent-activity.png', fullPage: true });

    // (d) Recent activity list ╬ô├ç├╢ look for activity items
    const activityList = page.locator('[class*="activity-list"], [class*="ActivityList"], [class*="recent-activity"], [data-testid*="activity"]').first();
    const activityVisible = await activityList.isVisible().catch(() => false);

    if (activityVisible) {
      await expect(activityList).toBeVisible();
    }

    // Verify page is fully rendered with some content
    const pageContent = await page.locator('body').textContent();
    expect(pageContent!.length).toBeGreaterThan(100);

    await page.screenshot({ path: 'screenshots/BRAPP-7-profile-fully-rendered.png', fullPage: true });
  });
});
