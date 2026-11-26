import { NextResponse } from "next/server";
import crypto from "crypto";
import { sanitizeInput, stripCrlf, validatePasswordStrength } from "@/lib/admin-types";
import { getSetupState } from "@/lib/server/auth";
import {
  generateOpaqueToken,
  getClientIp,
  hashPassword,
  safeCompareStrings,
} from "@/lib/server/crypto";
import { recordAuditLog, withTransaction } from "@/lib/server/db";
import { getAppOrigin, getSmtpStatus, sendAdminVerificationEmail } from "@/lib/server/mailer";
import { enforceFixedWindowRateLimit } from "@/lib/server/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  try {
    const state = await getSetupState();
    const smtp = getSmtpStatus();
    return NextResponse.json(
      {
        ...state,
        smtpConfigured: smtp.configured,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Failed to read setup state:", err);
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await enforceFixedWindowRateLimit(`setup:ip:${ip}`, 8, 900);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many setup requests. Try again in ${limit.remainingSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(limit.remainingSeconds) } }
      );
    }

    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      setupToken?: string;
    };

    const name = stripCrlf(sanitizeInput(body.name || "")).slice(0, 120);
    const email = stripCrlf(sanitizeInput(body.email || "")).toLowerCase().slice(0, 160);
    const password = typeof body.password === "string" ? body.password : "";
    const providedSetupToken = typeof body.setupToken === "string" ? body.setupToken.trim() : "";

    const requiredToken = (process.env.SETUP_TOKEN || "").trim();
    if (requiredToken && !safeCompareStrings(providedSetupToken, requiredToken)) {
      return NextResponse.json(
        { error: "Invalid bootstrap setup token." },
        { status: 403 }
      );
    }

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Full name must be at least 2 characters." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid work email address." },
        { status: 400 }
      );
    }
    const pwdError = validatePasswordStrength(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const { rawToken, tokenHash } = generateOpaqueToken(32);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const adminId = `admin-${crypto.randomUUID()}`;

    const txResult = await withTransaction(async (client) => {
      // Lock table exclusively so concurrent setup submissions cannot create two admins
      await client.query("LOCK TABLE admin_users IN EXCLUSIVE MODE");
      const verified = await client.query<{ cnt: number }>(
        "SELECT COUNT(*)::int AS cnt FROM admin_users WHERE email_verified = true"
      );
      if ((verified.rows[0]?.cnt ?? 0) > 0) {
        return { locked: true as const };
      }

      // Replace any unverified bootstrap attempt before confirmation completes
      await client.query("DELETE FROM admin_users WHERE email_verified = false");
      await client.query(
        `INSERT INTO admin_users (id, email, name, role, password_hash, email_verified)
         VALUES ($1, $2, $3, 'Super Admin', $4, false)`,
        [adminId, email, name, passwordHash]
      );
      await client.query(
        `INSERT INTO admin_tokens (token_hash, admin_id, purpose, expires_at)
         VALUES ($1, $2, 'verify_email', $3)`,
        [tokenHash, adminId, expiresAt]
      );
      return { locked: false as const };
    });

    if (txResult.locked) {
      return NextResponse.json(
        { error: "Initial administrator setup is already complete." },
        { status: 403 }
      );
    }

    const verifyUrl = `${getAppOrigin(req)}/admin/verify-email?token=${encodeURIComponent(rawToken)}`;
    const emailRes = await sendAdminVerificationEmail(email, name, verifyUrl);

    if (!emailRes.sent) {
      return NextResponse.json(
        { error: emailRes.error || "Failed to send verification email via SMTP." },
        { status: 500 }
      );
    }

    await recordAuditLog({
      actor: `${name} (${email})`,
      category: "Auth",
      action: "Initial Admin Registered",
      ipAddress: getClientIp(req),
      details: `Created pending administrator account awaiting email verification (${emailRes.deliveredVia}).`,
    });

    return NextResponse.json({
      ok: true,
      email,
      deliveredVia: emailRes.deliveredVia,
      ...(emailRes.deliveredVia === "dev_preview" && process.env.NODE_ENV !== "production"
        ? { devVerificationUrl: verifyUrl }
        : {}),
    });
  } catch (err) {
    console.error("Admin setup error:", err);
    return NextResponse.json({ error: "Unable to complete administrator setup." }, { status: 500 });
  }
}
