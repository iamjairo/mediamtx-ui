import { useCallback, useEffect, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';
import { loadHls } from '../../lib/hls.js';
import { useSettings } from '../../lib/settings.jsx';
import { useToast } from '../../lib/toast.jsx';
import { destroyWhep, getHlsUrl, getWhepUrl, playWhep } from '../../lib/webrtc.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitCamelCase(str) {
  if (!str) return '';
  return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

function getProtocolClass(sourceType) {
  if (!sourceType) return '';
  const type = sourceType.toLowerCase();
  if (type.includes('rtsp'))   return 'protocol-rtsp';
  if (type.includes('hls'))    return 'protocol-hls';
  if (type.includes('webrtc')) return 'protocol-webrtc';
  if (type.includes('rtmp'))   return 'protocol-rtmp';
  if (type.includes('srt'))    return 'protocol-srt';
  return '';
}

// ── Fullscreen modal ──────────────────────────────────────────────────────────

function FullscreenModal({ streamData, onClose, settings }) {
  const videoRef = useRef(null);
  const hlsRef   = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const url = new URL(window.location.href);
    const hlsAddr = settings?.hls?.hlsAddress || ':8888';
    const hlsUrl = `${url.protocol}//${url.hostname}${hlsAddr}/${streamData.confName}/index.m3u8`;

    let destroyed = false;

    (async () => {
      const Hls = await loadHls();
      if (destroyed) return;
      if (Hls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 5, backBufferLength: 10 });
        hlsRef.current = hls;
        hls.attachMedia(vid);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(hlsUrl));
        hls.on(Hls.Events.MANIFEST_PARSED, () => vid.play().catch(() => {}));
      } else {
        vid.src = hlsUrl;
      }
    })();

    return () => {
      destroyed = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [streamData, settings]);

  const sourceType = streamData.source?.type || '';
  const tracks     = streamData.tracks || [];
  const readers    = streamData.readers?.length || 0;
  const bytesRx    = ((parseInt(streamData.bytesReceived) || 0) / 1048576).toFixed(2);
  const bytesTx    = ((parseInt(streamData.bytesSent)    || 0) / 1048576).toFixed(2);

  return (
    <div className="camera-fullscreen-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-video-wrap">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay muted playsInline />
        </div>
        <div className="modal-info">
          <h3>{streamData.confName}</h3>
          <div className="modal-meta">
            <div className="modal-meta-row"><span>Protocol</span><span>{splitCamelCase(sourceType).toUpperCase() || '—'}</span></div>
            <div className="modal-meta-row"><span>Tracks</span><span>{tracks.join(', ') || '—'}</span></div>
            <div className="modal-meta-row"><span>Viewers</span><span>{readers}</span></div>
            <div className="modal-meta-row"><span>Received</span><span>{bytesRx} MB</span></div>
            <div className="modal-meta-row"><span>Sent</span><span>{bytesTx} MB</span></div>
            {streamData.source?.id && (
              <div className="modal-meta-row"><span>Source</span><span className="modal-source">{streamData.source.id}</span></div>
            )}
          </div>
          <button className="phase2-btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Individual camera cell ────────────────────────────────────────────────────
// Each cell manages its own HLS instance and/or WebRTC peer connection via refs,
// matching the RecordingsTab per-card destructor pattern.

function CameraCell({ streamData, protocol, settings, onFullscreen, onPopOut }) {
  const videoRef  = useRef(null);
  const hlsRef    = useRef(null);
  const pcRef     = useRef(null);

  const sourceType    = streamData.source?.type || '';
  const protocolClass = getProtocolClass(sourceType);
  const readersCount  = streamData.readers?.length || 0;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    let destroyed = false;

    const hlsUrl = getHlsUrl(streamData.confName || streamData.name, settings);

    async function startHls(targetVid, targetUrl) {
      const Hls = await loadHls();
      if (destroyed) return;
      if (Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 5,
          backBufferLength: 10,
        });
        hlsRef.current = hls;
        hls.attachMedia(targetVid);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(targetUrl));
        hls.on(Hls.Events.MANIFEST_PARSED, () => targetVid.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          if (data.type === window.Hls?.ErrorTypes?.NETWORK_ERROR) {
            setTimeout(() => { hls.loadSource(targetUrl); hls.startLoad(); }, 3000);
          } else if (data.type === window.Hls?.ErrorTypes?.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        });
      } else {
        targetVid.src = targetUrl;
      }
    }

    if (protocol === 'webrtc') {
      const whepUrl = getWhepUrl(streamData.confName || streamData.name, settings);
      playWhep(vid, whepUrl, {
        onError: () => {
          // Graceful fallback to HLS on WebRTC failure
          if (pcRef.current) { destroyWhep(pcRef.current); pcRef.current = null; }
          startHls(vid, hlsUrl);
        },
      }).then((pc) => {
        if (destroyed) { destroyWhep(pc); return; }
        pcRef.current = pc;
      }).catch(() => {
        if (!destroyed) startHls(vid, hlsUrl);
      });
    } else {
      startHls(vid, hlsUrl);
    }

    return () => {
      destroyed = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (pcRef.current)  { destroyWhep(pcRef.current); pcRef.current = null; }
    };
    // Protocol or settings change → full teardown + restart via key on parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`camera-cell${protocolClass ? ` ${protocolClass}` : ''}`}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} autoPlay muted playsInline />

      <div className="overlay">
        <span className="stream-name">{streamData.confName || streamData.name}</span>
        <div className="overlay-badges">
          {sourceType && (
            <span className={`protocol-badge ${protocolClass}`}>
              {splitCamelCase(sourceType).toUpperCase()}
            </span>
          )}
          <span className="viewer-badge">
            {readersCount} viewer{readersCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="cell-actions">
        <button
          className="cell-action-btn"
          title="Fullscreen"
          onClick={(e) => { e.stopPropagation(); onFullscreen(streamData); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
        <button
          className="cell-action-btn"
          title="Pop-out"
          onClick={(e) => { e.stopPropagation(); onPopOut(streamData); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const POLL_INTERVAL = 2000;

export default function CameraWallTab() {
  const { settings } = useSettings();
  const toast = useToast();

  const [layout,   setLayout]   = useState(() => localStorage.getItem('camerawall:layout')   || '2x2');
  const [protocol, setProtocol] = useState(() => localStorage.getItem('camerawall:protocol') || 'hls');

  const [streams,    setStreams]    = useState([]);
  const [isMock,     setIsMock]     = useState(false);
  const [modalData,  setModalData]  = useState(null);

  // Bump this to force all CameraCell instances to remount (teardown + restart)
  // when protocol changes. Avoids prop-drilling a "restart" signal.
  const [cellEpoch, setCellEpoch] = useState(0);

  const wallRef = useRef(null);

  // ── Load streams ────────────────────────────────────────────────────────────

  const loadStreams = useCallback(async () => {
    try {
      const res = await fm.fetch('/mediamtx/paths/list');
      if (!res) return;
      const data = await res.json();
      if (data.items) {
        setStreams(data.items);
        setIsMock(res.headers.get('X-Mock-Fallback') === '1');
      }
    } catch {
      // silent — keep last known list
    }
  }, []);

  // ── Mount: initial load + polling ───────────────────────────────────────────

  useEffect(() => {
    loadStreams();
    const id = setInterval(loadStreams, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadStreams]);

  // ── Layout ──────────────────────────────────────────────────────────────────

  const handleLayoutChange = useCallback((l) => {
    setLayout(l);
    localStorage.setItem('camerawall:layout', l);
  }, []);

  // ── Protocol ────────────────────────────────────────────────────────────────

  const handleProtocolChange = useCallback((p) => {
    setProtocol(p);
    localStorage.setItem('camerawall:protocol', p);
    // Force all cells to remount so they tear down old players cleanly
    setCellEpoch((n) => n + 1);
  }, []);

  // ── Fullscreen / pop-out / detach ───────────────────────────────────────────

  const handleFullscreen = useCallback((streamData) => {
    setModalData(streamData);
  }, []);

  const handlePopOut = useCallback((streamData) => {
    const hlsAddr = settings?.hls?.hlsAddress || ':8888';
    const port = hlsAddr.replace(':', '');
    window.open(
      `${window.location.origin}/viewer.html?hlsPort=${port}`,
      `stream-${streamData.confName}`,
      'width=960,height=540,menubar=no,toolbar=no'
    );
  }, [settings]);

  const handleDetach = useCallback(() => {
    const hlsAddr = settings?.hls?.hlsAddress || ':8888';
    const port = hlsAddr.replace(':', '');
    window.open(
      `${window.location.origin}/viewer.html?hlsPort=${port}`,
      'camera-wall-viewer',
      'width=1280,height=720,menubar=no,toolbar=no'
    );
  }, [settings]);

  const handleWallFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wallRef.current?.requestFullscreen?.();
  }, []);

  // ── Grid geometry ───────────────────────────────────────────────────────────

  const [cols, rows] = layout.split('x').map(Number);
  const maxCells = cols * rows;
  const streamCount = streams.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="tab camera-wall" ref={wallRef}>

      {/* ── Toolbar ── */}
      <div className="camera-toolbar">

        {/* Layout buttons */}
        <div className="camera-layout-group">
          {['1x1', '2x2', '3x3', '4x4'].map((l) => (
            <button
              key={l}
              className={`camera-layout-btn${layout === l ? ' active' : ''}`}
              onClick={() => handleLayoutChange(l)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Protocol buttons */}
        <div className="camera-layout-group camera-proto-group">
          {['hls', 'webrtc'].map((p) => (
            <button
              key={p}
              className={`camera-layout-btn${protocol === p ? ' active' : ''}`}
              onClick={() => handleProtocolChange(p)}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Right group */}
        <div className="camera-toolbar-right">
          <span className="camera-stream-count">
            {streamCount} stream{streamCount !== 1 ? 's' : ''}
            {isMock && <span className="logs-mock-badge" style={{ marginLeft: 6 }}>MOCK</span>}
          </span>

          <button
            className="phase2-btn sm secondary"
            onClick={loadStreams}
          >
            Refresh
          </button>

          <button
            className="phase2-btn sm"
            title="Detach camera wall into a standalone viewer window"
            onClick={handleDetach}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: '-2px', marginRight: 4 }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open in Browser
          </button>

          <button
            className="phase2-btn sm secondary"
            title="Fullscreen"
            onClick={handleWallFullscreen}
          >
            ⛶
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="camera-grid" data-layout={layout}>
        {Array.from({ length: maxCells }).map((_, i) => {
          const streamData = streams[i];
          if (!streamData) {
            return (
              <div key={`empty-${i}`} className="camera-cell camera-cell-empty">
                <span>No stream</span>
              </div>
            );
          }
          return (
            <CameraCell
              key={`${cellEpoch}-${streamData.name || streamData.confName}-${i}`}
              streamData={streamData}
              protocol={protocol}
              settings={settings}
              onFullscreen={handleFullscreen}
              onPopOut={handlePopOut}
            />
          );
        })}
      </div>

      {/* ── Fullscreen modal ── */}
      {modalData && (
        <FullscreenModal
          streamData={modalData}
          onClose={() => setModalData(null)}
          settings={settings}
        />
      )}
    </div>
  );
}
