import { NextResponse } from "next/server";
import { validatePasswordStrength } from "@/lib/admin-types";
import { clearServerRateLimits } from "@/lib/server/auth";
import { getClientIp, hashPassword, sha256Hex } from "@/lib/server/crypto";
import { recordAuditLog, withTransaction } from "@/lib/server/db";
import { enforceFixedWindowRateLimit } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipLimit = await enforceFixedWindowRateLimit(`reset:ip:${ip}`, 10, 900);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: `Too many password reset attempts. Try again in ${ipLimit.remainingSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(ipLimit.remainingSeconds) } }
      );
    }

    const body = (await req.json()) as { token?: string; password?: string };
    const rawToken = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
      return NextResponse.json({ error: "Reset token is invalid or missing." }, { status: 400 });
    }
    const pwdError = validatePasswordStrength(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    const tokenHash = sha256Hex(rawToken);
    const passwordHash = hashPassword(password);

    const updatedUser = await withTransaction(async (client) => {
      const tokenRes = await client.query<{ admin_id: string }>(
        `UPDATE admin_tokens
         SET used_at = NOW()
         WHERE token_hash = $1
           AND purpose = 'reset_password'
           AND used_at IS NULL
           AND expires_at > NOW()
         RETURNING admin_id`,
        [tokenHash]
      );
      const adminId = tokenRes.rows[0]?.admin_id;
      if (!adminId) return null;

      const userRes = await client.query<{ id: string; email: string; name: string }>(
        `UPDATE admin_users
         SET password_hash = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, name`,
        [adminId, passwordHash]
      );

      // Invalidate all existing sessions after password change
      await client.query("DELETE FROM admin_sessions WHERE admin_id = $1", [adminId]);
      return userRes.rows[0] || null;
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has already expired." },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    await clearServerRateLimits([`ip:${ip}`, `email:${updatedUser.email}`]);
    await recordAuditLog({
      actor: `${updatedUser.name} (${updatedUser.email})`,
      category: "Security",
      action: "Admin Password Reset Completed",
      ipAddress: ip,
      details: "Password rotated via single-use token; all prior active sessions revoked.",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
