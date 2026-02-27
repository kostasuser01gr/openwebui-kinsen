# Kinsen Station AI

A secure, free, collaborative AI chat workspace. Multi-user platform with role-based access, session locking, shortcuts, and organization tools. All AI powered by free Cloudflare Workers AI models.

**Stack:** React 18 + Vite (frontend) | Cloudflare Pages Functions (backend) | Cloudflare KV (storage) | Workers AI (Llama 3.1) | TypeScript | $0 infrastructure.

---

## Features

- **AI Chat** — Conversational AI using Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`)
- **4-Digit PIN Authentication** — Simple, secure login with SHA-256 hashed PINs
- **3 User Roles** — `admin`, `coordinator`, `user` with granular permissions
- **Session Locking** — Coordinators/admins can lock chat sessions for moderation
- **Shortcuts** — Personal and global prompt shortcuts for quick actions
- **Chat History** — View and archive conversation sessions
- **User Profiles** — Name, avatar, and preference management
- **Admin Dashboard** — User management, session moderation, shortcut management
- **Dark Mode** — Full dark/light theme support
- **Responsive** — Works on desktop and mobile
- **PWA** — Installable progressive web app

---

## Quick Start

```bash
# Install dependencies
npm install

# Seed local data (creates test users)
npm run seed

# Start development
npm run dev                              # Terminal 1: Vite frontend
npx wrangler pages dev dist --local      # Terminal 2: Cloudflare backend

# Default test users:
# Admin     — PIN: 1234
# Coordinator — PIN: 5678
# Alice     — PIN: 1111
# Bob       — PIN: 2222
```

---

## API Reference

### Authentication

#### `POST /api/auth/login`

Login with name and 4-digit PIN.

**Request:**

```json
{ "name": "Admin", "pin": "1234" }
```

**Response (200):**

```json
{
  "ok": true,
  "token": "a1b2c3...",
  "user": { "id": "abc123", "name": "Admin", "role": "admin" }
}
```

Sets `kinsen_session` HttpOnly cookie.

#### `GET /api/auth/me`

Get current authenticated user.

**Response (200):**

```json
{ "ok": true, "user": { "id": "abc123", "name": "Admin", "role": "admin" } }
```

#### `POST /api/auth/logout`

Logout and clear session cookie.

---

### User Management

#### `POST /api/users` (admin only)

Create a new user.

**Request:**

```json
{ "name": "Charlie", "role": "user", "pin": "3333" }
```

**Response (201):**

```json
{
  "ok": true,
  "user": { "id": "def456", "name": "Charlie", "role": "user", "createdAt": "..." }
}
```

#### `GET /api/users/:id`

Get user info by ID.

---

### AI Chat

#### `POST /api/chat`

Send a message to the AI.

**Request:**

```json
{ "message": "What is machine learning?", "sessionId": "optional-session-id" }
```

**Response (200):**

```json
{ "reply": "Machine learning is...", "sessionId": "abc123..." }
```

- Validates session is not locked
- Retrieves conversation history for context
- Calls Workers AI (`@cf/meta/llama-3.1-8b-instruct`)
- Appends user + assistant messages to history
- Persists history to KV (7-day TTL, 100-message cap)

---

### Session Locking

#### `POST /api/chat/lock` (coordinator/admin)

Lock a chat session to prevent further messages.

**Request:**

```json
{ "sessionId": "abc123..." }
```

#### `POST /api/chat/unlock` (coordinator/admin)

Unlock a previously locked session.

**Request:**

```json
{ "sessionId": "abc123..." }
```

---

### Chat History & Archives

#### `GET /api/chat/history?sessionId=xxx`

Get full conversation history for a session.

**Response (200):**

```json
{
  "sessionId": "abc123",
  "title": "What is ML?",
  "locked": false,
  "messages": [
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "assistant", "content": "...", "timestamp": "..." }
  ]
}
```

#### `POST /api/chat/save`

Archive a session to permanent storage (90-day TTL).

**Request:**

```json
{ "sessionId": "abc123..." }
```

#### `GET /api/chat/sessions`

List all sessions for the current user.

---

### Shortcuts

#### `GET /api/shortcuts`

List user shortcuts + global shortcuts.

#### `POST /api/shortcuts`

Create a new shortcut.

**Request:**

```json
{ "label": "Summarize", "prompt": "Please summarize this conversation.", "global": false }
```

Global shortcuts require `admin` role.

#### `DELETE /api/shortcuts?id=xxx`

Delete a shortcut by ID.

---

### User Profile

#### `GET /api/user/profile`

Get current user profile.

#### `PUT /api/user/profile`

Update name, avatar, and preferences.

**Request:**

```json
{
  "name": "New Name",
  "avatar": "https://example.com/avatar.png",
  "preferences": { "darkMode": true, "compactMode": false, "language": "en" }
}
```

---

### Admin

#### `GET /api/admin/users` (admin only)

List all users (no sensitive data).

#### `GET /api/sessions` (coordinator/admin)

List all chat sessions for moderation.

#### `GET /api/health` (public)

Health check endpoint.

---

## Data Storage (KV Keys)

| Key Pattern                  | Description                       |
| ---------------------------- | --------------------------------- |
| `user:{userId}`              | User record (JSON)                |
| `auth:{userId}`              | Hashed PIN (hex string)           |
| `user:index`                 | Array of all user IDs             |
| `session:{token}`            | Auth session data (24h TTL)       |
| `session:{sessionId}`        | Chat messages history (7-day TTL) |
| `session:{sessionId}:locked` | Lock flag (boolean string)        |
| `session-meta:{sessionId}`   | Session metadata (title, counts)  |
| `user-sessions:{userId}`     | Array of session IDs for user     |
| `shortcuts:{userId}`         | User's personal shortcuts         |
| `shortcuts:global`           | Global shortcuts (admin-created)  |
| `profile:{userId}`           | User profile & preferences        |
| `archive:{sessionId}`        | Archived session (90-day TTL)     |
| `archive-index:{userId}`     | Array of archived session IDs     |
| `preferences:{userId}`       | User preferences                  |
| `ratelimit:*`                | Rate limiting counters            |
| `brute:*`                    | Brute-force protection counters   |

---

## Roles & Access Governance

| Permission              | user | coordinator | admin |
| ----------------------- | :--: | :---------: | :---: |
| Chat with AI            |  Y   |      Y      |   Y   |
| Personal shortcuts      |  Y   |      Y      |   Y   |
| View own history        |  Y   |      Y      |   Y   |
| Save/archive sessions   |  Y   |      Y      |   Y   |
| Update own profile      |  Y   |      Y      |   Y   |
| Lock/unlock sessions    |  -   |      Y      |   Y   |
| View all sessions       |  -   |      Y      |   Y   |
| Moderate sessions       |  -   |      Y      |   Y   |
| Create global shortcuts |  -   |      -      |   Y   |
| Create/manage users     |  -   |      -      |   Y   |
| Admin settings          |  -   |      -      |   Y   |

---

## Security

- **PIN never stored in plaintext** — SHA-256 hashed with `PIN_SALT_SECRET`
- **Session tokens** — Random 128-bit hex strings stored in KV (24h TTL)
- **HttpOnly cookies** — Session cookies are HttpOnly, SameSite=Strict, Secure (in production)
- **Rate limiting** — 30 req/min general, 12 req/min for auth endpoints
- **Brute-force protection** — 5 failed attempts = 15-minute lockout per IP
- **CORS** — Same-origin enforcement for state-changing requests
- **Security headers** — X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy
- **Server-side RBAC** — All permissions enforced in middleware

### Secrets (never expose to client)

- `PIN_SALT_SECRET` — Salt for PIN hashing
- `ADMIN_TOKEN` — API token for admin automation

---

## Deployment

### Prerequisites

- Node.js 18+
- Cloudflare account (free tier)
- Wrangler CLI (`npm install -g wrangler`)

### Steps

```bash
# 1. Login to Cloudflare
wrangler login

