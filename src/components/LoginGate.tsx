import { useState, FormEvent } from 'react';

interface UserInfo {
  name: string;
  email?: string;
  role: string;
}

interface Props {
  onSuccess: (user: UserInfo) => void;
  darkMode: boolean;
}

export function LoginGate({ onSuccess, darkMode }: Props) {
  const [mode, setMode] = useState<'passcode' | 'email'>('passcode');
  const [passcode, setPasscode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = mode === 'passcode'
        ? { passcode }
        : { email, password };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json() as { ok?: boolean; error?: string; user?: UserInfo };

      if (res.ok && data.user) {
        onSuccess(data.user);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" data-theme={darkMode ? 'dark' : 'light'}>
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 100 100" width="56" height="56">
            <rect width="100" height="100" rx="20" fill="#1e40af" />
            <text x="50" y="68" fontFamily="Arial" fontSize="50" fontWeight="bold" fill="white" textAnchor="middle">K</text>
          </svg>
        </div>
        <h1>Kinsen Chat</h1>
        <p className="login-subtitle">Car Rental Operations Hub</p>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'passcode' ? 'active' : ''}`}
            onClick={() => setMode('passcode')}
            type="button"
          >
            Passcode
          </button>
          <button
            className={`login-tab ${mode === 'email' ? 'active' : ''}`}
            onClick={() => setMode('email')}
            type="button"
          >
            Email Login
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'passcode' ? (
            <input
              type="password"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              placeholder="Enter staff passcode"
              autoFocus
              disabled={loading}
            />
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                autoFocus
                disabled={loading}
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                disabled={loading}
              />
            </>
          )}
          <button
            type="submit"
            disabled={loading || (mode === 'passcode' ? !passcode : !email || !password)}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}
