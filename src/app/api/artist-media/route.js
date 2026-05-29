import { NextResponse } from "next/server";
import { getSpotifyArtistMediaByName } from "@/lib/spotify";

export async function GET(request) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ error: "Missing artist name" }, { status: 400 });
  }

  try {
    const spotify = await getSpotifyArtistMediaByName(name);
    if (spotify?.image) {
      return NextResponse.json(
        {
          thumb: spotify.image,
          logo: "",
          fanart: "",
          spotifyUrl: spotify.externalUrl,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
          },
        },
      );
    }

    const endpoint = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(name)}`;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "AudioDB request failed" }, { status: 502 });
    }

    const payload = await response.json();
    const artist = payload?.artists?.[0];

    return NextResponse.json(
      {
        thumb: artist?.strArtistThumb || "",
        logo: artist?.strArtistLogo || "",
        fanart: artist?.strArtistFanart || "",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Could not fetch artist media" }, { status: 500 });
  }
}
