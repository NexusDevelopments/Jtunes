import { z } from "zod";
import {
  RAP_VIRTUAL_GENRES,
  VIRTUAL_ARTIST_COUNT,
  VIRTUAL_TRACK_COUNT,
  artistById,
  artists,
  makeVirtualArtist,
  makeVirtualTrack,
  parseVirtualArtistId,
  parseVirtualTrackId,
  tracks,
} from "@/lib/catalog";

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

const TOTAL_TRACKS = tracks.length + VIRTUAL_TRACK_COUNT;
const TOTAL_ARTISTS = artists.length + VIRTUAL_ARTIST_COUNT;

function getArtistByIdInternal(id) {
  const realArtist = artistById[id];
  if (realArtist) {
    return realArtist;
  }

  const virtualIndex = parseVirtualArtistId(id);
  if (virtualIndex === null) {
    return null;
  }

  return makeVirtualArtist(virtualIndex);
}

function getTrackAt(globalIndex) {
  if (globalIndex < tracks.length) {
    return tracks[globalIndex];
  }

  const virtualIndex = globalIndex - tracks.length;
  if (virtualIndex < 0 || virtualIndex >= VIRTUAL_TRACK_COUNT) {
    return null;
  }

  return makeVirtualTrack(virtualIndex);
}

function getArtistAt(globalIndex) {
  if (globalIndex < artists.length) {
    return artists[globalIndex];
  }

  const virtualIndex = globalIndex - artists.length;
  if (virtualIndex < 0 || virtualIndex >= VIRTUAL_ARTIST_COUNT) {
    return null;
  }

  return makeVirtualArtist(virtualIndex);
}

function enrichTrack(track) {
  return {
    ...track,
    artist: getArtistByIdInternal(track.artistId),
  };
}

function matchTrack(track, query, genre, artistId) {
  const artist = getArtistByIdInternal(track.artistId);
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

  const items = [];
  let pointer = offset;
  let scanned = 0;
  const maxScans = Math.max(limit * 300, 30_000);

  while (items.length < limit && pointer < TOTAL_TRACKS && scanned < maxScans) {
    const track = getTrackAt(pointer);
    if (track && matchTrack(track, query, genre, artistId)) {
      items.push(enrichTrack(track));
    }
    pointer += 1;
    scanned += 1;
  }

  return {
    ok: true,
    status: 200,
    data: {
      total: TOTAL_TRACKS,
      count: items.length,
      limit,
      offset,
      genres: RAP_VIRTUAL_GENRES,
      items,
    },
  };
}

export function getTrackById(id) {
  const realTrack = tracks.find((item) => item.id === id);
  const virtualIndex = parseVirtualTrackId(id);
  const virtualTrack = virtualIndex === null ? null : makeVirtualTrack(virtualIndex);
  const foundTrack = realTrack ?? virtualTrack;

  if (!foundTrack) {
    return { ok: false, status: 404, error: "Track not found" };
  }

  const artist = getArtistByIdInternal(foundTrack.artistId);
  if (!artist) {
    return { ok: false, status: 404, error: "Artist not found" };
  }

  return {
    ok: true,
    status: 200,
    data: {
      ...foundTrack,
      artist,
    },
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

  const items = [];
  let pointer = offset;
  let scanned = 0;
  const maxScans = Math.max(limit * 200, 20_000);

  while (items.length < limit && pointer < TOTAL_ARTISTS && scanned < maxScans) {
    const artist = getArtistAt(pointer);
    if (artist && (!query || artist.name.toLowerCase().includes(query))) {
      items.push(artist);
    }
    pointer += 1;
    scanned += 1;
  }

  return {
    ok: true,
    status: 200,
    data: {
      total: TOTAL_ARTISTS,
      count: items.length,
      limit,
      offset,
      items,
    },
  };
}

export function getArtistById(id) {
  const realArtist = artists.find((item) => item.id === id);
  const virtualIndex = parseVirtualArtistId(id);
  const virtualArtist = virtualIndex === null ? null : makeVirtualArtist(virtualIndex);
  const foundArtist = realArtist ?? virtualArtist;

  if (!foundArtist) {
    return { ok: false, status: 404, error: "Artist not found" };
  }

  let songs = tracks.filter((trackItem) => trackItem.artistId === foundArtist.id);
  if (!songs.length && foundArtist.isVirtual) {
    songs = Array.from({ length: 8 }, (_, index) =>
      makeVirtualTrack((virtualIndex * 17 + index) % VIRTUAL_TRACK_COUNT),
    ).map((trackItem) => ({
      ...trackItem,
      artistId: foundArtist.id,
    }));
  }

  return {
    ok: true,
    status: 200,
    data: {
      ...foundArtist,
      songs: songs.map(enrichTrack),
    },
  };
}
