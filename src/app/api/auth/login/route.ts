import { NextResponse } from "next/server";
import { sanitizeInput, stripCrlf } from "@/lib/admin-types";
import {
  clearServerRateLimits,
  createAdminSessionRecord,
  createTwoFactorChallenge,
  getServerRateLimit,
  getServerSettings,
  recordServerFailedLogin,
  setSessionCookieOnResponse,
  verifyTwoFactorChallenge,
} from "@/lib/server/auth";
import { DUMMY_PASSWORD_HASH, getClientIp, sha256Hex, verifyPassword } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";
import { verifyTotpCode } from "@/lib/server/totp";

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = await getServerRateLimit(`ip:${ip}`);
    return NextResponse.json(rate, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Rate limit query failed:", err);
    return NextResponse.json({ isLocked: false, remainingSeconds: 0, attempts: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipKey = `ip:${ip}`;
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      remember?: boolean;
      challengeToken?: string;
      totpCode?: string;
    };

    const ipRate = await getServerRateLimit(ipKey);
    if (ipRate.isLocked) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${ipRate.remainingSeconds} seconds.`,
          remainingSeconds: ipRate.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Step 2: 2FA Verification submission
    if (body.challengeToken) {
      const challengeKey = `challenge:${sha256Hex(String(body.challengeToken))}`;
      const challengeRate = await getServerRateLimit(challengeKey);
      if (challengeRate.isLocked) {
        return NextResponse.json(
          { error: "Two-factor challenge locked due to repeated invalid codes. Please sign in again." },
          { status: 429, headers: { "Retry-After": String(challengeRate.remainingSeconds) } }
        );
      }

      const challenge = verifyTwoFactorChallenge(body.challengeToken);
      if (!challenge) {
        return NextResponse.json(
          { error: "Two-factor challenge expired. Sign in again." },
          { status: 401 }
        );
      }

      const code = typeof body.totpCode === "string" ? body.totpCode.trim() : "";
      if (!code) {
        return NextResponse.json(
          { error: "Please enter the 6-digit code from your authenticator app." },
          { status: 400 }
        );
      }

      const userRes = await dbQuery<{
        id: string;
        email: string;
        name: string;
        role: string;
        email_verified: boolean;
        two_factor_enabled: boolean;
        two_factor_secret: string | null;
      }>(
        "SELECT id, email, name, role, email_verified, two_factor_enabled, two_factor_secret FROM admin_users WHERE id = $1",
        [challenge.adminId]
      );
      const user = userRes.rows[0];
      if (!user || !user.email_verified || !user.two_factor_secret) {
        return NextResponse.json({ error: "Invalid verification request." }, { status: 401 });
      }

      if (!verifyTotpCode(user.two_factor_secret, code)) {
        const fail = await recordServerFailedLogin(ipKey, ip);
        await recordServerFailedLogin(challengeKey, ip);
        return NextResponse.json(
          {
            error: fail.isLocked
              ? `Too many failed attempts. Try again in ${fail.remainingSeconds}s.`
              : `Invalid verification code. ${Math.max(0, 5 - fail.attempts)} attempts remaining.`,
            remainingSeconds: fail.remainingSeconds,
          },
          { status: fail.isLocked ? 429 : 401 }
        );
      }

      await clearServerRateLimits([ipKey, `email:${user.email}`, challengeKey]);
      const session = await createAdminSessionRecord(user.id, challenge.remember);

      await recordAuditLog({
        actor: `${user.name} (${user.role})`,
        category: "Auth",
        action: "Admin Login Verified (2FA)",
        ipAddress: ip,
        details: `Authenticated via password and TOTP two-factor verification.`,
      });

      const res = NextResponse.json({
        ok: true,
        admin: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.email_verified,
          twoFactorEnabled: user.two_factor_enabled,
        },
        session: {
          ttlMinutes: session.ttlMinutes,
          lastActiveAt: Date.now(),
        },
      });
      setSessionCookieOnResponse(res, session.cookieValue, req, session.maxAgeSeconds);
      return res;
    }

    // Step 1: Email & password submission
    const email = stripCrlf(sanitizeInput(body.email || "")).toLowerCase().slice(0, 160);
    const password = typeof body.password === "string" ? body.password : "";
    const remember = Boolean(body.remember);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both your email and password." },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const emailKey = `email:${email}`;
    const emailRate = await getServerRateLimit(emailKey);
    if (emailRate.isLocked) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${emailRate.remainingSeconds} seconds.`,
          remainingSeconds: emailRate.remainingSeconds,
        },
        { status: 429 }
      );
    }

    const userRes = await dbQuery<{
      id: string;
      email: string;
      name: string;
      role: string;
      password_hash: string;
      email_verified: boolean;
      two_factor_enabled: boolean;
      two_factor_secret: string | null;
    }>(
      `SELECT id, email, name, role, password_hash, email_verified, two_factor_enabled, two_factor_secret
       FROM admin_users
       WHERE email = $1`,
      [email]
    );
    const user = userRes.rows[0];
    // Constant-time timing equalization when email does not match any admin row
    const passwordMatches = user
      ? verifyPassword(password, user.password_hash)
      : verifyPassword(password, DUMMY_PASSWORD_HASH) && false;

    if (!user || !passwordMatches) {
      const failIp = await recordServerFailedLogin(ipKey, ip);
      await recordServerFailedLogin(emailKey, ip);
      return NextResponse.json(
        {
          error: failIp.isLocked
            ? `Too many failed attempts. Try again in ${failIp.remainingSeconds}s.`
            : `Invalid email or password. ${Math.max(0, 5 - failIp.attempts)} attempts remaining.`,
          remainingSeconds: failIp.remainingSeconds,
        },
        { status: failIp.isLocked ? 429 : 401 }
      );
    }

    if (!user.email_verified) {
      return NextResponse.json(
        {
          error: "Verify your administrator email link before signing in.",
          needsVerification: true,
        },
        { status: 403 }
      );
    }

    const settings = await getServerSettings();
    const needs2FA = Boolean(
      user.two_factor_enabled && user.two_factor_secret && (settings.twoFactorRequired || user.two_factor_enabled)
    );

    if (needs2FA) {
      const challengeToken = createTwoFactorChallenge(user.id, remember);
      return NextResponse.json({
        requires2FA: true,
        challengeToken,
      });
    }

    await clearServerRateLimits([ipKey, emailKey]);
    const session = await createAdminSessionRecord(user.id, remember);

    await recordAuditLog({
      actor: `${user.name} (${user.role})`,
      category: "Auth",
      action: "Admin Login",
      ipAddress: ip,
      details: `Signed in cleanly (${remember ? "persistent 7d session" : `${session.ttlMinutes}m idle timeout`}).`,
    });

    const res = NextResponse.json({
      ok: true,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled,
      },
      session: {
        ttlMinutes: session.ttlMinutes,
        lastActiveAt: Date.now(),
      },
    });
    setSessionCookieOnResponse(res, session.cookieValue, req, session.maxAgeSeconds);
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Unable to process sign-in." }, { status: 500 });
  }
}
