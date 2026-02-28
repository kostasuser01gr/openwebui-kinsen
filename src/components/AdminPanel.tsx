import { useState, useEffect, FormEvent } from 'react';

interface UserInfo {
  id: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface SessionInfo {
  id: string;
  title: string;
  userId: string;
  locked: boolean;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AuditEntry {
  id: string;
  ts: string;
  actorId: string;
  actorName?: string;
  action: string;
  targetId?: string;
  targetType?: string;
  ip: string;
}

interface AdminPanelProps {
  user: { id: string; name: string; role: string };
  token: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onBack: () => void;
}

type Tab = 'users' | 'rooms' | 'sessions' | 'shortcuts' | 'audit';

interface RoomInfo {
  id: string;
  name: string;
  locked: boolean;
  createdAt: string;
}

export function AdminPanel({ user, token, darkMode, onToggleDark, onBack }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [roomMsg, setRoomMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Create user
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newPin, setNewPin] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Reset PIN
  const [resetUserId, setResetUserId] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  // Shortcuts
  const [scLabel, setScLabel] = useState('');
  const [scPrompt, setScPrompt] = useState('');
  const [scGlobal, setScGlobal] = useState(true);
  const [shortcuts, setShortcuts] = useState<any[]>([]);

  const auth = (extra?: Record<string, string>): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    ...extra,
  });

