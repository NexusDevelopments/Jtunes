import ArtistPageClient from "@/components/ArtistPageClient";
import { getArtistById } from "@/lib/api";
import { artists } from "@/lib/catalog";

export function generateStaticParams() {
  return artists.map((artist) => ({ id: artist.id }));
}

export default async function ArtistPage({ params }) {
  const { id } = await params;
  const result = getArtistById(id);
  if (!result.ok) {
    return <main className="detail-page"><h1>Artist not found</h1></main>;
  }

  return <ArtistPageClient initialArtist={result.data} />;
}
