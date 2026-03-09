/**
 * Pre-flight summary:
 * - Existing Playwright specs live under tests/e2e and include auth.spec.ts, job-creation.spec.ts, scopist-review.spec.ts, tenant-isolation.spec.ts, rls.spec.ts, and admin-access.spec.ts.
 * - Those files are older smoke/placeholder coverage and several hardcode credentials; this spec uses env-driven scopist credentials only.
 * - The current review route is /jobs/[id]/review and the review UI is backed by ReviewClientNew with a waveform player, SyncedTranscriptViewer, and LowConfidencePanel.
 * - This spec intentionally avoids upload/transcription creation and only validates the pre-seeded completed-job smoke path.
 */

import { test, expect } from '@playwright/test';

const SMOKE_TEST_SCOPIST_EMAIL = process.env.SMOKE_TEST_SCOPIST_EMAIL;
const SMOKE_TEST_SCOPIST_PASSWORD = process.env.SMOKE_TEST_SCOPIST_PASSWORD;
const SMOKE_TEST_JOB_ID = process.env.SMOKE_TEST_JOB_ID;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.PLAYWRIGHT_BASE_URL;

const missingEnv =
  !SMOKE_TEST_SCOPIST_EMAIL ||
  !SMOKE_TEST_SCOPIST_PASSWORD ||
  !SMOKE_TEST_JOB_ID ||
  !NEXT_PUBLIC_APP_URL;

async function gotoApp(page: Parameters<typeof test>[0]['page'], path: string) {
  await page.goto(new URL(path, NEXT_PUBLIC_APP_URL).toString());
}

test.describe.serial('Core deposition smoke flow', () => {
  test.skip(missingEnv, 'Smoke test skipped: SMOKE_TEST_* env vars not configured. See README for setup.');

  test('logs in, reviews a seeded transcript, verifies persistence, and logs out', async ({ page }) => {
    let correctedWordText: string | null = null;

    await gotoApp(page, '/login');
    await page.fill('input[type="email"], input[name="email"]', SMOKE_TEST_SCOPIST_EMAIL!);
    await page.fill('input[type="password"], input[name="password"]', SMOKE_TEST_SCOPIST_PASSWORD!);
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator('body')).not.toContainText(/unauthorized/i);

    await expect(page.locator('h1, [role="heading"]').first()).toContainText(/dashboard|scopist/i, { timeout: 10000 });
    await expect(page.locator('body')).not.toContainText(/500|application error|server error/i);

    await gotoApp(page, `/jobs/${SMOKE_TEST_JOB_ID!}/review`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(new RegExp(`/jobs/${SMOKE_TEST_JOB_ID}/review`), { timeout: 10000 });
    await expect(page.locator('body')).not.toContainText(/404|500|not found/i);

    const playButton = page.getByRole('button', { name: /play/i }).or(page.getByLabel(/play/i)).first();
    await expect(playButton).toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).toContainText(/low confidence words|no low-confidence words found!/i);
    await expect(page.locator('body')).toContainText(/flagged|analytics|exhibits/i);

    await playButton.click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /pause/i }).or(page.getByLabel(/pause/i)).first()).toBeVisible();
    await page.getByRole('button', { name: /pause/i }).or(page.getByLabel(/pause/i)).first().click();

    const pendingCards = page.locator('text=Correct').locator('..').locator('..');
    const hasPending = (await page.getByRole('button', { name: 'Correct' }).count()) > 0;

    if (hasPending) {
      const progressBefore = await page.locator('text=/\\d+ \\/ \\d+ reviewed/').first().textContent();
      const firstTimestamp = page.locator('button').filter({ hasText: /^\d+:\d{2}$/ }).first();
      if (await firstTimestamp.count()) {
        await firstTimestamp.click();
      }

      await page.getByRole('button', { name: 'Correct' }).first().click();
      const input = page.locator('input[placeholder="Enter correction"]').first();
      await input.fill('TestCorrection');
      await page.getByRole('button', { name: 'Save' }).first().click();
      correctedWordText = 'TestCorrection';

      await expect(page.locator('body')).toContainText(/TestCorrection|Corrected to:/i);
      if (progressBefore) {
        await expect(page.locator('text=/\\d+ \\/ \\d+ reviewed/').first()).not.toHaveText(progressBefore);
      }
    } else {
      test.info().annotations.push({
        type: 'info',
        description: 'Smoke test Step 5 skipped — zero flagged words in test job',
      });
      await expect(page.locator('body')).toContainText(/no low-confidence words found!|no words require review/i);
    }

    if (correctedWordText) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toContainText(correctedWordText);
      await expect(page.locator('body')).toContainText(/corrected to:/i);
    }

    const exportTrigger = page.getByRole('button', { name: /export/i }).first();
    await expect(exportTrigger).toBeVisible();
    await exportTrigger.hover();
    await expect(page.locator('text=Word (.docx), text=DOCX, text=.docx').first()).toBeVisible();

    const logoutButton = page.getByRole('button', { name: /logout|sign out/i }).or(page.getByRole('link', { name: /logout|sign out/i })).first();
    if (await logoutButton.count()) {
      await logoutButton.click();
    } else {
      await gotoApp(page, '/login');
    }

    await page.waitForLoadState('networkidle');
    await gotoApp(page, `/jobs/${SMOKE_TEST_JOB_ID!}/review`);
    await expect(page).toHaveURL(/\/login|\/$/);
  });
});
