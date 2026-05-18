import { useCallback, useEffect, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';
import { loadHls } from '../../lib/hls.js';
import { useSettings } from '../../lib/settings.jsx';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getProtocolClass(type) {
  if (!type) return '';
  const t = type.toLowerCase();
  if (t.includes('rtsp'))    return 'protocol-rtsp';
  if (t.includes('hls'))     return 'protocol-hls';
  if (t.includes('webrtc'))  return 'protocol-webrtc';
  if (t.includes('rtmp'))    return 'protocol-rtmp';
  if (t.includes('srt'))     return 'protocol-srt';
  return '';
}

function splitCamelCase(s) {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

function cellCountForLayout(layout) {
  return { '1plus5': 6, '2plus4': 6, '1plus3': 4 }[layout] ?? 6;
}

const LAYOUTS = [
  { id: '1plus5', label: '1+5 focus' },
  { id: '2plus4', label: '2+4 mix'   },
  { id: '1plus3', label: '1+3 focus' },
];

// ── HLS attachment (same pattern as RecordingsTab) ────────────────────────────

async function attachHls(videoEl, hlsUrl, destroyRef) {
  const Hls = await loadHls();
  if (!Hls || !Hls.isSupported()) {
    videoEl.src = hlsUrl;
    return;
  }
  const hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 5, backBufferLength: 10 });
  hls.attachMedia(videoEl);
  hls.on(Hls.Events.MEDIA_ATTACHED,   () => hls.loadSource(hlsUrl));
  hls.on(Hls.Events.MANIFEST_PARSED,  () => videoEl.play().catch(() => {}));
  hls.on(Hls.Events.ERROR, (_, data) => {
    if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      setTimeout(() => { hls.loadSource(hlsUrl); hls.startLoad(); }, 3000);
    }
    if (data.fatal && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      hls.recoverMediaError();
    }
  });
  // Store destructor so the caller can tear down on layout change or unmount.
  destroyRef.current = () => hls.destroy();
}

// ── Fullscreen modal (portal-free, appended to body like vanilla) ─────────────

function FullscreenModal({ streamData, hlsUrl, onClose }) {
  const videoRef   = useRef(null);
  const destroyRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    attachHls(videoRef.current, hlsUrl, destroyRef);
    return () => { destroyRef.current?.(); destroyRef.current = null; };
  }, [hlsUrl]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sourceType    = streamData.source?.type || '';
  const protocolClass = getProtocolClass(sourceType);

  return (
    <div className="focus-fullscreen-modal">
      <div className="focus-modal-backdrop" onClick={onClose} />
      <div className="focus-modal-content">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} autoPlay muted playsInline />
        <div className="focus-modal-title">
          <span className={`focus-cell-dot ${streamData.ready ? 'on' : 'off'}`} />
          {streamData.confName}
          {sourceType && (
            <span className={`focus-cell-proto ${protocolClass}`}>
              {splitCamelCase(sourceType).toUpperCase()}
            </span>
          )}
        </div>
        <button className="focus-modal-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

// ── Per-cell stream card ───────────────────────────────────────────────────────

function StreamCell({ streamData, hlsUrl, onExpand }) {
  const videoRef   = useRef(null);
  const destroyRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    attachHls(videoRef.current, hlsUrl, destroyRef);
    return () => { destroyRef.current?.(); destroyRef.current = null; };
  }, [hlsUrl]);

  const sourceType    = streamData.source?.type || '';
  const protocolClass = getProtocolClass(sourceType);

  return (
    <div className="focus-cell">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} autoPlay muted playsInline />
      <div className="focus-cell-overlay">
        <span className="focus-cell-name">
          <span className={`focus-cell-dot ${streamData.ready ? 'on' : 'off'}`} />
          {streamData.confName}
        </span>
        {sourceType && (
          <span className={`focus-cell-proto ${protocolClass}`}>
            {splitCamelCase(sourceType).toUpperCase()}
          </span>
        )}
      </div>
      <button
        className="focus-cell-expand"
        title="Expand to fullscreen"
        onClick={(e) => { e.stopPropagation(); onExpand(streamData); }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
    </div>
  );
}

