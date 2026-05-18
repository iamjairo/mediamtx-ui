import { useCallback, useEffect, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';
import { loadHls } from '../../lib/hls.js';
import { useSettings } from '../../lib/settings.jsx';
import { useToast } from '../../lib/toast.jsx';
import { useViewerHint } from '../../lib/viewerHint.jsx';
import { destroyWhep, getHlsUrl, getWhepUrl, playWhep } from '../../lib/webrtc.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitCamelCase(s) {
  if (!s) return '';
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

// ── Sidebar subcomponent ──────────────────────────────────────────────────────

function StreamSidebar({ streamName, streams, sourceServer, protocol }) {
  if (!streamName) {
    return (
      <div className="viewer-info-card viewer-empty-sidebar">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.5" opacity="0.4">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        <h4>Stream Info</h4>
        <p className="muted">Select a stream to view details</p>
      </div>
    );
  }

  const stream = streams.find((s) => s.name === streamName);
  if (!stream) {
    return (
      <div className="viewer-info-card viewer-empty-sidebar">
        <h4>Stream Info</h4>
        <p className="muted">Stream not found in current server.</p>
      </div>
    );
  }

  const tracks = stream.tracks || [];
  const viewers = stream.readers?.length || 0;
  const rxMB = ((parseInt(stream.bytesReceived) || 0) / 1048576).toFixed(2);
  const txMB = ((parseInt(stream.bytesSent) || 0) / 1048576).toFixed(2);
  const sourceId = stream.source?.id || stream.src || '—';
  const sourceType = stream.sourceType || stream.source?.type || 'unknown';

  return (
    <>
      <div className="viewer-info-card viewer-name-card">
        <div className="viewer-name-row">
          <h4>{stream.name}</h4>
          <span className={`viewer-status-pill ${stream.ready ? 'on' : 'off'}`}>
            {stream.ready ? '● LIVE' : '● OFFLINE'}
          </span>
        </div>
      </div>
      <div className="viewer-info-card">
        <h5>Details</h5>
        <div className="info-row"><span>Protocol</span><span>{splitCamelCase(sourceType).toUpperCase()}</span></div>
        <div className="info-row"><span>Server</span><span>{sourceServer === 'mediamtx' ? 'MediaMTX' : 'Go2RTC'}</span></div>
        <div className="info-row"><span>Playback</span><span>{protocol.toUpperCase()}</span></div>
        <div className="info-row"><span>Viewers</span><span>{viewers}</span></div>
        <div className="info-row"><span>Received</span><span>{rxMB} MB</span></div>
        <div className="info-row"><span>Sent</span><span>{txMB} MB</span></div>
      </div>
      {tracks.length > 0 && (
        <div className="viewer-info-card">
          <h5>Tracks</h5>
          {tracks.map((t, i) => (
            <div key={i} className="track-row">{typeof t === 'string' ? t : JSON.stringify(t)}</div>
          ))}
        </div>
      )}
      <div className="viewer-info-card">
        <h5>Source</h5>
        <div className="src-text-block">{sourceId}</div>
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StreamViewerTab() {
  const { settings } = useSettings();
  const toast = useToast();
  const viewerHint = useViewerHint();

  // Persisted prefs
  const [sourceServer, setSourceServer] = useState(
    () => localStorage.getItem('streamviewer:server') || 'mediamtx'
  );
  const [protocol, setProtocol] = useState(
    () => localStorage.getItem('streamviewer:protocol') || 'hls'
  );

  const [streamName, setStreamName] = useState(null);
  const [streams, setStreams] = useState([]);
  const [isMock, setIsMock] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // null = hidden

  // Player refs — survive re-renders without triggering them
  const videoRef = useRef(null);
  const hlsRef = useRef(null);    // Hls instance
  const pcRef = useRef(null);     // RTCPeerConnection
  const stageRef = useRef(null);

  // ── Stop playback fully ─────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (pcRef.current) {
      destroyWhep(pcRef.current);
      pcRef.current = null;
    }
    const vid = videoRef.current;
    if (vid) {
      vid.srcObject = null;
      vid.removeAttribute('src');
      vid.load();
    }
  }, []);

  // ── Load stream list ────────────────────────────────────────────────────────

  const loadStreams = useCallback(async (srv) => {
    const server = srv ?? sourceServer;
    if (server === 'mediamtx') {
      try {
        const res = await fm.fetch('/mediamtx/paths/list');
        if (!res) return [];
        const data = await res.json();
        const items = (data.items || []).map((p) => ({
          name: p.name,
          ready: p.ready,
          tracks: p.tracks,
          readers: p.readers,
          bytesReceived: p.bytesReceived,
          bytesSent: p.bytesSent,
          source: p.source,
          sourceType: p.sourceType,
        }));
        setIsMock(res.headers.get('X-Mock-Fallback') === '1');
        return items;
      } catch {
        return [];
      }
    } else {
      try {
        const res = await fm.fetch('/go2rtc/api/streams');
        if (!res) return [];
        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : Object.entries(data).map(([name, info]) => ({
              name,
              src: info?.producers?.[0]?.url || '',
              ready: !!(info?.consumers?.length || info?.producers?.length),
            }));
        setIsMock(res.headers.get('X-Mock-Fallback') === '1');
        return items;
      } catch {
        return [];
      }
    }
  }, [sourceServer]);

  // ── Start playback ──────────────────────────────────────────────────────────

  const startPlayback = useCallback(async (name, srv, proto) => {
    // Always fully tear down before starting — protocol switch safety.
    stopPlayback();

    if (!name) return;

    const vid = videoRef.current;
    if (!vid) return;

    vid.style.display = 'block';
    setStatusMsg('Loading...');

    try {
      if (proto === 'webrtc') {
        const whepUrl = srv === 'go2rtc'
          ? `/go2rtc/api/webrtc?src=${encodeURIComponent(name)}`
          : getWhepUrl(name, settings);

        const pc = await playWhep(vid, whepUrl, {
          onError: (err) => {
            setStatusMsg(`WebRTC error: ${err.message}`);
            toast.error(`WebRTC error: ${err.message}`);
          },
        });
        pcRef.current = pc;
        setStatusMsg(null);
      } else {
        // HLS
        const hlsUrl = srv === 'go2rtc'
          ? `/go2rtc/api/stream.m3u8?src=${encodeURIComponent(name)}`
          : getHlsUrl(name, settings);

        const Hls = await loadHls();

        if (Hls && Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
          hlsRef.current = hls;
          hls.attachMedia(vid);
          hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(hlsUrl));
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setStatusMsg(null);
            vid.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setStatusMsg(`HLS error: ${data.type}`);
              toast.error(`HLS error: ${data.type}`);
            }
          });
        } else {
          // Native HLS (Safari)
          vid.src = hlsUrl;
          vid.addEventListener('loadeddata', () => setStatusMsg(null), { once: true });
        }
      }
    } catch (e) {
      setStatusMsg(`Playback error: ${e.message}`);
      toast.error(`Playback error: ${e.message}`);
    }
  }, [settings, stopPlayback, toast]);

  // ── Mount: consume viewer hint + initial load ───────────────────────────────

  useEffect(() => {
    let initialStream = null;
    let initialServer = sourceServer;
    let initialProtocol = protocol;

    const hint = viewerHint.get();
    if (hint) {
      if (hint.stream) initialStream = hint.stream;
      if (hint.server === 'mediamtx' || hint.server === 'go2rtc') initialServer = hint.server;
      if (hint.protocol === 'hls' || hint.protocol === 'webrtc') initialProtocol = hint.protocol;

      setSourceServer(initialServer);
      setProtocol(initialProtocol);
      localStorage.setItem('streamviewer:server', initialServer);
      localStorage.setItem('streamviewer:protocol', initialProtocol);
    }

    (async () => {
      const items = await loadStreams(initialServer);
      setStreams(items);
      if (initialStream) {
        setStreamName(initialStream);
        await startPlayback(initialStream, initialServer, initialProtocol);
      }
    })();

    return () => {
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Server switch ───────────────────────────────────────────────────────────

  const handleServerChange = useCallback(async (srv) => {
    setSourceServer(srv);
    localStorage.setItem('streamviewer:server', srv);
    const items = await loadStreams(srv);
    setStreams(items);
    stopPlayback();
    setStreamName(null);
    setStatusMsg(null);
  }, [loadStreams, stopPlayback]);

  // ── Stream select ───────────────────────────────────────────────────────────

  const handleStreamChange = useCallback(async (e) => {
    const name = e.target.value;
    setStreamName(name || null);
    if (name) {
      await startPlayback(name, sourceServer, protocol);
    } else {
      stopPlayback();
      setStatusMsg(null);
    }
  }, [sourceServer, protocol, startPlayback, stopPlayback]);

  // ── Protocol switch ─────────────────────────────────────────────────────────

  const handleProtocolChange = useCallback(async (proto) => {
    setProtocol(proto);
    localStorage.setItem('streamviewer:protocol', proto);
    if (streamName) {
      await startPlayback(streamName, sourceServer, proto);
    }
  }, [streamName, sourceServer, startPlayback]);

  // ── Fullscreen ──────────────────────────────────────────────────────────────

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      stageRef.current?.requestFullscreen?.();
    }
  }, []);

  // ── Pop-out ─────────────────────────────────────────────────────────────────

  const handlePopOut = useCallback(() => {
    if (!streamName) return;
    const hlsAddr = settings?.hls?.hlsAddress || ':8888';
    const port = hlsAddr.replace(':', '');
    window.open(
      `${window.location.origin}/viewer.html?hlsPort=${port}`,
      `stream-${streamName}`,
      'width=1024,height=576,menubar=no,toolbar=no'
    );
  }, [streamName, settings]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const showPlaceholder = !streamName;

  return (
    <div className="tab stream-viewer-tab">

      {/* ── Toolbar ── */}
      <div className="viewer-toolbar">

        {/* Server toggle */}
        <span className="toolbar-label">Server</span>
        <div className="camera-layout-group">
          {['mediamtx', 'go2rtc'].map((srv) => (
            <button
              key={srv}
              className={`camera-layout-btn${sourceServer === srv ? ' active' : ''}`}
              onClick={() => handleServerChange(srv)}
            >
              {srv === 'mediamtx' ? 'MediaMTX' : 'Go2RTC'}
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        {/* Stream select */}
        <span className="toolbar-label">Stream</span>
        <select
          className="viewer-stream-select"
          value={streamName || ''}
          onChange={handleStreamChange}
        >
          <option value="">— Select Stream —</option>
          {streams.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} {s.ready ? '●' : '○'}
            </option>
          ))}
        </select>
        {isMock && <span className="logs-mock-badge">MOCK</span>}

        <div className="toolbar-divider" />

        {/* Protocol toggle */}
        <span className="toolbar-label">Protocol</span>
        <div className="camera-layout-group">
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

        <div style={{ flex: 1 }} />

        {/* Fullscreen */}
        <button className="phase2-btn sm secondary" title="Fullscreen" onClick={handleFullscreen}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>

        {/* Pop-out */}
        <button className="phase2-btn sm secondary" title="Pop-out window" onClick={handlePopOut}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>

      {/* ── Body (stage + sidebar) ── */}
      <div className="viewer-body">

        {/* Stage */}
        <div className="viewer-stage" ref={stageRef}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            controls
            style={{ display: showPlaceholder ? 'none' : 'block' }}
          />

          {showPlaceholder && (
            <div className="viewer-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="14" height="12" rx="2" />
                <path d="M22 8.5l-6 3.5 6 3.5z" />
              </svg>
              <p>Select a stream to begin playback</p>
            </div>
          )}

          {statusMsg && (
            <div className="viewer-status-overlay">{statusMsg}</div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="viewer-sidebar">
          <StreamSidebar
            streamName={streamName}
            streams={streams}
            sourceServer={sourceServer}
            protocol={protocol}
          />
        </aside>
      </div>
    </div>
  );
}
