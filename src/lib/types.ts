// Shared types for Kinsen Station AI

// ── User Roles ─────────────────────────────────────────────
export type UserRole = 'user' | 'coordinator' | 'admin';

// ── Users ──────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
  avatar?: string;
}

export interface UserSession {
  userId: string;
  name: string;
  role: UserRole;
  createdAt: string;
  ip: string;
}

// ── Chat ────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
}

// ── Shortcuts ──────────────────────────────────────────────
export interface Shortcut {
  id: string;
  label: string;
  prompt: string;
  global: boolean;
  userId?: string;
  createdAt: string;
}

// ── User Profile ───────────────────────────────────────────
export interface UserProfile {
  userId: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  userId: string;
  darkMode: boolean;
  compactMode: boolean;
  language: 'en' | 'el';
}

// ── Notifications ──────────────────────────────────────────
export type NotificationType = 'system' | 'alert' | 'update';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ── Env ─────────────────────────────────────────────────────
export interface Env {
  KV: KVNamespace;
  AI: Ai;
  PIN_SALT_SECRET: string;
  ADMIN_TOKEN: string;
}
