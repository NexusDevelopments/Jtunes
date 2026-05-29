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

export default function JTunesApp() {
  const audioRef = useRef(null);

  const [tracks, setTracks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [activeView, setActiveView] = useState("discover");
  const [activeGenre, setActiveGenre] = useState("");
  const [search, setSearch] = useState("");

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
        fetch("/api/tracks", { cache: "no-store" }),
        fetch("/api/artists", { cache: "no-store" }),
      ]);

      const tracksData = await tracksRes.json();
      const artistsData = await artistsRes.json();

      setTracks(tracksData.items ?? []);
      setArtists(artistsData.items ?? []);
      if (tracksData.items?.length) {
        setActiveGenre(tracksData.items[0].genre);
      }
    }

    boot();
  }, []);

  const genres = useMemo(() => [...new Set(tracks.map((track) => track.genre))], [tracks]);

  useEffect(() => {
    if (!activeGenre && genres.length) {
      setActiveGenre(genres[0]);
    }
  }, [genres, activeGenre]);

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
      subtitle: "Full tracks, bold drops, nonstop flow.",
    },
    genres: {
      title: "Genre Pages",
      subtitle: "Browse tracks by style and find new sounds.",
    },
    artists: {
      title: "Artist Pages",
      subtitle: "See profile, listeners, followers, albums, and songs.",
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
              <p>Wave Engine</p>
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
              <h4>{formatCompact(1500000)}</h4>
              <p>Tracks Live</p>
            </article>
            <article>
              <h4>{artists.length}</h4>
              <p>Rappers</p>
            </article>
            <article>
              <h4>{genres.length}</h4>
              <p>Genres</p>
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
              </div>
              <div className="song-grid">
                {searchedTracks.map((track) => (
                  <article key={track.id} className="song-card">
                    <img src={track.cover} alt={track.title} />
                    <div className="song-card-content">
                      <h4>{track.title}</h4>
                      <div className="song-meta">
                        <span>{track.artist?.name}</span>
                        <span>{track.duration}</span>
                      </div>
                      <div className="song-meta">
                        <span>{track.genre}</span>
                        <span>{formatCompact(track.plays)} plays</span>
                      </div>
                      <div className="song-actions">
                        <button className="primary" onClick={() => playTrackById(track.id)}>
                          Play
                        </button>
                        <button onClick={() => setSelectedArtist(track.artist)}>Artist</button>
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
                  {genres.map((genre) => (
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
                      <div className="song-meta">
                        <span>{track.artist?.name}</span>
                        <span>{track.duration}</span>
                      </div>
                      <div className="song-actions">
                        <button className="primary" onClick={() => playTrackById(track.id)}>
                          Play
                        </button>
                        <button onClick={() => setSelectedArtist(track.artist)}>Artist</button>
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
              </div>
              <div className="artist-grid">
                {artists.map((artist) => (
                  <article className="artist-card" key={artist.id}>
                    <img src={artist.pfp} alt={artist.name} />
                    <h4>{artist.name}</h4>
                    <p>{formatCompact(artist.monthlyListeners)} monthly listeners</p>
                    <p>{formatCompact(artist.followers)} followers</p>
                    <button onClick={() => setSelectedArtist(artist)}>Open Artist Page</button>
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
              Close
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
                  {selectedArtist.albums.map((album) => (
                    <li key={album}>{album}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Songs</h4>
                <ul>
                  {tracks
                    .filter((track) => track.artistId === selectedArtist.id)
                    .map((track) => (
                      <li key={track.id}>
                        <span>{track.title}</span>
                        <button onClick={() => playTrackById(track.id)}>Play</button>
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
            <button onClick={handlePrev}>Back</button>
            <button className="play-main" onClick={togglePlay}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button onClick={handleNext}>Next</button>
            <button onClick={toggleLoop}>{loop ? "Loop On" : "Loop Off"}</button>
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
