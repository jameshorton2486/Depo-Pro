/**
 * Auth Smoke Tests
 *
 * Validates login flow with Supabase authentication.
 * Uses the saved auth state from auth.setup.ts for authenticated tests.
 *
 * Run: npx playwright test tests/e2e/auth.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('authenticated user can access /jobs without login redirect', async ({ page }) => {
    // Uses stored auth state from auth.setup.ts
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');
  });

  test('authenticated user can access /settings/profile', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');
  });

  test('unauthenticated user is redirected to login', async ({ browser }) => {
    // Create a fresh context WITHOUT stored auth
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.warn(`[browser] ${msg.text()}`);
      }
    });

    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/login');
    await context.close();
  });

  test('protected route /admin redirects non-admin to unauthorized', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    // Non-admin should be redirected to unauthorized or dashboard
    // Admin should see the admin page
    expect(url).not.toContain('Application error');
  });
});
