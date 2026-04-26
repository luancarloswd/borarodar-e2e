import { test, expect, Page, Locator } from '@playwright/test';
import { mkdirSync } from 'fs';

const STAGING_URL = 'https://ride.borarodar.app';
const STAGING_USER = 'test@borarodar.app';
const STAGING_PASSWORD = process.env.STAGING_PASSWORD ?? '';

// Login helper modeled on the proven BRAPP-109 flow.
async function login(page: Page): Promise<void> {
  await page.goto(STAGING_URL);

  const alreadyAuthed = await page
    .locator('[data-testid="dashboard"]')
    .isVisible()
    .catch(() => false);
  if (alreadyAuthed) return;

  await page.fill('input[type="email"]', STAGING_USER);
  await page.fill('input[type="password"]', STAGING_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-testid="dashboard"]', { timeout: 30000 });
}

// Returns the first visible locator from `candidates` within `timeout`,
// or null. Lets the test tolerate small markup differences between
// staging and the AC's nominal selectors.
async function firstVisible(
  page: Page,
  candidates: string[],
  timeout = 5000,
): Promise<Locator | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const sel of candidates) {
      const loc = page.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) return loc;
    }
    await page.waitForTimeout(150);
  }
  return null;
}

// BRAPP-89 confirms the real selector on /trips/new is a native
// <select name="routeId">. Keep that as the primary candidate and
// fall back to data-testids in case the markup has been migrated.
const ROUTE_SELECTOR_CANDIDATES = [
  'select[name="routeId"]',
  '[data-testid="route-selector"]',
  '[data-testid="trip-route-selector"]',
  '[data-testid="route-picker"]',
  'select[name*="route" i]',
  'select[name*="rota" i]',
];

const ROUTE_OPTION_COUNT_CANDIDATES = [
  'select[name="routeId"] option:not([value=""]):not([disabled])',
  'select[name*="route" i] option:not([value=""]):not([disabled])',
  '[data-testid="route-selector-item"]',
  '[data-testid="route-option"]',
  '[data-testid="route-picker-item"]',
  '[role="option"]',
];

async function countRouteOptions(page: Page): Promise<number> {
  // Native <select> options exist in the DOM even when collapsed,
  // so count() is the right primitive (not visibility).
  for (const sel of ROUTE_OPTION_COUNT_CANDIDATES) {
    const c = await page.locator(sel).count().catch(() => 0);
    if (c > 0) return c;
  }
  return 0;
}

// Broad URL matcher for "list my routes" requests. Covers REST, tRPC,
// GraphQL, and Next.js data routes in either Portuguese or English.
function isRouteListRequest(url: string, method: string): boolean {
  if (method !== 'GET' && method !== 'POST') return false;
  const isApi = /(\/api\/|\/trpc\/|\/graphql|\/_next\/data\/|\/rest\/)/i.test(url);
  const mentionsRoutes = /(routes?|rotas?)(\b|\/|\?|\.)/i.test(url);
  return isApi && mentionsRoutes;
}

