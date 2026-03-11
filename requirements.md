A Github repo for the project under the liveable-ng
A Postgresql database server - DB Host / Port - DB Name - DB Username + Password
AWS ec2 instance for the backend server - AWS IAM Access Key ID + Secret Access Key (for deployments/CLI) - EC2 Key Pair `.pem` file (SSH access)
Deployment Platform AWS Amplify for the frontend server
Google analytics account - GA4 Measurement ID - Google account with Analytics admin access
MAILGUN - API Key - Mailgun Domain
File storage access - AWS IAM Access Key ID + Secret Access Key (scoped to S3 bucket) - S3 Bucket Name + Region - Bucket policy (public read for assets, private for rent contracts)
Phone no verification if needed - Account SID - Auth Token - Twilio Verify Service SID

Domain registrar login to modify subdomains like upward.goodtenants.io

Mobile app
Apple developer account - Apple ID + password (with 2FA device available) - Team ID - App-specific password (for CI/CD tools like Fastlane) - Provisioning profiles + Signing Certificates (`.p12` + password)
Google play developer account - Google account login - Play Console Service Account JSON key (for automated uploads via CI)

### 6. Mailgun (Transactional Email)

- **Access needed:**
  - Mailgun API Key (`key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
  - Mailgun Domain (e.g. `mg.goodtenants.io`)
  - Mailgun Webhook Signing Key (for delivery tracking)
- **DNS records to add:** MX, SPF, DKIM TXT records on domain registrar
- **Where used:** Sprint 1 waitlist confirmation; Sprint 2 newsletter + 6-week automated drip series

### 9. Domain Registrar (upward.goodtenants.io subdomain)

- **Access needed:** Login credentials for the domain registrar account (e.g. Namecheap, GoDaddy)
- **Actions required:**
  - Add CNAME/A record → AWS Amplify for frontend
  - Add CNAME/A record → EC2 Elastic IP for backend API
  - Add Mailgun DNS records (MX, SPF, DKIM)
- **Where used:** Live URL routing for all sprints

---

## Mobile App

### 10. Apple Developer Account

- **Access needed:**
  - Apple ID + password (with 2FA device available)
  - Team ID
  - App-specific password (for CI/CD tools like Fastlane)
  - Provisioning profiles + Signing Certificates (`.p12` + password)
- **Where used:** Sprint 4/5 iOS build & App Store submission

### 11. Google Play Developer Account

- **Access needed:**
  - Google account login
  - Play Console Service Account JSON key (for automated uploads via CI)
- **Where used:** Sprint 4/5 Android build & Play Store submission

---

## Sprint-Specific Service Keys

### Sprint 1 — Waitlist & Landing Page

| Service                        | Key / Credential Needed                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| Firebase (Firestore/Studio)    | Firebase Project API Key, Auth Domain, Project ID, Service Account JSON    |
| Google Analytics               | GA4 Measurement ID (`G-XXXXXXXXXX`)                                        |
| Mailgun                        | API Key + Domain (confirmation email on signup)                            |
| Social Share (preset captions) | No API key needed — plain Web Share API or hardcoded WhatsApp/Twitter URLs |

### Sprint 2 — Newsletter & Drip Email Automation

| Service                                        | Key / Credential Needed                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| Mailgun                                        | API Key + Domain + Webhook Signing Key                    |
| Newsletter CMS (optional, e.g. Ghost/Substack) | Admin API Key if self-hosted Ghost                        |
| Cron / Job Scheduler                           | NestJS Bull queue → Redis URL + Password (if using Redis) |

### Sprint 3 — PayRent (Mobile First)

| Service                                         | Key / Credential Needed                                        |
| ----------------------------------------------- | -------------------------------------------------------------- |
| Payment Gateway (e.g. Paystack or Flutterwave)  | Public Key + Secret Key + Webhook Secret                       |
| AWS S3                                          | Access Key ID + Secret + Bucket Name (rental contract uploads) |
| Twilio / Firebase                               | See §8 above (phone verification)                              |
| PDF Invoice Generator (e.g. Puppeteer / PDFKit) | No external key — runs on backend                              |

### Sprint 4 — Rent Passport

| Service              | Key / Credential Needed                                              |
| -------------------- | -------------------------------------------------------------------- |
| GoodTenant ID Search | Internal API — no third-party key (uses PostgreSQL full-text search) |
| WhatsApp Share       | No API key — uses `wa.me` deep link                                  |
| Email Share          | Mailgun API Key (see §6)                                             |
| Scoring Algorithm    | Internal — no external key                                           |

### Sprint 5 — Web for PayRent & Rent Passport

| Service          | Key / Credential Needed       |
| ---------------- | ----------------------------- |
| All of the above | Reuse keys from Sprints 3 & 4 |
| AWS Amplify      | See §4 above                  |

---

## Quick `.env` Template (Backend — NestJS)

```env
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=

# Mailgun
MAILGUN_API_KEY=
MAILGUN_DOMAIN=

# Firebase (if using phone auth / Firestore)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Twilio (alternative to Firebase for phone auth)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=

# Payment (Paystack or Flutterwave)
PAYMENT_PUBLIC_KEY=
PAYMENT_SECRET_KEY=
PAYMENT_WEBHOOK_SECRET=

# Redis (for job queues — Sprint 2+)
REDIS_URL=
REDIS_PASSWORD=

# Google Analytics (frontend .env)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```
