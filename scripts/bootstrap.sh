#!/usr/bin/env bash
# ============================================================
# Kinsen Station AI — Bootstrap Script
# ============================================================
# Single-run setup for fresh environments.
# For existing deployments, run: npm run deploy
#
# Prerequisites:
#   node >= 18, npm >= 9
#   wrangler CLI   (npm i -g wrangler && wrangler login)
#   gh CLI         (brew install gh && gh auth login)
# ============================================================

set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-kinsen-chat}"
PRODUCTION_BRANCH="${PRODUCTION_BRANCH:-main}"

# ── Colours ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✓${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
die()     { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}── $* ──${NC}"; }

# ── 0. Prerequisites ──────────────────────────────────────
header "Checking prerequisites"

check_cmd() {
  command -v "$1" &>/dev/null || die "$1 not found. $2"
}

check_cmd node  "Install from https://nodejs.org"
check_cmd npm   "Comes with Node.js"
check_cmd wrangler "npm install -g wrangler, then: wrangler login"
check_cmd gh    "brew install gh, then: gh auth login"
check_cmd openssl "Install OpenSSL"

NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>/dev/null \
  && echo "ok" || die "Node.js >= 18 required. Current: $(node --version)")
success "Node $(node --version), npm $(npm --version)"

# Verify wrangler is authenticated
wrangler whoami &>/dev/null || die "wrangler not authenticated. Run: wrangler login"
success "wrangler authenticated: $(wrangler whoami 2>&1 | grep -oE '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}' | head -1)"

# Verify gh is authenticated
gh auth status &>/dev/null || die "gh CLI not authenticated. Run: gh auth login"
success "gh authenticated: $(gh api user --jq .login)"

# ── 1. Install dependencies ───────────────────────────────
header "Installing dependencies"
npm ci --prefer-offline 2>/dev/null || npm install
success "Dependencies installed"

# ── 2. Run quality checks ─────────────────────────────────
header "Quality checks"
info "TypeScript typecheck…"
npx tsc --noEmit || die "TypeScript errors found. Fix before deploying."
success "TypeScript OK"

info "Running tests…"
npx vitest run || die "Tests failed. Fix before deploying."
success "All tests passed"

# ── 3. Generate secrets ───────────────────────────────────
header "Secret generation"

# PIN_SALT_SECRET
if [ -z "${PIN_SALT_SECRET:-}" ]; then
  PIN_SALT_SECRET="kinsen-salt-$(openssl rand -hex 24)"
  warn "PIN_SALT_SECRET not set — generated new value."
  warn "IMPORTANT: Changing this invalidates all existing PIN hashes!"
fi
info "PIN_SALT_SECRET length: ${#PIN_SALT_SECRET} chars"

# SESSION_SIGNING_SECRET
if [ -z "${SESSION_SIGNING_SECRET:-}" ]; then
  SESSION_SIGNING_SECRET="kinsen-sign-$(openssl rand -hex 24)"
  warn "SESSION_SIGNING_SECRET not set — generated new value."
  warn "Changing this invalidates all active sessions."
fi
info "SESSION_SIGNING_SECRET length: ${#SESSION_SIGNING_SECRET} chars"

# ADMIN_TOKEN (optional, for bootstrap seed calls)
if [ -z "${ADMIN_TOKEN:-}" ]; then
  ADMIN_TOKEN="kinsen-admin-$(openssl rand -hex 16)"
fi

echo ""
echo -e "${YELLOW}${BOLD}Save these values securely:${NC}"
echo "  PIN_SALT_SECRET:        $PIN_SALT_SECRET"
echo "  SESSION_SIGNING_SECRET: $SESSION_SIGNING_SECRET"
echo "  ADMIN_TOKEN:            $ADMIN_TOKEN"
echo ""
read -rp "Press Enter to continue and push secrets to Cloudflare Pages… " _

# ── 4. KV namespaces ──────────────────────────────────────
header "Cloudflare KV namespaces"

# Check if already configured in wrangler.toml
CURRENT_KV_ID=$(grep -E '^id\s*=' wrangler.toml | head -1 | grep -oE '[a-f0-9]{32}' || true)
if [ "${CURRENT_KV_ID:-PLACEHOLDER_KV_ID}" != "PLACEHOLDER_KV_ID" ] && [ -n "${CURRENT_KV_ID:-}" ]; then
  info "KV namespace already configured: $CURRENT_KV_ID"
