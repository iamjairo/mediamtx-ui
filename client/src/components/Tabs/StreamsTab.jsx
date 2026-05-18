import { useEffect, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';
import { useToast } from '../../lib/toast.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitCamelCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

// Path groups used within each stream card — mirrors path_groups.js
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
        props: ['alwaysAvailable', 'alwaysAvailableFile'],
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
      { name: 'Settings', props: ['record', 'recordPath', 'recordFormat', 'recordMaxPartSize'] },
      { name: 'Duration',  props: ['recordPartDuration', 'recordSegmentDuration', 'recordDeleteAfter'] },
    ],
  },
  {
    name: 'RTSP',
    storeKey: 'rtsp',
    columns: [
      { name: 'RTSP Source', props: ['rtspTransport', 'rtspAnyPort', 'rtspRangeType', 'rtspRangeStart', 'rtspUDPSourcePortRange'] },
      { name: 'RTP Source',  props: ['rtpSDP'] },
    ],
  },
  {
    name: 'WebRTC / WHEP',
    storeKey: 'whep',
    columns: [
      { name: 'WHEP Source', props: ['whepBearerToken', 'whepSTUNGatherTimeout', 'whepHandshakeTimeout', 'whepTrackGatherTimeout'] },
    ],
  },
  {
    name: 'Hooks',
    storeKey: 'hooks',
    columns: [
      { name: 'Lifecycle',        props: ['runOnInit', 'runOnInitRestart', 'runOnDemand', 'runOnDemandRestart', 'runOnDemandStartTimeout', 'runOnDemandCloseAfter', 'runOnUnDemand'] },
      { name: 'Stream Events',    props: ['runOnReady', 'runOnReadyRestart', 'runOnNotReady', 'runOnRead', 'runOnReadRestart', 'runOnUnread'] },
      { name: 'Recording Events', props: ['runOnRecordSegmentCreate', 'runOnRecordSegmentComplete'] },
    ],
  },
];

// ── Field inputs (path-level) ─────────────────────────────────────────────────

