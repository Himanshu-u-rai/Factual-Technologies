import { NextResponse, connection } from "next/server";
import { getOrCreateIndexNowKey } from "@/lib/server/indexnow";

/** Dynamic verification file checked by IndexNow crawlers cleanly against keyLocation. */
export async function GET() {
  await connection();
  try {
    const key = await getOrCreateIndexNowKey();
    return new NextResponse(key, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Robots-Tag": "all",
      },
    });
  } catch {
    return new NextResponse("", { status: 404 });
  }
}
