import { test, expect } from '@playwright/test';

test.describe('Aegis Command Console E2E Matrix', () => {

  test.beforeEach(async ({ page }) => {
    // Intercept the global metrics call on application mount to guarantee deterministic layout data
    await page.route('**/api/metrics/global', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: {
            total_vins: 25041,
            processed_vins: 25041,
            total_recalls: 480,
            fleet_health_index: 91.2
          }
        })
      });
    });

    // Point this directly to your local Vite application dev server environment context
    await page.goto('http://localhost:5173');
  });

  test('should mount cleanly and populate dashboard telemetry values from the backend', async ({ page }) => {
    // Using flexible regex matches to find dashboard numeric blocks safely
    await expect(page.locator('text=25,041')).toBeVisible();
    await expect(page.locator('text=91.2%')).toBeVisible();
  });

  test('should evaluate a clean telemetry pass if a free manifest under the 10-VIN limit is dropped', async ({ page }) => {
    // Intercept the query router lookups for individual vehicles to return deterministic mocks
    await page.route('**/api/recalls*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]) // Emulating zero threats returned
      });
    });

    // Emulate typing a valid free sandbox payload inside the manual input console loop
    const textarea = page.locator('textarea[placeholder*="Manual Input"]');
    if (!(await textarea.count())) {
      // Fallback for custom code variations
      await page.locator('textarea').first().fill([
        'FORD, TRANSIT-250, 2022',
        'CHEVROLET, BOLT EV, 2021',
        'TOYToyota, Prius, 2020'
      ].join('\n'));
    } else {
      await textarea.fill([
        'FORD, TRANSIT-250, 2022',
        'CHEVROLET, BOLT EV, 2021',
        'TOYToyota, Prius, 2020'
      ].join('\n'));
    }

    // Fire the calculation sweep
    await page.click('button:has-text("Sweep"), button:has-text("Run Safety")');

    // Confirm the clean sweep success banner alerts your user cleanly
    await expect(page.locator('text=Scan Complete: Clean telemetry across all targeted assets.')).toBeVisible();
  });

  test('should trigger the premium glassmorphism paywall popup modal when an 11-car bulk manifest is submitted', async ({ page }) => {
    await page.locator('textarea').first().fill(
      Array.from({ length: 11 }, (_, i) => `FORD, TRANSIT, ${2010 + (i % 15)}`).join('\n')
    );

    await page.click('button:has-text("Sweep"), button:has-text("Run Safety")');

    // Verify the paywall intercept shield triggers immediately
    await expect(page.locator('text=Activate Core Protection')).toBeVisible();

    // Verify that the count logic targets the blocked rows string count exactly
    await expect(page.locator('text=11 active rows')).toBeVisible();

    // Verify calculations: Base $99 + (11 assets * $2.50) = $126.50 using text indicators
    await expect(page.locator('text=$126.50')).toBeVisible();
    await expect(page.locator('text=/.*11 units.*2\\.50.*/i').or(page.locator('text=/.*11 rows.*2\\.50.*/i'))).toBeVisible();
  });

  test('should allow a user to dismiss the pricing modal to adjust their fleet list size constraints', async ({ page }) => {
    await page.locator('textarea').first().fill(
      Array.from({ length: 12 }, () => 'CHEVROLET, BOLT EV, 2021').join('\n')
    );
    
    await page.click('button:has-text("Sweep"), button:has-text("Run Safety")');

    const modal = page.locator('text=Activate Core Protection');
    await expect(modal).toBeVisible();

    // Dismiss via the "Adjust" action button
    await page.click('button:has-text("Adjust")');

    // Confirm that control context is passed back out gracefully
    await expect(modal).not.toBeVisible();
  });
});