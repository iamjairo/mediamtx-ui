import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Minimal tab — just the embedded Scrypted console, full bleed.
// All configuration (URL, etc.) lives in the Settings tab.

const DEFAULT_URL = 'https://scrypted.selfhosting.iamjairo.com';

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
  const navigate = useNavigate();
  const [url, setUrl] = useState(() => localStorage.getItem('scrypted:url') || DEFAULT_URL);

  // Pick up Settings-tab saves from this or another window.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'scrypted:url') setUrl(e.newValue || DEFAULT_URL);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const src = safeIframeUrl(url);

  if (!src) {
    return (
      <div className="tab scrypted-tab ha-tab-bare">
        <div className="ha-empty-min">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.4">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <h3>No Scrypted URL configured</h3>
          <p>Set the Scrypted URL in Settings to embed your Scrypted console here.</p>
          <button className="phase2-btn sm" onClick={() => navigate('/integrations')}>Open Settings</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab scrypted-tab ha-tab-bare">
      <iframe
        className="ha-iframe ha-iframe-fill"
        src={src}
        allow="camera; microphone; fullscreen; autoplay"
        title="Scrypted Console"
      />
    </div>
  );
}
