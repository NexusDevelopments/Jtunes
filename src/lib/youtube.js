function extractJsonObject(source, startIndex) {
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, i + 1);
      }
    }
  }

  return "";
}

function findFirstVideoId(node) {
  if (!node) {
    return "";
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const candidate = findFirstVideoId(item);
      if (candidate) {
        return candidate;
      }
    }
    return "";
  }

  if (typeof node !== "object") {
    return "";
  }

  if (node.videoRenderer?.videoId) {
    return node.videoRenderer.videoId;
  }

  if (typeof node.videoId === "string" && /^[a-zA-Z0-9_-]{11}$/.test(node.videoId)) {
    return node.videoId;
  }

  for (const value of Object.values(node)) {
    const candidate = findFirstVideoId(value);
    if (candidate) {
      return candidate;
    }
  }

  return "";
}

async function resolveWithYouTubeApi(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const item = payload.items?.[0];
  const videoId = item?.id?.videoId;
  if (!videoId) {
    return null;
  }

  return {
    videoId,
    title: item.snippet?.title ?? "",
    channelTitle: item.snippet?.channelTitle ?? "",
    source: "youtube-data-api",
  };
}

async function resolveWithScraping(query) {
  const endpoint = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const marker = "var ytInitialData = ";
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const jsonStart = html.indexOf("{", markerIndex + marker.length);
  if (jsonStart < 0) {
    return null;
  }

  const rawJson = extractJsonObject(html, jsonStart);
  if (!rawJson) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(rawJson);
  } catch {
    return null;
  }

  const videoId = findFirstVideoId(data);
  if (!videoId) {
    return null;
  }

  return {
    videoId,
    title: "",
    channelTitle: "",
    source: "youtube-search-page",
  };
}

export async function resolveYouTubeVideo(query) {
  const cleaned = query?.trim();
  if (!cleaned) {
    return null;
  }

  try {
    const apiResult = await resolveWithYouTubeApi(cleaned);
    if (apiResult) {
      return apiResult;
    }
  } catch {
    // Keep graceful fallback for environments without API access.
  }

  try {
    return await resolveWithScraping(cleaned);
  } catch {
    return null;
  }
}
