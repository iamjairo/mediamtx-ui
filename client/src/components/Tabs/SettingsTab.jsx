import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Central settings page — surfaces all third-party integration configs
// (Home Assistant URL, Scrypted URL, Matter Bridge, Docker connection)
// in one place instead of users hunting them down inside each tab. Also
// adds quick links to the existing Users / Server / Caddy admin tabs.
//
// Values persist to localStorage with keys that match the per-tab readers
// (homeassistant:url, scrypted:url, etc) so saving here updates the live
// behavior of the iframe-embedded tabs immediately.

const FIELDS = [
  {
    section: 'Home Assistant',
    description: 'Tunet Dashboard URL — embedded in the HA tab.',
    items: [
      { key: 'homeassistant:url', label: 'Dashboard URL', placeholder: 'https://home.assistant.iamjairo.com', type: 'url' },
    ],
  },
  {
    section: 'Scrypted',
    description: 'Console URL — embedded in the Scrypted tab.',
    items: [
      { key: 'scrypted:url', label: 'Scrypted URL', placeholder: 'https://scrypted.selfhosting.iamjairo.com', type: 'url' },
    ],
  },
  {
    section: 'Matter Bridge',
    description: 'matter-onvif-bridge — bridges ONVIF cameras to Apple Home / Google Home.',
    items: [
      { key: 'matterbridge:url', label: 'Bridge URL', placeholder: 'http://localhost:8443', type: 'url' },
      { key: 'matterbridge:apikey', label: 'API key (optional)', placeholder: '', type: 'password' },
    ],
  },
  {
    section: 'Docker',
    description: 'How the Docker tab talks to the daemon. Leave the API URL blank to use the unix socket.',
    items: [
      { key: 'docker:apiUrl', label: 'Docker API URL', placeholder: 'http://docker:2375', type: 'url' },
      { key: 'docker:socket', label: 'Unix socket path', placeholder: '/var/run/docker.sock', type: 'text' },
    ],
  },
  {
    section: 'Custom domain',
    description: 'Override the public origin used when generating share / WHEP / HLS URLs.',
    items: [
      { key: 'custom:publicOrigin', label: 'Public origin', placeholder: 'https://cams.example.com', type: 'url' },
    ],
  },
];

const ADMIN_LINKS = [
  { name: 'Users',          desc: 'Add, remove, or edit dashboard accounts.',          to: '/users' },
  { name: 'Server',         desc: 'MediaMTX global config — ports, logging, recording.', to: '/server' },
  { name: 'Path Defaults',  desc: 'Default settings applied to new stream paths.',     to: '/path' },
  { name: 'Hardware',       desc: 'GPU / accelerator availability and toggles.',       to: '/hardware' },
  { name: 'HW Acceleration', desc: 'FFmpeg preset cards and per-codec settings.',      to: '/hwaccel' },
  { name: 'Caddy',          desc: 'Reverse proxy routes and TLS.',                     to: '/caddy' },
];

function readAll() {
  const out = {};
  for (const group of FIELDS) {
    for (const item of group.items) {
      out[item.key] = localStorage.getItem(item.key) || '';
    }
  }
  return out;
}

export default function SettingsTab() {
  const navigate = useNavigate();
  const [values, setValues] = useState(() => readAll());
  const [savedAt, setSavedAt] = useState(null);

  // If localStorage changes externally (another tab saved an HA URL), reflect it.
  useEffect(() => {
    const onStorage = () => setValues(readAll());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function save() {
    for (const [k, v] of Object.entries(values)) {
      if (v) localStorage.setItem(k, v);
      else localStorage.removeItem(k);
    }
    setSavedAt(new Date().toLocaleTimeString());
  }

  function reset() {
    if (!confirm('Reset all integration settings? This clears localStorage entries for HA, Scrypted, Matter Bridge, Docker, and the custom domain.')) return;
    for (const group of FIELDS) for (const item of group.items) localStorage.removeItem(item.key);
    setValues(readAll());
    setSavedAt(null);
  }

  return (
    <div className="tab settings-tab">
      <div className="settings-header">
        <div>
          <h2>Settings</h2>
          <p>Third-party integrations and dashboard admin shortcuts. Values are saved to your browser only.</p>
        </div>
        <div className="settings-header-actions">
          {savedAt && <span className="settings-saved-pill">Saved at {savedAt}</span>}
          <button className="phase2-btn sm secondary" onClick={reset}>Reset</button>
          <button className="phase2-btn sm" onClick={save}>Save changes</button>
        </div>
      </div>

      <div className="settings-grid">
        {FIELDS.map((group) => (
          <section className="settings-card" key={group.section}>
            <div className="settings-card-head">
              <h3>{group.section}</h3>
              <p>{group.description}</p>
            </div>
            <div className="settings-card-body">
              {group.items.map((item) => (
                <label className="settings-field" key={item.key}>
                  <span className="settings-field-label">{item.label}</span>
                  <input
                    type={item.type}
                    className="settings-field-input"
                    placeholder={item.placeholder}
                    value={values[item.key] || ''}
                    onChange={(e) => update(item.key, e.target.value)}
                    autoComplete="off"
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="settings-card settings-admin-card">
          <div className="settings-card-head">
            <h3>Admin pages</h3>
            <p>Configuration that lives on its own tab.</p>
          </div>
          <div className="settings-admin-list">
            {ADMIN_LINKS.map((link) => (
              <button key={link.to} className="settings-admin-link" onClick={() => navigate(link.to)}>
                <div className="settings-admin-link-text">
                  <div className="settings-admin-link-name">{link.name}</div>
                  <div className="settings-admin-link-desc">{link.desc}</div>
                </div>
                <span className="settings-admin-link-arrow">›</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
