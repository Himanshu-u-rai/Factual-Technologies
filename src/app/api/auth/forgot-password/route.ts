import { NextResponse } from "next/server";
import { sanitizeInput, stripCrlf } from "@/lib/admin-types";
import { generateOpaqueToken, getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";
import { getAppOrigin, sendPasswordResetEmail } from "@/lib/server/mailer";
import { enforceFixedWindowRateLimit } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipLimit = await enforceFixedWindowRateLimit(`forgot:ip:${ip}`, 5, 900);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: `Too many reset requests. Try again in ${ipLimit.remainingSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(ipLimit.remainingSeconds) } }
      );
    }

    const body = (await req.json()) as { email?: string };
    const email = stripCrlf(sanitizeInput(body.email || "")).toLowerCase().slice(0, 160);

    if (!email) {
      return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
    }

    const emailLimit = await enforceFixedWindowRateLimit(`forgot:email:${email}`, 3, 900);
    const userRes = emailLimit.allowed
      ? await dbQuery<{ id: string; email: string; name: string; email_verified: boolean }>(
          "SELECT id, email, name, email_verified FROM admin_users WHERE email = $1",
          [email]
        )
      : { rows: [] as { id: string; email: string; name: string; email_verified: boolean }[] };
    const user = userRes.rows[0];

    let devResetUrl: string | undefined;

    if (user && user.email_verified) {
      await dbQuery(
        "DELETE FROM admin_tokens WHERE admin_id = $1 AND purpose = 'reset_password' AND used_at IS NULL",
        [user.id]
      );

      const { rawToken, tokenHash } = generateOpaqueToken(32);
      await dbQuery(
        `INSERT INTO admin_tokens (token_hash, admin_id, purpose, expires_at)
         VALUES ($1, $2, 'reset_password', $3)`,
        [tokenHash, user.id, new Date(Date.now() + 15 * 60 * 1000)]
      );

      const resetUrl = `${getAppOrigin(req)}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;
      const emailRes = await sendPasswordResetEmail(user.email, user.name, resetUrl);

      if (!emailRes.sent) {
        return NextResponse.json(
          { error: emailRes.error || "Unable to send password reset email." },
          { status: 500 }
        );
      }

      if (emailRes.deliveredVia === "dev_preview" && process.env.NODE_ENV !== "production") {
        devResetUrl = resetUrl;
      }

      await recordAuditLog({
        actor: `${user.name} (${user.email})`,
        category: "Security",
        action: "Password Reset Requested",
        ipAddress: getClientIp(req),
        details: `Issued single-use 15-minute password reset link (${emailRes.deliveredVia}).`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "If an account matches that email address, a password reset link has been sent.",
      ...(devResetUrl ? { devResetUrl } : {}),
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Unable to process password reset request." }, { status: 500 });
  }
}
