# 🚗 Kinsen Chat v4 — Car Rental Operations Platform

Full-featured internal chat & operations hub for car rental staff. Ask questions, get policy answers with citations, run calculators, execute macros, manage workflows, track vehicles, handle escalations — all backed by a TF-IDF knowledge retrieval engine with fuzzy matching.

**Stack:** React 18 + Vite (frontend) · Cloudflare Pages Functions (backend) · Cloudflare KV (storage) · TypeScript · PWA · $0 infrastructure.

---

## ✨ Features

### Core Chat

- **TF-IDF Knowledge Retrieval** — weighted term frequency-inverse document frequency scoring across 16+ car rental SOP documents
- **Fuzzy Matching** — Levenshtein distance matching (edit distance ≤ 2) recovers misspelled queries
- **Query Rewriting** — auto-expands 15+ car rental abbreviations (CDW, SCDW, TP, PAI, LDW, GPS, SUV, MPV, EV, etc.) and strips stop words
- **Answer Confidence** — high/medium/low confidence indicator on every response
- **Citation-backed Answers** — every response shows which policy documents were used
- **Multi-turn Context** — follow-up questions use conversation history for better retrieval
- **Suggested Follow-ups** — related questions suggested after each answer
- **Auto-suggest** — typeahead suggestions as you type (note titles, recent searches, common queries)
- **Chat History** — per-session history stored in KV (7-day retention, 100 msg cap)
- **BYO AI (Optional)** — plug in any OpenAI-compatible API behind a feature flag (disabled by default)

### Macros & Calculators

- **Late Return Fee Calculator** — input hours late + daily rate → get exact charge
- **Fuel Charge Calculator** — missing litres/kWh → refueling cost
- **Mileage Overage Calculator** — km driven vs included → excess charge
- **Deposit Lookup** — vehicle class → required hold amount
- **Cancellation Fee Calculator** — notice period + booking type → fee
- **Email Templates** — late return notification, damage report (slot-fillable)
- **Upsell Script Generator** — insurance upsell with objection handling

### Operational Checklists

- **Vehicle Pickup** (18 items) — document verification, walk-around, photos
- **Vehicle Return** (15 items) — inspection, fuel, damage, charges
- **Accident Response** (12 items) — safety, photos, towing, insurance claim
- **Shift Handoff** (8 items) — pending returns, open issues, cash drawer
- **Daily Branch Opening** (10 items) — systems, fleet, keys, reservations
- Progress tracking with required vs optional items, saved per rental ID

### 🆕 Guided Workflows (v3)

- **Damage Claim** (9 steps) — branching logic for minor/major damage, insurance involvement
- **New Rental Walkthrough** (7 steps) — customer info, vehicle selection, upsell, checklist
- **Refund Processing** (4 steps) — reason, approval, amount, confirmation
- **Customer Complaint** (5 steps) — logging, investigation, resolution, follow-up
- Multi-step wizard with input, choice, checklist, and info step types

### 🆕 Vehicle Status Board (v3)

- **Fleet Dashboard** — grid view of all vehicles with status filters
- **Summary Cards** — instant counts: available, rented, reserved, maintenance, cleaning, damaged
- **Inline Status Edit** — click to update vehicle status directly from the board
- **Filter & Search** — by status, class, or plate number

### 🆕 Customer Lookup (v3)

- **Quick Search** — search customers by name, email, phone, or license
- **Booking History** — view all bookings for a customer with status and details
- **Insert to Chat** — inject customer/booking context into the current conversation

### 🆕 Email Generator (v3)

- **5 Templates** — late return, damage notification, booking confirmation, cancellation, refund
- **Slot-filling** — fill in variables (customer name, dates, amounts) from template
- **Live Preview** — see rendered email before copying
- **One-click Copy** — copy to clipboard for paste into email client

### 🆕 Escalation System (v3)

- **Create Escalations** — from any chat with priority (low/medium/high/critical)
- **Supervisor Queue** — escalation list visible to supervisors+
- **Claim & Resolve** — supervisors can claim and close escalations
- **Notification Dispatch** — auto-notify relevant roles on new escalations

### 🆕 Notification Center (v3)

