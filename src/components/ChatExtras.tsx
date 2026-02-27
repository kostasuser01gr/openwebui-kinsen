import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

// ── Toast System ────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration: number = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  const icons: Record<ToastType, string> = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => onDismiss(t.id)}>
          <span className="toast-icon">{icons[t.type]}</span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={(e) => { e.stopPropagation(); onDismiss(t.id); }}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Error Boundary ──────────────────────────────────────────

import React from 'react';

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <div className="error-boundary-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button className="btn-sm" onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Citation Reader (split pane) ────────────────────────────

interface CitationReaderProps {
  noteId: string;
  noteTitle: string;
  onClose: () => void;
}

export function CitationReader({ noteId, noteTitle, onClose }: CitationReaderProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/knowledge', { credentials: 'include' })
      .then(r => r.ok ? r.json() as Promise<Array<{ id: string; title: string; content: string; category: string; keywords: string[] }>> : [])
      .then(notes => {
        const note = (notes as any[]).find((n: any) => n.id === noteId);
        setContent(note ? `# ${note.title}\n\n**Category:** ${note.category}\n**Keywords:** ${note.keywords.join(', ')}\n\n---\n\n${note.content}` : 'Note not found.');
      })
      .catch(() => setContent('Failed to load note.'))
      .finally(() => setLoading(false));
  }, [noteId]);

  return (
    <div className="citation-reader">
      <div className="citation-reader-header">
        <h3>📄 {noteTitle}</h3>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      <div className="citation-reader-body">
        {loading ? <div className="tab-loading">Loading…</div> : (
          <pre className="citation-reader-content">{content}</pre>
        )}
      </div>
    </div>
  );
}

// ── Message Search ──────────────────────────────────────────

interface MessageSearchProps {
  messages: Array<{ role: string; content: string; timestamp: string }>;
  onJumpTo: (index: number) => void;
  onClose: () => void;
}

export function MessageSearch({ messages, onJumpTo, onClose }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const results = query.length >= 2
    ? messages
        .map((m, i) => ({ ...m, index: i }))
        .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="message-search-panel">
      <div className="message-search-header">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search messages…"
          autoFocus
          className="message-search-input"
        />
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      <div className="message-search-results">
        {results.length === 0 && query.length >= 2 && (
          <div className="empty-state">No matches found</div>
        )}
        {results.map(r => (
          <button key={r.index} className="message-search-result" onClick={() => onJumpTo(r.index)}>
            <span className="msr-role">{r.role === 'user' ? '👤' : '🤖'}</span>
            <span className="msr-text">{highlightMatch(r.content, query)}</span>
            <span className="msr-time">{new Date(r.timestamp).toLocaleTimeString()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 80);
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + query.length + 40);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

// ── Saved Replies ───────────────────────────────────────────

interface SavedRepliesProps {
  onSelect: (text: string) => void;
  onClose: () => void;
}

export function SavedReplies({ onSelect, onClose }: SavedRepliesProps) {
  const [replies, setReplies] = useState<{ id: string; title: string; text: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('kinsen-saved-replies') || '[]');
    } catch { return []; }
  });
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const save = (updated: typeof replies) => {
    setReplies(updated);
    localStorage.setItem('kinsen-saved-replies', JSON.stringify(updated));
  };

  const addReply = () => {
    if (!newTitle.trim() || !newText.trim()) return;
    const id = `sr-${Date.now()}`;
    save([...replies, { id, title: newTitle.trim(), text: newText.trim() }]);
    setNewTitle('');
    setNewText('');
    setShowAdd(false);
  };

  const deleteReply = (id: string) => {
    save(replies.filter(r => r.id !== id));
  };

  return (
    <div className="saved-replies-panel">
      <div className="saved-replies-header">
        <h3>💬 Saved Replies</h3>
        <div>
          <button className="btn-sm" onClick={() => setShowAdd(!showAdd)}>+ Add</button>
          <button className="icon-btn" onClick={onClose} style={{ marginLeft: 8 }}>✕</button>
        </div>
      </div>
      {showAdd && (
        <div className="saved-reply-form">
          <input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <textarea placeholder="Reply text…" value={newText} onChange={e => setNewText(e.target.value)} rows={3} />
          <button className="btn-sm active" onClick={addReply}>Save</button>
        </div>
      )}
      <div className="saved-replies-list">
        {replies.length === 0 && <div className="empty-state">No saved replies yet. Click + Add to create one.</div>}
        {replies.map(r => (
          <div key={r.id} className="saved-reply-item" onClick={() => onSelect(r.text)}>
            <div className="saved-reply-title">{r.title}</div>
            <div className="saved-reply-preview">{r.text.slice(0, 80)}{r.text.length > 80 ? '…' : ''}</div>
            <button className="icon-btn saved-reply-delete" onClick={(e) => { e.stopPropagation(); deleteReply(r.id); }}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Auto-Suggest Dropdown ───────────────────────────────────

interface AutoSuggestProps {
  query: string;
  visible: boolean;
  onSelect: (text: string) => void;
}

export function AutoSuggest({ query, visible, onSelect }: AutoSuggestProps) {
  const [suggestions, setSuggestions] = useState<{ type: string; text: string; id?: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!visible || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() as Promise<typeof suggestions> : [])
        .then(s => { setSuggestions(s); setSelectedIndex(0); })
        .catch(() => setSuggestions([]));
    }, 200); // debounce
    return () => clearTimeout(timer);
  }, [query, visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Tab' && suggestions.length > 0) {
        e.preventDefault();
        onSelect(suggestions[selectedIndex].text);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, suggestions, selectedIndex, onSelect]);

  if (!visible || suggestions.length === 0) return null;

  const typeIcons: Record<string, string> = { note: '📄', recent: '🕐', intent: '💡' };

  return (
    <div className="autosuggest-dropdown">
      {suggestions.map((s, i) => (
        <button
          key={`${s.type}-${i}`}
          className={`autosuggest-item ${i === selectedIndex ? 'selected' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(s.text); }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="autosuggest-icon">{typeIcons[s.type] || '💡'}</span>
          <span className="autosuggest-text">{s.text}</span>
          <span className="autosuggest-type">{s.type}</span>
        </button>
      ))}
    </div>
  );
}
