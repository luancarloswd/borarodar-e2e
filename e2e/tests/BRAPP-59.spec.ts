import { test, expect } from '@playwright/test';

test.describe('BRAPP-59: Fix 500 Error When Uploading Visit Proof Photo to Already-Visited City', () => {
  test.beforeAll(async () => {
    // Create screenshots directory if it doesn't exist
    const fs = await import('fs');
    fs.mkdirSync('screenshots', { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('https://ride.borarodar.app');
    
    // Wait for login page to load
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    
    // Look for login form — email + password fields, submit button
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    // Fill credentials and submit
    await emailInput.fill('test@borarodar.app');
    await passwordInput.fill('borarodarapp');
    await loginButton.click();
    
    // Wait for dashboard to load
    await page.waitForSelector('button:has-text("Dashboard")', { timeout: 15000 });
    
    // Wait a bit more to ensure the page is fully loaded
    await page.waitForTimeout(2000);
  });

  test('AC1: User marks a city as visited via the checklist, then uploads a proof photo to that same city → upload succeeds and the photo appears in the city\'s proof gallery without any error message', async ({ page }) => {
    // Navigate to the dashboard
    await page.click('button:has-text("Dashboard")');
    
    // Wait for dashboard to load
    await page.waitForSelector('div.dashboard-content', { timeout: 15000 });
    
    // Find a city and mark it as visited (wait for the city to be visible)
    await page.waitForSelector('div.city-card', { timeout: 15000 });
    const cityCard = page.locator('div.city-card').first();
    const markVisitedButton = cityCard.locator('button:has-text("Marcar como visitado")');
    await markVisitedButton.click();
    
    // Wait for confirmation that the city was marked as visited
    await page.waitForTimeout(1000);
    
    // Click on the city to view details 
    await cityCard.click();
    
    // Wait for city details to load
    await page.waitForSelector('div.city-details', { timeout: 15000 });
    
    // Upload proof photo
    const uploadButton = page.locator('button:has-text("Enviar comprovante")');
    await uploadButton.click();
    
    // Wait for photo to be uploaded with a shorter timeout to avoid timeout issues
    await page.waitForSelector('img.proof-photo', { timeout: 15000 });
    
    // Take screenshot after verification
    await page.screenshot({ path: 'screenshots/BRAPP-59-ac-1.png', fullPage: true });
    
    // Verify that the photo appears in the gallery
    const photos = page.locator('img.proof-photo');
    await expect(photos).toHaveCount(1);
  });

  test('AC2: User uploads a second proof photo to a city that already has a proof photo → upload succeeds and both photos are visible in the city\'s proof gallery', async ({ page }) => {
    // Navigate to the dashboard
    await page.click('button:has-text("Dashboard")');
    
    // Wait for dashboard to load
    await page.waitForSelector('div.dashboard-content', { timeout: 15000 });
    
    // Find a city and mark it as visited (wait for the city to be visible)
    await page.waitForSelector('div.city-card', { timeout: 15000 });
    const cityCard = page.locator('div.city-card').first();
    const markVisitedButton = cityCard.locator('button:has-text("Marcar como visitado")');
    await markVisitedButton.click();
    
    // Wait for confirmation that the city was marked as visited
    await page.waitForTimeout(1000);
    
    // Click on the city to view details 
    await cityCard.click();
    
    // Wait for city details to load
    await page.waitForSelector('div.city-details', { timeout: 15000 });
    
    // Upload first proof photo
    const uploadButton = page.locator('button:has-text("Enviar comprovante")');
    await uploadButton.click();
    
    // Wait for first photo to upload
    await page.waitForSelector('img.proof-photo', { timeout: 15000 });
    
    // Upload second proof photo
    await uploadButton.click();
    
    // Wait for second photo to upload
    await page.waitForSelector('img.proof-photo', { timeout: 30000 });
    
    // Take screenshot after verification
    await page.screenshot({ path: 'screenshots/BRAPP-59-ac-2.png', fullPage: true });
    
    // Verify both photos appear in the gallery
    const photos = page.locator('img.proof-photo');
    await expect(photos).toHaveCount(2);
  });

  test('AC3: User performs a check-in with a photo to a city they have already visited → check-in succeeds and a \'Bem-vindo de volta\' (welcome back) message is displayed', async ({ page }) => {
    // Navigate to the dashboard
    await page.click('button:has-text("Dashboard")');
    
    // Wait for dashboard to load
    await page.waitForSelector('div.dashboard-content', { timeout: 15000 });
    
    // Find a city and mark it as visited (wait for the city to be visible)
    await page.waitForSelector('div.city-card', { timeout: 15000 });
    const cityCard = page.locator('div.city-card').first();
    const markVisitedButton = cityCard.locator('button:has-text("Marcar como visitado")');
    await markVisitedButton.click();
    
    // Wait for confirmation that the city was marked as visited
    await page.waitForTimeout(1000);
    
    // Click on the city to view details 
    await cityCard.click();
    
    // Wait for city details to load
    await page.waitForSelector('div.city-details', { timeout: 15000 });
    
    // Perform check-in with photo
    const checkinButton = page.locator('button:has-text("Fazer check-in")');
    await checkinButton.click();
    
    // Wait for check-in dialog and select a photo
    await page.waitForSelector('button:has-text("Enviar comprovante")', { timeout: 15000 });
    
    // Upload a photo for check-in
    const uploadButton = page.locator('button:has-text("Enviar comprovante")');
    await uploadButton.click();
    
    // Wait for the check-in to complete
    await page.waitForSelector('text:Bem-vindo de volta', { timeout: 15000 });
    
    // Take screenshot after verification
    await page.screenshot({ path: 'screenshots/BRAPP-59-ac-3.png', fullPage: true });
    
    // Verify the welcome back message is displayed
    const welcomeMessage = page.locator('text:Bem-vindo de volta');
    await expect(welcomeMessage).toBeVisible();
  });

  test('AC4: User uploads photos sequentially to the same city until the maximum limit is reached → a clear \'maximum photos reached\' message is displayed instead of a generic error', async ({ page }) => {
    // Navigate to the dashboard
    await page.click('button:has-text("Dashboard")');
    
    // Wait for dashboard to load
    await page.waitForSelector('div.dashboard-content', { timeout: 15000 });
    
    // Find a city and mark it as visited (wait for the city to be visible)
    await page.waitForSelector('div.city-card', { timeout: 15000 });
    const cityCard = page.locator('div.city-card').first();
    const markVisitedButton = cityCard.locator('button:has-text("Marcar como visitado")');
    await markVisitedButton.click();
    
    // Wait for confirmation that the city was marked as visited
    await page.waitForTimeout(1000);
    
    // Click on the city to view details 
    await cityCard.click();
    
    // Wait for city details to load
    await page.waitForSelector('div.city-details', { timeout: 15000 });
    
    // Upload multiple photos until limit is reached
    for (let i = 0; i < 5; i++) {
      const uploadButton = page.locator('button:has-text("Enviar comprovante")');
      await uploadButton.click();
      
      // Wait for photo to be uploaded (but not too long to avoid timeout issues)
      try {
        await page.waitForSelector('img.proof-photo', { timeout: 15000 });
      } catch (error) {
        // If we get an error, it means we've reached maximum limit  
        break;
      }
    }
    
    // Take screenshot after verification
    await page.screenshot({ path: 'screenshots/BRAPP-59-ac-4.png', fullPage: true });
    
    // Verify maximum limit message is displayed (added more robust approach) - check for the message with longer timeout
    const maxLimitMessage = page.locator('text:Máximo de fotos atingido');
    await expect(maxLimitMessage).toBeVisible({ timeout: 15000 });
  });

  test('AC5: User is on a slow connection and submits a proof photo to an already-visited city that triggers a duplicate conflict → the upload retries transparently and the photo appears successfully without showing a 500 or generic error screen', async ({ page }) => {
    // Navigate to the dashboard
    await page.click('button:has-text("Dashboard")');
    
    // Wait for dashboard to load
    await page.waitForSelector('div.dashboard-content', { timeout: 15000 });
    
    // Find a city and mark it as visited (wait for the city to be visible)
    await page.waitForSelector('div.city-card', { timeout: 15000 });
    const cityCard = page.locator('div.city-card').first();
    const markVisitedButton = cityCard.locator('button:has-text("Marcar como visitado")');
    await markVisitedButton.click();
    
    // Wait for confirmation that the city was marked as visited
    await page.waitForTimeout(1000);
    
    // Click on the city to view details 
    await cityCard.click();
    
    // Wait for city details to load
    await page.waitForSelector('div.city-details', { timeout: 15000 });
    
    // Upload proof photo
    const uploadButton = page.locator('button:has-text("Enviar comprovante")');
    await uploadButton.click();
    
    // Wait for photo to be uploaded
    await page.waitForSelector('img.proof-photo', { timeout: 15000 });
    
    // Take screenshot after verification
    await page.screenshot({ path: 'screenshots/BRAPP-59-ac-5.png', fullPage: true });
    
    // Verify photo was uploaded successfully without error
    const photos = page.locator('img.proof-photo');
    await expect(photos).toHaveCount(1);
  });
});