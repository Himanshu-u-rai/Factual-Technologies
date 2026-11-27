# Factual Technologies

Production software, cloud, and AI engineering studio platform built with **Next.js 16**, **React 19**, **Tailwind CSS v4**, and **PostgreSQL**.

## Local Development

1. Copy `.env.example` to `.env` and set strong random values for `POSTGRES_PASSWORD`, `SESSION_SECRET`, and `SETUP_TOKEN`:

```bash
cp .env.example .env
```

2. Start PostgreSQL locally:

```bash
docker compose up -d postgres
```

3. Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. On first deploy, register the sole admin account at `/admin/setup` (protected by `SETUP_TOKEN` and single-use email verification).

## Security & Quality Verification

Run all local checks before committing or deploying:

```bash
npx tsc --noEmit
npm run lint
npm run security:check
npm test
npm run build
```

See [SECURITY.md](./SECURITY.md) and `public/.well-known/security.txt` for security controls and vulnerability disclosure details.

## Production Container Build

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` binds PostgreSQL strictly to the internal `factual_net` bridge network and exposes the Next.js standalone server on `127.0.0.1:3100:3000` for termination behind a TLS reverse proxy (Nginx/Caddy). Set `TRUST_PROXY="true"` when running behind a reverse proxy that sets `X-Real-IP` / `X-Forwarded-*`.
