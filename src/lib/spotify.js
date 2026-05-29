let cachedToken = null;
let cachedExpiresAt = 0;

export async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const now = Date.now();
  if (cachedToken && now < cachedExpiresAt) {
    return cachedToken;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  cachedToken = payload.access_token;
  cachedExpiresAt = now + Math.max((payload.expires_in ?? 3600) - 60, 60) * 1000;
  return cachedToken;
}

export async function getSpotifyArtistMediaByName(name) {
  const token = await getSpotifyToken();
  if (!token) {
    return null;
  }

  const endpoint = `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const artist = payload?.artists?.items?.[0];
  if (!artist) {
    return null;
  }

  return {
    image: artist.images?.[0]?.url ?? "",
    externalUrl: artist.external_urls?.spotify ?? "",
    id: artist.id,
  };
}

export async function searchSpotifyCatalog(query, limit = 10) {
  const token = await getSpotifyToken();
  if (!token) {
    return {
      tracks: [],
      artists: [],
      albums: [],
      meta: { enabled: false },
    };
  }

  const endpoint = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist,track,album&limit=${limit}`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      tracks: [],
      artists: [],
      albums: [],
      meta: { enabled: true, ok: false },
    };
  }

  const payload = await response.json();

  const artists = (payload?.artists?.items ?? []).map((artist) => ({
    id: `spotify-artist-${artist.id}`,
    name: artist.name,
    pfp: artist.images?.[0]?.url ?? "",
    source: "spotify",
    externalUrl: artist.external_urls?.spotify ?? "https://spotify.com",
  }));

  const tracks = (payload?.tracks?.items ?? []).map((track) => ({
    id: `spotify-track-${track.id}`,
    title: track.name,
    artistName: track.artists?.[0]?.name ?? "Unknown",
    albumTitle: track.album?.name ?? "",
    source: "spotify",
    externalUrl: track.external_urls?.spotify ?? "https://spotify.com",
    previewUrl: track.preview_url ?? "",
  }));

  const albums = (payload?.albums?.items ?? []).map((album) => ({
    id: `spotify-album-${album.id}`,
    title: album.name,
    artistName: album.artists?.[0]?.name ?? "Unknown",
    cover: album.images?.[0]?.url ?? "",
    source: "spotify",
    externalUrl: album.external_urls?.spotify ?? "https://spotify.com",
  }));

  return {
    tracks,
    artists,
    albums,
    meta: { enabled: true, ok: true },
  };
}
