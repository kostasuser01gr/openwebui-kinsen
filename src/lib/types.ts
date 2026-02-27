// Shared types for Kinsen Chat

// ── Knowledge Base ──────────────────────────────────────────
export interface KnowledgeNote {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  updatedAt: string;
  relatedNotes?: string[];
}

// ── Chat ────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  suggestedFollowups?: string[];
  macroUsed?: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  citations: { id: string; title: string }[];
  sessionId: string;
  suggestedFollowups: string[];
  confidence?: 'high' | 'medium' | 'low';
}

// ── Feedback ────────────────────────────────────────────────
export interface Feedback {
  sessionId: string;
  messageIndex: number;
  rating: 'up' | 'down';
  comment?: string;
  timestamp: string;
}

// ── Users & RBAC ────────────────────────────────────────────
export type UserRole = 'agent' | 'supervisor' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  ip: string;
}

// ── Macros ──────────────────────────────────────────────────
export interface MacroTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  slots: MacroSlot[];
  template: string; // Handlebars-like: "Dear {{customer_name}}, ..."
  formula?: string; // JS expression for calculators
}

export interface MacroSlot {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[];
  required: boolean;
  default?: string;
}

// ── Checklists ──────────────────────────────────────────────
export interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  helpText?: string;
}

export interface ChecklistInstance {
  templateId: string;
  rentalId: string;
  userId: string;
  items: Record<string, boolean>;
  completedAt?: string;
  createdAt: string;
}

// ── Analytics ───────────────────────────────────────────────
export interface AnalyticsSummary {
  period: string;
  totalMessages: number;
  dailyCounts: { date: string; count: number }[];
  topIntents: { intent: string; count: number }[];
  feedbackSummary: { up: number; down: number };
  knowledgeGaps: string[];
  staffMetrics?: StaffMetric[];
  hourlyCounts?: number[];
}

export interface StaffMetric {
  userId: string;
  name: string;
  totalMessages: number;
  avgSatisfaction: number;
  escalations: number;
}

// ── Knowledge Versions ──────────────────────────────────────
export interface KnowledgeVersion {
  noteId: string;
  version: number;
  content: string;
  title: string;
  keywords: string[];
  category: string;
  editedBy: string;
  editedAt: string;
  changeNote?: string;
}

// ── Escalation ──────────────────────────────────────────────
export type EscalationStatus = 'open' | 'claimed' | 'resolved';
export type EscalationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Escalation {
  id: string;
  sessionId: string;
  fromUserId: string;
  fromUserName: string;
  assignedTo?: string;
  status: EscalationStatus;
  priority: EscalationPriority;
  reason: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
}

// ── Customer / Booking ──────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  driverLicense: string;
  nationality: string;
  totalRentals: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  notes?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  vehicleClass: string;
  vehiclePlate: string;
  pickupDate: string;
  returnDate: string;
  pickupBranch: string;
  returnBranch: string;
  dailyRate: number;
  insurancePackage: string;
  status: 'reserved' | 'active' | 'completed' | 'cancelled' | 'no-show';
  totalAmount: number;
  extras: string[];
}

// ── Vehicles ────────────────────────────────────────────────
export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'cleaning' | 'reserved' | 'damaged';

export interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  class: string;
  color: string;
  status: VehicleStatus;
  branch: string;
  mileage: number;
  fuelLevel: number;
  lastService: string;
  nextServiceDue: string;
  currentBookingId?: string;
  notes?: string;
}

// ── Notifications ───────────────────────────────────────────
export type NotificationType = 'escalation' | 'task' | 'update' | 'alert' | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// ── Feature Flags ───────────────────────────────────────────
export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

// ── Webhooks ────────────────────────────────────────────────
export type WebhookEvent = 'chat.message' | 'escalation.created' | 'escalation.resolved' |
  'feedback.submitted' | 'knowledge.updated' | 'checklist.completed' | 'vehicle.status_changed';

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
  failCount: number;
}

// ── Workflows ───────────────────────────────────────────────
export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'input' | 'choice' | 'checklist' | 'approval';
  fields?: WorkflowField[];
  choices?: { label: string; nextStepId: string }[];
  checklistItems?: string[];
  nextStepId?: string;
}

export interface WorkflowField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea';
  options?: string[];
  required: boolean;
}

export interface WorkflowTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: WorkflowStep[];
  initialStepId: string;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  userId: string;
  currentStepId: string;
  data: Record<string, unknown>;
  completedSteps: string[];
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}

// ── User Preferences ────────────────────────────────────────
export interface UserPreferences {
  userId: string;
  pinnedMacros: string[];
  recentSearches: string[];
  language: 'en' | 'el';
  defaultBranch?: string;
  compactMode: boolean;
  notificationsEnabled: boolean;
}

// ── Email Templates ─────────────────────────────────────────
export interface GeneratedEmail {
  subject: string;
  body: string;
  to?: string;
  templateUsed: string;
}

// ── Env ─────────────────────────────────────────────────────
export interface Env {
  KV: KVNamespace;
  PASSCODE_HASH: string;
  ADMIN_TOKEN: string;
  OPENAI_ENABLED: string;
  OPENAI_BASE_URL: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
}
