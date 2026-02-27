import { useState, FormEvent } from 'react';

interface UserInfo {
  id: string;
  name: string;
  role: string;
}

interface LoginGateProps {
  onSuccess: (user: UserInfo, token: string) => void;
  darkMode: boolean;
}

export function LoginGate({ onSuccess, darkMode }: LoginGateProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), pin }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        token?: string;
        user?: UserInfo;
      };

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (data.user && data.token) onSuccess(data.user, data.token);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-container ${darkMode ? 'dark' : ''}`}>
      <div className="login-card">
        <div className="login-header">
          <h1>Kinsen Station AI</h1>
          <p>Collaborative AI Chat Workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-name">Name</label>
            <input
              id="login-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-pin">4-Digit PIN</label>
            <input
              id="login-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
