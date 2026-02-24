// lib/client/fetch-with-retry.ts
// Retry wrapper for critical mutations (correction saves, lock heartbeats)
// Only imported in client components or client-safe code

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Fetch with automatic retry on transient failures.
 *
 * Retries on: network errors, 5xx, 408, 429
 * Does NOT retry on: 400, 401, 403, 404, 409 (client errors are permanent)
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      // Don't retry client errors — they are permanent
      if (response.ok || !opts.retryableStatuses.includes(response.status)) {
        return response;
      }

      // Retryable server error
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      if (attempt < opts.maxRetries) {
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 200,
          opts.maxDelayMs
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (networkError) {
      // Network failure (offline, DNS, etc.)
      lastError = networkError instanceof Error
        ? networkError
        : new Error('Network request failed');

      if (attempt < opts.maxRetries) {
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 200,
          opts.maxDelayMs
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}
