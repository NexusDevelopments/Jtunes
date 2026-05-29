import { NextResponse } from "next/server";
import { searchFederatedMusic } from "@/lib/providers/federated";

export async function GET(request) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "12");

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  try {
    const data = await searchFederatedMusic(q, { limit });
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Federated search failed" }, { status: 500 });
  }
}
