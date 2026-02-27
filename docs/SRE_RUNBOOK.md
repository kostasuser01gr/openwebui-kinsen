# SRE Runbook

## 1) Incident Triage

1. Confirm impact:
   - `curl -sS https://<deployment-domain>/api/health`
2. Check latest GitHub Actions run status.
3. Check Cloudflare deploy status in dashboard or via `wrangler pages deployment list`.
4. If auth failures spike, inspect rate-limit/brute-force counters in KV.

## 2) Rollback

1. Identify last known-good commit in `main`.
2. Re-deploy known-good commit via GitHub Actions:
   - `gh workflow run ci.yml --ref <good-commit-sha>`
3. Verify:
   - `/api/health`
   - `/api/auth/me` with valid session
   - chat send/receive.

## 3) Local Recovery Commands

1. Build and run locally:
   - `npm ci`
   - `npm run build`
   - `wrangler pages dev dist --persist-to .wrangler/state`
2. Smoke:
   - `npm run smoke`

## 4) D1 / KV Guidance

- This app currently relies on KV for sessions/data.
- For KV corruption or accidental deletes:
  1. Stop writes (temporary maintenance mode in UI if needed).
  2. Restore from export/seed pipeline where applicable.
  3. Re-run seed for non-user baseline data only.

## 5) Secret Rotation

1. Rotate Cloudflare API token.
2. Update GitHub Actions secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Invalidate legacy tokens.
4. Re-run CI deploy and smoke.

## 6) Post-Incident

1. Add regression test for the failure class.
2. Add alertable check to workflow or smoke script.
3. Document incident timeline and permanent fix.
