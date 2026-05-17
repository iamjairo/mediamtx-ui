import { useEffect, useRef, useState } from 'react';

const REPO_URL = 'https://github.com/iamjairo/Home-Assistant-Dashboard';
const DEFAULT_PORT = 5173;

const STATUS_LABELS = {
  connected: '● Reachable',
  error: '● Unreachable',
  unknown: '● Unknown',
};

function normalizeUrl(value, defaultScheme = 'http') {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `${defaultScheme}://${value}`;
}

export default function HomeAssistantTab() {
  const [url, setUrl] = useState(() => localStorage.getItem('homeassistant:url') || '');
  const [inputValue, setInputValue] = useState(() => localStorage.getItem('homeassistant:url') || '');
  const [status, setStatus] = useState('unknown');
  // Increment to force iframe remount on reload
  const [embedKey, setEmbedKey] = useState(0);

  // Best-effort reachability probe
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
      .then(() => { if (!cancelled) setStatus('connected'); })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [url, embedKey]);

  function connect() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setUrl('');
      setStatus('unknown');
      localStorage.removeItem('homeassistant:url');
      return;
    }
    const normalized = normalizeUrl(trimmed, 'http');
    setInputValue(normalized);
    setUrl(normalized);
    setStatus('unknown');
    setEmbedKey((k) => k + 1);
    localStorage.setItem('homeassistant:url', normalized);
  }

  function openExternal() {
    const trimmed = inputValue.trim() || url;
    if (!trimmed) {
      console.warn('[HomeAssistantTab] Set the dashboard URL first.');
      return;
    }
    window.open(normalizeUrl(trimmed, 'http'), '_blank', 'noopener,noreferrer');
  }

  function reload() {
    if (url) setEmbedKey((k) => k + 1);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') connect();
  }

  return (
    <div className="tab homeassistant-tab">
      {/* Header */}
      <div className="ha-header">
        <div className="ha-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <div>
            <h2>Home Assistant Dashboard</h2>
            <p>Tunet Dashboard — embedded React UI for Home Assistant entity control</p>
          </div>
        </div>
        <div className="ha-header-right">
          <span className="ha-status-pill" data-state={status}>
            {STATUS_LABELS[status] || '● Unknown'}
          </span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="phase2-btn sm secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: '-2px', marginRight: '4px' }}>
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            Repo
          </a>
        </div>
      </div>

      {/* Toolbar */}
      <div className="ha-toolbar">
        <label className="ha-toolbar-label">Dashboard URL</label>
        <input
          type="text"
          className="ha-url-input"
          placeholder={`http://localhost:${DEFAULT_PORT}`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="phase2-btn sm ha-connect-btn" onClick={connect}>Connect</button>
        <button className="phase2-btn sm secondary ha-open-btn" onClick={openExternal}>Open in new tab</button>
        <button className="phase2-btn sm secondary ha-reload-btn" onClick={reload}>Reload</button>
      </div>

      {/* Body */}
      <div className="ha-body">
        {url ? (
          <>
            <div className="ha-embed-wrap">
              <iframe
                key={embedKey}
                className="ha-iframe"
                src={url}
                allow="autoplay; fullscreen; camera; microphone"
                onLoad={() => setStatus('connected')}
                onError={() => setStatus('error')}
              />
            </div>
            <div className="ha-embed-help">
              If the dashboard refuses to load, the Tunet backend may set <code>X-Frame-Options</code>. Use{' '}
              <strong>Open in new tab</strong> as a fallback.
            </div>
          </>
        ) : (
          <div className="ha-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.3">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <h3>No Home Assistant Dashboard connected</h3>
            <p>Tunet Dashboard is a React/Vite app with its own backend that talks to Home Assistant via OAuth. Run it separately and point this tab at its URL to embed the UI.</p>
            <div className="ha-empty-actions">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="phase2-btn sm secondary">GitHub</a>
              <a href={`${REPO_URL}/blob/main/SETUP.md`} target="_blank" rel="noopener noreferrer" className="phase2-btn sm secondary">Setup Guide</a>
              <a href={`${REPO_URL}/blob/main/CARD_OPTIONS.md`} target="_blank" rel="noopener noreferrer" className="phase2-btn sm secondary">Card Options</a>
            </div>
            <div className="ha-install-grid">
              <div className="ha-install-card">
                <span className="ha-install-label">1. Clone &amp; install</span>
                <pre className="ha-pre">{`git clone ${REPO_URL}.git\ncd Home-Assistant-Dashboard\nnpm install`}</pre>
              </div>
              <div className="ha-install-card">
                <span className="ha-install-label">2. Configure HA OAuth</span>
                <pre className="ha-pre">{`cp .env.example .env\n# set HA_BASE_URL, HA_CLIENT_ID, HA_CLIENT_SECRET`}</pre>
              </div>
              <div className="ha-install-card">
                <span className="ha-install-label">3. Run dev (Vite + backend)</span>
                <pre className="ha-pre">{`npm run dev:all\n# UI:   http://localhost:5173\n# API:  http://localhost:3000`}</pre>
              </div>
              <div className="ha-install-card">
                <span className="ha-install-label">Or Docker</span>
                <pre className="ha-pre">{`docker compose up -d\n# exposes on host port from compose file`}</pre>
              </div>
            </div>
            <div className="ha-arch-note">
              <strong>Architecture note:</strong> Tunet Dashboard is React/Vite/Tailwind; this dashboard is vanilla JS.
              They run as <em>separate processes on different ports</em>. Cosmetic restyling to match this dashboard's
              dark neon theme is planned — for now we embed the dashboard as-is via iframe.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