# 2. Create KV namespace
wrangler kv namespace create KV
# Copy the ID into wrangler.toml

# 3. Set production secrets
wrangler pages secret put PIN_SALT_SECRET
wrangler pages secret put ADMIN_TOKEN

# 4. Build and deploy
npm run build
wrangler pages deploy dist

# 5. Seed initial admin user (via API)
curl -X POST https://your-app.pages.dev/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin", "role": "admin", "pin": "1234"}'
```

### CI/CD

GitHub Actions workflows are included:

- `ci.yml` — Format, lint, typecheck, test, build, size check
- `e2e.yml` — End-to-end tests with Playwright

---

## Frontend Architecture

| Component        | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `App.tsx`        | Root: auth check, routing, dark mode                       |
| `LoginGate.tsx`  | PIN-based login form                                       |
| `ChatWindow.tsx` | Main chat: sessions, messages, shortcuts, profile, history |
| `AdminPanel.tsx` | Admin: user management, session moderation, shortcuts      |

---

## AI Model Usage

All AI calls use **free** Cloudflare Workers AI models. No paid APIs.

```typescript
const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  messages: [
    { role: 'system', content: 'You are a helpful assistant...' },
    { role: 'user', content: userMessage },
  ],
  max_tokens: 1024,
});
```

Context persists across turns by replaying the last 6 messages (3 turns) from history.

---

## Development

```bash
npm run dev          # Vite dev server
npm run build        # TypeScript check + Vite build
npm run test         # Vitest unit tests
npm run lint         # ESLint
npm run format       # Prettier
npm run ci           # Full CI pipeline
npm run seed         # Seed local KV data
npm run deploy       # Build + deploy to Cloudflare Pages
```

---

## Error Codes

| Code                  | HTTP | Description                     |
| --------------------- | ---- | ------------------------------- |
| `UNAUTHORIZED`        | 401  | Not authenticated               |
| `FORBIDDEN`           | 403  | Insufficient permissions        |
| `NOT_FOUND`           | 404  | Resource not found              |
| `BAD_REQUEST`         | 400  | Invalid request                 |
| `RATE_LIMITED`        | 429  | Too many requests               |
| `BRUTE_FORCE_LOCKED`  | 429  | IP locked after failed attempts |
| `SESSION_LOCKED`      | 403  | Chat session is locked          |
| `SESSION_EXPIRED`     | 401  | Auth session expired            |
| `INVALID_CREDENTIALS` | 401  | Wrong name/PIN                  |
| `VALIDATION_ERROR`    | 400  | Input validation failed         |
| `INTERNAL_ERROR`      | 500  | Server error                    |
| `KV_ERROR`            | 503  | Storage error                   |
