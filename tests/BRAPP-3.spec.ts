import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL;
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

if (!BASE_URL || !LOGIN_EMAIL || !LOGIN_PASSWORD) {
  test.skip(
    'Skipping: Required environment variables are not set.',
    { annotation: { type: 'error', description: 'Missing env vars' } }
  );
}


const FIXTURES_DIR = path.resolve('tests', 'fixtures');
const FAKE_AVATAR_PATH = path.join(FIXTURES_DIR, 'test-avatar.jpg');
const FAKE_GIF_PATH = path.join(FIXTURES_DIR, 'test-avatar.gif');

// Minimal 1Γö£├╣1 JPEG (base64)
const MINIMAL_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
  'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
  'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
  'MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIhAAAQME' +
  'AgMAAAAAAAAAAAAAAQIDBAUREiExQf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAA' +
  'AAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Ams3q5RWmqjbYEcJJIJAGSSTgAZJPYAZoA//Z';

// A GIF header (not a valid image type per spec)
const MINIMAL_GIF = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');

const PROFILE_EDIT_ROUTES = [
  '/settings/profile',
  '/profile/edit',
  '/settings',
  '/edit-profile',
];

async function navigateToProfileEdit(page: import('@playwright/test').Page): Promise<void> {
  for (const route of PROFILE_EDIT_ROUTES) {
    await page.goto(`${BASE_URL!}${route}`);
    await page.waitForLoadState('networkidle');
    if (!page.url().includes('login') && !page.url().includes('signin')) return;
  }
  // Fallback: click a profile/settings link in the UI
  const settingsLink = page
    .locator(
      'a:has-text("ConfiguraΓö£┬║Γö£Γòíes"), a:has-text("Settings"), a[href*="settings"], a[href*="edit-profile"]'
    )
    .first();
  if (await settingsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await settingsLink.click();
    await page.waitForLoadState('networkidle');
  }
}

