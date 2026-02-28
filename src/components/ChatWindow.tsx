import { useState, useEffect, useRef, useCallback, FormEvent, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface UserInfo {
  id: string;
  name: string;
  role: string;
}

interface Thread {
  id: string;
  title: string;
  userId: string;
  roomId: string;
  locked: boolean;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  userId?: string;
  createdAt: string;
  pinned?: boolean;
  deleted?: boolean;
}

interface Room {
  id: string;
  name: string;
  locked: boolean;
  createdAt: string;
}

interface Macro {
  id: string;
  title: string;
  promptTemplate: string;
  global: boolean;
  category?: string;
  order?: number;
  pinned?: boolean;
}

interface ChatWindowProps {
  user: UserInfo | null;
  token: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

function localId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function ChatWindow({
  user,
  token,
  darkMode,
  onToggleDark,
  onLogout,
  onOpenAdmin,
}: ChatWindowProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamContent, setStreamContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [macros, setMacros] = useState<Macro[]>([]);
  const [showMacros, setShowMacros] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pinOld, setPinOld] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdFilter, setCmdFilter] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileLang, setProfileLang] = useState<'en' | 'el'>('en');
  const [profileMsg, setProfileMsg] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const auth = useCallback(
    (extra?: Record<string, string>): Record<string, string> => ({
      Authorization: `Bearer ${token}`,
      ...extra,
    }),
    [token],
  );

  useEffect(() => {
    loadThreads();
    loadMacros();
    loadProfile();
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentThread) loadMessages(currentThread.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentThread?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const loadThreads = async () => {
    try {
      const res = await fetch('/api/threads', { headers: auth() });
      if (res.ok) {
        const data = (await res.json()) as Thread[];
        setThreads(data);
        if (!currentThread && data.length) setCurrentThread(data[0]);
      }
    } catch {
      /* ignore */
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const res = await fetch(`/api/threads/${threadId}/messages`, { headers: auth() });
      if (res.ok) setMessages((await res.json()) as Message[]);
    } catch {
      /* ignore */
    }
  };

  const loadMacros = async () => {
    try {
      const res = await fetch('/api/macros', { headers: auth() });
      if (res.ok) setMacros((await res.json()) as Macro[]);
    } catch {
      /* ignore */
    }
  };

  const loadRooms = async () => {
    try {
      const res = await fetch('/api/rooms', { headers: auth() });
      if (res.ok) setRooms((await res.json()) as Room[]);
    } catch {
      /* ignore */
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', { headers: auth() });
      if (res.ok) {
        const data = (await res.json()) as {
          name?: string;
          preferences?: { language?: string };
        };
        setProfileName(data.name ?? user?.name ?? '');
        setProfileLang((data.preferences?.language as 'en' | 'el') ?? 'en');
      }
    } catch {
      /* ignore */
    }
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        name: profileName.trim() || undefined,
        preferences: { language: profileLang },
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setProfileMsg(data.ok ? '✓ Profile saved.' : (data.error ?? 'Failed.'));
  };

  const newThread = async () => {
    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title: 'New Thread', roomId: selectedRoomId ?? 'global' }),
    });
    if (res.ok) {
      const t = (await res.json()) as Thread;
      setThreads((prev) => [t, ...prev]);
      setCurrentThread(t);
      setMessages([]);
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!confirm('Delete this thread and all its messages?')) return;
    await fetch(`/api/threads/${threadId}`, { method: 'DELETE', headers: auth() });
    const remaining = threads.filter((t) => t.id !== threadId);
    setThreads(remaining);
    if (currentThread?.id === threadId) {
      setCurrentThread(remaining[0] ?? null);
      setMessages([]);
    }
  };

  const archiveThread = async (thread: Thread) => {
    const next = !thread.archived;
    const res = await fetch(`/api/threads/${thread.id}`, {
      method: 'PUT',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ archived: next }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Thread;
      setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (currentThread?.id === updated.id) setCurrentThread(updated);
    }
  };

  const renameThread = async (threadId: string) => {
    if (!renameValue.trim()) {
      setRenaming(null);
      return;
    }
    const res = await fetch(`/api/threads/${threadId}`, {
      method: 'PUT',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Thread;
      setThreads((prev) => prev.map((t) => (t.id === threadId ? updated : t)));
      if (currentThread?.id === threadId) setCurrentThread(updated);
    }
    setRenaming(null);
  };

  const toggleLock = async (thread: Thread) => {
    const url = thread.locked
      ? `/api/threads/${thread.id}/unlock`
      : `/api/threads/${thread.id}/lock`;
    const res = await fetch(url, {
      method: 'POST',
      headers: auth({ 'Content-Type': 'application/json' }),
    });
    if (res.ok) {
      const { thread: updated } = (await res.json()) as { thread: Thread };
      setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (currentThread?.id === updated.id) setCurrentThread(updated);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentThread || isStreaming) return;

    const userMsg: Message = {
      id: localId(),
      threadId: currentThread.id,
      role: 'user',
      content: content.trim(),
      userId: user?.id,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamContent('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/threads/${currentThread.id}/messages`, {
        method: 'POST',
        headers: auth({ 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
        body: JSON.stringify({ content: content.trim() }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setMessages((prev) => [
          ...prev,
          {
            id: localId(),
            threadId: currentThread.id,
            role: 'assistant',
            content: `⚠ ${err.error ?? 'Error from server'}`,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      // SSE streaming
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data) as { response?: string };
              accumulated += parsed.response ?? '';
              setStreamContent(accumulated);
            } catch {
              /* skip malformed chunk */
            }
          }
        }

        if (accumulated) {
          setMessages((prev) => [
            ...prev,
            {
              id: localId(),
              threadId: currentThread.id,
              role: 'assistant',
              content: accumulated,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } else {
        // Non-streaming fallback (shouldn't happen but handle gracefully)
        const data = (await res.json()) as { reply?: string };
        if (data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: localId(),
              threadId: currentThread.id,
              role: 'assistant',
              content: data.reply!,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setMessages((prev) => [
        ...prev,
        {
          id: localId(),
          threadId: currentThread.id,
          role: 'assistant',
          content: '⚠ Connection error. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamContent('');
      abortRef.current = null;
      loadThreads();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyMessage = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const quoteMessage = (content: string) => {
    const quoted = content
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    setInput((prev) => (prev ? `${quoted}\n\n${prev}` : `${quoted}\n\n`));
    textareaRef.current?.focus();
  };

  const deleteMessage = async (threadId: string, msgId: string) => {
    if (!confirm('Delete this message?')) return;
    const res = await fetch(`/api/threads/${threadId}/messages/${msgId}`, {
      method: 'DELETE',
      headers: auth(),
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: '[deleted]', deleted: true } : m)),
      );
    }
  };

  const pinMessage = async (threadId: string, msgId: string, currentlyPinned: boolean) => {
    const res = await fetch(`/api/threads/${threadId}/messages/${msgId}`, {
      method: 'PUT',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pinned: !currentlyPinned }),
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, pinned: !currentlyPinned } : m)),
      );
    }
  };

  const exportThread = (format: 'json' | 'md') => {
    if (!currentThread) return;
    const url = `/api/threads/${currentThread.id}/export?format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    // Need auth header — use fetch + blob URL
    fetch(url, { headers: auth() })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.download = `kinsen-thread-${currentThread.id.slice(0, 8)}.${format}`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        /* ignore */
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.startsWith('/') && !val.includes('\n')) {
      setCmdFilter(val.slice(1).toLowerCase());
      setShowCmdPalette(true);
    } else {
      setShowCmdPalette(false);
      setCmdFilter('');
    }
  };

  const handlePinChange = async (e: FormEvent) => {
    e.preventDefault();
    setPinMsg('');
    if (!/^\d{4}$/.test(pinOld) || !/^\d{4}$/.test(pinNew)) {
      setPinMsg('Both PINs must be exactly 4 digits.');
      return;
    }
    const res = await fetch('/api/user/pin', {
      method: 'PUT',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ oldPin: pinOld, newPin: pinNew }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setPinMsg(data.ok ? '✓ PIN changed successfully.' : (data.error ?? 'Failed.'));
    if (data.ok) {
      setPinOld('');
      setPinNew('');
    }
  };

  const canLock = user?.role === 'coordinator' || user?.role === 'admin';
  const filteredThreads = threads.filter(
    (t) =>
      (showArchived ? t.archived : !t.archived) &&
      (selectedRoomId === null || t.roomId === selectedRoomId) &&
      t.title.toLowerCase().includes(threadSearch.toLowerCase()),
  );
  const pinnedMessages = messages.filter((m) => m.pinned && !m.deleted);
  const cmdMacros = macros.filter((m) => !cmdFilter || m.title.toLowerCase().includes(cmdFilter));

  return (
    <div className={`chat-layout ${darkMode ? 'dark' : ''}`}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-brand">⚡ Kinsen</span>
          <div className="sidebar-header-actions">
            <button className="btn-icon" title="Toggle theme" onClick={onToggleDark}>
              {darkMode ? '☀' : '🌙'}
            </button>
            {onOpenAdmin && (
              <button className="btn-icon" title="Admin Panel" onClick={onOpenAdmin}>
                ⚙
              </button>
            )}
            <button
              className={`btn-icon ${showProfile ? 'active' : ''}`}
              title="Profile"
              onClick={() => setShowProfile((v) => !v)}
            >
              👤
            </button>
            <button className="btn-icon btn-danger-hover" title="Logout" onClick={onLogout}>
              ⏏
            </button>
          </div>
        </div>

        <div className="room-selector">
          <select
            className="room-select"
            value={selectedRoomId ?? ''}
            onChange={(e) => {
              setSelectedRoomId(e.target.value || null);
              setCurrentThread(null);
              setMessages([]);
            }}
          >
            <option value="">All Rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.locked ? '🔒 ' : ''}
                {r.name}
              </option>
            ))}
          </select>
          <button className="btn-new-thread" onClick={newThread}>
            + New Thread
          </button>
        </div>

        <input
          className="search-input"
          placeholder="Search threads…"
          value={threadSearch}
          onChange={(e) => setThreadSearch(e.target.value)}
        />

        <div className="thread-list-header">
          <button
            className={`btn-archived-toggle ${showArchived ? 'active' : ''}`}
            title={showArchived ? 'Show active threads' : 'Show archived threads'}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? '📂 Archived' : '📁 Active'}
          </button>
        </div>

        <ul className="thread-list">
          {filteredThreads.map((t) => (
            <li key={t.id} className={`thread-item ${currentThread?.id === t.id ? 'active' : ''}`}>
              {renaming === t.id ? (
                <input
                  className="rename-input"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => renameThread(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') renameThread(t.id);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                />
              ) : (
                <button className="thread-title-btn" onClick={() => setCurrentThread(t)}>
                  {t.locked && (
                    <span className="lock-icon" title="Locked">
                      🔒
                    </span>
                  )}
                  <span className="thread-name">{t.title}</span>
                  <span className="thread-count">{t.messageCount}</span>
                </button>
              )}
              <div className="thread-row-actions">
                {canLock && (
                  <button
                    className="btn-icon-sm"
                    title={t.locked ? 'Unlock' : 'Lock'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(t);
                    }}
                  >
                    {t.locked ? '🔓' : '🔒'}
                  </button>
                )}
                <button
                  className="btn-icon-sm"
                  title={t.archived ? 'Unarchive' : 'Archive'}
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveThread(t);
                  }}
                >
                  {t.archived ? '↩' : '🗄'}
                </button>
                {!t.archived && (
                  <button
                    className="btn-icon-sm"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming(t.id);
                      setRenameValue(t.title);
                    }}
                  >
                    ✎
                  </button>
                )}
                <button
                  className="btn-icon-sm btn-danger-hover"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteThread(t.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
          {!filteredThreads.length && (
            <li className="thread-empty">
              {showArchived ? 'No archived threads.' : 'No threads yet.'}
            </li>
          )}
        </ul>

        {/* Quick Actions */}
        <div className="macros-section">
          <button className="macros-toggle" onClick={() => setShowMacros((v) => !v)}>
            ⚡ Quick Actions {showMacros ? '▲' : '▼'}
          </button>
          {showMacros && (
            <ul className="macros-list">
              {macros.map((m) => (
                <li key={m.id}>
                  <button
                    className="macro-btn"
                    onClick={() => {
                      setInput(m.promptTemplate);
                      setShowMacros(false);
                      textareaRef.current?.focus();
                    }}
                  >
                    {m.global && (
                      <span className="macro-global-dot" title="Global">
                        ●
                      </span>
                    )}
                    {m.title}
                  </button>
                </li>
              ))}
              {!macros.length && <li className="macro-empty">No quick actions yet.</li>}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────── */}
      <main className="chat-main">
        {showProfile ? (
          <div className="profile-panel">
            <div className="profile-header">
              <h2>Profile</h2>
              <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
              <button className="btn-small" onClick={() => setShowProfile(false)}>
                ✕ Close
              </button>
            </div>

            {/* Display name + language */}
            <form className="profile-section" onSubmit={handleProfileSave}>
              <h3>Account Settings</h3>
              <div className="profile-field-row">
                <label htmlFor="profile-name">Display Name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  maxLength={50}
                  placeholder="Your display name"
                />
              </div>
              <div className="profile-field-row">
                <label htmlFor="profile-lang">Language</label>
                <select
                  id="profile-lang"
                  value={profileLang}
                  onChange={(e) => setProfileLang(e.target.value as 'en' | 'el')}
                >
                  <option value="en">English</option>
                  <option value="el">Ελληνικά</option>
                </select>
              </div>
              {profileMsg && (
                <p className={profileMsg.startsWith('✓') ? 'success-text' : 'error-text'}>
                  {profileMsg}
                </p>
              )}
              <button type="submit" className="btn-primary">
                Save Profile
              </button>
            </form>

            {/* PIN change */}
            <form className="profile-section pin-change-form" onSubmit={handlePinChange}>
              <h3>Change PIN</h3>
              <div className="form-row">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Current PIN"
                  value={pinOld}
                  onChange={(e) => setPinOld(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="New PIN"
                  value={pinNew}
                  onChange={(e) => setPinNew(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
                <button type="submit" className="btn-primary">
                  Update
                </button>
              </div>
              {pinMsg && (
                <p className={pinMsg.startsWith('✓') ? 'success-text' : 'error-text'}>{pinMsg}</p>
              )}
            </form>
          </div>
        ) : !currentThread ? (
          <div className="chat-empty">
            <div className="chat-empty-content">
              <h1>⚡ Kinsen Station AI</h1>
              <p>Start a new thread to chat with your AI assistant.</p>
              <button className="btn-primary" onClick={newThread}>
                + New Thread
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div>
                {currentThread.locked && <span className="lock-badge">🔒 Locked</span>}
                <h2 className="chat-header-title">{currentThread.title}</h2>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  #{currentThread.roomId}
                </span>
              </div>
              <div className="chat-header-actions">
                <span className="text-muted">{messages.length} msgs</span>
                <div
                  className="export-dropdown"
                  style={{ position: 'relative', display: 'inline-block' }}
                >
                  <button
                    className="btn-small"
                    onClick={() => exportThread('md')}
                    title="Export as Markdown"
                  >
                    ⬇ MD
                  </button>
                  <button
                    className="btn-small"
                    onClick={() => exportThread('json')}
                    title="Export as JSON"
                    style={{ marginLeft: 4 }}
                  >
                    ⬇ JSON
                  </button>
                </div>
              </div>
            </div>

            {/* Pinned messages banner */}
            {pinnedMessages.length > 0 && (
              <div className="pinned-banner">
                <span className="pinned-banner-label">📌 {pinnedMessages.length} pinned</span>
                <div className="pinned-banner-list">
                  {pinnedMessages.map((m) => (
                    <span key={m.id} className="pinned-banner-item">
                      {m.content.slice(0, 80)}
                      {m.content.length > 80 ? '…' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="messages-container">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message message-${msg.role}${msg.pinned ? ' message-pinned' : ''}${msg.deleted ? ' message-deleted' : ''}`}
                >
                  <div className="message-meta">
                    <span className="message-author">
                      {msg.role === 'user' ? (user?.name ?? 'You') : '🤖 Kinsen'}
                    </span>
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.pinned && (
                      <span className="msg-pin-indicator" title="Pinned">
                        📌
                      </span>
                    )}
                    {!msg.deleted && (
                      <>
                        <button
                          className="btn-icon-sm"
                          title="Copy message"
                          onClick={() => copyMessage(msg.content, msg.id)}
                        >
                          {copied === msg.id ? '✓' : '⎘'}
                        </button>
                        <button
                          className="btn-icon-sm"
                          title="Quote message"
                          onClick={() => quoteMessage(msg.content)}
                        >
                          ❝
                        </button>
                        {canLock && (
                          <button
                            className="btn-icon-sm"
                            title={msg.pinned ? 'Unpin' : 'Pin message'}
                            onClick={() => pinMessage(currentThread.id, msg.id, !!msg.pinned)}
                          >
                            {msg.pinned ? '📍' : '📌'}
                          </button>
                        )}
                        {(msg.userId === user?.id || canLock) && (
                          <button
                            className="btn-icon-sm btn-danger-hover"
                            title="Delete message"
                            onClick={() => deleteMessage(currentThread.id, msg.id)}
                          >
                            🗑
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="message-body">
                    {msg.deleted ? (
                      <p className="msg-deleted-text">[deleted]</p>
                    ) : msg.role === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && (
                <div className="message message-assistant streaming">
                  <div className="message-meta">
                    <span className="message-author">🤖 Kinsen</span>
                    <span className="streaming-dot">●</span>
                  </div>
                  <div className="message-body">
                    {streamContent ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown>
                    ) : (
                      <span className="typing-dots">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form className="composer" onSubmit={handleSubmit}>
              {currentThread.locked && !canLock ? (
                <div className="locked-notice">
                  🔒 This thread is locked. Only coordinators and admins can reply.
                </div>
              ) : (
                <>
                  {showCmdPalette && cmdMacros.length > 0 && (
                    <ul className="cmd-palette">
                      {cmdMacros.slice(0, 8).map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            className="cmd-palette-item"
                            onClick={() => {
                              setInput(m.promptTemplate);
                              setShowCmdPalette(false);
                              setCmdFilter('');
                              textareaRef.current?.focus();
                            }}
                          >
                            <span className="cmd-palette-title">{m.title}</span>
                            {m.category && (
                              <span className="cmd-palette-category">{m.category}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <textarea
                    ref={textareaRef}
                    className="composer-textarea"
                    placeholder={`Message ${currentThread.title}… (/ for macros, Enter to send)`}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && showCmdPalette) {
                        setShowCmdPalette(false);
                        setCmdFilter('');
                        return;
                      }
                      handleKeyDown(e);
                    }}
                    disabled={isStreaming}
                    rows={2}
                  />
                  <div className="composer-footer">
                    {isStreaming ? (
                      <button
                        type="button"
                        className="btn-stop"
                        onClick={() => abortRef.current?.abort()}
                      >
                        ⏹ Stop
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="btn-send"
                        disabled={!input.trim() || isStreaming}
                      >
                        Send ↑
                      </button>
                    )}
                  </div>
                </>
              )}
            </form>
          </>
        )}
      </main>
    </div>
  );
}
