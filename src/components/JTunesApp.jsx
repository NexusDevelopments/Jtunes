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
  const audioRef = useRef(null);

  const [tracks, setTracks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [activeView, setActiveView] = useState("discover");
  const [activeGenre, setActiveGenre] = useState("");
  const [search, setSearch] = useState("");
  const [genreOptions, setGenreOptions] = useState([]);

  const [totalTracks, setTotalTracks] = useState(0);
  const [totalArtists, setTotalArtists] = useState(0);
  const [trackOffset, setTrackOffset] = useState(0);
  const [artistOffset, setArtistOffset] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");

  const [selectedArtist, setSelectedArtist] = useState(null);

  useEffect(() => {
    async function boot() {
      const [tracksRes, artistsRes] = await Promise.all([
        fetch("/api/tracks?limit=60&offset=0", { cache: "no-store" }),
        fetch("/api/artists?limit=30&offset=0", { cache: "no-store" }),
      ]);

      const tracksData = await tracksRes.json();
      const artistsData = await artistsRes.json();

      const trackItems = tracksData.items ?? [];
      const artistItems = artistsData.items ?? [];

      setTracks(trackItems);
      setArtists(artistItems);
      setTotalTracks(tracksData.total ?? trackItems.length);
      setTotalArtists(artistsData.total ?? artistItems.length);
      setTrackOffset(trackItems.length);
      setArtistOffset(artistItems.length);

      const nextGenres = tracksData.genres?.length
        ? tracksData.genres
        : [...new Set(trackItems.map((track) => track.genre))];
      setGenreOptions(nextGenres);

      if (trackItems.length) {
        setActiveGenre(trackItems[0].genre);
      }
    }

    boot();
  }, []);

  useEffect(() => {
    if (!activeGenre && genreOptions.length) {
      setActiveGenre(genreOptions[0]);
    }
  }, [activeGenre, genreOptions]);

  const searchedTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tracks;

    return tracks.filter((track) => {
      return (
        track.title.toLowerCase().includes(q) ||
        track.genre.toLowerCase().includes(q) ||
        track.artist?.name?.toLowerCase().includes(q)
      );
    });
  }, [search, tracks]);

  const genreTracks = useMemo(
    () => tracks.filter((track) => track.genre === activeGenre),
    [tracks, activeGenre],
  );

  const currentTrack = tracks[currentIndex] ?? null;

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    audioRef.current.src = currentTrack.src;
    audioRef.current.loop = loop;

    if (isPlaying) {
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentTrack, loop, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(formatTime(audio.currentTime));
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(formatTime(audio.duration));
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const onEnded = () => {
      if (!audio.loop) {
        handleNext();
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  });

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

    setArtists((prev) => appendUnique(prev, items));
    setArtistOffset((prev) => prev + items.length);
  }

  function playTrackById(trackId) {
    const index = tracks.findIndex((track) => track.id === trackId);
    if (index < 0) return;

    setCurrentIndex(index);
    setIsPlaying(true);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!tracks.length) return;

    if (!audio.src) {
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }

    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }

  function handlePrev() {
    if (!tracks.length) return;
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }

  function handleNext() {
    if (!tracks.length) return;
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  }

  function handleSeek(nextValue) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;

    const ratio = Number(nextValue) / 100;
    audio.currentTime = ratio * audio.duration;
    setProgress(Number(nextValue));
  }

  function toggleLoop() {
    const nextLoop = !loop;
    setLoop(nextLoop);
    if (audioRef.current) {
      audioRef.current.loop = nextLoop;
    }
  }

  const viewMeta = {
    discover: {
      title: "Discover Tracks",
      subtitle: "Rap-heavy catalog with full-track streaming.",
    },
    genres: {
      title: "Genre Pages",
      subtitle: "Mostly rap genres, from Trap to Drill to Boom Bap.",
    },
    artists: {
      title: "Artist Pages",
      subtitle: "Profiles, listeners, followers, albums, and songs.",
    },
  };

  return (
    <>
      <div className="bg-glow bg-one" />
      <div className="bg-glow bg-two" />

      <div className="app-shell">
        <aside className="sidebar glass">
          <div className="brand-wrap">
            <div className="brand-logo">J</div>
            <div>
              <h1>J Tunes</h1>
              <p>Mobile Rap Wave</p>
            </div>
          </div>

          <div className="nav-stack">
            {Object.keys(viewMeta).map((viewKey) => (
              <button
                key={viewKey}
                className={`nav-btn ${activeView === viewKey ? "active" : ""}`}
                onClick={() => setActiveView(viewKey)}
              >
                {viewKey[0].toUpperCase() + viewKey.slice(1)}
              </button>
            ))}
          </div>

          <div className="stats-grid">
            <article>
              <h4>{formatCompact(totalTracks || tracks.length)}</h4>
              <p>Tracks Live</p>
            </article>
            <article>
              <h4>{formatCompact(totalArtists || artists.length)}</h4>
              <p>Artists Live</p>
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
              <span>Search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                placeholder="Song, rapper, genre"
              />
            </label>
          </header>

          {activeView === "discover" && (
            <section className="panel glass">
              <div className="section-title">
                <h3>Popular Rappers</h3>
              </div>
              <div className="artist-strip">
                {artists
                  .slice()
                  .sort((a, b) => b.monthlyListeners - a.monthlyListeners)
                  .slice(0, 16)
                  .map((artist) => (
                    <button
                      key={artist.id}
                      className="artist-chip"
                      onClick={() => setSelectedArtist(artist)}
                    >
                      <img src={artist.pfp} alt={artist.name} />
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
                {searchedTracks.map((track) => (
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
                {artists.map((artist) => (
                  <article className="artist-card" key={artist.id}>
                    <img src={artist.pfp} alt={artist.name} />
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
              <img src={selectedArtist.pfp} alt={selectedArtist.name} />
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
                  {(selectedArtist.albums ?? ["Street Season", "Rap Motion", "Night Stories"]).map((album) => (
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
              &lt;&lt;
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
              &gt;&gt;
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

        <audio ref={audioRef} preload="metadata" />
      </footer>
    </>
  );
}
