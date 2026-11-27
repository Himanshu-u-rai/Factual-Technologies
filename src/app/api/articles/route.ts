import { NextResponse, connection } from "next/server";
import { loadPublishedArticles } from "@/lib/server/articles";

/** Public read-only endpoint exposing published engineering blog articles. */
export async function GET() {
  await connection();
  const articles = await loadPublishedArticles();
  return NextResponse.json(
    { articles },
    {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
