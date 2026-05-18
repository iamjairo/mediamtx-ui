import { useEffect, useRef, useState } from 'react';

const STATUS_LABELS = {
  connected: '● Reachable',
  error: '● Unreachable',
  unknown: '● Unknown',
};

function normalizeUrl(value, defaultScheme = 'https') {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `${defaultScheme}://${value}`;
}

function safeIframeUrl(value) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
}

export default function ScryptedTab() {
  const [url, setUrl] = useState(() => localStorage.getItem('scrypted:url') || '');
  const [inputValue, setInputValue] = useState(() => localStorage.getItem('scrypted:url') || '');
  const [status, setStatus] = useState('unknown');
  const iframeRef = useRef(null);

  // Best-effort reachability probe — opaque due to CORS but detects DNS failures
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
      .then(() => { if (!cancelled) setStatus('connected'); })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [url]);

  function connect() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setUrl('');
      setStatus('unknown');
      localStorage.removeItem('scrypted:url');
      return;
    }
    const normalized = normalizeUrl(trimmed, 'https');
    setInputValue(normalized);
    setUrl(normalized);
    setStatus('unknown');
    localStorage.setItem('scrypted:url', normalized);
  }

  function openExternal() {
    const trimmed = inputValue.trim() || url;
    if (!trimmed) {
      console.warn('[ScryptedTab] Set a Scrypted URL first.');
      return;
    }
    window.open(normalizeUrl(trimmed, 'https'), '_blank', 'noopener,noreferrer');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') connect();
  }

  return (
    <div className="tab scrypted-tab">
      {/* Header */}
      <div className="scrypted-header">
        <div className="scrypted-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 17l6-6-6-6" />
            <path d="M12 19h8" />
          </svg>
          <div>
            <h2>Scrypted Console</h2>
            <p>Embed and access your Scrypted home-camera dashboard</p>
          </div>
        </div>
        <div className="scrypted-header-right">
          <span className="scrypted-status-pill" data-state={status}>
            {STATUS_LABELS[status] || '● Unknown'}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="scrypted-toolbar">
        <label className="scrypted-url-label">Scrypted URL</label>
        <input
          type="text"
          className="scrypted-url-input"
          placeholder="https://192.168.1.50:10443"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="phase2-btn sm scrypted-connect-btn" onClick={connect}>Connect</button>
        <button className="phase2-btn sm secondary scrypted-open-btn" onClick={openExternal}>Open in new tab</button>
      </div>

      {/* Body */}
      <div className="scrypted-body">
        {url ? (
          <>
            <div className="scrypted-embed-wrap">
              <iframe
                ref={iframeRef}
                className="scrypted-iframe"
                src={safeIframeUrl(url)}
                allow="camera; microphone; fullscreen; autoplay"
                onLoad={() => setStatus('connected')}
                onError={() => setStatus('error')}
              />
            </div>
            <div className="scrypted-embed-help">
              If the dashboard does not load, Scrypted likely blocks iframe embedding (X-Frame-Options).
              Use <strong>Open in new tab</strong> instead.
            </div>
          </>
        ) : (
          <div className="scrypted-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.3">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <h3>No Scrypted instance connected</h3>
            <p>Scrypted is an open-source home camera/automation hub that can route cameras to HomeKit, Google Home, and Alexa. Set its URL above to embed the console here.</p>
            <div className="scrypted-empty-actions">
              <a href="https://www.scrypted.app" target="_blank" rel="noopener noreferrer" className="phase2-btn sm secondary">scrypted.app</a>
              <a href="https://github.com/koush/scrypted" target="_blank" rel="noopener noreferrer" className="phase2-btn sm secondary">GitHub</a>
              <a href="https://docs.scrypted.app/installation.html" target="_blank" rel="noopener noreferrer" className="phase2-btn sm secondary">Install Guide</a>
            </div>
            <div className="scrypted-install-snippet">
              <span className="scrypted-snippet-label">Quick install (Docker)</span>
              <pre className="scrypted-snippet-pre">{`docker run -d \\
  --name scrypted \\
  --restart unless-stopped \\
  --network host \\
  -v scrypted:/server/volume \\
  ghcr.io/koush/scrypted:latest`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
