import { test, expect } from '@playwright/test';

test.describe('Fleet Compliance Dashboard E2E Workflow', () => {

  test('should load the dashboard and process a clean fleet VIN search', async ({ page }) => {
    // 1. Navigate to the local dashboard (Base URL resolved from playwright.config.ts)
    await page.goto('/');

    // 2. Verify the branding elements are visible on-screen
    await expect(page.locator('h1')).toContainText('RecallLogic');
    
    // 3. Locate the VIN input and enter a test VIN
    const vinInput = page.locator('input[placeholder*="Enter VIN"]');
    await expect(vinInput).toBeVisible();
    await vinInput.fill('1FTFW1ED5GXXXXXXX'); 
    
    // 4. Click the "Check VIN" search button
    await page.click('button:has-text("Check VIN")');

    // 5. Assert the glassmorphic trust badge renders with a PASS state
    const trustBadge = page.locator('.glassmorphic-badge');
    await expect(trustBadge).toBeVisible();
    await expect(trustBadge).toContainText('PASS');
  });

  test('should handle a batch CSV fleet manifest upload', async ({ page }) => {
    await page.goto('/');

    // 1. Hook into Playwright's native browser file-picker interceptor
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('text=Drag & Drop Fleet Manifest').click();
    const fileChooser = await fileChooserPromise;

    // 2. Upload the 'clean_fleet.csv' file from your fixtures directory
    await fileChooser.setFiles('tests/fixtures/clean_fleet.csv');

    // 3. Assert the frontend processes the upload and displays the success notification
    const successAlert = page.locator('.upload-success-message');
    await expect(successAlert).toBeVisible();
    
    // 4. Verify the overall fleet safety score matches the 100% compliant rate
    const fleetScore = page.locator('.fleet-score');
    await expect(fleetScore).toContainText('100');
  });
});