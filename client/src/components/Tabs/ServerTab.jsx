import { useEffect, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';
import { useToast } from '../../lib/toast.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitCamelCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

// Server config groups — mirrors server_groups.js without the framework.
const SERVER_GROUPS = [
  {
    name: 'General',
    storeKey: 'general',
    columns: [
      { name: 'Logging',   props: ['logLevel', 'logDestinations', 'logFile', 'sysLogPrefix'] },
      { name: 'I/O',       props: ['udpMaxPayloadSize', 'udpReadBufferSize', 'readTimeout', 'writeTimeout', 'writeQueueSize'] },
      { name: 'Hooks',     props: ['runOnConnect', 'runOnConnectRestart', 'runOnDisconnect'] },
    ],
  },
  {
    name: 'HLS',
    storeKey: 'hls',
    columns: [
      { name: 'Enabled',   props: ['hls', 'hlsAddress'] },
      { name: 'Settings',  props: ['hlsAlwaysRemux', 'hlsVariant', 'hlsSegmentCount', 'hlsSegmentDuration', 'hlsPartDuration', 'hlsSegmentMaxSize', 'hlsDirectory', 'hlsMuxerCloseAfter'] },
      { name: 'Security',  props: ['hlsEncryption', 'hlsServerKey', 'hlsServerCert', 'hlsAllowOrigins', 'hlsTrustedProxies'] },
    ],
  },
  {
    name: 'RTSP',
    storeKey: 'rtsp',
    columns: [
      { name: 'Enabled',   props: ['rtsp', 'rtspTransports', 'rtspAddress', 'rtspsAddress', 'rtpAddress', 'rtcpAddress'] },
      { name: 'Multicast', props: ['multicastIPRange', 'multicastRTPPort', 'multicastRTCPPort', 'multicastSRTPPort', 'multicastSRTCPPort'] },
      { name: 'Security',  props: ['rtspEncryption', 'srtpAddress', 'srtcpAddress', 'rtspServerKey', 'rtspServerCert', 'rtspAuthMethods'] },
    ],
  },
  {
    name: 'RTMP',
    storeKey: 'rtmp',
    columns: [
      { name: 'Enabled',  props: ['rtmp', 'rtmpAddress', 'rtmpsAddress'] },
      { name: 'Security', props: ['rtmpEncryption', 'rtmpServerKey', 'rtmpServerCert'] },
    ],
  },
  {
    name: 'SRT',
    storeKey: 'srt',
    columns: [
      { name: 'Enabled', props: ['srt', 'srtAddress'] },
    ],
  },
  {
    name: 'WebRTC',
    storeKey: 'webrtc',
    columns: [
      { name: 'Enabled',  props: ['webrtc', 'webrtcAddress', 'webrtcLocalUDPAddress', 'webrtcLocalTCPAddress'] },
      { name: 'Settings', props: ['webrtcIPsFromInterfaces', 'webrtcIPsFromInterfacesList', 'webrtcAdditionalHosts', 'webrtcICEServers2', 'webrtcHandshakeTimeout', 'webrtcTrackGatherTimeout', 'webrtcSTUNGatherTimeout'] },
      { name: 'Security', props: ['webrtcEncryption', 'webrtcServerKey', 'webrtcServerCert', 'webrtcAllowOrigins', 'webrtcTrustedProxies'] },
    ],
  },
  {
    name: 'Playback',
    storeKey: 'playback',
    columns: [
      { name: 'Enabled',  props: ['playback', 'playbackAddress'] },
      { name: 'Security', props: ['playbackEncryption', 'playbackServerKey', 'playbackServerCert', 'playbackAllowOrigins', 'playbackTrustedProxies'] },
    ],
  },
  {
    name: 'API',
    storeKey: 'api',
    columns: [
      { name: 'Enabled',  props: ['api', 'apiAddress'] },
      { name: 'Security', props: ['apiEncryption', 'apiServerKey', 'apiServerCert', 'apiAllowOrigins', 'apiTrustedProxies'] },
    ],
  },
  {
    name: 'PPROF',
    storeKey: 'pprof',
    columns: [
      { name: 'Enabled',  props: ['pprof', 'pprofAddress'] },
      { name: 'Security', props: ['pprofEncryption', 'pprofServerKey', 'pprofServerCert', 'pprofAllowOrigins', 'pprofTrustedProxies'] },
    ],
  },
  {
    name: 'Metrics',
    storeKey: 'metrics',
    columns: [
      { name: 'Enabled',  props: ['metrics', 'metricsAddress'] },
      { name: 'Security', props: ['metricsEncryption', 'metricsServerKey', 'metricsServerCert', 'metricsAllowOrigins', 'metricsTrustedProxies'] },
    ],
  },
  {
    name: 'Authentication',
    storeKey: 'auth',
    columns: [
      { name: 'Connection', props: ['authMethod', 'authHTTPAddress'] },
      { name: 'Security',   props: ['authJWTJWKS', 'authJWTJWKSFingerprint', 'authJWTClaimKey', 'authJWTInHTTPQuery'] },
      { name: 'Excludes',   props: ['authHTTPExclude', 'authJWTExclude'] },
    ],
  },
];

// ── Field input components ────────────────────────────────────────────────────

// Renders the appropriate input element based on the value's data type.
// Mirrors FormItem.getInputComponent() logic; no vanilla framework dependency.

function FieldInput({ prop, value, onChange }) {
  const name = `input-${prop.toLowerCase()}`;

  // boolean → checkbox (switch style)
  if (typeof value === 'boolean') {
    return (
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="switch"
      />
    );
  }

  // array → multi-text rows
  if (Array.isArray(value)) {
    return (
      <MultiTextInput prop={prop} value={value} onChange={onChange} />
    );
  }

  // number (but not string-encoded) → number input
  if (typeof value === 'number') {
    return (
      <input
        type="number"
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    );
  }

  // default → text
  return (
    <input
      type="text"
      id={name}
      name={name}
      defaultValue={value ?? ''}
      placeholder="type something ..."
      onBlur={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') onChange(e.target.value); }}
    />
  );
}

function MultiTextInput({ prop, value, onChange }) {
  const [rows, setRows] = useState(() => [...(value || []).filter(Boolean), '']);

  function updateRow(idx, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = val;
      // remove empty rows except the last trailing one
      const cleaned = next.filter((r, i) => r !== '' || i === next.length - 1);
      // ensure trailing empty entry
      if (cleaned[cleaned.length - 1] !== '') cleaned.push('');
      onChange(cleaned.filter(Boolean));
      return cleaned;
    });
  }

  function removeRow(idx) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0 || next[next.length - 1] !== '') next.push('');
      onChange(next.filter(Boolean));
      return next;
    });
  }

  return (
    <div className="multi-row">
      {rows.map((row, idx) => (
        <div className="row" key={idx}>
          <input
            type="text"
            value={row}
            placeholder="add new ..."
            onChange={(e) => updateRow(idx, e.target.value)}
            onBlur={(e) => updateRow(idx, e.target.value)}
          />
          {row !== '' && (
            <button
              type="button"
              className="button clear"
              onClick={() => removeRow(idx)}
            >
              🞬
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── FormField (label + input) ─────────────────────────────────────────────────

function FormField({ prop, value, onChange }) {
  const label = splitCamelCase(prop).toUpperCase();
  const isBool = typeof value === 'boolean';

  return (
    <div className={`form-item${isBool ? ' switch' : ''}${Array.isArray(value) ? ' rows' : ''}`}>
      <label htmlFor={`input-${prop.toLowerCase()}`}>{label}</label>
      <FieldInput prop={prop} value={value} onChange={onChange} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ServerTab() {
  const [config, setConfig]       = useState(null);   // live edits
  const [pristine, setPristine]   = useState(null);   // last-saved snapshot
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [isMock, setIsMock]       = useState(false);
  const [activeGroup, setActiveGroup] = useState(SERVER_GROUPS[0].name);
  const toast = useToast();

  const abortRef = useRef(null);

  async function loadConfig() {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const res = await fm.fetch('/mediamtx/config/global/get');
      if (!res || !res.ok) throw new Error(`HTTP ${res?.status}`);
      const data = await res.json();
      setConfig(data);
      setPristine(JSON.parse(JSON.stringify(data)));
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error('Failed to load server config');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
    return () => abortRef.current?.abort();
  }, []);

  function updateField(prop, value) {
    setConfig((prev) => ({ ...prev, [prop]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fm.fetch('/mediamtx/config/global/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res?.status}`);
      }
      setPristine(JSON.parse(JSON.stringify(config)));
      toast.success('Saved global settings');
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const isDirty = config && pristine && JSON.stringify(config) !== JSON.stringify(pristine);

  const group = SERVER_GROUPS.find((g) => g.name === activeGroup) ?? SERVER_GROUPS[0];

  return (
    <div className="tab server">
      {/* Header */}
      <div className="sources-header">
        <div className="sources-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
          <div>
            <h2 className="sources-title">
              Server Config
              {isMock && <span className="sources-mock-badge" style={{ marginLeft: 8 }}>MOCK</span>}
            </h2>
            <p className="sources-subtitle">Global MediaMTX server settings</p>
          </div>
        </div>
        <div className="sources-header-right">
          <button className="phase2-btn sm secondary" onClick={loadConfig} disabled={loading}>
            Refresh
          </button>
          <button
            className="phase2-btn sm"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Group nav */}
      <nav className="group-navigation">
        {SERVER_GROUPS.map((g) => (
          <button
            key={g.name}
            className={`nav-btn${activeGroup === g.name ? ' active' : ''}`}
            onClick={() => setActiveGroup(g.name)}
          >
            {g.name}
          </button>
        ))}
      </nav>

      {/* Content */}
      {loading ? (
        <div className="sources-empty">Loading…</div>
      ) : !config ? (
        <div className="sources-empty">Failed to load config.</div>
      ) : (
        <div className="groups">
          {group.columns.map((col) => (
            <div className="group" key={col.name}>
              <h2>{col.name}</h2>
              {col.props.map((prop) => (
                <FormField
                  key={prop}
                  prop={prop}
                  value={config[prop]}
                  onChange={(val) => updateField(prop, val)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