function EmptyCell() {
  return (
    <div className="focus-cell focus-cell-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="M22 8.5l-6 3.5 6 3.5z" />
      </svg>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CameraFocusTab() {
  const { settings } = useSettings();

  const [layout, setLayout]     = useState(() => localStorage.getItem('camerafocus:layout') || '1plus5');
  const [streams, setStreams]    = useState([]);
  const [isMock, setIsMock]     = useState(false);
  const [modalStream, setModalStream] = useState(null);

  // Derive HLS base URL from settings (matches vanilla getHlsUrl).
  const getHlsUrl = useCallback((name) => {
    const url = new URL(window.location.href);
    const hlsAddr = settings?.hls?.hlsAddress || ':8888';
    return `${url.protocol}//${url.hostname}${hlsAddr}/${name}/index.m3u8`;
  }, [settings]);

  // ── Stream loading ─────────────────────────────────────────────────────────

  const loadStreams = useCallback(async () => {
    try {
      const res = await fm.fetch('/mediamtx/paths/list');
      if (!res) return;
      const data = await res.json();
      if (data.items) setStreams(data.items);
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch { /* tolerate network errors */ }
  }, []);

  // Initial load + polling.
  useEffect(() => {
    loadStreams();
    const id = setInterval(loadStreams, 2000);
    return () => clearInterval(id);
  }, [loadStreams]);

  // ── Layout switching ───────────────────────────────────────────────────────

  function switchLayout(id) {
    setLayout(id);
    localStorage.setItem('camerafocus:layout', id);
    // StreamCell components remount automatically because key changes with layout.
    // Their useEffect cleanup destroys each HLS instance before remount.
  }

  // ── Fullscreen (native) ────────────────────────────────────────────────────

  const tabRef = useRef(null);
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else tabRef.current?.requestFullscreen?.();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const maxCells   = cellCountForLayout(layout);
  const streamLabel = `${streams.length} stream${streams.length !== 1 ? 's' : ''}`;

  // Build the cell list; key includes layout so React tears down + remounts
  // StreamCells on layout change — this is what triggers HLS destructor in each
  // StreamCell's useEffect cleanup, then a fresh attachHls on the next mount.
  const cells = Array.from({ length: maxCells }, (_, i) => {
    const stream = streams[i];
    if (stream) {
      return (
        <StreamCell
          key={`${layout}-${stream.confName}`}
          streamData={stream}
          hlsUrl={getHlsUrl(stream.confName)}
          onExpand={setModalStream}
        />
      );
    }
    return <EmptyCell key={`${layout}-empty-${i}`} />;
  });

  return (
    <div ref={tabRef} className="tab camera-focus-tab">
      {/* Toolbar */}
      <div className="focus-toolbar">
        <div className="focus-layout-group">
          {LAYOUTS.map(({ id, label }) => (
            <button
              key={id}
              className={`focus-layout-btn${layout === id ? ' active' : ''}`}
              data-layout={id}
              onClick={() => switchLayout(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="focus-toolbar-right">
          <span className="focus-stream-count">
            {streamLabel}
            {isMock && <span className="focus-mock-badge">MOCK</span>}
          </span>
          <button className="phase2-btn sm secondary" onClick={loadStreams}>Refresh</button>
          <button className="phase2-btn sm secondary" title="Fullscreen" onClick={toggleFullscreen}>⛶</button>
        </div>
      </div>

      {/* Grid — data-layout drives CSS grid areas */}
      <div className="focus-grid" data-layout={layout}>
        {cells}
      </div>

      {/* Fullscreen modal */}
      {modalStream && (
        <FullscreenModal
          streamData={modalStream}
          hlsUrl={getHlsUrl(modalStream.confName)}
          onClose={() => setModalStream(null)}
        />
      )}
    </div>
  );
}
