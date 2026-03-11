# Upward by GoodTenants — System Architecture Overview

## 1. Guiding Principles

- Frontend and backend are **fully decoupled** (separate repos/deployments, separate logs)
- Backend is a **modular monolith first** — split into microservices only if usage demands it
- All async work (emails, WhatsApp, scoring, invoices) runs **off the request cycle via queues**
- Email is always sent via **Mailgun** — triggered by internal events, not third-party automation SaaS

---

## 2. High-Level Architecture

```
Users
  │
  ▼
Cloudflare (CDN + WAF + DDoS protection)
  │
  ├──▶ Next.js Frontend
  │
  └──▶ NestJS API (Fastify adapter)
            │
            ├── PostgreSQL (primary database)
            ├── Redis (cache + queue broker)
            ├── BullMQ workers (async jobs)
            ├── Cloudinary (images / media uploads)
            └── AWS S3 (documents / contracts)
            │
            ▼
      External Services
            ├── Paystack (payments)
            ├── Mono (bank verification)
            ├── Mailgun (all transactional email — event-driven)
            ├── Twilio / Meta WhatsApp API
            ├── PostHog (product analytics)
            └── Bugsnag (error monitoring)
```

---

## 3. Frontend

| Item                      | Choice                                                     |
| ------------------------- | ---------------------------------------------------------- |
| **Framework**             | Next.js (App Router, SSR)                                  |
| **Language**              | TypeScript                                                 |
| **Styling**               | Tailwind CSS                                               |
| **State / data fetching** | TanStack Query                                             |
| **Validation**            | Zod                                                        |
| **Analytics**             | PostHog (client-side events) + Google Analytics (Sprint 1) |
| **Mobile wrapper**        | Capacitor (iOS + Android from the same Next.js codebase)   |

**Responsibilities:** Landing page, signup flow, rent payment UI, tenant dashboard, Rent Passport viewer, referral/share tools, file uploads (direct to Cloudinary or S3 via presigned URLs).

---

## 4. Backend API

| Item          | Choice                        |
| ------------- | ----------------------------- |
| **Framework** | NestJS + Fastify adapter      |
| **Language**  | TypeScript                    |
| **ORM**       | Prisma                        |
| **Database**  | PostgreSQL                    |
| **Auth**      | JWT (access + refresh tokens) |
| **Deploy**    | AWS EC2 (Docker container)    |

**Existing backend** (`uploader.goodtenants.io`) — reuse or proxy through this API where applicable (file upload service already confirmed at `UPLOADER_SERVICE_URL`).

### Module Structure

```
src/
├── auth/
├── users/
├── tenants/
├── landlords/
├── properties/
├── leases/
├── rent-payments/
├── contracts/
├── rent-score/
├── referrals/
├── notifications/
├── newsletters/
└── integrations/
    ├── paystack/
    ├── mono/
    ├── mailgun/
    ├── whatsapp/
    ├── cloudinary/
    └── s3/
```

Each module contains: `controller · service · dto · entity · repository`

**Shared types:** DTOs and entity interfaces live in `packages/shared-types` and are consumed by both the backend and the Next.js frontend — no duplication.

### Routing

Routes are split across **dedicated route files** per concern, mirroring the existing backend's `routes/` folder pattern:

| File                 | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `routes/api.ts`      | All REST API routes (versioned under `/api/v1/`) |
| `routes/webhooks.ts` | Paystack, WhatsApp, and other inbound webhooks   |
| `routes/health.ts`   | Health check + readiness endpoints               |

---

## 5. Async Job Processing

The existing Laravel backend uses **Laravel queued jobs (`ShouldQueue`)** dispatched by services, then processed by `queue:work --tries=3 --stop-when-empty` which runs every minute via the **scheduler (cron)**. There is no standalone persistent queue worker — the scheduler polls and drains the queue. Upward's NestJS backend will follow the same pattern using BullMQ.

**How it works:**

