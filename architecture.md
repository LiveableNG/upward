# Upward Pay — Architecture Document

---

## 1. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend (App) | Next.js (PWA) + Capacitor | Single codebase ships to iOS, Android, and Web |
| Backend | Node.js + Express (existing landlord-api pattern) | Consistent with current infra |
| Database | PostgreSQL | JSONB support, indexing, existing pattern |
| Payments | Paystack | Existing integration, virtual accounts, split settlement |
| Email | Existing provider (Resend/Sendgrid) | Outbox pattern layered on top |
| Push Notifications | Firebase Cloud Messaging (FCM) | iOS + Android coverage |
| File Storage | S3-compatible (existing) | Receipts, contracts |
| Job Scheduling | Node-cron (in-process) | No new infra for retries and reminders |

---

## 2. Identifier & Encryption Strategy

Every table follows this pattern exactly, consistent with landlord-api.

### Dual ID on Every Table

```
id        BIGSERIAL PRIMARY KEY          -- internal FKs, joins, indexing
uuid      UUID DEFAULT gen_random_uuid() -- exposed in all URLs, API responses, links
```

The API resolves `uuid` at the entry point of each request, then uses `id` for everything internal. UUIDs are never guessable. Integer IDs never leave the backend.

### PPI Encryption + Blind Index

Columns that carry Personally Identifiable Information (`email`, `phone`, `full_name`, `bvn`, `address`) are stored encrypted. A deterministic SHA-256 hash of the normalized value sits beside it for fast lookup.

```
email           TEXT   -- AES-256-GCM encrypted value
email_hash      TEXT   -- SHA-256(lowercase(trim(email))), indexed
phone           TEXT   -- encrypted
phone_hash      TEXT   -- SHA-256(e164_normalized(phone)), indexed
full_name       TEXT   -- encrypted
```

Login/search flow: hash the incoming value in Node.js → `WHERE email_hash = $1` → retrieve row → decrypt → verify match. No full-table decrypt ever runs.

### Denormalized Analytics IDs

Every transaction-level table carries redundant IDs even when they could be derived via join. This is deliberate: future analytics queries become single-table `WHERE` filters.

---

## 3. Database Tables

### `tenants`

The core user record for every tenant in the system, whether they signed up or not.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
email               TEXT NOT NULL                      -- encrypted
email_hash          TEXT NOT NULL                      -- SHA-256, UNIQUE, indexed
phone               TEXT                               -- encrypted
phone_hash          TEXT                               -- SHA-256, indexed
full_name           TEXT                               -- encrypted
signup_status       TEXT NOT NULL DEFAULT 'not_signed_up'
                    -- ENUM: 'not_signed_up' | 'web_only' | 'app_installed'
                    -- tracks the 3 tenant scenarios from spec
verified_at         TIMESTAMPTZ
last_login_at       TIMESTAMPTZ
fcm_token           TEXT                               -- push notification device token
fcm_token_updated_at TIMESTAMPTZ
password_hash       TEXT                               -- bcrypt
magic_link_token    TEXT                               -- for post-payment sign-up flow
magic_link_expires_at TIMESTAMPTZ
invited_by_company_id BIGINT REFERENCES companies(id) -- NULL if self-signup
invited_at          TIMESTAMPTZ
onboarding_step     TEXT DEFAULT 'pending'
                    -- ENUM: 'pending' | 'email_verified' | 'profile_complete'
preferences         JSONB DEFAULT '{}'
                    -- absorbs savings goals, notification prefs, future planner data
metadata            JSONB DEFAULT '{}'
                    -- rent anniversary, current property info, etc.
consent_accepted_at TIMESTAMPTZ                        -- T&C acceptance record
consent_ip          TEXT
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

**Why `signup_status` tracks 3 states:** The product spec explicitly requires tracking whether a tenant has not signed up, signed up on web only, or installed the app. These states drive which notification channel is used (email vs push), which UI variant appears on the payment link, and future analytics on conversion.

