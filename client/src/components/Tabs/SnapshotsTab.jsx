import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fm } from '../../lib/fetchManager.js';
import { useViewerHint } from '../../lib/viewerHint.jsx';

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

function snapshotUrl(name) {
  return `/go2rtc/api/frame.jpeg?src=${encodeURIComponent(name)}&_t=${Date.now()}`;
}

const INTERVALS = [2, 5, 10, 30];

// ── Per-stream snapshot card ───────────────────────────────────────────────────

// bustKey increments each refresh cycle; changing it causes <img> to re-fetch
// because the key prop remounts the element with a new src.
function SnapCard({ stream, bustKey, onView }) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when bustKey advances (new image attempt).
  useEffect(() => { setImgError(false); }, [bustKey]);

  const sourceType    = stream.source?.type || '';
  const protocolClass = getProtocolClass(sourceType);
  const viewers       = stream.readers?.length ?? 0;

  return (
    <article className={`snap-card${stream.ready ? '' : ' offline'}`}>
      <div className={`snap-thumb${imgError ? ' snap-img-error' : ''}`}>
        {stream.ready && (
          // Use bustKey in the key so React remounts img when we want a new frame.
          <img
            key={bustKey}
            className="snap-img"
            src={snapshotUrl(stream.confName)}
            alt={stream.confName}
            loading="lazy"
            onError={() => setImgError(true)}
            onLoad={() => setImgError(false)}
          />
        )}

        {/* No-signal fallback shown when offline or img failed */}
        <div className="snap-no-signal">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>No signal</span>
        </div>

        <span className={`snap-status-pill ${stream.ready ? 'on' : 'off'}`}>
          {stream.ready ? '● LIVE' : '● OFFLINE'}
        </span>

        {sourceType && (
          <span className={`snap-proto ${protocolClass}`}>
            {splitCamelCase(sourceType).toUpperCase()}
          </span>
        )}
      </div>

      <div className="snap-card-body">
        <h4 className="snap-name" title={stream.confName}>{stream.confName}</h4>
        <div className="snap-meta">
          <span>{viewers} viewer{viewers !== 1 ? 's' : ''}</span>
          <button
            className="snap-view-btn"
            title="Open in Stream Viewer"
            onClick={(e) => { e.stopPropagation(); onView(stream); }}
            disabled={!stream.ready}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            View
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SnapshotsTab() {
  const navigate     = useNavigate();
  const viewerHint   = useViewerHint();

  const [streams, setStreams]         = useState([]);
  const [isMock, setIsMock]           = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(
    () => parseInt(localStorage.getItem('snapshots:refresh'), 10) || 5
  );
  // bustKey is an integer that increments on each snapshot refresh cycle.
  // Cards compare their local copy with the current value to trigger re-fetch.
  const [bustKey, setBustKey]         = useState(0);

  // Keep a stable ref to current streams for use inside interval callbacks
  // without stale closure issues.
  const streamsRef = useRef(streams);
  useEffect(() => { streamsRef.current = streams; }, [streams]);

  // ── Stream list polling (5 s) ──────────────────────────────────────────────

  const loadStreams = useCallback(async () => {
    try {
      const res = await fm.fetch('/mediamtx/paths/list');
      if (!res) return;
      const data = await res.json();
      if (data.items) setStreams(data.items);
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch {
      setStreams([]);
    }
  }, []);

  useEffect(() => {
    loadStreams();
    const id = setInterval(loadStreams, 5000);
    return () => clearInterval(id);
  }, [loadStreams]);

  // ── Snapshot refresh cycle (user-controlled interval) ─────────────────────

  useEffect(() => {
    const id = setInterval(() => setBustKey((k) => k + 1), refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refreshInterval]);

  function changeInterval(sec) {
    setRefreshInterval(sec);
    localStorage.setItem('snapshots:refresh', String(sec));
  }

  function refreshNow() {
    setBustKey((k) => k + 1);
  }

  // ── Navigation to viewer ───────────────────────────────────────────────────

  function handleView(stream) {
    if (!stream.ready) return;
    viewerHint.set({ stream: stream.confName, server: 'mediamtx' });
    navigate('/streamviewer');
  }

  // ── Derived counts ─────────────────────────────────────────────────────────

  const readyCount = streams.filter((s) => s.ready).length;
  const countLabel = `${readyCount} / ${streams.length} live`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="tab snapshots-tab">
      {/* Header */}
      <div className="snap-header">
        <div className="snap-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          <div>
            <h2>Snapshots</h2>
            <p>
              Live thumbnail grid — auto-refreshes every{' '}
              <span className="snap-interval-label">{refreshInterval}s</span>
              {isMock && <> <span className="snap-mock-badge">MOCK</span></>}
            </p>
          </div>
        </div>
        <div className="snap-header-right">
          <span className="snap-count-badge">{countLabel}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="snap-toolbar">
        <div className="snap-interval-group">
          <span className="snap-toolbar-label">Refresh</span>
          {INTERVALS.map((sec) => (
            <button
              key={sec}
              className={`snap-interval-btn${refreshInterval === sec ? ' active' : ''}`}
              onClick={() => changeInterval(sec)}
            >
              {sec}s
            </button>
          ))}
        </div>
        <div className="snap-toolbar-right">
          <button className="phase2-btn sm secondary" onClick={refreshNow}>Refresh Now</button>
        </div>
      </div>

      {/* Grid */}
      <div className="snap-grid">
        {streams.length === 0 ? (
          <div className="snap-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.3">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <p>No streams to display snapshots from.</p>
          </div>
        ) : (
          streams.map((stream) => (
            <SnapCard
              key={stream.confName}
              stream={stream}
              bustKey={bustKey}
              onView={handleView}
            />
          ))
        )}
      </div>
    </div>
  );
}