```
Service/Controller
  → dispatches a Job class to the queue
  → Redis stores the job
  → BullMQ worker (scheduled via @nestjs/schedule cron) picks it up
  → Job executes: sends email via Mailgun, fires WhatsApp, computes score, etc.
```

| Queue        | Job classes                                                                    | Trigger                                     |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------- |
| `email`      | `SendVerificationEmailJob`, `SendReceiptEmailJob`, `SendOnboardingSequenceJob` | Internal events (signup, payment confirmed) |
| `whatsapp`   | `SendWhatsAppReminderJob`, `SendPassportShareJob`                              | Payment events, user action                 |
| `scoring`    | `ComputeRentScoreJob`                                                          | After rent payment recorded                 |
| `payments`   | `GenerateInvoiceJob`, `ReconcilePaymentJob`                                    | Paystack webhook received                   |
| `newsletter` | `DispatchNewsletterJob`, `ScheduledSequenceJob`                                | Cron: every Tuesday morning                 |

**Stack on EC2:** Redis (queue broker) + BullMQ + `@nestjs/bull` + `@nestjs/schedule` (cron) + PM2 (process manager, restarts on crash)

---

## 6. Database Schema (Core Tables)

Table names use the `upward_` prefix,

```
upward_users · upward_tenants · upward_landlords · upward_properties · upward_units
upward_leases · upward_rent_payments · upward_contracts
upward_payment_requests · upward_payment_receipts
upward_rent_scores · upward_notifications · upward_referrals · upward_newsletter_subscribers
```

---

## 7. File Storage

The existing backend uses **two providers** selected at upload time via a `provider` query param. Upward will follow the same pattern:

| Provider       | Used For                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Cloudinary** | Images, profile photos, media uploads (active — `cloudinary()->upload()` + `->destroy()`) |
| **AWS S3**     | Documents, contracts, receipts, ID files (`liveablemedia` bucket, `eu-west-1`)            |

**Upload flow (media):** Frontend → API → Cloudinary SDK upload → store Cloudinary URL in DB  
**Upload flow (documents):** Frontend → presigned URL from API → direct upload to S3 → API stores S3 key in DB  
**Detection logic:** File model checks if `cloudinary` appears in the filename to determine which provider to hit for deletion.

---

## 8. Search

No dedicated search engine — the existing backend uses **SQL `LIKE` queries** against the database. Upward will follow the same approach initially.

| Approach                             | When                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------- |
| **PostgreSQL `LIKE` / `ILIKE`**      | Sprint 1–3 (simple name/address/phone lookups)                             |
| **PostgreSQL Full-Text Search**      | Sprint 4 (Rent Passport ID lookup — built into Postgres, zero extra infra) |
| **Meilisearch** _(optional, future)_ | Only if tenant-facing search needs typo-tolerance at scale                 |

---

## 9. Email (Mailgun — Event-Driven)

All emails go through **Mailgun** via the API or SMTP. There is no third-party automation SaaS (no Loops.so, no Resend). Emails are triggered by **internal application events** — a queue job fires, constructs the email, and dispatches it.

**Triggered emails include:** signup verification, rent receipts, payment invoices, onboarding sequence (6 weekly emails via BullMQ scheduled jobs), newsletter dispatches.

---

## 10. Third-Party Services

| Category              | Service                  | Purpose                                                                                   |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| **Payments**          | Paystack                 | Rent collection, invoices, receipts                                                       |
| **Bank Verification** | Mono                     | Tenant bank account verification                                                          |
| **Email**             | Mailgun                  | All transactional + sequence emails (event-driven via queues)                             |
| **WhatsApp**          | Twilio or Meta Cloud API | Reminders, passport sharing                                                               |
| **Media Storage**     | Cloudinary               | Images, profile photos, media                                                             |
| **Document Storage**  | AWS S3                   | Contracts, receipts, ID documents                                                         |
| **Analytics**         | PostHog                  | User events, funnel tracking (frontend + backend)                                         |
| **Error Monitoring**  | Bugsnag                  | Backend exceptions — already instrumented across the codebase                             |
| **Log Aggregation**   | Betterstack              | Centralised log tailing (frontend: Vercel logs, backend: EC2 logs shipped to Betterstack) |
| **CDN / Security**    | Cloudflare               | WAF, DDoS, global CDN                                                                     |
| **Social Share**      | Custom                   | Open Graph + preset captions for "Tell a Friend"                                          |

