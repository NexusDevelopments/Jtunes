import { NextResponse } from "next/server";
import { getArtistList } from "@/lib/api";

export function GET() {
  const result = getArtistList();

  return NextResponse.json(result.data, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
