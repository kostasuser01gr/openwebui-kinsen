import { useState } from 'react';
import { KnowledgeTab } from './KnowledgeTab';
import { AnalyticsTab } from './AnalyticsTab';
import { UsersTab } from './UsersTab';
import FlagsTab from './FlagsTab';
import WebhooksTab from './WebhooksTab';
import { SessionsManager } from './SessionsTab';

interface UserInfo {
  name: string;
  email?: string;
  role: string;
}

interface Props {
  user: UserInfo;
  darkMode: boolean;
  onToggleDark: () => void;
  onBack: () => void;
}

type Tab = 'knowledge' | 'analytics' | 'users' | 'flags' | 'webhooks' | 'sessions';

export function AdminPanel({ user, darkMode, onToggleDark, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('knowledge');

  const tabs: { id: Tab; label: string; icon: string; minRole: string[] }[] = [
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      icon: '📚',
      minRole: ['supervisor', 'manager', 'admin'],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊',
      minRole: ['supervisor', 'manager', 'admin'],
    },
    { id: 'users', label: 'Users', icon: '👥', minRole: ['manager', 'admin'] },
    {
      id: 'sessions',
      label: 'Sessions',
      icon: '🔐',
      minRole: ['agent', 'supervisor', 'manager', 'admin'],
    },
    { id: 'flags', label: 'Feature Flags', icon: '🚩', minRole: ['admin'] },
    { id: 'webhooks', label: 'Webhooks', icon: '🔗', minRole: ['admin'] },
  ];

  const visibleTabs = tabs.filter((t) => t.minRole.includes(user.role));

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-left">
          <button className="icon-btn" onClick={onBack} title="Back to Chat">
            ← Chat
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
            <h1>Admin Panel</h1>
            <span className="header-tag">
              {user.name} · {user.role}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onToggleDark} title="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <main className="admin-content">
        {activeTab === 'knowledge' && <KnowledgeTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'sessions' && <SessionsManager />}
        {activeTab === 'flags' && <FlagsTab />}
        {activeTab === 'webhooks' && <WebhooksTab />}
      </main>
    </div>
  );
}
