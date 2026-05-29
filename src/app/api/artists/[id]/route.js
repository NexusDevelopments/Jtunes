import { NextResponse } from "next/server";
import { getArtistById } from "@/lib/api";

export async function GET(_request, { params }) {
  const { id } = await params;
  const result = getArtistById(id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
