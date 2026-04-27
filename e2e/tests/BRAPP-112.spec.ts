import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';

const STAGING_URL = "https://ride.borarodar.app";
const STAGING_USER = "test@borarodar.app";
const STAGING_PASSWORD = process.env.STAGING_PASSWORD;

if (!STAGING_PASSWORD) {
  throw new Error('STAGING_PASSWORD env var is required for BRAPP-112 E2E tests');
}

/**
 * Minimal login helper. 
 * Ideally, this should be moved to a shared helper or use storageState in playwright.config.ts.
 */
async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto(STAGING_URL);

  // Wait for either the user menu (logged in) or the login nav button (not logged in)
  // to avoid race conditions during session restoration
  const userMenu = page.getByTestId('user-menu-btn');
  const loginNavBtn = page.getByTestId('login-nav-btn');

  await Promise.race([
    userMenu.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
    loginNavBtn.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  ]);

  const isAlreadyLoggedIn = await userMenu.isVisible();

  if (isAlreadyLoggedIn) {
    return;
  }

  // Navigate to login if not already there
  if (!page.url().includes('/login')) {
    const loginBtn = page.getByTestId('login-nav-btn');
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
    } else {
      await page.goto(`${STAGING_URL}/login`);
    }
  }

  // Fill login form
  await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('email-input').fill(STAGING_USER);
  await page.getByTestId('password-input').fill(STAGING_PASSWORD!);
  await page.getByTestId('login-btn').click();

  // Wait for login to complete and redirect to finish
  await expect(userMenu).toBeVisible({ timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

test.describe("BRAPP-112: Fix Estimates Not Loading on Estimates List Page", () => {
  test.beforeAll(() => {
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch (e) {
      // Ignore if directory already exists
    }
  });

  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("User navigates to /budget → saved estimates list renders with at least one estimate row visible", async ({ page }) => {
    await page.goto(`${STAGING_URL}/budget`);
    await page.waitForLoadState('networkidle');

    // Verify list renders and at least one card is visible
    const estimateRows = page.locator('[data-testid="estimate-card"]');
    
    // If no estimates, we try to create one to satisfy the AC requirement of having at least one visible
    const count = await estimateRows.count();
    if (count === 0) {
      const emptyState = page.locator(':has-text("Nenhuma estimativa salva")');
      if (await emptyState.isVisible()) {
        // Create a quick estimate if possible or just log it
        // For now, let's just wait longer in case of slow loading
        await expect(estimateRows.first()).toBeVisible({ timeout: 20000 });
      } else {
        await expect(estimateRows.first()).toBeVisible({ timeout: 20000 });
      }
    } else {
      await expect(estimateRows.first()).toBeVisible({ timeout: 20000 });
    }
    
    await page.screenshot({ path: `screenshots/BRAPP-112-ac-1.png`, fullPage: true });
  });

  test("User navigates to /budget while authenticated → loading spinner disappears and no error message is shown", async ({ page }) => {
    await page.goto(`${STAGING_URL}/budget`);

    // Loading spinner (pulse skeleton) should eventually disappear
    const loader = page.locator('[role="status"][aria-busy="true"]');
    await expect(loader).not.toBeVisible({ timeout: 25000 });

    // No error message should be shown
    const errorMessage = page.locator(':has-text("Erro ao carregar")');
    await expect(errorMessage).not.toBeVisible();

    // Verify list is actually there or empty state is shown (no error)
    const estimateRows = page.locator('[data-testid="estimate-card"]');
    const emptyState = page.locator(':has-text("Nenhuma estimativa salva")');
    
    await expect(estimateRows.first().or(emptyState)).toBeVisible();

    await page.screenshot({ path: `screenshots/BRAPP-112-ac-2.png`, fullPage: true });
  });

  test("User clicks an estimate row in the list → estimate detail view opens with the selected estimate's data", async ({ page }) => {
    await page.goto(`${STAGING_URL}/budget`);
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('[data-testid="estimate-card"]').first();
    await firstRow.waitFor({ state: 'visible', timeout: 15000 });
    
    // Capture name from the card to verify in detail view
    const rowTitle = await firstRow.locator('p').first().innerText();

    await firstRow.click();

    // Verify detail view opens - using a more flexible regex for IDs (including hyphens)
    await expect(page).toHaveURL(/\/budget\/[a-zA-Z0-9-]+/);
    await expect(page.locator('[data-testid="estimate-name"]')).toBeVisible({ timeout: 15000 });
    
    if (rowTitle) {
      // Use a more flexible check for title as it might have slight formatting differences
      const detailName = await page.locator('[data-testid="estimate-name"]').innerText();
      expect(detailName.toLowerCase()).toContain(rowTitle.toLowerCase().trim());
    }

    await page.screenshot({ path: `screenshots/BRAPP-112-ac-3.png`, fullPage: true });
  });

  test("User clicks the delete button on an estimate → estimate is removed from the list and remains absent after page refresh", async ({ page }) => {
    await page.goto(`${STAGING_URL}/budget`);
    await page.waitForLoadState('networkidle');

    const estimateRows = page.locator('[data-testid="estimate-card"]');
    await expect(estimateRows.first()).toBeVisible({ timeout: 15000 });
    
    const initialCount = await estimateRows.count();
    if (initialCount === 0) {
       throw new Error("No estimates available to test delete flow.");
    }

    const firstRow = estimateRows.first();
    const deleteBtn = firstRow.locator('[data-testid="delete-estimate-btn"]');
    
    // Click delete and handle confirmation
    await deleteBtn.click();
    const confirmBtn = page.locator('[data-testid="confirm-delete-estimate-btn"]');
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await confirmBtn.click();

    // Verify it is removed from UI (count decreases)
    await expect(estimateRows).toHaveCount(initialCount - 1, { timeout: 15000 });

    // Refresh and verify it remains absent
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="estimate-card"]')).toHaveCount(initialCount - 1, { timeout: 15000 });

    await page.screenshot({ path: `screenshots/BRAPP-112-ac-4.png`, fullPage: true });
  });

  test("User refreshes the /budget page → previously displayed estimates reappear in the list", async ({ page }) => {
    await page.goto(`${STAGING_URL}/budget`);
    await page.waitForLoadState('networkidle');

    const estimateRows = page.locator('[data-testid="estimate-card"]');
    await expect(estimateRows.first()).toBeVisible({ timeout: 15000 });
    
    const countBeforeRefresh = await estimateRows.count();
    expect(countBeforeRefresh).toBeGreaterThan(0);

    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(estimateRows.first()).toBeVisible({ timeout: 20000 });
    const countAfterRefresh = await estimateRows.count();
    expect(countAfterRefresh).toBe(countBeforeRefresh);

    await page.screenshot({ path: `screenshots/BRAPP-112-ac-5.png`, fullPage: true });
  });
});
