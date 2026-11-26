import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SystemSettings, INITIAL_SETTINGS } from "@/lib/admin-types";
import {
  SESSION_COOKIE_NAME,
  getSessionSecret,
  signSessionCookieValue,
  verifySessionCookieValue,
} from "@/lib/session-hmac";
import { generateOpaqueToken, sha256Hex } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  sessionCreatedAt: number;
  lastActiveAt: number;
  ttlMinutes: number;
  tokenHash: string;
}

export interface SetupState {
  initialized: boolean;
  setupLocked: boolean;
  hasPendingAdmin: boolean;
  requiresSetupToken: boolean;
}

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_LOCKOUT_SECONDS = 60;

/** Returns whether initial one-time administrator registration is complete or still open. */
export async function getSetupState(): Promise<SetupState> {
  const res = await dbQuery<{ verified_cnt: number; pending_cnt: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE email_verified = true)::int AS verified_cnt,
       COUNT(*) FILTER (WHERE email_verified = false)::int AS pending_cnt
     FROM admin_users`
  );
  const verifiedCnt = res.rows[0]?.verified_cnt ?? 0;
  const pendingCnt = res.rows[0]?.pending_cnt ?? 0;

  return {
    initialized: verifiedCnt > 0,
    setupLocked: verifiedCnt > 0,
    hasPendingAdmin: pendingCnt > 0 && verifiedCnt === 0,
    requiresSetupToken: Boolean((process.env.SETUP_TOKEN || "").trim()),
  };
}

/** Reads system settings from PostgreSQL with safe fallback defaults. */
export async function getServerSettings(): Promise<SystemSettings> {
  const res = await dbQuery<{ data: Partial<SystemSettings> }>(
    "SELECT data FROM system_settings WHERE id = 'default'"
  );
  return { ...INITIAL_SETTINGS, ...(res.rows[0]?.data || {}) };
}

/** Strips sensitive server hashes/plaintext API keys before serializing settings to clients. */
export function sanitizeSettingsForClient(settings: SystemSettings): SystemSettings {
  const legacyPreview =
    settings.apiKey && settings.apiKey.length >= 12
      ? `${settings.apiKey.slice(0, 10)}••••••••${settings.apiKey.slice(-4)}`
      : "";
  return {
    ...settings,
    apiKey: "",
    apiKeyHash: undefined,
    apiKeyPreview: settings.apiKeyPreview || legacyPreview,
  };
}

/** Checks PostgreSQL brute-force rate limit status for the given client IP / email key. */
export async function getServerRateLimit(key: string): Promise<{
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
}> {
  const res = await dbQuery<{ attempts: number; locked_until: Date | null }>(
    "SELECT attempts, locked_until FROM login_rate_limits WHERE key = $1",
    [key]
  );
  const row = res.rows[0];
  if (!row) return { isLocked: false, remainingSeconds: 0, attempts: 0 };

  if (row.locked_until) {
    const remainingMs = new Date(row.locked_until).getTime() - Date.now();
    if (remainingMs > 0) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil(remainingMs / 1000),
        attempts: row.attempts,
      };
    }
    await dbQuery("DELETE FROM login_rate_limits WHERE key = $1", [key]);
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  }

  return { isLocked: false, remainingSeconds: 0, attempts: row.attempts };
}

/** Increments failed login counter in PostgreSQL and locks after threshold. */
export async function recordServerFailedLogin(
  key: string,
  ipAddress: string
): Promise<{ isLocked: boolean; remainingSeconds: number; attempts: number }> {
  const current = await getServerRateLimit(key);
  const attempts = current.attempts + 1;
  const lockedUntil =
    attempts >= RATE_LIMIT_MAX_ATTEMPTS
      ? new Date(Date.now() + RATE_LIMIT_LOCKOUT_SECONDS * 1000)
      : null;

  await dbQuery(
    `INSERT INTO login_rate_limits (key, attempts, locked_until, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE
       SET attempts = EXCLUDED.attempts,
           locked_until = EXCLUDED.locked_until,
           updated_at = NOW()`,
    [key, attempts, lockedUntil]
  );

  if (lockedUntil) {
    await recordAuditLog({
      actor: "Security Engine",
      category: "Security",
      action: "Brute Force Threshold Exceeded",
      ipAddress,
      details: `Sign-in locked for ${RATE_LIMIT_LOCKOUT_SECONDS}s after ${attempts} failed attempts.`,
    });
  }

  return {
    isLocked: Boolean(lockedUntil),
    remainingSeconds: lockedUntil ? RATE_LIMIT_LOCKOUT_SECONDS : 0,
    attempts,
  };
}

/** Clears failed login attempt counters for keys matching a successful sign-in. */
export async function clearServerRateLimits(keys?: string[]): Promise<void> {
  if (!keys || keys.length === 0) {
    await dbQuery("DELETE FROM login_rate_limits");
    return;
  }
  await dbQuery("DELETE FROM login_rate_limits WHERE key = ANY($1::text[])", [keys]);
}

/** Builds a short-lived HMAC-signed 2FA login challenge token (valid 5 minutes). */
export function createTwoFactorChallenge(adminId: string, remember: boolean): string {
  const exp = Date.now() + 5 * 60 * 1000;
  const nonce = crypto.randomBytes(12).toString("hex");
  const payload = Buffer.from(JSON.stringify({ adminId, remember, exp, nonce }), "utf8").toString("base64url");
  const secret = getSessionSecret();
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Verifies and decodes a short-lived 2FA login challenge token. */
export function verifyTwoFactorChallenge(
  challengeToken: string
): { adminId: string; remember: boolean } | null {
  const parts = challengeToken.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const secret = getSessionSecret();
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      adminId: string;
      remember: boolean;
      exp: number;
    };
    if (!data.adminId || typeof data.exp !== "number" || Date.now() > data.exp) {
      return null;
    }
    return { adminId: data.adminId, remember: Boolean(data.remember) };
  } catch {
    return null;
  }
}

/** Creates a persisted session row in PostgreSQL and returns cookie metadata. */
export async function createAdminSessionRecord(
  adminId: string,
  remember: boolean
): Promise<{
  cookieValue: string;
  ttlMinutes: number;
  maxAgeSeconds?: number;
}> {
  const settings = await getServerSettings();
  const ttlMinutes = remember ? 60 * 24 * 7 : Math.max(5, settings.sessionTimeoutMinutes || 30);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const { rawToken, tokenHash } = generateOpaqueToken(32);
  await dbQuery(
    `INSERT INTO admin_sessions (token_hash, admin_id, expires_at, remember_me)
     VALUES ($1, $2, $3, $4)`,
    [tokenHash, adminId, expiresAt, remember]
  );

  // Prune expired sessions opportunistically
  await dbQuery("DELETE FROM admin_sessions WHERE expires_at <= NOW()");

  const cookieValue = await signSessionCookieValue(rawToken);
  return {
    cookieValue,
    ttlMinutes,
    maxAgeSeconds: remember ? ttlMinutes * 60 : undefined,
  };
}

/** Attaches the HttpOnly signed session cookie onto a NextResponse. */
export function setSessionCookieOnResponse(
  res: NextResponse,
  cookieValue: string,
  req: Request,
  maxAgeSeconds?: number
): void {
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https://");

  res.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps,
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {}),
  });
}

/** Clears the HttpOnly session cookie on a NextResponse. */
export function clearSessionCookieOnResponse(res: NextResponse, req: Request): void {
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https://");

  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps,
    maxAge: 0,
  });
}

/** Looks up and validates the current request's authenticated admin from Postgres. */
export async function getSessionAdmin(options?: {
  touch?: boolean;
}): Promise<AuthenticatedAdmin | null> {
  const cookieStore = await cookies();
  const signedValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const rawToken = await verifySessionCookieValue(signedValue);
  if (!rawToken) return null;

  const tokenHash = sha256Hex(rawToken);
  const res = await dbQuery<{
    token_hash: string;
    expires_at: Date;
    last_active_at: Date;
    remember_me: boolean;
    created_at: Date;
    admin_id: string;
    email: string;
    name: string;
    role: string;
    email_verified: boolean;
    two_factor_enabled: boolean;
  }>(
    `SELECT s.token_hash, s.expires_at, s.last_active_at, s.remember_me, s.created_at,
            u.id AS admin_id, u.email, u.name, u.role, u.email_verified, u.two_factor_enabled
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.admin_id
     WHERE s.token_hash = $1`,
    [tokenHash]
  );

  const row = res.rows[0];
  if (!row || !row.email_verified) return null;

  const settings = await getServerSettings();
  const idleTtlMinutes = row.remember_me
    ? 60 * 24 * 7
    : Math.max(5, settings.sessionTimeoutMinutes || 30);

  const now = Date.now();
  const expiresMs = new Date(row.expires_at).getTime();
  const lastActiveMs = new Date(row.last_active_at).getTime();
  const idleLimitMs = idleTtlMinutes * 60 * 1000;

  if (now > expiresMs || now - lastActiveMs > idleLimitMs) {
    await dbQuery("DELETE FROM admin_sessions WHERE token_hash = $1", [tokenHash]);
    return null;
  }

  if (options?.touch) {
    const newExpiry = new Date(now + idleLimitMs);
    await dbQuery(
      "UPDATE admin_sessions SET last_active_at = NOW(), expires_at = $2 WHERE token_hash = $1",
      [tokenHash, newExpiry]
    );
  }

  return {
    id: row.admin_id,
    email: row.email,
    name: row.name,
    role: row.role,
    emailVerified: row.email_verified,
    twoFactorEnabled: row.two_factor_enabled,
    sessionCreatedAt: new Date(row.created_at).getTime(),
    lastActiveAt: options?.touch ? now : lastActiveMs,
    ttlMinutes: idleTtlMinutes,
    tokenHash,
  };
}

/** Enforces authenticated admin session for /api/admin/* route handlers. */
export async function requireAdmin(
  options?: { touch?: boolean }
): Promise<{ admin: AuthenticatedAdmin } | { response: NextResponse }> {
  const admin = await getSessionAdmin(options);
  if (!admin) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { admin };
}

/** Revokes a session token hash cleanly. */
export async function revokeSessionByHash(tokenHash: string): Promise<void> {
  await dbQuery("DELETE FROM admin_sessions WHERE token_hash = $1", [tokenHash]);
}