> **Google Analytics** — add to frontend from Sprint 1 as required.

---

## 11. Existing Integrations (from `.env` — carry forward)

| Key                          | Service                               | Usage                  |
| ---------------------------- | ------------------------------------- | ---------------------- |
| `AWS_*`                      | AWS S3 (`liveablemedia`, `eu-west-1`) | Document storage       |
| `CLOUDINARY_URL`             | Cloudinary                            | Image / media uploads  |
| `PAYSTACK_SECRET_KEY`        | Paystack                              | Payments               |
| `MONO_*`                     | Mono                                  | Bank verification      |
| `MAILGUN_API_KEY_GOODTENANT` | Mailgun                               | Primary email provider |
| `WHATSAPP_API_KEY`           | WhatsApp                              | Notifications          |
| `BUGSNAG_API_KEY`            | Bugsnag                               | Error monitoring       |
| `UPLOADER_SERVICE_URL`       | goodtenants.io uploader               | File uploads           |

> **Zoho omitted:** In the existing backend, Zoho is used to (1) sync tenant records into a Zoho CRM Deals pipeline via a `zoho:sync` scheduled command, and (2) as an email provider (SMTP/OAuth) for a small number of company level email configs. Neither use case applies to Upward — no Zoho dependency needed.

---

## 12. Monorepo Structure

```
upward-platform/
├── apps/
│   ├── frontend/        ← Next.js (web)
│   │   ├── ios/         ← Capacitor iOS native project (generated)
│   │   └── android/     ← Capacitor Android native project (generated)
│   └── backend/         ← NestJS + Fastify
├── packages/
│   ├── shared-types/    ← Prisma types + DTOs shared across apps
│   └── utils/
├── devops/               ← Dockerfile, nginx, EC2 setup, GitHub Actions
└── package.json         ← pnpm workspace root (Turborepo)
```

---

## 13. Mobile App (Capacitor)

The web frontend (Next.js) is wrapped into native iOS and Android apps using **Capacitor**. No separate mobile codebase — one codebase, three surfaces (web, iOS, Android).

---

## 14. Deployment

| Layer            | Platform                     | Notes                                        |
| ---------------- | ---------------------------- | -------------------------------------------- |
| **Frontend**     | Vercel or ???                | Automatic SSR + global CDN                   |
| **Backend API**  | AWS EC2                      | Docker container, PM2/Supervisor for workers |
| **Database**     | PostgreSQL on EC2 or AWS RDS | RDS preferred for managed backups            |
| **Redis**        | On EC2 or Upstash            | Queue broker + cache                         |
| **File Storage** | AWS S3 + Cloudinary          | Already provisioned                          |

**CI/CD:** GitHub Actions

- Frontend: Push → lint/test
- Backend: Push → lint/test → Docker build → SSH deploy to EC2
- Migrations: `prisma migrate deploy` runs before API starts

---

## 15. Sprint-to-Feature Mapping

| Sprint | Feature                                       | Key Tech                                |
| ------ | --------------------------------------------- | --------------------------------------- |
| 1      | Landing page, signup collection, social share | Next.js, PostHog, Google Analytics      |
| 2      | Newsletter + 6-week onboarding email series   | Mailgun + BullMQ scheduled jobs         |
| 3      | PayRent — record, request, invoice, receipt   | Paystack, Prisma, S3/Cloudinary, BullMQ |
| 4      | Rent Passport — score, search, share          | PostgreSQL FTS, Rent Score module, JWT  |
| 5      | Full web experience for PayRent + Passport    | Next.js additional routes               |
