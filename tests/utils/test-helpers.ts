import { vi } from 'vitest';

// Mock fetch responses
export function mockFetch(response: unknown, options: { ok?: boolean; status?: number } = {}) {
  return vi.fn().mockResolvedValue({
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
  });
}

// Mock Next.js request
export function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>
): Request {
  return new Request('http://localhost:3000/api/test', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Mock authenticated session
export function mockAuthSession(user: { id: string; email: string; role: string }) {
  vi.mock('@/lib/auth', () => ({
    auth: vi.fn().mockResolvedValue({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }),
  }));
}

// Wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Create mock transcription result
export function createMockTranscription() {
  return {
    id: 'trans-123',
    job_id: 'job-123',
    transcript_text: 'Q. What is your name? A. John Doe.',
    words: [
      { word: 'Q.', start: 0, end: 0.5, confidence: 0.99 },
      { word: 'What', start: 0.5, end: 0.8, confidence: 0.95 },
      { word: 'is', start: 0.8, end: 0.9, confidence: 0.98 },
      { word: 'your', start: 0.9, end: 1.1, confidence: 0.75 }, // Low confidence
      { word: 'name?', start: 1.1, end: 1.5, confidence: 0.92 },
    ],
    flagged_segments: [
      { word: 'your', confidence: 0.75, start: 0.9, end: 1.1, context: 'What is your name?' },
    ],
    confidence_score: 0.92,
    status: 'COMPLETED',
  };
}
