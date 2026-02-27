import { useState, useRef, useEffect, FormEvent, useCallback } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface SessionMeta {
  id: string;
  title: string;
  locked: boolean;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Shortcut {
  id: string;
  label: string;
  prompt: string;
  global: boolean;
}

interface ChatWindowProps {
  user: { id: string; name: string; role: string } | null;
  token: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

export function ChatWindow({
  user,
  token,
  darkMode,
  onToggleDark,
  onLogout,
  onOpenAdmin,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper: build headers with Bearer token
  const authHeaders = useCallback(
    (extra?: Record<string, string>): Record<string, string> => ({
      Authorization: `Bearer ${token}`,
      ...extra,
    }),
    [token],
  );

  const jsonAuthHeaders = useCallback(
    () => authHeaders({ 'Content-Type': 'application/json' }),
    [authHeaders],
  );

  // Load sessions and shortcuts on mount
  useEffect(() => {
    loadSessions();
    loadShortcuts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions', { headers: authHeaders() });
      if (res.ok) {
        const data = (await res.json()) as SessionMeta[];
        setSessions(data);
      }
    } catch {
      /* ignore */
    }
  };

  const loadShortcuts = async () => {
    try {
      const res = await fetch('/api/shortcuts', { headers: authHeaders() });
      if (res.ok) {
        const data = (await res.json()) as Shortcut[];
        setShortcuts(data);
      }
    } catch {
      /* ignore */
    }
  };

  const loadSession = async (sid: string) => {
    try {
      const res = await fetch(`/api/chat/history?sessionId=${sid}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as { messages?: ChatMessage[]; locked?: boolean };
        setSessionId(sid);
        setMessages(data.messages || []);
        setIsLocked(data.locked || false);
      }
    } catch {
      /* ignore */
    }
  };

  const startNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setIsLocked(false);
  };

  const sendMessage = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || loading || isLocked) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ message: text, sessionId, token }),
      });

      const data = (await res.json()) as { reply?: string; sessionId?: string; error?: string };

      if (res.ok) {
        if (!sessionId && data.sessionId) setSessionId(data.sessionId);
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: data.reply || '',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        loadSessions();
      } else {
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: `Error: ${data.error || 'Failed to get response'}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Network error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleLock = async () => {
    if (!sessionId) return;
    const endpoint = isLocked ? '/api/chat/unlock' : '/api/chat/lock';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setIsLocked(!isLocked);
        loadSessions();
      }
    } catch {
      /* ignore */
    }
  };

  const handleSave = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch('/api/chat/save', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        alert('Session archived successfully');
      }
    } catch {
      /* ignore */
    }
  };

  const canLock = user?.role === 'admin' || user?.role === 'coordinator';

  return (
    <div className={`chat-layout ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      {showSidebar && (
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <h2>Kinsen Station AI</h2>
            <button className="btn-new-chat" onClick={startNewSession}>
              + New Chat
            </button>
          </div>

          <div className="session-list">
            {sessions.map((s) => (
              <button
                key={s.id}
                className={`session-item ${s.id === sessionId ? 'active' : ''} ${s.locked ? 'locked' : ''}`}
                onClick={() => loadSession(s.id)}
              >
                <span className="session-title">{s.title}</span>
                {s.locked && <span className="lock-badge">Locked</span>}
                <span className="session-count">{s.messageCount} msgs</span>
              </button>
            ))}
            {sessions.length === 0 && <p className="no-sessions">No conversations yet</p>}
          </div>

          <div className="sidebar-footer">
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <div className="sidebar-actions">
              {onOpenAdmin && (
                <button className="btn-small" onClick={onOpenAdmin}>
                  Admin
                </button>
              )}
              <button className="btn-small" onClick={() => setShowProfile(!showProfile)}>
                Profile
              </button>
              <button className="btn-small" onClick={onToggleDark}>
                {darkMode ? 'Light' : 'Dark'}
              </button>
              <button className="btn-small btn-logout" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main chat area */}
      <main className="chat-main">
        <div className="chat-header">
          <button className="btn-toggle-sidebar" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? '\u2190' : '\u2192'}
          </button>
          <h3>
            {sessionId
              ? sessions.find((s) => s.id === sessionId)?.title || 'Chat'
              : 'New Conversation'}
          </h3>
          <div className="chat-header-actions">
            {isLocked && <span className="lock-indicator">Locked</span>}
            {canLock && sessionId && (
              <button className="btn-small" onClick={handleLock}>
                {isLocked ? 'Unlock' : 'Lock'}
              </button>
            )}
            {sessionId && (
              <>
                <button className="btn-small" onClick={handleSave}>
                  Save
                </button>
                <button className="btn-small" onClick={() => setShowHistory(!showHistory)}>
                  History
                </button>
              </>
            )}
          </div>
        </div>

        {/* Shortcuts bar */}
        {shortcuts.length > 0 && (
          <div className="shortcuts-bar">
            {shortcuts.map((sc) => (
              <button
                key={sc.id}
                className="shortcut-btn"
                onClick={() => sendMessage(sc.prompt)}
                disabled={loading || isLocked}
                title={sc.prompt}
              >
                {sc.label}
                {sc.global && <span className="shortcut-global">G</span>}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <h2>Welcome to Kinsen Station AI</h2>
              <p>Start a conversation or select a session from the sidebar.</p>
              <p>Use the shortcut buttons above for quick prompts.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? user?.name?.charAt(0) || 'U' : 'AI'}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-avatar">AI</div>
              <div className="message-content">
                <div className="message-text typing">Thinking...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLocked ? 'This session is locked' : 'Type your message...'}
            disabled={loading || isLocked}
            maxLength={2000}
          />
          <button
            type="submit"
            className="btn-send"
            disabled={loading || isLocked || !input.trim()}
          >
            {loading ? '...' : 'Send'}
          </button>
        </form>
      </main>

      {/* Profile panel */}
      {showProfile && (
        <ProfilePanel user={user} token={token} onClose={() => setShowProfile(false)} />
      )}

      {/* History panel */}
      {showHistory && sessionId && (
        <HistoryPanel
          sessionId={sessionId}
          messages={messages}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

// Profile panel component
function ProfilePanel({
  user,
  token,
  onClose,
}: {
  user: { id: string; name: string; role: string } | null;
  token: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, avatar: avatar || undefined }),
      });
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  return (
    <aside className="panel-overlay">
      <div className="panel">
        <div className="panel-header">
          <h3>Profile</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="panel-body">
          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Avatar URL</label>
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <input value={user?.role || ''} disabled />
          </div>
          <button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </aside>
  );
}

// History panel component
function HistoryPanel({
  sessionId,
  messages,
  onClose,
}: {
  sessionId: string;
  messages: ChatMessage[];
  onClose: () => void;
}) {
  return (
    <aside className="panel-overlay">
      <div className="panel panel-wide">
        <div className="panel-header">
          <h3>Session History</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="panel-body">
          <p className="session-id">Session: {sessionId}</p>
          <p className="message-count">{messages.length} messages</p>
          <div className="history-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`history-msg ${msg.role}`}>
                <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>
                <span>{msg.content}</span>
                <small>{new Date(msg.timestamp).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
