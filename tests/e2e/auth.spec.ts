/**
 * Auth Smoke Tests
 * 
 * Purpose: Prove login works end-to-end and cookies persist.
 * 
 * These tests validate:
 * - User can log in successfully
 * - Session cookies are set correctly
 * - Protected routes require authentication
 * - Password reset flow works
 * 
 * Run: npx playwright test tests/e2e/auth.spec.ts
 */

import { test, expect } from '@playwright/test';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Authentication Flow', () => {
  test('user can log in and session persists', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verify Supabase auth cookie is set
    const cookies = await page.context().cookies();
    const supabaseCookie = cookies.find(c =>
      c.name.includes('sb-') && c.name.includes('-auth-token')
    );

    expect(supabaseCookie).toBeTruthy();
    expect(supabaseCookie?.value).toBeTruthy();
  });

  test('protected route redirects to login when not authenticated', async ({ page }) => {
    // Clear all cookies to simulate logged-out state
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('forgot password flow works', async ({ page }) => {
    await page.goto('/forgot-password');

    // Fill in email
    await page.fill('input[type="email"]', TEST_USER_EMAIL);

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=Check Your Email')).toBeVisible({ timeout: 5000 });
  });

  test('authenticated user cannot access login page', async ({ page }) => {
    // First, log in
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Try to access login page again
    await page.goto('/login');

    // Should redirect back to dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });
});
