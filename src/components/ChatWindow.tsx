import { useState, useRef, useEffect, FormEvent, useCallback, ReactNode } from 'react';
import { MessageBubble } from './MessageBubble';
import { MacroPanel } from './MacroPanel';
import { ChecklistPanel } from './ChecklistPanel';
import WorkflowWizard from './WorkflowWizard';
import CustomerLookup from './CustomerLookup';
import EmailGenerator from './EmailGenerator';
import EscalationPanel from './EscalationPanel';
import {
  CitationReader,
  MessageSearch,
  SavedReplies,
  AutoSuggest,
  ErrorBoundary,
} from './ChatExtras';
import { useToast } from './ChatExtras';
import type { UserPreferences } from '../lib/types';

interface UserInfo {
  name: string;
  email?: string;
  role: string;
}

interface Citation {
  id: string;
  title: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  suggestedFollowups?: string[];
  confidence?: 'high' | 'medium' | 'low';
  timestamp: string;
  pinned?: boolean;
  reactions?: string[];
  bookmarked?: boolean;
}

interface Props {
  user: UserInfo | null;
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
  notificationBell?: ReactNode;
  onOpenVehicles?: () => void;
  onOpenCommandPalette?: () => void;
  pendingAction?: { action: string; payload?: unknown } | null;
  onActionConsumed?: () => void;
  preferences?: UserPreferences | null;
  onUpdatePreferences?: (prefs: UserPreferences) => void;
}

type SidePanel =
  | 'none'
  | 'macros'
  | 'checklists'
  | 'workflows'
  | 'customers'
  | 'email'
  | 'escalations'
  | 'citation'
  | 'search'
  | 'saved-replies';

