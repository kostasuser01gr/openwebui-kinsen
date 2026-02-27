import { useState, useEffect, useRef, useCallback } from 'react';
import type { UserPreferences } from '../lib/types';

interface CommandPaletteProps {
  onClose: () => void;
  onAction: (action: string, payload?: unknown) => void;
  preferences?: UserPreferences;
}

interface PaletteItem {
  id: string;
  label: string;
  category: string;
  icon: string;
  action: string;
  payload?: unknown;
}

const STATIC_ACTIONS: PaletteItem[] = [
  { id: 'new-chat', label: 'New Conversation', category: 'Chat', icon: '💬', action: 'new-chat' },
  {
    id: 'export-chat',
    label: 'Export Chat as Markdown',
    category: 'Chat',
    icon: '📥',
    action: 'export-chat',
  },
  {
    id: 'toggle-dark',
    label: 'Toggle Dark Mode',
    category: 'Settings',
    icon: '🌙',
    action: 'toggle-dark',
  },
  {
    id: 'open-macros',
    label: 'Open Macros Panel',
    category: 'Tools',
    icon: '🧮',
    action: 'open-macros',
  },
  {
    id: 'open-checklists',
    label: 'Open Checklists Panel',
    category: 'Tools',
    icon: '✅',
    action: 'open-checklists',
  },
  {
    id: 'open-workflows',
    label: 'Start Workflow',
    category: 'Tools',
    icon: '📋',
    action: 'open-workflows',
  },
  {
    id: 'open-vehicles',
    label: 'Vehicle Status Board',
    category: 'Fleet',
    icon: '🚗',
    action: 'open-vehicles',
  },
  {
    id: 'open-customers',
    label: 'Customer Lookup',
    category: 'Operations',
    icon: '👤',
    action: 'open-customers',
  },
  {
    id: 'open-email',
    label: 'Email Generator',
    category: 'Tools',
    icon: '✉️',
    action: 'open-email',
  },
  {
    id: 'open-admin',
    label: 'Admin Dashboard',
    category: 'Admin',
    icon: '⚙️',
    action: 'open-admin',
  },
  {
    id: 'open-preferences',
    label: 'Preferences',
    category: 'Settings',
    icon: '🔧',
    action: 'open-preferences',
  },
];

export default function CommandPalette({ onClose, onAction, preferences }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dynamicItems, setDynamicItems] = useState<PaletteItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Load dynamic items (recent searches, pinned macros, knowledge notes)
    loadDynamicItems();
  }, []);

  const loadDynamicItems = async () => {
    const items: PaletteItem[] = [];

    // Add recent searches
    if (preferences?.recentSearches) {
      for (const search of preferences.recentSearches.slice(0, 5)) {
        items.push({
          id: `recent-${search}`,
          label: search,
          category: 'Recent Searches',
          icon: '🔍',
          action: 'search',
          payload: search,
        });
      }
    }

    // Add pinned macros
    if (preferences?.pinnedMacros) {
      for (const macroId of preferences.pinnedMacros) {
        items.push({
          id: `macro-${macroId}`,
          label: macroId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          category: 'Pinned Macros',
          icon: '📌',
          action: 'run-macro',
          payload: macroId,
        });
      }
    }

    // Fetch knowledge notes for search
    try {
      const res = await fetch('/api/admin/knowledge', { credentials: 'include' });
      if (res.ok) {
        const notes = (await res.json()) as { id: string; title: string; category: string }[];
        for (const note of notes) {
          items.push({
            id: `note-${note.id}`,
            label: note.title,
            category: `Knowledge — ${note.category}`,
            icon: '📄',
            action: 'search',
            payload: note.title,
          });
        }
      }
    } catch {
      /* ignore */
    }

    setDynamicItems(items);
  };

  const allItems = [...STATIC_ACTIONS, ...dynamicItems];
  const filtered = query
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase()),
      )
    : allItems;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        const item = filtered[selectedIndex];
        onAction(item.action, item.payload);
        onClose();
      }
    },
    [filtered, selectedIndex, onAction, onClose],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Group by category
  const grouped: Record<string, PaletteItem[]> = {};
  for (const item of filtered) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette-input-wrapper">
          <span className="command-palette-icon">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, notes, macros..."
            className="command-palette-input"
          />
          <kbd className="command-palette-esc">ESC</kbd>
        </div>
        <div className="command-palette-results">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="command-palette-group">
              <div className="command-palette-group-label">{category}</div>
              {items.map((item) => {
                const globalIdx = filtered.indexOf(item);
                return (
                  <button
                    key={item.id}
                    className={`command-palette-item ${globalIdx === selectedIndex ? 'selected' : ''}`}
                    onClick={() => {
                      onAction(item.action, item.payload);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <span className="command-palette-item-icon">{item.icon}</span>
                    <span className="command-palette-item-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="command-palette-empty">No results for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
