import { useState, useEffect, useCallback } from 'react';
import { LoginGate } from './components/LoginGate';
import { ChatWindow } from './components/ChatWindow';
import { AdminPanel } from './components/admin/AdminPanel';
import OnboardingTour from './components/OnboardingTour';
import CommandPalette from './components/CommandPalette';
import NotificationCenter, { NotificationBell } from './components/NotificationCenter';
import VehicleBoard from './components/VehicleBoard';
import { ToastProvider, ErrorBoundary } from './components/ChatExtras';
import type { UserPreferences, Notification as NotifType } from './lib/types';

interface UserInfo {
  name: string;
  email?: string;
  role: string;
}

interface AuthMeResponse {
  ok?: boolean;
  user?: UserInfo;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [view, setView] = useState<'chat' | 'admin' | 'vehicles'>('chat');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kinsen-dark-mode') === 'true';
    }
    return false;
  });
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  // Actions triggered by command palette, forwarded to ChatWindow
  const [pendingAction, setPendingAction] = useState<{ action: string; payload?: unknown } | null>(
    null,
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('kinsen-dark-mode', String(darkMode));
  }, [darkMode]);

  // Session check
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          return res.json() as Promise<AuthMeResponse>;
        }
        return null;
      })
      .then((data) => {
        if (data?.user) {
          setAuthenticated(true);
          setUser(data.user);
          localStorage.setItem('kinsen-user', JSON.stringify(data.user));
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // Load preferences & notifications after auth
  useEffect(() => {
    if (!authenticated) return;
    fetch('/api/preferences', { credentials: 'include' })
      .then((r) => (r.ok ? (r.json() as Promise<UserPreferences>) : null))
      .then((p) => {
        if (p) setPreferences(p);
      })
      .catch(() => {});

    const loadNotifCount = () => {
      fetch('/api/notifications', { credentials: 'include' })
        .then((r) => (r.ok ? (r.json() as Promise<NotifType[]>) : []))
        .then((notifs) => {
          if (Array.isArray(notifs)) setUnreadCount(notifs.filter((n) => !n.read).length);
        })
        .catch(() => {});
    };
    loadNotifCount();
    const interval = setInterval(loadNotifCount, 60000);
    return () => clearInterval(interval);
  }, [authenticated]);

  // Global keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogin = (userInfo: UserInfo) => {
    setAuthenticated(true);
    setUser(userInfo);
    localStorage.setItem('kinsen-user', JSON.stringify(userInfo));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // best effort logout
    } finally {
      localStorage.removeItem('kinsen-user');
      setUser(null);
      setAuthenticated(false);
      setView('chat');
    }
  };

  const handleCommandAction = useCallback(
    (action: string, payload?: unknown) => {
      switch (action) {
        case 'toggle-dark':
          setDarkMode((d) => !d);
          break;
        case 'open-admin':
          setView('admin');
          break;
        case 'open-vehicles':
          setView('vehicles');
          break;
        default:
          // Forward to ChatWindow via pending action
          setPendingAction({ action, payload });
          if (view !== 'chat') setView('chat');
          break;
      }
    },
    [view],
  );

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading Kinsen Chat…</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <ToastProvider>
        <LoginGate onSuccess={handleLogin} darkMode={darkMode} />
      </ToastProvider>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'supervisor';

  return (
    <ToastProvider>
      <ErrorBoundary>
        {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}
        {showCommandPalette && (
          <CommandPalette
            onClose={() => setShowCommandPalette(false)}
            onAction={handleCommandAction}
            preferences={preferences || undefined}
          />
        )}

        {view === 'admin' && isAdmin ? (
          <ErrorBoundary>
            <AdminPanel
              user={user!}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode(!darkMode)}
              onBack={() => setView('chat')}
            />
          </ErrorBoundary>
        ) : view === 'vehicles' ? (
          <ErrorBoundary>
            <VehicleBoard onClose={() => setView('chat')} />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            <ChatWindow
              user={user}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode(!darkMode)}
              onLogout={handleLogout}
              onOpenAdmin={isAdmin ? () => setView('admin') : undefined}
              notificationBell={
                <NotificationBell
                  onClick={() => setShowNotifications(!showNotifications)}
                  unreadCount={unreadCount}
                />
              }
              onOpenVehicles={() => setView('vehicles')}
              onOpenCommandPalette={() => setShowCommandPalette(true)}
              pendingAction={pendingAction}
              onActionConsumed={() => setPendingAction(null)}
              preferences={preferences}
              onUpdatePreferences={setPreferences}
            />
          </ErrorBoundary>
        )}

        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      </ErrorBoundary>
    </ToastProvider>
  );
}
