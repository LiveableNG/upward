# 2. Environment Variables

This document outlines all the environment variables used by the Upward backend and client applications.

---

## 1. Backend API (`server/apps/api/.env`)

These variables govern port binding, database connections, authentication, and external API integrations.

### Core Configuration
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `4000` | Port NestJS will bind to locally. |
| `NODE_ENV` | Yes | `development` | Core environment node: `development`, `test`, or `production`. |
| `FRONTEND_URL` | Yes | `http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003` | Comma-separated CORS whitelist origins for local/staging/prod client apps. |
| `PM_APP_URL` | Yes | `http://localhost:3002` (Local) / `https://upward-pm.vercel.app` (Prod) | URL of the Property Manager app. |
| `PAY_APP_URL` | Yes | `http://localhost:3001` (Local) / `https://upward-pay.vercel.app` (Prod) | URL of the Tenant Payment app. |
| `ADMIN_SITE_URL` | Yes | `http://localhost:3003` (Local) / `https://upward-admin.vercel.app` (Prod) | URL of the Admin Site app. |

### Database & Cache
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. **Naming convention**: For local/development environments we connect to the database named **`upward_dev`**. For production we connect to the database named **`upward`**. |
| `REDIS_URL` | Yes | — | Redis URL for BullMQ queue processing: `redis://localhost:6379`. |

### Security & Token Signing
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | Yes | `change-me-in-production` | Secret key used to sign access tokens. |
| `JWT_REFRESH_SECRET` | Yes | `change-me-refresh-in-production` | Secret key used to sign refresh tokens. |
| `JWT_EXPIRY` | No | `15m` | Lifetime of access JWTs. |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Lifetime of refresh JWTs. |
| `CRON_SECRET` | Yes | — | Security secret to authenticate automated task triggers / cron requests. |

### Encryption Configuration
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `ENCRYPTION_KEY` | Yes | — | Hex-encoded 256-bit key used for encrypting PII fields (like tenant names/phones). |
| `production_encryption_key` | No | — | Encryption key override used specifically in production. |
| `ENCRYPTION_IV_LENGTH` | Yes | `16` | Length of initialization vectors (IVs) used by crypto cipher. |

### Payment Processing (Paystack)
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `PAYSTACK_SECRET_KEY` | Yes | — | Paystack dashboard secret key used for checkout initialization, transfers, and verification. |

### Email, Notification, and File Upload APIs
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `MAILGUN_API_KEY` | Yes | — | Key for transactional Mailgun operations. |
| `MAILGUN_DOMAIN` | Yes | — | Verified Mailgun email sending domain (e.g. `mg.liveable.ng`). |
| `EMAIL_FROM` | Yes | — | Sender display header (e.g. `"Upward by GoodTenants <noreply@goodtenants.io>"`). |
| `WHATSAPP_API_KEY` | No | — | Direct API integration credentials for WhatsApp alerts. |
| `AWS_ACCESS_KEY_ID` | Yes | — | Amazon AWS identifier for S3 bucket file storage. |
| `AWS_SECRET_ACCESS_KEY`| Yes | — | Amazon AWS secret token. |
| `AWS_REGION` | Yes | `us-east-1` | S3 bucket hosting region. |
| `AWS_S3_BUCKET` / `AWS_BUCKET_NAME`| Yes | `upward-stories-storage-2025` | S3 file bucket name. |

### Firebase Cloud Messaging (FCM) push notifications
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `FCM_PROJECT_ID` | Yes | `upward-by-gt` | Firebase project identifier. |
| `FCM_CLIENT_EMAIL` | Yes | — | Service Account email associated with the Firebase project. |
| `FCM_PRIVATE_KEY` | Yes | — | Multi-line private key certificate for authenticating server calls. |

### Verification Settings
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `CREDIT_CHEK_TEST` | Yes | `true` | Bypasses actual CreditChek API calls using static mock testing parameters. |

---

## 2. Frontend Applications (`client/apps/*/.env`)

The Next.js/Vite frontend apps share standard naming variables. All variables prefixed with `NEXT_PUBLIC_` are exposed to client-side code bundles.

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:4000/api/v1`| Base gateway address of the NestJS server. |
| `NEXT_PUBLIC_POSTHOG_KEY`| No | — | Posthog product analytics registration key. |
| `NEXT_PUBLIC_POSTHOG_HOST`| No | — | Posthog analytics ingestion server. |
| `NEXT_PUBLIC_GA_ID` | No | — | Google Analytics tracker configuration ID. |

---

## 3. Best Practices
1.  **Never commit raw `.env` files** to version control. They are git-ignored.
2.  If adding a new variable, update the corresponding `.env.example` file in the same directory so others know it is required.
