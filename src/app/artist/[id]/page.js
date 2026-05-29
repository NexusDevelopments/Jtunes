import Link from "next/link";
import { getArtistById } from "@/lib/api";

export default async function ArtistPage({ params }) {
  const result = getArtistById(params.id);
  if (!result.ok) {
    return <main className="detail-page"><h1>Artist not found</h1></main>;
  }

  const artist = result.data;

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
            {artist.albums.map((album) => (
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
            {artist.songs.map((song) => (
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
