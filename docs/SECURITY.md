# Security Policy

## Scope

This repository contains a Cloudflare Pages + Functions application for internal car-rental operations. Security controls prioritize:

- auth/session integrity
- API hardening
- dependency hygiene
- secret leak prevention

## Severity Model

- Critical: remote code execution, auth bypass, session hijack, secret exfiltration.
- High: privilege escalation, sensitive data exposure, exploitable CSRF/XSS in privileged flows.
- Medium: defense-in-depth gaps, limited-scope access controls, insecure defaults without active exploit.
- Low: informational findings, non-exploitable hardening gaps.

## SLA

- Critical: fix or disable affected path within 24 hours.
- High: fix within 3 days.
- Medium: fix within 14 days.
- Low: fix in normal backlog; reassess every release.

## Hard Requirements

- `SameSite=Strict`, `HttpOnly` session cookies only.
- Same-origin mutation enforcement (`Origin` mismatch blocked).
- Endpoint rate limiting and brute-force controls on auth paths.
- RBAC on every protected API route via middleware.
- No plaintext secrets committed to git.

## Scan Gates

- CI must run:
  - `npm audit --audit-level=high`
  - OSV scan
  - gitleaks secret scan
- Any open Critical/High finding blocks merge unless an explicit documented mitigation is added to PR notes.

## Mitigation Patterns

- Dependency CVEs:
  - upgrade package
  - pin safe version
  - remove unused transitive packages where feasible
- Secret exposure:
  - rotate immediately
  - invalidate impacted tokens
  - add detection rule to prevent recurrence
- Auth/session issues:
  - invalidate all active sessions
  - tighten middleware checks
  - add regression tests for bypass path
