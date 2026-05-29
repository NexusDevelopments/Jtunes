import Link from "next/link";
import { getTrackById } from "@/lib/api";

export default async function SongPage({ params }) {
  const result = getTrackById(params.id);
  if (!result.ok) {
    return <main className="detail-page"><h1>Song not found</h1></main>;
  }

  const song = result.data;

  return (
    <main className="detail-page">
      <section className="detail-card glass">
        <div className="detail-head">
          <img src={song.cover} alt={song.title} />
          <div>
            <h1>{song.title}</h1>
            <p>
              <Link href={`/artist/${song.artist.id}`}>{song.artist.name}</Link>
            </p>
            <p>
              <Link href={`/album/${song.album.id}`}>{song.album.title}</Link>
            </p>
            <p>{song.duration}</p>
          </div>
        </div>

        <div className="detail-block">
          <h2>Open In App</h2>
          <div className="detail-list">
            <Link href="/" className="detail-row">
              <span>Play In J Tunes Player</span>
              <span>{song.genre}</span>
              <span>{song.plays.toLocaleString()} plays</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
