import { useState, useEffect, FormEvent } from 'react';

const ACCOUNTS_KEY = 'kinsen:accounts';

interface SavedAccount {
  name: string;
  lastLogin: string;
}

function loadSavedAccounts(): SavedAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]') as SavedAccount[];
  } catch {
    return [];
  }
}

function saveAccount(name: string): void {
  try {
    const accounts = loadSavedAccounts().filter((a) => a.name !== name);
    accounts.unshift({ name, lastLogin: new Date().toISOString() });
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 5)));
  } catch {
    /* ignore */
  }
}

interface UserInfo {
  id: string;
  name: string;
  role: string;
}

interface LoginGateProps {
  onSuccess: (user: UserInfo, token: string) => void;
  darkMode: boolean;
}

type AuthMode = 'signin' | 'signup';

export function LoginGate({ onSuccess, darkMode }: LoginGateProps) {
  const [mode, setMode] = useState<AuthMode>('signin');

  // Sign In fields
  const [siName, setSiName] = useState('');
  const [siPin, setSiPin] = useState('');

  // Sign Up fields
  const [suName, setSuName] = useState('');
  const [suPin, setSuPin] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [suInvite, setSuInvite] = useState('');
  // Reveal invite field when server indicates invite_only mode
  const [showInviteField, setShowInviteField] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    setSavedAccounts(loadSavedAccounts());
  }, []);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
  };

  // ── Sign In ─────────────────────────────────────────────
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!siName.trim()) {
      setError('Name is required');
      return;
    }
    if (!/^\d{4}$/.test(siPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: siName.trim(), pin: siPin }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        token?: string;
        user?: UserInfo;
      };

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }

      if (data.user && data.token) {
        saveAccount(data.user.name);
        onSuccess(data.user, data.token);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ─────────────────────────────────────────────
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = suName.trim();
    if (!trimmedName) {
      setError('Display name is required');
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError('Display name must be 2–50 characters');
      return;
    }
    if (!/^\d{4}$/.test(suPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (suPin !== suConfirm) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName: trimmedName,
          pin: suPin,
          confirmPin: suConfirm,
          inviteCode: suInvite.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        token?: string;
        user?: UserInfo;
      };

      if (!res.ok) {
        // Reveal invite-code field when server signals invite_only mode
        if (res.status === 403 && data.error?.toLowerCase().includes('invite')) {
          setShowInviteField(true);
        }
        setError(data.error ?? 'Sign-up failed');
        return;
      }

      if (data.user && data.token) {
        saveAccount(data.user.name);
        onSuccess(data.user, data.token);
      }
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

        {/* Mode toggle */}
        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`auth-mode-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => switchMode('signin')}
            disabled={loading}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-mode-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        {/* ── Sign In form ── */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="login-form">
            {savedAccounts.length > 0 && (
              <div className="saved-accounts">
                <p className="saved-accounts-label">Quick sign-in:</p>
                <div className="saved-accounts-list">
                  {savedAccounts.map((a) => (
                    <button
                      key={a.name}
                      type="button"
                      className="saved-account-btn"
                      onClick={() => setSiName(a.name)}
                      disabled={loading}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="si-name">Name</label>
              <input
                id="si-name"
                type="text"
                value={siName}
                onChange={(e) => setSiName(e.target.value)}
                placeholder="Enter your name"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="si-pin">4-Digit PIN</label>
              <input
                id="si-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                value={siPin}
                onChange={(e) => setSiPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <p className="auth-switch-hint">
              No account?{' '}
              <button type="button" className="link-btn" onClick={() => switchMode('signup')}>
                Sign Up
              </button>
            </p>
          </form>
        )}

        {/* ── Sign Up form ── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="login-form">
            <div className="form-group">
              <label htmlFor="su-name">Display Name</label>
              <input
                id="su-name"
                type="text"
                value={suName}
                onChange={(e) => setSuName(e.target.value)}
                placeholder="Your name (2–50 characters)"
                autoComplete="username"
                maxLength={50}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="su-pin">4-Digit PIN</label>
              <input
                id="su-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                value={suPin}
                onChange={(e) => setSuPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="su-confirm">Confirm PIN</label>
              <input
                id="su-confirm"
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                value={suConfirm}
                onChange={(e) => setSuConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            {showInviteField && (
              <div className="form-group">
                <label htmlFor="su-invite">Invite Code</label>
                <input
                  id="su-invite"
                  type="text"
                  value={suInvite}
                  onChange={(e) => setSuInvite(e.target.value)}
                  placeholder="Enter invite code"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            )}

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            <p className="auth-switch-hint">
              Already have an account?{' '}
              <button type="button" className="link-btn" onClick={() => switchMode('signin')}>
                Sign In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
