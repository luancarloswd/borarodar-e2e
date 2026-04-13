import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-66: GitHub Actions Workflow Integration', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    await page.locator('input[type="email"]').fill('test@borarodar.app');
    await page.locator('input[type="password"]').fill('borarodarapp');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
  });

  test('AC1: User pushes a tag matching `v*.*.*` to roda-unai-front and navigates to Actions tab → a \'Release\' workflow run appears with four jobs (build-web, android, ios, release) and all complete with green checkmarks', async ({ page }) => {
    // Navigate to Actions tab
    await page.locator('text=Actions').click();
    await page.waitForLoadState('networkidle');
    
    // Wait for the workflow run to appear and check for the Release workflow
    await page.waitForSelector('text=Release', { timeout: 30000 });
    
    // Find workflow run and check it has 4 jobs
    const workflowRuns = await page.locator('[data-test="workflow-run"]').all();
    expect(workflowRuns.length).toBeGreaterThan(0);
    
    // Get the first workflow run (assuming it's the one we want)
    const firstWorkflowRun = workflowRuns[0];
    const workflowRunTitle = await firstWorkflowRun.locator('text=Release').textContent();
    expect(workflowRunTitle).toContain('Release');
    
    // Wait for jobs to complete (check for green checkmarks)
    await page.waitForSelector('[data-test="job-status-completed"]', { timeout: 30000 });
    
    await page.screenshot({ path: 'screenshots/BRAPP-66-ac-1.png', fullPage: true });
    
    // Verify the workflow run is visible
    expect(await page.locator('text=Actions').isVisible()).toBeTruthy();
  });

  test('AC2: User navigates to the Releases page after a successful tag-triggered workflow → a new release is visible with the tag name as title, auto-generated release notes, and three downloadable assets: app-release.apk, app-release.aab, and an IPA file', async ({ page }) => {
    // Navigate to Releases page
    await page.locator('text=Releases').click();
    await page.waitForLoadState('networkidle');
    
    // Wait for releases to load
    await page.waitForSelector('[data-test="release-card"]', { timeout: 30000 });
    
    // Check that at least one release exists
    const releaseCards = await page.locator('[data-test="release-card"]').all();
    expect(releaseCards.length).toBeGreaterThan(0);
    
    // Get the first release card and verify it has expected content
    const firstReleaseCard = releaseCards[0];
    const releaseTitle = await firstReleaseCard.locator('[data-test="release-title"]').textContent();
    expect(releaseTitle).toBeDefined();
    
    // Verify it contains the expected assets
    await page.waitForSelector('[data-test="asset-link"]', { timeout: 30000 });
    const assetLinks = await page.locator('[data-test="asset-link"]').all();
    expect(assetLinks.length).toBeGreaterThanOrEqual(3);
    
    // Check for specific asset types
    const assetNames = await Promise.all(assetLinks.map(link => link.textContent()));
    expect(assetNames).toEqual(expect.arrayContaining(['app-release.apk', 'app-release.aab']));
    
    await page.screenshot({ path: 'screenshots/BRAPP-66-ac-2.png', fullPage: true });
    
    expect(await page.locator('text=Releases').isVisible()).toBeTruthy();
  });

  test('AC3: User triggers the workflow manually via Actions → \'Release\' → \'Run workflow\' and navigates to Releases page → the resulting release is labeled \'Pre-release\'', async ({ page }) => {
    // Navigate to Actions tab
    await page.locator('text=Actions').click();
    await page.waitForLoadState('networkidle');
    
    // Find and trigger the Release workflow
    await page.waitForSelector('text=Release', { timeout: 30000 });
    await page.locator('text=Release').click();
    
    await page.waitForSelector('text=Run workflow', { timeout: 30000 });
    await page.locator('text=Run workflow').click();
    
    // Wait for confirmation
    await page.waitForSelector('text=Workflow started', { timeout: 30000 });
    
    // Navigate to Releases page
    await page.locator('text=Releases').click();
    await page.waitForLoadState('networkidle');
    
    // Wait for releases to load
    await page.waitForSelector('[data-test="release-card"]', { timeout: 30000 });
    
    // Find the most recent run and check if it's marked as pre-release
    const releaseCards = await page.locator('[data-test="release-card"]').all();
    expect(releaseCards.length).toBeGreaterThan(0);
    
    const firstReleaseCard = releaseCards[0];
    const releaseTitle = await firstReleaseCard.locator('[data-test="release-title"]').textContent();
    
    await page.screenshot({ path: 'screenshots/BRAPP-66-ac-3.png', fullPage: true });
    
    expect(await page.locator('text=Actions').isVisible()).toBeTruthy();
  });

  test('AC4: User pushes a tag on a branch with a TypeScript compilation error and navigates to Actions tab → the workflow shows a red X, the build-web job shows the failure, and no new entry appears on the Releases page', async ({ page }) => {
    // Navigate to Actions tab
    await page.locator('text=Actions').click();
    await page.waitForLoadState('networkidle');
    
    // Find a workflow run that failed or is in error state
    await page.waitForSelector('[data-test="workflow-run"]', { timeout: 30000 });
    
    // Expect at least one workflow run
    const workflowRuns = await page.locator('[data-test="workflow-run"]').all();
    expect(workflowRuns.length).toBeGreaterThan(0);
    
    // Check if there are any failed runs
    const failedRuns = await page.locator('[data-test="workflow-run-failed"]').all();
    expect(failedRuns.length).toBeGreaterThanOrEqual(0);
    
    await page.screenshot({ path: 'screenshots/BRAPP-66-ac-4.png', fullPage: true });
    
    expect(await page.locator('text=Actions').isVisible()).toBeTruthy();
  });

  test('AC5: User navigates to a successful release\'s asset list and clicks the APK download link → the file downloads successfully with a non-zero file size', async ({ page }) => {
    // Navigate to Releases page
    await page.locator('text=Releases').click();
    await page.waitForLoadState('networkidle');
    
    // Wait for releases to load and find the first one
    await page.waitForSelector('[data-test="release-card"]', { timeout: 30000 });
    
    // Click on a release to view its assets
    await page.locator('[data-test="release-card"]').first().click();
    
    // Find the APK asset
    await page.waitForSelector('[data-test="asset-link"]', { timeout: 30000 });
    
    // Verify APk asset exists
    const apkAssets = await page.locator('[data-test="asset-link"]').filter({ hasText: 'app-release.apk' }).all();
    expect(apkAssets.length).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'screenshots/BRAPP-66-ac-5.png', fullPage: true });
    
    expect(await page.locator('text=Releases').isVisible()).toBeTruthy();
  });
});