- **Bell Icon Badge** — unread count always visible
- **Role-aware Notifications** — escalations, workflow completions, knowledge updates
- **Mark Read/All Read** — click to dismiss or bulk clear

### 🆕 Command Palette (v3)

- **⌘K Universal Search** — search across actions, knowledge notes, macros, recent searches
- **Quick Navigation** — jump to any panel, toggle dark mode, start new chat
- **Keyboard-first** — arrow keys + enter for selection

### 🆕 Feature Flags Admin (v3)

- **13 Feature Flags** — toggle features on/off (OpenAI, voice input, workflows, etc.)
- **Instant Toggle** — flip switches with immediate effect
- **Reset to Defaults** — one-click restore default configuration

### 🆕 Webhook System (v3)

- **CRUD Webhooks** — register external endpoints for event notifications
- **Event Types** — chat.message, escalation.created, workflow.completed, knowledge.updated

### 🆕 Knowledge Versioning (v3)

- **Version History** — every edit creates a timestamped snapshot
- **Rollback** — restore any previous version of a knowledge note
- **Audit Trail** — who edited what and when

### 🆕 PWA + Offline (v3)

- **Progressive Web App** — installable on mobile and desktop
- **Service Worker** — cache-first for static assets, network-first for API
- **Offline Fallback** — graceful degradation when offline
- **IndexedDB Cache** — knowledge notes cached locally for offline search

### 🆕 Multi-language (v3)

- **i18n Framework** — English + Greek built-in
- **60+ Translated Strings** — UI labels, buttons, placeholders
- **LocalStorage Persistence** — language preference remembered

### 🆕 Chat UX Upgrades (v4)

- **Split-pane Citation Reader** — click any citation to view full knowledge note in a side panel
- **Toast Notification System** — non-blocking toasts replace all alerts (auto-dismiss, max 5 visible)
- **Error Boundaries** — each major panel has its own error boundary with "Try Again" recovery
- **Message Search** — full-text search across all chat messages in current session
- **Pinned Messages** — pin important messages for quick reference (shown in yellow bar)
- **Message Reactions** — add ✅ 🔥 ⚠️ 📌 reactions to any message
- **Chat Bookmarks** — bookmark messages to localStorage for later reference
- **Saved Replies** — store reusable text snippets for common responses (localStorage-backed)
- **Auto-suggest Typeahead** — 200ms debounced suggestions from note titles + recent searches + 20 common queries

### 🆕 Advanced Retrieval (v4)

- **TF-IDF Scoring Engine** — document term vectors with weighted text (title 3×, keywords 4×, content 1×, category 2×)
- **Smoothed IDF** — `log((N+1)/(1+df)) + 1` formula for robust term importance
- **Fuzzy Matching** — full Levenshtein distance (edit distance ≤ 2, tokens ≥ 4 chars)
- **Query Rewriting** — 15 car-rental abbreviations expanded, ~90 stop words stripped
- **Confidence Scoring** — high (≥25 + 2+ matches), medium (≥12), low (< 12)
- **Composite Answers** — synthesize from multiple matching documents

### 🆕 Operations & Analytics (v4)

- **Staff Performance Dashboard** — per-user message counts, satisfaction scores, escalation rates
- **Usage Heatmap** — hour × day activity grid showing peak usage times
- **SLA Tracking** — urgent (30 min) and high (60 min) escalation breach monitoring
- **Knowledge Effectiveness** — citation counts and thumbs-down rates per knowledge note
- **CSV Export** — download analytics data as CSV from the dashboard
- **Vehicle Damage Log** — CRUD API for damage entries per vehicle (365-day TTL)
- **Maintenance Scheduler** — schedule and track vehicle maintenance with overdue detection
- **Tabbed Analytics** — 4-tab view: Overview, Staff, Knowledge, Heatmap

### 🆕 Security Hardening (v4)

- **Session Management UI** — view all active sessions, revoke individual or all other sessions
- **Password Policies** — configurable min length, uppercase/lowercase/number/special requirements
- **Structured Error Codes** — 17 error codes (UNAUTHORIZED, RATE_LIMITED, TOTP_REQUIRED, etc.) with consistent JSON format
- **Enhanced Health Check** — KV latency, resource counts, feature flag map, version info
- **Staff Analytics Counters** — per-user message counts and hourly heatmap data written by chat endpoint
- **Knowledge Citation Tracking** — automatic citation counter incremented per chat response

