# Bhumi Landmarks — Installation Guide & Project Structure

Complete setup instructions for all three parts of the project. Follow the
steps in order; the whole setup takes ~5 minutes.

## Prerequisites

| Tool | Version | Check with |
| --- | --- | --- |
| Node.js | 20 or newer | `node -v` |
| npm | 10 or newer (ships with Node) | `npm -v` |
| openssl | any (for generating JWT secrets) | `openssl version` |

## Project structure

```
land-sales/
├── client/                      # React frontend (shared by marketing site + admin panel)
│   ├── src/
│   │   ├── pages/               # Marketing pages (Home, Projects, Plots, Contact…)
│   │   ├── components/          # Marketing UI components (Navbar, PlotCard…)
│   │   ├── context/             # DataContext — loads GET /api/bootstrap
│   │   ├── admin/               # ★ Admin panel (embedded React app)
│   │   │   ├── AdminApp.jsx     #   /admin routes
│   │   │   ├── AuthContext.jsx  #   login state, token handling
│   │   │   ├── api.js           #   API client for /api/v1 (auto refresh on 401)
│   │   │   └── pages/           #   Dashboard, Users, Projects, Records, Invoices…
│   │   ├── App.jsx              # Router — splits /admin/* from the marketing site
│   │   └── styles.css           # Hand-written design system (:root tokens)
│   └── vite.config.js           # Proxy: /api/v1 → :4001, /api → :4000
│
├── server/                      # Marketing content API (plain JS, no database)
│   ├── app.js                   # Express app — all GET endpoints + POST /inquiries
│   ├── server.js                # Standalone entry point (port 4000)
│   └── data/                    # ★ ALL marketing content lives here
│       ├── settings.js          #   company info, phone, address
│       ├── projects.js          #   project listings
│       ├── plots.js             #   plot inventory
│       └── content.js           #   amenities, testimonials, gallery, stats…
│
├── backend/                     # ★ Admin/financial backend (independent service)
│   ├── src/
│   │   ├── app.ts               # Express factory — mounts modules under /api/v1
│   │   ├── server.ts            # Bootstrap + graceful shutdown (port 4001)
│   │   ├── config/env.ts        # Zod-validated environment variables
│   │   ├── lib/                 # money, pagination, audit, tokens, PDF/Excel…
│   │   ├── middleware/          # auth (JWT), zod validation, error handler
│   │   └── modules/             # auth, users, projects, categories,
│   │                            # financial-records, transactions,
│   │                            # invoices, dashboard, reports
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema (SQLite, Postgres-ready)
│   │   ├── migrations/          # versioned SQL migrations
│   │   └── seed.ts              # creates the super admin
│   ├── tests/                   # vitest integration/e2e suites
│   └── docs/API.md              # full endpoint documentation
│
├── api/index.mjs                # Vercel serverless wrapper for server/app.js
├── scripts/                     # image fetch + e2e/screenshot helpers
├── vercel.json                  # Vercel deploy config (client/dist + /api/*)
└── package.json                 # root scripts (npm run dev runs both :4000 + :5173)
```

★ = the three main pieces: **admin panel** (React, inside `client/`),
**marketing API** (`server/`), **admin backend** (`backend/`).

### How the pieces connect

```
Browser
  │
  ├── http://localhost:5173        ← Vite dev server (client/)
  │     ├── /…                     → marketing pages
  │     ├── /admin/…               → admin panel (same React app)
  │     │
  │     ├── /api/*    ──proxy──→  server/  (Express :4000)  ── reads server/data/*.js
  │     └── /api/v1/* ──proxy──→  backend/ (Express :4001)  ── reads/writes SQLite DB
  │
  └── backend/prisma/dev.db        ← SQLite file (all admin/financial data)
```

In production (Vercel), `client/dist` is static, the marketing API runs as a
serverless function at `/api/*`, and the admin backend deploys separately to
any Node host.

## Installation

### 1. Install all dependencies

From the repo root:

```bash
npm install              # root tooling (concurrently)
npm run install:all      # installs server/ + client/ deps
cd backend && npm install && cd ..
```

### 2. Set up the admin backend (required for the admin panel)

```bash
cd backend

# 2a. Create the environment file
cp .env.example .env

# 2b. Generate real JWT secrets and put them in .env
sed -i "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -hex 32)|" .env
sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -hex 32)|" .env

# 2c. Create the database schema
npx prisma migrate deploy

# 2d. Create the super admin account
npm run db:seed
```

Default seeded login:

```
Email:    admin@bhumilandmarks.com
Password: ChangeMe!123
```

> ⚠️ Change this password before any real deployment. It is a placeholder
> documented in the repo.

### 3. Run everything in development

Open **three terminals** (all commands from the repo root):

```bash
# Terminal 1 — marketing API (port 4000) + client (port 5173) together
npm run dev

# Terminal 2 — admin backend (port 4001)
cd backend && npm run dev

# Terminal 3 — (optional) watch-mode backend tests
cd backend && npm run test:watch
```

Then open:

| URL | What |
| --- | --- |
| http://localhost:5173 | marketing website |
| http://localhost:5173/admin | admin panel (login with the seeded credentials) |
| http://localhost:4000/api/bootstrap | marketing API |
| http://localhost:4001/api/v1/health | admin backend health check |

> If port 5173 is already taken, Vite uses 5174 (or 5175…) — the terminal
> prints the actual URL. The admin panel is always at `/admin` on whatever
> port Vite picked, e.g. `http://localhost:5174/admin`.

### Production build

```bash
npm run build           # builds client/ to client/dist
npm start               # Express serves marketing API + built client on :4000
cd backend
npm run build && npm start   # compiled admin backend on :4001
```

## Where data is stored

| Data | Storage | Editable how |
| --- | --- | --- |
| Marketing content (projects, plots, testimonials…) | `server/data/*.js` | edit the files, no database |
| Contact form submissions | `server/data/inquiries.log.json` | written by `POST /api/inquiries` — **not persisted on Vercel** (read-only serverless FS) |
| Admin: users, projects, categories, financial records, transactions, invoices | `backend/prisma/dev.db` (SQLite) | via the admin panel or the `/api/v1` API |

To move the admin backend to PostgreSQL: change `provider = "sqlite"` to
`provider = "postgresql"` in `backend/prisma/schema.prisma`, point
`DATABASE_URL` at your Postgres instance, delete `prisma/migrations/*` and
re-run `npx prisma migrate dev` — no application code changes needed.

## Troubleshooting

**"Cannot login" / admin panel errors** — the backend is not running. Start it
(`cd backend && npm run dev`) and check
http://localhost:4001/api/v1/health returns JSON. Login also fails if the seed
hasn't run (`npm run db:seed`).

**Seed says `Environment variable not found: DATABASE_URL`** — you're missing
`backend/.env`. Redo step 2a–2b.

**Admin panel at `/backend` shows not found** — wrong URL; the panel lives at
**`/admin`**.

**Backend tests fail with file-lock errors** — all suites share one SQLite
file and must run sequentially. Use `npm test` (which sets
`fileParallelism: false`); don't pass `--parallel`.

**Marketing API returns empty/CORS errors** — make sure the marketing server
is running on :4000 (`npm run dev:server`).

**Proxy changes** — in `client/vite.config.js`, the `/api/v1` rule must stay
*above* the `/api` rule, or admin requests will go to the wrong backend.

## Deploying to Vercel (marketing site)

```bash
npx vercel login        # first time only
npx vercel              # preview deploy
npx vercel --prod       # production deploy
```

`vercel.json` handles the build (`client/dist`), the `/api/*` serverless
function (`api/index.mjs`) and SPA rewrites. The admin backend is **not**
deployed by this — host it separately (Railway, Render, Fly.io, a VPS…),
switch it to PostgreSQL first, and set the client's admin API base to the
deployed URL.
