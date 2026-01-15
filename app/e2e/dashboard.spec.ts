/**
 * FinPulse E2E Tests - Dashboard
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  // Note: These tests assume a logged-in state
  // In production, you'd set up proper auth fixtures
  
  test.beforeEach(async ({ page }) => {
    // Mock authentication or use test credentials
    await page.goto('/');
  });

  test('should display market ticker', async ({ page }) => {
    await expect(page.locator('[data-testid="market-ticker"]')).toBeVisible();
  });

  test('should display portfolio overview', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Check for portfolio elements
    await expect(page.getByText(/portfolio|holdings/i)).toBeVisible();
  });

  test('should load market data', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for market data to load
    await page.waitForSelector('[data-testid="market-data"]', { timeout: 10000 });
    
    // Check for price displays
    await expect(page.getByText(/\$/)).toBeVisible();
  });

  test('should open AI assistant', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click AI assistant button
    await page.getByRole('button', { name: /ai|assistant|copilot/i }).click();
    
    // Check for AI chat interface
    await expect(page.getByPlaceholder(/ask|message/i)).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click Portfolio tab
    await page.getByRole('tab', { name: /portfolio/i }).click();
    await expect(page.getByText(/holdings/i)).toBeVisible();
    
    // Click Community tab
    await page.getByRole('tab', { name: /community/i }).click();
    await expect(page.getByText(/discussions|posts/i)).toBeVisible();
  });
});