---

### `tenant_auth_sessions`

Tracks all active sessions. Allows multi-device logout and device management.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
tenant_id           BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
refresh_token_hash  TEXT NOT NULL                  -- SHA-256 of the actual token
platform            TEXT NOT NULL                  -- ENUM: 'web' | 'ios' | 'android'
device_label        TEXT                           -- "iPhone 14", "Chrome on Mac"
fcm_token           TEXT                           -- per-session device push token
ip_address          TEXT
user_agent          TEXT
is_revoked          BOOLEAN DEFAULT FALSE
last_used_at        TIMESTAMPTZ
expires_at          TIMESTAMPTZ NOT NULL
created_at          TIMESTAMPTZ DEFAULT NOW()
```

**Auth flow:**
1. Tenant logs in → Node.js issues JWT (short-lived, 15m) + opaque refresh token (7d).
2. Refresh token is hashed and stored here. The raw token goes to the client only.
3. On each refresh: hash incoming token → `WHERE refresh_token_hash = $1 AND is_revoked = FALSE AND expires_at > NOW()`.
4. Platform column ensures the FCM token is associated with the right device.

---

### `tenant_email_verifications`

```sql
id                  BIGSERIAL PRIMARY KEY
tenant_id           BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
token_hash          TEXT NOT NULL
purpose             TEXT NOT NULL  -- ENUM: 'signup' | 'magic_link' | 'password_reset'
expires_at          TIMESTAMPTZ NOT NULL
used_at             TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `companies`

Property management companies. Maps to existing landlord-api company records.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
name                TEXT NOT NULL
logo_url            TEXT
email               TEXT                           -- encrypted, contact email
email_hash          TEXT
phone               TEXT                           -- encrypted
phone_hash          TEXT
paystack_subaccount_code TEXT                      -- for split settlement
settings            JSONB DEFAULT '{}'
                    -- default_split_accounts, invoice_branding, etc.
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `properties`

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
company_id          BIGINT NOT NULL REFERENCES companies(id)
name                TEXT NOT NULL
address             TEXT                           -- encrypted
address_hash        TEXT
metadata            JSONB DEFAULT '{}'
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `tenant_property_links`

Maps tenants to properties. A tenant may rent across multiple companies.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
tenant_id           BIGINT NOT NULL REFERENCES tenants(id)
property_id         BIGINT NOT NULL REFERENCES properties(id)
company_id          BIGINT NOT NULL REFERENCES companies(id)  -- denormalized
lease_start_date    DATE
lease_end_date      DATE
rent_anniversary_day INT                           -- 1-31, day of month rent is due
status              TEXT NOT NULL DEFAULT 'active'
                    -- ENUM: 'active' | 'past' | 'pending'
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `payment_requests`

A payment request created by a PM company for a tenant. This is the parent record.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
company_id          BIGINT NOT NULL REFERENCES companies(id)
property_id         BIGINT REFERENCES properties(id)
tenant_id           BIGINT REFERENCES tenants(id)
                    -- NULL if tenant not yet registered when request was created
tenant_email_hash   TEXT NOT NULL
                    -- always stored regardless of tenant registration state
                    -- used to match payment to tenant after they sign up
created_by_user_id  BIGINT                         -- PM staff who made the request
total_amount        BIGINT NOT NULL                -- kobo/lowest denomination
currency            TEXT NOT NULL DEFAULT 'NGN'
status              TEXT NOT NULL DEFAULT 'pending'
                    -- ENUM: 'pending' | 'partially_paid' | 'paid' | 'expired' | 'cancelled'
payment_link_token  TEXT UNIQUE NOT NULL           -- opaque token in the URL
payment_link_expires_at TIMESTAMPTZ
invoice_number      TEXT
notes               TEXT
metadata            JSONB DEFAULT '{}'
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `payment_line_items`

