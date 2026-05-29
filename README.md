# J Tunes

J Tunes is a React + Next.js music platform with a strong API backend, Spotify-style player controls, and a bold black/blue frontend.

## Features
- Discover page with a song library and popular rapper strip
- Genre pages with filter tabs and full-track playback
- Artist pages showing profile image, monthly listeners, followers, albums, and songs
- Spotify-style bottom player with song image, title, artist, duration, play/pause, back, next, loop, and seek bar
- Backend API routes with validation and query filtering
- Vercel-ready Next.js deployment setup

## Tech Stack
- React (Next.js App Router)
- Server API routes (`/api/tracks`, `/api/artists`, `/api/health`)
- Zod validation for query parameter safety
- Responsive CSS UI with black/blue design system

## Local Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run start
```

Open `http://localhost:3000`.

## Deploy To Vercel

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Framework preset: Next.js (auto-detected).
4. Build command: `npm run build`.
5. Output: handled automatically by Next.js.

You can also deploy with the CLI:

```bash
npx vercel
```

## API Endpoints
- `GET /api/health`
- `GET /api/tracks?q=&genre=&artistId=&limit=&offset=`
- `GET /api/tracks/:id`
- `GET /api/artists`
- `GET /api/artists/:id`
- `GET /api/albums`
- `GET /api/albums/:id`
- `GET /api/songs`
- `GET /api/songs/:id`
- `GET /api/artist-media?name=`
- `GET /api/discovery/search?q=&limit=`

## Federated Music Sources

The project includes a federated search layer that can aggregate metadata from:

- Free Music Archive (`FMA_API_KEY`)
- MusicBrainz (public API)
- Jamendo (`JAMENDO_CLIENT_ID`)
- Internet Archive (public API)
- Genius (`GENIUS_ACCESS_TOKEN`)
- Discogs (`DISCOGS_USER_TOKEN`)
- Spotify (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`)

Optional local environment variables:

```bash
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
JAMENDO_CLIENT_ID=
GENIUS_ACCESS_TOKEN=
DISCOGS_USER_TOKEN=
FMA_API_KEY=
```

Without tokens, public providers still work and token-protected providers are skipped.

## Important Note on Music Rights
This template is wired with publicly accessible sample audio URLs for demo playback behavior.

To run a production music platform legally, replace the sample catalog with tracks you are licensed to stream (your own content, royalty-free catalogs, or licensed distributor APIs).