export const artists = [
  {
    id: "nova-k",
    name: "Nova K",
    pfp: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=900&q=80",
    monthlyListeners: 12300000,
    followers: 8400000,
    albums: ["Skyline Season", "Static Crown", "After Midnight"],
  },
  {
    id: "ray-volt",
    name: "Ray Volt",
    pfp: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    monthlyListeners: 9800000,
    followers: 7100000,
    albums: ["No Sleep District", "Blue Fire", "Shadow Tape"],
  },
  {
    id: "echo-rio",
    name: "Echo Rio",
    pfp: "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=900&q=80",
    monthlyListeners: 15200000,
    followers: 10200000,
    albums: ["Neon Ghost", "Riot Dreams", "Fast Lane Poetry"],
  },
  {
    id: "zay-rush",
    name: "Zay Rush",
    pfp: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    monthlyListeners: 7600000,
    followers: 4900000,
    albums: ["Concrete Lights", "Rush Hour", "Cold Summer"],
  },
];

export const tracks = [
  {
    id: "t1",
    title: "City Pulse",
    artistId: "nova-k",
    genre: "Hip-Hop",
    duration: "6:13",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    releasedAt: "2024-09-21",
    plays: 9123000,
  },
  {
    id: "t2",
    title: "Blue Flame Cipher",
    artistId: "ray-volt",
    genre: "Trap",
    duration: "5:31",
    cover: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?auto=format&fit=crop&w=1200&q=80",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    releasedAt: "2024-08-12",
    plays: 6642000,
  },
  {
    id: "t3",
    title: "Midnight Drip",
    artistId: "echo-rio",
    genre: "Drill",
    duration: "5:03",
    cover: "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=1200&q=80",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    releasedAt: "2025-01-10",
    plays: 10500000,
  },
  {
    id: "t4",
    title: "Chrome Dreams",
    artistId: "zay-rush",
    genre: "Rap",
    duration: "4:37",
    cover: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    releasedAt: "2023-12-03",
    plays: 5420000,
  },
  {
    id: "t5",
    title: "Night Shift Anthem",
    artistId: "nova-k",
    genre: "Pop Rap",
    duration: "6:11",
    cover: "https://images.unsplash.com/photo-1461784180009-21121b2f204c?auto=format&fit=crop&w=1200&q=80",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    releasedAt: "2025-03-14",
    plays: 7345000,
  },
  {
    id: "t6",
    title: "Cashline",
    artistId: "ray-volt",
    genre: "Trap",
    duration: "5:26",
    cover: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=1200&q=80",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    releasedAt: "2024-06-07",
    plays: 6120000,
  },
  {
    id: "t7",
    title: "No Brakes",
    artistId: "echo-rio",
    genre: "Hip-Hop",
    duration: "4:59",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    releasedAt: "2024-11-29",
    plays: 8901000,
  },
  {
    id: "t8",
    title: "Violet Exit",
    artistId: "zay-rush",
    genre: "Drill",
    duration: "7:08",
    cover: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    releasedAt: "2025-04-23",
    plays: 4789000,
  }
];

export const artistById = Object.fromEntries(artists.map((artist) => [artist.id, artist]));

export const genres = [...new Set(tracks.map((track) => track.genre))];

export const VIRTUAL_ARTIST_COUNT = 2_000_000;
export const VIRTUAL_TRACK_COUNT = 12_000_000;

const RAP_GENRES = [
  "Rap",
  "Hip-Hop",
  "Trap",
  "Drill",
  "Boom Bap",
  "Conscious Rap",
  "Cloud Rap",
  "Pop Rap",
  "Underground Rap",
  "West Coast Rap",
];

const RAP_WORD_A = ["Street", "Neon", "Crown", "Ghost", "Vault", "Cipher", "Concrete", "Velocity"];
const RAP_WORD_B = ["Kings", "Verse", "District", "Pulse", "Anthem", "Storm", "Empire", "Mode"];
const RAP_WORD_C = ["Flow", "Night", "Rhythm", "Code", "Legacy", "Shift", "Signal", "Rise"];

const audioPool = tracks.map((track) => track.src);
const coverPool = tracks.map((track) => track.cover);

function pick(list, index) {
  return list[Math.abs(index) % list.length];
}

function toVirtualArtistId(index) {
  return `va-${index}`;
}

function toVirtualTrackId(index) {
  return `vt-${index}`;
}

export function parseVirtualArtistId(id) {
  const match = /^va-(\d+)$/.exec(id ?? "");
  return match ? Number(match[1]) : null;
}

export function parseVirtualTrackId(id) {
  const match = /^vt-(\d+)$/.exec(id ?? "");
  return match ? Number(match[1]) : null;
}

export function makeVirtualArtist(index) {
  const normalized = Math.abs(index) % VIRTUAL_ARTIST_COUNT;
  const monthlyListeners = 150_000 + ((normalized * 37_919) % 29_000_000);
  const followers = 40_000 + ((normalized * 17_113) % 14_000_000);

  return {
    id: toVirtualArtistId(normalized),
    name: `${pick(RAP_WORD_A, normalized)} ${pick(RAP_WORD_B, normalized + 3)}`,
    pfp: `https://api.dicebear.com/9.x/adventurer/svg?seed=jtunes-artist-${normalized}`,
    monthlyListeners,
    followers,
    albums: [
      `${pick(RAP_WORD_A, normalized)} ${pick(RAP_WORD_C, normalized + 1)}`,
      `${pick(RAP_WORD_B, normalized + 2)} ${pick(RAP_WORD_C, normalized + 3)}`,
      `${pick(RAP_WORD_A, normalized + 4)} ${pick(RAP_WORD_B, normalized + 5)}`,
    ],
    isVirtual: true,
  };
}

export function makeVirtualTrack(index) {
  const normalized = Math.abs(index) % VIRTUAL_TRACK_COUNT;
  const artistIndex = normalized % VIRTUAL_ARTIST_COUNT;
  const mins = 2 + (normalized % 5);
  const secs = String((normalized * 13) % 60).padStart(2, "0");

  return {
    id: toVirtualTrackId(normalized),
    title: `${pick(RAP_WORD_A, normalized)} ${pick(RAP_WORD_B, normalized + 1)} ${pick(RAP_WORD_C, normalized + 2)}`,
    artistId: toVirtualArtistId(artistIndex),
    genre: pick(RAP_GENRES, normalized),
    duration: `${mins}:${secs}`,
    cover: pick(coverPool, normalized),
    src: pick(audioPool, normalized),
    releasedAt: `202${normalized % 6}-0${(normalized % 9) + 1}-1${normalized % 9}`,
    plays: 50_000 + ((normalized * 46_337) % 60_000_000),
    isVirtual: true,
  };
}

export const RAP_VIRTUAL_GENRES = RAP_GENRES;
