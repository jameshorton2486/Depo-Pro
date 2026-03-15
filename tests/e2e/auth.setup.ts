import { test as setup, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test_admin@depopro.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'test123';

setup('authenticate', async ({ page }) => {
  // Capture console errors for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.warn(`[browser console] ${msg.text()}`);
    }
  });

  // Navigate to login
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);

  // Submit and wait for navigation
  await Promise.all([
    page.waitForURL('**/dashboard/**', { timeout: 30_000 }).catch(() =>
      page.waitForURL('**/reporter/**', { timeout: 10_000 }).catch(() =>
        page.waitForURL('**/admin/**', { timeout: 10_000 }).catch(() =>
          page.waitForURL('**/jobs/**', { timeout: 10_000 })
        )
      )
    ),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForLoadState('networkidle');

  // Verify we left the login page
  const url = page.url();
  expect(url).not.toContain('/login');

  // Save authenticated state for all subsequent tests
  await page.context().storageState({ path: 'tests/.auth/user.json' });
});
