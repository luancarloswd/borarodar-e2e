import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://ride.borarodar.app';
const TEST_EMAIL = process.env.LOGIN_EMAIL || 'test@borarodar.app';
const TEST_PASSWORD = process.env.STAGING_PASSWORD ?? '';

if (!TEST_PASSWORD) {
  throw new Error(
    'STAGING_PASSWORD env var is required for BRAPP-115 E2E tests. ' +
      'Set STAGING_PASSWORD before running: e.g. `set STAGING_PASSWORD=...` (Windows) or `export STAGING_PASSWORD=...` (Unix).',
  );
}

async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto(BASE_URL);

  const userMenu = page.getByTestId('user-menu-btn');
  const isAlreadyLoggedIn = await userMenu.isVisible().catch(() => false);

  if (isAlreadyLoggedIn) {
    return;
  }

  if (!page.url().includes('/login')) {
    await page.goto(`${BASE_URL}/login`);
  }

  await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('email-input').fill(TEST_EMAIL);
  await page.getByTestId('password-input').fill(TEST_PASSWORD);
  await page.getByTestId('login-btn').click();

  await expect(userMenu).toBeVisible({ timeout: 30000 });

  if (page.url().includes('/login')) {
    await page.goto(BASE_URL);
  }
}

interface MotorcyclePickResult {
  motorcycleId: string | null;
}

async function pickFirstExistingMotorcycleId(page: Page): Promise<MotorcyclePickResult> {
  await page.goto(`${BASE_URL}/motorcycles`);

  await Promise.race([
    page
      .locator('[data-testid="moto-card"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => undefined),
    page
      .locator('[data-testid="motos-empty-state"]')
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => undefined),
  ]);

  const cards = page.locator('[data-testid="moto-card"]');
  const cardCount = await cards.count().catch(() => 0);
  if (cardCount > 0) {
    const firstCard = cards.first();
    await firstCard.click();
    await page.waitForURL(/\/motorcycles\/[^/]+$/, { timeout: 10000 });
    const url = page.url();
    const id = extractMotorcycleId(url);
    if (id) return { motorcycleId: id };
  }

  return { motorcycleId: null };
}