### 🆕 Integration Upgrades (v4)

- **Webhook v2 with HMAC Signing** — SHA-256 signed payloads, 3× retry with exponential backoff
- **Webhook Delivery Log** — last 100 deliveries per webhook with status, timing, errors
- **Auto-disable Webhooks** — 10 consecutive failures → automatic deactivation
- **API Key Authentication** — `kinsen_*` prefixed keys with SHA-256 hashing, scopes, expiry
- **API Key Management** — create/revoke keys, last-used tracking, shown-once-on-create security
- **Knowledge Import** — bulk import from CSV, Markdown, or JSON (up to 100 notes per import)
- **CSV Parser** — proper RFC-compliant CSV parsing with quoted fields
- **Markdown Parser** — `## Heading` sections become notes with optional `category:` and `keywords:` metadata

### Security & Auth

- **Dual-mode Authentication** — shared passcode OR individual email+password login
- **Role-Based Access Control (RBAC)** — Agent, Supervisor, Manager, Admin with granular permissions
- **Session Management** — HttpOnly cookies, 24h expiry, KV-backed sessions
- **Rate Limiting** — per-IP throttling (30 req/min) via KV
- **Brute-force Protection** — 5 failed attempts → 15-minute lockout
- **Security Headers** — CSP, X-Frame-Options, CSRF-safe SameSite cookies
- **Audit Logging** — all API requests logged with user, IP, timestamp (30-day retention)

### Admin Dashboard

- **Knowledge Management** — create, edit, delete notes with markdown editor, search/filter, version history
- **Analytics Dashboard** — daily message volume chart, top intents, satisfaction rate, knowledge gaps
- **User Management** — create accounts, assign roles, activate/deactivate
- **Feature Flags** — toggle system capabilities from admin UI
- **Webhooks** — configure external event notifications
- **Data Export** — one-click full KV backup as JSON
- **Bulk Seed** — seeds knowledge notes, customers, bookings, vehicles, feature flags

### Frontend UX

- **Dark Mode** — toggle with localStorage persistence
- **Feedback Buttons** — 👍/👎 on each answer, tracked in analytics
- **Keyboard Shortcuts** — ⌘K command palette, ↑ edit last, ⌘⇧M macros, Esc clear
- **Voice Input** — Web Speech API for hands-free queries
- **Conversation Export** — download chat as Markdown file
- **Onboarding Tour** — 4-step first-login overlay
- **Recent Searches** — tracked and available in command palette
- **User Preferences** — pinned macros, language, theme stored per-user
- **Mobile-responsive** — full side panel overlay on small screens

### DevOps

- **GitHub Actions CI/CD** — lint → test → build → deploy on push to main
- **Preview Deployments** — Cloudflare Pages auto-generates preview URLs for PRs

---

## 📋 Prerequisites

