import { test, expect } from '@playwright/test';

/**
 * Prediction flow, end to end.
 *
 * Requires a database with imported cutoff data. The assertions accept
 * either a populated result list or the explicit "no colleges found" state,
 * so the spec verifies that the request round-trips and the UI responds —
 * without depending on which institutes happen to be in the dataset.
 */

test.describe('college prediction flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads the search form', async ({ page }) => {
    await expect(page.locator('#rank-input')).toBeVisible();
    await expect(page.locator('#predict-button')).toBeVisible();
  });

  test('submitting a rank returns a successful prediction response', async ({ page }) => {
    await page.locator('#rank-input').fill('5000');

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/predict') && r.request().method() === 'POST',
      ),
      page.locator('#predict-button').click(),
    ]);

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('results');
    expect(body).toHaveProperty('totalCount');
    expect(body).toHaveProperty('page');
    expect(Array.isArray(body.results)).toBe(true);
  });

  test('renders either results or an explicit empty state', async ({ page }) => {
    await page.locator('#rank-input').fill('5000');
    await page.locator('#predict-button').click();

    await expect(
      page.locator('[data-testid="results-list"], [data-testid="no-results"]'),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('rejects an empty rank without issuing a request', async ({ page }) => {
    let requested = false;
    page.on('request', (r) => {
      if (r.url().includes('/api/predict')) requested = true;
    });

    await page.locator('#predict-button').click();
    await page.waitForTimeout(1_000);

    expect(requested).toBe(false);
  });

  test('serves the JoSAA landing page', async ({ page }) => {
    await page.goto('/josaa-college-predictor');
    await expect(page.locator('body')).toContainText(/JoSAA/i);
  });
});
