import { NextResponse } from "next/server";
import { getTrackList } from "@/lib/api";

export function GET(request) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const result = getTrackList(query);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        details: result.details ?? null,
      },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
