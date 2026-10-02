// Fetches RKH Media's latest and most viewed videos from the YouTube Data API
// and writes them to videos.json. Run by .github/workflows/update-videos.yml.
// The API key comes from the YT_API_KEY repository secret and never reaches the browser.

import { writeFile } from "node:fs/promises";

const API_KEY = process.env.YT_API_KEY;
const CHANNEL_ID = "UCYB8cOzzg6zijuq6luCrYyQ"; // @RKHMedia_
const LATEST_COUNT = 6;
const MOST_VIEWED_COUNT = 6;

if (!API_KEY) {
  console.error("Missing YT_API_KEY secret.");
  process.exit(1);
}

const api = async (endpoint, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.search = new URLSearchParams({ ...params, key: API_KEY });
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`${endpoint} failed: ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
};

// Collect every video ID in a playlist (1 quota unit per 50 videos).
const playlistVideoIds = async (playlistId) => {
  const ids = [];
  let pageToken;
  do {
    const data = await api("playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    ids.push(...data.items.map((i) => i.contentDetails.videoId));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return ids;
};

// "UULF..." is the channel's long-form uploads (no Shorts). Fall back to all uploads.
const suffix = CHANNEL_ID.slice(2);
let ids;
try {
  ids = await playlistVideoIds(`UULF${suffix}`);
  if (!ids.length) throw new Error("empty");
  console.log(`Long-form uploads: ${ids.length}`);
} catch {
  ids = await playlistVideoIds(`UU${suffix}`);
  console.log(`All uploads (fallback): ${ids.length}`);
}

// Fetch titles, thumbnails and view counts in batches of 50.
const videos = [];
for (let i = 0; i < ids.length; i += 50) {
  const data = await api("videos", {
    part: "snippet,statistics,status",
    id: ids.slice(i, i + 50).join(","),
  });
  for (const v of data.items) {
    if (v.status?.privacyStatus !== "public") continue;
    if (v.snippet.liveBroadcastContent === "upcoming") continue;
    const t = v.snippet.thumbnails || {};
    videos.push({
      id: v.id,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      viewCount: Number(v.statistics?.viewCount || 0),
      thumbnail: (t.maxres || t.standard || t.high || t.medium || t.default)?.url,
      url: `https://www.youtube.com/watch?v=${v.id}`,
    });
  }
}

if (!videos.length) {
  console.error("No public videos returned; leaving existing videos.json untouched.");
  process.exit(1);
}

const latest = [...videos]
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  .slice(0, LATEST_COUNT);
const mostViewed = [...videos]
  .sort((a, b) => b.viewCount - a.viewCount)
  .slice(0, MOST_VIEWED_COUNT);

await writeFile("videos.json", JSON.stringify({ latest, mostViewed }, null, 2) + "\n");
console.log(`Wrote ${latest.length} latest and ${mostViewed.length} most viewed videos.`);
