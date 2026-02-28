// Kinsen Station AI — shared types

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

// ── Threads (renamed from ChatSession) ─────────────────────
export interface Thread {
  id: string;
  title: string;
  userId: string;
  roomId: string;
  locked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  userId?: string;
  createdAt: string;
  pinned?: boolean;
  deleted?: boolean;
}

// ── Rooms ───────────────────────────────────────────────────
export interface Room {
  id: string;
  name: string;
  locked: boolean;
  createdAt: string;
}

// ── Macros / Quick Actions ──────────────────────────────────
export interface Macro {
  id: string;
  userId: string;
  title: string;
  promptTemplate: string;
  global: boolean;
  category?: string;
  order?: number;
  pinned?: boolean;
  createdAt: string;
}

// ── Shortcuts (legacy) ─────────────────────────────────────
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

// ── Audit ───────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  ts: string;
  actorId: string;
  actorName?: string;
  action: string;
  targetId?: string;
  targetType?: string;
  meta?: Record<string, unknown>;
  ip: string;
  ua?: string;
}

// ── Environment ────────────────────────────────────────────
export interface Env {
  KV: KVNamespace;
  AI: Ai;
  PIN_SALT_SECRET: string;
  SESSION_SIGNING_SECRET: string;
  ADMIN_TOKEN?: string;
  // Feature flags (Pages vars, not secrets)
  AUTH_MODE?: string; // "admin_only" | "open"  (default: admin_only)
  SIGNUP_MODE?: string; // "open" | "invite_only" | "admin_only"  (default: open)
  INVITE_CODE?: string; // required when SIGNUP_MODE=invite_only
  AI_PROVIDER?: string; // "workers_ai" | "none"  (default: workers_ai)
  DEFAULT_ROOM_ID?: string; // default: "global"
  ALLOW_OWNER_LOCK?: string; // "true" | "false"       (default: false)
  RATE_LIMIT_WINDOW_SEC?: string; // default: "900"
  RATE_LIMIT_MAX_ATTEMPTS?: string; // default: "10"
}