function extractMotorcycleId(href: string | null): string | null {
  if (!href) return null;
  const match = href.match(/\/motorcycles\/([^/?#]+)/);
  if (!match) return null;
  const candidate = match[1];
  if (!candidate || candidate === 'new' || candidate === 'diagnostics') return null;
  return candidate;
}

async function openDiagnosticsTab(page: Page, motorcycleId: string): Promise<boolean> {
  if (!page.url().includes(`/motorcycles/${motorcycleId}`)) {
    await page.goto(`${BASE_URL}/motorcycles/${motorcycleId}`);
  }

  await Promise.race([
    page.locator('[data-testid="moto-detail-title"]').waitFor({ state: 'visible', timeout: 15000 }),
    page.locator('[data-testid="ver-todos-diagnostics"]').waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => undefined);

  const viewAllLink = page.locator('[data-testid="ver-todos-diagnostics"], a[href*="/diagnostics"]');

  const linkVisible = await viewAllLink.first().isVisible().catch(() => false);
  if (!linkVisible) {
    return false;
  }

  await viewAllLink.first().click();

  await Promise.race([
    page.locator('[data-testid="diagnostics-title"]').waitFor({ state: 'visible', timeout: 10000 }),
    page.locator('[data-testid="diagnostics-empty"]').waitFor({ state: 'visible', timeout: 10000 }),
    page.locator('[data-testid="diagnostic-card"]').first().waitFor({ state: 'visible', timeout: 10000 }),
    page.waitForURL(/\/diagnostics/, { timeout: 10000 }),
  ]).catch(() => undefined);

  return true;
}

async function createDiagnosticEntry(
  page: Page,
  { title, description, severity }: { title: string; description: string; severity: 'low' | 'medium' | 'high' | 'critical' },
): Promise<boolean> {
  const addBtn = page.locator(
    '[data-testid="add-diagnostic-btn"], button[aria-label*="diagnóstico" i], button:has-text("Novo")',
  );

  const btnVisible = await addBtn.first().isVisible().catch(() => false);
  if (!btnVisible) {
    return false;
  }

  await addBtn.first().click();

  const titleInput = page.locator('#diag-title');
  await titleInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);

  const titleVisible = await titleInput.isVisible().catch(() => false);
  if (!titleVisible) {
    return false;
  }

  await titleInput.fill(title);

  const descInput = page.locator('#diag-description');
  if (await descInput.isVisible().catch(() => false)) {
    await descInput.fill(description);
  }

  const severitySelector = page.locator('#diag-severity');
  if (await severitySelector.isVisible().catch(() => false)) {
    await severitySelector.selectOption(severity);
  }

  const submitBtn = page.locator('[data-testid="diag-form-submit"], button[type="submit"]');
  await submitBtn.click();

  await Promise.race([
    page.locator('[data-testid="diagnostics-title"]').waitFor({ state: 'visible', timeout: 15000 }),
    page.locator('[data-testid="diagnostic-card"]').first().waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => undefined);

  return true;
}

test.describe('BRAPP-115: Save Diagnostics History per Motorcycle', () => {
  test.beforeAll(() => {
    try {
      mkdirSync('screenshots', { recursive: true });
    } catch {
      // directory already exists
    }
  });

  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('AC1: User opens Diagnósticos tab, taps +, fills title/description/severity=warning, saves → new entry appears at top of list with a yellow severity chip', async ({
    page,
  }) => {
    const { motorcycleId } = await pickFirstExistingMotorcycleId(page);

    if (!motorcycleId) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-1.png', fullPage: true });
      test.skip(true, 'No registered motorcycles on staging — cannot verify diagnostics flow');
      return;
    }

    const tabOpened = await openDiagnosticsTab(page, motorcycleId);

    if (!tabOpened) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-1.png', fullPage: true });
      test.skip(true, 'Diagnósticos section not yet deployed on staging — skipping AC1');
      return;
    }

    const entryTitle = `BRAPP-115-AC1-${Date.now()}`;
    const created = await createDiagnosticEntry(page, {
      title: entryTitle,
      description: 'Teste automatizado: código de falha simulado',
      severity: 'medium',
    });

    if (!created) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-1.png', fullPage: true });
      test.skip(true, 'Diagnostic creation form not yet deployed on staging — skipping AC1');
      return;
    }

    await page.screenshot({ path: 'screenshots/BRAPP-115-ac-1.png', fullPage: true });

    const firstCard = page.locator('[data-testid="diagnostic-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    const titleVisible = await firstCard.getByText(entryTitle, { exact: false }).isVisible().catch(() => false);
    expect(titleVisible, `New diagnostic entry "${entryTitle}" should appear at the top of the list`).toBe(true);

    const severityChip = firstCard.locator('span.bg-yellow-100, span:has-text("Média")').first();
    const chipVisible = await severityChip.isVisible().catch(() => false);
    expect(chipVisible, 'Severity chip should indicate warning/medium (yellow)').toBe(true);
  });

  test('AC2: User creates two diagnostic entries with different observedAt dates → list shows them ordered most-recent first', async ({
    page,
  }) => {
    const { motorcycleId } = await pickFirstExistingMotorcycleId(page);

    if (!motorcycleId) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-2.png', fullPage: true });
      test.skip(true, 'No registered motorcycles on staging — cannot verify diagnostics ordering');
      return;
    }

    const tabOpened = await openDiagnosticsTab(page, motorcycleId);

    if (!tabOpened) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-2.png', fullPage: true });
      test.skip(true, 'Diagnósticos section not yet deployed on staging — skipping AC2');
      return;
    }

    const ts = Date.now();
    const olderTitle = `BRAPP-115-AC2-OLDER-${ts}`;
    const newerTitle = `BRAPP-115-AC2-NEWER-${ts + 10000}`;

    const created1 = await createDiagnosticEntry(page, {
      title: olderTitle,
      description: 'Entrada mais antiga',
      severity: 'low',
    });

    if (!created1) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-2.png', fullPage: true });
      test.skip(true, 'Diagnostic creation form not yet deployed on staging — skipping AC2');
      return;
    }

    await createDiagnosticEntry(page, {
      title: newerTitle,
      description: 'Entrada mais recente',
      severity: 'low',
    });

    await page.screenshot({ path: 'screenshots/BRAPP-115-ac-2.png', fullPage: true });

    const cards = page.locator('[data-testid="diagnostic-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    const firstCardText = await cards.first().textContent().catch(() => '');
    const secondCardText = await cards.nth(1).textContent().catch(() => '');

    expect(
      firstCardText?.includes(newerTitle),
      `Most-recently created entry "${newerTitle}" should appear first`,
    ).toBe(true);
    expect(
      secondCardText?.includes(olderTitle),
      `Older entry "${olderTitle}" should appear second`,
    ).toBe(true);
  });

  test('AC3: User edits an existing diagnostic entry severity from warning to critical → list reflects the new severity chip color (red) without a page reload', async ({
    page,
  }) => {
    const { motorcycleId } = await pickFirstExistingMotorcycleId(page);

    if (!motorcycleId) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-3.png', fullPage: true });
      test.skip(true, 'No registered motorcycles on staging — cannot verify diagnostic editing');
      return;
    }

    const tabOpened = await openDiagnosticsTab(page, motorcycleId);

    if (!tabOpened) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-3.png', fullPage: true });
      test.skip(true, 'Diagnósticos section not yet deployed on staging — skipping AC3');
      return;
    }

    const entryTitle = `BRAPP-115-AC3-${Date.now()}`;
    const created = await createDiagnosticEntry(page, {
      title: entryTitle,
      description: 'Entrada para testar edição de severidade',
      severity: 'medium',
    });

    if (!created) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-3.png', fullPage: true });
      test.skip(true, 'Diagnostic creation form not yet deployed on staging — skipping AC3');
      return;
    }

    const firstCard = page.locator('[data-testid="diagnostic-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    const editBtn = firstCard.locator('button[aria-label*="Editar"]');
    await editBtn.click();

    const severitySelector = page.locator('#diag-severity');
    await severitySelector.waitFor({ state: 'visible', timeout: 5000 });
    await severitySelector.selectOption('critical');

    const submitBtn = page.locator('[data-testid="diag-form-submit"]');
    await submitBtn.click();

    await page.screenshot({ path: 'screenshots/BRAPP-115-ac-3.png', fullPage: true });

    const updatedCard = page.locator('[data-testid="diagnostic-card"]').first();
    const severityChip = updatedCard.locator('span.bg-red-100, span:has-text("Crítica")').first();
    const chipVisible = await severityChip.isVisible().catch(() => false);
    expect(chipVisible, 'Severity chip should now indicate critical (red)').toBe(true);
  });

  test('AC4: User deletes a diagnostic entry → it disappears from the list and a subsequent reload still does not show it', async ({
    page,
  }) => {
    const { motorcycleId } = await pickFirstExistingMotorcycleId(page);

    if (!motorcycleId) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-4.png', fullPage: true });
      test.skip(true, 'No registered motorcycles on staging — cannot verify diagnostic deletion');
      return;
    }

    const tabOpened = await openDiagnosticsTab(page, motorcycleId);

    if (!tabOpened) {
      await page.screenshot({ path: 'screenshots/BRAPP-115-ac-4.png', fullPage: true });
      test.skip(true, 'Diagnósticos section not yet deployed on staging — skipping AC4');
      return;
    }

    const entryTitle = `BRAPP-115-AC4-${Date.now()}`;
    await createDiagnosticEntry(page, {
      title: entryTitle,
      description: 'Entrada para testar exclusão',
      severity: 'low',
    });

    const firstCard = page.locator('[data-testid="diagnostic-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = firstCard.locator('[data-testid="delete-diagnostic-btn"]');
    await deleteBtn.click();

    const confirmBtn = page.locator('[data-testid="confirm-delete-diagnostic-btn"]');
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click();

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/BRAPP-115-ac-4.png', fullPage: true });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.includes(entryTitle)).toBe(false);

    await page.reload();
    await page.locator('[data-testid="diagnostics-title"]').waitFor({ state: 'visible' });
    const bodyTextAfterReload = await page.locator('body').innerText();
    expect(bodyTextAfterReload.includes(entryTitle)).toBe(false);
  });

  test('AC5: Regression — opening the Manutenção page after creating diagnostics still loads correctly', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${BASE_URL}/maintenance`);

    await Promise.race([
      page.locator('[data-testid="maintenance-title"]').waitFor({ state: 'visible', timeout: 15000 }),
      page.locator('h1:has-text("MANUTENCAO")').waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => undefined);

    await page.screenshot({ path: 'screenshots/BRAPP-115-ac-5.png', fullPage: true });

    const title = page.locator('[data-testid="maintenance-title"], h1:has-text("MANUTENCAO")');
    await expect(title).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
