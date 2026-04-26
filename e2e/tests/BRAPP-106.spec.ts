import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://ride.borarodar.app';
const TEST_EMAIL = 'test@borarodar.app';
const TEST_PASSWORD = 'borarodarapp';

test.describe('BRAPP-106: Fix Diary Entry Add Button Reopens Same Picker for Audio/Video Types', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
  });

  test('AC1: User selects Áudio type and taps add button → audio picker opens (not the photo picker) and an audio file can be selected', async ({ page }) => {
    // Navigate to a diary
    await page.goto(`${BASE_URL}/diaries`);
    await page.waitForSelector('[data-testid="diary-list"]', { timeout: 15000 });
    await page.click('[data-testid="diary-list"] [data-testid="diary-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-detail"]', { timeout: 15000 });

    // Open the add entry modal/form
    await page.click('[data-testid="add-diary-entry-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-entry-form"]', { timeout: 10000 });

    // Select the 'Áudio' type
    await page.click('[data-testid="entry-type-audio"]', { timeout: 10000 });

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-1-before.png', fullPage: true });

    // Tap the primary add/confirm button — must open an audio picker, not a photo picker
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.click('[data-testid="entry-add-button"]', { timeout: 10000 }),
    ]);

    // The file chooser accept attribute must include audio MIME types, not only image/*
    const acceptValue = await fileChooser.element().getAttribute('accept');

    expect(acceptValue).not.toBe('image/*');
    expect(acceptValue).toMatch(/audio/);

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-1-picker.png', fullPage: true });
  });

  test('AC2: User selects an audio file under 25 MB and submits → new diary entry appears in timeline with a working <audio> player', async ({ page }) => {
    await page.goto(`${BASE_URL}/diaries`);
    await page.waitForSelector('[data-testid="diary-list"]', { timeout: 15000 });
    await page.click('[data-testid="diary-list"] [data-testid="diary-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-detail"]', { timeout: 15000 });

    // Count existing entries before adding
    const entriesBefore = await page.locator('[data-testid="diary-entry-item"]').count();

    await page.click('[data-testid="add-diary-entry-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-entry-form"]', { timeout: 10000 });

    // Select 'Áudio' type
    await page.click('[data-testid="entry-type-audio"]', { timeout: 10000 });

    // Trigger picker and supply a test audio file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.click('[data-testid="entry-add-button"]', { timeout: 10000 }),
    ]);

    await fileChooser.setFiles(join(__dirname, '..', 'fixtures', 'test-audio.mp3'));

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-2-uploading.png', fullPage: true });

    // Wait for the new entry to appear in the timeline
    await page.waitForFunction(
      (countBefore: number) => document.querySelectorAll('[data-testid="diary-entry-item"]').length > countBefore,
      entriesBefore,
      { timeout: 30000 },
    );

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-2-after.png', fullPage: true });

    // The new entry must contain an <audio> element with controls
    const audioPlayer = page.locator('[data-testid="diary-entry-item"] audio').last();
    await expect(audioPlayer).toBeVisible({ timeout: 10000 });

    const hasSrc = await audioPlayer.getAttribute('src');
    expect(hasSrc).toBeTruthy();
  });

  test('AC3: User selects Vídeo type, picks an mp4 under 100 MB → new entry appears with <video> player and generated thumbnail', async ({ page }) => {
    await page.goto(`${BASE_URL}/diaries`);
    await page.waitForSelector('[data-testid="diary-list"]', { timeout: 15000 });
    await page.click('[data-testid="diary-list"] [data-testid="diary-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-detail"]', { timeout: 15000 });

    const entriesBefore = await page.locator('[data-testid="diary-entry-item"]').count();

    await page.click('[data-testid="add-diary-entry-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-entry-form"]', { timeout: 10000 });

    // Select 'Vídeo' type
    await page.click('[data-testid="entry-type-video"]', { timeout: 10000 });

    // Verify the file input accepts video MIME types
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.click('[data-testid="entry-add-button"]', { timeout: 10000 }),
    ]);

    const acceptValue = await fileChooser.element().getAttribute('accept');
    expect(acceptValue).toMatch(/video/);
    expect(acceptValue).not.toBe('image/*');

    await fileChooser.setFiles(join(__dirname, '..', 'fixtures', 'test-video.mp4'));

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-3-uploading.png', fullPage: true });

    // Wait for new entry to appear
    await page.waitForFunction(
      (countBefore: number) => document.querySelectorAll('[data-testid="diary-entry-item"]').length > countBefore,
      entriesBefore,
      { timeout: 60000 },
    );

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-3-after.png', fullPage: true });

    // New entry must have a <video> player
    const videoPlayer = page.locator('[data-testid="diary-entry-item"] video').last();
    await expect(videoPlayer).toBeVisible({ timeout: 10000 });

    const videoSrc = await videoPlayer.getAttribute('src');
    expect(videoSrc).toBeTruthy();

    // Thumbnail must be present as poster attribute or a sibling <img>
    const hasPoster = await videoPlayer.getAttribute('poster');
    const hasThumbnailImg = await page
      .locator('[data-testid="diary-entry-item"]:last-child [data-testid="entry-thumbnail"]')
      .isVisible()
      .catch(() => false);

    expect(hasPoster || hasThumbnailImg).toBeTruthy();
  });

  test('AC4: User attempts to upload a 200 MB video → submission is blocked with a clear localized error and no entry is created', async ({ page }) => {
    await page.goto(`${BASE_URL}/diaries`);
    await page.waitForSelector('[data-testid="diary-list"]', { timeout: 15000 });
    await page.click('[data-testid="diary-list"] [data-testid="diary-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-detail"]', { timeout: 15000 });

    const entriesBefore = await page.locator('[data-testid="diary-entry-item"]').count();

    await page.click('[data-testid="add-diary-entry-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-entry-form"]', { timeout: 10000 });

    await page.click('[data-testid="entry-type-video"]', { timeout: 10000 });

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.click('[data-testid="entry-add-button"]', { timeout: 10000 }),
    ]);

    // Provide the oversized test fixture (>100 MB); rejection must occur before any entry is persisted
    await fileChooser.setFiles(join(__dirname, '..', 'fixtures', 'test-video-oversized.mp4'));

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-4-error.png', fullPage: true });

    // A localized error message must be visible
    const errorMessage = page.locator('[data-testid="entry-upload-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    const errorText = await errorMessage.textContent();
    expect(errorText?.trim().length).toBeGreaterThan(0);

    // No new entry must have been created
    const entriesAfter = await page.locator('[data-testid="diary-entry-item"]').count();
    expect(entriesAfter).toBe(entriesBefore);
  });

  test('AC5: User adds a regular photo entry → entry is created and rendered in the timeline with no regression', async ({ page }) => {
    await page.goto(`${BASE_URL}/diaries`);
    await page.waitForSelector('[data-testid="diary-list"]', { timeout: 15000 });
    await page.click('[data-testid="diary-list"] [data-testid="diary-item"]:first-child', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-detail"]', { timeout: 15000 });

    const entriesBefore = await page.locator('[data-testid="diary-entry-item"]').count();

    await page.click('[data-testid="add-diary-entry-button"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="diary-entry-form"]', { timeout: 10000 });

    // Select 'Foto' type (regression check — photo flow must remain intact)
    const photoTypeButton = page.locator('[data-testid="entry-type-photo"]');
    if (await photoTypeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await photoTypeButton.click({ timeout: 10000 });
    }

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.click('[data-testid="entry-add-button"]', { timeout: 10000 }),
    ]);

    // Photo picker must accept image/* MIME types
    const acceptValue = await fileChooser.element().getAttribute('accept');
    expect(acceptValue).toMatch(/image/);

    await fileChooser.setFiles(join(__dirname, '..', 'fixtures', 'test-photo.jpg'));

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-5-uploading.png', fullPage: true });

    // Wait for the new entry to appear
    await page.waitForFunction(
      (countBefore: number) => document.querySelectorAll('[data-testid="diary-entry-item"]').length > countBefore,
      entriesBefore,
      { timeout: 30000 },
    );

    await page.screenshot({ path: 'screenshots/BRAPP-106-ac-5-after.png', fullPage: true });

    // New photo entry must render an <img>
    const photoEntry = page.locator('[data-testid="diary-entry-item"] img').last();
    await expect(photoEntry).toBeVisible({ timeout: 10000 });

    const imgSrc = await photoEntry.getAttribute('src');
    expect(imgSrc).toBeTruthy();
  });
});
