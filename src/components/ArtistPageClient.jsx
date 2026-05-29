"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

function buildSearchQuery(title, artistName) {
  return `${title ?? ""} ${artistName ?? ""} official audio`.trim();
}

export default function ArtistPageClient({ initialArtist }) {
  const resolveCacheRef = useRef(new Map());
  const [artist, setArtist] = useState(initialArtist);
  const [extraSongs, setExtraSongs] = useState([]);
  const [videoId, setVideoId] = useState("");
  const [resolvingId, setResolvingId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function hydrateArtist() {
      try {
        const [artistRes, discoveryRes] = await Promise.all([
          fetch(`/api/artists/${initialArtist.id}`, { cache: "no-store" }),
          fetch(`/api/discovery/search?q=${encodeURIComponent(initialArtist.name)}&limit=12`, { cache: "no-store" }),
        ]);

        if (cancelled) return;

        if (artistRes.ok) {
          const freshArtist = await artistRes.json();
          if (!cancelled) {
            setArtist(freshArtist);
          }
        }

        if (discoveryRes.ok) {
          const discovery = await discoveryRes.json();
          const tracks = (discovery.tracks ?? [])
            .filter((item) => item.title)
            .slice(0, 8)
            .map((item) => ({
              id: item.id,
              title: item.title,
              duration: "--:--",
              genre: item.source ?? "Web",
              youtubeId: "",
              artist: { name: item.artistName ?? initialArtist.name },
              cover: initialArtist.pfp,
            }));

          if (!cancelled) {
            setExtraSongs(tracks);
          }
        }
      } catch {
        // Keep initial artist data when API/network fetch fails.
      }
    }

    hydrateArtist();

    return () => {
      cancelled = true;
    };
  }, [initialArtist.id, initialArtist.name, initialArtist.pfp]);

  const allSongs = useMemo(() => {
    const byId = new Map();
    for (const song of artist.songs ?? []) {
      byId.set(song.id, song);
    }
    for (const song of extraSongs) {
      if (!byId.has(song.id)) {
        byId.set(song.id, song);
      }
    }
    return [...byId.values()].slice(0, 16);
  }, [artist.songs, extraSongs]);

  async function resolveVideoId(song) {
    if (song.youtubeId) {
      return song.youtubeId;
    }

    const query = buildSearchQuery(song.title, song.artist?.name ?? artist.name);
    if (!query) {
      return "";
    }

    const key = query.toLowerCase();
    if (resolveCacheRef.current.has(key)) {
      return resolveCacheRef.current.get(key);
    }

    const response = await fetch(`/api/youtube/resolve?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    const resolved = data.videoId ?? "";
    if (resolved) {
      resolveCacheRef.current.set(key, resolved);
    }
    return resolved;
  }

  async function handlePlay(song) {
    setResolvingId(song.id);
    try {
      const resolved = await resolveVideoId(song);
      if (resolved) {
        setVideoId(resolved);
      }
    } finally {
      setResolvingId("");
    }
  }

  return (
    <main className="detail-page">
      <section className="detail-card glass">
        <div className="detail-head">
          <img src={artist.pfp} alt={artist.name} />
          <div>
            <h1>{artist.name}</h1>
            <p>{artist.monthlyListeners.toLocaleString()} monthly listeners</p>
            <p>{artist.followers.toLocaleString()} followers</p>
          </div>
        </div>

        <div className="detail-block">
          <h2>Albums</h2>
          <div className="detail-grid">
            {(artist.albums ?? []).map((album) => (
              <Link key={album.id} href={`/album/${album.id}`} className="detail-item">
                <img src={album.cover} alt={album.title} />
                <h3>{album.title}</h3>
                <p>{album.year}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="detail-block">
          <h2>Songs</h2>
          <div className="detail-list">
            {allSongs.map((song) => (
              <article key={song.id} className="artist-song-row">
                <img src={song.cover || artist.pfp} alt={song.title} />
                <div className="artist-song-meta">
                  <h3>{song.title}</h3>
                  <p>{song.genre} · {song.duration}</p>
                </div>
                <button
                  className="inline-play-btn"
                  onClick={() => handlePlay(song)}
                  disabled={resolvingId === song.id}
                >
                  {resolvingId === song.id ? "..." : "Play"}
                </button>
                {song.id.startsWith("t") ? <Link href={`/song/${song.id}`} className="icon-btn song-link">Song</Link> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {videoId ? (
        <section className="video-modal" onClick={() => setVideoId("") }>
          <div className="video-modal-card glass" onClick={(event) => event.stopPropagation()}>
            <button className="close-btn" onClick={() => setVideoId("")}>X</button>
            <div className="video-frame-wrap">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title={`${artist.name} player`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
