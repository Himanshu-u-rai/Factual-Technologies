import { NextResponse } from "next/server";
import {
  clearSessionCookieOnResponse,
  getSessionAdmin,
  revokeSessionByHash,
} from "@/lib/server/auth";
import { getClientIp } from "@/lib/server/crypto";
import { recordAuditLog } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const admin = await getSessionAdmin();
    if (admin) {
      await revokeSessionByHash(admin.tokenHash);
      await recordAuditLog({
        actor: `${admin.name} (${admin.role})`,
        category: "Auth",
        action: "User Logout",
        ipAddress: getClientIp(req),
        details: "Admin session ended and invalidated in database.",
      });
    }
    const res = NextResponse.json({ ok: true });
    clearSessionCookieOnResponse(res, req);
    return res;
  } catch (err) {
    console.error("Logout error:", err);
    const res = NextResponse.json({ ok: true });
    clearSessionCookieOnResponse(res, req);
    return res;
  }
}
