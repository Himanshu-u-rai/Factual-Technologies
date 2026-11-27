# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in **Factual Technologies**, please report it responsibly before disclosing it publicly.

- **Contact Form:** https://factualtechnologies.tech/contact
- **Email:** security@factualtechnologies.tech
- **security.txt:** https://factualtechnologies.tech/.well-known/security.txt

Please include:
1. The affected URL, endpoint, or component.
2. Clear reproduction steps or a minimal proof of concept.
3. Expected impact and any suggested remediation.

We commit to acknowledging reports promptly, keeping reporters updated during remediation, and not pursuing legal action for good-faith security research that avoids data destruction, service disruption, or access to other users' private data.

## Security Architecture & Controls

- **Edge / Proxy Boundary (`src/proxy.ts`):** Rejects cross-origin `OPTIONS` preflight requests (`403`), validates same-origin headers on mutating `/api/*` requests, and enforces HMAC-SHA256 `HttpOnly` session cookies on `/admin/*` and `/api/admin/*`.
- **Database & Auth (`src/lib/server/`):** Parameterized PostgreSQL queries via `pg`, `scrypt` password hashing with constant-time comparison, timing-equalized login checks, atomic PostgreSQL rate-limiting windows, RFC 6238 TOTP 2FA, and immutable append-only `audit_logs`.
- **Headers & SSRF (`next.config.ts`, `src/lib/server/crypto.ts`):** CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP`/`CORP: same-origin`, conditional HSTS, DNS-validated SSRF filtering, and redirect-disabled outbound webhook probes.
- **Container Hardening (`Dockerfile`, `docker-compose.prod.yml`):** Non-root `nextjs` user, `cap_drop: ALL`, `no-new-privileges:true`, loopback-only host bindings, and resource limits.

## Local Security & Verification Commands

```bash
npm run lint
npx tsc --noEmit
npm test
npm run security:check
npm audit --audit-level=high
npm run build
```
