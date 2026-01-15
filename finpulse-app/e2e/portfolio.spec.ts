/**
 * FinPulse E2E Tests - Portfolio Management
 */

import { test, expect } from '@playwright/test';

test.describe('Portfolio Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display holdings table', async ({ page }) => {
    // Navigate to portfolio view
    await page.getByRole('tab', { name: /portfolio/i }).click();
    
    // Check for table headers
    await expect(page.getByRole('columnheader', { name: /symbol/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /quantity|shares/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /price|value/i })).toBeVisible();
  });

  test('should open add transaction modal', async ({ page }) => {
    await page.getByRole('tab', { name: /portfolio/i }).click();
    
    // Click add transaction button
    await page.getByRole('button', { name: /add|new|transaction/i }).click();
    
    // Check for modal
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/symbol/i)).toBeVisible();
  });

  test('should calculate portfolio totals', async ({ page }) => {
    await page.getByRole('tab', { name: /portfolio/i }).click();
    
    // Check for total value display
    await expect(page.getByText(/total.*value|portfolio.*value/i)).toBeVisible();
    await expect(page.getByText(/\$[\d,]+/)).toBeVisible();
  });

  test('should show profit/loss indicators', async ({ page }) => {
    await page.getByRole('tab', { name: /portfolio/i }).click();
    
    // Check for P/L indicators (green/red colors or +/- symbols)
    const plIndicator = page.locator('[data-testid="pl-indicator"], .text-green-500, .text-red-500');
    await expect(plIndicator.first()).toBeVisible();
  });

  test('should filter holdings', async ({ page }) => {
    await page.getByRole('tab', { name: /portfolio/i }).click();
    
    // If there's a filter/search input
    const searchInput = page.getByPlaceholder(/search|filter/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('BTC');
      // Should show filtered results
      await expect(page.getByText(/bitcoin/i)).toBeVisible();
    }
  });
});
