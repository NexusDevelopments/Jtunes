"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function formatCompact(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${mins}:${secs}`;
}

function appendUnique(prev, nextItems) {
  const seen = new Set(prev.map((item) => item.id));
  const merged = [...prev];
  for (const item of nextItems) {
    if (!seen.has(item.id)) {
      merged.push(item);
      seen.add(item.id);
    }
  }
  return merged;
}

export default function JTunesApp() {
  const ytPlayerRef = useRef(null);
  const ytReadyRef = useRef(false);
  const progressTimerRef = useRef(null);

  const [tracks, setTracks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [activeView, setActiveView] = useState("discover");
  const [activeGenre, setActiveGenre] = useState("");
  const [search, setSearch] = useState("");
  const [genreOptions, setGenreOptions] = useState([]);

  const [searchTracks, setSearchTracks] = useState([]);
  const [searchArtists, setSearchArtists] = useState([]);

  const [totalTracks, setTotalTracks] = useState(0);
  const [totalArtists, setTotalArtists] = useState(0);
  const [indexedTracks, setIndexedTracks] = useState(0);
  const [indexedArtists, setIndexedArtists] = useState(0);
  const [trackOffset, setTrackOffset] = useState(0);
  const [artistOffset, setArtistOffset] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");

  const [selectedArtist, setSelectedArtist] = useState(null);

  const currentTrack = tracks[currentIndex] ?? null;
  const hasSearch = search.trim().length > 0;

  function stopProgressWatcher() {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function startProgressWatcher() {
    stopProgressWatcher();
    progressTimerRef.current = window.setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || !ytReadyRef.current) {
        return;
      }

      const seconds = player.getCurrentTime?.() ?? 0;
      const total = player.getDuration?.() ?? 0;

      setCurrentTime(formatTime(seconds));
      setDuration(formatTime(total));

      if (total > 0) {
        setProgress((seconds / total) * 100);
      }
    }, 420);
  }

  function playCurrentTrack(autoplay) {
    if (!currentTrack || !ytReadyRef.current || !ytPlayerRef.current) {
      return;
    }

    if (autoplay) {
      ytPlayerRef.current.loadVideoById(currentTrack.youtubeId);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    } else {
      ytPlayerRef.current.cueVideoById(currentTrack.youtubeId);
      setIsPlaying(false);
      stopProgressWatcher();
      setProgress(0);
      setCurrentTime("0:00");
      setDuration(currentTrack.duration ?? "0:00");
    }
  }

  function applyArtistMedia(baseArtists, mediaByName) {
    return baseArtists.map((artist) => {
      const media = mediaByName.get(artist.name.toLowerCase());
      if (!media) {
        return artist;
      }

      return {
        ...artist,
        pfp: media.thumb || media.fanart || artist.pfp,
        logo: media.logo || "",
      };
    });
  }

  async function fetchArtistMediaByName(names) {
    const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    if (!uniqueNames.length) {
      return new Map();
    }

    const responses = await Promise.all(
      uniqueNames.map(async (name) => {
        try {
          const res = await fetch(`/api/artist-media?name=${encodeURIComponent(name)}`, {
            cache: "no-store",
          });
          if (!res.ok) {
            return null;
          }
          const data = await res.json();
          return { name: name.toLowerCase(), ...data };
        } catch {
          return null;
        }
      }),
    );

    const map = new Map();
    responses.filter(Boolean).forEach((item) => {
      map.set(item.name, item);
    });
    return map;
  }

  function handleNext() {
    if (!tracks.length) return;
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  }

  useEffect(() => {
    async function boot() {
      const [tracksRes, artistsRes] = await Promise.all([
        fetch("/api/tracks?limit=60&offset=0", { cache: "no-store" }),
        fetch("/api/artists?limit=40&offset=0", { cache: "no-store" }),
      ]);

      const tracksData = await tracksRes.json();
      const artistsData = await artistsRes.json();

      const trackItems = tracksData.items ?? [];
      const artistItems = artistsData.items ?? [];

      const artistMedia = await fetchArtistMediaByName(artistItems.map((artist) => artist.name));
      const artistItemsWithMedia = applyArtistMedia(artistItems, artistMedia);

      const trackItemsWithMedia = trackItems.map((track) => ({
        ...track,
        artist:
          artistItemsWithMedia.find((artist) => artist.id === track.artistId) ?? track.artist,
      }));

      setTracks(trackItemsWithMedia);
      setArtists(artistItemsWithMedia);
      setTotalTracks(tracksData.total ?? trackItemsWithMedia.length);
      setTotalArtists(artistsData.total ?? artistItemsWithMedia.length);
      setIndexedTracks(tracksData.catalogMetrics?.indexedTracks ?? 0);
      setIndexedArtists(tracksData.catalogMetrics?.indexedArtists ?? 0);
      setTrackOffset(trackItemsWithMedia.length);
      setArtistOffset(artistItemsWithMedia.length);

      const nextGenres = tracksData.genres?.length
        ? tracksData.genres
        : [...new Set(trackItemsWithMedia.map((track) => track.genre))];
      setGenreOptions(nextGenres);

      if (trackItemsWithMedia.length) {
        setActiveGenre(trackItemsWithMedia[0].genre);
      }
    }

    boot();
  }, []);

  useEffect(() => {
    if (!activeGenre && genreOptions.length) {
      setActiveGenre(genreOptions[0]);
    }
  }, [activeGenre, genreOptions]);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchTracks([]);
      setSearchArtists([]);
      return;
    }

    let cancelled = false;

    async function runSearch() {
      const [tracksRes, artistsRes] = await Promise.all([
        fetch(`/api/tracks?q=${encodeURIComponent(q)}&limit=80&offset=0`, { cache: "no-store" }),
        fetch(`/api/artists?q=${encodeURIComponent(q)}&limit=40&offset=0`, { cache: "no-store" }),
      ]);

      const tracksData = await tracksRes.json();
      const artistsData = await artistsRes.json();

      if (cancelled) {
        return;
      }

      const foundArtists = artistsData.items ?? [];
      const artistMedia = await fetchArtistMediaByName(foundArtists.map((artist) => artist.name));
      const foundArtistsWithMedia = applyArtistMedia(foundArtists, artistMedia);

      const foundTracks = (tracksData.items ?? []).map((track) => ({
        ...track,
        artist:
          foundArtistsWithMedia.find((artist) => artist.id === track.artistId) ?? track.artist,
      }));

      if (!cancelled) {
        setSearchTracks(foundTracks);
        setSearchArtists(foundArtistsWithMedia);
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [search]);

  useEffect(() => {
    if (!tracks.length) {
      return undefined;
    }

    const installPlayer = () => {
      if (!window.YT || !window.YT.Player || ytPlayerRef.current) {
        return;
      }

      ytPlayerRef.current = new window.YT.Player("yt-player-host", {
        width: "120",
        height: "68",
        videoId: tracks[0].youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            ytReadyRef.current = true;
            setDuration(tracks[0].duration ?? "0:00");
          },
          onStateChange: (event) => {
            if (!window.YT) {
              return;
            }

            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startProgressWatcher();
            }

            if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              stopProgressWatcher();
            }

            if (state === window.YT.PlayerState.ENDED) {
              stopProgressWatcher();
              if (loop) {
                ytPlayerRef.current.seekTo(0, true);
                ytPlayerRef.current.playVideo();
              } else {
                handleNext();
              }
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      installPlayer();
    } else {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);

      const oldReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof oldReady === "function") {
          oldReady();
        }
        installPlayer();
      };
    }

    return () => {
      stopProgressWatcher();
    };
  }, [tracks, loop]);

  useEffect(() => {
    if (!currentTrack || !ytReadyRef.current || !ytPlayerRef.current) {
      return;
    }

    playCurrentTrack(isPlaying);
  }, [currentTrack]);

  const filteredTracks = useMemo(() => {
    if (hasSearch) {
      return searchTracks;
    }
    return tracks;
  }, [hasSearch, searchTracks, tracks]);

  const genreTracks = useMemo(
    () => filteredTracks.filter((track) => track.genre === activeGenre),
    [filteredTracks, activeGenre],
  );

  async function loadMoreTracks() {
    const response = await fetch(`/api/tracks?limit=30&offset=${trackOffset}`, {
      cache: "no-store",
    });
    const data = await response.json();
    const items = data.items ?? [];

    setTracks((prev) => appendUnique(prev, items));
    setTrackOffset((prev) => prev + items.length);
  }

  async function loadMoreArtists() {
    const response = await fetch(`/api/artists?limit=30&offset=${artistOffset}`, {
      cache: "no-store",
    });
    const data = await response.json();
    const items = data.items ?? [];

    const artistMedia = await fetchArtistMediaByName(items.map((artist) => artist.name));
    const withMedia = applyArtistMedia(items, artistMedia);

    setArtists((prev) => appendUnique(prev, withMedia));
    setArtistOffset((prev) => prev + withMedia.length);
  }

  function playTrackById(trackId) {
    const index = tracks.findIndex((track) => track.id === trackId);
    if (index < 0) return;

    setCurrentIndex(index);
    setIsPlaying(true);

    if (index === currentIndex && ytReadyRef.current && ytPlayerRef.current) {
      ytPlayerRef.current.playVideo();
    }
  }

  function togglePlay() {
    const player = ytPlayerRef.current;
    if (!player || !ytReadyRef.current || !tracks.length) return;

    const state = player.getPlayerState();

    if (state === window.YT.PlayerState.PLAYING) {
      player.pauseVideo();
      setIsPlaying(false);
      stopProgressWatcher();
      return;
    }

    if (!currentTrack) {
      return;
    }

    if (state === window.YT.PlayerState.UNSTARTED || state === window.YT.PlayerState.CUED) {
      player.loadVideoById(currentTrack.youtubeId);
    }

    player.playVideo();
    setIsPlaying(true);
  }

  function handlePrev() {
    if (!tracks.length) return;
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }

  function handleSeek(nextValue) {
    const player = ytPlayerRef.current;
    if (!player || !ytReadyRef.current) return;

    const total = player.getDuration?.() ?? 0;
    if (!Number.isFinite(total) || total <= 0) return;

    const ratio = Number(nextValue) / 100;
    const nextSeconds = ratio * total;
    player.seekTo(nextSeconds, true);
    setProgress(Number(nextValue));
    setCurrentTime(formatTime(nextSeconds));
  }

  function toggleLoop() {
    setLoop((prev) => !prev);
  }

  const viewMeta = {
    discover: {
      title: "Discover",
      subtitle: "Real rappers and full YouTube tracks",
    },
    genres: {
      title: "Genres",
      subtitle: "Rap-only lanes",
    },
    artists: {
      title: "Artists",
      subtitle: "Real rapper profiles and songs",
    },
  };

  const visibleArtists = hasSearch ? searchArtists : artists;

  return (
    <>
      <div className="bg-glow bg-one" />
      <div className="bg-glow bg-two" />

      <div id="yt-player-host" className="youtube-mini" aria-label="YouTube playback" />

      <div className="app-shell">
        <aside className="sidebar glass">
          <div className="brand-wrap">
            <div className="brand-logo">J</div>
            <div>
              <h1>J Tunes</h1>
              <p>Rap Mode</p>
            </div>
          </div>

          <div className="nav-stack">
            {Object.keys(viewMeta).map((viewKey) => (
              <button
                key={viewKey}
                className={`nav-btn ${activeView === viewKey ? "active" : ""}`}
                onClick={() => setActiveView(viewKey)}
              >
                {viewMeta[viewKey].title}
              </button>
            ))}
          </div>

          <div className="stats-grid">
            <article>
              <h4>{formatCompact(indexedTracks || totalTracks || tracks.length)}</h4>
              <p>Indexed Tracks</p>
            </article>
            <article>
              <h4>{formatCompact(indexedArtists || totalArtists || artists.length)}</h4>
              <p>Indexed Artists</p>
            </article>
            <article>
              <h4>{genreOptions.length}</h4>
              <p>Rap Genres</p>
            </article>
          </div>
        </aside>

        <main className="content">
          <header className="topbar glass">
            <div>
              <h2>{viewMeta[activeView].title}</h2>
              <p>{viewMeta[activeView].subtitle}</p>
            </div>
            <label className="search-wrap">
              <span>Search Songs And Artists</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                placeholder="Search in general"
              />
            </label>
          </header>

          {activeView === "discover" && (
            <section className="panel glass">
              <div className="section-title">
                <h3>Popular Rappers</h3>
              </div>
              <div className="artist-strip">
                {visibleArtists
                  .slice()
                  .sort((a, b) => b.monthlyListeners - a.monthlyListeners)
                  .slice(0, 12)
                  .map((artist) => (
                    <button
                      key={artist.id}
                      className="artist-chip"
                      onClick={() => setSelectedArtist(artist)}
                    >
                      <img src={artist.logo || artist.pfp} alt={artist.name} />
                      <div>
                        <h4>{artist.name}</h4>
                        <p>{formatCompact(artist.monthlyListeners)} listeners</p>
                      </div>
                    </button>
                  ))}
              </div>

              <div className="section-title">
                <h3>Song Library</h3>
                <button className="load-btn" onClick={loadMoreTracks}>
                  Load More
                </button>
              </div>
              <div className="song-grid">
                {filteredTracks.map((track) => (
                  <article key={track.id} className="song-card">
                    <img src={track.cover} alt={track.title} />
                    <div className="song-card-content">
                      <h4>{track.title}</h4>
                      <div className="song-artist-row">
                        <span>Artist</span>
                        <button onClick={() => setSelectedArtist(track.artist)}>{track.artist?.name}</button>
                      </div>
                      <div className="song-stats-row">
                        <span>{track.genre}</span>
                        <span>{track.duration}</span>
                        <span>{formatCompact(track.plays)} plays</span>
                      </div>
                      <div className="song-actions">
                        <button
                          className="primary icon-btn"
                          aria-label="Play track"
                          title="Play"
                          onClick={() => playTrackById(track.id)}
                        >
                          &gt;
                        </button>
                        <button
                          className="icon-btn"
                          aria-label="Open artist"
                          title="Artist"
                          onClick={() => setSelectedArtist(track.artist)}
                        >
                          @
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeView === "genres" && (
            <section className="panel glass">
              <div className="section-title">
                <h3>Genre Pages</h3>
                <div className="genre-tabs">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      className={`genre-tab ${activeGenre === genre ? "active" : ""}`}
                      onClick={() => setActiveGenre(genre)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
              <div className="song-grid">
                {genreTracks.map((track) => (
                  <article key={track.id} className="song-card">
                    <img src={track.cover} alt={track.title} />
                    <div className="song-card-content">
                      <h4>{track.title}</h4>
                      <div className="song-artist-row">
                        <span>Artist</span>
                        <button onClick={() => setSelectedArtist(track.artist)}>{track.artist?.name}</button>
                      </div>
                      <div className="song-stats-row">
                        <span>{track.genre}</span>
                        <span>{track.duration}</span>
                        <span>{formatCompact(track.plays)} plays</span>
                      </div>
                      <div className="song-actions">
                        <button
                          className="primary icon-btn"
                          aria-label="Play track"
                          title="Play"
                          onClick={() => playTrackById(track.id)}
                        >
                          &gt;
                        </button>
                        <button
                          className="icon-btn"
                          aria-label="Open artist"
                          title="Artist"
                          onClick={() => setSelectedArtist(track.artist)}
                        >
                          @
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeView === "artists" && (
            <section className="panel glass">
              <div className="section-title">
                <h3>Artist Pages</h3>
                <button className="load-btn" onClick={loadMoreArtists}>
                  Load More
                </button>
              </div>
              <div className="artist-grid">
                {visibleArtists.map((artist) => (
                  <article className="artist-card" key={artist.id}>
                    <img src={artist.logo || artist.pfp} alt={artist.name} />
                    <h4>{artist.name}</h4>
                    <p>{formatCompact(artist.monthlyListeners)} monthly listeners</p>
                    <p>{formatCompact(artist.followers)} followers</p>
                    <button onClick={() => setSelectedArtist(artist)}>Open Artist</button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {!selectedArtist ? null : (
        <section className="artist-modal" onClick={() => setSelectedArtist(null)}>
          <div className="artist-modal-inner" onClick={(event) => event.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedArtist(null)}>
              X
            </button>
            <div className="artist-head">
              <img src={selectedArtist.logo || selectedArtist.pfp} alt={selectedArtist.name} />
              <div>
                <h3>{selectedArtist.name}</h3>
                <p>
                  {formatCompact(selectedArtist.monthlyListeners)} monthly listeners · {" "}
                  {formatCompact(selectedArtist.followers)} followers
                </p>
              </div>
            </div>

            <div className="artist-columns">
              <div>
                <h4>Albums</h4>
                <ul>
                  {(selectedArtist.albums ?? []).map((album) => (
                    <li key={album}>{album}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Songs</h4>
                <ul>
                  {tracks
                    .filter((track) => track.artistId === selectedArtist.id)
                    .slice(0, 12)
                    .map((track) => (
                      <li key={track.id}>
                        <span>{track.title}</span>
                        <button onClick={() => playTrackById(track.id)}>&gt;</button>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="player glass">
        <div className="now-playing">
          <img src={currentTrack?.cover ?? ""} alt={currentTrack?.title ?? "Track art"} />
          <div>
            <h4>{currentTrack?.title ?? "Pick a song"}</h4>
            <p>{currentTrack?.artist?.name ?? "Artist"}</p>
          </div>
        </div>

        <div className="player-controls">
          <div className="control-row">
            <button className="icon-btn" aria-label="Previous track" title="Previous" onClick={handlePrev}>
              &laquo;
            </button>
            <button
              className="play-main icon-btn"
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              onClick={togglePlay}
            >
              {isPlaying ? "||" : ">"}
            </button>
            <button className="icon-btn" aria-label="Next track" title="Next" onClick={handleNext}>
              &raquo;
            </button>
            <button
              className={`icon-btn ${loop ? "loop-on" : ""}`}
              aria-label={loop ? "Loop on" : "Loop off"}
              title={loop ? "Loop on" : "Loop off"}
              onClick={toggleLoop}
            >
              O
            </button>
          </div>

          <div className="seek-row">
            <span>{currentTime}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(event) => handleSeek(event.target.value)}
            />
            <span>{duration}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