Child records of a payment request. Each line item can settle to a different account.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
payment_request_id  BIGINT NOT NULL REFERENCES payment_requests(id)
company_id          BIGINT NOT NULL REFERENCES companies(id)  -- denormalized
tenant_id           BIGINT REFERENCES tenants(id)             -- denormalized
property_id         BIGINT REFERENCES properties(id)          -- denormalized
label               TEXT NOT NULL
                    -- e.g. 'Rent', 'Caution Deposit', 'Agency Fee', 'Legal Fee'
category            TEXT NOT NULL
                    -- ENUM: 'rent' | 'caution' | 'agency' | 'legal' | 'management' | 'repair' | 'other'
amount              BIGINT NOT NULL
settlement_subaccount TEXT
                    -- Paystack subaccount code for this specific line item
                    -- NULL means settles to company default
created_at          TIMESTAMPTZ DEFAULT NOW()
```

**Future impact:** When composite payments and multi-split settlement are activated, this structure already exists. The payment processor just reads the `settlement_subaccount` per line item to build the split charge.

---

### `payment_transactions`

The actual money movement record. One `payment_request` can have multiple transactions (partial payments, retries).

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
payment_request_id  BIGINT NOT NULL REFERENCES payment_requests(id)
tenant_id           BIGINT REFERENCES tenants(id)              -- denormalized, may be NULL pre-signup
company_id          BIGINT NOT NULL REFERENCES companies(id)   -- denormalized
property_id         BIGINT REFERENCES properties(id)           -- denormalized
amount              BIGINT NOT NULL
currency            TEXT NOT NULL DEFAULT 'NGN'
paystack_reference  TEXT UNIQUE
paystack_status     TEXT
                    -- ENUM: 'pending' | 'success' | 'failed' | 'abandoned'
channel             TEXT
                    -- e.g. 'card', 'bank_transfer', 'ussd'
paid_at             TIMESTAMPTZ
receipt_url         TEXT
receipt_generated_at TIMESTAMPTZ
status              TEXT NOT NULL DEFAULT 'pending'
                    -- ENUM: 'pending' | 'success' | 'failed' | 'refunded' | 'disputed'
                    -- 'disputed' is future but adding now avoids an ALTER TABLE later
metadata            JSONB DEFAULT '{}'
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `virtual_accounts`

Paystack-assigned virtual accounts linked to a payment request or tenant.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
payment_request_id  BIGINT REFERENCES payment_requests(id)
tenant_id           BIGINT REFERENCES tenants(id)
company_id          BIGINT REFERENCES companies(id)
account_number      TEXT
bank_name           TEXT
account_name        TEXT
paystack_dva_id     TEXT
expires_at          TIMESTAMPTZ
is_active           BOOLEAN DEFAULT TRUE
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `payment_methods`

Stored payment tokens for future auto-debit / recovery agreements.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
tenant_id           BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
paystack_authorization_code TEXT NOT NULL          -- reusable charge token
card_type           TEXT
last4               TEXT
bank                TEXT
channel             TEXT                           -- 'card' | 'bank_transfer'
is_default          BOOLEAN DEFAULT FALSE
is_active           BOOLEAN DEFAULT TRUE
created_at          TIMESTAMPTZ DEFAULT NOW()
```

**Future impact:** Recovery agreements and auto-debit mandates reference a row here rather than re-collecting card details.

---

### `invitations`

Tracks every tenant invitation sent by a PM company.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
company_id          BIGINT NOT NULL REFERENCES companies(id)
property_id         BIGINT REFERENCES properties(id)
tenant_email_hash   TEXT NOT NULL                  -- SHA-256, searchable without decrypting
tenant_email        TEXT NOT NULL                  -- encrypted
tenant_phone        TEXT                           -- encrypted
tenant_name         TEXT                           -- encrypted
tenant_id           BIGINT REFERENCES tenants(id) -- populated once they register
status              TEXT NOT NULL DEFAULT 'sent'
                    -- ENUM: 'sent' | 'opened' | 'registered_web' | 'registered_app' | 'payment_made'