else
  info "Creating production KV namespace…"
  KV_OUTPUT=$(wrangler kv namespace create "KV" 2>&1)
  KV_ID=$(echo "$KV_OUTPUT" | grep -oE '[a-f0-9]{32}' | head -1)
  [ -z "$KV_ID" ] && die "Failed to create KV namespace. Output:\n$KV_OUTPUT"

  info "Creating preview KV namespace…"
  KV_PREVIEW_OUTPUT=$(wrangler kv namespace create "KV" --preview 2>&1)
  KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -oE '[a-f0-9]{32}' | head -1)
  [ -z "$KV_PREVIEW_ID" ] && die "Failed to create preview KV namespace."

  # Patch wrangler.toml in-place
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/PLACEHOLDER_KV_ID/$KV_ID/" wrangler.toml
    sed -i '' "s/PLACEHOLDER_KV_PREVIEW_ID/$KV_PREVIEW_ID/" wrangler.toml
  else
    sed -i "s/PLACEHOLDER_KV_ID/$KV_ID/" wrangler.toml
    sed -i "s/PLACEHOLDER_KV_PREVIEW_ID/$KV_PREVIEW_ID/" wrangler.toml
  fi
  success "KV namespace created: $KV_ID (preview: $KV_PREVIEW_ID)"
fi

# ── 5. Cloudflare Pages project ───────────────────────────
header "Cloudflare Pages project"
wrangler pages project create "$PROJECT_NAME" \
  --production-branch "$PRODUCTION_BRANCH" 2>/dev/null \
  && success "Pages project '$PROJECT_NAME' created" \
  || info "Pages project '$PROJECT_NAME' already exists"

# ── 6. Set Cloudflare Pages secrets ──────────────────────
header "Setting Cloudflare Pages secrets"

set_secret() {
  local name="$1"
  local value="$2"
  echo "$value" | wrangler pages secret put "$name" \
    --project-name "$PROJECT_NAME" 2>/dev/null \
    && success "Secret $name set" \
    || warn "Failed to set $name (may already exist with same value)"
}

set_secret PIN_SALT_SECRET        "$PIN_SALT_SECRET"
set_secret SESSION_SIGNING_SECRET "$SESSION_SIGNING_SECRET"
set_secret ADMIN_TOKEN            "$ADMIN_TOKEN"

# ── 7. GitHub secrets ─────────────────────────────────────
header "Setting GitHub Actions secrets"

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)
if [ -n "$REPO" ]; then
  gh secret set CLOUDFLARE_PAGES_PROJECT_NAME --body "$PROJECT_NAME" \
    && success "CLOUDFLARE_PAGES_PROJECT_NAME set" || warn "Could not set GitHub secret"
  gh secret set PIN_SALT_SECRET --body "$PIN_SALT_SECRET" \
    && success "PIN_SALT_SECRET set" || warn "Could not set GitHub secret"
  gh secret set SESSION_SIGNING_SECRET --body "$SESSION_SIGNING_SECRET" \
    && success "SESSION_SIGNING_SECRET set" || warn "Could not set GitHub secret"
  gh secret set ADMIN_TOKEN --body "$ADMIN_TOKEN" \
    && success "ADMIN_TOKEN set" || warn "Could not set GitHub secret"
else
  warn "Not inside a GitHub repo — skipping GitHub secrets."
fi

# ── 8. Build ──────────────────────────────────────────────
header "Building frontend"
npm run build
success "Build complete → dist/"

# ── 9. Deploy ─────────────────────────────────────────────
header "Deploying to Cloudflare Pages"
wrangler pages deploy dist --project-name "$PROJECT_NAME" --branch "$PRODUCTION_BRANCH"
success "Deployed!"

DEPLOY_URL=$(wrangler pages deployment list --project-name "$PROJECT_NAME" 2>&1 \
  | grep -oE 'https://[a-z0-9\-]+\.pages\.dev' | head -1 || echo "")

# ── 10. Push to GitHub (triggers CI) ─────────────────────
header "Pushing to GitHub"
git add wrangler.toml 2>/dev/null || true
git diff --cached --quiet || git commit -m "chore: configure KV namespace IDs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin "$PRODUCTION_BRANCH" 2>/dev/null || warn "Nothing new to push"

# ── Done ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "${GREEN}${BOLD}  Kinsen Station AI — Bootstrap Complete!${NC}"
echo -e "${GREEN}${BOLD}============================================${NC}"
echo ""
echo "  URL:   ${DEPLOY_URL:-https://${PROJECT_NAME}.pages.dev}"
echo ""
echo -e "${YELLOW}${BOLD}Keep these secrets safe:${NC}"
echo "  PIN_SALT_SECRET:        $PIN_SALT_SECRET"
echo "  SESSION_SIGNING_SECRET: $SESSION_SIGNING_SECRET"
echo "  ADMIN_TOKEN:            $ADMIN_TOKEN"
echo ""
echo "Next steps:"
echo "  1. Open the URL above"
echo "  2. Log in with an admin account seeded via: node scripts/seed-local.mjs"
echo "  3. Create additional users in Admin → User Management"
echo ""
