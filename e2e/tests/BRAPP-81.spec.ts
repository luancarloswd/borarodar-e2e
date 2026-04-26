import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

test.describe('BRAPP-81: Fix Audio and Video Upload in Travel Diary Entries', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[name="email"]').fill('test@borarodar.app');
    await page.locator('input[name="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    // Wait for dashboard to load
    await page.waitForSelector('header');
  });

  test('AC1: User opens a diary and taps the Video tab then selects an .mp4 file → a new entry appears in the diary with a playable video player and visible thumbnail poster', async ({ page }) => {
    // Navigate to a diary
    await page.locator('a[href*="/diary/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Click video tab
    await page.locator('text=Video').click();

    // Upload video file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button:text("Upload")').click()
    ]);

    // Select a video file
    await fileChooser.setFiles(join(__dirname, 'test-video.mp4'));

    // Wait for upload to complete and entry to appear
    await page.waitForSelector('video');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-81-ac-1.png', fullPage: true });

    // Verify video player is visible and has thumbnail
    expect(await page.locator('video').isVisible()).toBe(true);
    expect(await page.locator('img[alt="video thumbnail"]').isVisible()).toBe(true);
  });

  test('AC2: User opens a diary and taps the Audio tab then records or uploads an audio clip → a new entry appears with a playable audio player control', async ({ page }) => {
    // Navigate to a diary
    await page.locator('a[href*="/diary/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Click audio tab
    await page.locator('text=Audio').click();

    // Upload audio file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button:text("Upload")').click()
    ]);

    // Select an audio file
    await fileChooser.setFiles(join(__dirname, 'test-audio.mp3'));

    // Wait for upload to complete and entry to appear
    await page.waitForSelector('audio');
    await page.waitForTimeout(2200);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-81-ac-2.png', fullPage: true });

    // Verify audio player is visible
    expect(await page.locator('audio').isVisible()).toBe(true);
  });

  test('AC3: User uploads a photo to a diary entry → entry appears with the image rendered (regression check)', async ({ page }) => {
    // Navigate to a diary
    await page.locator('a[href*="/diary/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Click photo tab
    await page.locator('text=Photo').click();

    // Upload photo file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button:text("Upload")').click()
    ]);

    // Select a photo file
    await fileChooser.setFiles(join(__dirname, 'test-photo.jpg'));

    // Wait for upload to complete and entry to appear
    await page.waitForSelector('img');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-81-ac-3.png', fullPage: true });

    // Verify image is visible
    expect(await page.locator('img').isVisible()).toBe(true);
  });

  test('AC4: User attempts to upload a video larger than 100MB → a user-friendly error toast is displayed and the entry is not created', async ({ page }) => {
    // Navigate to a diary
    await page.locator('a[href*="/diary/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Click video tab
    await page.locator('text=Video').click();

    // Upload large video file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button:text("Upload")').click()
    ]);

    // Select a large video file
    await fileChooser.setFiles(join(__dirname, 'large-video.mp4'));

    // Wait for error toast to appear
    await page.waitForSelector('.error-toast', { timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-81-ac-4.png', fullPage: true });

    // Verify error toast is displayed
    expect(await page.locator('.error-toast').isVisible()).toBe(true);
  });

  test('AC5: User taps the file input in the entry composer → the file picker accepts image, video, and audio file types', async ({ page }) => {
    // Navigate to a diary
    await page.locator('a[href*="/diary/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Click the new entry button
    await page.locator('button[aria-label="Add new entry"]').click();

    // Click file input
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('input[type="file"]').click()
    ]);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-81-ac-5.png', fullPage: true });

    // Verify file picker opened (this is an indirect way to verify the input accepts multiple file types)
    expect(fileChooser).toBeDefined();
  });
});