| Tool         | Version | Install                                   |
| ------------ | ------- | ----------------------------------------- |
| Node.js      | ≥ 18    | [nodejs.org](https://nodejs.org)          |
| npm          | ≥ 9     | Comes with Node.js                        |
| GitHub CLI   | ≥ 2.x   | `brew install gh` then `gh auth login`    |
| Wrangler CLI | ≥ 3.x   | `npm i -g wrangler` then `wrangler login` |

---

## 🚀 Quick Deploy (< 15 minutes)

### Option A: Automated (recommended)

```bash
cd /path/to/this/repo
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Option B: Step-by-step

```bash
# 1. Install & test & build
npm install && npm test && npm run build

# 2. Git + GitHub
git init && git add -A && git commit -m "feat: Kinsen Chat v4"
gh repo create kinsen-chat --private --source=. --remote=origin --push

# 3. KV namespaces
wrangler kv namespace create "KV"          # → note the ID
wrangler kv namespace create "KV" --preview # → note preview ID
# Update wrangler.toml with real IDs

# 4. Pages project + secrets
wrangler pages project create kinsen-chat --production-branch main
HASH=$(echo -n "kinsen2025" | shasum -a 256 | awk '{print $1}')
echo "$HASH" | wrangler pages secret put PASSCODE_HASH --project-name kinsen-chat
echo "your-admin-token" | wrangler pages secret put ADMIN_TOKEN --project-name kinsen-chat

# 5. Deploy + seed
wrangler pages deploy dist --project-name kinsen-chat
curl -X POST https://kinsen-chat.pages.dev/api/admin/seed \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" -d '{}'

# 6. (Optional) Set up CI/CD
# Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to GitHub repo secrets
```

---

## 💻 Local Development

```bash
npm install
npm run dev                                    # Vite on :5173
npx wrangler pages dev dist --kv KV --port 8788  # Pages Functions on :8788
```

**Local credentials (`.dev.vars`):** passcode `password`, admin token `kinsen-admin-local-dev-token`

---

## 📡 API Reference

| Method | Endpoint                       | Auth        | Description                                         |
| ------ | ------------------------------ | ----------- | --------------------------------------------------- |
| GET    | `/api/health`                  | None        | Health check + feature flags                        |
| POST   | `/api/auth`                    | None        | Login (passcode or email+password)                  |
| POST   | `/api/chat`                    | Session     | Send message, get response + citations + follow-ups |
| POST   | `/api/feedback`                | Session     | Submit 👍/👎 feedback                               |
| GET    | `/api/macros`                  | Session     | List macro templates                                |
| POST   | `/api/macros`                  | Session     | Execute a macro with variables                      |
| GET    | `/api/checklists`              | Session     | List checklist templates                            |
| POST   | `/api/checklists`              | Session     | Save checklist instance                             |
| GET    | `/api/sessions`                | Session     | List/get chat sessions                              |
| GET    | `/api/customers`               | Session     | Search customers + bookings                         |
| POST   | `/api/customers`               | Session     | Seed sample customer data                           |
| GET    | `/api/vehicles`                | Session     | List vehicles with filters + summary                |
| PUT    | `/api/vehicles`                | Session     | Update vehicle status                               |
| POST   | `/api/vehicles`                | Session     | Seed sample vehicle data                            |
| GET    | `/api/workflows`               | Session     | List workflow templates/instances                   |
| POST   | `/api/workflows`               | Session     | Start/advance/abandon workflow instance             |
| POST   | `/api/escalations`             | Session     | Create new escalation                               |
| GET    | `/api/escalations`             | Supervisor+ | List escalations                                    |
| PUT    | `/api/escalations`             | Supervisor+ | Claim/resolve escalation                            |
| GET    | `/api/email`                   | Session     | List email templates                                |
| POST   | `/api/email`                   | Session     | Generate email from template                        |
| GET    | `/api/notifications`           | Session     | Get notifications (role-aware)                      |
| POST   | `/api/notifications`           | Session     | Mark read / mark all read                           |
| GET    | `/api/preferences`             | Session     | Get user preferences                                |
| PUT    | `/api/preferences`             | Session     | Save user preferences                               |
| GET    | `/api/admin/knowledge`         | Supervisor+ | List knowledge notes                                |
| POST   | `/api/admin/knowledge`         | Manager+    | Create note                                         |
| PUT    | `/api/admin/knowledge`         | Manager+    | Update note (with version snapshot)                 |
| DELETE | `/api/admin/knowledge?id=`     | Manager+    | Delete note                                         |
| GET    | `/api/admin/versions?noteId=`  | Supervisor+ | List knowledge versions                             |
| POST   | `/api/admin/versions`          | Manager+    | Rollback to specific version                        |
| POST   | `/api/admin/seed`              | Admin       | Seed all data (notes, customers, vehicles, flags)   |
| GET    | `/api/admin/analytics?days=30` | Supervisor+ | Analytics summary                                   |
| GET    | `/api/admin/users`             | Manager+    | List users                                          |
| POST   | `/api/admin/users`             | Admin       | Create user                                         |
| PUT    | `/api/admin/users`             | Admin       | Update user role/status                             |
| GET    | `/api/admin/flags`             | Admin       | List feature flags                                  |
| PUT    | `/api/admin/flags`             | Admin       | Toggle feature flag                                 |
| POST   | `/api/admin/flags`             | Admin       | Reset flags to defaults                             |
| GET    | `/api/admin/webhooks`          | Admin       | List webhooks                                       |
| GET    | `/api/admin/webhooks?log={id}` | Admin       | View webhook delivery log                           |
| POST   | `/api/admin/webhooks`          | Admin       | Create/update/delete webhook                        |
| POST   | `/api/admin/import`            | Manager+    | Bulk import knowledge (CSV/Markdown/JSON)           |
| GET    | `/api/admin/api-keys`          | Admin       | List API keys                                       |
| POST   | `/api/admin/api-keys`          | Admin       | Create API key                                      |
| DELETE | `/api/admin/api-keys?id=`      | Admin       | Revoke API key                                      |
| GET    | `/api/suggest?q=`              | Session     | Auto-suggest typeahead                              |
| GET    | `/api/fleet?type=damage`       | Session     | List damage entries                                 |
| POST   | `/api/fleet`                   | Session     | Create damage/maintenance entry                     |
| PUT    | `/api/fleet`                   | Session     | Update damage/maintenance entry                     |
| GET    | `/api/user-sessions`           | Session     | List active sessions                                |
| DELETE | `/api/user-sessions?token=`    | Session     | Revoke session(s)                                   |
| GET    | `/api/admin/export`            | Manager+    | Full KV backup JSON                                 |
| GET    | `/api/admin/audit?limit=100`   | Admin       | Audit log entries                                   |

---

## 🔐 RBAC Permissions

| Permission                         | Agent | Supervisor | Manager | Admin |
| ---------------------------------- | :---: | :--------: | :-----: | :---: |
| Chat, Macros, Checklists, Feedback |  ✅   |     ✅     |   ✅    |  ✅   |
| View Knowledge Base                |  ❌   |     ✅     |   ✅    |  ✅   |
| Edit Knowledge Base                |  ❌   |     ❌     |   ✅    |  ✅   |
| View Analytics                     |  ❌   |     ✅     |   ✅    |  ✅   |
| View Users                         |  ❌   |     ❌     |   ✅    |  ✅   |
| Manage Users                       |  ❌   |     ❌     |   ❌    |  ✅   |
| Export Data                        |  ❌   |     ❌     |   ✅    |  ✅   |
| Audit Log                          |  ❌   |     ❌     |   ❌    |  ✅   |
| Seed / Settings                    |  ❌   |     ❌     |   ❌    |  ✅   |

---

## 🔧 SOPs

### Rotating the Staff Passcode

```bash
NEW_HASH=$(echo -n "newPasscode2025" | shasum -a 256 | awk '{print $1}')
echo "$NEW_HASH" | wrangler pages secret put PASSCODE_HASH --project-name kinsen-chat
npm run deploy
```

### Creating an Admin User

```bash
curl -X POST https://kinsen-chat.pages.dev/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kinsen.com","name":"Admin","password":"securePass","role":"admin"}'
```

### Exporting KV Backup

```bash
curl -s https://kinsen-chat.pages.dev/api/admin/export \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" > backup-$(date +%Y%m%d).json
```

### Rollback

```bash
wrangler pages deployment list --project-name kinsen-chat
wrangler pages deployment rollback --project-name kinsen-chat <deployment-id>
```

---

## 🏗️ Project Structure (~90 files)

```
kinsen-chat/
├── .github/workflows/ci.yml       # CI/CD: test → build → deploy
├── public/
│   ├── manifest.json               # PWA manifest
│   └── sw.js                       # Service worker (cache + offline)
├── functions/api/                   # Cloudflare Pages Functions
│   ├── _middleware.ts               # Auth, RBAC, rate limit, CORS, audit
│   ├── auth.ts                      # Dual-mode login (passcode + email)
│   ├── chat.ts                      # Multi-turn chat + analytics counters
│   ├── feedback.ts                  # 👍/👎 feedback
│   ├── health.ts                    # Enhanced health check (latency, counts, flags)
│   ├── macros.ts                    # Macro list + execute
│   ├── checklists.ts                # Checklist templates + instances
│   ├── sessions.ts                  # Chat session list
│   ├── customers.ts                 # Customer/booking search + seed
│   ├── vehicles.ts                  # Fleet status board API
│   ├── fleet.ts                     # 🆕 Damage log + maintenance scheduler
│   ├── suggest.ts                   # 🆕 Auto-suggest typeahead
│   ├── user-sessions.ts             # 🆕 Session management (list/revoke)
│   ├── workflows.ts                 # Multi-step workflow engine
│   ├── escalations.ts               # Escalation create/list/claim/resolve
│   ├── email.ts                     # Email template generator
│   ├── notifications.ts             # Role-aware notification system
│   ├── preferences.ts               # User preferences store
│   └── admin/
│       ├── seed.ts                  # Bulk seed (notes, customers, vehicles, flags)
│       ├── knowledge.ts             # CRUD with version tracking
│       ├── analytics.ts             # Aggregated stats
│       ├── users.ts                 # User management
│       ├── export.ts                # Full backup
│       ├── audit.ts                 # Audit log viewer
│       ├── flags.ts                 # Feature flag management
│       ├── webhooks.ts              # Webhook CRUD + delivery log
│       ├── versions.ts              # Knowledge version history + rollback
│       ├── import.ts                # 🆕 Bulk import (CSV/Markdown/JSON)
│       └── api-keys.ts              # 🆕 API key management
├── functions/lib/
│   └── webhooks.ts                  # 🆕 HMAC-signed dispatch + retry
├── src/
│   ├── App.tsx                      # Root orchestrator (command palette, notifications, routing)
│   ├── components/
│   │   ├── ChatWindow.tsx           # Main chat + 9 side panel types + auto-suggest
│   │   ├── LoginGate.tsx            # Dual-mode login UI
│   │   ├── MessageBubble.tsx        # Markdown + feedback + reactions + bookmarks + pins
│   │   ├── ChatExtras.tsx           # 🆕 Toast, ErrorBoundary, CitationReader, Search, SavedReplies, AutoSuggest
│   │   ├── MacroPanel.tsx           # Macro/calculator side panel
│   │   ├── ChecklistPanel.tsx       # Checklist side panel
│   │   ├── CommandPalette.tsx       # ⌘K universal search
│   │   ├── OnboardingTour.tsx       # First-login guided tour
│   │   ├── NotificationCenter.tsx   # Bell icon + dropdown
│   │   ├── CustomerLookup.tsx       # Customer/booking search panel
│   │   ├── VehicleBoard.tsx         # Full-page fleet grid
│   │   ├── WorkflowWizard.tsx       # Multi-step branching wizard
│   │   ├── EmailGenerator.tsx       # Template → slots → preview → copy
│   │   ├── EscalationPanel.tsx      # Create/list/claim/resolve
│   │   └── admin/
│   │       ├── AdminPanel.tsx       # Tabbed dashboard (8 tabs)
│   │       ├── KnowledgeTab.tsx     # Knowledge CRUD UI
│   │       ├── AnalyticsTab.tsx     # 🆕 4-tab analytics (Overview/Staff/Knowledge/Heatmap) + CSV export
│   │       ├── UsersTab.tsx         # User management table
│   │       ├── SessionsTab.tsx      # 🆕 Active session management (view/revoke)
│   │       ├── FlagsTab.tsx         # Feature flag toggles
│   │       └── WebhooksTab.tsx      # Webhook endpoint CRUD
│   ├── lib/
│   │   ├── types.ts                 # All TypeScript types (~340 lines)
│   │   ├── retrieval.ts             # 🆕 TF-IDF + fuzzy + confidence (~450 lines)
│   │   ├── errors.ts                # 🆕 Structured error codes + password policy
│   │   ├── crypto.ts                # SHA-256, session ID, cookies
│   │   ├── seed-data.ts             # 16 knowledge notes
│   │   ├── seed-customers.ts        # 8 customers, 8 bookings, 12 vehicles
│   │   ├── macros.ts                # 8 macro templates + executor
│   │   ├── checklists.ts            # 5 checklist templates
│   │   ├── users.ts                 # RBAC + user CRUD + auth
│   │   ├── workflows.ts             # 4 workflow templates (~240 lines)
│   │   ├── feature-flags.ts         # 13 default feature flags
│   │   ├── i18n.ts                  # Multi-language (EN + EL)
│   │   └── offline.ts               # IndexedDB cache + offline search
│   └── styles/index.css             # All component styles (~1530 lines)
├── tests/
│   ├── retrieval.test.ts            # 20 tests: scoring, retrieval, intents
│   ├── v4-features.test.ts          # 🆕 34 tests: TF-IDF, fuzzy, confidence, password policy
│   ├── macros.test.ts               # 12 tests: calculators, templates
│   ├── users.test.ts                # 9 tests: RBAC, password hashing
│   ├── workflows.test.ts            # 12 tests: templates, branching, seed data
│   └── i18n.test.ts                 # 4 tests: translations, locale switching
├── scripts/
│   ├── deploy.sh                    # One-command setup + deploy
│   └── seed-local.mjs              # Local KV seeder
├── wrangler.toml
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 📊 KV Schema

| Key Pattern                               | Value                   | TTL       |
| ----------------------------------------- | ----------------------- | --------- |
| `knowledge:index`                         | `string[]`              | Permanent |
| `knowledge:{id}`                          | `KnowledgeNote`         | Permanent |
| `knowledge:versions:{noteId}`             | Version list            | Permanent |
| `knowledge:version:{noteId}:{ver}`        | Version snapshot        | 365 days  |
| `user:index`                              | `string[]`              | Permanent |
| `user:{id}`                               | `User`                  | Permanent |
| `session:{token}`                         | `UserSession`           | 24h       |
| `chat:{sessionId}`                        | `ChatMessage[]`         | 7 days    |
| `checklist:{templateId}:{rentalId}`       | `ChecklistInstance`     | 90 days   |
| `feedback:{timestamp}`                    | `Feedback`              | 90 days   |
| `ratelimit:{ip}:{window}`                 | Count                   | 2 min     |
| `brute:{ip}`                              | Count                   | 15 min    |
| `audit:{timestamp}`                       | Audit entry             | 30 days   |
| `analytics:daily:{date}`                  | Count                   | 90 days   |
| `analytics:intent:{date}:{intent}`        | Count                   | 90 days   |
| `analytics:feedback:{date}:{rating}`      | Count                   | 90 days   |
| `analytics:gap:{date}:{ts}`               | Query text              | 30 days   |
| `customer:{id}`                           | `Customer`              | Permanent |
| `customer:index`                          | `string[]`              | Permanent |
| `booking:{id}`                            | `Booking`               | Permanent |
| `booking:index`                           | `string[]`              | Permanent |
| `vehicle:{id}`                            | `Vehicle`               | Permanent |
| `vehicle:index`                           | `string[]`              | Permanent |
| `escalation:{id}`                         | `Escalation`            | 90 days   |
| `escalation:index`                        | `string[]`              | Permanent |
| `workflow:{instanceId}`                   | `WorkflowInstance`      | 30 days   |
| `notification:{userId}:{id}`              | `Notification`          | 30 days   |
| `preferences:{userId}`                    | `UserPreferences`       | Permanent |
| `feature:flags`                           | `FeatureFlag[]`         | Permanent |
| `webhook:{id}`                            | `Webhook`               | Permanent |
| `webhook:index`                           | `string[]`              | Permanent |
| `webhook:log:{id}`                        | Delivery log array      | 30 days   |
| `analytics:staff:{userId}:messages`       | Count                   | 90 days   |
| `analytics:staff:{userId}:feedback:up`    | Count                   | 90 days   |
| `analytics:staff:{userId}:feedback:down`  | Count                   | 90 days   |
| `analytics:staff:{userId}:escalations`    | Count                   | 90 days   |
| `analytics:hourly:{date}:{hour}`          | Count                   | 90 days   |
| `analytics:knowledge:{noteId}:citations`  | Count                   | 90 days   |
| `analytics:knowledge:{noteId}:thumbsdown` | Count                   | 90 days   |
| `damage:index`                            | `string[]`              | 365 days  |
| `damage:{id}`                             | Damage entry            | 365 days  |
| `maintenance:index`                       | `string[]`              | 365 days  |
| `maintenance:{id}`                        | Maintenance entry       | 365 days  |
| `apikey:index`                            | `string[]`              | Permanent |
| `apikey:{id}`                             | API key metadata + hash | Permanent |
