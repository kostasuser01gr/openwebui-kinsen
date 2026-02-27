import { useState, FormEvent } from 'react';
import { Alert, Badge, Button, Card, InputField, PageShell } from './ui';

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
  const [mode, setMode] = useState<'passcode' | 'email' | 'signup'>('passcode');
  const [name, setName] = useState('');
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
      const endpoint =
        mode === 'passcode'
          ? '/api/auth'
          : mode === 'signup'
            ? '/api/auth/signup'
            : '/api/auth/login';

      const body =
        mode === 'passcode'
          ? { passcode }
          : mode === 'signup'
            ? { name, email, password }
            : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        details?: string[];
        user?: UserInfo;
      };

      if (res.ok && data.user) {
        onSuccess(data.user);
      } else {
        const details =
          Array.isArray(data.details) && data.details.length > 0
            ? ` ${data.details.join('. ')}`
            : '';
        setError((data.error || 'Authentication failed') + details);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell className="login-container" data-theme={darkMode ? 'dark' : 'light'}>
      <Card className="login-card" elevated>
        <div className="login-logo-wrap">
          <div className="login-logo" aria-hidden="true">
            <svg viewBox="0 0 100 100" width="56" height="56">
              <rect width="100" height="100" rx="20" fill="#1e40af" />
              <text
                x="50"
                y="68"
                fontFamily="Arial"
                fontSize="50"
                fontWeight="bold"
                fill="white"
                textAnchor="middle"
              >
                K
              </text>
            </svg>
          </div>
          <Badge tone="info">Operations Hub</Badge>
        </div>
        <h1>Kinsen Chat</h1>
        <p className="login-subtitle">Car Rental Operations Hub</p>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'passcode' ? 'active' : ''}`}
            onClick={() => setMode('passcode')}
            type="button"
            aria-pressed={mode === 'passcode'}
            data-testid="tab-passcode"
          >
            Passcode
          </button>
          <button
            className={`login-tab ${mode === 'email' ? 'active' : ''}`}
            onClick={() => setMode('email')}
            type="button"
            aria-pressed={mode === 'email'}
            data-testid="tab-email"
          >
            Email Login
          </button>
          <button
            className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
            type="button"
            aria-pressed={mode === 'signup'}
            data-testid="tab-signup"
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ui-form-stack" aria-label="Authentication form">
          {mode === 'passcode' ? (
            <InputField
              id="passcode"
              label="Staff passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter staff passcode"
              autoFocus
              disabled={loading}
              data-testid="passcode-input"
            />
          ) : mode === 'signup' ? (
            <>
              <InputField
                id="name"
                label="Full name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoFocus
                disabled={loading}
                data-testid="signup-name-input"
              />
              <InputField
                id="email-signup"
                label="Work email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                disabled={loading}
                data-testid="signup-email-input"
              />
              <InputField
                id="password-signup"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={loading}
                data-testid="signup-password-input"
              />
            </>
          ) : (
            <>
              <InputField
                id="email-login"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoFocus
                disabled={loading}
                data-testid="login-email-input"
              />
              <InputField
                id="password-login"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={loading}
                data-testid="login-password-input"
              />
            </>
          )}
          <Button
            type="submit"
            disabled={
              loading ||
              (mode === 'passcode'
                ? !passcode
                : !email || !password || (mode === 'signup' && !name))
            }
            data-testid="auth-submit"
          >
            {loading ? 'Working…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </Button>
        </form>
        {error && (
          <Alert tone="danger" className="login-error-wrap">
            <p className="login-error" aria-live="assertive">
              {error}
            </p>
          </Alert>
        )}
      </Card>
    </PageShell>
  );
}