export function ChatWindow({
  user,
  darkMode,
  onToggleDark,
  onLogout,
  onOpenAdmin,
  notificationBell,
  onOpenVehicles,
  onOpenCommandPalette,
  pendingAction,
  onActionConsumed,
  preferences,
  onUpdatePreferences,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [showSidebar, setShowSidebar] = useState(false);
  const [citationNote, setCitationNote] = useState<{ id: string; title: string } | null>(null);
  const [showAutoSuggest, setShowAutoSuggest] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Handle pending actions from command palette
  useEffect(() => {
    if (!pendingAction) return;
    switch (pendingAction.action) {
      case 'new-chat':
        setMessages([]);
        setSessionId(null);
        break;
      case 'export-chat':
        handleExportChat();
        break;
      case 'open-macros':
        setSidePanel('macros');
        break;
      case 'open-checklists':
        setSidePanel('checklists');
        break;
      case 'open-workflows':
        setSidePanel('workflows');
        break;
      case 'open-customers':
        setSidePanel('customers');
        break;
      case 'open-email':
        setSidePanel('email');
        break;
      case 'open-search':
        setSidePanel('search');
        break;
      case 'open-saved-replies':
        setSidePanel('saved-replies');
        break;
      case 'search':
        if (typeof pendingAction.payload === 'string') {
          setInput(pendingAction.payload);
          inputRef.current?.focus();
        }
        break;
      case 'run-macro':
        setSidePanel('macros');
        break;
    }
    onActionConsumed?.();
  }, [pendingAction]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape to clear input & close side panel
      if (e.key === 'Escape') {
        setInput('');
        setSidePanel('none');
      }
      // Cmd/Ctrl + Shift + M for macros
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setSidePanel((p) => (p === 'macros' ? 'none' : 'macros'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: trimmed, sessionId }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          window.location.reload();
          return;
        }
        throw new Error(`Error: ${res.status}`);
      }

      const data = (await res.json()) as {
        reply: string;
        citations: Citation[];
        sessionId: string;
        suggestedFollowups: string[];
        confidence?: 'high' | 'medium' | 'low';
      };
      setSessionId(data.sessionId);

      // Track recent search in preferences
      if (preferences && onUpdatePreferences) {
        const recent = [
          trimmed,
          ...(preferences.recentSearches || []).filter((s) => s !== trimmed),
        ].slice(0, 20);
        const updated = { ...preferences, recentSearches: recent };
        onUpdatePreferences(updated);
        fetch('/api/preferences', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recentSearches: recent }),
        }).catch(() => {});
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply,
        citations: data.citations,
        suggestedFollowups: data.suggestedFollowups,
        confidence: data.confidence,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
    // Up arrow when input is empty → edit last user message
    if (e.key === 'ArrowUp' && input === '') {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        e.preventDefault();
        setInput(lastUserMsg.content);
      }
    }
  };

  const handleFeedback = useCallback(
    async (messageIndex: number, rating: 'up' | 'down') => {
      if (!sessionId) return;
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId, messageIndex, rating }),
        });
      } catch {
        /* best effort */
      }
    },
    [sessionId],
  );

  const handleExportChat = () => {
    const text = messages
      .map((m) => {
        const role = m.role === 'user' ? '👤 You' : '🤖 Kinsen';
        return `${role} (${new Date(m.timestamp).toLocaleString()}):\n${m.content}\n`;
      })
      .join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinsen-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Voice input via Web Speech API
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast('warning', 'Voice input is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? ' ' : '') + transcript);
      inputRef.current?.focus();
    };
    recognition.start();
  };

  const handleMacroResult = (result: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: result,
        timestamp: new Date().toISOString(),
      },
    ]);
    setSidePanel('none');
    addToast('success', 'Macro executed successfully');
  };

  // Handle citation click
  const handleCitationClick = (citation: Citation) => {
    setCitationNote(citation);
    setSidePanel('citation');
  };

  // Toggle pin on message
  const handleTogglePin = (index: number) => {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, pinned: !m.pinned } : m)));
    addToast('info', 'Message pin toggled');
  };

  // Add reaction to message
  const handleReaction = (index: number, emoji: string) => {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const reactions = m.reactions || [];
        return {
          ...m,
          reactions: reactions.includes(emoji)
            ? reactions.filter((r) => r !== emoji)
            : [...reactions, emoji],
        };
      }),
    );
  };

  // Toggle bookmark
  const handleBookmark = (index: number) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, bookmarked: !m.bookmarked } : m)),
    );
    const msg = messages[index];
    const bookmarks = JSON.parse(localStorage.getItem('kinsen-bookmarks') || '[]');
    const exists = bookmarks.findIndex((b: any) => b.content === msg.content);
    if (exists >= 0) {
      bookmarks.splice(exists, 1);
      addToast('info', 'Bookmark removed');
    } else {
      bookmarks.push({ content: msg.content, role: msg.role, timestamp: msg.timestamp });
      addToast('success', 'Message bookmarked');
    }
    localStorage.setItem('kinsen-bookmarks', JSON.stringify(bookmarks));
  };

  // Pinned messages
  const pinnedMessages = messages.filter((m) => m.pinned);

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      {showSidebar && (
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <h3>Sessions</h3>
            <button
              className="icon-btn"
              onClick={() => setShowSidebar(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
          <button
            className="sidebar-item active"
            onClick={() => {
              setMessages([]);
              setSessionId(null);
            }}
          >
            + New Conversation
          </button>

          {/* Recent searches */}
          {preferences?.recentSearches && preferences.recentSearches.length > 0 && (
            <div className="sidebar-section">
              <h4>🔍 Recent Searches</h4>
              {preferences.recentSearches.slice(0, 5).map((s, i) => (
                <button
                  key={i}
                  className="sidebar-item"
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                    setShowSidebar(false);
                  }}
                >
                  {s.length > 35 ? s.slice(0, 35) + '…' : s}
                </button>
              ))}
            </div>
          )}

          <div className="sidebar-info">
            <small>
              Session history is saved automatically. Start a new conversation to begin fresh.
            </small>
          </div>
        </aside>
      )}

      <div className="chat-container">
        <header className="chat-header">
          <div className="header-left">
            <button
              className="icon-btn"
              onClick={() => setShowSidebar(!showSidebar)}
              aria-label="Toggle sidebar"
              title="Sessions"
            >
              ☰
            </button>
            <svg viewBox="0 0 100 100" width="28" height="28">
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
            <div>
              <h1>Kinsen Chat</h1>
              <span className="header-tag">
                {user ? `${user.name} · ${user.role}` : 'Car Rental Ops Assistant'}
              </span>
            </div>
          </div>
          <div className="header-actions">
            {onOpenCommandPalette && (
              <button
                className="icon-btn"
                onClick={onOpenCommandPalette}
                title="Command Palette (⌘K)"
              >
                ⌘
              </button>
            )}
            <button
              className={`icon-btn ${sidePanel === 'macros' ? 'active' : ''}`}
              onClick={() => setSidePanel((p) => (p === 'macros' ? 'none' : 'macros'))}
              title="Macros & Calculators (⌘⇧M)"
            >
              🧮
            </button>
            <button
              className={`icon-btn ${sidePanel === 'checklists' ? 'active' : ''}`}
              onClick={() => setSidePanel((p) => (p === 'checklists' ? 'none' : 'checklists'))}
              title="Checklists"
            >
              ✅
            </button>
            <button
              className={`icon-btn ${sidePanel === 'workflows' ? 'active' : ''}`}
              onClick={() => setSidePanel((p) => (p === 'workflows' ? 'none' : 'workflows'))}
              title="Guided Workflows"
            >
              📋
            </button>
            <button
              className={`icon-btn ${sidePanel === 'customers' ? 'active' : ''}`}
              onClick={() => setSidePanel((p) => (p === 'customers' ? 'none' : 'customers'))}
              title="Customer Lookup"
            >
              👤
            </button>
            <button
              className={`icon-btn ${sidePanel === 'email' ? 'active' : ''}`}
              onClick={() => setSidePanel((p) => (p === 'email' ? 'none' : 'email'))}
              title="Email Generator"
            >
              ✉️
            </button>
            <button
              className={`icon-btn ${sidePanel === 'escalations' ? 'active' : ''}`}
              onClick={() => setSidePanel((p) => (p === 'escalations' ? 'none' : 'escalations'))}
              title="Escalations"
            >
              🔴
            </button>
            <button
              className={`icon-btn ${sidePanel === 'search' ? 'active' : ''}`}
              onClick={() => setSidePanel((p) => (p === 'search' ? 'none' : 'search'))}
              title="Search Messages"
            >
              🔍
            </button>
            <button
              className={`icon-btn ${sidePanel === 'saved-replies' ? 'active' : ''}`}
              onClick={() =>
                setSidePanel((p) => (p === 'saved-replies' ? 'none' : 'saved-replies'))
              }
              title="Saved Replies"
            >
              💬
            </button>
            {onOpenVehicles && (
              <button className="icon-btn" onClick={onOpenVehicles} title="Vehicle Status Board">
                🚗
              </button>
            )}
            {messages.length > 0 && (
              <button className="icon-btn" onClick={handleExportChat} title="Export chat">
                ⬇
              </button>
            )}
            {notificationBell}
            <button className="icon-btn" onClick={onToggleDark} title="Toggle dark mode">
              {darkMode ? '☀️' : '🌙'}
            </button>
            {onLogout && (
              <button
                className="icon-btn"
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
                data-testid="signout-button"
              >
                ↪
              </button>
            )}
            {onOpenAdmin && (
              <button className="icon-btn" onClick={onOpenAdmin} title="Admin Panel">
                ⚙️
              </button>
            )}
          </div>
        </header>

        <div className="chat-body">
          <main className="chat-messages">
            {/* Pinned messages bar */}
            {pinnedMessages.length > 0 && (
              <div className="pinned-messages-bar">
                <span className="pinned-label">📌 Pinned ({pinnedMessages.length})</span>
                {pinnedMessages.map((m, i) => (
                  <div key={i} className="pinned-msg-preview">
                    {m.content.slice(0, 60)}
                    {m.content.length > 60 ? '…' : ''}
                  </div>
                ))}
              </div>
            )}

            {messages.length === 0 && (
              <div className="welcome-message">
                <h2>👋 Welcome to Kinsen Chat{user ? `, ${user.name}` : ''}</h2>
                <p>Ask me about our car rental policies, procedures, and operations.</p>
                <div className="quick-actions">
                  {[
                    'What is our late return policy?',
                    'How do I handle a damage report?',
                    'What are the insurance packages?',
                    'Cross-border rental rules?',
                    'Calculate a late fee',
                    'Customer verification steps',
                  ].map((q) => (
                    <button
                      key={q}
                      className="quick-action"
                      onClick={() => {
                        setInput(q);
                        inputRef.current?.focus();
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="shortcut-hints">
                  <span>⌘K Focus</span>
                  <span>↑ Edit last</span>
                  <span>⌘⇧M Macros</span>
                  <span>Esc Clear</span>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                messageIndex={i}
                onFeedback={msg.role === 'assistant' ? handleFeedback : undefined}
                onFollowupClick={(q) => {
                  setInput(q);
                  inputRef.current?.focus();
                }}
                onCitationClick={handleCitationClick}
                onTogglePin={() => handleTogglePin(i)}
                onReaction={(emoji) => handleReaction(i, emoji)}
                onBookmark={() => handleBookmark(i)}
              />
            ))}

            {loading && (
              <div className="message assistant">
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </main>

          {/* Side panels */}
          {sidePanel === 'macros' && (
            <div className="side-panel">
              <MacroPanel onResult={handleMacroResult} onClose={() => setSidePanel('none')} />
            </div>
          )}
          {sidePanel === 'checklists' && (
            <div className="side-panel">
              <ChecklistPanel onClose={() => setSidePanel('none')} />
            </div>
          )}
          {sidePanel === 'workflows' && <WorkflowWizard onClose={() => setSidePanel('none')} />}
          {sidePanel === 'customers' && (
            <CustomerLookup
              onClose={() => setSidePanel('none')}
              onInsertContext={(text) => {
                setInput((prev) => prev + (prev ? '\n' : '') + text);
                inputRef.current?.focus();
              }}
            />
          )}
          {sidePanel === 'email' && <EmailGenerator onClose={() => setSidePanel('none')} />}
          {sidePanel === 'escalations' && (
            <EscalationPanel
              onClose={() => setSidePanel('none')}
              sessionId={sessionId || undefined}
              lastMessage={messages.length > 0 ? messages[messages.length - 1].content : undefined}
            />
          )}
          {sidePanel === 'citation' && citationNote && (
            <div className="side-panel">
              <CitationReader
                noteId={citationNote.id}
                noteTitle={citationNote.title}
                onClose={() => setSidePanel('none')}
              />
            </div>
          )}
          {sidePanel === 'search' && (
            <div className="side-panel">
              <MessageSearch
                messages={messages}
                onJumpTo={(idx) => {
                  const el = document.querySelectorAll('.message')[idx];
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el?.classList.add('highlight-flash');
                  setTimeout(() => el?.classList.remove('highlight-flash'), 2000);
                }}
                onClose={() => setSidePanel('none')}
              />
            </div>
          )}
          {sidePanel === 'saved-replies' && (
            <div className="side-panel">
              <SavedReplies
                onSelect={(text) => {
                  setInput((prev) => prev + (prev ? '\n' : '') + text);
                  inputRef.current?.focus();
                  setSidePanel('none');
                }}
                onClose={() => setSidePanel('none')}
              />
            </div>
          )}
        </div>

        <div className="chat-input-wrapper">
          <AutoSuggest
            query={input}
            visible={showAutoSuggest && input.length >= 2 && !loading}
            onSelect={(text) => {
              setInput(text);
              setShowAutoSuggest(false);
              inputRef.current?.focus();
            }}
          />
          <form className="chat-input-form" onSubmit={sendMessage}>
            <button
              type="button"
              className="icon-btn voice-btn"
              onClick={handleVoiceInput}
              title="Voice input"
            >
              🎤
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowAutoSuggest(true);
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setShowAutoSuggest(false), 200)}
              onFocus={() => setShowAutoSuggest(true)}
              placeholder="Ask about policies, procedures, pricing… (⌘K to focus)"
              rows={1}
              disabled={loading}
              data-testid="chat-input"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              data-testid="chat-send"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
