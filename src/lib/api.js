import { z } from "zod";
import {
  albumById,
  albums,
  artistById,
  artists,
  catalogMetrics,
  genres,
  trackById,
  tracks,
} from "@/lib/catalog";

const listSchema = z.object({
  q: z.string().trim().optional(),
  genre: z.string().trim().optional(),
  artistId: z.string().trim().optional(),
  albumId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const artistListSchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

function enrichTrack(track) {
  const artist = artistById[track.artistId] ?? null;
  const album = albumById[track.albumId] ?? null;
  return {
    ...track,
    artist,
    album,
    source: "youtube",
  };
}

function enrichAlbum(album) {
  const artist = artistById[album.artistId] ?? null;
  const albumTracks = tracks.filter((track) => track.albumId === album.id).map(enrichTrack);
  return {
    ...album,
    artist,
    songs: albumTracks,
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

  const { q, genre, artistId, albumId, limit, offset } = parsed.data;
  const query = q?.toLowerCase();

  let filtered = tracks.filter((track) => {
    const artist = artistById[track.artistId];
    if (!artist) {
      return false;
    }

    const album = albumById[track.albumId];
    const matchesQuery =
      !query ||
      track.title.toLowerCase().includes(query) ||
      artist.name.toLowerCase().includes(query) ||
      track.genre.toLowerCase().includes(query) ||
      (album?.title ?? "").toLowerCase().includes(query);

    const matchesGenre = !genre || track.genre.toLowerCase() === genre.toLowerCase();
    const matchesArtist = !artistId || track.artistId === artistId;
    const matchesAlbum = !albumId || track.albumId === albumId;

    return matchesQuery && matchesGenre && matchesArtist && matchesAlbum;
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
  const track = trackById[id];
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
  const artist = artistById[id];
  if (!artist) {
    return { ok: false, status: 404, error: "Artist not found" };
  }

  const artistAlbums = albums.filter((album) => album.artistId === id).map(enrichAlbum);
  const artistTracks = tracks.filter((track) => track.artistId === id).map(enrichTrack);

  return {
    ok: true,
    status: 200,
    data: {
      ...artist,
      albums: artistAlbums,
      songs: artistTracks,
    },
  };
}

export function getAlbumList(rawParams = {}) {
  const parsed = listSchema.pick({ q: true, artistId: true, limit: true, offset: true }).safeParse(rawParams);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Invalid query parameters",
      details: parsed.error.flatten(),
    };
  }

  const { q, artistId, limit, offset } = parsed.data;
  const query = q?.toLowerCase();

  let filtered = albums.filter((album) => {
    const artist = artistById[album.artistId];
    if (!artist) return false;

    const matchesQuery =
      !query ||
      album.title.toLowerCase().includes(query) ||
      artist.name.toLowerCase().includes(query);
    const matchesArtist = !artistId || album.artistId === artistId;

    return matchesQuery && matchesArtist;
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
      catalogMetrics,
      items: filtered.map(enrichAlbum),
    },
  };
}

export function getAlbumById(id) {
  const album = albumById[id];
  if (!album) {
    return { ok: false, status: 404, error: "Album not found" };
  }

  return {
    ok: true,
    status: 200,
    data: enrichAlbum(album),
  };
}
