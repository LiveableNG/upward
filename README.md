# Upward Platform

> **Upward by GoodTenants** — rent payment tracking, Rent Passport, and tenant management platform.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Prerequisites](#4-prerequisites)
5. [Getting Started](#5-getting-started)
6. [Available Scripts](#6-available-scripts)
7. [Development Workflow](#7-development-workflow)
8. [Environment Variables](#8-environment-variables)
9. [Adding a New Backend Module](#9-adding-a-new-backend-module)
10. [Code Quality Tools](#10-code-quality-tools)
11. [Deployment Overview](#11-deployment-overview)

---

## 1. Project Overview

Upward is a B2C platform for Nigerian renters and landlords. It enables:

- **PayRent** — record, request, and receipt rent payments via Paystack
- **Rent Passport** — a verified, shareable rent-payment history tied to a tenant's identity
- **Onboarding sequences** — automated 6-week email series (Mailgun + BullMQ)

The platform is a **pnpm workspace monorepo** orchestrated by **Turborepo**. The frontend (Next.js) and backend (NestJS + Fastify) are fully decoupled and deployed independently.

---

## 2. Tech Stack

| Layer            | Technology                                | Notes                               |
| ---------------- | ----------------------------------------- | ----------------------------------- |
| **Frontend**     | Next.js 15 (App Router)                   | SSR, Capacitor mobile wrapper       |
| **Backend API**  | NestJS 11 + Fastify adapter               | Modular monolith, `/api/v1/` prefix |
| **Language**     | TypeScript 5 (strict)                     | Shared via `packages/shared-types`  |
| **Database**     | PostgreSQL + Prisma ORM                   | `upward_` table prefix              |
| **Queue**        | BullMQ + Redis                            | Async emails, scoring, invoices     |
| **Auth**         | JWT (access + refresh tokens)             | —                                   |
| **Monorepo**     | pnpm workspaces + Turborepo               | Parallel builds, remote caching     |
| **Code quality** | ESLint 9 (flat config) + Prettier + Husky | Pre-commit hooks                    |
| **Commits**      | Conventional Commits via commitlint       | Enforced on every commit            |

---

## 3. Repository Structure

```
upward/
│
├── apps/                          # Deployable applications
│   │
│   ├── frontend/                  # @upward/frontend
│   │   ├── src/
│   │   │   └── app/               # Next.js App Router pages & layouts
│   │   │       ├── layout.tsx     # Root layout (metadata, fonts, providers)
│   │   │       ├── page.tsx       # Home page (Sprint 1 landing)
│   │   │       └── globals.css    # Global CSS reset + design tokens
│   │   ├── next.config.ts         # Next.js config (transpilePackages)
│   │   ├── tsconfig.json          # Extends ../../tsconfig.base.json
│   │   ├── .env.local             # Local dev env vars (not committed)
│   │   ├── ios/                   # Capacitor iOS project (generated, git-ignored)
│   │   └── android/               # Capacitor Android project (generated, git-ignored)
│   │
│   └── backend/                   # @upward/backend
│       ├── src/
│       │   ├── main.ts            # Bootstrap: Fastify adapter, CORS, global prefix
│       │   ├── app.module.ts      # Root NestJS module (imports feature modules)
│       │   ├── app.controller.ts  # Root controller (GET /api/v1/health)
│       │   ├── app.service.ts     # Root service (health check response)
│       │   └── [module]/          # Feature modules added per sprint (see §9)
│       ├── nest-cli.json          # NestJS CLI config
│       ├── tsconfig.json          # Extends ../../tsconfig.base.json + decorators
│       └── .env                   # Local dev env vars (not committed)
│
├── packages/                      # Internal shared packages (no deployments)
│   │
│   ├── shared-types/              # @upward/shared-types
│   │   └── src/
│   │       └── index.ts           # Barrel export of all DTOs, interfaces, enums
│   │                              # Both apps import from here — zero duplication
│   │
│   └── utils/                    # @upward/utils
│       └── src/
│           └── index.ts           # Pure utility functions (no framework deps)
│
├── devops/                        # Infrastructure and CI/CD
│   └── README.md                  # Planned: Dockerfile, nginx, EC2 scripts, GHA
│
├── .husky/                        # Git hooks (managed by Husky v9)
│   ├── pre-commit                 # Runs lint-staged before every commit
│   └── commit-msg                 # Runs commitlint to enforce commit format
│
├── architecture.md                # Full system architecture decisions document
├── eslint.config.mjs              # ESLint 9 flat config (all workspaces)
├── commitlint.config.mjs          # Conventional commits rules
├── .prettierrc.json               # Prettier formatting rules
├── .prettierignore                # Files excluded from Prettier
├── tsconfig.base.json             # Shared strict TypeScript base config
├── turbo.json                     # Turborepo pipeline (build/dev/lint/test order)
├── pnpm-workspace.yaml            # pnpm workspace package paths
├── package.json                   # Root: scripts, devDeps, lint-staged config
└── .npmrc                         # pnpm settings (no hoisting, auto peer deps)
```

---

## 4. Prerequisites

| Tool           | Minimum Version | Install                            |
| -------------- | --------------- | ---------------------------------- |
| **Node.js**    | 20.x LTS        | [nodejs.org](https://nodejs.org)   |
| **pnpm**       | 10.x            | `npm install -g pnpm`              |
| **Git**        | 2.x             | [git-scm.com](https://git-scm.com) |
| **PostgreSQL** | 15+             | Local or Docker                    |
| **Redis**      | 7+              | Local or Docker                    |

> **Windows users:** run all `pnpm` commands inside **cmd** or **Git Bash**, not PowerShell, to avoid execution policy conflicts.

---

## 5. Getting Started

### Clone and install

```bash
git clone <repo-url> upward
cd upward

# Install all workspace dependencies + initialise Husky hooks
pnpm install
```

> `pnpm install` triggers the `prepare` script automatically, which runs `husky` to register the git hooks in `.husky/`.

### Set up environment variables

```bash
# Backend — copy and fill in credentials
cp apps/backend/.env.example apps/backend/.env

# Frontend — copy and fill in public keys
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

Edit each `.env` file. At minimum for local dev you need:

| Variable              | Where                      | Value                                                      |
| --------------------- | -------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`        | `apps/backend/.env`        | `postgresql://postgres:postgres@localhost:5432/upward_dev` |
| `REDIS_URL`           | `apps/backend/.env`        | `redis://localhost:6379`                                   |
| `JWT_SECRET`          | `apps/backend/.env`        | Any random string                                          |
| `NEXT_PUBLIC_API_URL` | `apps/frontend/.env.local` | `http://localhost:4000/api/v1`                             |

### Run in development

```bash
# Both apps, in parallel (Turborepo)
pnpm dev

# Frontend only → http://localhost:3000
pnpm --filter @upward/frontend dev

# Backend only → http://localhost:4000/api/v1/health
pnpm --filter @upward/backend dev
```

---

## 6. Available Scripts

All top-level scripts delegate to Turborepo, which runs the matching script in every workspace that defines it.

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `pnpm dev`          | Start all apps in watch mode (parallel)                  |
| `pnpm build`        | Production build for all apps                            |
| `pnpm lint`         | ESLint across all workspaces                             |
| `pnpm type-check`   | `tsc --noEmit` across all workspaces                     |
| `pnpm test`         | Run test suites across all workspaces                    |
| `pnpm format`       | Prettier format **all** files                            |
| `pnpm format:check` | Prettier check (used in CI)                              |
| `pnpm clean`        | Delete all `dist/`, `.next/`, `.turbo/`, `node_modules/` |

### Per-workspace scripts

```bash
# Run a script only in one workspace
pnpm --filter @upward/frontend <script>
pnpm --filter @upward/backend  <script>
pnpm --filter @upward/shared-types <script>
```

---

## 7. Development Workflow

### Branch strategy

```
main          ← production-ready, protected
  └── dev     ← integration branch (PRs merge here first)
        └── feat/sprint-1-landing-page
        └── fix/payment-webhook-retry
        └── chore/update-dependencies
```

### Commit format (enforced by commitlint)

Every commit message **must** follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <subject>

feat(auth): add JWT refresh token rotation
fix(payments): handle Paystack webhook duplicate events
docs: update environment variable reference
chore(deps): bump next from 15.1.0 to 15.2.3
```

**Allowed types:** `feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `chore` · `revert` · `wip`

> A bad commit message will be **rejected by the `commit-msg` hook** before it is saved.

### Pre-commit hook

When you run `git commit`, Husky automatically:

1. Runs **lint-staged** — ESLint `--fix` + Prettier on staged `.ts/.tsx` files only
2. If lint-staged fails, the commit is **aborted**
3. Then checks your **commit message** format via commitlint

---

## 8. Environment Variables

### Backend (`apps/backend/.env`)

| Variable                             | Required            | Description                  |
| ------------------------------------ | ------------------- | ---------------------------- |
| `PORT`                               | No (default `4000`) | HTTP server port             |
| `NODE_ENV`                           | Yes                 | `development` / `production` |
| `FRONTEND_URL`                       | Yes                 | Allowed CORS origin          |
| `DATABASE_URL`                       | Yes                 | PostgreSQL connection string |
| `REDIS_URL`                          | Yes                 | Redis connection string      |
| `JWT_SECRET`                         | Yes                 | Signing secret for JWTs      |
| `JWT_EXPIRY`                         | No (default `15m`)  | Access token expiry          |
| `JWT_REFRESH_EXPIRY`                 | No (default `7d`)   | Refresh token expiry         |
| `PAYSTACK_SECRET_KEY`                | Sprint 3            | Payment processing           |
| `MONO_APP_ID` / `MONO_SECRET_KEY`    | Sprint 3            | Bank verification            |
| `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` | Sprint 2            | Transactional email          |
| `CLOUDINARY_URL`                     | Sprint 3            | Image / media upload         |
| `AWS_*`                              | Sprint 3            | S3 document storage          |
| `WHATSAPP_API_KEY`                   | Sprint 3            | WhatsApp notifications       |
| `BUGSNAG_API_KEY`                    | Production          | Error monitoring             |
| `UPLOADER_SERVICE_URL`               | Sprint 3            | GoodTenants uploader service |

### Frontend (`apps/frontend/.env.local`)

| Variable                   | Required | Description                     |
| -------------------------- | -------- | ------------------------------- |
| `NEXT_PUBLIC_API_URL`      | Yes      | Backend API base URL            |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Sprint 1 | Product analytics               |
| `NEXT_PUBLIC_POSTHOG_HOST` | Sprint 1 | PostHog ingestion host          |
| `NEXT_PUBLIC_GA_ID`        | Sprint 1 | Google Analytics measurement ID |

> Variables prefixed `NEXT_PUBLIC_` are bundled into the client-side JavaScript. Do **not** put secrets in them.

---

## 9. Adding a New Backend Module

Each NestJS feature module lives in `apps/backend/src/<module-name>/` and follows this structure:

```
src/auth/
├── auth.module.ts        # @Module decorator — declares controllers, providers, imports
├── auth.controller.ts    # Route handlers (HTTP layer only, no business logic)
├── auth.service.ts       # Business logic
├── auth.repository.ts    # Database queries (Prisma calls)
├── dto/
│   ├── login.dto.ts      # Request/response shapes (extend from shared-types)
│   └── register.dto.ts
└── entities/
    └── user.entity.ts    # DB entity interface (mirrors Prisma model)
```

**Steps to add a new module:**

1. Create the folder and files above inside `apps/backend/src/<module>/`
2. Add the module to `AppModule` imports in `apps/backend/src/app.module.ts`
3. Add any shared DTOs / entity interfaces into `packages/shared-types/src/`
4. Re-export from `packages/shared-types/src/index.ts`
5. Import the shared type in the frontend via `import type { ... } from '@upward/shared-types'`

---

## 10. Code Quality Tools

| Tool                       | Config file                      | Runs                                      |
| -------------------------- | -------------------------------- | ----------------------------------------- |
| **ESLint 9** (flat config) | `eslint.config.mjs`              | Pre-commit (staged files) + `pnpm lint`   |
| **Prettier**               | `.prettierrc.json`               | Pre-commit (staged files) + `pnpm format` |
| **TypeScript**             | `tsconfig.base.json`             | Pre-push via `pnpm type-check`            |
| **commitlint**             | `commitlint.config.mjs`          | Every `git commit` (commit-msg hook)      |
| **Husky v9**               | `.husky/`                        | Registers hooks via `prepare` script      |
| **lint-staged**            | `package.json` → `"lint-staged"` | Only runs on **staged** files (fast)      |

### Skipping hooks (emergency only)

```bash
git commit --no-verify -m "wip: emergency fix"
```

> Use sparingly. CI will catch anything the hooks missed.

---

## 11. Deployment Overview

| Layer           | Platform             | How                                          |
| --------------- | -------------------- | -------------------------------------------- |
| **Frontend**    | Vercel               | Push to `main` → auto-deploy                 |
| **Backend API** | AWS EC2              | Docker image → SSH deploy via GitHub Actions |
| **Database**    | AWS RDS (PostgreSQL) | Prisma migrations run on startup             |
| **Redis**       | EC2 or Upstash       | Queue broker + cache                         |
| **Media**       | Cloudinary + AWS S3  | Already provisioned                          |

CI/CD pipelines will live in `devops/` once deployment configuration begins (post-Sprint 1).

---

> See [`architecture.md`](./architecture.md) for the full system design, module breakdown, async job queues, third-party services, and sprint-to-feature mapping.
