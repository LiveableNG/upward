# Upward Platform

> **Upward by GoodTenants** — Rent payment tracking, Rent Passport, and tenant management platform.

---

## 🚀 Developer Onboarding Index

If you are new to the project, please review the developer onboarding documents in the [onboarding/](./onboarding/) directory:

1.  **[1. Getting Started](./onboarding/1-getting-started.md)**: Local developer workspace setup, prerequisites, and startup commands.
2.  **[2. Environment Variables](./onboarding/2-environment-variables.md)**: Full list of environment configurations and credentials for all services.
3.  **[3. Architecture & Coding Guidelines](./onboarding/3-architecture-guidelines.md)**: NestJS DDD/Clean Architecture separation, Use Case conventions, and Vanilla CSS BEM rules.
4.  **[4. Git Workflow & Deployment](./onboarding/4-git-workflow.md)**: Branch naming conventions, Conventional Commit standards, and Vercel preview environments.
5.  **[5. Payment Infrastructure](./onboarding/5-payment-infrastructure.md)**: Technical breakdown of our Paystack integration, split payouts, Dedicated Virtual Accounts, and webhook log retries.
6.  **[6. Database Maintenance & Scripts](./onboarding/6-database-maintenance-scripts.md)**: Guide on using and writing local operational scripts for database management.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Prerequisites](#4-prerequisites)
5. [Quick Start](#5-quick-start)
6. [Available Scripts](#6-available-scripts)
7. [Development Workflow](#7-development-workflow)
8. [Code Quality Tools](#8-code-quality-tools)
9. [Deployment Mapping](#9-deployment-mapping)

---

## 1. Project Overview

Upward is a B2C property management and payment tracking platform built for West African renters and landlords. It facilitates:
*   **Rent Passport™**: A shareable credit-like renter identity showing verified payment records.
*   **PayRent**: Secure payment processing with split bank transfers directly to landlords.
*   **Property Management Portal**: Tools for manager/landlord collaboration, unit setup, invoice logging, and reporting.

---

## 2. Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Clients** | React 19 / Next.js (15 & 16) / Vite | Modular client applications |
| **Backend API** | NestJS 11 + Fastify Adapter | Clean Architecture / DDD Monolith |
| **Database** | PostgreSQL + Prisma ORM | Split multi-file schema architecture |
| **Task Queues** | BullMQ + Redis | Background emails, cron jobs, and reminders |
| **Monorepo Router** | pnpm workspaces + Turborepo | Parallel build caching and task pipelines |

---

## 3. Repository Structure

Our monorepo isolates client apps, server apps, shared libraries, and common modules:

```
upward/
├── client/
│   ├── apps/
│   │   ├── admin-site/            # @upward/admin-site (Vite + React Admin Site)
│   │   ├── upward-pay/            # upward-pay (Next.js + Capacitor Tenant App)
│   │   ├── upward-pm/             # upward-pm (Next.js Property Manager Portal)
│   │   └── web/                   # @upward/web (Next.js Landing/Marketing Site)
│   └── libs/
│       ├── core/                  # @upward/client-core (Lightweight toast/utils)
│       └── shared/                # @upward/client-shared (Shared client states/sessions)
│
├── server/
│   ├── apps/
│   │   └── api/                   # @upward/api (NestJS Monolithic Server)
│   └── libs/
│       └── core/                  # @upward/server-core (Shared server logic placeholders)
│
├── common/
│   ├── shared-types/              # @upward/shared-types (Shared interfaces and DTOs)
│   └── utils/                     # @upward/common-utils (Shared pure JS utilities)
│
├── onboarding/                    # Developer onboarding documentation
│   ├── 1-getting-started.md
│   ├── 2-environment-variables.md
│   ├── 3-architecture-guidelines.md
│   ├── 4-git-workflow.md
│   ├── 5-payment-infrastructure.md
│   └── 6-database-maintenance-scripts.md
│
├── eslint.config.mjs              # Monorepo ESLint Flat Config
├── turbo.json                     # Turborepo task runner configuration
└── pnpm-workspace.yaml            # pnpm workspace packages configuration
```

---

## 4. Prerequisites

*   **Node.js**: `20.x` or later (LTS)
*   **pnpm**: `10.x` or later (`npm install -g pnpm`)
*   **PostgreSQL**: `15` or later
*   **Redis**: `7` or later (required for async jobs and queues)

---

## 5. Quick Start

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```
2.  **Setup environment variables**:
    Refer to [2. Environment Variables](./onboarding/2-environment-variables.md) for details on where to copy `.env` files.
3.  **Apply database migrations**:
    ```bash
    pnpm --filter @upward/api db:seed
    ```
4.  **Run in development**:
    ```bash
    # Run all apps in parallel
    pnpm dev
    ```

---

## 6. Available Scripts

Top-level scripts use Turborepo to run commands across all packages:

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Run all applications concurrently in hot-reload mode. |
| `pnpm build` | Compile all workspaces for production. |
| `pnpm lint` | Run ESLint checks across all directories. |
| `pnpm type-check` | Validate TypeScript types without outputting files. |
| `pnpm format` | Run Prettier code formatting on the codebase. |

---

## 7. Development Workflow

### Branch Rules
*   **`dev`**: Integration branch. PRs must target `dev` to compile preview builds on Vercel (`https://upward-web.vercel.app`).
*   **`production`**: Production release branch. Pushes here are deployed to live production (`https://upward.goodtenants.io`).

### Commit message format
All commits are checked by git hooks and must match Conventional Commit patterns:
`feat(auth): login integration`, `fix(payments): subaccount split override`.

For details, read [4. Git Workflow & Deployment](./onboarding/4-git-workflow.md).

---

## 8. Code Quality Tools

*   **ESLint**: Configured globally via `eslint.config.mjs`.
*   **Husky & lint-staged**: Runs pre-commit validation to format code and ensure syntax compilation before commit completion.
*   **commitlint**: Rejects commits that do not match conventional standards.

---

## 9. Deployment Mapping

| Application | Environment | Branch | Live URL |
| :--- | :--- | :--- | :--- |
| **All Web Clients** | Staging | `dev` | [https://upward-web.vercel.app](https://upward-web.vercel.app) |
| **All Web Clients** | Production | `production` | [https://upward.goodtenants.io](https://upward.goodtenants.io) |
| **NestJS Backend** | Staging / Prod | — | Managed on AWS EC2 (CD deployment pipelines) |
