import { NextResponse } from "next/server";
import { getTrackById } from "@/lib/api";

export function GET(_request, { params }) {
  const result = getTrackById(params.id);

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
