import { useEffect, useMemo, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds) || seconds === 0) return 'Live';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function deriveDisplayName(path) {
  const last = path.split('/').pop() || path;
  return last.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function flattenRecordings(paths) {
  const recs = [];
  for (const p of paths) {
    for (const seg of p.segments || []) {
      const start = new Date(seg.start);
      const dur = seg.duration || 0;
      const end = dur > 0 ? new Date(start.getTime() + dur * 1000) : null;
      recs.push({
        id: `${p.name}-${seg.start}`,
        pathName: p.name,
        displayName: deriveDisplayName(p.name),
        startTime: start,
        endTime: end,
        duration: dur,
        status: dur === 0 ? 'recording' : 'complete',
        filename: `${p.name.replace(/\//g, '_')}_${start.toISOString().replace(/[:.]/g, '-')}.mp4`,
      });
    }
  }
  return recs.sort((a, b) => b.startTime - a.startTime);
}

function getMockRecordings() {
  const now = Date.now();
  return [
    { id: 'mock-1', pathName: 'cam/front-door',    displayName: 'Front Door',   startTime: new Date(now - 3600000),  endTime: new Date(now - 1800000), duration: 1800, status: 'complete',  filename: 'cam_front-door_recording.mp4' },
    { id: 'mock-2', pathName: 'cam/backyard',       displayName: 'Backyard',     startTime: new Date(now - 600000),   endTime: null,                    duration: 0,    status: 'recording', filename: 'cam_backyard_live.mp4' },
    { id: 'mock-3', pathName: 'cam/garage',         displayName: 'Garage',       startTime: new Date(now - 86400000), endTime: new Date(now - 82800000), duration: 3600, status: 'complete',  filename: 'cam_garage_overnight.mp4' },
    { id: 'mock-4', pathName: 'stream/rtmp-ingest', displayName: 'RTMP Ingest',  startTime: new Date(now - 7200000),  endTime: new Date(now - 3600000),  duration: 3600, status: 'complete',  filename: 'stream_rtmp-ingest.mp4' },
  ];
}

function getPlaybackUrl(rec) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams({ path: rec.pathName, start: rec.startTime.toISOString() });
  if (rec.duration > 0) params.set('duration', String(rec.duration));
  // recordAddress default matches vanilla's fallback
  return `${url.protocol}//${url.hostname}:9996/get?${params.toString()}`;
}

// ── HLS player util ───────────────────────────────────────────────────────────

