// Lazy-loaded HLS.js. Player tabs call `loadHls()` once at mount time. The
// import is dynamic so HLS.js (≈100 KB gzipped) only ships in the bundle for
// tabs that actually need it — Logs, Sources, API Docs etc. don't pull it in.

let cached = null;

export async function loadHls() {
  if (cached) return cached;
  // hls.js is published to npm — when we add it as a client dep this resolves
  // to the bundled module. For now we use the global from the CDN <script tag>
  // that the existing index.html loaded; check window first so the spike works.
  if (typeof window !== 'undefined' && window.Hls) {
    cached = window.Hls;
    return cached;
  }
  // Fall back to CDN loader (matches vanilla Camera Wall behavior).
  await loadScriptTag('https://cdn.jsdelivr.net/npm/hls.js@latest');
  cached = window.Hls || null;
  return cached;
}

function loadScriptTag(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('hls.js load failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve(); });
    s.addEventListener('error', () => reject(new Error('hls.js load failed')));
    document.head.appendChild(s);
  });
}
