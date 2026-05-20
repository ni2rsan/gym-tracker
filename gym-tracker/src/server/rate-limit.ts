import "server-only";

/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-process deployments (Railway).
 *
 * Usage in API routes:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });
 *   if (!limiter.check(userId)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimiterOptions {
  /** Window size in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

export function createRateLimiter({ windowMs, max }: RateLimiterOptions) {
  const store = new Map<string, Entry>();

  // Periodic cleanup every 60s to prevent memory leaks
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 60_000);

  // Allow GC to clean up the interval when the module is unloaded
  if (cleanup.unref) cleanup.unref();

  return {
    /**
     * Returns true if the request is allowed, false if rate-limited.
     */
    check(key: string): boolean {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (entry.count >= max) return false;

      entry.count++;
      return true;
    },
  };
}
