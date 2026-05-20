import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Minimal tab — just the embedded caddyserver-manager console, full bleed.
// All configuration (URL, etc.) lives in the Settings tab.
//
// Mirrors the Scrypted / Home Assistant tab pattern: load the upstream
// add-on UI in an iframe with ?embed=1 so the add-on hides its own
// outer chrome and lets the dashboard provide the shell.
//
// Replaces the previous in-house Caddy mock UI; that file is preserved
// as CaddyTabLegacy.jsx for fallback / reference.

const DEFAULT_URL = 'https://caddy.selfhosting.iamjairo.com';

function safeIframeUrl(value) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    // Tell the restyled caddyserver-manager to drop its own sidebar/header;
    // the dashboard already provides the outer shell. Fork honors ?embed=1
    // (see caddyserver-manager CaddyServer-frontend/src/hooks/useEmbedMode.js).
    parsed.searchParams.set('embed', '1');
    return parsed.href;
  } catch {
    return '';
  }
}

export default function CaddyTab() {
  const navigate = useNavigate();
  const [url, setUrl] = useState(() => localStorage.getItem('caddy:url') || DEFAULT_URL);

  // Pick up Settings-tab saves from this or another window.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'caddy:url') setUrl(e.newValue || DEFAULT_URL);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const src = safeIframeUrl(url);

  if (!src) {
    return (
      <div className="tab caddy-tab ha-tab-bare">
        <div className="ha-empty-min">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.4">
            <path d="M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0Z"/>
            <path d="M2 12h20"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <h3>No Caddy URL configured</h3>
          <p>Set the Caddy Manager URL in Settings to embed the reverse-proxy console here.</p>
          <button className="phase2-btn sm" onClick={() => navigate('/integrations')}>Open Settings</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab caddy-tab ha-tab-bare">
      <iframe
        className="ha-iframe ha-iframe-fill"
        src={src}
        allow="clipboard-read; clipboard-write; fullscreen"
        title="Caddy Manager"
      />
    </div>
  );
}
