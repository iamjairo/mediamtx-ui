import { useEffect, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';
import { useToast } from '../../lib/toast.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitCamelCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

// Path groups — mirrors path_groups.js
const PATH_GROUPS = [
  {
    name: 'Source',
    storeKey: 'source',
    columns: [
      {
        name: 'Source',
        props: ['source', 'sourceRedirect', 'sourceFingerprint', 'sourceOnDemand', 'sourceOnDemandStartTimeout', 'sourceOnDemandCloseAfter'],
      },
      {
        name: 'Always Available',
        props: ['alwaysAvailable', 'alwaysAvailableFile', 'alwaysAvailableTracks'],
      },
      {
        name: 'I/O',
        props: ['maxReaders', 'srtReadPassphrase', 'useAbsoluteTimestamp', 'overridePublisher', 'srtPublishPassphrase', 'rtspDemuxMpegts'],
      },
    ],
  },
  {
    name: 'Recording',
    storeKey: 'recording',
    columns: [
      {
        name: 'Settings',
        props: ['record', 'recordPath', 'recordFormat', 'recordMaxPartSize'],
      },
      {
        name: 'Duration',
        props: ['recordPartDuration', 'recordSegmentDuration', 'recordDeleteAfter'],
      },
    ],
  },
  {
    name: 'RTSP',
    storeKey: 'rtsp',
    columns: [
      {
        name: 'RTSP Source',
        props: ['rtspTransport', 'rtspAnyPort', 'rtspRangeType', 'rtspRangeStart', 'rtspUDPSourcePortRange'],
      },
      {
        name: 'RTP Source',
        props: ['rtpSDP'],
      },
    ],
  },
  {
    name: 'WebRTC / WHEP',
    storeKey: 'whep',
    columns: [
      {
        name: 'WHEP Source',
        props: ['whepBearerToken', 'whepSTUNGatherTimeout', 'whepHandshakeTimeout', 'whepTrackGatherTimeout'],
      },
    ],
  },
  {
    name: 'Hooks',
    storeKey: 'hooks',
    columns: [
      {
        name: 'Lifecycle',
        props: ['runOnInit', 'runOnInitRestart', 'runOnDemand', 'runOnDemandRestart', 'runOnDemandStartTimeout', 'runOnDemandCloseAfter', 'runOnUnDemand'],
      },
      {
        name: 'Stream Events',
        props: ['runOnReady', 'runOnReadyRestart', 'runOnNotReady', 'runOnRead', 'runOnReadRestart', 'runOnUnread'],
      },
      {
        name: 'Recording Events',
        props: ['runOnRecordSegmentCreate', 'runOnRecordSegmentComplete'],
      },
    ],
  },
];

// ── Field inputs ──────────────────────────────────────────────────────────────

function MultiTextInput({ prop, value, onChange }) {
  const [rows, setRows] = useState(() => [...(value || []).filter(Boolean), '']);

  function updateRow(idx, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = val;
      const cleaned = next.filter((r, i) => r !== '' || i === next.length - 1);
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
            <button type="button" className="button clear" onClick={() => removeRow(idx)}>
              🞬
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function FieldInput({ prop, value, onChange }) {
  const name = `input-${prop.toLowerCase()}`;

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

  if (Array.isArray(value)) {
    return <MultiTextInput prop={prop} value={value} onChange={onChange} />;
  }

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

export default function PathTab() {
  const [config, setConfig]     = useState(null);
  const [pristine, setPristine] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [isMock, setIsMock]     = useState(false);
  const [activeGroup, setActiveGroup] = useState(PATH_GROUPS[0].name);
  const toast = useToast();
  const abortRef = useRef(null);

  async function loadConfig() {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const res = await fm.fetch('/mediamtx/config/pathdefaults/get');
      if (!res || !res.ok) throw new Error(`HTTP ${res?.status}`);
      const data = await res.json();
      setConfig(data);
      setPristine(JSON.parse(JSON.stringify(data)));
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error('Failed to load path defaults');
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
      const res = await fm.fetch('/mediamtx/config/pathdefaults/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res?.status}`);
      }
      setPristine(JSON.parse(JSON.stringify(config)));
      toast.success('Saved path defaults');
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const isDirty = config && pristine && JSON.stringify(config) !== JSON.stringify(pristine);
  const group = PATH_GROUPS.find((g) => g.name === activeGroup) ?? PATH_GROUPS[0];

  return (
    <div className="tab path">
      {/* Header */}
      <div className="sources-header">
        <div className="sources-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <div>
            <h2 className="sources-title">
              Path Defaults
              {isMock && <span className="sources-mock-badge" style={{ marginLeft: 8 }}>MOCK</span>}
            </h2>
            <p className="sources-subtitle">Default settings applied to all MediaMTX paths</p>
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
        {PATH_GROUPS.map((g) => (
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
                config[prop] !== undefined ? (
                  <FormField
                    key={prop}
                    prop={prop}
                    value={config[prop]}
                    onChange={(val) => updateField(prop, val)}
                  />
                ) : null
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