function attachHls(videoEl, hlsUrl, onDestroy) {
  if (typeof window.Hls === 'undefined' || !window.Hls.isSupported()) {
    videoEl.src = hlsUrl;
    return;
  }
  const hls = new window.Hls({ enableWorker: true, lowLatencyMode: false });
  hls.attachMedia(videoEl);
  hls.on(window.Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(hlsUrl));
  hls.on(window.Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(() => {}));
  hls.on(window.Hls.Events.ERROR, (_, data) => {
    if (data.fatal && data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
      videoEl.src = hlsUrl;
    }
  });
  onDestroy(() => hls.destroy());
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function RecordingModal({ rec, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    let destroy = () => {};
    attachHls(videoRef.current, getPlaybackUrl(rec), (fn) => { destroy = fn; });
    return () => destroy();
  }, [rec]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const durStr = formatDuration(rec.duration);
  const statusClass =
    rec.status === 'recording' ? 'rec-status-live'
    : rec.status === 'complete' ? 'rec-status-complete'
    : 'rec-status-failed';

  return (
    <div className="rec-modal">
      <div className="rec-modal-backdrop" onClick={onClose} />
      <div className="rec-modal-content">
        <button className="rec-modal-close" onClick={onClose}>&times;</button>
        <div className="rec-modal-video-wrap">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay muted playsInline controls />
        </div>
        <div className="rec-modal-info">
          <h3>{rec.displayName}</h3>
          <div className="rec-modal-meta">
            <div className="rec-modal-row"><span>Path</span><span>{rec.pathName}</span></div>
            <div className="rec-modal-row"><span>Duration</span><span>{durStr}</span></div>
            <div className="rec-modal-row">
              <span>Status</span>
              <span className={statusClass}>{rec.status.toUpperCase()}</span>
            </div>
            <div className="rec-modal-row"><span>Started</span><span>{rec.startTime.toLocaleString()}</span></div>
            {rec.endTime && (
              <div className="rec-modal-row"><span>Ended</span><span>{rec.endTime.toLocaleString()}</span></div>
            )}
            <div className="rec-modal-row"><span>File</span><span className="rec-mono">{rec.filename}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function RecordingCard({ rec, onOpenModal }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);
  const hlsDestroyRef = useRef(null);

  function togglePlay(e) {
    e.stopPropagation();
    if (playing) {
      hlsDestroyRef.current?.();
      hlsDestroyRef.current = null;
      if (videoRef.current) videoRef.current.src = '';
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  }

  useEffect(() => {
    if (!playing || !videoRef.current) return;
    attachHls(videoRef.current, getPlaybackUrl(rec), (fn) => { hlsDestroyRef.current = fn; });
    return () => {
      hlsDestroyRef.current?.();
      hlsDestroyRef.current = null;
    };
  }, [playing, rec]);

  const statusClass =
    rec.status === 'recording' ? 'rec-status-live'
    : rec.status === 'failed' ? 'rec-status-failed'
    : 'rec-status-complete';
  const statusLabel =
    rec.status === 'recording' ? 'REC'
    : rec.status === 'failed' ? 'FAILED'
    : 'COMPLETE';
  const durStr = formatDuration(rec.duration);

  return (
    <div className="rec-card" onClick={() => onOpenModal(rec)}>
      <div className="rec-card-preview">
        {!playing && (
          <div className="rec-card-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}
        {playing && (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            controls
            className="rec-card-video"
          />
        )}
        <span className="rec-card-duration">{durStr}</span>
        {rec.status === 'recording' && <span className="rec-card-live-pill">REC</span>}
        <button className="rec-card-play-overlay" title="Play" onClick={togglePlay}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      </div>
      <div className="rec-card-body">
        <div className="rec-card-name">{rec.displayName}</div>
        <div className="rec-card-path">{rec.pathName}</div>
        <div className="rec-card-meta">
          <span className={`rec-card-status ${statusClass}`}>{statusLabel}</span>
          <span className="rec-card-time">{rec.startTime.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RecordingsTab() {
  const [recordings, setRecordings] = useState([]);
  const [isMock, setIsMock]         = useState(false);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalRec, setModalRec]     = useState(null);

  async function loadRecordings() {
    try {
      const res = await fm.fetch('/mediamtx/recordings/list');
      if (!res) return;
      const body = await res.json();
      const items = Array.isArray(body) ? body : body.items || [];
      setRecordings(flattenRecordings(items));
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch {
      setRecordings(getMockRecordings());
      setIsMock(true);
    }
  }

  useEffect(() => {
    loadRecordings();
    const id = setInterval(loadRecordings, 10000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return recordings.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.pathName.toLowerCase().includes(q) && !r.displayName.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [recordings, search, statusFilter]);

  const countLabel = `${recordings.length} clip${recordings.length !== 1 ? 's' : ''}`;

  return (
    <div className="tab recordings-tab">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7"  y1="2"  x2="7"  y2="22" />
            <line x1="17" y1="2"  x2="17" y2="22" />
            <line x1="2"  y1="12" x2="22" y2="12" />
            <line x1="2"  y1="7"  x2="7"  y2="7"  />
            <line x1="2"  y1="17" x2="7"  y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7"  x2="22" y2="7"  />
          </svg>
          <div>
            <h2 className="rec-title">Recordings</h2>
            <p className="rec-subtitle">
              Browse and play back recorded streams
              {isMock && <> <span className="rec-mock-badge">MOCK</span></>}
            </p>
          </div>
        </div>
        <div className="rec-header-right">
          <span className="rec-count-badge">{countLabel}</span>
          <button className="phase2-btn sm secondary rec-refresh-btn" onClick={loadRecordings}>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rec-filter-bar">
        <div className="rec-search-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="rec-search"
            placeholder="Search recordings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rec-status-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="complete">Complete</option>
          <option value="recording">Recording</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Grid */}
      <div className="rec-grid">
        {filtered.length === 0 ? (
          <div className="rec-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7"  y1="2"  x2="7"  y2="22" />
              <line x1="17" y1="2"  x2="17" y2="22" />
              <line x1="2"  y1="12" x2="22" y2="12" />
            </svg>
            <p>
              {recordings.length === 0
                ? 'No recordings found. Streams will appear here when recording is enabled.'
                : 'No recordings match your filters.'}
            </p>
          </div>
        ) : (
          filtered.map((rec) => (
            <RecordingCard key={rec.id} rec={rec} onOpenModal={setModalRec} />
          ))
        )}
      </div>

      {/* Detail modal */}
      {modalRec && (
        <RecordingModal rec={modalRec} onClose={() => setModalRec(null)} />
      )}
    </div>
  );
}