reminder_count      INT DEFAULT 0                  -- how many reminder emails sent
last_reminder_at    TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

**How the 3 signup scenarios are tracked:** This table captures intent. When a tenant registers on web, `status = 'registered_web'` and `tenants.signup_status = 'web_only'`. When they install and open the app, a background call flips `tenants.signup_status = 'app_installed'` and this record gets updated. Tenants who never register remain here with `status = 'sent'` — fully queryable without them ever existing in `tenants`.

---

### `documents`

Contracts and receipts attached to payment requests or transactions.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
company_id          BIGINT NOT NULL REFERENCES companies(id)
tenant_id           BIGINT REFERENCES tenants(id)
property_id         BIGINT REFERENCES properties(id)
payment_request_id  BIGINT REFERENCES payment_requests(id)
payment_transaction_id BIGINT REFERENCES payment_transactions(id)
type                TEXT NOT NULL
                    -- ENUM: 'receipt' | 'contract' | 'invoice'
file_url            TEXT NOT NULL
file_name           TEXT
file_size_bytes     INT
generated_at        TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `notifications`

Push notifications queue and delivery log.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
tenant_id           BIGINT REFERENCES tenants(id)
company_id          BIGINT REFERENCES companies(id)              -- denormalized
payment_request_id  BIGINT REFERENCES payment_requests(id)      -- denormalized
channel             TEXT NOT NULL  -- ENUM: 'push' | 'in_app'
title               TEXT NOT NULL
body                TEXT NOT NULL
data                JSONB DEFAULT '{}'              -- deep link params, etc.
status              TEXT NOT NULL DEFAULT 'pending'
                    -- ENUM: 'pending' | 'sent' | 'failed'
provider_message_id TEXT
sent_at             TIMESTAMPTZ
failed_reason       TEXT
retry_count         INT DEFAULT 0
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `email_logs`

Outbox pattern. Every outbound email is written here before calling the provider.

```sql
id                  BIGSERIAL PRIMARY KEY
uuid                UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
recipient_email     TEXT NOT NULL                  -- encrypted
recipient_email_hash TEXT NOT NULL                 -- SHA-256, indexed
recipient_tenant_id BIGINT REFERENCES tenants(id)
company_id          BIGINT REFERENCES companies(id)  -- denormalized
payment_request_id  BIGINT REFERENCES payment_requests(id)  -- denormalized
template_key        TEXT NOT NULL
                    -- e.g. 'invitation_1' | 'payment_request' | 'payment_received' | 'reminder_2'
subject             TEXT NOT NULL
html_body           TEXT NOT NULL                  -- full rendered HTML stored
metadata            JSONB DEFAULT '{}'             -- template variables used to render
status              TEXT NOT NULL DEFAULT 'pending'
                    -- ENUM: 'pending' | 'sent' | 'failed' | 'bounced'
provider_message_id TEXT
sent_at             TIMESTAMPTZ
failed_reason       TEXT
retry_count         INT DEFAULT 0
last_retry_at       TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
```

**Resend on failure:** A cron job (or a manual POST to `/admin/email/retry`) queries `WHERE status = 'failed' AND retry_count < 3` and re-dispatches. The `html_body` is already rendered and stored, so the retry is a simple re-send — no template re-render required. This also gives a full audit trail of every email ever sent.

---

## 4. Auth Flow (Step by Step)

### 4A. Invitation → First Payment (No Prior Account)

