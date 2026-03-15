const YT_API_KEY = ""; // Replace with your YouTube Data API key
const YT_CHANNEL_ID = "UCYB8cOzzg6zijuq6luCrYyQ"; // Optional: set if you already know the channel ID
const YT_CHANNEL_HANDLE = "RKHMedia_"; // Used to resolve channel ID via the API

const latestContainer = document.getElementById("latest-videos");
const mostViewedContainer = document.getElementById("most-viewed-videos");
const setupNotice = document.getElementById("setup-notice");

const fallbackLatest = [
  {
    title: "Insert latest video title",
    publishedAt: new Date().toISOString(),
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
    url: "https://youtube.com/@rkhmedia_?si=XLegPfEy0fmqKrr4",
  },
  {
    title: "Insert latest video title",
    publishedAt: new Date().toISOString(),
    thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    url: "https://youtube.com/@rkhmedia_?si=XLegPfEy0fmqKrr4",
  },
  {
    title: "Insert latest video title",
    publishedAt: new Date().toISOString(),
    thumbnail: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    url: "https://youtube.com/@rkhmedia_?si=XLegPfEy0fmqKrr4",
  },
];

const fallbackMostViewed = [
  {
    title: "Insert most viewed title",
    publishedAt: new Date().toISOString(),
    viewCount: 1240000,
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
    url: "https://youtube.com/@rkhmedia_?si=XLegPfEy0fmqKrr4",
  },
  {
    title: "Insert most viewed title",
    publishedAt: new Date().toISOString(),
    viewCount: 980000,
    thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
    url: "https://youtube.com/@rkhmedia_?si=XLegPfEy0fmqKrr4",
  },
  {
    title: "Insert most viewed title",
    publishedAt: new Date().toISOString(),
    viewCount: 770000,
    thumbnail: "https://images.unsplash.com/photo-1515165562835-c3b8c66f2a1f?auto=format&fit=crop&w=900&q=80",
    url: "https://youtube.com/@rkhmedia_?si=XLegPfEy0fmqKrr4",
  },
];

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());
document.querySelectorAll("[data-current-month]").forEach((el) => {
  el.textContent = monthLabel;
});

const hasApiKey = YT_API_KEY && !YT_API_KEY.includes("YOUR_");

const formatDate = (isoString) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoString));

const formatViews = (count = 0) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
};

const createCard = (video, showViews = false) => {
  const viewMarkup = showViews && video.viewCount
    ? `<span>${formatViews(video.viewCount)}</span>`
    : "";

  return `
    <article class="video-card">
      <div class="video-thumb">
        <img src="${video.thumbnail}" alt="${video.title}" />
      </div>
      <div class="video-body">
        <h3>${video.title}</h3>
        <div class="video-meta">
          <span>${formatDate(video.publishedAt)}</span>
          ${viewMarkup}
        </div>
        <a class="video-link" href="${video.url}" target="_blank" rel="noreferrer">Watch now</a>
      </div>
    </article>
  `;
};

const renderList = (container, videos, showViews = false) => {
  if (!container) return;
  container.innerHTML = videos.map((video) => createCard(video, showViews)).join("");
};

const renderLoading = (container, count = 3) => {
  if (!container) return;
  container.innerHTML = Array.from({ length: count })
    .map(
      () => `
        <article class="video-card loading">
          <div class="video-thumb"></div>
          <div class="video-body"></div>
        </article>
      `
    )
    .join("");
};

const resolveChannelId = async () => {
  if (YT_CHANNEL_ID) return YT_CHANNEL_ID;
  if (!hasApiKey || !YT_CHANNEL_HANDLE) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.search = new URLSearchParams({
    part: "id",
    forHandle: YT_CHANNEL_HANDLE,
    key: YT_API_KEY,
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to resolve channel ID");
  const data = await response.json();
  return data.items?.[0]?.id || null;
};

const fetchLatestThisMonth = async (channelId) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet",
    channelId,
    maxResults: "6",
    order: "date",
    publishedAfter: startOfMonth.toISOString(),
    type: "video",
    key: YT_API_KEY,
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to load latest videos");
  const data = await response.json();

  return data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
};

const fetchMostViewed = async (channelId) => {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.search = new URLSearchParams({
    part: "snippet",
    channelId,
    maxResults: "6",
    order: "viewCount",
    type: "video",
    key: YT_API_KEY,
  });

  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) throw new Error("Failed to load most viewed videos");
  const searchData = await searchResponse.json();

  const ids = searchData.items.map((item) => item.id.videoId).join(",");
  if (!ids) return [];

  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.search = new URLSearchParams({
    part: "snippet,statistics",
    id: ids,
    key: YT_API_KEY,
  });

  const detailsResponse = await fetch(detailsUrl);
  if (!detailsResponse.ok) throw new Error("Failed to load view counts");
  const detailsData = await detailsResponse.json();

  return detailsData.items.map((item) => ({
    id: item.id,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
    viewCount: Number(item.statistics.viewCount || 0),
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    url: `https://www.youtube.com/watch?v=${item.id}`,
  }));
};

const initReveal = () => {
  const revealEls = document.querySelectorAll("[data-reveal]");
  revealEls.forEach((el) => el.classList.add("reveal"));

  if (!("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => observer.observe(el));
};

const init = async () => {
  initReveal();
  renderLoading(latestContainer, 3);
  renderLoading(mostViewedContainer, 3);

  if (!hasApiKey) {
    if (setupNotice) setupNotice.style.display = "block";
    renderList(latestContainer, fallbackLatest);
    renderList(mostViewedContainer, fallbackMostViewed, true);
    return;
  }

  if (setupNotice) setupNotice.style.display = "none";

  try {
    const channelId = await resolveChannelId();
    if (!channelId) throw new Error("Missing channel ID");

    const [latest, mostViewed] = await Promise.all([
      fetchLatestThisMonth(channelId),
      fetchMostViewed(channelId),
    ]);

    renderList(latestContainer, latest.length ? latest : fallbackLatest);
    renderList(mostViewedContainer, mostViewed.length ? mostViewed : fallbackMostViewed, true);
  } catch (error) {
    console.error(error);
    if (setupNotice) setupNotice.style.display = "block";
    renderList(latestContainer, fallbackLatest);
    renderList(mostViewedContainer, fallbackMostViewed, true);
  }
};

init();
