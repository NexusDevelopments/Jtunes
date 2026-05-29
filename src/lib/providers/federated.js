import { getSpotifyArtistMediaByName, searchSpotifyCatalog } from "@/lib/spotify";

function toNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function searchMusicBrainz(query, limit = 10) {
  const endpoint = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`;
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "JTunes/1.0 (https://github.com/NexusDevelopments/Jtunes)" },
    cache: "no-store",
  });

  if (!response.ok) return { tracks: [], artists: [], albums: [] };
  const payload = await response.json();

  const tracks = (payload.recordings ?? []).map((recording) => ({
    id: `mb-track-${recording.id}`,
    title: recording.title,
    artistName: recording["artist-credit"]?.[0]?.name ?? "Unknown",
    albumTitle: recording.releases?.[0]?.title ?? "",
    source: "musicbrainz",
    externalUrl: `https://musicbrainz.org/recording/${recording.id}`,
  }));

  const artistsMap = new Map();
  (payload.recordings ?? []).forEach((recording) => {
    const a = recording["artist-credit"]?.[0];
    if (a?.artist?.id) {
      artistsMap.set(a.artist.id, {
        id: `mb-artist-${a.artist.id}`,
        name: a.name,
        pfp: "",
        source: "musicbrainz",
        externalUrl: `https://musicbrainz.org/artist/${a.artist.id}`,
      });
    }
  });

  return { tracks, artists: [...artistsMap.values()], albums: [] };
}

export async function searchInternetArchive(query, limit = 10) {
  const endpoint = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(`${query} AND mediatype:audio`)}&fl[]=identifier&fl[]=title&fl[]=creator&rows=${limit}&page=1&output=json`;
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) return { tracks: [], artists: [], albums: [] };

  const payload = await response.json();
  const docs = payload?.response?.docs ?? [];

  const tracks = docs.map((doc) => ({
    id: `ia-track-${doc.identifier}`,
    title: doc.title ?? doc.identifier,
    artistName: doc.creator ?? "Unknown",
    albumTitle: "",
    source: "internet-archive",
    externalUrl: `https://archive.org/details/${doc.identifier}`,
  }));

  const artistsMap = new Map();
  docs.forEach((doc, idx) => {
    const name = doc.creator || "Unknown";
    artistsMap.set(`${name}-${idx}`, {
      id: `ia-artist-${idx}`,
      name,
      pfp: "",
      source: "internet-archive",
      externalUrl: "https://archive.org",
    });
  });

  return { tracks, artists: [...artistsMap.values()], albums: [] };
}

export async function searchJamendo(query, limit = 10) {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) return { tracks: [], artists: [], albums: [] };

  const endpoint = `https://api.jamendo.com/v3.0/tracks/?client_id=${encodeURIComponent(clientId)}&format=jsonpretty&limit=${limit}&namesearch=${encodeURIComponent(query)}&include=musicinfo`;
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) return { tracks: [], artists: [], albums: [] };

  const payload = await response.json();
  const results = payload?.results ?? [];

  const tracks = results.map((track) => ({
    id: `jam-track-${track.id}`,
    title: track.name,
    artistName: track.artist_name,
    albumTitle: track.album_name ?? "",
    audioUrl: track.audio ?? "",
    source: "jamendo",
    externalUrl: track.shareurl ?? "https://www.jamendo.com",
  }));

  const artistsMap = new Map();
  results.forEach((track) => {
    if (track.artist_id) {
      artistsMap.set(track.artist_id, {
        id: `jam-artist-${track.artist_id}`,
        name: track.artist_name,
        pfp: track.image ?? "",
        source: "jamendo",
        externalUrl: track.artist_id ? `https://www.jamendo.com/artist/${track.artist_id}` : "https://www.jamendo.com",
      });
    }
  });

  return { tracks, artists: [...artistsMap.values()], albums: [] };
}

export async function searchGenius(query, limit = 10) {
  const token = process.env.GENIUS_ACCESS_TOKEN;
  if (!token) return { tracks: [], artists: [], albums: [] };

  const endpoint = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) return { tracks: [], artists: [], albums: [] };
  const payload = await response.json();

  const hits = (payload?.response?.hits ?? []).slice(0, limit);

  const tracks = hits.map((hit) => ({
    id: `genius-track-${hit.result.id}`,
    title: hit.result.title,
    artistName: hit.result.primary_artist?.name ?? "Unknown",
    albumTitle: hit.result.album?.name ?? "",
    source: "genius",
    externalUrl: hit.result.url,
  }));

  const artistsMap = new Map();
  hits.forEach((hit) => {
    const artist = hit.result.primary_artist;
    if (artist?.id) {
      artistsMap.set(artist.id, {
        id: `genius-artist-${artist.id}`,
        name: artist.name,
        pfp: artist.image_url ?? "",
        source: "genius",
        externalUrl: artist.url ?? "https://genius.com",
      });
    }
  });

  return { tracks, artists: [...artistsMap.values()], albums: [] };
}

