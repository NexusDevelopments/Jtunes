import { NextResponse } from "next/server";
import { resolveYouTubeVideo } from "@/lib/youtube";

export async function GET(request) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  const result = await resolveYouTubeVideo(query);
  if (!result?.videoId) {
    return NextResponse.json({ error: "No YouTube video found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      videoId: result.videoId,
      title: result.title,
      channelTitle: result.channelTitle,
      source: result.source,
      query,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    },
  );
}
