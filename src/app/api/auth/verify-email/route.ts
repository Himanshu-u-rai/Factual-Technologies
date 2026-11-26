import { NextResponse } from "next/server";
import { sanitizeInput, stripCrlf } from "@/lib/admin-types";
import { generateOpaqueToken, getClientIp, sha256Hex } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog, withTransaction } from "@/lib/server/db";
import { getAppOrigin, sendAdminVerificationEmail } from "@/lib/server/mailer";
import { enforceFixedWindowRateLimit } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await enforceFixedWindowRateLimit(`verify:ip:${ip}`, 10, 900);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many verification requests. Try again in ${limit.remainingSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(limit.remainingSeconds) } }
      );
    }

    const body = (await req.json()) as { token?: string };
    const rawToken = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
      return NextResponse.json({ error: "Verification token is invalid or missing." }, { status: 400 });
    }

    const tokenHash = sha256Hex(rawToken);
    const result = await withTransaction(async (client) => {
      await client.query("LOCK TABLE admin_users IN EXCLUSIVE MODE");

      const tokenRes = await client.query<{ admin_id: string }>(
        `UPDATE admin_tokens
         SET used_at = NOW()
         WHERE token_hash = $1
           AND purpose = 'verify_email'
           AND used_at IS NULL
           AND expires_at > NOW()
         RETURNING admin_id`,
        [tokenHash]
      );

      const adminId = tokenRes.rows[0]?.admin_id;
      if (!adminId) {
        return null;
      }

      const verifiedAlready = await client.query<{ cnt: number }>(
        "SELECT COUNT(*)::int AS cnt FROM admin_users WHERE email_verified = true AND id <> $1",
        [adminId]
      );
      if ((verifiedAlready.rows[0]?.cnt ?? 0) > 0) {
        return { conflict: true as const };
      }

      const userRes = await client.query<{ email: string; name: string }>(
        `UPDATE admin_users
         SET email_verified = true, updated_at = NOW()
         WHERE id = $1
         RETURNING email, name`,
        [adminId]
      );

      await client.query(
        "DELETE FROM admin_tokens WHERE admin_id = $1 AND purpose = 'verify_email' AND used_at IS NULL",
        [adminId]
      );

      return { conflict: false as const, user: userRes.rows[0] };
    });

    if (!result) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired." },
        { status: 400 }
      );
    }

    if (result.conflict || !result.user) {
      return NextResponse.json(
        { error: "An active administrator account already exists." },
        { status: 403 }
      );
    }

    await recordAuditLog({
      actor: `${result.user.name} (${result.user.email})`,
      category: "Security",
      action: "Admin Email Verified",
      ipAddress: getClientIp(req),
      details: "Completed one-time email verification; /admin/setup permanently locked.",
    });

    return NextResponse.json({
      ok: true,
      email: result.user.email,
      name: result.user.name,
    });
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await enforceFixedWindowRateLimit(`verify_resend:ip:${ip}`, 5, 900);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many resend requests. Try again in ${limit.remainingSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(limit.remainingSeconds) } }
      );
    }

    const body = (await req.json()) as { email?: string };
    const email = stripCrlf(sanitizeInput(body.email || "")).toLowerCase().slice(0, 160);

    const verifiedCheck = await dbQuery<{ cnt: number }>(
      "SELECT COUNT(*)::int AS cnt FROM admin_users WHERE email_verified = true"
    );
    if ((verifiedCheck.rows[0]?.cnt ?? 0) > 0) {
      return NextResponse.json(
        { error: "Administrator setup is already complete." },
        { status: 403 }
      );
    }

    const pendingRes = await dbQuery<{ id: string; email: string; name: string }>(
      email
        ? "SELECT id, email, name FROM admin_users WHERE email = $1 AND email_verified = false LIMIT 1"
        : "SELECT id, email, name FROM admin_users WHERE email_verified = false ORDER BY created_at DESC LIMIT 1",
      email ? [email] : []
    );

    const pending = pendingRes.rows[0];
    if (!pending) {
      return NextResponse.json(
        { error: "No pending administrator account found." },
        { status: 404 }
      );
    }

    const { rawToken, tokenHash } = generateOpaqueToken(32);
    await dbQuery(
      `INSERT INTO admin_tokens (token_hash, admin_id, purpose, expires_at)
       VALUES ($1, $2, 'verify_email', $3)`,
      [tokenHash, pending.id, new Date(Date.now() + 30 * 60 * 1000)]
    );

    const verifyUrl = `${getAppOrigin(req)}/admin/verify-email?token=${encodeURIComponent(rawToken)}`;
    const emailRes = await sendAdminVerificationEmail(pending.email, pending.name, verifyUrl);
    if (!emailRes.sent) {
      return NextResponse.json(
        { error: emailRes.error || "Failed to send verification email." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      email: pending.email,
      deliveredVia: emailRes.deliveredVia,
      ...(emailRes.deliveredVia === "dev_preview" && process.env.NODE_ENV !== "production"
        ? { devVerificationUrl: verifyUrl }
        : {}),
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json({ error: "Unable to resend verification email." }, { status: 500 });
  }
}
