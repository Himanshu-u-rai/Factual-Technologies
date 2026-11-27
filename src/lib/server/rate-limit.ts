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
  const safeMax = Math.max(1, Math.floor(maxRequests));
  const safeWindow = Math.max(1, Math.floor(windowSeconds));

  const res = await dbQuery<{
    attempts: number;
    locked_until: Date | null;
    was_already_locked: boolean;
  }>(
    `INSERT INTO login_rate_limits (key, attempts, locked_until, updated_at)
     VALUES (
       $1,
       1,
       CASE WHEN 1 > $2 THEN NOW() + ($3 * INTERVAL '1 second') ELSE NULL END,
       NOW()
     )
     ON CONFLICT (key) DO UPDATE
       SET attempts = CASE
             WHEN login_rate_limits.locked_until IS NOT NULL AND login_rate_limits.locked_until > NOW()
               THEN login_rate_limits.attempts
             WHEN login_rate_limits.locked_until IS NOT NULL AND login_rate_limits.locked_until <= NOW()
               THEN 1
             WHEN login_rate_limits.updated_at < NOW() - ($3 * INTERVAL '1 second')
               THEN 1
             ELSE login_rate_limits.attempts + 1
           END,
           locked_until = CASE
             WHEN login_rate_limits.locked_until IS NOT NULL AND login_rate_limits.locked_until > NOW()
               THEN login_rate_limits.locked_until
             WHEN (
               CASE
                 WHEN login_rate_limits.locked_until IS NOT NULL AND login_rate_limits.locked_until <= NOW() THEN 1
                 WHEN login_rate_limits.updated_at < NOW() - ($3 * INTERVAL '1 second') THEN 1
                 ELSE login_rate_limits.attempts + 1
               END
             ) > $2 THEN NOW() + ($3 * INTERVAL '1 second')
             ELSE NULL
           END,
           updated_at = CASE
             WHEN login_rate_limits.locked_until IS NOT NULL AND login_rate_limits.locked_until > NOW()
               THEN login_rate_limits.updated_at
             ELSE NOW()
           END
     RETURNING
       attempts,
       locked_until,
       (locked_until IS NOT NULL AND locked_until > NOW()) AS was_already_locked`,
    [key, safeMax, safeWindow]
  );

  const row = res.rows[0];
  if (row?.was_already_locked && row.locked_until) {
    const remainingMs = new Date(row.locked_until).getTime() - Date.now();
    return {
      allowed: false,
      attempts: row.attempts,
      remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
    };
  }

  return {
    allowed: true,
    attempts: row?.attempts ?? 1,
    remainingSeconds: 0,
  };
}
