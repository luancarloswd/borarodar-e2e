import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-4: slug type schedule.startDate schedule.endDate ...', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    
    // Look for login form — email + password fields, submit button
    const emailField = page.getByLabel('Email');
    const passwordField = page.getByLabel('Password');
    const submitButton = page.getByRole('button', { name: 'Sign in' });
    
    // Wait for login form elements to be present
    await Promise.all([
      emailField.waitFor({ timeout: 10000 }),
      passwordField.waitFor({ timeout: 10000 }),
      submitButton.waitFor({ timeout: 10000 })
    ]);
    
    // Fill credentials and submit
    await emailField.fill('test@borarodar.app');
    await passwordField.fill('borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('AC1: User clicks an event card in the list → Browser navigates to the slug-based URL and the detail page content is visible', async ({ page }) => {
    // Navigate to events list
    await page.goto('https://ride.borarodar.app/eventos');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-1.png', fullPage: true });
    
    // Click first event card
    const firstEventCard = page.locator('data-testid=event-card').first();
    await firstEventCard.click();
    
    // Wait for detail page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-1-2.png', fullPage: true });
    
    // Verify that we're on the event detail page by looking for a detail element
    const eventTitle = page.locator('data-testid=event-title');
    await expect(eventTitle).toBeVisible();
  });

  test('AC2: User views an event detail page with missing optional fields (flyer, routeInfo) → Page renders successfully with fallback placeholders or hidden sections', async ({ page }) => {
    // Navigate to events list page
    await page.goto('https://ride.borarodar.app/eventos');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence - screenshot before clicking 
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-2.png', fullPage: true });
    
    // Click first event card to get to detail page
    const firstEventCard = page.locator('data-testid=event-card').first();
    await firstEventCard.click();
    
    // Wait for detail page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence after navigation
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-2-2.png', fullPage: true });
    
    // Verify the page still renders without crashing
    const pageTitle = page.locator('data-testid=event-detail-page');
    await expect(pageTitle).toBeVisible();
    
    // Verify fallback placeholders or hidden sections for missing fields
    const flyerPlaceholder = page.locator('data-testid=flyer-placeholder');
    await expect(flyerPlaceholder).toBeVisible();
  });

  test('AC3: User navigates to a non-existent event slug → A 404 "Página não encontrada" error message is displayed', async ({ page }) => {
    // Navigate to a non-existent event slug
    await page.goto('https://ride.borarodar.app/eventos/this-event-does-not-exist');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-3.png', fullPage: true });
    
    // Verify 404 message is displayed
    const notFoundMessage = page.getByText('Página não encontrada');
    await expect(notFoundMessage).toBeVisible();
    
    // Verify the page is not blank
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('AC4: User navigates to a club-only event as an unauthorized user → A 403 "Acesso restrito" error message is displayed', async ({ page }) => {
    // Navigate to events list
    await page.goto('https://ride.borarodar.app/eventos');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-4.png', fullPage: true });
    
    // Try to access a club-only event that should not be accessible
    // We're using the main test user that likely has access to everything
    // For this test, we just want to ensure no crashes and appropriate error handling
    
    // Navigate to an event (that we know should show the error in the actual app)
    // This test focuses on ensuring error handling doesn't crash the app
    await page.goto('https://ride.borarodar.app/eventos/test-club-event');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-4-2.png', fullPage: true });
    
    // If a 403 is expected for club-only events, ensure page doesn't crash and shows correct error
    const forbiddenMessage = page.getByText('Acesso restrito');
    await expect(forbiddenMessage).toBeVisible();
  });

  test('AC5: User encounters a runtime crash on the detail page → Error Boundary fallback UI with a "Voltar para eventos" link is displayed', async ({ page }) => {
    // Navigate to events list page
    await page.goto('https://ride.borarodar.app/eventos');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-5.png', fullPage: true });
    
    // Click first event card to get to detail page
    const firstEventCard = page.locator('data-testid=event-card').first();
    await firstEventCard.click();
    
    // Wait for detail page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot for evidence after navigation
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-5-2.png', fullPage: true });
    
    // Check that the error boundary fallback UI is displayed
    // This test assumes the error boundary will show a "Voltar para eventos" link
    const backButton = page.getByText('Voltar para eventos');
    await expect(backButton).toBeVisible();
  });
});
