import { useState, useEffect } from 'react';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export function UsersTab() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState('');

  // Create form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('agent');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) {
        setUsers((await res.json()) as UserInfo[]);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createUser = async () => {
    if (!newEmail || !newName || !newPassword) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          password: newPassword,
          role: newRole,
        }),
      });
      if (res.ok) {
        setMessage('User created!');
        setShowCreate(false);
        setNewEmail('');
        setNewName('');
        setNewPassword('');
        setNewRole('agent');
        fetchUsers();
      } else {
        const data = (await res.json()) as { error: string };
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Create failed');
    }
    setCreating(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const toggleActive = async (user: UserInfo) => {
    try {
      await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: user.id, active: !user.active }),
      });
      fetchUsers();
    } catch {
      /* ignore */
    }
  };

  const changeRole = async (user: UserInfo, role: string) => {
    try {
      await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: user.id, role }),
      });
      fetchUsers();
    } catch {
      /* ignore */
    }
  };

  if (loading) return <div className="tab-loading">Loading users…</div>;

  return (
    <div className="users-tab">
      <div className="tab-toolbar">
        <h3>👥 User Management</h3>
        <button className="btn-secondary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {message && <div className="tab-message">{message}</div>}

      {showCreate && (
        <div className="create-user-form">
          <div className="form-row">
            <div className="form-field">
              <label>Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@kinsen-rentals.com"
              />
            </div>
            <div className="form-field">
              <label>Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Password *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Initial password"
              />
            </div>
            <div className="form-field">
              <label>Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="agent">Agent</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={createUser}
            disabled={creating || !newEmail || !newName || !newPassword}
          >
            {creating ? 'Creating…' : 'Create User'}
          </button>
        </div>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={!u.active ? 'inactive-row' : ''}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value)}
                    className="role-select"
                  >
                    <option value="agent">Agent</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <span className={`status-badge ${u.active ? 'active' : 'inactive'}`}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                <td>
                  <button className="btn-sm" onClick={() => toggleActive(u)}>
                    {u.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No users yet. Create one above or use passcode authentication.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
