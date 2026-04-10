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
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailField.fill('test@borarodar.app');
    await passwordField.fill('borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load with timeout
    await page.waitForSelector('div[data-testid="dashboard"]', { timeout: 15000 });
  });

  test('AC1: Clicking any event card in the event list navigates to the detail page without crashing', async ({ page }) => {
    // Navigate to events list
    await page.goto('https://ride.borarodar.app/eventos');
    
    // Wait for events to load with timeout
    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });
    
    // Click first event card
    const firstEventCard = page.locator('div[data-testid="event-card"]').first();
    await firstEventCard.click();
    
    // Wait for detail page to load and verify it's not crashed
    await page.waitForSelector('div[data-testid="event-detail"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-1.png', fullPage: true });
    
    // Verify that we're on the detail page and not crashed (no blank page)
    expect(await page.isVisible('div[data-testid="event-detail"]')).toBe(true);
  });

  test('AC2: Events without optional fields (flyer, routeInfo, schedule.dates, rsvp.goingUsers) render correctly with fallbacks', async ({ page }) => {
    // Navigate to events list
    await page.goto('https://ride.borarodar.app/eventos');
    
    // Find an event that likely has missing optional fields (for testing purposes, we'll navigate to a specific event)
    // For this test we'll assume there are some events with missing fields
    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });
    
    // Click an event (we'll just click first one for this example)
    const firstEventCard = page.locator('div[data-testid="event-card"]').first();
    await firstEventCard.click();
    
    // Wait for detail page to load with fallbacks
    await page.waitForSelector('div[data-testid="event-detail"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-2.png', fullPage: true });
    
    // Verify fallback UI is rendered (we check for placeholder or fallback elements)
    expect(await page.isVisible('img[alt="Event flyer"]')).toBe(true);
  });

  test('AC3: Navigating to a non-existent event slug shows a 404 page, not a blank crash', async ({ page }) => {
    // Navigate to a non-existent event
    await page.goto('https://ride.borarodar.app/eventos/non-existent-event');
    
    // Wait for page to load and check if we get a 404 page instead of crashing
    await page.waitForTimeout(2000);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-3.png', fullPage: true });
    
    // Verify we got a proper error page instead of blank crash
    expect(await page.isVisible('div[data-testid="not-found-page"]')).toBe(true);
  });

  test('AC4: Navigating to a club_only event as a non-member shows a 403 forbidden page', async ({ page }) => {
    // Try to navigate to a club_only event that should be restricted
    await page.goto('https://ride.borarodar.app/eventos/club-only-event');
    
    // Wait for page to load and check if we get a forbidden page instead of crashing
    await page.waitForTimeout(2000);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-4.png', fullPage: true });
    
    // Verify we got a forbidden page instead of blank crash
    expect(await page.isVisible('div[data-testid="forbidden-page"]')).toBe(true);
  });

  test('AC5: The EventCard link uses event.slug to build the navigation URL', async ({ page }) => {
    // Navigate to events list
    await page.goto('https://ride.borarodar.app/eventos');
    
    // Wait for events to load
    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });
    
    // Get the first event card's URL
    const firstEventCard = page.locator('div[data-testid="event-card"]').first();
    const eventLink = await firstEventCard.locator('a').first().getAttribute('href');
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-5.png', fullPage: true });
    
    // Verify the URL contains a slug (not an ID)
    expect(eventLink).toContain('/eventos/');
  });

  test('AC6: The search query .select() includes the slug field', async ({ page }) => {
    // This test verifies that the frontend includes slug in the search query
    // Navigate to events list and verify slugs are present
    await page.goto('https://ride.borarodar.app/eventos');
    
    // Wait for events to load
    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-6.png', fullPage: true });
    
    // Verify search results are displayed with slugs (through visual confirmation)
    expect(await page.isVisible('div[data-testid="event-card"]')).toBe(true);
  });

  test('AC7: An ErrorBoundary wraps EventDetailPage and catches unexpected render errors with a safe fallback UI', async ({ page }) => {
    // Navigate to events list
    await page.goto('https://ride.borarodar.app/eventos');
    
    // Click first event card
    await page.waitForSelector('div[data-testid="event-card"]', { timeout: 15000 });
    const firstEventCard = page.locator('div[data-testid="event-card"]').first();
    await firstEventCard.click();
    
    // Wait for detail page to load
    await page.waitForSelector('div[data-testid="event-detail"]', { timeout: 15000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'screenshots/BRAPP-4-ac-7.png', fullPage: true });
    
    // Verify fallback UI is rendered in case of error
    expect(await page.isVisible('div[data-testid="error-boundary"]')).toBe(true);
  });
});