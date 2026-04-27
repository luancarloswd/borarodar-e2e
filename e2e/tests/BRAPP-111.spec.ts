import { test, expect, Page } from '@playwright/test';
import { mkdirSync } from 'fs';

const STAGING_URL = "https://ride.borarodar.app";
const STAGING_USER = "test@borarodar.app";
const STAGING_PASSWORD = process.env.STAGING_PASSWORD;

if (!STAGING_PASSWORD) {
  throw new Error('STAGING_PASSWORD env var is required for BRAPP-111 E2E tests');
}

/**
 * Shared login helper.
 * NOTE: A shared login helper / Playwright `storageState` does not yet exist in this repo.
 * When one is introduced, prefer it.
 */
async function login(page: Page): Promise<void> {
  await page.goto(`${STAGING_URL}/login`, { waitUntil: 'domcontentloaded' });
  const emailField = page.getByLabel(/e-?mail/i).first();
  await emailField.waitFor({ state: 'visible', timeout: 15000 });
  await emailField.fill(STAGING_USER);
  await page.getByLabel(/senha|password/i).first().fill(STAGING_PASSWORD!);
  await page.getByRole('button', { name: /entrar|sign in|log in/i }).first().click();
  
  // Wait for login to complete by checking for a post-login UI element (like the logo or user menu)
  // or by checking that we are no longer on the login page.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

/**
 * Finds the first available trip ID from the trips discovery or mine page.
 */
async function pickFirstExistingTripId(page: Page): Promise<string | null> {
  await page.goto(`${STAGING_URL}/trips`, { waitUntil: 'domcontentloaded' });
  
  // Wait for trip cards to appear or the empty state
  await Promise.race([
    page.locator('[data-testid="trip-card"]').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    page.locator('[data-testid="tab-mine"]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  ]);

  // Try to find a trip in "Minhas viagens" first
  const mineTab = page.locator('[data-testid="tab-mine"]');
  if (await mineTab.isVisible()) {
    await mineTab.click();
    await page.waitForTimeout(1000); // Wait for tab switch
  }

  const tripLink = page.locator('[data-testid="trip-card"]').first();
  if (await tripLink.isVisible()) {
    const href = await tripLink.getAttribute('href');
    if (href) {
      const match = href.match(/\/trips\/([^/?#]+)/);
      return match ? match[1] : null;
    }
  }

  // Fallback to "Descobrir" tab
  const discoveryTab = page.locator('[data-testid="tab-discovery"]');
  if (await discoveryTab.isVisible()) {
    await discoveryTab.click();
    await page.waitForTimeout(1000);
    const discoveryTripLink = page.locator('[data-testid="trip-card"]').first();
    if (await discoveryTripLink.isVisible()) {
      const href = await discoveryTripLink.getAttribute('href');
      if (href) {
        const match = href.match(/\/trips\/([^/?#]+)/);
        return match ? match[1] : null;
      }
    }
  }

  return null;
}

test.describe("BRAPP-111: Fix Trip Details Page Not Loading", () => {
  let tripId: string | null = null;

  test.beforeAll(async () => {
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch (e) {
      // ignore
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    
    // We only need to find the tripId once per test run if possible, 
    // but beforeEach is safer for isolation.
    if (!tripId) {
      tripId = await pickFirstExistingTripId(page);
    }
    
    if (!tripId) {
      test.skip(true, 'No existing trips available on staging to verify trip details');
    }
  });

  test("User navigates to /trips/:id for an existing trip → trip details page renders without error", async ({ page }) => {
    await page.goto(`${STAGING_URL}/trips/${tripId}`);
    
    // Check for a key element that indicates the page has rendered
    const title = page.locator('[data-testid="trip-title"]');
    await expect(title).toBeVisible({ timeout: 15000 });
    
    // Verify no "Viagem não encontrada" or error message
    const errorText = page.locator('text=Viagem não encontrada');
    await expect(errorText).not.toBeVisible();

    await page.screenshot({ path: `screenshots/BRAPP-111-ac-1.png`, fullPage: true });
  });

  test("User opens a trip details page → itinerary section is visible with trip data", async ({ page }) => {
    await page.goto(`${STAGING_URL}/trips/${tripId}`);
    
    // Ensure the page is loaded
    await expect(page.locator('[data-testid="trip-title"]')).toBeVisible({ timeout: 15000 });
    
    // The AC implies the itinerary section SHOULD be visible.
    // Note: If the picked trip doesn't have an itinerary, this test might fail.
    // However, for QA verification, we expect to be testing with data that HAS an itinerary.
    const itinerarySection = page.locator('[data-testid="itinerary-section"]');
    await expect(itinerarySection).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `screenshots/BRAPP-111-ac-2.png`, fullPage: true });
  });

  test("User opens a trip details page → route information section is visible", async ({ page }) => {
    await page.goto(`${STAGING_URL}/trips/${tripId}`);
    
    await expect(page.locator('[data-testid="trip-title"]')).toBeVisible({ timeout: 15000 });
    
    // Route information usually includes the route title and a link to the route detail
    const routeLink = page.locator('a[href^="/routes/"]');
    await expect(routeLink).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `screenshots/BRAPP-111-ac-3.png`, fullPage: true });
  });

  test("User opens a trip details page → group information section is visible", async ({ page }) => {
    await page.goto(`${STAGING_URL}/trips/${tripId}`);
    
    await expect(page.locator('[data-testid="trip-title"]')).toBeVisible({ timeout: 15000 });
    
    // Group information is represented by the participants section
    const participantsSection = page.locator('[data-testid="participants-section"]');
    await expect(participantsSection).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `screenshots/BRAPP-111-ac-4.png`, fullPage: true });
  });

  test("User refreshes the trip details page → page reloads successfully and all sections remain visible", async ({ page }) => {
    await page.goto(`${STAGING_URL}/trips/${tripId}`);
    
    await expect(page.locator('[data-testid="trip-title"]')).toBeVisible({ timeout: 15000 });
    
    // Perform refresh
    await page.reload();
    
    // Verify all sections are still visible after reload
    await expect(page.locator('[data-testid="trip-title"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="itinerary-section"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[href^="/routes/"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="participants-section"]')).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `screenshots/BRAPP-111-ac-5.png`, fullPage: true });
  });
});