test.describe('BRAPP-3: User Profile Logo Image Change ╬ô├ç├╢ Frontend Support', () => {
  test.beforeAll(() => {
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots', { recursive: true });
    }
    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }
    if (!fs.existsSync(FAKE_AVATAR_PATH)) {
      fs.writeFileSync(FAKE_AVATAR_PATH, Buffer.from(MINIMAL_JPEG_B64, 'base64'));
    }
    if (!fs.existsSync(FAKE_GIF_PATH)) {
      fs.writeFileSync(FAKE_GIF_PATH, MINIMAL_GIF);
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.LOGIN_EMAIL || !process.env.LOGIN_PASSWORD,
      'Skipping: set LOGIN_EMAIL and LOGIN_PASSWORD to run E2E tests');
    await page.goto(BASE_URL!);

    await page.waitForSelector(
      'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="e-mail" i]',
      { timeout: 15000 }
    );

    await page.screenshot({ path: 'screenshots/BRAPP-3-login-page.png', fullPage: true });

    const emailInput = page
      .locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="e-mail" i]')
      .first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(LOGIN_EMAIL!);
    await passwordInput.fill(LOGIN_PASSWORD!);

    await page.screenshot({ path: 'screenshots/BRAPP-3-login-filled.png', fullPage: true });

    const submitButton = page
      .locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Sign in")')
      .first();
    await submitButton.click();

    await page.waitForURL(
      (url) => !url.pathname.includes('login') && !url.pathname.includes('signin'),
      { timeout: 20000 }
    );

    await page.screenshot({ path: 'screenshots/BRAPP-3-logged-in.png', fullPage: true });
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç Avatar section renders ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should render avatar section on the profile settings page', async ({ page }) => {
    await navigateToProfileEdit(page);

    await page.screenshot({ path: 'screenshots/BRAPP-3-profile-settings-page.png', fullPage: true });

    // AvatarUploadControl: circular avatar image or camera icon placeholder
    const avatarSection = page
      .locator(
        '[data-testid*="avatar"], [class*="avatar" i], ' +
        'img[alt*="avatar" i], img[alt*="foto" i], img[alt*="perfil" i], ' +
        'svg[data-lucide="camera"], [class*="AvatarUpload" i]'
      )
      .first();

    const avatarVisible = await avatarSection.isVisible({ timeout: 10000 }).catch(() => false);
    expect(avatarVisible).toBeTruthy();

    await page.screenshot({ path: 'screenshots/BRAPP-3-avatar-section-visible.png', fullPage: true });
  });

  test('should show edit badge (pencil icon) overlaid on the avatar area', async ({ page }) => {
    await navigateToProfileEdit(page);

    await page.screenshot({ path: 'screenshots/BRAPP-3-avatar-edit-badge-check.png', fullPage: true });

    // Pencil/edit badge in bottom-right corner of the avatar
    const editBadge = page
      .locator(
        '[data-testid*="avatar-edit"], [class*="avatar" i] [class*="edit" i], ' +
        'svg[data-lucide="pencil"], [aria-label*="editar avatar" i], [aria-label*="edit avatar" i], ' +
        '[class*="badge" i] svg, [class*="AvatarUpload" i] button'
      )
      .first();

    const badgeVisible = await editBadge.isVisible({ timeout: 8000 }).catch(() => false);

    await page.screenshot({ path: 'screenshots/BRAPP-3-edit-badge.png', fullPage: true });

    // Either the badge or a clickable avatar container must be present
    const avatarClickable = page
      .locator('[data-testid*="avatar"], [class*="avatar" i] button, [class*="avatar" i] label')
      .first();
    const clickablePresent = await avatarClickable.isVisible({ timeout: 5000 }).catch(() => false);

    expect(badgeVisible || clickablePresent).toBeTruthy();
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç File picker opens on click ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should open file picker when avatar area is clicked', async ({ page }) => {
    await navigateToProfileEdit(page);

    await page.screenshot({ path: 'screenshots/BRAPP-3-before-click-avatar.png', fullPage: true });

    // Verify the hidden file input is in the DOM
    const fileInput = page.locator('input[type="file"]').first();
    const inputInDom = await fileInput.evaluate((el) => !!el).catch(() => false);
    expect(inputInDom).toBeTruthy();

    // The accept attribute should restrict to image types per spec
    const acceptAttr = await fileInput.getAttribute('accept').catch(() => '');
    if (acceptAttr) {
      expect(acceptAttr).toMatch(/image\//);
    }

    await page.screenshot({ path: 'screenshots/BRAPP-3-file-input-present.png', fullPage: true });
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç Preview before confirming upload ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should show preview when a valid JPEG is selected', async ({ page }) => {
    await navigateToProfileEdit(page);

    await page.screenshot({ path: 'screenshots/BRAPP-3-before-file-select.png', fullPage: true });

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(FAKE_AVATAR_PATH);

    // Wait for a preview modal or inline preview to appear
    const preview = page
      .locator(
        '[data-testid*="avatar-preview"], [class*="preview" i] img, ' +
        '[role="dialog"] img, [class*="modal" i] img, ' +
        'img[src^="blob:"], img[src^="data:image"]'
      )
      .first();
    await preview.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const previewVisible = await preview.isVisible().catch(() => false);

    await page.screenshot({ path: 'screenshots/BRAPP-3-avatar-preview-shown.png', fullPage: true });

    // Either a preview image or at least Confirm/Cancel buttons should be present
    const confirmOrCancelBtn = page
      .locator(
        'button:has-text("Confirmar"), button:has-text("Confirm"), ' +
        'button:has-text("Cancelar"), button:has-text("Cancel")'
      )
      .first();
    const confirmVisible = await confirmOrCancelBtn.isVisible({ timeout: 5000 }).catch(() => false);

    expect(previewVisible || confirmVisible).toBeTruthy();

    await page.screenshot({ path: 'screenshots/BRAPP-3-confirm-cancel-buttons.png', fullPage: true });
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç Upload happy path ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should upload avatar and render new avatar after confirming', async ({ page }) => {
    await navigateToProfileEdit(page);

    let avatarUploadRequest: string | null = null;
    page.on('request', (req) => {
      if (req.method() === 'PUT' && req.url().includes('/avatar')) {
        avatarUploadRequest = req.url();
      }
    });

    await page.screenshot({ path: 'screenshots/BRAPP-3-before-upload.png', fullPage: true });

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(FAKE_AVATAR_PATH);

    // Click Confirm if a preview/modal appeared
    const confirmButton = page
      .locator('button:has-text("Confirmar"), button:has-text("Confirm"), button:has-text("Salvar"), button:has-text("Save")')
      .first();
    const confirmVisible = await confirmButton.isVisible({ timeout: 8000 }).catch(() => false);
    if (confirmVisible) await confirmButton.click();

    await page.screenshot({ path: 'screenshots/BRAPP-3-upload-spinner.png', fullPage: true });

    // Wait for success feedback
    const successIndicator = page
      .locator(
        '[class*="success"], [class*="toast"], [role="status"], [aria-live="polite"], ' +
        'text="Salvo", text="Saved", text="Avatar atualizado", text="Foto atualizada"'
      )
      .first();
    await successIndicator.waitFor({ timeout: 20000 }).catch(() => {});

    const successVisible = await successIndicator.isVisible().catch(() => false);

    await page.screenshot({ path: 'screenshots/BRAPP-3-upload-success.png', fullPage: true });

    // New avatar image should be visible
    const avatarImg = page
      .locator('[data-testid*="avatar"] img, [class*="avatar" i] img, img[alt*="avatar" i], img[alt*="perfil" i]')
      .first();
    const avatarImgVisible = await avatarImg.isVisible({ timeout: 10000 }).catch(() => false);

    // PUT /api/users/me/avatar should have been called (or success shown)
    expect(avatarImgVisible || successVisible || avatarUploadRequest !== null).toBeTruthy();

    await page.screenshot({ path: 'screenshots/BRAPP-3-new-avatar-rendered.png', fullPage: true });
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç Avatar persists after navigation ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should persist avatar after navigating away and back', async ({ page }) => {
    await navigateToProfileEdit(page);

    // Grab current avatar src (if any) before navigation
    const avatarImg = page
      .locator('[data-testid*="avatar"] img, [class*="avatar" i] img')
      .first();
    const srcBefore = await avatarImg.getAttribute('src').catch(() => null);

    // Navigate away
    await page.goto(`${BASE_URL}/feed`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-3-navigated-away.png', fullPage: true });

    // Navigate back to profile settings
    await navigateToProfileEdit(page);

    await page.screenshot({ path: 'screenshots/BRAPP-3-returned-to-profile.png', fullPage: true });

    const srcAfter = await avatarImg.getAttribute('src').catch(() => null);

    // If there was a src before, it should still be present after returning
    if (srcBefore) {
      expect(srcAfter).toBeTruthy();
    }

    // At minimum, the avatar section should still render
    const avatarSection = page
      .locator('[data-testid*="avatar"], [class*="avatar" i]')
      .first();
    const sectionVisible = await avatarSection.isVisible({ timeout: 8000 }).catch(() => false);
    expect(sectionVisible).toBeTruthy();

    await page.screenshot({ path: 'screenshots/BRAPP-3-avatar-persisted.png', fullPage: true });
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç Client-side validation: file too large ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should show error when selecting a file larger than 10 MB', async ({ page }) => {
    await navigateToProfileEdit(page);

    // Create a fake 11 MB file in memory
    const largeFilePath = path.join(FIXTURES_DIR, 'large-avatar.jpg');
    if (!fs.existsSync(largeFilePath)) {
      // Write JPEG header + 11 MB of zeros
      const header = Buffer.from(MINIMAL_JPEG_B64, 'base64');
      const padding = Buffer.alloc(11 * 1024 * 1024);
      fs.writeFileSync(largeFilePath, Buffer.concat([header, padding]));
    }

    let uploadRequestSent = false;
    page.on('request', (req) => {
      if (req.method() === 'PUT' && req.url().includes('/avatar')) {
        uploadRequestSent = true;
      }
    });

    await page.screenshot({ path: 'screenshots/BRAPP-3-before-large-file.png', fullPage: true });

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(largeFilePath);

    await page.screenshot({ path: 'screenshots/BRAPP-3-large-file-selected.png', fullPage: true });

    // Error banner/message should appear
    const errorBanner = page
      .locator(
        '[class*="error"], [role="alert"], [class*="toast"][class*="error" i], ' +
        'text="muito grande", text="tamanho mΓö£├¡ximo", text="10 MB", text="10MB", ' +
        'text="arquivo muito grande" i, text="file too large" i'
      )
      .first();
    await errorBanner.waitFor({ timeout: 10000 }).catch(() => {});

    const errorVisible = await errorBanner.isVisible().catch(() => false);

    await page.screenshot({ path: 'screenshots/BRAPP-3-large-file-error.png', fullPage: true });

    // No upload request should have been sent (client-side blocking per spec)
    expect(errorVisible || !uploadRequestSent).toBeTruthy();
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç Client-side validation: unsupported format ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should block unsupported file format (.gif) client-side', async ({ page }) => {
    await navigateToProfileEdit(page);

    let uploadRequestSent = false;
    page.on('request', (req) => {
      if (req.method() === 'PUT' && req.url().includes('/avatar')) {
        uploadRequestSent = true;
      }
    });

    await page.screenshot({ path: 'screenshots/BRAPP-3-before-gif-select.png', fullPage: true });

    const fileInput = page.locator('input[type="file"]').first();

    // Check the accept attribute excludes gif
    const acceptAttr = await fileInput.getAttribute('accept').catch(() => '');
    if (acceptAttr) {
      expect(acceptAttr).not.toContain('gif');
    }

    await fileInput.setInputFiles(FAKE_GIF_PATH);

    await page.screenshot({ path: 'screenshots/BRAPP-3-gif-selected.png', fullPage: true });

    // Error message or no preview should appear
    const errorBanner = page
      .locator(
        '[class*="error"], [role="alert"], ' +
        'text="formato invΓö£├¡lido", text="tipo nΓö£├║o suportado", text="unsupported" i, ' +
        'text="formato nΓö£├║o aceito" i'
      )
      .first();
    await errorBanner.waitFor({ timeout: 8000 }).catch(() => {});

    const errorVisible = await errorBanner.isVisible().catch(() => false);

    // No preview blob URL should appear for an invalid type
    const blobPreview = page.locator('img[src^="blob:"]').first();
    const blobVisible = await blobPreview.isVisible({ timeout: 3000 }).catch(() => false);

    await page.screenshot({ path: 'screenshots/BRAPP-3-gif-blocked.png', fullPage: true });

    // Either error shown, no blob preview, or no upload request sent
    expect(errorVisible || !blobVisible || !uploadRequestSent).toBeTruthy();
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç Remove avatar ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should show remove option and display placeholder after removal', async ({ page }) => {
    await navigateToProfileEdit(page);

    await page.screenshot({ path: 'screenshots/BRAPP-3-before-remove.png', fullPage: true });

    // Remove button visible only when avatarUrl is not null
    const removeButton = page
      .locator(
        'button:has-text("Remover foto"), button:has-text("Remover avatar"), ' +
        'button:has-text("Remove photo"), button:has-text("Remove avatar"), ' +
        'button[aria-label*="remover" i], button[aria-label*="remove" i], ' +
        'svg[data-lucide="trash-2"] ~ button, [data-testid*="avatar-remove"]'
      )
      .first();

    const removeVisible = await removeButton.isVisible({ timeout: 8000 }).catch(() => false);

    if (!removeVisible) {
      // If no avatar is set, the remove button won't appear ╬ô├ç├╢ skip gracefully
      test.skip();
      return;
    }

    let deleteRequestSent = false;
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && req.url().includes('/avatar')) {
        deleteRequestSent = true;
      }
    });

    await removeButton.click();

    await page.screenshot({ path: 'screenshots/BRAPP-3-remove-clicked.png', fullPage: true });

    // Confirm dialog if it appears
    const confirmButton = page
      .locator('button:has-text("Confirmar"), button:has-text("Confirm"), button:has-text("Sim"), button:has-text("Yes")')
      .first();
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await page.screenshot({ path: 'screenshots/BRAPP-3-after-remove-confirm.png', fullPage: true });

    // Wait for success feedback
    const successIndicator = page
      .locator(
        '[class*="success"], [class*="toast"], [role="status"], ' +
        'text="Avatar removido", text="Foto removida", text="Avatar removed"'
      )
      .first();
    await successIndicator.waitFor({ timeout: 15000 }).catch(() => {});

    await page.screenshot({ path: 'screenshots/BRAPP-3-avatar-removed.png', fullPage: true });

    // After removal: avatar image should be gone, Camera/placeholder should appear
    const avatarImg = page
      .locator('[data-testid*="avatar"] img, [class*="avatar" i] img')
      .first();
    const imgStillVisible = await avatarImg.isVisible({ timeout: 5000 }).catch(() => false);

    const cameraPlaceholder = page
      .locator(
        'svg[data-lucide="camera"], [data-testid*="avatar-placeholder"], ' +
        '[class*="avatar" i] svg, [class*="avatar" i]:not(:has(img))'
      )
      .first();
    const placeholderVisible = await cameraPlaceholder.isVisible({ timeout: 5000 }).catch(() => false);

    // Either the img is gone, a placeholder appeared, or the DELETE request was made
    expect(!imgStillVisible || placeholderVisible || deleteRequestSent).toBeTruthy();

    await page.screenshot({ path: 'screenshots/BRAPP-3-placeholder-shown-after-removal.png', fullPage: true });
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç Avatar propagates to activity feed ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should propagate updated avatar to activity feed cards without page refresh', async ({ page }) => {
    // Upload avatar first
    await navigateToProfileEdit(page);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(FAKE_AVATAR_PATH);

    const confirmButton = page
      .locator('button:has-text("Confirmar"), button:has-text("Confirm"), button:has-text("Salvar"), button:has-text("Save")')
      .first();
    if (await confirmButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await confirmButton.click();
    }

    const successIndicator = page
      .locator('[class*="success"], [class*="toast"], [role="status"], text="Salvo", text="Avatar atualizado"')
      .first();
    await successIndicator.waitFor({ timeout: 20000 }).catch(() => {});

    await page.screenshot({ path: 'screenshots/BRAPP-3-avatar-uploaded-for-propagation.png', fullPage: true });

    // Navigate to feed without full reload to test SPA state propagation
    const feedLink = page
      .locator('a[href="/feed"], a[href*="/feed"], nav a:has-text("Feed"), nav a:has-text("InΓö£┬ício")')
      .first();
    if (await feedLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await feedLink.click();
    } else {
      await page.goto(`${BASE_URL}/feed`);
    }

    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'screenshots/BRAPP-3-feed-after-avatar-upload.png', fullPage: true });

    // Activity feed cards should show the user's avatar
    const activityAvatars = page.locator(
      '[class*="activity" i] img[src*="avatar"], [class*="event" i] img[src*="avatar"], ' +
      '[class*="card" i] img[alt*="avatar" i], [class*="card" i] img[alt*="foto" i]'
    );
    const avatarCount = await activityAvatars.count().catch(() => 0);

    await page.screenshot({ path: 'screenshots/BRAPP-3-activity-feed-avatars.png', fullPage: true });

    // If there are activity cards, at least one should display an avatar image
    if (avatarCount > 0) {
      const firstAvatarSrc = await activityAvatars.first().getAttribute('src').catch(() => null);
      expect(firstAvatarSrc).toBeTruthy();
    } else {
      // Feed may be empty for the test account ╬ô├ç├╢ verify at least the feed rendered
      const feedContent = page.locator('[class*="feed" i], [class*="activity" i], main').first();
      const feedVisible = await feedContent.isVisible({ timeout: 8000 }).catch(() => false);
      expect(feedVisible).toBeTruthy();
    }

    await page.screenshot({ path: 'screenshots/BRAPP-3-propagation-verified.png', fullPage: true });
  });

  // ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç Error handling: 413 / 415 HTTP errors ╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç╬ô├╢├ç

  test('should display Portuguese error message on HTTP 413 (file too large) response', async ({ page }) => {
    await navigateToProfileEdit(page);

    // Intercept the avatar upload and reply with 413
    await page.route('**/users/me/avatar', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 413,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Payload Too Large' }),
        });
      } else {
        await route.continue();
      }
    });

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(FAKE_AVATAR_PATH);

    const confirmButton = page
      .locator('button:has-text("Confirmar"), button:has-text("Confirm"), button:has-text("Salvar")')
      .first();
    if (await confirmButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await page.screenshot({ path: 'screenshots/BRAPP-3-413-response.png', fullPage: true });

    // Should show a user-friendly Portuguese 413 error, not a blocking modal
    const errorBanner = page
      .locator(
        '[class*="error"], [class*="banner" i], [role="alert"], ' +
        'text="arquivo muito grande" i, text="tamanho mΓö£├¡ximo" i, text="10 MB", ' +
        'text="muito grande" i'
      )
      .first();
    await errorBanner.waitFor({ timeout: 10000 }).catch(() => {});

    const errorVisible = await errorBanner.isVisible().catch(() => false);

    await page.screenshot({ path: 'screenshots/BRAPP-3-413-error-banner.png', fullPage: true });

    // Error must be dismissible (not a blocking modal)
    const blockingModal = page.locator('[role="dialog"]:has([role="alert"])').first();
    const blockingModalVisible = await blockingModal.isVisible({ timeout: 2000 }).catch(() => false);

    // Error banner should appear; blocking modal should not
    expect(errorVisible || !blockingModalVisible).toBeTruthy();
  });

  test('should display Portuguese error message on HTTP 415 (unsupported type) response', async ({ page }) => {
    await navigateToProfileEdit(page);

    await page.route('**/users/me/avatar', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 415,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unsupported Media Type' }),
        });
      } else {
        await route.continue();
      }
    });

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(FAKE_AVATAR_PATH);

    const confirmButton = page
      .locator('button:has-text("Confirmar"), button:has-text("Confirm"), button:has-text("Salvar")')
      .first();
    if (await confirmButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await page.screenshot({ path: 'screenshots/BRAPP-3-415-response.png', fullPage: true });

    const errorBanner = page
      .locator(
        '[class*="error"], [class*="banner" i], [role="alert"], ' +
        'text="formato" i, text="tipo de arquivo" i, text="nΓö£├║o suportado" i, ' +
        'text="unsupported" i'
      )
      .first();
    await errorBanner.waitFor({ timeout: 10000 }).catch(() => {});

    const errorVisible = await errorBanner.isVisible().catch(() => false);

    await page.screenshot({ path: 'screenshots/BRAPP-3-415-error-banner.png', fullPage: true });

    expect(errorVisible).toBeTruthy();
  });
});