```
PM creates payment_request
  → tenant_email_hash stored on request
  → invitation record created
  → email_log record inserted (status: pending)
  → email dispatched to tenant (payment link URL contains payment_link_token)
  → email_log updated (status: sent)

Tenant clicks payment link
  → backend resolves payment_request via payment_link_token
  → checks: WHERE email_hash = tenant_email_hash AND signup_status != 'not_signed_up'
  → tenant not found or not signed in → render guest payment page

Tenant pays via Paystack (guest)
  → payment_transaction created
  → payment_request.status = 'paid'
  → receipt generated and stored in documents
  → magic_link_token generated, hashed, stored on tenants (or new tenant record created)
  → magic link email sent (email_log created)
  → frontend redirects to /signup?token=<magic_link>&email=<prefilled>

Tenant clicks magic link
  → backend validates: SELECT * FROM tenant_email_verifications
    WHERE token_hash = SHA256(incoming) AND purpose = 'magic_link' AND used_at IS NULL AND expires_at > NOW()
  → marks token used
  → issues JWT + refresh token
  → refresh token hashed → inserted into tenant_auth_sessions
  → tenant lands in dashboard with payment history already visible
```

### 4B. Existing Tenant, App Installed

```
PM creates payment_request
  → email_log created → email sent
  → notification record created (channel: push)
  → FCM dispatched using tenant.fcm_token

Tenant opens push notification
  → deep link: upwardpay://payment/<payment_link_token>
  → Capacitor intercepts → app opens to payment screen
  → JWT validated (or refresh token used to renew)
  → payment confirmation screen loads with company logo and invoice
```

### 4C. Standard Login (Returning Tenant)

```
POST /auth/login { email, password }
  → hash email → WHERE email_hash = $1
  → decrypt email, verify match
  → bcrypt.compare(password, tenants.password_hash)
  → on success: issue JWT (15m) + refresh token (7d)
  → INSERT INTO tenant_auth_sessions (refresh_token_hash, platform, device_label, ...)
  → return { access_token, refresh_token }

POST /auth/refresh { refresh_token }
  → hash token → WHERE refresh_token_hash = $1 AND is_revoked = FALSE AND expires_at > NOW()
  → issue new JWT
  → optionally rotate refresh token (update row)

POST /auth/logout
  → UPDATE tenant_auth_sessions SET is_revoked = TRUE WHERE refresh_token_hash = $1
```

---

## 5. Payment Link Resolution Logic

```
GET /pay/:payment_link_token

1. SELECT * FROM payment_requests WHERE payment_link_token = $1
2. Check expires_at — return 410 if expired
3. Check status — return appropriate state if already paid
4. Read Authorization header (optional JWT)
5. Determine render variant:
   a. No JWT → guest mode
      - show payment form with company logo and invoice breakdown
      - show "benefits of Upward" banner
      - Paystack inline checkout
   b. JWT valid, tenant.signup_status = 'web_only' → web dashboard payment view
      - prompt to download app
   c. JWT valid, tenant.signup_status = 'app_installed' → redirect to deep link
      - upwardpay://payment/:token
6. After successful payment in guest mode:
   - create/update tenant record
   - create magic_link_token, send email
   - show receipt + "Save your receipts, sign up" prompt
```

---

## 6. Invitation Reminder Flow

Three reminder emails per uninvited or non-registering tenant.

```
Cron: runs daily at 08:00

SELECT i.*
FROM invitations i
WHERE i.status IN ('sent', 'opened')
  AND i.reminder_count < 3
  AND i.last_reminder_at < NOW() - INTERVAL '3 days'
  OR (i.reminder_count = 0 AND i.created_at < NOW() - INTERVAL '1 day')

For each record:
  - render reminder email (reminder_1 | reminder_2 | reminder_3 template)
  - INSERT INTO email_logs
  - dispatch email
  - UPDATE invitations SET reminder_count = reminder_count + 1, last_reminder_at = NOW()
```

Each of the 3 emails has a different `template_key` with different benefit messaging, increasing urgency.

---

## 7. Notification Strategy by Tenant State

