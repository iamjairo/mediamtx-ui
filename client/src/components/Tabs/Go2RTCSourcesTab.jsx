import { useEffect, useMemo, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';
import { useToast } from '../../lib/toast.jsx';

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectType(src) {
  if (!src) return '';
  const s = src.toLowerCase();
  if (s.startsWith('rtsp')) return 'rtsp';
  if (s.startsWith('rtmp')) return 'rtmp';
  if (s.startsWith('http') && s.includes('m3u8')) return 'hls';
  if (s.startsWith('http')) return 'http';
  if (s.startsWith('webrtc') || s.startsWith('whep')) return 'webrtc';
  if (s.startsWith('srt')) return 'srt';
  if (s.startsWith('ffmpeg')) return 'ffmpeg';
  if (s.startsWith('exec')) return 'exec';
  return 'other';
}

function getMockStreams() {
  return [
    { name: 'cam-front-door', src: 'rtsp://admin:pass@192.168.1.50:554/h264', ready: true },
    { name: 'cam-backyard',   src: 'rtsp://admin:pass@192.168.1.51:554/h264', ready: true },
    { name: 'cam-garage',     src: 'rtsp://admin:pass@192.168.1.52:554/h264', ready: false },
    { name: 'cam-driveway',   src: 'rtsp://admin:pass@192.168.1.53:554/h264', ready: false },
  ];
}

// ── Add/Edit modal ────────────────────────────────────────────────────────────

function StreamDialog({ stream, onClose, onSave }) {
  // When editing, name is locked (API uses it as key).
  const [name, setName] = useState(stream?.name ?? '');
  const [src,  setSrc]  = useState(stream?.src  ?? '');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function handleSave() {
    const trimName = name.trim();
    const trimSrc  = src.trim();
    if (!trimName || !trimSrc) {
      toast.error('Name and source URL are required');
      return;
    }
    setBusy(true);
    await onSave(trimName, trimSrc, !!stream);
    setBusy(false);
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="sources-dialog" onClick={handleBackdrop}>
      <div className="sources-dialog-backdrop" onClick={onClose} />
      <div className="sources-dialog-content">
        <h3>{stream ? 'Edit Stream' : 'Add Go2RTC Stream'}</h3>

        <div className="sources-form-row">
          <label>Name</label>
          <input
            type="text"
            className="dlg-name"
            value={name}
            disabled={!!stream}
            placeholder="cam-front-door"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="sources-form-row">
          <label>Source URL</label>
          <input
            type="text"
            className="dlg-src"
            value={src}
            placeholder="rtsp://user:pass@host:554/path"
            onChange={(e) => setSrc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        <div className="sources-dialog-actions">
          <button className="phase2-btn sm secondary dlg-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="phase2-btn sm dlg-save" disabled={busy} onClick={handleSave}>
            {stream ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Go2RTCSourcesTab() {
  const [streams, setStreams] = useState([]);
  const [isMock, setIsMock]  = useState(false);
  const [search, setSearch]  = useState('');
  const [dialog, setDialog]  = useState(null); // null | 'add' | stream-object (edit)
  const toast = useToast();

  async function loadStreams() {
    try {
      const res = await fm.fetch('/go2rtc/api/streams');
      if (!res || !res.ok) throw new Error('failed');
      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : Object.entries(data).map(([name, info]) => ({
            name,
            src: info?.producers?.[0]?.url || info?.src || '',
            ready: !!(info?.consumers?.length || info?.producers?.length),
            info,
          }));
      setStreams(arr);
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch {
      setStreams(getMockStreams());
      setIsMock(true);
    }
  }

  useEffect(() => {
    loadStreams();
    const id = setInterval(loadStreams, 5000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return streams;
    const q = search.toLowerCase();
    return streams.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.src || '').toLowerCase().includes(q)
    );
  }, [streams, search]);

  async function handleSave(name, src, isEdit) {
    try {
      const url = `/go2rtc/api/streams?src=${encodeURIComponent(name)}`;
      const res = await fm.fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: src,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(isEdit ? 'Stream updated' : 'Stream created');
      setDialog(null);
      await loadStreams();
    } catch (e) {
      toast.error(`Failed to save: ${e.message}`);
    }
  }

  async function handleDelete(stream) {
    if (!confirm(`Delete stream "${stream.name}"?`)) return;
    try {
      const res = await fm.fetch(
        `/go2rtc/api/streams?src=${encodeURIComponent(stream.name)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Stream deleted');
      await loadStreams();
    } catch (e) {
      toast.error(`Failed to delete: ${e.message}`);
    }
  }

  const countLabel = `${streams.length} stream${streams.length !== 1 ? 's' : ''}`;

  return (
    <div className="tab go2rtc-tab">
      {/* Header */}
      <div className="sources-header">
        <div className="sources-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <div>
            <h2 className="sources-title">Go2RTC Sources</h2>
            <p className="sources-subtitle">
              Manage Go2RTC streams — RTSP, WebRTC, snapshots
              {isMock && <> <span className="sources-mock-badge">MOCK</span></>}
            </p>
          </div>
        </div>
        <div className="sources-header-right">
          <span className="sources-count-badge">{countLabel}</span>
          <button className="phase2-btn sm secondary sources-refresh-btn" onClick={loadStreams}>
            Refresh
          </button>
          <button className="phase2-btn sm sources-add-btn" onClick={() => setDialog('add')}>
            + Add Stream
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
            placeholder="Search streams..."
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
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <p>
              {streams.length === 0
                ? 'No Go2RTC streams configured. Click "Add Stream" to create one.'
                : 'No streams match your search.'}
            </p>
          </div>
        ) : (
          <table className="sources-table">
            <thead>
              <tr>
                <th className="col-status"></th>
                <th className="col-name">Name</th>
                <th className="col-source">Source</th>
                <th className="col-type">Type</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const type = detectType(s.src);
                return (
                  <tr key={s.name}>
                    <td className="col-status">
                      <span className={`status-dot ${s.ready ? 'on' : 'off'}`} />
                    </td>
                    <td className="col-name">{s.name}</td>
                    <td className="col-source">
                      <span className="src-text" title={s.src}>{s.src}</span>
                    </td>
                    <td className="col-type">
                      <span className={`proto-badge protocol-${type}`}>
                        {type.toUpperCase()}
                      </span>
                    </td>
                    <td className="col-actions">
                      <button
                        className="src-action-btn src-edit-btn"
                        title="Edit"
                        onClick={() => setDialog(s)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="src-action-btn src-del-btn"
                        title="Delete"
                        onClick={() => handleDelete(s)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
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

      {/* Modal */}
      {dialog !== null && (
        <StreamDialog
          stream={dialog === 'add' ? null : dialog}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
