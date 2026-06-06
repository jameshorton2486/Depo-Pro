export const MEDIA_REFRESH_THROTTLE_MS = 30_000;

export function shouldRefreshMediaUrl(
  lastAttemptAt: number | null,
  now: number,
  throttleMs = MEDIA_REFRESH_THROTTLE_MS,
): boolean {
  if (lastAttemptAt === null) {
    return true;
  }

  return now - lastAttemptAt >= throttleMs;
}
