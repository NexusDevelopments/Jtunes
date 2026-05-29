import "@/app/globals.css";

export const metadata = {
  title: "J Tunes",
  description: "SoundCloud-inspired React music platform with full-track playback",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
