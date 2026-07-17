// Shared fetch wrapper that retries transient Deepgram failures with exponential
// backoff + jitter. Deepgram's batch submit is a fast, callback-based enqueue, so
// retrying it is cheap. Retries are bounded and only cover transient conditions
// (network errors, 408/429/5xx). A double-submit caused by a retry after a lost
// response is harmless here: the second Deepgram job's callback lands after the
// job leaves "processing" and is rejected as a stale callback.

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export interface RetryOptions {
  /** Total attempts including the first. */
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.random() * baseDelayMs;
  return Math.min(maxDelayMs, exponential + jitter);
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) {
    return null;
  }
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 8000;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === maxAttempts) {
        return response;
      }
      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      // Release the connection before sleeping so it can be reused on retry.
      await response.body?.cancel();
      await delay(retryAfterMs ?? backoffDelayMs(attempt, baseDelayMs, maxDelayMs));
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw error;
      }
      await delay(backoffDelayMs(attempt, baseDelayMs, maxDelayMs));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Deepgram request failed after exhausting retries.");
}