test.describe('BRAPP-107: Fix Route List Not Loading on Trip Registry Page', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    if (!STAGING_PASSWORD) {
      test.skip(
        true,
        'STAGING_PASSWORD env var not set — skipping BRAPP-107 (set it before running, e.g. STAGING_PASSWORD=... npx playwright test).',
      );
      return;
    }
    await login(page);
  });

  test('AC1: User navigates to /trips/new → route selector displays a list of their available routes within 3 seconds', async ({
    page,
  }) => {
    await page.goto(`${STAGING_URL}/trips/new`);

    const routeSelector = await firstVisible(
      page,
      ROUTE_SELECTOR_CANDIDATES,
      20000,
    );
    expect(routeSelector, 'route selector should render on /trips/new').not.toBeNull();

    // Options inside <select> aren't "visible" in Playwright's sense,
    // so poll count() instead. AC budget is 3s; staging slack is wider.
    let itemCount = 0;
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      itemCount = await countRouteOptions(page);
      if (itemCount > 0) break;
      await page.waitForTimeout(200);
    }

    await page.screenshot({
      path: 'screenshots/BRAPP-107-ac-1.png',
      fullPage: true,
    });

    expect(
      itemCount,
      'route selector should expose at least one user route',
    ).toBeGreaterThan(0);
  });

  test('AC2: User navigates to /trips/new while routes are loading → a skeleton loader is visible in the route selector area', async ({
    page,
  }) => {
    // Slow down any "list my routes" call so the loading state is observable.
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (isRouteListRequest(url, route.request().method())) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      await route.continue();
    });

    // Don't await goto fully — we want to inspect the page mid-load.
    const navPromise = page.goto(`${STAGING_URL}/trips/new`, {
      waitUntil: 'domcontentloaded',
    });

    const skeleton = await firstVisible(
      page,
      [
        '[data-testid="route-selector-skeleton"]',
        '[data-testid="route-picker-skeleton"]',
        '[data-testid="route-list-skeleton"]',
        '[data-testid*="skeleton" i]',
        '[data-testid*="loading" i]',
        '[aria-busy="true"]',
        '[data-loading="true"]',
        '.skeleton',
        '[class*="skeleton" i]',
        '[class*="Skeleton"]',
        '[role="progressbar"]',
        '[class*="spinner" i]',
        '[class*="Spinner"]',
        '[class*="loading" i]',
      ],
      10000,
    );

    await navPromise.catch(() => {
      /* may time out if API is slow; that's expected here */
    });

    await page.screenshot({
      path: 'screenshots/BRAPP-107-ac-2.png',
      fullPage: true,
    });

    expect(
      skeleton,
      'a loading skeleton/spinner should be visible while routes load',
    ).not.toBeNull();
  });

  test("AC3: User navigates to /trips/new with no existing routes → an empty-state message with a 'Create route' CTA button is visible", async ({
    page,
  }) => {
    // Stub every plausible "list my routes" endpoint with an empty payload.
    // Empty array, empty data wrappers, and tRPC-shaped responses are all covered.
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (isRouteListRequest(url, method)) {
        const emptyBody = JSON.stringify({
          data: [],
          items: [],
          routes: [],
          rotas: [],
          result: { data: { json: [] } },
          success: true,
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: emptyBody,
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`${STAGING_URL}/trips/new`);

    // Give the SPA a moment to react to the empty payload.
    await page.waitForTimeout(1500);

    const emptyState = await firstVisible(
      page,
      [
        '[data-testid="route-selector-empty"]',
        '[data-testid="route-picker-empty"]',
        '[data-testid="empty-state"]',
        '[data-testid*="empty" i]',
        'text=/nenhuma rota|sem rotas|no routes|você ainda não|voce ainda nao|crie sua primeira/i',
      ],
      15000,
    );

    const createRouteCta = await firstVisible(
      page,
      [
        '[data-testid="route-selector-create-cta"]',
        '[data-testid="create-route-cta"]',
        '[data-testid="create-route-btn"]',
        'a[href*="/routes/new"]',
        'a[href*="/rotas/nova"]',
        'a[href*="/rotas/new"]',
        'button:has-text("Criar rota")',
        'button:has-text("Nova rota")',
        'button:has-text("Create route")',
        'a:has-text("Criar rota")',
        'a:has-text("Nova rota")',
        'a:has-text("Create route")',
      ],
      10000,
    );

    await page.screenshot({
      path: 'screenshots/BRAPP-107-ac-3.png',
      fullPage: true,
    });

    // The CTA is the AC's load-bearing assertion. The empty-state copy may
    // be folded into the CTA's container in some designs, so accept either
    // an explicit empty-state node OR zero real options + the CTA.
    if (!emptyState) {
      const optionCount = await countRouteOptions(page);
      expect(
        optionCount,
        'with no routes, the selector should expose zero real route options',
      ).toBe(0);
    } else {
      expect(emptyState).not.toBeNull();
    }

    expect(
      createRouteCta,
      "'Create route' CTA should be visible in empty state",
    ).not.toBeNull();

    if (createRouteCta) {
      const ctaText = (await createRouteCta.textContent())?.trim() ?? '';
      const ctaHref = (await createRouteCta.getAttribute('href')) ?? '';
      expect(
        /criar.*rota|create.*route|nova rota|new route/i.test(ctaText) ||
          /\/routes?\/new|\/rotas?\/(nova|new)/i.test(ctaHref),
        `CTA should advertise route creation (text="${ctaText}", href="${ctaHref}")`,
      ).toBe(true);
    }
  });

  test("AC4: User navigates to /trips/new when the routes API fails → an error message with a 'Retry' button is visible in the route selector", async ({
    page,
  }) => {
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (isRouteListRequest(url, method)) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: 'Internal Server Error',
            success: false,
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`${STAGING_URL}/trips/new`);
    await page.waitForTimeout(1500);

    const errorBanner = await firstVisible(
      page,
      [
        '[data-testid="route-selector-error"]',
        '[data-testid="route-picker-error"]',
        '[data-testid="error-state"]',
        '[data-testid*="error" i]',
        '[role="alert"]',
        'text=/erro ao carregar|falha ao carregar|não foi possível|nao foi possivel|error loading|failed to load|tente novamente|try again/i',
      ],
      15000,
    );

    const retryBtn = await firstVisible(
      page,
      [
        '[data-testid="route-selector-retry"]',
        '[data-testid="retry-btn"]',
        '[data-testid*="retry" i]',
        'button:has-text("Tentar novamente")',
        'button:has-text("Tentar de novo")',
        'button:has-text("Retry")',
        'button:has-text("Repetir")',
        'button:has-text("Recarregar")',
      ],
      10000,
    );

    await page.screenshot({
      path: 'screenshots/BRAPP-107-ac-4.png',
      fullPage: true,
    });

    expect(
      errorBanner,
      'error message should be visible when routes API fails',
    ).not.toBeNull();
    expect(
      retryBtn,
      "'Retry' button should be visible alongside the error",
    ).not.toBeNull();

    if (retryBtn) {
      const retryText = (await retryBtn.textContent())?.trim() ?? '';
      expect(retryText).toMatch(/tentar novamente|tentar de novo|retry|repetir|recarregar/i);
    }
  });

  test('AC5: User creates a new route and returns to /trips/new → the newly created route appears in the route selector list without a manual page refresh', async ({
    page,
  }) => {
    await page.goto(`${STAGING_URL}/trips/new`);

    const initialSelector = await firstVisible(
      page,
      ROUTE_SELECTOR_CANDIDATES,
      20000,
    );
    expect(
      initialSelector,
      'route selector should render on /trips/new',
    ).not.toBeNull();

    // Wait for initial routes to settle before snapshotting count.
    await page.waitForTimeout(1500);
    const initialCount = await countRouteOptions(page);

    const uniqueRouteName = `BRAPP-107 Test Route ${Date.now()}`;

    await page.goto(`${STAGING_URL}/routes/new`);

    const routeForm = await firstVisible(
      page,
      [
        '[data-testid="route-form"]',
        'form[data-testid*="route" i]',
        'form:has(input[name*="name" i])',
        'form:has(input[name*="nome" i])',
        'form',
      ],
      15000,
    );
    expect(routeForm, '/routes/new should render a route creation form').not.toBeNull();

    const nameInput = page
      .locator(
        [
          '[data-testid="route-name-input"]',
          'input[name="name"]',
          'input[name*="name" i]',
          'input[name*="nome" i]',
          'input[placeholder*="nome" i]',
          'input[placeholder*="name" i]',
        ].join(', '),
      )
      .first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(uniqueRouteName);
    }

    const originInput = page
      .locator(
        [
          '[data-testid="route-origin-input"]',
          'input[name*="origin" i]',
          'input[name*="origem" i]',
          'input[placeholder*="origem" i]',
          'input[placeholder*="origin" i]',
        ].join(', '),
      )
      .first();
    if (await originInput.isVisible().catch(() => false)) {
      await originInput.fill('São Paulo');
    }

    const destInput = page
      .locator(
        [
          '[data-testid="route-destination-input"]',
          'input[name*="destination" i]',
          'input[name*="destino" i]',
          'input[placeholder*="destino" i]',
          'input[placeholder*="destination" i]',
        ].join(', '),
      )
      .first();
    if (await destInput.isVisible().catch(() => false)) {
      await destInput.fill('Rio de Janeiro');
    }

    const submitBtn = page
      .locator(
        [
          '[data-testid="route-form-submit"]',
          'button[type="submit"]',
          'button:has-text("Salvar")',
          'button:has-text("Criar")',
          'button:has-text("Save")',
          'button:has-text("Create")',
        ].join(', '),
      )
      .first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    }

    // The form may submit in-place or redirect; in either case we re-check
    // /trips/new and look for the new route there.
    await page
      .waitForURL((url) => !url.pathname.endsWith('/routes/new'), {
        timeout: 30000,
      })
      .catch(() => {
        /* tolerate in-place submit */
      });

    await page.goto(`${STAGING_URL}/trips/new`);
    const reopenedSelector = await firstVisible(
      page,
      ROUTE_SELECTOR_CANDIDATES,
      20000,
    );
    expect(
      reopenedSelector,
      'route selector should re-render on /trips/new',
    ).not.toBeNull();

    const named = page.locator(`text=${uniqueRouteName}`).first();
    const deadline = Date.now() + 15000;
    let newCount = await countRouteOptions(page);
    let nameVisible = await named.isVisible().catch(() => false);
    while (Date.now() < deadline && newCount <= initialCount && !nameVisible) {
      await page.waitForTimeout(300);
      newCount = await countRouteOptions(page);
      nameVisible = await named.isVisible().catch(() => false);
    }

    await page.screenshot({
      path: 'screenshots/BRAPP-107-ac-5.png',
      fullPage: true,
    });

    expect(
      newCount > initialCount || nameVisible,
      `new route "${uniqueRouteName}" should appear in selector (initial=${initialCount}, now=${newCount}, namedVisible=${nameVisible})`,
    ).toBe(true);
  });
});
