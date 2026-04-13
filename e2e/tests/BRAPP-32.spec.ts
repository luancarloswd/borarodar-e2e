import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

test.describe('BRAPP-32: Azure Application Insights Instrumentation — Borarodar Backend & Frontend', () => {
  test.beforeAll(() => {
    mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://ride.borarodar.app');
    // Look for login form — email + password fields, submit button
    const emailField = page.getByLabel('Email');
    const passwordField = page.getByLabel('Password');
    const submitButton = page.getByRole('button', { name: 'Log in' });
    
    // Fill credentials and submit
    await emailField.fill('test@borarodar.app');
    await passwordField.fill('borarodarapp');
    await submitButton.click();
    
    // Wait for dashboard/home to load - use a more reliable wait
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Additional wait to ensure login is complete
  });

  test('AC1: User navigates from Home to Fuel Supply page → a network request to the Application Insights ingestion endpoint is sent containing a pageView telemetry payload with the new route URL', async ({ page, request }) => {
    // Navigate to Fuel Supply page
    await page.getByRole('link', { name: 'Fuel Supply' }).click();
    
    // Wait for page load and network idle but with timeout
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-32-ac-1.png', fullPage: true });
    
    // Wait for Application Insights request with pageView payload (with timeout)
    const pageViewRequest = await page.waitForRequest(request => {
      return request.url().includes('applicationinsights') && 
             request.postDataJSON()?.name === 'pageView';
    }, { timeout: 10000 }); // 10 second timeout
    
    expect(pageViewRequest.url()).toContain('applicationinsights');
    expect(pageViewRequest.postDataJSON()?.name).toBe('pageView');
    expect(pageViewRequest.postDataJSON()?.properties?.pageType).toBe('FuelSupply');
  });

  test('AC2: User submits the fuel supply form successfully → a network request to the Application Insights endpoint is sent containing a custom event named \'FuelSupplySubmitted\' with ocrUsed property', async ({ page, request }) => {
    // Navigate to Fuel Supply page
    await page.getByRole('link', { name: 'Fuel Supply' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Fill the form
    await page.getByLabel('Liters').fill('10');
    await page.getByLabel('Motorcycle').selectOption('123');
    await page.getByRole('button', { name: 'Log Supply' }).click();
    
    // Wait for form submission and Application Insights event
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-32-ac-2.png', fullPage: true });
    
    // Wait for Application Insights request with custom event (with timeout)
    const customEventRequest = await page.waitForRequest(request => {
      return request.url().includes('applicationinsights') && 
             request.postDataJSON()?.name === 'FuelSupplySubmitted';
    }, { timeout: 10000 }); // 10 second timeout
    
    expect(customEventRequest.url()).toContain('applicationinsights');
    expect(customEventRequest.postDataJSON()?.name).toBe('FuelSupplySubmitted');
    expect(customEventRequest.postDataJSON()?.properties).toHaveProperty('ocrUsed');
  });

  test('AC3: User logs in with valid credentials → a network request to the Application Insights endpoint is sent containing a custom event named \'UserLogin\'', async ({ page, request }) => {
    // Login flow is handled in beforeEach hook, but we need to verify the UserLogin event
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-32-ac-3.png', fullPage: true });
    
    // Wait for Application Insights request with UserLogin event (with timeout)
    const userLoginRequest = await page.waitForRequest(request => {
      return request.url().includes('applicationinsights') && 
             request.postDataJSON()?.name === 'UserLogin';
    }, { timeout: 10000 }); // 10 second timeout
    
    expect(userLoginRequest.url()).toContain('applicationinsights');
    expect(userLoginRequest.postDataJSON()?.name).toBe('UserLogin');
  });

  test('AC4: User triggers a frontend JavaScript error (e.g., navigating to a broken route or simulated render crash) → a network request to the Application Insights endpoint is sent containing an exception telemetry payload with stack trace', async ({ page, request }) => {
    // Navigate to a non-existent route to trigger an error
    await page.goto('https://ride.borarodar.app/broken-route');
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-32-ac-4.png', fullPage: true });
    
    // Wait for Application Insights request with exception telemetry (with timeout)
    const exceptionRequest = await page.waitForRequest(request => {
      return request.url().includes('applicationinsights') && 
             request.postDataJSON()?.name === 'exception';
    }, { timeout: 10000 }); // 10 second timeout
    
    expect(exceptionRequest.url()).toContain('applicationinsights');
    expect(exceptionRequest.postDataJSON()?.name).toBe('exception');
    expect(exceptionRequest.postDataJSON()?.properties).toHaveProperty('stackTrace');
  });

  test('AC5: User loads any page and inspects outgoing fetch requests to the backend API → each request includes a \'traceparent\' header following W3C Trace Context format', async ({ page }) => {
    // Take screenshot for evidence
    await page.screenshot({ path: 'screenshots/BRAPP-32-ac-5.png', fullPage: true });
    
    // Wait for any outgoing API request (with timeout)
    const apiRequest = await page.waitForRequest(request => {
      return request.url().includes('ride.borarodar.app/api');
    }, { timeout: 10000 }); // 10 second timeout
    
    // Verify traceparent header exists and follows W3C format
    const traceparent = apiRequest.headers()['traceparent'];
    expect(traceparent).toBeDefined();
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  });
});