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

function fmtMb(bytes) {
  return ((parseInt(bytes, 10) || 0) / 1048576).toFixed(2);
}

const LAYOUTS = ['2x1', '2x2', '3x2', '3x3'];

// ── HLS attachment (same destructor-ref pattern as RecordingsTab) ─────────────

async function attachHls(videoEl, hlsUrl, destroyRef) {
  const Hls = await loadHls();
  if (!Hls || !Hls.isSupported()) {
    videoEl.src = hlsUrl;
    return;
  }
  const hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 5, backBufferLength: 10 });
  hls.attachMedia(videoEl);
  hls.on(Hls.Events.MEDIA_ATTACHED,  () => hls.loadSource(hlsUrl));
  hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(() => {}));
  hls.on(Hls.Events.ERROR, (_, data) => {
    if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      setTimeout(() => { hls.loadSource(hlsUrl); hls.startLoad(); }, 3000);
    }
    if (data.fatal && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      hls.recoverMediaError();
    }
  });
  destroyRef.current = () => hls.destroy();
}

// ── Fullscreen detail modal ────────────────────────────────────────────────────

function OverviewModal({ streamData, hlsUrl, onClose, onMetaUpdate }) {
  const videoRef   = useRef(null);
  const destroyRef = useRef(null);

  // Register callback so parent can push live meta updates into the modal.
  useEffect(() => {
    onMetaUpdate(streamData.confName, setLiveMeta);
    return () => onMetaUpdate(null, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamData.confName]);

  const [liveMeta, setLiveMeta] = useState({
    readers:       streamData.readers?.length ?? 0,
    bytesReceived: streamData.bytesReceived   ?? 0,
    bytesSent:     streamData.bytesSent       ?? 0,
  });

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
  const protocolLabel = sourceType ? splitCamelCase(sourceType).toUpperCase() : '—';

  return (
    <div className="overview-fullscreen-modal">
      <div className="overview-modal-backdrop" onClick={onClose} />
      <div className="overview-modal-content">
        <div className="overview-modal-video-wrap">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay muted playsInline />
        </div>
        <div className="overview-modal-info">
          <h3>{streamData.confName}</h3>
          <div className="overview-modal-meta">
            <div className="overview-modal-row">
              <span className="label">Protocol</span>
              <span className="value">{protocolLabel}</span>
            </div>
            <div className="overview-modal-row">
              <span className="label">Viewers</span>
              <span className="value">{liveMeta.readers}</span>
            </div>
            <div className="overview-modal-row">
              <span className="label">Bytes Received</span>
              <span className="value">{fmtMb(liveMeta.bytesReceived)} MB</span>
            </div>
            <div className="overview-modal-row">
              <span className="label">Bytes Sent</span>
              <span className="value">{fmtMb(liveMeta.bytesSent)} MB</span>
            </div>
          </div>
        </div>
        <button className="overview-modal-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

// ── Per-stream card (mini-player) ─────────────────────────────────────────────

function StreamCard({ stream, hlsUrl, onClick }) {
  const videoRef   = useRef(null);
  const destroyRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    attachHls(videoRef.current, hlsUrl, destroyRef);
    return () => { destroyRef.current?.(); destroyRef.current = null; };
  }, [hlsUrl]);

  const sourceType    = stream.source?.type || '';
  const protocolClass = getProtocolClass(sourceType);
  const viewers       = stream.readers?.length ?? 0;
  const rxMb          = fmtMb(stream.bytesReceived);
  const txMb          = fmtMb(stream.bytesSent);

  return (
    <div
      className={`stream-item${protocolClass ? ` ${protocolClass}` : ''}`}
      onClick={() => onClick(stream)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(stream); }}
    >
      {/* Top-left: status dot + name */}
      <div className="stream-overlay-top">
        <div className={`stream-status-dot${stream.ready ? ' on' : ' off'}`} />
        <div className="stream-name">{stream.confName}</div>
      </div>

      {/* Top-right: protocol badge */}
      {sourceType && (
        <div className={`stream-type${protocolClass ? ` ${protocolClass}` : ''}`}>
          {splitCamelCase(sourceType).toUpperCase()}
        </div>
      )}

      {/* Video element — HLS attached via useEffect */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} className="cam" autoPlay muted playsInline />

      {/* Bottom overlay: viewers + bytes */}
      <div className="stream-overlay-bottom">
        <div className="stream-viewers">
          <span className="stream-viewers-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <div className="stream-viewers-number">{viewers}</div>
        </div>
        <div className="stream-bytes">
          <div className="stream-bytes-received">
            <span className="stream-bytes-received-number">{rxMb}</span>
          </div>
          <div className="stream-bytes-sent">
            <span className="stream-bytes-sent-number">{txMb}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OverviewTab() {
  const { settings } = useSettings();

  const [streams, setStreams]       = useState([]);
  const [isMock, setIsMock]         = useState(false);
  const [layout, setLayout]         = useState(() => localStorage.getItem('overview:layout') || '2x2');
  const [modalStream, setModalStream] = useState(null);

  // Live-meta bridge: modal registers its setState here so polling can push
  // updates without re-opening the modal — matches vanilla's _updateMeta pattern.
  const modalMetaRef = useRef({ name: null, updater: null });

  function registerModalMeta(name, updater) {
    modalMetaRef.current = { name, updater };
  }

  // ── HLS URL builder ────────────────────────────────────────────────────────

  const getHlsUrl = useCallback((name) => {
    const url = new URL(window.location.href);
    const hlsAddr = settings?.hls?.hlsAddress || ':8888';
    return `${url.protocol}//${url.hostname}${hlsAddr}/${name}/index.m3u8`;
  }, [settings]);

  // ── Polling (500 ms, same as vanilla) ─────────────────────────────────────

  const loadPaths = useCallback(async () => {
    try {
      const res = await fm.fetch('/mediamtx/paths/list');
      if (!res) return;
      const data = await res.json();
      if (!data.items) return;

      setStreams(data.items);
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');

      // Push live meta into open modal if it matches.
      const { name, updater } = modalMetaRef.current;
      if (name && updater) {
        const match = data.items.find((i) => i.confName === name);
        if (match) {
          updater({
            readers:       match.readers?.length ?? 0,
            bytesReceived: match.bytesReceived   ?? 0,
            bytesSent:     match.bytesSent       ?? 0,
          });
        }
      }
    } catch { /* tolerate */ }
  }, []);

  useEffect(() => {
    loadPaths();
    const id = setInterval(loadPaths, 500);
    return () => clearInterval(id);
  }, [loadPaths]);

  // ── Layout switching ───────────────────────────────────────────────────────

  function switchLayout(l) {
    setLayout(l);
    localStorage.setItem('overview:layout', l);
  }

  // ── Fullscreen (native) on the streams container ───────────────────────────

  const streamsRef = useRef(null);
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else streamsRef.current?.requestFullscreen?.();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const streamCountLabel = `${streams.length} stream${streams.length !== 1 ? 's' : ''}`;

  return (
    <div className="tab overview">
      {/* Toolbar */}
      <div className="overview-toolbar">
        <div className="overview-layout-group">
          {LAYOUTS.map((l) => (
            <button
              key={l}
              className={`overview-layout-btn${layout === l ? ' active' : ''}`}
              data-layout={l}
              onClick={() => switchLayout(l)}
            >
              {l.replace('x', '×')}
            </button>
          ))}
        </div>
        <div className="overview-toolbar-right">
          <span className="overview-stream-count">
            {streamCountLabel}
            {isMock && <span className="overview-mock-badge">MOCK</span>}
          </span>
          <button
            className="overview-fullscreen-all"
            title="Fullscreen all"
            onClick={toggleFullscreen}
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Streams grid */}
      <div ref={streamsRef} className="streams" data-layout={layout}>
        {streams.length === 0 ? (
          <div className="overview-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.3">
              <rect x="2" y="6" width="14" height="12" rx="2" />
              <path d="M22 8.5l-6 3.5 6 3.5z" />
            </svg>
            <p>No active streams.</p>
          </div>
        ) : (
          streams.map((stream) => (
            <StreamCard
              key={stream.confName}
              stream={stream}
              hlsUrl={getHlsUrl(stream.confName)}
              onClick={setModalStream}
            />
          ))
        )}
      </div>

      {/* Detail modal */}
      {modalStream && (
        <OverviewModal
          streamData={modalStream}
          hlsUrl={getHlsUrl(modalStream.confName)}
          onClose={() => { setModalStream(null); registerModalMeta(null, null); }}
          onMetaUpdate={registerModalMeta}
        />
      )}
    </div>
  );
}
