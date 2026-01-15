/**
 * FinPulse E2E Tests - Authentication Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page', async ({ page }) => {
    await expect(page).toHaveTitle(/FinPulse/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page.getByRole('heading', { name: /login|sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /submit|sign in|login/i }).click();
    
    // Check for validation message
    await expect(page.getByText(/email|required/i)).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.getByRole('link', { name: /sign up|register|create account/i }).click();
    await expect(page.getByRole('heading', { name: /sign up|register|create/i })).toBeVisible();
  });
});
