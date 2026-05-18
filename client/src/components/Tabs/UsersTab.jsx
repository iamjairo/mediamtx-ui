import { useEffect, useRef, useState } from 'react';
import { fm } from '../../lib/fetchManager.js';
import { useToast } from '../../lib/toast.jsx';

// ── Constants ─────────────────────────────────────────────────────────────────

const PERMISSION_ACTIONS = ['', 'publish', 'read', 'playback', 'api', 'metrics', 'pprof'];

const USER_DEFAULTS = {
  user: 'new',
  pass: 'password',
  permissions: [],
  ips: [],
};

// ── Add/Edit user modal — in-tree, GoRTCSourcesTab pattern ──────────────────

function UserDialog({ user, onClose, onSave }) {
  const isEdit = !!user;
  const [username, setUsername]     = useState(user?.user ?? '');
  const [password, setPassword]     = useState(user?.pass ?? '');
  const [permissions, setPermissions] = useState(user?.permissions ?? []);
  const [ips, setIps]               = useState(user?.ips ?? []);
  const [busy, setBusy]             = useState(false);
  const toast = useToast();

  // ── Permission rows ───────────────────────────────────────────────────────

  function addPermRow() {
    setPermissions((prev) => [...prev, { action: '', path: '' }]);
  }

  function updatePerm(idx, field, val) {
    setPermissions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  }

  function removePerm(idx) {
    setPermissions((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── IP rows ───────────────────────────────────────────────────────────────

  function addIpRow() {
    setIps((prev) => [...prev, '']);
  }

  function updateIp(idx, val) {
    setIps((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }

  function removeIp(idx) {
    setIps((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const trimName = username.trim();
    if (!trimName) {
      toast.error('Username is required');
      return;
    }
    const userData = {
      user: trimName,
      pass: password,
      permissions: permissions.filter((p) => p.action !== ''),
      ips: ips.filter(Boolean),
    };
    setBusy(true);
    await onSave(userData, isEdit ? user.user : null);
    setBusy(false);
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="sources-dialog" onClick={handleBackdrop}>
      <div className="sources-dialog-backdrop" onClick={onClose} />
      <div className="sources-dialog-content" style={{ maxWidth: 540, width: '95%' }}>
        <h3>{isEdit ? `Edit user "${user.user}"` : 'Add user'}</h3>

        {/* Username */}
        <div className="sources-form-row">
          <label>Username</label>
          <input
            type="text"
            value={username}
            disabled={isEdit}
            placeholder="username"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="sources-form-row">
          <label>Password</label>
          <input
            type="text"
            value={password}
            placeholder="plain or as secure key"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Permissions */}
        <div className="sources-form-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <label>Permissions</label>
          <div className="multi-row permissions" style={{ width: '100%' }}>
            {permissions.map((perm, idx) => (
              <div className="row" key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  value={perm.action}
                  onChange={(e) => updatePerm(idx, 'action', e.target.value)}
                >
                  {PERMISSION_ACTIONS.map((a) => (
                    <option key={a} value={a}>{a || '(none)'}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={perm.path}
                  placeholder="path ..."
                  onChange={(e) => updatePerm(idx, 'path', e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="button" className="button clear" onClick={() => removePerm(idx)}>
                  🞬
                </button>
              </div>
            ))}
            <button type="button" className="phase2-btn sm secondary" onClick={addPermRow} style={{ marginTop: 4 }}>
              + Add permission
            </button>
          </div>
        </div>

        {/* IPs */}
        <div className="sources-form-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <label>Allowed IPs</label>
          <div className="multi-row" style={{ width: '100%' }}>
            {ips.map((ip, idx) => (
              <div className="row" key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  value={ip}
                  placeholder="192.168.1.0/24"
                  onChange={(e) => updateIp(idx, e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="button" className="button clear" onClick={() => removeIp(idx)}>
                  🞬
                </button>
              </div>
            ))}
            <button type="button" className="phase2-btn sm secondary" onClick={addIpRow} style={{ marginTop: 4 }}>
              + Add IP
            </button>
          </div>
        </div>

        <div className="sources-dialog-actions">
          <button className="phase2-btn sm secondary dlg-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="phase2-btn sm dlg-save" disabled={busy} onClick={handleSave}>
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User row card ─────────────────────────────────────────────────────────────

function UserRow({ user, onEdit, onDelete }) {
  const permCount = user.permissions?.length ?? 0;
  const ipCount   = user.ips?.length ?? 0;

  return (
    <div className="user">
      <div className="form-item username">
        <label>USERNAME</label>
        <span className="user-value">{user.user}</span>
      </div>
      <div className="form-item password">
        <label>PASSWORD</label>
        <span className="user-value">{'•'.repeat(Math.min(user.pass?.length ?? 8, 12))}</span>
      </div>
      <div className="form-item permissions">
        <label>PERMISSIONS</label>
        <span className="user-value">
          {permCount === 0
            ? 'none'
            : user.permissions.map((p) => `${p.action}${p.path ? ':' + p.path : ''}`).join(', ')}
        </span>
      </div>
      <div className="form-item ips">
        <label>IPS</label>
        <span className="user-value">
          {ipCount === 0 ? 'any' : user.ips.join(', ')}
        </span>
      </div>
      <div className="user-actions">
        <button
          className="phase2-btn sm secondary"
          onClick={() => onEdit(user)}
          title="Edit user"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {' '}Edit
        </button>
        <button
          className="delete"
          onClick={() => onDelete(user.user)}
          title="Delete user"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {' '}Delete user
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function UsersTab() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock]   = useState(false);
  // dialog: null | 'add' | user-object (edit)
  const [dialog, setDialog]   = useState(null);
  const toast = useToast();
  const abortRef = useRef(null);

  // Users live inside the global config at authInternalUsers
  async function loadUsers() {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const res = await fm.fetch('/mediamtx/config/global/get');
      if (!res || !res.ok) throw new Error(`HTTP ${res?.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data.authInternalUsers) ? data.authInternalUsers : []);
      setIsMock(res.headers.get('X-Mock-Fallback') === '1');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  }

  // Persist modified user list back via global PATCH
  async function patchUsers(nextUsers) {
    const res = await fm.fetch('/mediamtx/config/global/patch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authInternalUsers: nextUsers }),
    });
    if (!res || !res.ok) {
      const err = await res?.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${res?.status}`);
    }
    return nextUsers;
  }

  useEffect(() => {
    loadUsers();
    return () => abortRef.current?.abort();
  }, []);

  // onSave receives userData + originalUsername (null for new)
  async function handleSave(userData, originalUsername) {
    try {
      let next;
      if (originalUsername === null) {
        // add
        next = [...users, userData];
      } else {
        // edit — replace by original username
        next = users.map((u) => (u.user === originalUsername ? userData : u));
      }
      await patchUsers(next);
      setUsers(next);
      setDialog(null);
      toast.success(originalUsername ? `User "${userData.user}" updated` : `User "${userData.user}" created`);
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    }
  }

  async function handleDelete(username) {
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      const next = users.filter((u) => u.user !== username);
      await patchUsers(next);
      setUsers(next);
      toast.success(`User "${username}" deleted`);
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  }

  return (
    <div className="tab users">
      {/* Header */}
      <div className="sources-header">
        <div className="sources-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <div>
            <h2 className="sources-title">
              Users
              {isMock && <span className="sources-mock-badge" style={{ marginLeft: 8 }}>MOCK</span>}
            </h2>
            <p className="sources-subtitle">
              Internal authentication users — {users.length} user{users.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="sources-header-right">
          <button className="phase2-btn sm secondary" onClick={loadUsers} disabled={loading}>
            Refresh
          </button>
          <button className="phase2-btn sm" onClick={() => setDialog('add')}>
            + Add user
          </button>
        </div>
      </div>

      {/* User list */}
      {loading ? (
        <div className="sources-empty">Loading…</div>
      ) : users.length === 0 ? (
        <div className="sources-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted-color)" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <p>No users configured. Click "Add user" to create one.</p>
        </div>
      ) : (
        <div className="user-list">
          {users.map((u) => (
            <UserRow
              key={u.user}
              user={u}
              onEdit={(user) => setDialog(user)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {dialog !== null && (
        <UserDialog
          user={dialog === 'add' ? null : dialog}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
