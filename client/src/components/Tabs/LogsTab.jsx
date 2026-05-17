import { useEffect, useMemo, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';

const LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [isMock, setIsMock] = useState(false);
  const [search, setSearch] = useState('');
  const [enabledLevels, setEnabledLevels] = useState(() => new Set(LEVELS));
  const [autoScroll, setAutoScroll] = useState(true);
  const panelRef = useRef(null);

  async function loadLogs() {
    try {
      const res = await fm.fetch('/mediamtx/logs');
      if (!res) return;
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.items || []);
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch {
      setIsMock(false);
    }
  }

  useEffect(() => {
    loadLogs();
    const id = setInterval(loadLogs, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (autoScroll && panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((entry) => {
      if (!enabledLevels.has((entry.level || 'INFO').toUpperCase())) return false;
      if (!q) return true;
      return (entry.message || '').toLowerCase().includes(q);
    });
  }, [logs, search, enabledLevels]);

  function toggleLevel(level) {
    setEnabledLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  return (
    <div className="tab logs-tab">
      <div className="logs-header">
        <div className="logs-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <div>
            <h2 className="logs-title">System Logs</h2>
            <p className="logs-subtitle">
              Real-time log stream from MediaMTX
              {isMock && <> <span className="logs-mock-badge">MOCK</span></>}
            </p>
          </div>
        </div>
        <div className="logs-header-right">
          <button className="phase2-btn sm secondary" onClick={() => setLogs([])}>Clear</button>
          <button className="phase2-btn sm secondary" onClick={loadLogs}>Refresh</button>
        </div>
      </div>

      <div className="logs-filter-bar">
        <div className="logs-search-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="logs-search"
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="logs-level-group">
          {LEVELS.map((level) => (
            <button
              key={level}
              className={`logs-level-btn level-${level.toLowerCase()}${enabledLevels.has(level) ? ' active' : ''}`}
              onClick={() => toggleLevel(level)}
            >
              {level}
            </button>
          ))}
        </div>
        <label className="logs-autoscroll">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          <span>Auto-scroll</span>
        </label>
      </div>

      <div ref={panelRef} className="logs-panel">
        {filtered.length === 0 ? (
          <div className="logs-empty">No log entries match the current filters.</div>
        ) : (
          filtered.map((entry, i) => (
            <div className="log-line" key={i}>
              <span className="log-time">
                {entry.time ? new Date(entry.time).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'}
              </span>{' '}
              <span className={`log-level level-${(entry.level || 'INFO').toLowerCase()}`}>
                {(entry.level || 'INFO').toUpperCase()}
              </span>{' '}
              <span className="log-message">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
