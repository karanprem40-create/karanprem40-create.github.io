// Videos are refreshed automatically by a GitHub Action (see .github/workflows/update-videos.yml),
// which writes videos.json. This script only reads that file, so no API key is exposed here.

const CHANNEL_URL = "https://www.youtube.com/@RKHMedia_";

const latestContainer = document.getElementById("latest-videos");
const mostViewedContainer = document.getElementById("most-viewed-videos");
const setupNotice = document.getElementById("setup-notice");
if (setupNotice) setupNotice.style.display = "none";

const escapeHtml = (str = "") =>
  str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const formatDate = (isoString) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(isoString));

const formatViews = (count = 0) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K views`;
  return `${count} views`;
};

const createCard = (video, showViews = false) => {
  const title = escapeHtml(video.title);
  const viewMarkup = showViews && video.viewCount ? `<span>${formatViews(video.viewCount)}</span>` : "";
  return `
    <article class="video-card">
      <a class="video-thumb" href="${video.url}" target="_blank" rel="noreferrer">
        <img src="${video.thumbnail}" alt="${title}" loading="lazy" />
      </a>
      <div class="video-body">
        <h3>${title}</h3>
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
  container.innerHTML = videos.map((v) => createCard(v, showViews)).join("");
};

const renderUnavailable = (container) => {
  if (!container) return;
  container.innerHTML = `
    <p class="muted">
      Videos couldn't load right now.
      <a class="text-link" href="${CHANNEL_URL}" target="_blank" rel="noreferrer">Watch on YouTube</a>
    </p>
  `;
};

const renderLoading = (container, count = 3) => {
  if (!container) return;
  container.innerHTML = Array.from({ length: count })
    .map(() => `<article class="video-card loading"><div class="video-thumb"></div><div class="video-body"></div></article>`)
    .join("");
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

  try {
    const res = await fetch("videos.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`videos.json: ${res.status}`);
    const { latest = [], mostViewed = [] } = await res.json();
    latest.length ? renderList(latestContainer, latest) : renderUnavailable(latestContainer);
    mostViewed.length ? renderList(mostViewedContainer, mostViewed, true) : renderUnavailable(mostViewedContainer);
  } catch (error) {
    console.error(error);
    renderUnavailable(latestContainer);
    renderUnavailable(mostViewedContainer);
  }
};

init();
