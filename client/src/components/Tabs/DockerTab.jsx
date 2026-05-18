import { useEffect, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';

function formatPorts(ports) {
  if (typeof ports === 'string') return ports;
  if (!Array.isArray(ports) || ports.length === 0) return '—';
  return ports
    .map((p) => (p.PublicPort ? `${p.PublicPort}→${p.PrivatePort}/${p.Type || 'tcp'}` : `${p.PrivatePort}/${p.Type || 'tcp'}`))
    .join(', ');
}

function detectLevel(text) {
  const lower = text.toLowerCase();
  if (lower.includes('error') || lower.includes('fatal') || lower.includes('panic')) return 'error';
  if (lower.includes('warn')) return 'warn';
  return 'info';
}

// ── Log panel ─────────────────────────────────────────────────────────────────
function LogPanel({ containerId, containerName, onClose }) {
  const [lines, setLines] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fm.fetch(`/api/docker/containers/${containerId}/logs`);
        if (res?.ok) {
          const data = await res.json();
          const raw = data.logs || data || [];
          const arr = Array.isArray(raw) ? raw : (raw.split?.('\n') || []);
          setLines(arr);
          return;
        }
      } catch (_) {}
      setError(true);
    }
    load();
  }, [containerId]);

  // scroll to bottom when lines arrive
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  const LEVELS = ['all', 'info', 'warn', 'error'];

  return (
    <div className="docker-log-panel">
      <div className="docker-log-header">
        <span className="docker-log-title">Logs: {containerName || containerId}</span>
        <div className="docker-log-filters">
          {LEVELS.map((l) => (
            <button
              key={l}
              className={`phase2-btn sm ${l === filter ? 'primary' : 'secondary'}`}
              onClick={() => setFilter(l)}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
        <button className="phase2-btn sm secondary" onClick={onClose}>Close</button>
      </div>
      <div className="docker-log-body" ref={bodyRef}>
        {error && <div>Failed to load logs</div>}
        {lines.map((line, i) => {
          const text = typeof line === 'string' ? line : JSON.stringify(line);
          if (!text.trim()) return null;
          const level = detectLevel(text);
          if (filter !== 'all' && level !== filter) return null;
          return (
            <div key={i} className={`docker-log-line level-${level}`} data-level={level}>
              {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DockerTab() {
  const [containers, setContainers] = useState([]);
  const [isMock, setIsMock] = useState(false);
  const [logTarget, setLogTarget] = useState(null); // { id, name } | null

  async function loadContainers() {
    try {
      const res = await fm.fetch('/api/docker/containers');
      if (res?.ok) {
        const data = await res.json();
        setContainers(data.containers || data || []);
        setIsMock(data.mock || false);
      }
    } catch (_) {
      setContainers([]);
    }
  }

  useEffect(() => {
    loadContainers();
    const id = setInterval(loadContainers, 10000);
    return () => clearInterval(id);
  }, []);

  async function handleAction(action, id) {
    try {
      const res = await fm.fetch(`/api/docker/containers/${id}/${action}`, { method: 'POST' });
      if (res?.ok) {
        setTimeout(loadContainers, 1000);
      } else {
        console.warn(`DockerTab: failed to ${action} container ${id}`);
      }
    } catch (e) {
      console.warn(`DockerTab: error on ${action}`, e);
    }
  }

  const total   = containers.length;
  const running = containers.filter((c) => c.State === 'running').length;
  const stopped = total - running;

  const statCards = [
    { label: 'Total Containers', value: total,                                       color: 'var(--accent-info)'    },
    { label: 'Running',          value: running,                                     color: 'var(--accent-success)' },
    { label: 'Stopped',          value: stopped,                                     color: 'var(--accent-danger)'  },
    { label: 'Docker API',       value: isMock ? 'Mock' : 'Live', color: isMock ? 'var(--accent-warning)' : 'var(--accent-success)' },
  ];

  return (
    <div className="tab docker">
      {/* Stat cards */}
      <div className="docker-stats">
        {statCards.map((s) => (
          <div className="docker-stat-card" key={s.label}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {isMock && (
        <div className="hw-util-note">
          Docker socket not available — showing mock data. Mount /var/run/docker.sock to enable live management.
        </div>
      )}

      {/* Container table */}
      <div className="docker-table-wrap">
        <table className="docker-container-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Image</th>
              <th>State</th>
              <th>Status</th>
              <th>Ports</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {containers.map((container) => {
              const name   = (container.Names?.[0] || container.name || '').replace(/^\//, '');
              const image  = container.Image || '';
              const state  = container.State || 'unknown';
              const status = container.Status || '';
              const ports  = formatPorts(container.Ports || []);
              const id     = container.Id || container.id || name;
              const isOpen = logTarget?.id === id;

              return (
                <tr key={id}>
                  <td className="docker-name">{name}</td>
                  <td className="docker-image">{image}</td>
                  <td><span className={`docker-state-badge ${state}`}>{state}</span></td>
                  <td className="docker-status">{status}</td>
                  <td className="docker-ports">{ports}</td>
                  <td className="docker-actions">
                    <button
                      className="phase2-btn sm secondary"
                      onClick={() => setLogTarget(isOpen ? null : { id, name })}
                    >
                      {isOpen ? 'Hide Logs' : 'Logs'}
                    </button>
                    {state === 'running'
                      ? <button className="phase2-btn sm secondary" onClick={() => handleAction('stop', id)}>Stop</button>
                      : <button className="phase2-btn sm primary"   onClick={() => handleAction('start', id)}>Start</button>
                    }
                    <button className="phase2-btn sm secondary" onClick={() => handleAction('restart', id)}>Restart</button>
                  </td>
                </tr>
              );
            })}
            {containers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted-color)' }}>
                  No containers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Inline log panel */}
      {logTarget && (
        <LogPanel
          containerId={logTarget.id}
          containerName={logTarget.name}
          onClose={() => setLogTarget(null)}
        />
      )}
    </div>
  );
}
