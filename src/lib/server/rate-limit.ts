import "server-only";

import { dbQuery } from "@/lib/server/db";

export interface RateLimitCheck {
  allowed: boolean;
  attempts: number;
  remainingSeconds: number;
}

/**
 * Atomic PostgreSQL fixed-window rate limiter reusing login_rate_limits table cleanly.
 * Automatically resets expired windows and sets locked_until once threshold is exceeded.
 */
export async function enforceFixedWindowRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitCheck> {
  const existing = await dbQuery<{ attempts: number; locked_until: Date | null; updated_at: Date }>(
    "SELECT attempts, locked_until, updated_at FROM login_rate_limits WHERE key = $1",
    [key]
  );

  const nowMs = Date.now();
  const row = existing.rows[0];

  if (row?.locked_until) {
    const lockedUntilMs = new Date(row.locked_until).getTime();
    if (lockedUntilMs > nowMs) {
      return {
        allowed: false,
        attempts: row.attempts,
        remainingSeconds: Math.ceil((lockedUntilMs - nowMs) / 1000),
      };
    }
  }

  const windowExpired =
    !row ||
    (row.locked_until && new Date(row.locked_until).getTime() <= nowMs) ||
    nowMs - new Date(row.updated_at).getTime() > windowSeconds * 1000;

  const nextAttempts = windowExpired ? 1 : row.attempts + 1;
  const lockedUntil =
    nextAttempts > maxRequests ? new Date(nowMs + windowSeconds * 1000) : null;

  await dbQuery(
    `INSERT INTO login_rate_limits (key, attempts, locked_until, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE
       SET attempts = EXCLUDED.attempts,
           locked_until = EXCLUDED.locked_until,
           updated_at = NOW()`,
    [key, nextAttempts, lockedUntil]
  );

  if (lockedUntil) {
    return {
      allowed: false,
      attempts: nextAttempts,
      remainingSeconds: windowSeconds,
    };
  }

  return {
    allowed: true,
    attempts: nextAttempts,
    remainingSeconds: 0,
  };
}
