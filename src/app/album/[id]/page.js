import Link from "next/link";
import { getAlbumById } from "@/lib/api";

export default async function AlbumPage({ params }) {
  const { id } = await params;
  const result = getAlbumById(id);
  if (!result.ok) {
    return <main className="detail-page"><h1>Album not found</h1></main>;
  }

  const album = result.data;

  return (
    <main className="detail-page">
      <section className="detail-card glass">
        <div className="detail-head">
          <img src={album.cover} alt={album.title} />
          <div>
            <h1>{album.title}</h1>
            <p>
              by <Link href={`/artist/${album.artist.id}`}>{album.artist.name}</Link>
            </p>
            <p>{album.year}</p>
          </div>
        </div>

        <div className="detail-block">
          <h2>Tracklist</h2>
          <div className="detail-list">
            {album.songs.map((song) => (
              <Link key={song.id} href={`/song/${song.id}`} className="detail-row">
                <span>{song.title}</span>
                <span>{song.genre}</span>
                <span>{song.duration}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
