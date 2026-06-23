# 1. Getting Started Guide

Welcome to the **Upward** codebase! This guide will walk you through setting up your local environment and booting the apps.

---

## 1. Prerequisites

Before starting, ensure you have the following installed:

- **Node.js**: Version `20.x` or later (LTS recommended)
- **pnpm**: Version `10.x` or later (`npm install -g pnpm`)
- **Git**: Version `2.x` or later
- **PostgreSQL**: Version `15` or later
- **Redis**: Version `7` or later

> **Windows Users**: Run all `pnpm` commands inside **cmd.exe** or **Git Bash**. Do NOT use PowerShell to avoid execution policy conflicts.

---

## 2. Setup Database & Redis

1.  Start your local PostgreSQL instance and create a database called `upward_dev`.
2.  Start your local Redis server on port `6379`.

---

## 3. Clone and Install

```bash
# Clone the repository
git clone <repo-url> upward
cd upward

# Install all monorepo dependencies
pnpm install
```

`pnpm install` will automatically initialize Husky hooks (pre-commit checking).

---

## 4. Environment Configuration

Copy the example environment files in the respective folders:

```bash
# Server (NestJS monolith)
cp server/apps/api/.env.example server/apps/api/.env

# Client Apps
cp client/apps/web/.env.example client/apps/web/.env
cp client/apps/upward-pay/.env.example client/apps/upward-pay/.env
cp client/apps/upward-pm/.env.example client/apps/upward-pm/.env
cp client/apps/admin-site/.env.example client/apps/admin-site/.env
```

For a comprehensive guide on variables, check [2-environment-variables.md](./2-environment-variables.md).

---

## 5. Database Schema Generation

Upward uses split-schema files under `server/apps/api/prisma/schema/`. Generate the Prisma client and apply migrations:

```bash
# Run from repository root to target the server
pnpm --filter @upward/api db:seed
```

Or run directly inside the `server/apps/api` folder:

```bash
# Generate the multi-schema client
pnpm prisma:generate

# Run DB seeding
pnpm db:seed
```

---

## 6. Running the Applications

You can start the applications in parallel using Turborepo or target a specific application using filters.

### Running all apps at once (Parallel Dev mode)

```bash
pnpm dev
```

### Running individual applications

To run a specific app, use `pnpm --filter [package-name] dev`:

| Component / App         | Command                                | URL / Entrypoint               |
| :---------------------- | :------------------------------------- | :----------------------------- |
| **NestJS Backend**      | `pnpm --filter @upward/api dev`        | `http://localhost:4000/api/v1` |
| **Web (Landing)**       | `pnpm --filter @upward/web dev`        | `http://localhost:3000`        |
| **Upward Pay (Tenant)** | `pnpm --filter upward-pay dev`         | `http://localhost:3001`        |
| **Upward PM (Manager)** | `pnpm --filter upward-pm dev`          | `http://localhost:3002`        |
| **Admin Site (Vite)**   | `pnpm --filter @upward/admin-site dev` | `http://localhost:3003`        |

---

## 7. Running the Capacitor App on Android (`upward-pay`)

The tenant payment application (`upward-pay`) is wrapped with **Capacitor** to run on mobile platforms.

### Android Setup Steps

1.  **Prerequisites**: Ensure you have **Android Studio** and the **Android SDK** installed.
2.  **Generate Static Output & Sync**:
    To sync Next.js build assets into the Android native platform folder, run:
    ```bash
    pnpm --filter upward-pay cap:sync
    ```
3.  **Open Android Studio**:
    To launch Android Studio with the compiled workspace files preloaded:
    ```bash
    pnpm --filter upward-pay cap:open:android
    ```
4.  **Run on Device/Emulator**:
    Select your target emulator or physical USB device in Android Studio and press **Run**.

---

## 8. Next Steps

- Read [2-environment-variables.md](./2-environment-variables.md) to populate your credentials.
- Review [3-architecture-guidelines.md](./3-architecture-guidelines.md) to understand clean architecture, Use Case execution patterns, and our premium styling system.