export async function searchDiscogs(query, limit = 10) {
  const token = process.env.DISCOGS_USER_TOKEN;
  if (!token) return { tracks: [], artists: [], albums: [] };

  const endpoint = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&per_page=${limit}`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Discogs token=${token}`,
      "User-Agent": "JTunes/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) return { tracks: [], artists: [], albums: [] };
  const payload = await response.json();

  const albums = (payload?.results ?? []).map((item) => ({
    id: `discogs-album-${item.id}`,
    title: item.title,
    artistName: item.title?.split(" - ")?.[0] ?? "Unknown",
    cover: item.cover_image ?? "",
    source: "discogs",
    externalUrl: item.uri ? `https://www.discogs.com${item.uri}` : "https://www.discogs.com",
  }));

  return { tracks: [], artists: [], albums: albums };
}

export async function searchFreeMusicArchive(query, limit = 10) {
  const apiKey = process.env.FMA_API_KEY;
  if (!apiKey) return { tracks: [], artists: [], albums: [] };

  const endpoint = `https://freemusicarchive.org/api/get/tracks.json?api_key=${encodeURIComponent(apiKey)}&track_title=${encodeURIComponent(query)}&limit=${limit}`;
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) return { tracks: [], artists: [], albums: [] };

  const payload = await response.json();
  const dataset = payload?.dataset ?? [];

  const tracks = dataset.map((item) => ({
    id: `fma-track-${item.track_id}`,
    title: item.track_title,
    artistName: item.artist_name,
    albumTitle: item.album_title ?? "",
    audioUrl: item.track_file,
    source: "free-music-archive",
    externalUrl: item.track_url ?? "https://freemusicarchive.org",
  }));

  return { tracks, artists: [], albums: [] };
}

export async function searchFederatedMusic(query, options = {}) {
  const limit = toNum(options.limit, 12);

  const [spotifyRes, mbRes, iaRes, jamRes, geniusRes, discogsRes, fmaRes] = await Promise.all([
    searchSpotifyCatalog(query, limit),
    searchMusicBrainz(query, limit),
    searchInternetArchive(query, limit),
    searchJamendo(query, limit),
    searchGenius(query, limit),
    searchDiscogs(query, limit),
    searchFreeMusicArchive(query, limit),
  ]);

  const artistMediaHints = await Promise.all(
    [
      ...spotifyRes.artists,
      ...mbRes.artists,
      ...jamRes.artists,
      ...geniusRes.artists,
    ]
      .slice(0, limit)
      .map(async (artist) => {
        if (artist.pfp) return artist;
        const media = await getSpotifyArtistMediaByName(artist.name);
        return { ...artist, pfp: media?.image ?? "" };
      }),
  );

  return {
    tracks: [
      ...spotifyRes.tracks,
      ...mbRes.tracks,
      ...iaRes.tracks,
      ...jamRes.tracks,
      ...geniusRes.tracks,
      ...fmaRes.tracks,
    ].slice(0, limit * 3),
    artists: [...artistMediaHints, ...iaRes.artists].slice(0, limit * 2),
    albums: [...spotifyRes.albums, ...discogsRes.albums].slice(0, limit * 2),
    providers: {
      spotify: spotifyRes.meta,
      musicbrainz: { enabled: true },
      jamendo: { enabled: Boolean(process.env.JAMENDO_CLIENT_ID) },
      genius: { enabled: Boolean(process.env.GENIUS_ACCESS_TOKEN) },
      discogs: { enabled: Boolean(process.env.DISCOGS_USER_TOKEN) },
      fma: { enabled: Boolean(process.env.FMA_API_KEY) },
      internetArchive: { enabled: true },
    },
    resources: [
      "https://freemusicarchive.org",
      "https://musicbrainz.org",
      "https://jamendo.com",
      "https://archive.org",
      "https://genius.com",
      "https://discogs.com",
      "http://polygraph.cool",
      "https://rollingstone.com",
      "https://spotify.com",
    ],
  };
}
