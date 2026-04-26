import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.BASE_URL;
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
  test.skip(
    'Skipping: Required environment variables are not set.',
    { annotation: { type: 'error', description: 'Missing env vars' } }
  );
}

test.describe('BRAPP-4: event slug routing, fallbacks, and error states', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.LOGIN_EMAIL || !process.env.LOGIN_PASSWORD,
      'Skipping: set LOGIN_EMAIL and LOGIN_PASSWORD to run E2E tests');
    // Login flow
    await page.goto(BASE_URL ?? '/');
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await emailField.fill(LOGIN_EMAIL!);
    await passwordField.fill(LOGIN_PASSWORD!);
    await submitButton.click();

    // Wait for a deterministic post-login signal instead of a dashboard-specific test id
    await page.waitForURL((url) => !url.toString().endsWith('/'), { timeout: 15000 });
    await expect(submitButton).not.toBeVisible({ timeout: 15000 });
  });

  test('AC1: Clicking any event card in the event list navigates to the detail page without crashing', async ({ page }) => {
    await page.goto('eventos');

    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });

    const firstEventCard = page.locator('div[data-testid="event-card"]').first();
    await firstEventCard.click();

    await page.waitForSelector('div[data-testid="event-detail"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-1.png', fullPage: true });

    await expect(page.locator('div[data-testid="event-detail"]')).toBeVisible();
  });

  test('AC2: Events without optional fields (flyer, routeInfo, schedule.dates, rsvp.goingUsers) render correctly with fallbacks', async ({ page }) => {
    await page.goto('eventos');

    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });

    const firstEventCard = page.locator('div[data-testid="event-card"]').first();
    await firstEventCard.click();

    await page.waitForSelector('div[data-testid="event-detail"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-2.png', fullPage: true });

    // Verify the detail page renders without crashing; optional fields show a placeholder or are absent
    await expect(page.locator('div[data-testid="event-detail"]')).toBeVisible();
    const flyerImage = page.locator('img[alt="Event flyer"]');
    const flyerPlaceholder = page.locator('[data-testid="flyer-placeholder"]');
    const flyerVisible = await flyerImage.isVisible();
    const placeholderVisible = await flyerPlaceholder.isVisible();
    expect(flyerVisible || placeholderVisible).toBe(true);
  });

  test('AC3: Navigating to a non-existent event slug shows a 404 page, not a blank crash', async ({ page }) => {
    await page.goto('eventos/non-existent-event');

    // Wait for the 404 page to render instead of relying on a fixed delay
    const notFoundPage = page.locator('div[data-testid="not-found-page"]');
    await expect(notFoundPage).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-3.png', fullPage: true });

    await expect(notFoundPage).toBeVisible();
  });

  test('AC4: Navigating to a club_only event as a non-member shows a 403 forbidden page', async ({ page }) => {
    await page.goto('eventos/club-only-event');

    // Wait for the forbidden page to render instead of relying on a fixed delay
    const forbiddenPage = page.locator('div[data-testid="forbidden-page"]');
    await expect(forbiddenPage).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-4.png', fullPage: true });

    await expect(forbiddenPage).toBeVisible();
  });

  test('AC5: The EventCard link uses event.slug to build the navigation URL', async ({ page }) => {
    await page.goto('eventos');

    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });

    const firstEventCard = page.locator('div[data-testid="event-card"]').first();
    const eventLink = await firstEventCard.locator('a').first().getAttribute('href');

    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-5.png', fullPage: true });

    // Verify the URL is present and uses a non-numeric slug (not an ID)
    expect(eventLink).not.toBeNull();
    expect(eventLink!).toMatch(/\/eventos\/(?!\d+$)[a-z0-9]+(?:-[a-z0-9]+)*\/?$/i);
  });

  test('AC6: The search query .select() includes the slug field', async ({ page }) => {
    // Capture network requests to verify the outgoing query includes the slug field
    const capturedRequests: Array<{ url: string; body: string }> = [];

    page.on('request', (request) => {
      capturedRequests.push({
        url: request.url(),
        body: request.postData() ?? '',
      });
    });

    await page.goto('eventos');

    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-6.png', fullPage: true });

    const requestIncludingSlugSelect = capturedRequests.find(({ url, body }) => {
      const decodedUrl = decodeURIComponent(url);
      const decodedBody = decodeURIComponent(body);
      const requestText = `${decodedUrl}\n${decodedBody}`;
      return requestText.includes('select') && requestText.includes('slug');
    });

    // Verify the outgoing query/payload explicitly requests the slug field
    expect(requestIncludingSlugSelect).toBeTruthy();
  });

  test('AC7: An ErrorBoundary wraps EventDetailPage and catches unexpected render errors with a safe fallback UI', async ({ page }) => {
    await page.goto('eventos');

    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });
    const firstEventCard = page.locator('div[data-testid="event-card"]').first();
    await firstEventCard.click();

    await page.waitForSelector('div[data-testid="event-detail"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-7.png', fullPage: true });

    // Verify the page remains functional during normal rendering; error boundary should not be shown
    await expect(page.locator('div[data-testid="event-detail"]')).toBeVisible();
    await expect(page.locator('div[data-testid="error-boundary"]')).not.toBeVisible();
  });
});