  useEffect(() => {
    if (tab === 'users') loadUsers();
    else if (tab === 'rooms') loadRooms();
    else if (tab === 'sessions') loadSessions();
    else if (tab === 'shortcuts') loadShortcuts();
    else if (tab === 'audit') loadAudit();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: auth() });
      if (res.ok) setUsers((await res.json()) as UserInfo[]);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', { headers: auth() });
      if (res.ok) setRooms((await res.json()) as RoomInfo[]);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const toggleRoomLock = async (room: RoomInfo) => {
    setRoomMsg('');
    const action = room.locked ? 'unlock' : 'lock';
    const res = await fetch(`/api/rooms/${room.id}/${action}`, {
      method: 'POST',
      headers: auth(),
    });
    if (res.ok) {
      setRoomMsg(`Room "${room.name}" ${action}ed.`);
      loadRooms();
    } else {
      const d = (await res.json()) as { error?: string };
      setRoomMsg(d.error ?? `Failed to ${action} room.`);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', { headers: auth() });
      if (res.ok) setSessions((await res.json()) as SessionInfo[]);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const loadShortcuts = async () => {
    try {
      const res = await fetch('/api/shortcuts', { headers: auth() });
      if (res.ok) setShortcuts((await res.json()) as any[]);
    } catch {
      /* ignore */
    }
  };

  const loadAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit?limit=200', { headers: auth() });
      if (res.ok) setAuditLog((await res.json()) as AuditEntry[]);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    if (!newName.trim() || !/^\d{4}$/.test(newPin)) {
      setCreateError('Name required and PIN must be 4 digits');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: auth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: newName.trim(), role: newRole, pin: newPin }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        user?: { id: string; name: string };
      };
      if (res.ok && data.user) {
        setCreateSuccess(`User "${data.user.name}" created (ID: ${data.user.id})`);
        setNewName('');
        setNewPin('');
        loadUsers();
      } else {
        setCreateError(data.error ?? 'Failed to create user');
      }
    } catch {
      setCreateError('Network error');
    }
  };

  const handleResetPin = async (e: FormEvent) => {
    e.preventDefault();
    setResetMsg('');
    if (!resetUserId.trim() || !/^\d{4}$/.test(resetPin)) {
      setResetMsg('User ID and 4-digit PIN required.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${resetUserId.trim()}/reset-pin`, {
        method: 'POST',
        headers: auth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pin: resetPin }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      setResetMsg(data.ok ? '✓ PIN reset successfully.' : (data.error ?? 'Failed.'));
      if (data.ok) {
        setResetUserId('');
        setResetPin('');
      }
    } catch {
      setResetMsg('Network error');
    }
  };

  const handleToggleLock = async (sid: string, locked: boolean) => {
    const endpoint = locked ? '/api/chat/unlock' : '/api/chat/lock';
    await fetch(endpoint, {
      method: 'POST',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ sessionId: sid }),
    });
    loadSessions();
  };

  const handleCreateShortcut = async (e: FormEvent) => {
    e.preventDefault();
    if (!scLabel.trim() || !scPrompt.trim()) return;
    await fetch('/api/shortcuts', {
      method: 'POST',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ label: scLabel.trim(), prompt: scPrompt.trim(), global: scGlobal }),
    });
    setScLabel('');
    setScPrompt('');
    loadShortcuts();
  };

  const handleDeleteShortcut = async (id: string) => {
    await fetch(`/api/shortcuts?id=${id}`, { method: 'DELETE', headers: auth() });
    loadShortcuts();
  };

  return (
    <div className={`admin-layout ${darkMode ? 'dark' : ''}`}>
      <header className="admin-header">
        <button className="btn-back" onClick={onBack}>
          &larr; Back to Chat
        </button>
        <h1>Admin Dashboard</h1>
        <div className="admin-header-actions">
          <span>
            {user.name} <span className={`role-badge role-${user.role}`}>{user.role}</span>
          </span>
          <button className="btn-small" onClick={onToggleDark}>
            {darkMode ? '☀ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        {(['users', 'rooms', 'sessions', 'shortcuts', 'audit'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className="admin-content">
        {/* ── Rooms ─────────────────────────────────────────── */}
        {tab === 'rooms' && (
          <div className="admin-section">
            <h2>Room Management</h2>
            <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              Lock a room to restrict new thread creation. Existing threads are unaffected.
            </p>
            {roomMsg && (
              <p
                className={roomMsg.includes('Failed') ? 'error-text' : 'success-text'}
                style={{ marginBottom: '0.75rem' }}
              >
                {roomMsg}
              </p>
            )}
            {loading ? (
              <p>Loading…</p>
            ) : (
              <ul className="rooms-list">
                {rooms.map((r) => (
                  <li key={r.id} className="rooms-list-item">
                    <span className="room-name">{r.name}</span>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      #{r.id}
                    </span>
                    <span className={r.locked ? 'room-locked-badge' : 'room-unlocked-badge'}>
                      {r.locked ? '🔒 Locked' : '🔓 Open'}
                    </span>
                    <button className="btn-small" onClick={() => toggleRoomLock(r)}>
                      {r.locked ? 'Unlock' : 'Lock'}
                    </button>
                  </li>
                ))}
                {!rooms.length && <li className="macro-empty">No rooms found.</li>}
              </ul>
            )}
          </div>
        )}

        {/* ── Users ─────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="admin-section">
            <h2>User Management</h2>

            {user.role === 'admin' && (
              <>
                <form onSubmit={handleCreateUser} className="create-user-form">
                  <h3>Create User</h3>
                  <div className="form-row">
                    <input
                      placeholder="Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                      <option value="user">User</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="admin">Admin</option>
                    </select>
                    <input
                      placeholder="4-digit PIN"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                    <button type="submit">Create</button>
                  </div>
                  {createError && <p className="error-text">{createError}</p>}
                  {createSuccess && <p className="success-text">{createSuccess}</p>}
                </form>

                <form onSubmit={handleResetPin} className="create-user-form">
                  <h3>Reset User PIN</h3>
                  <div className="form-row">
                    <input
                      placeholder="User ID"
                      value={resetUserId}
                      onChange={(e) => setResetUserId(e.target.value.trim())}
                    />
                    <input
                      placeholder="New 4-digit PIN"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={resetPin}
                      onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                    <button type="submit">Reset PIN</button>
                  </div>
                  {resetMsg && (
                    <p className={resetMsg.startsWith('✓') ? 'success-text' : 'error-text'}>
                      {resetMsg}
                    </p>
                  )}
                </form>
              </>
            )}

            {loading ? (
              <p>Loading…</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Active</th>
                    <th>Created</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="mono" title={u.id}>
                        {u.id.slice(0, 8)}
                      </td>
                      <td>{u.name}</td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>{u.role}</span>
                      </td>
                      <td>{u.active ? '✓' : '✗'}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Sessions ──────────────────────────────────────── */}
        {tab === 'sessions' && (
          <div className="admin-section">
            <h2>Session Moderation</h2>
            {loading ? (
              <p>Loading…</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>User</th>
                    <th>Messages</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="mono">{s.id.slice(0, 10)}…</td>
                      <td>{s.title}</td>
                      <td>{s.userId}</td>
                      <td>{s.messageCount}</td>
                      <td>
                        <span className={s.locked ? 'status-locked' : 'status-active'}>
                          {s.locked ? '🔒 Locked' : '● Active'}
                        </span>
                      </td>
                      <td>{new Date(s.updatedAt).toLocaleString()}</td>
                      <td>
                        <button
                          className="btn-small"
                          onClick={() => handleToggleLock(s.id, s.locked)}
                        >
                          {s.locked ? 'Unlock' : 'Lock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Shortcuts ─────────────────────────────────────── */}
        {tab === 'shortcuts' && (
          <div className="admin-section">
            <h2>Shortcut Management</h2>
            <form onSubmit={handleCreateShortcut} className="create-user-form">
              <h3>Create Shortcut</h3>
              <div className="form-row">
                <input
                  placeholder="Label"
                  value={scLabel}
                  onChange={(e) => setScLabel(e.target.value)}
                />
                <input
                  placeholder="Prompt text"
                  value={scPrompt}
                  onChange={(e) => setScPrompt(e.target.value)}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={scGlobal}
                    onChange={(e) => setScGlobal(e.target.checked)}
                  />
                  Global
                </label>
                <button type="submit">Create</button>
              </div>
            </form>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Prompt</th>
                  <th>Scope</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shortcuts.map((sc: any) => (
                  <tr key={sc.id}>
                    <td>{sc.label}</td>
                    <td>{sc.prompt}</td>
                    <td>{sc.global ? 'Global' : 'Personal'}</td>
                    <td>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDeleteShortcut(sc.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Audit Log ─────────────────────────────────────── */}
        {tab === 'audit' && (
          <div className="admin-section">
            <h2>Audit Log</h2>
            <button className="btn-small" onClick={loadAudit} style={{ marginBottom: '1rem' }}>
              ↺ Refresh
            </button>
            {loading ? (
              <p>Loading…</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((e) => (
                    <tr key={`${e.ts}:${e.id}`}>
                      <td className="mono">{new Date(e.ts).toLocaleString()}</td>
                      <td>{e.actorName ?? e.actorId}</td>
                      <td>
                        <code>{e.action}</code>
                      </td>
                      <td className="mono">{e.targetId ?? '—'}</td>
                      <td className="mono">{e.ip}</td>
                    </tr>
                  ))}
                  {!auditLog.length && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center' }}>
                        No audit entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
