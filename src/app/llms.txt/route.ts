import { NextResponse, connection } from "next/server";
import { buildLlmsSummaryMarkdown } from "@/lib/server/llms-markdown";

export async function GET() {
  await connection();
  const markdown = await buildLlmsSummaryMarkdown();
  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      "X-Robots-Tag": "all",
    },
  });
}
