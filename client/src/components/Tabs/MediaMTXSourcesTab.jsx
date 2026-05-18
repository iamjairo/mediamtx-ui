import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fm } from '../../lib/fetchManager.js';
import { useViewerHint } from '../../lib/viewerHint.jsx';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(b) {
  if (!b || b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getProtocolClass(type) {
  if (!type) return '';
  const t = type.toLowerCase();
  if (t.includes('rtsp')) return 'protocol-rtsp';
  if (t.includes('rtmp')) return 'protocol-rtmp';
  if (t.includes('hls')) return 'protocol-hls';
  if (t.includes('webrtc')) return 'protocol-webrtc';
  if (t.includes('srt')) return 'protocol-srt';
  return '';
}

function splitCamelCase(s) {
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

function getMockPaths() {
  return [
    { name: 'cam/front-door', source: { type: 'rtspSource', id: 'rtsp://192.168.1.50:554/h264' }, sourceType: 'rtspSource', ready: true, tracks: ['H264 1920x1080', 'AAC 48kHz'], readers: [{}, {}], bytesReceived: 2100000, bytesSent: 850000 },
    { name: 'cam/backyard', source: { type: 'rtspSource', id: 'rtsp://192.168.1.51:554/h264' }, sourceType: 'rtspSource', ready: true, tracks: ['H264 1280x720'], readers: [{}], bytesReceived: 1500000, bytesSent: 350000 },
    { name: 'cam/garage', source: { type: 'rtspSource', id: 'rtsp://192.168.1.52:554/h264' }, sourceType: 'rtspSource', ready: false, tracks: [], readers: [], bytesReceived: 0, bytesSent: 0 },
    { name: 'cam/driveway', source: { type: 'rtspSource', id: 'rtsp://192.168.1.53:554/h264' }, sourceType: 'rtspSource', ready: false, tracks: [], readers: [], bytesReceived: 0, bytesSent: 0 },
    { name: 'ingest/rtmp-source', source: { type: 'rtmpSource', id: 'rtmp://192.168.1.10/live/cam5' }, sourceType: 'rtmpSource', ready: true, tracks: ['H264 1920x1080', 'AAC 44.1kHz'], readers: [{}], bytesReceived: 980000, bytesSent: 400000 },
    { name: 'restream/hls-proxy', source: { type: 'hlsSource', id: 'https://example.com/stream.m3u8' }, sourceType: 'hlsSource', ready: true, tracks: ['H264 1920x1080'], readers: [{}, {}, {}], bytesReceived: 0, bytesSent: 2100000 },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MediaMTXSourcesTab() {
  const [paths, setPaths] = useState([]);
  const [isMock, setIsMock] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const viewerHint = useViewerHint();

  async function loadPaths() {
    try {
      const res = await fm.fetch('/mediamtx/paths/list');
      if (!res) return;
      const data = await res.json();
      setPaths(data.items || []);
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch {
      setPaths(getMockPaths());
      setIsMock(true);
    }
  }

  useEffect(() => {
    loadPaths();
    const id = setInterval(loadPaths, 5000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return paths;
    const q = search.toLowerCase();
    return paths.filter((p) => p.name.toLowerCase().includes(q));
  }, [paths, search]);

  const readyCount = paths.filter((p) => p.ready).length;

  function handleView(p) {
    viewerHint.set({ stream: p.name, server: 'mediamtx' });
    navigate('/streamviewer');
  }

  return (
    <div className="tab sources-tab">
      {/* Header */}
      <div className="sources-header">
        <div className="sources-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <div>
            <h2 className="sources-title">MediaMTX Sources</h2>
            <p className="sources-subtitle">
              Live MediaMTX path status — read-only monitoring view
              {isMock && <> <span className="sources-mock-badge">MOCK</span></>}
            </p>
          </div>
        </div>
        <div className="sources-header-right">
          <span className="sources-count-badge">
            {readyCount} / {paths.length} ready
          </span>
          <button className="phase2-btn sm secondary sources-refresh-btn" onClick={loadPaths}>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sources-filter-bar">
        <div className="sources-search-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="sources-search"
            placeholder="Search paths..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="sources-table-wrap">
        {filtered.length === 0 ? (
          <div className="sources-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.5">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            <p>
              {paths.length === 0
                ? 'No paths configured. Add streams from the Streams tab.'
                : 'No paths match your search.'}
            </p>
          </div>
        ) : (
          <table className="sources-table">
            <thead>
              <tr>
                <th className="col-status"></th>
                <th className="col-name">Path</th>
                <th className="col-source">Source</th>
                <th className="col-type">Type</th>
                <th className="col-tracks">Tracks</th>
                <th className="col-viewers">Viewers</th>
                <th className="col-bytes">Received</th>
                <th className="col-bytes">Sent</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const ready = p.ready === true;
                const sourceType = p.sourceType || p.source?.type || '';
                const protocolClass = getProtocolClass(sourceType);
                const sourceTypeLabel = splitCamelCase(sourceType).toUpperCase() || '—';
                const sourceId =
                  typeof p.source === 'object' && p.source !== null
                    ? p.source.id || p.source.type || JSON.stringify(p.source)
                    : p.source || '—';
                const tracks = (Array.isArray(p.tracks) ? p.tracks : []).map((t) =>
                  typeof t === 'string' ? t : t.codec || t.type || '?'
                );
                const viewers = p.readers?.length || 0;

                return (
                  <tr key={p.name}>
                    <td className="col-status">
                      <span className={`status-dot ${ready ? 'on' : 'off'}`} />
                    </td>
                    <td className="col-name">{p.name}</td>
                    <td className="col-source">
                      <span className="src-text" title={sourceId}>{sourceId}</span>
                    </td>
                    <td className="col-type">
                      <span className={`proto-badge ${protocolClass}`}>{sourceTypeLabel}</span>
                    </td>
                    <td className="col-tracks">
                      {tracks.length > 0
                        ? tracks.join(', ')
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-viewers">
                      <span className="viewers-num">{viewers}</span>
                    </td>
                    <td className="col-bytes">{formatBytes(parseInt(p.bytesReceived) || 0)}</td>
                    <td className="col-bytes">{formatBytes(parseInt(p.bytesSent) || 0)}</td>
                    <td className="col-actions">
                      <button
                        className="src-view-btn"
                        title="Open in Stream Viewer"
                        disabled={!ready}
                        onClick={() => handleView(p)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
