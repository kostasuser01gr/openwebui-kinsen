import { useState, useEffect } from 'react';
import { LoginGate } from './components/LoginGate';
import { ChatWindow } from './components/ChatWindow';
import { AdminPanel } from './components/AdminPanel';

interface UserInfo {
  id: string;
  name: string;
  role: string;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('kinsen-token');
    }
    return null;
  });
  const [view, setView] = useState<'chat' | 'admin'>('chat');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kinsen-dark-mode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('kinsen-dark-mode', String(darkMode));
  }, [darkMode]);

  // Session check — try stored token first, then cookie fallback
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    fetch('/api/auth/me', { headers, credentials: 'include' })
      .then((res) => (res.ok ? (res.json() as Promise<{ user?: UserInfo }>) : null))
      .then((data) => {
        if (data?.user) {
          setAuthenticated(true);
          setUser(data.user);
        } else {
          // Clear stale token
          sessionStorage.removeItem('kinsen-token');
          setToken(null);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (userInfo: UserInfo, newToken: string) => {
    setAuthenticated(true);
    setUser(userInfo);
    setToken(newToken);
    sessionStorage.setItem('kinsen-token', newToken);
  };

  const handleLogout = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/auth/logout', { method: 'POST', headers, credentials: 'include' });
    } catch {
      // best effort
    } finally {
      sessionStorage.removeItem('kinsen-token');
      setToken(null);
      setUser(null);
      setAuthenticated(false);
      setView('chat');
    }
  };

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading Kinsen Station AI...</p>
      </div>
    );
  }

  if (!authenticated || !token) {
    return <LoginGate onSuccess={handleLogin} darkMode={darkMode} />;
  }

  const isAdminOrCoord = user?.role === 'admin' || user?.role === 'coordinator';

  if (view === 'admin' && isAdminOrCoord) {
    return (
      <AdminPanel
        user={user!}
        token={token}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
        onBack={() => setView('chat')}
      />
    );
  }

  return (
    <ChatWindow
      user={user}
      token={token}
      darkMode={darkMode}
      onToggleDark={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
      onOpenAdmin={isAdminOrCoord ? () => setView('admin') : undefined}
    />
  );
}
