import { test, expect } from '@playwright/test';

test.describe('Fleet Compliance Dashboard E2E Workflow', () => {

  test('should load the dashboard and process a clean fleet VIN search', async ({ page }) => {
    // 1. Navigate to the local dashboard (Base URL resolved from playwright.config.ts) [cite: 2]
    await page.goto('/');

    // 2. Verify the landing elements are fully visible and styled
    await expect(page.locator('h1')).toContainText('RecallLogic');
    
    // 3. Simulate entering a known clean VIN from your database
    const vinInput = page.locator('input[placeholder*="Enter VIN"]');
    await expect(vinInput).toBeVisible();
    await vinInput.fill('1FTFW1ED5GXXXXXXX'); // Replace with a valid test VIN from your Supabase setup
    await page.click('button:has-text("Check VIN")');

    // 4. Assert the glassmorphic trust badge renders with a PASS state
    const trustBadge = page.locator('.glassmorphic-badge');
    await expect(trustBadge).toBeVisible();
    await expect(trustBadge).toContainText('PASS');
  });

  test('should handle a batch CSV fleet manifest upload', async ({ page }) => {
    await page.goto('/');

    // 1. Target the file input inside your drag-and-drop dropzone
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('text=Drag & Drop Fleet Manifest').click();
    const fileChooser = await fileChooserPromise;

    // 2. Upload a sample CSV file
    // (Ensure you have a mock/clean CSV inside a 'tests/fixtures' folder)
    await fileChooser.setFiles('tests/fixtures/clean_fleet.csv');

    // 3. Assert the batch progress indicator completes and shows 100% safe status
    const uploadSuccess = page.locator('.upload-success-message');
    await expect(uploadSuccess).toBeVisible();
    await expect(page.locator('.fleet-score')).toContainText('100');
  });
});
