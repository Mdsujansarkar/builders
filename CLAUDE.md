# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout — three services

1. **Marketing site** (`client/` + `server/`): public land-sale website. `server/` is an Express API (port 4000) serving content from hardcoded data files; `client/` is the React 18 + Vite frontend (port 5173, `/api` proxied to :4000).
2. **Admin backend** (`backend/`): fully independent TypeScript REST API (port 4001) for auth, users, projects, categories, financial records, transactions, invoices, reports, dashboards. Prisma + SQLite (schema is Postgres-ready), Zod validation everywhere, JWT + rotating refresh tokens. See `backend/README.md` and `backend/docs/API.md`.
3. **Admin SPA** (`client/src/admin/`): React app embedded in the same Vite client under `/admin/*`, talking to the backend via `/api/v1` (proxied to :4001 — this proxy rule must stay **before** the `/api` rule in `vite.config.js`).

The admin backend is deliberately decoupled from the marketing server; they only share the Vite dev proxy.

## Commands

```bash
npm run dev            # root: marketing API :4000 + client :5173 concurrently
npm run build          # build client to client/dist
npm start              # Express serves marketing API + built client on :4000

cd backend
npm run dev            # admin API with tsx watch on :4001
npm test               # vitest integration/e2e suite (fresh DB per run, sequential)
npm run typecheck      # tsc --noEmit
npm run db:migrate     # prisma migrate dev
npm run db:deploy      # prisma migrate deploy (CI/prod)
npm run db:seed        # idempotent super-admin seed from .env
```

Run a single backend test file: `cd backend && npx vitest run tests/financial-records.test.ts`. Backend `.env` is required (`cp .env.example .env`, generate JWT secrets with `openssl rand -hex 32`).

Deploy target is Vercel (`vercel.json`): `client/dist` static + `api/index.mjs` serverless at `/api/*`, with SPA rewrites. Serverless filesystems are read-only, so inquiry persistence is a known placeholder there.

## Marketing site architecture

- All content lives in `server/data/` (`settings.js`, `projects.js`, `plots.js`, `content.js`). Components render from API responses — replacing placeholder content requires only editing these files, no component changes.
- `server/app.js` exports `createApp({ mode })`: `standalone` mounts routes at `/api`; `serverless` strips the `/api` prefix for Vercel. `api/index.mjs` wraps it for Vercel.
- `GET /api/bootstrap` returns everything the site needs in one call; `client/src/context/DataContext.jsx` consumes it.
- Pages: Home, Projects/ProjectDetails, Plots/PlotDetails, Contact (`client/src/pages/`).
- Design system is hand-written CSS in `client/src/styles.css` (`:root` tokens for colors/typography).

## Admin backend architecture

- Module pattern under `backend/src/modules/<name>/` — each has `routes.ts`, `schemas.ts` (Zod, strict), `service.ts`. Routers mount under `/api/v1` in `src/app.ts`.
- Shared libs in `src/lib/`: money (Decimal.js normalization), pagination, codes (FIN-/INV- numbering), audit, history, access (project scoping), tokens, login throttle, PDF (pdfkit) / Excel (exceljs) generation.
- **Money**: Prisma `Decimal` columns, normalized to 2dp half-up before persistence, serialized as fixed 2dp strings. Balances computed in DB transactions as `totalAmount − Σ(valid payments)`. Duplicate payments rejected via per-record unique reference (409). Payments are voided, never deleted.
- **Authorization**: `SUPER_ADMIN` (full) vs `USER` (scoped to projects via `project_user`). Role claims in access tokens are never trusted — re-read from DB per request; deactivation/password change kills sessions. List queries are scope-filtered; out-of-scope explicit filters return 403.
- **Immutability**: mutations append to `audit_logs`; business changes append per-field old/new rows to `record_history`. Both append-only by contract.
- Tests (`backend/tests/`) are integration/e2e via supertest against a real SQLite DB; all suites share one DB file, so `fileParallelism: false` — keep tests sequential, clean up their own data (see `tests/helpers.ts`).

## Conventions

- Marketing server and its data files: ESM (`.js` with `"type": "module"`).
- Admin client talks to `/api/v1` via `client/src/admin/api.js`, which handles token storage and one automatic refresh-retry on 401; use it rather than raw fetch in admin pages.
- Backend errors use typed error classes from `src/lib/errors.ts` with machine-readable codes; validate every boundary with Zod schemas (unknown fields rejected).
