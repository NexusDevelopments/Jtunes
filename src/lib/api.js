import { z } from "zod";
import { artistById, artists, catalogMetrics, genres, tracks } from "@/lib/catalog";

const listSchema = z.object({
  q: z.string().trim().optional(),
  genre: z.string().trim().optional(),
  artistId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const artistListSchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

function enrichTrack(track) {
  return {
    ...track,
    artist: artistById[track.artistId] ?? null,
    source: "youtube",
  };
}

export function getTrackList(rawParams) {
  const parsed = listSchema.safeParse(rawParams);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Invalid query parameters",
      details: parsed.error.flatten(),
    };
  }

  const { q, genre, artistId, limit, offset } = parsed.data;
  const query = q?.toLowerCase();

  let filtered = tracks.filter((track) => {
    const artist = artistById[track.artistId];
    if (!artist) {
      return false;
    }

    const matchesQuery =
      !query ||
      track.title.toLowerCase().includes(query) ||
      artist.name.toLowerCase().includes(query) ||
      track.genre.toLowerCase().includes(query);

    const matchesGenre = !genre || track.genre.toLowerCase() === genre.toLowerCase();
    const matchesArtist = !artistId || track.artistId === artistId;

    return matchesQuery && matchesGenre && matchesArtist;
  });

  const total = filtered.length;
  filtered = filtered.slice(offset, offset + limit);

  return {
    ok: true,
    status: 200,
    data: {
      total,
      count: filtered.length,
      limit,
      offset,
      genres,
      catalogMetrics,
      items: filtered.map(enrichTrack),
    },
  };
}

export function getTrackById(id) {
  const track = tracks.find((item) => item.id === id);
  if (!track) {
    return { ok: false, status: 404, error: "Track not found" };
  }

  return {
    ok: true,
    status: 200,
    data: enrichTrack(track),
  };
}

export function getArtistList(rawParams = {}) {
  const parsed = artistListSchema.safeParse(rawParams);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Invalid query parameters",
      details: parsed.error.flatten(),
    };
  }

  const { q, limit, offset } = parsed.data;
  const query = q?.toLowerCase();

  let filtered = artists;
  if (query) {
    filtered = artists.filter((artist) => artist.name.toLowerCase().includes(query));
  }

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);

  return {
    ok: true,
    status: 200,
    data: {
      total,
      count: items.length,
      limit,
      offset,
      catalogMetrics,
      items,
    },
  };
}

export function getArtistById(id) {
  const artist = artists.find((item) => item.id === id);
  if (!artist) {
    return { ok: false, status: 404, error: "Artist not found" };
  }

  return {
    ok: true,
    status: 200,
    data: {
      ...artist,
      songs: tracks.filter((track) => track.artistId === id).map(enrichTrack),
    },
  };
}