| Tenant State | Channel Used | Fallback |
|---|---|---|
| `not_signed_up` | Email only | None |
| `web_only` | Email + in-app on next login | None |
| `app_installed` | Push (FCM) + Email | Email if FCM fails |

Push failure detection: if FCM returns a `UNREGISTERED` error, set `tenants.fcm_token = NULL` and fall back to email. Log the failed push in `notifications`.

---

## 8. Receipt & Document Generation

```
On payment_transaction.status → 'success':

1. Compile receipt data:
   - company name, logo from companies
   - line items from payment_line_items
   - tenant name (decrypt)
   - transaction reference, date
   - "Powered by Upward" footer

2. Generate PDF (existing PDF infrastructure)
3. Upload to S3-compatible storage
4. INSERT INTO documents (type: 'receipt', file_url, ...)
5. Link receipt_url back to payment_transactions row
6. Send receipt email (INSERT INTO email_logs → dispatch)
7. Send push notification if app_installed
```

Receipts are always tied to both `payment_request_id` and `payment_transaction_id` in the documents table, so the tenant's document history view is a simple:
```sql
SELECT * FROM documents WHERE tenant_id = $1 ORDER BY created_at DESC
```

---

## 9. Future-Readiness Notes

**Composite payments & multi-split:** `payment_line_items` already models this. The Paystack charge call will iterate `line_items` to build the split array. No schema change needed.

**Auto-debit / Recovery agreements:** `payment_methods` stores the reusable authorization code today. A future `mandates` table references a `payment_method_id` and drives scheduled charges via the existing cron infrastructure.

**Dispute handling:** `payment_transactions.status` includes `'disputed'` already. A future `disputes` table references `payment_transaction_id`. No status column migration needed.

**Savings planner / AI goals:** `tenants.preferences JSONB` absorbs all initial survey data (income, target home, timeline) without schema changes. Once it grows, a dedicated `savings_goals` table is extracted from the JSONB data with a clear migration path.

**Listing view:** Apartment data lives in `properties`. A public-facing index query with limited fields (`name`, `address`, basic metadata) can be served from the same table with a strict column whitelist. No schema change needed.

**Analytics dashboards:** Because `company_id`, `tenant_id`, `property_id`, and `payment_request_id` are all carried on `payment_transactions`, "total revenue for company X in March" is:
```sql
SELECT SUM(amount) FROM payment_transactions
WHERE company_id = X AND paid_at BETWEEN '2025-03-01' AND '2025-03-31'
  AND status = 'success'
```
No joins.

---

## 10. Deep Link & PWA / Capacitor Routing

The payment link URL format:
```
https://pay.upward.ng/pay/:payment_link_token
```

On mobile with the app installed, Capacitor's Universal Links (iOS) / App Links (Android) intercepts this URL and routes it to the in-app payment screen. If the app is not installed, the web fallback handles the guest flow normally.

The `platform` column in `tenant_auth_sessions` tells the backend which device is active, so it can decide whether to show the "download the app" prompt on the web session.

---

## 11. Key Indexes

```sql
CREATE UNIQUE INDEX ON tenants (email_hash);
CREATE INDEX ON tenants (phone_hash);
CREATE INDEX ON tenants (signup_status);
CREATE INDEX ON tenant_auth_sessions (refresh_token_hash) WHERE is_revoked = FALSE;
CREATE INDEX ON payment_requests (payment_link_token);
CREATE INDEX ON payment_requests (tenant_email_hash);
CREATE INDEX ON payment_requests (company_id, status);
CREATE INDEX ON payment_transactions (company_id, status, paid_at);
CREATE INDEX ON payment_transactions (tenant_id);
CREATE INDEX ON email_logs (recipient_email_hash);
CREATE INDEX ON email_logs (status) WHERE status = 'failed';
CREATE INDEX ON invitations (tenant_email_hash);
CREATE INDEX ON invitations (status, reminder_count, last_reminder_at);
```