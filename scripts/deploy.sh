#!/usr/bin/env bash
# ============================================================
# Kinsen Chat v3 — Automated Setup & Deploy Script
# ============================================================
# Prerequisites:
#   - Node.js >= 18
#   - npm >= 9
#   - gh CLI (authenticated: `gh auth login`)
#   - wrangler CLI (authenticated: `wrangler login`)
# ============================================================

set -euo pipefail

PROJECT_NAME="kinsen-chat"
GITHUB_ORG=""  # Leave empty for personal account, or set to your org name
PASSCODE="kinsen2025"  # Default staff passcode — CHANGE THIS
ADMIN_TOKEN="kinsen-admin-$(openssl rand -hex 12)"

echo "🚗 Kinsen Chat v3 — Setup & Deploy"
echo "===================================="

# ---- 1. Install dependencies ----
echo ""
echo "📦 Step 1: Installing dependencies..."
npm install

# ---- 2. Run tests ----
echo ""
echo "🧪 Step 2: Running tests..."
npm test

# ---- 3. Build ----
echo ""
echo "🔨 Step 3: Building frontend..."
npm run build

# ---- 4. Compute passcode hash ----
echo ""
echo "🔐 Step 4: Computing passcode hash..."
PASSCODE_HASH=$(echo -n "$PASSCODE" | shasum -a 256 | awk '{print $1}')
echo "   Passcode: $PASSCODE"
echo "   Hash:     $PASSCODE_HASH"

# ---- 5. Create GitHub repo ----
echo ""
echo "📂 Step 5: Creating GitHub repository..."
git init 2>/dev/null || true
git add -A
git commit -m "feat: initial Kinsen Chat v3 app

Internal car rental ops platform with knowledge base, workflows,
vehicle board, customer lookup, email generator, escalations,
PWA support, i18n, and Cloudflare Pages deployment.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" 2>/dev/null || echo "   Already committed"

if [ -n "$GITHUB_ORG" ]; then
  REPO_FULL="$GITHUB_ORG/$PROJECT_NAME"
  gh repo create "$REPO_FULL" --private --source=. --remote=origin --push 2>/dev/null || echo "   Repo already exists, pushing..."
else
  gh repo create "$PROJECT_NAME" --private --source=. --remote=origin --push 2>/dev/null || echo "   Repo already exists, pushing..."
  REPO_FULL="$(gh api user --jq .login)/$PROJECT_NAME"
fi
git branch -M main
git push -u origin main 2>/dev/null || git push origin main

# ---- 6. Create KV namespaces ----
echo ""
echo "💾 Step 6: Creating Cloudflare KV namespaces..."
KV_OUTPUT=$(wrangler kv namespace create "KV" 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep -oE '[a-f0-9]{32}' | head -1)
echo "   KV namespace ID: $KV_ID"

KV_PREVIEW_OUTPUT=$(wrangler kv namespace create "KV" --preview 2>&1)
KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -oE '[a-f0-9]{32}' | head -1)
echo "   KV preview ID:   $KV_PREVIEW_ID"

# ---- 7. Update wrangler.toml with real KV IDs ----
echo ""
echo "⚙️  Step 7: Updating wrangler.toml..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/PLACEHOLDER_KV_ID/$KV_ID/" wrangler.toml
  sed -i '' "s/PLACEHOLDER_KV_PREVIEW_ID/$KV_PREVIEW_ID/" wrangler.toml
else
  sed -i "s/PLACEHOLDER_KV_ID/$KV_ID/" wrangler.toml
  sed -i "s/PLACEHOLDER_KV_PREVIEW_ID/$KV_PREVIEW_ID/" wrangler.toml
fi

# ---- 8. Create Pages project ----
echo ""
echo "🌐 Step 8: Creating Cloudflare Pages project..."
wrangler pages project create "$PROJECT_NAME" --production-branch main 2>/dev/null || echo "   Pages project already exists"

# ---- 9. Set secrets ----
echo ""
echo "🔑 Step 9: Setting Cloudflare secrets..."
echo "$PASSCODE_HASH" | wrangler pages secret put PASSCODE_HASH --project-name "$PROJECT_NAME"
echo "$ADMIN_TOKEN" | wrangler pages secret put ADMIN_TOKEN --project-name "$PROJECT_NAME"

# ---- 10. Deploy ----
echo ""
echo "🚀 Step 10: Deploying to Cloudflare Pages..."
npm run build
wrangler pages deploy dist --project-name "$PROJECT_NAME"

# ---- 11. Seed knowledge base + operational data ----
echo ""
echo "📚 Step 11: Seeding knowledge base, customers, vehicles, flags..."
sleep 5  # Wait for deployment to propagate
DEPLOY_URL=$(wrangler pages deployment list --project-name "$PROJECT_NAME" 2>&1 | grep -oE 'https://[^ ]*\.pages\.dev' | head -1)
if [ -n "$DEPLOY_URL" ]; then
  echo "   Deployed at: $DEPLOY_URL"
  echo "   Seeding all data..."
  curl -s -X POST "$DEPLOY_URL/api/admin/seed" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' | head -c 200
  echo ""
else
  echo "   ⚠️  Could not auto-detect deploy URL."
  echo "   Run manually after finding URL in Cloudflare dashboard:"
  echo "   curl -X POST https://<your-app>.pages.dev/api/admin/seed \\"
  echo "     -H 'Authorization: Bearer $ADMIN_TOKEN' -H 'Content-Type: application/json' -d '{}'"
fi

# ---- 12. Commit updated wrangler.toml ----
echo ""
echo "📤 Step 12: Pushing updated config..."
git add wrangler.toml
git commit -m "chore: update KV namespace IDs after deploy

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" 2>/dev/null || true
git push origin main

echo ""
echo "============================================"
echo "✅ Kinsen Chat v3 deployed successfully!"
echo "============================================"
echo ""
echo "📋 Quick Reference:"
echo "   URL:          ${DEPLOY_URL:-'(check Cloudflare dashboard)'}"
echo "   Passcode:     $PASSCODE"
echo "   Admin Token:  $ADMIN_TOKEN"
echo ""
echo "   ⚠️  Save the admin token — you'll need it to reseed data."
echo ""
echo "🧪 Test it:"
echo "   1. Open the URL above"
echo "   2. Enter passcode: $PASSCODE"
echo "   3. Ask: 'What is the late return policy?'"
echo "   4. Try ⌘K to open command palette"
echo "   5. Click Workflows to start a guided process"
echo ""
