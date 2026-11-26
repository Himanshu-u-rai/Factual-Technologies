import { NextResponse } from "next/server";
import { getSessionAdmin, requireAdmin } from "@/lib/server/auth";
import { dbQuery } from "@/lib/server/db";

export async function GET() {
  try {
    const admin = await getSessionAdmin({ touch: false });
    if (!admin) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    const profile = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar:
        admin.name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "AD",
      emailVerified: admin.emailVerified,
      twoFactorEnabled: admin.twoFactorEnabled,
    };

    return NextResponse.json(
      {
        authenticated: true,
        user: profile,
        admin: profile,
        session: {
          createdAt: admin.sessionCreatedAt,
          lastActiveAt: admin.lastActiveAt,
          ttlMinutes: admin.ttlMinutes,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Session read error:", err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: "touch" | "extend";
      minutes?: number;
    };

    const now = Date.now();
    if (body.action === "extend") {
      const minutes = Math.max(5, Math.min(240, Number(body.minutes || auth.admin.ttlMinutes)));
      const newExpires = new Date(now + minutes * 60 * 1000);
      await dbQuery(
        "UPDATE admin_sessions SET last_active_at = NOW(), expires_at = $2 WHERE token_hash = $1",
        [auth.admin.tokenHash, newExpires]
      );
      return NextResponse.json({
        ok: true,
        lastActiveAt: now,
        ttlMinutes: minutes,
        session: { lastActiveAt: now, ttlMinutes: minutes },
      });
    }

    return NextResponse.json({
      ok: true,
      lastActiveAt: auth.admin.lastActiveAt,
      ttlMinutes: auth.admin.ttlMinutes,
      session: {
        lastActiveAt: auth.admin.lastActiveAt,
        ttlMinutes: auth.admin.ttlMinutes,
      },
    });
  } catch (err) {
    console.error("Session extend error:", err);
    return NextResponse.json({ error: "Unable to extend session." }, { status: 500 });
  }
}
