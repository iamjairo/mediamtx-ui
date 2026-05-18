import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Minimal tab — just the embedded Tunet HA Dashboard, full bleed.
// All configuration (URL, etc.) lives in the Settings tab.

const DEFAULT_URL = 'https://home.assistant.iamjairo.com';

// Tunet supports `?theme=<name>` on initial mount (see Tunet ConfigContext).
// Pinning mediamtxNeon gives the embedded HA Dashboard visual continuity with
// the rest of this app without touching the user's saved Tunet preference.
const EMBED_THEME = 'mediamtxNeon';

function safeIframeUrl(value) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    parsed.searchParams.set('theme', EMBED_THEME);
    return parsed.href;
  } catch {
    return '';
  }
}

export default function HomeAssistantTab() {
  const navigate = useNavigate();
  const [url, setUrl] = useState(() => localStorage.getItem('homeassistant:url') || DEFAULT_URL);

  // Pick up Settings-tab saves from this or another window.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'homeassistant:url') setUrl(e.newValue || DEFAULT_URL);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const src = safeIframeUrl(url);

  if (!src) {
    return (
      <div className="tab homeassistant-tab ha-tab-bare">
        <div className="ha-empty-min">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.4">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <h3>No Home Assistant URL configured</h3>
          <p>Set the Dashboard URL in Settings to embed your Home Assistant frontend here.</p>
          <button className="phase2-btn sm" onClick={() => navigate('/integrations')}>Open Settings</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab homeassistant-tab ha-tab-bare">
      <iframe
        className="ha-iframe ha-iframe-fill"
        src={src}
        allow="autoplay; fullscreen; camera; microphone"
        title="Home Assistant Dashboard"
      />
    </div>
  );
}