function MultiTextPathInput({ prop, value, onChange }) {
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

function PathFieldInput({ prop, value, onChange }) {
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
    return <MultiTextPathInput prop={prop} value={value} onChange={onChange} />;
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

function PathFormField({ prop, value, onChange }) {
  const label = splitCamelCase(prop).toUpperCase();
  const isBool = typeof value === 'boolean';
  return (
    <div className={`form-item${isBool ? ' switch' : ''}${Array.isArray(value) ? ' rows' : ''}`}>
      <label htmlFor={`input-${prop.toLowerCase()}`}>{label}</label>
      <PathFieldInput prop={prop} value={value} onChange={onChange} />
    </div>
  );
}

// ── Single stream card ────────────────────────────────────────────────────────

function StreamCard({ name, data, onUpdate, onDelete }) {
  const [fields, setFields]       = useState(data || {});
  const [pristine, setPristine]   = useState(JSON.parse(JSON.stringify(data || {})));
  const [activeGroup, setActive]  = useState(PATH_GROUPS[0].name);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving]       = useState(false);
  const toast = useToast();

  const isDirty = JSON.stringify(fields) !== JSON.stringify(pristine);
  const group = PATH_GROUPS.find((g) => g.name === activeGroup) ?? PATH_GROUPS[0];

  function updateField(prop, value) {
    setFields((prev) => ({ ...prev, [prop]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(name, fields);
      setPristine(JSON.parse(JSON.stringify(fields)));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete path "${name}"?`)) return;
    onDelete(name);
  }

  const sourceVal = fields.source ?? 'publisher';

  return (
    <div className={`path${collapsed ? ' collapsed' : ''}`}>
      {/* collapse toggle */}
      <button className="collapse-toggle" onClick={() => setCollapsed((c) => !c)}>
        {collapsed ? '▶ Expand' : '▼ Collapse'}
      </button>

      {/* left: main controls */}
      <div className="path-main">
        <button className="delete" onClick={handleDelete}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {' '}Delete path
        </button>

        {/* inline group nav */}
        <nav className="group-navigation" style={{ marginTop: 8, marginBottom: 8 }}>
          {PATH_GROUPS.map((g) => (
            <button
              key={g.name}
              className={`nav-btn${activeGroup === g.name ? ' active' : ''}`}
              onClick={() => setActive(g.name)}
            >
              {g.name}
            </button>
          ))}
        </nav>

        {/* name + source always visible */}
        <div className="form-item name">
          <label htmlFor={`input-name-${name}`}>NAME</label>
          <input
            type="text"
            id={`input-name-${name}`}
            defaultValue={fields.name ?? name}
            onBlur={(e) => updateField('name', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') updateField('name', e.target.value); }}
          />
        </div>
        <div className="form-item source">
          <label htmlFor={`input-source-${name}`}>SOURCE</label>
          <input
            type="text"
            id={`input-source-${name}`}
            defaultValue={sourceVal}
            onBlur={(e) => updateField('source', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') updateField('source', e.target.value); }}
          />
        </div>

        {/* group fields */}
        <div className="groups">
          {group.columns.map((col) => (
            <div className="group" key={col.name}>
              {col.props.filter((p) => p !== 'source').map((prop) =>
                fields[prop] !== undefined ? (
                  <PathFormField
                    key={prop}
                    prop={prop}
                    value={fields[prop]}
                    onChange={(val) => updateField(prop, val)}
                  />
                ) : null
              )}
            </div>
          ))}
        </div>

        {isDirty && (
          <button className="phase2-btn sm" style={{ marginTop: 12 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save path'}
          </button>
        )}
      </div>

      {/* right: preview card */}
      <div className="path-preview">
        <div className="stream-preview-card">
          <div className="preview-video-area">
            <div className="preview-placeholder">
              <div className="preview-cam-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <span>Stream Ready</span>
            </div>
          </div>
          <div className="preview-info">
            {[
              { label: 'Name',     value: fields.name ?? name,  cls: 'preview-value' },
              { label: 'Protocol', value: sourceVal,            cls: 'preview-value' },
              { label: 'Status',   value: 'Live',               cls: 'preview-value-status' },
            ].map(({ label, value, cls }) => (
              <div className="preview-info-row" key={label}>
                <span className="preview-label">{label}</span>
                <span className={cls}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StreamsTab() {
  const [paths, setPaths]   = useState({});   // { name: pathData }
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock]   = useState(false);
  const toast = useToast();
  const abortRef = useRef(null);

  async function loadPaths() {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const res = await fm.fetch('/mediamtx/config/paths/list');
      if (!res || !res.ok) throw new Error(`HTTP ${res?.status}`);
      const data = await res.json();

      // API returns { items: [ { name, ...fields } ] }
      const map = {};
      for (const item of data.items ?? []) {
        map[item.name] = item;
      }
      setPaths(map);
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error('Failed to load paths');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPaths();
    return () => abortRef.current?.abort();
  }, []);

  async function handleAddPath() {
    try {
      const newName = `path-${Date.now()}`;
      const res = await fm.fetch(`/mediamtx/config/paths/add/${newName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, source: 'publisher', sourceOnDemand: false }),
      });
      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res?.status}`);
      }
      toast.success('Path added');
      await loadPaths();
    } catch (err) {
      toast.error(`Failed to add path: ${err.message}`);
    }
  }

  async function handleUpdatePath(name, data) {
    try {
      if (data.name && data.name !== name) {
        // rename: delete + re-add
        await fm.fetch(`/mediamtx/config/paths/delete/${name}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        await fm.fetch(`/mediamtx/config/paths/add/${data.name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        toast.success(`Path renamed to ${data.name}`);
      } else {
        const res = await fm.fetch(`/mediamtx/config/paths/patch/${name}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res || !res.ok) {
          const err = await res?.json().catch(() => ({}));
          throw new Error(err?.error || `HTTP ${res?.status}`);
        }
        toast.success(`Path "${name}" updated`);
      }
      await loadPaths();
    } catch (err) {
      toast.error(`Update failed: ${err.message}`);
    }
  }

  async function handleDeletePath(name) {
    try {
      const res = await fm.fetch(`/mediamtx/config/paths/delete/${name}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res?.status}`);
      }
      toast.success(`Path "${name}" deleted`);
      setPaths((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  }

  const pathEntries = Object.entries(paths);

  return (
    <div className="tab paths">
      {/* Header */}
      <div className="sources-header">
        <div className="sources-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <div>
            <h2 className="sources-title">
              Streams
              {isMock && <span className="sources-mock-badge" style={{ marginLeft: 8 }}>MOCK</span>}
            </h2>
            <p className="sources-subtitle">
              Configure individual MediaMTX path entries — {pathEntries.length} path{pathEntries.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="sources-header-right">
          <button className="phase2-btn sm secondary" onClick={loadPaths} disabled={loading}>
            Refresh
          </button>
          <button className="phase2-btn sm" onClick={handleAddPath}>
            + Add path
          </button>
        </div>
      </div>

      {/* Path list */}
      {loading ? (
        <div className="sources-empty">Loading…</div>
      ) : pathEntries.length === 0 ? (
        <div className="sources-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.5">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          </svg>
          <p>No paths configured. Click "Add path" to create one.</p>
        </div>
      ) : (
        <div className="paths-list">
          {pathEntries.map(([name, data]) => (
            <StreamCard
              key={name}
              name={name}
              data={data}
              onUpdate={handleUpdatePath}
              onDelete={handleDeletePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
