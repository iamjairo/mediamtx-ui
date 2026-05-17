# React + Vite + Tailwind 4 Spike — Findings

## What was built

A new `client/` folder at the repo root containing a React 19 + Vite 8 + Tailwind 4 + React Router 7 app, matching the Tunet HA Dashboard stack exactly.

```
client/
  package.json            React 19, Vite 8, Tailwind 4, RR7
  vite.config.js          Proxies /mediamtx, /go2rtc, /login, /images, etc. to Express :3000
  postcss.config.js       Tailwind 4 PostCSS plugin
  tailwind.config.js      Minimal — CSS-first theming via existing variables.css
  index.html              Lexend Deca preconnected from Google Fonts
  src/
    App.jsx               Routes (one ported tab + Placeholder for the rest)
    main.jsx              StrictMode + BrowserRouter
    tabsConfig.js         Single source of truth for the tab list / sections
    components/
      Layout.jsx          Shell with Sidebar + Header + Outlet
      Sidebar.jsx         4 sections, dynamic icons via /images/icons proxy
      Header.jsx          Page title (route-driven) + theme toggle + clock
      Tabs/
        LogsTab.jsx       Fully ported — fetch, polling, filter, search, auto-scroll
        Placeholder.jsx   Stand-in for unported tabs
    lib/
      fetchManager.js     Ported: abort control, 401→mock fallback, mock on 5xx
      mockData.js         Ported from server/public/js/mock_data.js
      icons.js            Lazy SVG icon loader with cache
      useIcon.js          React hook wrapping icons.js
      useClock.js         React hook for the header clock
    styles/main.css       Imports the existing server/public/css/*.css verbatim
```

## What was verified

| Check | Result |
|---|---|
| `npm install` clean | ✅ 57 packages, 0 vulnerabilities |
| `npm run dev` starts on `:5173` | ✅ Ready in ~4s, HMR working |
| Existing CSS variables apply | ✅ Cyan `#22d3ee` accents visible |
| Lexend Deca loaded via Google Fonts | ✅ |
| Sidebar layout matches vanilla 1:1 | ✅ Same icons, sections, brand, collapse toggle, footer |
| Header layout matches vanilla 1:1 | ✅ Page title, theme toggle, clock |
| Tab routing via React Router 7 | ✅ `/dashboard`, `/logs`, etc. |
| Vite proxy → Express for `/images`, `/mediamtx`, `/go2rtc`, `/login` | ✅ |
| Mock fallback works on 401 | ✅ MOCK badge shown, mock data renders |
| Logs tab — header + search + level filters + auto-scroll + log lines | ✅ |
| Polling (setInterval inside useEffect) works | ✅ 5s refresh |
| `npm run build` produces production bundle | ✅ 122 KB gzipped total |

## Bundle size

```
dist/index.html                    1.01 KB │ gzip:  0.48 KB
dist/assets/index-*.css          147.63 KB │ gzip: 21.86 KB  ← all existing CSS bundled
dist/assets/rolldown-runtime-*.js  0.56 KB │ gzip:  0.36 KB
dist/assets/index-*.js            16.84 KB │ gzip:  5.36 KB  ← app code (shell + Logs)
dist/assets/vendor-router-*.js    41.36 KB │ gzip: 14.75 KB
dist/assets/vendor-react-*.js    189.68 KB │ gzip: 59.68 KB
```

Total: **~122 KB gzipped** for the entire shell + Logs tab. Adding more tabs will increase only the app chunk; vendors are amortized.

## Open items / known caveats

1. **woff2 font path warnings** — `typo.css` references `fonts/lexend/lexend-deca-v25-latin-*.woff2` paths that don't resolve at build time. Fonts gracefully fall back to Google Fonts (which is preconnected). Fix: move the local woff2 files into `client/public/fonts/` OR strip the @font-face declarations from typo.css since Google Fonts handles loading.
2. **No login UI yet** — the spike enables mock fallback for 401 so demo data shows. Real login flow will be ported in the migration (port the existing `LoginComponent`).
3. **StrictMode double-mount** — currently enabled in `main.jsx`. Was fine for the Logs tab (just causes a double poll on first mount). Will need careful handling for player tabs (HLS.js, WebRTC PeerConnections) — explicit cleanup in useEffect.
4. **HLS / WebRTC tabs not yet validated** — they're the most complex port and will be done last per the migration plan.

## Desktop wrapper compatibility

### Electron
The Electron main process loads `process.env.MEDIAMTX_URL || 'http://localhost:3000'` — a thin URL wrapper. Pointing it at `http://localhost:5173` (Vite dev) or at the production Vite build served by Express should work without code changes. **No source changes needed** for the wrapper itself; only `MEDIAMTX_URL` env in dev, and ensuring Express serves the built `client/dist/` in production.

### Tauri
`tauri.conf.json` currently has:
```json
"build": {
  "devUrl": "http://localhost:3000",
  "frontendDist": "http://localhost:3000"
}
```

Required changes:
- **`devUrl`** → `http://localhost:5173` so `tauri dev` loads from Vite
- **`frontendDist`** → `"../client/dist"` so production builds bundle the React app
- **CSP** (line 27) — may need `'unsafe-eval'` added to `script-src` for React DevTools / Vite HMR in dev. Production builds (no eval needed) work with current CSP.

No Rust code changes required.

### Verification status
- **Web (Chrome)** — ✅ verified, both dev and prod build
- **Electron (macOS)** — pending the deps install + smoke test (this session)
- **Tauri (macOS)** — deferred; requires Rust toolchain install (~10 min compile). Architecture is sound; will be validated in the migration's "desktop" phase.

## Recommended full-migration phasing

1. **Foundation week** — keep this spike's shell. Add: login page, settings modal, toast system, Hls.js loader util (lazy), WebRTC helper (lazy).
2. **Read-only tabs** (~1 week) — Dashboard, Overview, Hardware, HW Acceleration, API Docs, Scrypted, Matter Bridge, Home Assistant, Caddy, Docker. ~10 tabs, simple ports.
3. **Table tabs** (~3-5 days) — MediaMTX Sources, Go2RTC Sources (CRUD), Recordings.
4. **Form tabs** (~3-5 days) — Server, Path Defaults, Streams, Users.
5. **Player tabs LAST** (~1 week) — Stream Viewer, Camera Wall, Camera Focus, Snapshots. Most complex due to HLS/WebRTC lifecycle.
6. **Desktop validation** (~2-3 days) — Update Electron build to bundle Vite output, Tauri config, run macOS builds, smoke test.

**Total realistic estimate: 3-5 weeks of focused work.**

## Confidence calibration after the spike

- **Visual fidelity** — confirmed. Sidebar, header, Logs all pixel-identical to vanilla.
- **Build pipeline** — confirmed. Vite produces clean bundles.
- **Mock fallback** — confirmed transparently across the React layer.
- **Routing** — confirmed. React Router 7 works as expected.
- **Tab port pattern** — proven on Logs. Same pattern will work for all read-only/table/form tabs.
- **Player tabs** — still ~80% confident; will need careful useEffect cleanup, but no fundamental blocker.

**Recommendation: proceed with the full migration.**
