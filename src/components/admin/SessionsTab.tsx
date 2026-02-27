import React, { useState, useEffect, useCallback } from 'react';

interface SessionInfo {
  token: string;
  ip: string;
  createdAt: string;
  current: boolean;
}

export function SessionsManager() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/user-sessions', { credentials: 'include' });
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revokeSession = async (tokenPrefix: string) => {
    setRevoking(tokenPrefix);
    try {
      await fetch(`/api/user-sessions?token=${tokenPrefix}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await fetchSessions();
    } catch {
      /* ignore */
    }
    setRevoking(null);
  };

  const revokeAll = async () => {
    if (!confirm('Revoke all other sessions?')) return;
    setRevoking('all');
    try {
      await fetch('/api/user-sessions?token=all', {
        method: 'DELETE',
        credentials: 'include',
      });
      await fetchSessions();
    } catch {
      /* ignore */
    }
    setRevoking(null);
  };

  if (loading) return <div className="loading-spinner">Loading sessions…</div>;

  return (
    <div className="sessions-manager">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>Active Sessions</h3>
        {sessions.length > 1 && (
          <button className="btn btn-sm" onClick={revokeAll} disabled={revoking === 'all'}>
            Revoke All Others
          </button>
        )}
      </div>
      {sessions.length === 0 ? (
        <p className="text-muted">No active sessions found.</p>
      ) : (
        <table className="admin-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Token</th>
              <th>IP</th>
              <th>Created</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.token}>
                <td>
                  <code>{s.token}</code>
                </td>
                <td>{s.ip}</td>
                <td>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}</td>
                <td>
                  {s.current ? (
                    <span style={{ color: 'var(--success)' }}>● Current</span>
                  ) : (
                    'Active'
                  )}
                </td>
                <td>
                  {!s.current && (
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--danger, #dc3545)', color: '#fff' }}
                      onClick={() => revokeSession(s.token.replace('…', ''))}
                      disabled={revoking !== null}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
