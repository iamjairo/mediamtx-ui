import { createContext, useContext, useEffect, useState } from 'react';
import { fm } from './fetchManager.js';

// Wraps the existing /settings endpoint. Provides server settings (hls/webrtc
// addresses, etc.) and the current MediaMTX config to any consumer via
// `useSettings()`. Falls back to safe defaults when the server is unreachable
// so tabs always have something to render against.

const DEFAULT_SETTINGS = {
  hls: { hlsAddress: ':8888' },
  webrtc: { webrtcAddress: ':8889' },
  rtsp: { rtspAddress: ':8554' },
};

const SettingsContext = createContext({ settings: DEFAULT_SETTINGS, loading: true });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prefer the server's /settings endpoint if it exists, otherwise pull
        // straight from the MediaMTX global config which has the same shape.
        let res = await fm.fetch('/settings');
        if (!res || !res.ok) res = await fm.fetch('/mediamtx/config/global/get');
        if (res?.ok) {
          const data = await res.json();
          if (cancelled) return;
          setSettings({
            hls: { hlsAddress: data.hlsAddress || ':8888' },
            webrtc: { webrtcAddress: data.webrtcAddress || ':8889' },
            rtsp: { rtspAddress: data.rtspAddress || ':8554' },
            raw: data,
          });
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
