import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL;
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

if (!BASE_URL || !LOGIN_EMAIL || !LOGIN_PASSWORD) {
  test.skip(
    'Skipping BRAPP-16 tests: Required environment variables (BASE_URL, LOGIN_EMAIL, LOGIN_PASSWORD) are not set.',
    { annotation: { type: 'error', description: 'Missing env vars' } }
  );
}

const screenshotsDir = path.join(process.cwd(), 'screenshots');

test.describe('BRAPP-16: SDD Message Status Updates', () => {
  test.beforeAll(() => {
    mkdirSync(screenshotsDir, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL!);

    // Login flow
    await page.getByLabel(/email/i).fill(LOGIN_EMAIL!);
    await page.getByLabel(/password/i).fill(LOGIN_PASSWORD!);
    await page.getByRole('button', { name: /login|entrar/i }).click();
    
    // Wait for dashboard/home to load
    await page.waitForLoadState('networkidle');
  });

  test('User clicks the "Approve" button on a previously sent SDD message after the bot has restarted ╬ô├Ñ├å The SDD message updates to indicate successful approval.', async ({ page }) => {
    const approveButton = page.getByRole('button', { name: /approve|aprovar/i });
    
    await expect(approveButton).toBeVisible({ timeout: 10000 });
    await expect(approveButton).toBeEnabled();
    await approveButton.click();
    await expect(page.getByText(/approved|aprovado/i)).toBeVisible();

    await page.screenshot({ path: path.join(screenshotsDir, 'BRAPP-16-ac-1.png'), fullPage: true });
  });

  test('User clicks the "Edit" button on a previously sent SDD message after the bot has restarted ╬ô├Ñ├å The bot sends a follow-up message prompting for updated SDD details.', async ({ page }) => {
    const editButton = page.getByRole('button', { name: /edit|editar/i });
    
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await expect(editButton).toBeEnabled();
    await editButton.click();
    await expect(page.getByText(/updated sdd details|atualizar detalhes/i)).toBeVisible();

    await page.screenshot({ path: path.join(screenshotsDir, 'BRAPP ' + '16-ac-2.png'), fullPage: true });
  });

  test('User clicks the "Cancel" button on a previously sent SDD message after the bot has restarted ╬ô├Ñ├å The SDD message updates to indicate cancellation.', async ({ page }) => {
    const cancelButton = page.getByRole('button', { name: /cancel|cancelar/i });
    
    await expect(cancelButton).toBeVisible({ timeout: 10000 });
    await expect(cancelButton).toBeEnabled();
    await cancelButton.click();
    await expect(page.getByText(/cancelled|cancelado/i)).toBeVisible();

    await page.screenshot({ path: path.join(screenshotsDir, 'BRAPP-16-ac-3.png'), fullPage: true });
  });
});
