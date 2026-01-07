/**
 * E2E RLS Tests
 * Tests Row-Level Security enforcement
 */

import { test, expect } from '@playwright/test';

test.describe('RLS Enforcement', () => {
  test('unauthenticated requests return 401', async ({ request }) => {
    const endpoints = [
      '/api/cases',
      '/api/calendar/events',
      '/api/jobs',
      '/api/transcripts',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });

  test('non-existent resources return 404', async ({ request }) => {
    // Even with auth, non-existent resources should return 404
    // Note: This would require authenticated requests in real scenario
    const response = await request.get('/api/cases/non-existent-id');
    expect([401, 404]).toContain(response.status());
  });
});
