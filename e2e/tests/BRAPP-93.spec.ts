import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-93: Fix 400 Error on Accommodation Registration', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    // Using more flexible selectors for login fields
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.fill('input[name="email"]', 'test@borarodar.app');
    await page.fill('input[name="password"]', 'borarodarapp');
    await page.click('button[type="submit"]');
    // Wait for dashboard/home to load
    await page.waitForSelector('nav', { timeout: 10000 });
  });

  test('AC1: User fills out all required fields on RegisterAccommodationPage and clicks Submit → accommodation is created successfully and a success confirmation is displayed', async ({ page }) => {
    // Navigate to registration page
    await page.click('a:has-text("Register Accommodation")');
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill out all required fields
    await page.fill('input[name="name"]', 'Test Accommodation');
    await page.fill('input[name="location.lat"]', '40.7128');
    await page.fill('input[name="location.lon"]', '-74.0060');
    await page.fill('input[name="address.street"]', '123 Test Street');
    await page.fill('input[name="address.city"]', 'New York');
    await page.fill('input[name="address.country"]', 'USA');
    await page.fill('input[name="pricing.price"]', '100');
    await page.selectOption('select[name="type"]', 'HOTEL');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for success confirmation - using more specific selector
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-93-ac-1.png', fullPage: true });
    
    expect(page.url()).toContain('accommodations');
  });

  test('AC2: User submits the registration form with an invalid accommodation type → a descriptive validation error message is shown to the user instead of a generic 400 error', async ({ page }) => {
    // Navigate to registration page
    await page.click('a:has-text("Register Accommodation")');
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill out form with invalid type
    await page.fill('input[name="name"]', 'Test Accommodation');
    await page.fill('input[name="location.lat"]', '40.7128');
    await page.fill('input[name="location.lon"]', '-74.0060');
    await page.fill('input[name="address.street"]', '123 Test Street');
    await page.fill('input[name="address.city"]', 'New York');
    await page.fill('input[name="address.country"]', 'USA');
    await page.fill('input[name="pricing.price"]', '100');
    await page.selectOption('select[name="type"]', 'INVALID_TYPE');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for validation error - using more specific selector
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-93-ac-2.png', fullPage: true });
    
    // Check that error message is displayed
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('Invalid accommodation type');
  });

  test('AC3: User submits the registration form with missing required fields (e.g., name, location) → inline validation errors are displayed for each missing field before submission', async ({ page }) => {
    // Navigate to registration page
    await page.click('a:has-text("Register Accommodation")');
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Click submit without filling any fields
    await page.click('button[type="submit"]');
    
    // Wait for validation errors - using more specific selectors
    await page.waitForSelector('[data-testid="name-error"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="location-error"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-93-ac-3.png', fullPage: true });
    
    // Check that error messages are displayed
    const nameError = await page.textContent('[data-testid="name-error"]');
    expect(nameError).toContain('Name is required');
    
    const locationError = await page.textContent('[data-testid="location-error"]');
    expect(locationError).toContain('Location coordinates are required');
  });

  test('AC4: User submits the registration form with valid lat/lon coordinates → the accommodation is saved with correct location data and the user is redirected to the accommodation details or listing page', async ({ page }) => {
    // Navigate to registration page
    await page.click('a:has-text("Register Accommodation")');
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill out with valid coordinates
    await page.fill('input[name="name"]', 'Test Accommodation');
    await page.fill('input[name="location.lat"]', '40.7128');
    await page.fill('input[name="location.lon"]', '-74.0060');
    await page.fill('input[name="address.street"]', '123 Test Street');
    await page.fill('input[name="address.city"]', 'New York');
    await page.fill('input[name="address.country"]', 'USA');
    await page.fill('input[name="pricing.price"]', '100');
    await page.selectOption('select[name="type"]', 'HOTEL');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for success confirmation and redirect - using more specific selector
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-93-ac-4.png', fullPage: true });
    
    expect(page.url()).toContain('accommodations');
  });

  test('AC5: User submits the registration form with valid pricing information → the newly created accommodation appears in the accommodations list with the correct price displayed', async ({ page }) => {
    // Navigate to registration page
    await page.click('a:has-text("Register Accommodation")');
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill out with valid pricing
    await page.fill('input[name="name"]', 'Test Accommodation');
    await page.fill('input[name="location.lat"]', '40.7128');
    await page.fill('input[name="location.lon"]', '-74.0060');
    await page.fill('input[name="address.street"]', '123 Test Street');
    await page.fill('input[name="address.city"]', 'New York');
    await page.fill('input[name="address.country"]', 'USA');
    await page.fill('input[name="pricing.price"]', '150');
    await page.selectOption('select[name="type"]', 'HOTEL');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for success confirmation
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
    
    // Navigate to accommodations list
    await page.click('a:has-text("Accommodations")');
    await page.waitForSelector('div:has-text("Test Accommodation")', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/BRAPP-93-ac-5.png', fullPage: true });
    
    expect(await page.textContent('div:has-text("Test Accommodation")')).not.toBeNull();
    // More specific selector for price
    const priceElement = await page.$('div:has-text("$150")');
    expect(priceElement).not.toBeNull();
  });
});