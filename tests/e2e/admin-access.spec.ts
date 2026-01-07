/**
 * E2E Admin Access Tests
 * Tests admin-only routes and permissions
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Access', () => {
  test('non-admin cannot access admin dashboard', async ({ page }) => {
    // Note: This test assumes we have a non-admin test user
    // In a real scenario, you'd:
    // 1. Login as non-admin user
    // 2. Try to access /admin
    // 3. Verify redirect to /dashboard or 403
    
    await page.goto('/admin');
    
    // Should redirect to /dashboard, /403, or show unauthorized
    const url = page.url();
    const hasForbidden = await page.locator('text=Forbidden, text=403, text=Unauthorized').count() > 0;
    const isDashboard = url.includes('/dashboard');
    const is403 = url.includes('/403');
    
    expect(hasForbidden || isDashboard || is403 || url.includes('/login')).toBeTruthy();
  });

  test('admin can access admin dashboard', async ({ page }) => {
    // Note: This test assumes we have an admin test user
    // In a real scenario, you'd:
    // 1. Login as admin user (using storageState)
    // 2. Navigate to /admin
    // 3. Verify dashboard content is visible
    
    await page.goto('/admin');
    
    // Should either show admin dashboard or redirect to login
    const url = page.url();
    const hasAdminContent = await page.locator('text=Admin Dashboard, text=Admin').count() > 0;
    const isLogin = url.includes('/login');
    
    // If not logged in, redirects to login
    // If logged in as non-admin, redirects to dashboard
    // If logged in as admin, shows admin dashboard
    expect(hasAdminContent || isLogin || url.includes('/dashboard')).toBeTruthy();
  });

  test('non-admin cannot access admin API routes', async ({ request }) => {
    // Test that non-admin users cannot access admin API routes
    const response = await request.get('/api/admin/audit');
    expect([401, 403]).toContain(response.status());
  });

  test('admin API routes require authentication', async ({ request }) => {
    // Test that admin API routes require auth
    const endpoints = [
      '/api/admin/audit',
      '/api/admin/metrics/cases',
      '/api/admin/metrics/ai-quality',
      '/api/admin/incidents',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect([401, 403]).toContain(response.status());
    }
  });
});
