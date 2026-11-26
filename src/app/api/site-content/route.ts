import { NextResponse } from "next/server";
import { loadMergedSiteContent } from "@/lib/server/content";

/** Public read-only endpoint returning live studio CMS content and published projects. */
export async function GET() {
  try {
    const content = await loadMergedSiteContent({
      includeUnpublishedProjects: false,
      includeMessages: false,
    });
    return NextResponse.json(
      { content },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Failed to fetch public site content:", err);
    return NextResponse.json(
      { error: "Unable to load site content." },
      { status: 500 }
    );
  }
}
