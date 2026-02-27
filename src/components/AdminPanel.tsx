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

interface AdminPanelProps {
  user: { id: string; name: string; role: string };
  token: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onBack: () => void;
}

export function AdminPanel({ user, token, darkMode, onToggleDark, onBack }: AdminPanelProps) {
  const [tab, setTab] = useState<'users' | 'sessions' | 'shortcuts'>('users');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // Create user form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newPin, setNewPin] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Shortcut form
  const [scLabel, setScLabel] = useState('');
  const [scPrompt, setScPrompt] = useState('');
  const [scGlobal, setScGlobal] = useState(true);
  const [shortcuts, setShortcuts] = useState<any[]>([]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'sessions') loadSessions();
    if (tab === 'shortcuts') loadShortcuts();
  }, [tab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) setUsers(await res.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions', { credentials: 'include' });
      if (res.ok) setSessions(await res.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const loadShortcuts = async () => {
    try {
      const res = await fetch('/api/shortcuts', { credentials: 'include' });
      if (res.ok) setShortcuts(await res.json());
    } catch {
      /* ignore */
    }
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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        setCreateError(data.error || 'Failed to create user');
      }
    } catch {
      setCreateError('Network error');
    }
  };

  const handleToggleLock = async (sid: string, currentlyLocked: boolean) => {
    const endpoint = currentlyLocked ? '/api/chat/unlock' : '/api/chat/lock';
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: sid }),
      });
      loadSessions();
    } catch {
      /* ignore */
    }
  };

  const handleCreateShortcut = async (e: FormEvent) => {
    e.preventDefault();
    if (!scLabel.trim() || !scPrompt.trim()) return;

    try {
      await fetch('/api/shortcuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label: scLabel.trim(), prompt: scPrompt.trim(), global: scGlobal }),
      });
      setScLabel('');
      setScPrompt('');
      loadShortcuts();
    } catch {
      /* ignore */
    }
  };

  const handleDeleteShortcut = async (id: string) => {
    try {
      await fetch(`/api/shortcuts?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      loadShortcuts();
    } catch {
      /* ignore */
    }
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
            Logged in as {user.name} ({user.role})
          </span>
          <button className="btn-small" onClick={onToggleDark}>
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Users
        </button>
        <button className={tab === 'sessions' ? 'active' : ''} onClick={() => setTab('sessions')}>
          Sessions
        </button>
        <button className={tab === 'shortcuts' ? 'active' : ''} onClick={() => setTab('shortcuts')}>
          Shortcuts
        </button>
      </nav>

      <main className="admin-content">
        {/* Users Tab */}
        {tab === 'users' && (
          <div className="admin-section">
            <h2>User Management</h2>

            {user.role === 'admin' && (
              <form onSubmit={handleCreateUser} className="create-user-form">
                <h3>Create New User</h3>
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
            )}

            {loading ? (
              <p>Loading users...</p>
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
                      <td className="mono">{u.id}</td>
                      <td>{u.name}</td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>{u.role}</span>
                      </td>
                      <td>{u.active ? 'Yes' : 'No'}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {tab === 'sessions' && (
          <div className="admin-section">
            <h2>Session Moderation</h2>
            {loading ? (
              <p>Loading sessions...</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Session ID</th>
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
                      <td className="mono">{s.id.slice(0, 12)}...</td>
                      <td>{s.title}</td>
                      <td>{s.userId}</td>
                      <td>{s.messageCount}</td>
                      <td>
                        {s.locked ? (
                          <span className="status-locked">Locked</span>
                        ) : (
                          <span className="status-active">Active</span>
                        )}
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

        {/* Shortcuts Tab */}
        {tab === 'shortcuts' && (
          <div className="admin-section">
            <h2>Shortcut Management</h2>

            <form onSubmit={handleCreateShortcut} className="create-shortcut-form">
              <h3>Create Shortcut</h3>
              <div className="form-row">
                <input
                  placeholder="Label (button text)"
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
      </main>
    </div>
  );
}
