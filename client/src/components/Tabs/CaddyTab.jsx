import { useEffect, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';

const INNER_TABS = ['routes', 'tls', 'logs', 'config'];

const DEFAULT_ROUTES = [
  { domain: '/v3/*',        upstream: 'mediamtx:9997',   tls: true, active: true, protocol: 'MediaMTX API' },
  { domain: '/hls/*',       upstream: 'mediamtx:8888',   tls: true, active: true, protocol: 'HLS'          },
  { domain: '/webrtc/*',    upstream: 'mediamtx:8889',   tls: true, active: true, protocol: 'WebRTC'       },
  { domain: '/playback/*',  upstream: 'mediamtx:9996',   tls: true, active: true, protocol: 'Playback'     },
  { domain: '/metrics*',    upstream: 'mediamtx:9998',   tls: true, active: true, protocol: 'Metrics'      },
  { domain: '/go2rtc/*',    upstream: 'go2rtc:1984',     tls: true, active: true, protocol: 'Go2RTC'       },
  { domain: '/ws/*',        upstream: 'mediamtxui:3000', tls: true, active: true, protocol: 'WebSocket'    },
  { domain: '/*',           upstream: 'mediamtxui:3000', tls: true, active: true, protocol: 'Dashboard'    },
];

const TLS_CERTS = [
  { domain: '*.local',  issuer: 'Caddy Internal', expiry: 'Auto-renewed', days: 365, type: 'internal'    },
  { domain: 'localhost', issuer: 'Self-signed',   expiry: 'Auto-renewed', days: 365, type: 'self-signed' },
];

const SAMPLE_LOGS = [
  { ts: new Date().toISOString(), status: 200, method: 'GET', path: '/',                       duration: '12ms', ip: '192.168.1.10' },
  { ts: new Date().toISOString(), status: 200, method: 'GET', path: '/v3/config/global/get',   duration: '45ms', ip: '192.168.1.10' },
  { ts: new Date().toISOString(), status: 200, method: 'GET', path: '/hls/cam1/index.m3u8',    duration: '8ms',  ip: '192.168.1.20' },
  { ts: new Date().toISOString(), status: 404, method: 'GET', path: '/favicon.ico',            duration: '2ms',  ip: '192.168.1.10' },
  { ts: new Date().toISOString(), status: 101, method: 'GET', path: '/ws/live',                duration: '—',    ip: '192.168.1.15' },
];

const FALLBACK_CONFIG =
  '# Caddyfile not loaded — Caddy admin API may not be reachable.\n# Configure CADDY_API_URL environment variable.';

function statusClass(code) {
  if (code < 300) return 'success';
  if (code < 400) return 'info';
  if (code < 500) return 'warning';
  return 'error';
}

// ── Routes sub-panel ──────────────────────────────────────────────────────────
function RoutesPanel({ routes, setRoutes }) {
  const [path, setPath] = useState('');
  const [upstream, setUpstream] = useState('');
  const [tls, setTls] = useState(true);

  function addRoute() {
    const p = path.trim();
    const u = upstream.trim();
    if (!p || !u) return;
    setRoutes((prev) => [...prev, { domain: p, upstream: u, tls, active: true, protocol: 'Custom' }]);
    setPath('');
    setUpstream('');
  }

  return (
    <div>
      <div className="caddy-route-form">
        <input
          type="text"
          placeholder="Path match (e.g. /api/*)"
          className="hw-ffmpeg-input"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <input
          type="text"
          placeholder="Upstream (e.g. backend:8080)"
          className="hw-ffmpeg-input"
          value={upstream}
          onChange={(e) => setUpstream(e.target.value)}
        />
        <label className="toggle-switch">
          <input type="checkbox" checked={tls} onChange={(e) => setTls(e.target.checked)} />
          <span className="toggle-slider"></span>
        </label>
        <span style={{ color: 'var(--text-light-color)', fontSize: 'var(--fs-s)' }}>TLS</span>
        <button className="phase2-btn primary" onClick={addRoute}>Add Route</button>
      </div>
      {routes.map((route, i) => (
        <div className="caddy-route-card" key={i}>
          <div className="caddy-route-left">
            <span className="caddy-route-path">{route.domain}</span>
            <span className="caddy-route-arrow">→</span>
            <span className="caddy-route-upstream">{route.upstream}</span>
          </div>
          <div className="caddy-route-right">
            <span className="caddy-route-protocol">{route.protocol}</span>
            {route.tls && <span className="status-badge available">TLS</span>}
            <span className={`status-badge ${route.active ? 'available' : 'unavailable'}`}>
              {route.active ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TLS sub-panel ─────────────────────────────────────────────────────────────
function TLSPanel() {
  return (
    <div>
      {TLS_CERTS.map((cert) => (
        <div className="caddy-cert-card" key={cert.domain}>
          <div className="caddy-cert-domain">{cert.domain}</div>
          <div className="caddy-cert-meta">
            <span className="caddy-cert-issuer">{cert.issuer}</span>
            <span className="caddy-cert-expiry">{cert.expiry}</span>
            <span className="status-badge available">{cert.days}d remaining</span>
          </div>
        </div>
      ))}
      <div className="hw-util-note">
        Caddy automatically manages TLS certificates via ACME (Let&apos;s Encrypt) or internal CA for local domains.
      </div>
    </div>
  );
}

// ── Logs sub-panel ────────────────────────────────────────────────────────────
function LogsPanel() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fm.fetch('/api/caddy/logs');
        if (res?.ok) {
          const data = await res.json();
          setLogs(Array.isArray(data) && data.length ? data : SAMPLE_LOGS);
        } else {
          setLogs(SAMPLE_LOGS);
        }
      } catch (_) {
        setLogs(SAMPLE_LOGS);
      }
    }
    load();
  }, []);

  return (
    <div className="caddy-log-list">
      {logs.map((log, i) => (
        <div className="caddy-log-entry" key={i}>
          <span className="caddy-log-time">{new Date(log.ts).toLocaleTimeString()}</span>
          <span className={`caddy-log-status ${statusClass(log.status)}`}>{log.status}</span>
          <span className="caddy-log-method">{log.method}</span>
          <span className="caddy-log-path">{log.path}</span>
          <span className="caddy-log-duration">{log.duration}</span>
          <span className="caddy-log-ip">{log.ip}</span>
        </div>
      ))}
    </div>
  );
}

// ── Config sub-panel ──────────────────────────────────────────────────────────
function ConfigPanel() {
  const [text, setText] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/caddy/Caddyfile');
        if (res.ok) {
          setText(await res.text());
          return;
        }
      } catch (_) {}
      setText(FALLBACK_CONFIG);
    }
    load();
  }, []);

  async function handleSave() {
    try {
      const res = await fm.fetch('/api/caddy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: text }),
      });
      if (!res?.ok) console.warn('CaddyTab: failed to save config');
    } catch (e) {
      console.warn('CaddyTab: could not save config', e);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy'), 1500);
  }

  return (
    <div className="caddy-config-editor">
      <textarea
        id="caddy-config-text"
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="caddy-config-actions">
        <button className="phase2-btn primary" onClick={handleSave}>Save &amp; Reload</button>
        <button className="phase2-btn secondary" onClick={handleCopy}>{copyLabel}</button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CaddyTab() {
  const [status, setStatus] = useState({ running: false, version: '—' });
  const [routes, setRoutes] = useState(DEFAULT_ROUTES);
  const [activeInner, setActiveInner] = useState('routes');
  const configTextRef = useRef(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fm.fetch('/api/caddy/status');
        if (res?.ok) setStatus(await res.json());
      } catch (_) {}
    }
    loadStatus();
  }, []);

  async function handleReload() {
    try {
      const res = await fm.fetch('/api/caddy/config', { method: 'POST' });
      if (!res?.ok) console.warn('CaddyTab: failed to reload config');
    } catch (e) {
      console.warn('CaddyTab: could not reach Caddy', e);
    }
  }

  function handleCopyFile() {
    const el = document.getElementById('caddy-config-text');
    if (el) navigator.clipboard.writeText(el.value);
  }

  return (
    <div className="tab caddy">
      {/* Status bar */}
      <div className="caddy-status-bar">
        <div className="caddy-status-item">
          <span className={`status-dot ${status.running ? 'online' : 'offline'}`}></span>
          <span className="caddy-status-text">{status.running ? 'Running' : 'Stopped'}</span>
        </div>
        <div className="caddy-status-item">
          <span className="caddy-status-label">Version</span>
          <span className="caddy-status-value">{status.version || 'v2.9'}</span>
        </div>
        <div className="caddy-status-item">
          <span className="caddy-status-label">Routes</span>
          <span className="caddy-status-value">{routes.length}</span>
        </div>
        <div className="caddy-status-item">
          <span className="caddy-status-label">TLS</span>
          <span className="caddy-status-value">Auto</span>
        </div>
      </div>

      {/* Controls */}
      <div className="caddy-controls">
        <button className="phase2-btn secondary" onClick={handleReload}>Reload Config</button>
        <button className="phase2-btn secondary" onClick={handleCopyFile}>Copy Caddyfile</button>
      </div>

      {/* Inner tabs */}
      <div className="inner-tabs">
        {INNER_TABS.map((t) => (
          <button
            key={t}
            className={`inner-tab-btn${t === activeInner ? ' active' : ''}`}
            onClick={() => setActiveInner(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Inner tab content */}
      <div className="caddy-tab-content" ref={configTextRef}>
        {activeInner === 'routes' && <RoutesPanel routes={routes} setRoutes={setRoutes} />}
        {activeInner === 'tls'    && <TLSPanel />}
        {activeInner === 'logs'   && <LogsPanel />}
        {activeInner === 'config' && <ConfigPanel />}
      </div>
    </div>
  );
}
