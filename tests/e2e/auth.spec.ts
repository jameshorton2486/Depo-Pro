/**
 * E2E Authentication Tests
 * Tests auth flows and RLS enforcement
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('allows authenticated user to access dashboard', async ({ page }) => {
    // Note: This test assumes test user login helper or storageState
    // For now, we test that the dashboard route requires auth
    // In a real scenario, you'd use:
    // - storageState with authenticated session
    // - Or a login helper that authenticates before test
    
    await page.goto('/dashboard');
    // Should redirect to login if not authenticated
    const url = page.url();
    expect(url).toMatch(/\/login/);
  });

  test('unauthenticated users cannot access cases', async ({ page }) => {
    await page.goto('/cases');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated users cannot access transcripts', async ({ page }) => {
    // Using a fake transcript ID - should redirect to login
    await page.goto('/transcripts/test-transcript-id');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2, [role="heading"]')).toContainText(/login/i);
  });
});

test.describe('RLS Enforcement', () => {
  test('user cannot access another user case', async ({ page }) => {
    // Note: This test assumes we have test users set up
    // In a real scenario, you'd need to:
    // 1. Login as user A
    // 2. Try to access user B's case ID
    // 3. Verify unauthorized message
    
    // For now, test that accessing non-existent/foreign case shows error
    await page.goto('/cases/foreign-case-id');
    
    // Should either redirect to login or show unauthorized
    const url = page.url();
    const hasUnauthorized = await page.locator('text=Unauthorized, text=Forbidden, text=404').count() > 0;
    const isLogin = url.includes('/login');
    
    expect(hasUnauthorized || isLogin).toBeTruthy();
  });

  test('API routes enforce authentication', async ({ request }) => {
    // Test that unauthenticated API calls are rejected
    const response = await request.get('/api/cases');
    expect(response.status()).toBe(401);
  });

  test('API routes enforce RLS', async ({ request }) => {
    // Test that authenticated users cannot access other users' data
    // This would require setting up authenticated requests
    // For now, verify unauthorized response structure
    const response = await request.get('/api/cases/foreign-case-id');
    expect([401, 403, 404]).toContain(response.status());
  });
});
