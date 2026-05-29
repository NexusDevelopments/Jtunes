let cachedToken = null;
let cachedExpiresAt = 0;

async function getSpotifyToken() {
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
