import { test, expect } from '@playwright/test';

test.describe('Fleet Compliance Dashboard E2E Workflow', () => {

  test('should load the dashboard and process a clean fleet VIN search', async ({ page }) => {
    // 1. Navigate to the local dashboard [1]
    await page.goto('/');

    // 2. Verify branding elements are present
    await expect(page.locator('h1')).toContainText('RecallLogic');
    
    // 3. Locate the VIN input and fill it with a valid test record
    const vinInput = page.locator('input[placeholder*="Enter VIN"]');
    await expect(vinInput).toBeVisible();
    await vinInput.fill('1FTFW1ED5GXXXXXXX'); 
    
    // 4. Click the search trigger
    await page.click('button:has-text("Check VIN")');

    // 5. Assert the glassmorphic badge displays the correct success state
    const trustBadge = page.locator('.glassmorphic-badge');
    await expect(trustBadge).toBeVisible();
    await expect(trustBadge).toContainText('PASS');
  });

  test('should handle a batch CSV fleet manifest upload', async ({ page }) => {
    // 1. Navigate to the local dashboard [1]
    await page.goto('/');

    // 2. Set up a listener to intercept the browser's native file-picker
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('text=Drag & Drop Fleet Manifest').click();
    const fileChooser = await fileChooserPromise;

    // 3. Upload the sample CSV manifest we generated
    await fileChooser.setFiles('tests/fixtures/clean_fleet.csv');

    // 4. Assert the frontend processes the batch upload successfully
    const successAlert = page.locator('.upload-success-message');
    await expect(successAlert).toBeVisible();
    
    // 5. Verify the aggregated fleet safety score matches expectations
    const fleetScore = page.locator('.fleet-score');
    await expect(fleetScore).toContainText('100');
  });
});