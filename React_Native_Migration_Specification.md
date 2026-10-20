# Upward Pay — React Native Migration Specification

> **Target Audience**: Mobile Engineering Team (React Native / Expo)  
> **Source Application**: `upward-pay` (Next.js 16 + React 19 + Capacitor 8)  
> **Backend Architecture**: NestJS 11 Clean Architecture / DDD Monolith (`@upward/api`)  
> **Base API URL**: `https://upward-api.vercel.app/api/v1` (Production) / `http://localhost:4000/api/v1` (Dev)

---

## Table of Contents

1. [Executive Summary & Migration Goals](#1-executive-summary--migration-goals)
2. [Recommended React Native Tech Stack](#2-recommended-react-native-tech-stack)
3. [Global Network & Authentication Architecture](#3-global-network--authentication-architecture)
4. [Native Device Capabilities & Services](#4-native-device-capabilities--services)
5. [Complete Application Navigation Map](#5-complete-application-navigation-map)
6. [Detailed Screen & Flow Specifications](#6-detailed-screen--flow-specifications)
   - [6.1 Auth & Onboarding Flow](#61-auth--onboarding-flow)
   - [6.2 Profile Setup Wizard (Onboarding Blocker)](#62-profile-setup-wizard-onboarding-blocker)
   - [6.3 Dashboard & Rent Passport™](#63-dashboard--rent-passport)
   - [6.4 PayRent™ & Unified Checkout Flow](#64-payrent--unified-checkout-flow)
   - [6.5 Rent Deposit Balance](#65-rent-deposit-balance)
   - [6.6 Transactions & Verified Receipts](#66-transactions--verified-receipts)
   - [6.7 My Home (Estate & Tenancy Management)](#67-my-home-estate--tenancy-management)
   - [6.8 Tenancy Contracts & Documents](#68-tenancy-contracts--documents)
   - [6.9 Savings Goals & Rent Wallet](#69-savings-goals--rent-wallet)
   - [6.10 Upward Benefits & Rent Support Insurance](#610-upward-benefits--rent-support-insurance)
   - [6.11 Alliance Exclusive Rental Marketplace](#611-alliance-exclusive-rental-marketplace)
   - [6.12 Past Rent Record Requests](#612-past-rent-record-requests)
   - [6.13 Notifications & Announcements](#613-notifications--announcements)
   - [6.14 User Profile, Banking & Account Settings](#614-user-profile-banking--account-settings)
   - [6.15 Close / Delete Account Flow](#615-close--delete-account-flow)
   - [6.16 Help, FAQs & Support Tickets](#616-help-faqs--support-tickets)
   - [6.17 Public & Deep-Link Screens](#617-public--deep-link-screens)
7. [Master API Endpoint Reference](#7-master-api-endpoint-reference)
8. [Critical Mobile Migration Pitfalls & Implementation Guidelines](#8-critical-mobile-migration-pitfalls--implementation-guidelines)

---

## 1. Executive Summary & Migration Goals

The goal of this project is to replace the hybrid Capacitor/WebView client of **Upward Pay** with a **100% native React Native application** (powered by Expo).

### Key Business Goals
1. **Zero-Lag Performance**: Eliminate touch delays, web hydration penalties, and WebView frame drops on entry-to-mid-range Android smartphones (Tecno, Infinix, itel, Samsung A-series) common in West Africa.
2. **True Native Touch & Gestures**: Smooth 60–120fps bottom sheets, pull-to-refresh, animated score gauges, swipe actions, and native camera/biometric interactions.
3. **Flawless Offline & Low-Bandwidth Support**: Instant startup with cached user profiles and optimistic cache invalidation via TanStack Query.
4. **Seamless Payment Experiences**: Real-time DVA (Dedicated Virtual Account) countdowns, clipboard helpers, native Paystack checkout sheets, and instant SSE updates.

---

## 2. Recommended React Native Tech Stack

| Domain | Recommended Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Expo (SDK 52+)** | Rapid build pipelines, EAS Build & Submit, over-the-air updates, zero-config native module links. |
| **Routing / Navigation** | **Expo Router (v4)** or **React Navigation (v7)** | File-based routing matching Next.js App Router structure, deep link resolution. |
| **Server State & Caching** | **TanStack Query (React Query v5)** | Directly maps to existing queries/mutations in `upward-pay`. |
| **Client State** | **Zustand** | Minimal boilerplate for auth session, PIN lock state, and offline draft storage. |
| **Forms & Validation** | **React Hook Form + Zod** | 100% reusable schema definitions from existing codebase. |
| **Styling & Design System** | **StyleSheet / Restyle / NativeWind v4** | Enforce Upward color palette tokens (`--clay: #C2501F`, `--dark: #1A1A1A`, `--shell-tint: #FBEDE5`). |
| **High Performance Lists** | **@shopify/flash-list** | Recycles native cells for high-speed transaction lists and visitor logs. |
| **Secure Token Storage** | **expo-secure-store** | Hardware-backed iOS Keychain & Android Keystore encryption for JWTs. |
| **Biometric Auth** | **expo-local-authentication** | Native Face ID, Touch ID, and Android Biometric Prompt. |
| **Push Notifications** | **expo-notifications** | APNs + FCM integration. |
| **Payments** | **react-native-paystack-webview** or native SDK | Dedicated native Paystack modal checkout. |

---

## 3. Global Network & Authentication Architecture

### 3.1 Base Headers & Platform Identification
Every outbound API request to the backend must inject:
```http
Authorization: Bearer <access_token>
Content-Type: application/json
x-client-platform: react-native
```
When performing refresh token swaps or logout:
```http
x-refresh-token: <refresh_token>
```

### 3.2 Dual-Token Refresh Lifecycle
1. Tokens are saved in secure storage:
   - `upward_access_token`: Short-lived JWT.
   - `upward_refresh_token`: Long-lived sliding refresh token.
2. When any HTTP request receives a `401 Unauthorized`:
   - Enqueue pending requests.
   - Hit `POST /user/auth/refresh` with `{ refreshToken: storedRefreshToken }`.
   - Update both tokens in `expo-secure-store`.
   - Replay queued requests with the new access token.
   - If refresh fails, purge tokens, clear user state, and redirect to `/login`.

### 3.3 Real-Time Server-Sent Events (SSE)
Upon login, the app opens an SSE connection:
```
GET /payments/sse/:userUuid
```
**Events handled:**
- `heartbeat`: Keepalive ping (ignore).
- `payment.succeeded`: Automatically invalidates Query keys: `dashboard`, `scoreProfile`, `pendingPayments`, `transactions`, `wallet`, `activeTenancy`. Triggers celebratory confetti / modal.
- `payment.request.created` / `payment.request.updated`: Automatically invalidates `pendingPayments` and `dashboard`.

---

## 4. Native Device Capabilities & Services

### 4.1 Biometric Authentication
- **Initial Setup**: Enabled via `Settings` or post-login prompt.
- **Credential Storage**: On setup, user PIN or password is stored in hardware Keychain/Keystore tagged under service `upward-pay.app`.
- **Auto-Prompt**: Prompt on cold launch or when resuming app from background if biometrics is active.
- **Supported Types**: Face ID, Touch ID, Fingerprint, Android Biometric Prompt.

### 4.2 App 4-Digit PIN Lock
- **Storage**: `upward_app_pin_hash`, `upward_app_pin_salt`, `upward_app_pin_user` stored locally.
- **Hash Algorithm**: SHA-256(`salt + pin`).
- **Behavior**: When app enters background for > 60 seconds, flag `isPinLocked = true`. Display full-screen overlay `PinLockScreen` blocking all UI until the 4 digits or biometric challenge passes.

### 4.3 Push Notifications
- On grant: Retrieve native device push token.
- Register with backend:
  ```http
  POST /user/notifications/device-token
  Body: { "token": "<device_token>", "platform": "ios" | "android" }
  ```
- Notification tap handling: Deep-links to `/dashboard/notifications`, `/dashboard/pay?invoiceId=...`, or `/dashboard/receipts?id=...`.

### 4.4 Camera & Document Picker
- **Avatar upload**: `expo-image-picker` (camera or library) -> Presigned S3 URL upload (`POST /user/auth/avatar-upload-url`).
- **Proof of Payment**: File picker or camera photo -> Multipart upload (`POST /payments/manual/proof`).
- **Tenancy Contracts**: PDF or image picker -> Multipart upload (`POST /user/contracts/upload`).
- **Maintenance Complaint media**: Multiple photo uploads -> Multipart upload (`POST /tenant-app/files?propertyUuid=...`).

### 4.5 Sharing & PDF Export
- **Rent Passport scorecard share**: Generates custom branded visual image card & invokes native `expo-sharing`.
- **Visitor pass share**: Shares 6-digit visitor access PIN via WhatsApp or native share sheet.
- **Receipts & Contracts**: Downloads PDF to device storage (`expo-file-system`) and opens native viewer/share dialog.

---

## 5. Complete Application Navigation Map

```
Root App
├── Auth & Onboarding Stack
│   ├── Landing / Deep Link Resolver (/)
│   ├── Login (/login)
│   ├── Signup (/signup)
│   ├── Forgot Password (/forgot-password)
│   ├── Welcome & Tour (/welcome/:uuid)
│   ├── Waitlist (/waitlist/:uuid)
│   └── Invite Claim (/invite/:token)
│
├── Profile Setup Wizard (Modal / Stack)
│   ├── Step 1: Phone Verification (/dashboard/setup/phone)
│   ├── Step 2: Property & Tenancy Details (/dashboard/setup/rental)
│   └── Step 3: Confirmation (/dashboard/setup/confirm)
│
├── Main Bottom Tab Navigator
│   ├── Tab 1: Home (Dashboard) (/dashboard)
│   ├── Tab 2: My Home (/dashboard/my-home) [Shown if property has GoodTenants link]
│   ├── Tab 3: Pay Rent (/dashboard/pay-rent)
│   ├── Tab 4: Transactions (/dashboard/transactions)
│   └── Tab 5: Me (Profile & Rent Passport) (/dashboard/me)
│
├── Feature Modals & Push Stacks
│   ├── Rent Passport Full View & Badges (/dashboard/kyc)
│   ├── Rent Passport Score Breakdown (/dashboard/score-breakdown)
│   ├── Verify Identity via BVN (/dashboard/verify-identity)
│   ├── PayRent Unified Checkout (/dashboard/pay, /pay/:token)
│   │   ├── Dedicated Virtual Account (DVA) View
│   │   ├── Paystack Card/Bank Webview Checkout
│   │   ├── Rent Deposit Credit Application Card
│   │   └── Upload Proof of Payment (Manual)
│   ├── Rent Deposit Balance (/dashboard/deposit-balance)
│   ├── Verified Receipt Viewer (/dashboard/receipts)
│   ├── My Home Sub-Screens:
│   │   ├── Maintenance & Complaints (/dashboard/my-home/complaints)
│   │   │   ├── Raise Complaint Form
│   │   │   ├── Dispute Complaint Form
│   │   │   └── Resolution Feedback Form
│   │   ├── Visitor Passes (/dashboard/my-home/visitors)
│   │   │   └── Generate Visitor PIN Form
│   │   ├── Estate Bills & Dues (/dashboard/my-home/payments)
│   │   └── Estate Documents & Rules (/dashboard/my-home/documents)
│   ├── Tenancy Contracts & Leases (/dashboard/documents)
│   ├── Savings Goals & Rent Wallet (/dashboard/savings)
│   │   ├── Wallet Deposit
│   │   └── Create / Edit Savings Goal
│   ├── Upward Benefits Protection (/dashboard/benefits)
│   ├── Rent Support Insurance (/dashboard/rent-support-insurance)
│   ├── Alliance Exclusive Homes Marketplace (/dashboard/exclusive-homes)
│   │   ├── Listing Details (/alliance/:uuid)
│   │   └── Rental Inquiry Form
│   ├── Request Past Records (/dashboard/request-records)
│   ├── Notifications Center (/dashboard/notifications)
│   ├── Account Settings (/dashboard/settings)
│   │   ├── Change Password
│   │   ├── Feedback Submission
│   │   └── Close / Delete Account Wizard
│   └── Help & Support (/dashboard/help)
```

---

## 6. Detailed Screen & Flow Specifications

### 6.1 Auth & Onboarding Flow

#### Screen: Login (`/login`)
- **Purpose**: Authenticates returning users via password, OTP, biometrics, or social providers.
- **UI Elements**:
  - Email / Phone toggle input.
  - Password input with visibility toggle.
  - Quick action: "Sign in with OTP".
  - Quick action: "Sign in with Face ID / Fingerprint" (if enrolled).
  - Social Buttons: "Continue with Apple", "Continue with Google".
  - Link to Forgot Password & Signup.
- **API Calls**:
  1. Password Login:
     - `POST /user/auth/login`
     - Payload: `{ email: string, password: string, type?: "email" | "phone" }`
     - Response: `{ accessToken, refreshToken, user: UserProfile }`
  2. OTP Login Request:
     - `POST /user/auth/request-otp`
     - Payload: `{ email: string, context: "LOGIN", type?: "email" | "phone", channel?: "SMS" | "WHATSAPP" }`
  3. OTP Login Verification:
     - `POST /user/auth/otp-login`
     - Payload: `{ email: string, otp: string, type?: "email" | "phone" }`
  4. Social Login:
     - `POST /user/auth/social`
     - Payload: `{ provider: "google" | "apple", idToken: string, firstName?: string, lastName?: string }`
- **Post-Auth Actions**:
  - Save tokens to `expo-secure-store`.
  - Prompt for Biometrics / 4-digit PIN setup if device supports it and not yet configured.
  - Route to `/dashboard/setup` if profile incomplete, else `/dashboard`.

#### Screen: Signup (`/signup`)
- **Purpose**: New user onboarding with email/phone verification.
- **UI Elements**:
  - First Name & Last Name inputs.
  - Email address & Phone number.
  - Password input (validated: min 8 chars, numbers, uppercase).
  - Referral / Promo / Invite code prefilled from deep link.
  - Checkbox: Accept Terms & Privacy Policy.
  - 6-digit OTP verification screen upon submission.
- **API Calls**:
  1. Email/Phone duplicate check:
     - `POST /user/auth/check-email`
     - Payload: `{ email: string, type?: "email" | "phone" }`
     - Response: `{ exists: boolean, hasPassword: boolean, isInvited: boolean, isWaitlist: boolean }`
  2. Request Signup OTP:
     - `POST /user/auth/request-otp`
     - Payload: `{ email: string, context: "SIGNUP", type?: "email" | "phone" }`
  3. Verify OTP:
     - `POST /user/auth/verify-otp`
     - Payload: `{ email: string, otp: string, context: "SIGNUP" }`
  4. Complete Registration:
     - `POST /user/auth/signup`
     - Payload:
       ```json
       {
         "email": "user@example.com",
         "password": "StrongPassword123!",
         "firstName": "John",
         "lastName": "Doe",
         "phone": "+2348012345678",
         "isFromWaitlist": false,
         "isFromInvite": false,
         "hearAboutUs": "Social Media"
       }
       ```

#### Screen: Forgot Password (`/forgot-password`)
- **Step 1**: Enter registered email -> `POST /user/auth/forgot-password` with `{ email }`.
- **Step 2**: Enter 6-digit OTP received in email -> `POST /user/auth/verify-reset-otp` with `{ email, otp }`.
- **Step 3**: Enter new password & confirm -> `POST /user/auth/reset-password` with `{ email, otp, new: newPassword }`.

---

### 6.2 Profile Setup Wizard (Onboarding Blocker)
If `user.properties.length === 0` or essential fields are missing, user is guided through the 3-step setup before accessing the dashboard:

1. **Step 1: Phone Verification (`/dashboard/setup/phone`)**
   - User inputs Nigerian / international phone number.
   - Triggers SMS/WhatsApp OTP via `POST /user/auth/request-otp`.
   - Verifies OTP via `POST /user/auth/verify-otp`.
2. **Step 2: Tenancy & Rental Information (`/dashboard/setup/rental`)**
   - State & Subarea / City picker (backed by `GET /location/countries` & `GET /location/cities`).
   - Property Address.
   - Monthly / Annual Rent Amount.
   - Rent Due Date (day of month or annual date).
   - Landlord or Property Manager Name, Email, and Phone number.
3. **Step 3: Confirmation (`/dashboard/setup/confirm`)**
   - Review draft details.
   - Submits `PATCH /user/auth/profile` and creates property entry:
     ```json
     {
       "phone": "+2348012345678",
       "address": "12 Admiralty Way, Lekki Phase 1, Lagos",
       "properties": [{
         "address": "12 Admiralty Way, Lekki Phase 1, Lagos",
         "state": "Lagos",
         "rentDueDate": "2026-11-01",
         "companyName": "Prime Properties Ltd",
         "managerName": "Mr. Adebayo"
       }]
     }
     ```

---

### 6.3 Dashboard & Rent Passport™

#### Screen: Dashboard Home (`/dashboard`)
- **Key Sections**:
  1. **Rent Passport™ Hero Card**:
     - Displays Score (e.g. 780 / 1000), Rank (`Rank A`, `Rank B`), Score Band (`Prime`, `Excellent`).
     - Badges: `Identity Verified`, `Connected Property`, `Verified PM`.
     - Button: **Share Rent Passport** (opens native share modal).
     - Button: **View Score Breakdown** -> routes to `/dashboard/score-breakdown`.
  2. **Active Pending Bills / Rent Invoices Carousel**:
     - Due date countdown ("Due in 4 days").
     - Total Amount & Property Label.
     - Single tap action: **Pay Now** -> opens Unified Checkout.
  3. **Tenancy Unit Card**:
     - Current managed home, unit number, manager contact.
     - Quick links: Maintenance, Visitors, Documents.
  4. **Quick Action Grid**:
     - *Pay Rent*, *Rent Deposit*, *Request Records*, *Savings*, *Exclusive Homes*.
  5. **Recent Transactions Feed**:
     - Last 3 transactions with amount, date, status, and receipt link.
- **API Calls**:
  - `GET /user/auth/me` (User profile & properties)
  - `GET /user/auth/score-profile` (Score, rank, metrics, cycles)
  - `GET /payments/transactions/pending` (Pending rent requests & line items)
  - `GET /payments/transactions` (Recent payments)
  - `GET /payments/landlords` (Saved landlord bank accounts)
  - `GET /user/notifications` (Unread badge counts)

#### Screen: Score Breakdown (`/dashboard/score-breakdown`)
- **Visuals**: Animated circular score progress gauge (0 to 1000).
- **Core Metrics Displayed**:
  - `Payment Timeliness (PT%)`: Percentage of payments made on or before due date.
  - `Longest Streak`: Consecutive on-time payment cycles.
  - `Total Cycles`: Number of billing periods verified on Upward.
  - `History Length`: Total rental history duration.
  - `Financial Discipline`: Score modifier reflecting repayment consistency.
  - `Savings Bonus`: Boost points earned from savings balances.
- **Payment Cycles Timeline**:
  - List of past cycles: Amount, Due Date, Paid Date, Status (`PAID_ON_TIME`, `PAID_LATE`, `MISSED`, `PENDING`), Score Impact points (+15, -30).
- **Improvement Tips**: Tailored insights on how to reach higher rank bands.

#### Screen: Identity Verification via BVN (`/dashboard/verify-identity`)
- **Purpose**: Complies with Central Bank of Nigeria / KYC regulations and unlocks shareable Rent Passport status.
- **Inputs**: 11-digit BVN (Bank Verification Number).
- **Security Notice**: Encrypted transmission, BVN is never stored or shared with landlords.
- **API Call**:
  - `POST /user/auth/verify-bvn`
  - Body: `{ "bvn": "12345678901" }`
  - Success Response: `{ success: true, message: "Identity verified successfully!" }`
  - Action: Immediately refresh `GET /user/auth/me` to update `isIdentityVerified = true`.

---

### 6.4 PayRent™ & Unified Checkout Flow

#### Screen: Unified Checkout (`/dashboard/pay`, `/dashboard/pay-rent`, `/pay/:token`)
Handles both authenticated in-app rent payments and public guest invoice links.

- **Invoice Header & Line Item Breakdown**:
  - Primary Rent.
  - Service Charge.
  - Legal & Agreement Fees.
  - Caution / Security Deposit.
  - Transaction Processing Fee (`id: -2`).
  - Upward Benefits Protection Fee (`id: -3`).
- **Payment Distribution Logic**:
  - Total entered amount is dynamically distributed:
    1. Transaction Fee is paid first.
    2. Primary Rent & estate line items are paid in order.
    3. Upward Benefits fee is paid last (if opted in).
- **Payment Methods Available**:
  1. **Bank Transfer via Dedicated Virtual Account (DVA)**:
     - Displays Assigned Bank Name (e.g. *Titan Trust Bank*, *Wema Bank*, *Sterling Bank*).
     - Dedicated Account Number with **Copy to Clipboard** button.
     - Account Name: `Upward Pay / [User Full Name]`.
     - Expiry / Session Timer (auto-refreshes if needed).
     - Button: **Change Bank** -> calls `POST /payments/switch-dva` with `{ preferredBank }`.
     - Background: SSE connection waits for incoming credit alert. Upon transfer arrival, transition directly to **Payment Success Screen**.
  2. **Online Card / Bank Checkout (Paystack)**:
     - Button: "Pay with Card / Bank App".
     - Calls `POST /payments/initialize` -> returns Paystack `access_code` and `reference`.
     - Opens native Paystack modal.
     - On completion callback: Calls `GET /payments/verify/:reference`.
  3. **Apply Rent Deposit Credit**:
     - If user has active deposit balance, displays card: "Use ₦X from your Rent Deposit".
     - Slider or input for deposit amount to apply.
     - Calls `POST /payments/rent-deposit/apply`.
  4. **Manual Transfer / Upload Proof of Payment**:
     - Used if tenant paid landlord directly or via personal bank transfer outside DVA.
     - Form: Sender account name, payment date, reference number, optional receipt screenshot.
     - Calls `POST /payments/manual/proof` (multipart) or `POST /payments/manual/proof/manual`.
- **Payment Success State**:
  - Shows green verified badge.
  - Displays instant Rent Passport score boost (+X points).
  - Button: **Download Verified Receipt**.
  - Button: **Back to Dashboard**.

---

### 6.5 Rent Deposit Balance

#### Screen: Rent Deposit (`/dashboard/deposit-balance`)
- **Purpose**: Manages refundable caution deposits and security credits held with landlords/PMs.
- **UI Elements**:
  - Total Active Deposit Balance Card.
  - Dedicated Deposit Virtual Account details for topping up.
  - Ledger of past deposit allocations and refunds.
  - Download official Deposit Receipt button.
- **API Calls**:
  - `GET /payments/rent-deposit?propertyUuid=...`
  - `POST /payments/rent-deposit/apply`
  - `GET /payments/rent-deposit/receipt/:uuid`

---

### 6.6 Transactions & Verified Receipts

#### Screen: Transaction History (`/dashboard/transactions`)
- **Features**:
  - Merges both Upward platform payments (`/payments/transactions`) and GoodTenants estate dues (`/tenant-app/transactions`).
  - Month grouping headers (e.g., *October 2026*, *September 2026*).
  - Real-time search by narration, property address, or reference number.
  - Filter pills: `All`, `Rent`, `Utilities`, `Deposit`, `Benefits`.
  - Pull-to-refresh.
- **Tap Action**: Opens **Transaction Detail Modal** with full line items, channel, reference, and **View Receipt** button.

#### Screen: Receipt Viewer (`/dashboard/receipts?id=:uuid`)
- **UI Elements**:
  - Branded PDF-style receipt preview: Upward watermark, QR verification code, landlord details, tenant details, line item table, transaction reference, timestamp.
  - Button: **Download PDF** (saves to device files via `expo-file-system`).
  - Button: **Share Receipt** (invokes native share sheet with PDF attachment).
- **API Call**:
  - `GET /payments/transactions/:id`
  - `POST /payments/transactions/receipt` -> returns `{ url: string }` or PDF stream.

---

### 6.7 My Home (Estate & Tenancy Management)

Active when tenant lives in an estate/property managed via GoodTenants.

#### Sub-Screens:
1. **My Home Overview (`/dashboard/my-home`)**:
   - Shows active unit number, building name, estate manager details.
   - Quick action cards: *Complaints*, *Visitor Passes*, *Estate Bills*, *Estate Documents*.
2. **Maintenance Complaints (`/dashboard/my-home/complaints`)**:
   - **Ticket List**: Filter by `All`, `Pending`, `In Progress`, `Resolved`, `Disputed`.
   - **Raise Complaint Modal**:
     - Category picker (Plumbing, Electrical, Structural, Security, Pest Control, etc.).
     - Details description input.
     - Attach photos/videos (multi-image picker -> `POST /tenant-app/files?propertyUuid=...`).
     - Submits `POST /tenant-app/complaints?propertyUuid=...`.
   - **Dispute Resolution**: If a ticket was closed unsatisfactorily:
     - Submits `POST /tenant-app/complaints/:id/dispute?propertyUuid=...`.
   - **Feedback Form**: Post-job rating (1–5 stars) & review -> `POST /tenant-app/complaints/:id/feedback?propertyUuid=...`.
3. **Visitor Access Passes (`/dashboard/my-home/visitors`)**:
   - **Active Passes**: Displays valid 6-digit gate access codes/PINs and QR codes.
   - **Generate Access Pass Form**:
     - Visitor Name & Phone number.
     - Type: `Guest`, `Delivery`, `Contractor`, `Artisan`.
     - Valid Duration: 2 hours, 6 hours, 24 hours, custom.
     - Submits `POST /tenant-app/visitors/generate?propertyUuid=...`.
   - **Share Pass Button**: One-tap share via WhatsApp with formatted gate invitation text.
   - **Revoke Pass**: `DELETE /tenant-app/visitors/:accessId?propertyUuid=...`.
4. **Estate Bills & Dues (`/dashboard/my-home/payments`)**:
   - Lists recurring estate charges (power token bills, service charges, water, security levies).
   - Pay bill directly or upload bank transfer proof (`POST /tenant-app/transactions/proof-of-payment`).
5. **Estate Documents (`/dashboard/my-home/documents`)**:
   - Estate bylaws, handbook, emergency contact directory.
   - Tracks read status: `PATCH /tenant-app/documents/:id/view?propertyUuid=...`.

---

### 6.8 Tenancy Contracts & Documents

#### Screen: Documents (`/dashboard/documents`)
- **Features**:
  - Displays lease agreements uploaded by Tenant or issued by Property Manager (`source: "TENANT" | "PM"`).
  - Displays file size, upload date, linked property address.
  - Document Preview modal (in-app PDF/image renderer).
- **Upload Action**:
  - Document picker (PDF, PNG, JPG).
  - Select associated tenancy property.
  - Custom file label input.
  - Uploads via multipart `POST /user/contracts/upload`.
- **Delete Action**:
  - `DELETE /user/contracts/:uuid`.

---

### 6.9 Savings Goals & Rent Wallet

#### Screen: Savings Dashboard (`/dashboard/savings`)
- **Wallet Hero**:
  - Available wallet balance in NGN.
  - Button: **Add Funds** -> initiates Paystack top-up via `POST /wallet/fund`.
- **Goal Cards**:
  - "Save for Next Year Rent" (Target: ₦1,800,000, Saved: ₦950,000, Progress bar: 52%).
  - "Save for Down Payment" (Custom goal).
- **Create / Edit Goal (`/dashboard/savings/set-goal`)**:
  - Goal Name, Target Amount, Target Date.
  - Automated weekly/monthly debit toggle.
  - Submits `POST /savings/goals` or `PATCH /savings/goals/:id`.

---

### 6.10 Upward Benefits & Rent Support Insurance

#### Screen: Upward Benefits (`/dashboard/benefits`)
- **Protection Included**:
  - Emergency Rent Relief fund.
  - Accidental damage coverage.
  - Job loss rent security.
- **Activation Flow**:
  - `GET /payments/benefits/status`: checks active policy start/end dates.
  - Activate protection: `POST /payments/benefits/initialize` -> Paystack inline checkout -> `POST /payments/benefits/confirm`.

#### Screen: Rent Support Insurance (`/dashboard/rent-support-insurance`)
- Manages enrolled policies underwritten by insurance partners.
- Claims submission form and policy status certificate download.

---

### 6.11 Alliance Exclusive Rental Marketplace

#### Screen: Exclusive Homes (`/dashboard/exclusive-homes`)
- **Purpose**: Curated marketplace of vetted rental properties that accept Rent Passport verified tenants without excessive agent fees.
- **Filters**:
  - City: `All`, `Lagos`, `Abuja`.
  - Bedrooms: `Any`, `1 bed`, `2 bed`, `3+ bed`.
  - Price Range slider (min / max annual rent).
- **Listing Detail (`/alliance/:uuid`)**:
  - Image gallery carousel.
  - Amenities tags (24/7 Power, Treated Water, Security, Pool).
  - Required minimum Rent Passport Score / Rank (e.g. `Requires Rank B+`).
  - Button: **Submit Rental Application / Inquiry**:
    - Calls `POST /public/alliance/listings/:uuid/inquiries`.
    - Auto-attaches user's Rent Passport verification token.

---

### 6.12 Past Rent Record Requests

#### Screen: Request Records (`/dashboard/request-records`)
- **Purpose**: Allows tenants to claim past off-platform rent payments and request endorsement from previous landlords/agents to build their score.
- **Form Inputs**:
  - Previous Property Address & City.
  - Landlord / Agent Full Name, Email Address, and Phone Number.
  - Tenancy Start & End Dates.
  - Annual Rent Amount paid.
- **API Call**:
  - Submit request: `POST /user/auth/request-records`.
  - View status of existing requests: `GET /user/auth/credibility-requests`.
  - Statuses: `Pending Verification`, `Approved`, `Declined`.

---

### 6.13 Notifications & Announcements

#### Screen: Notifications Center (`/dashboard/notifications`)
- **3-Tab Navigation**:
  1. **Transactions**: Payment received alerts, rent due warnings, deposit updates.
  2. **Activities**: PM connection requests, lease contract uploads, complaint status changes.
  3. **Services**: Upward platform announcements, feature releases, system notices.
- **Interactions**:
  - Unread count badges per tab.
  - Tap notification: Marks as read via `PATCH /user/notifications/:id/read` and navigates to the associated deep-link target.
  - In-app Announcement Popups & Banners:
    - Update dismissal state: `PATCH /user/notifications/announcements/state`.

---

### 6.14 User Profile, Banking & Account Settings

#### Screen: Profile & Account Settings (`/dashboard/me`, `/dashboard/settings`)
- **Profile Summary Header**:
  - Profile avatar image with camera edit icon -> upload via presigned S3 URL (`POST /user/auth/avatar-upload-url`).
  - Full Name, Email, Phone number, Profile Completion Percentage.
- **Sub-Views**:
  1. **Personal Details**:
     - Full Name, Phone, Gender, Date of Birth, Bio.
     - Submits `PATCH /user/auth/profile`.
  2. **Banking & Payout Accounts**:
     - Account number, Bank Name, Account Name.
     - Verification: Calls `GET /payments/verify-account?accountNumber=...&bankCode=...`.
     - Submits `POST /payments/bank-details`.
  3. **Security**:
     - Biometrics toggle (Face ID / Fingerprint) -> stores preference and registers native keychain item.
     - Change Password form -> `POST /user/auth/change-password`.
  4. **Share Feedback**:
     - Type: `Suggestion`, `Bug Report`, `Difficulty using app`.
     - Submits `POST /public/feedback`.
  5. **Sign Out**:
     - Calls `POST /user/auth/logout`.
     - Clears secure storage, removes push listeners, and redirects to `/login`.

---

### 6.15 Close / Delete Account Flow

#### Screen: Close Account Wizard (`/dashboard/settings/close-account`)
Multi-step compliance flow to ensure complete account deletion:
1. **Overview**: Warning detailing loss of Rent Passport score, history, and active tenancy records.
2. **Reason Selection**: User picks from 8 predefined reasons (e.g. *No longer renting*, *Switching platforms*, *Privacy concerns*).
3. **Confirmation Checkboxes**: User checks 3 mandatory acknowledgment boxes.
4. **OTP Security Verification**:
   - Triggers OTP to masked email: `POST /user/auth/delete-account/request-otp` (60s cooldown timer).
   - 6-digit OTP input.
   - Final deletion call:
     ```http
     POST /user/auth/delete-account
     Body: { "reason": "<selected_reason>", "otp": "123456" }
     ```
5. **Success Confirmation**: Clears all local state and navigates to landing screen.

---

### 6.16 Help, FAQs & Support Tickets

#### Screen: Help & Support (`/dashboard/help`)
- **FAQ Accordion**:
  - Organized by topics: *Verification & Badges*, *PayRent & DVA*, *Score Calculation*, *Landlord Approval*.
- **Submit Support Ticket Tab**:
  - Textarea input describing the issue.
  - Submits `POST /user/support` with `{ message }`.
  - View submitted tickets and reply status: `GET /user/support`.

---

### 6.17 Public & Deep-Link Screens
The React Native app must handle these URLs via Universal Links / URL Schemes (`goodtenants://` & `https://upward.goodtenants.io/*`):

| Path / URL Scheme | Destination Screen |
| :--- | :--- |
| `/pay/:token` | Guest PayRent Checkout (Pay rent without mandatory pre-login) |
| `/invite/:token` | Claim Property Manager / Landlord Invitation |
| `/welcome/:uuid` | Welcome Onboarding Tour |
| `/waitlist/:uuid` | Waitlist Status & Fast-Track Signup |
| `/fill-record/:uuid` | Landlord Past Payment Endorsement Form |
| `/profile/:slug` | Public Shareable Rent Passport Profile |
| `/alliance/:uuid` | Alliance Marketplace Listing Detail |

---

## 7. Master API Endpoint Reference

### Auth & User Profile
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/user/auth/signup` | Register new tenant account |
| `POST` | `/user/auth/login` | Authenticate with email/phone & password |
| `POST` | `/user/auth/otp-login` | Authenticate with one-time password |
| `POST` | `/user/auth/social` | Authenticate with Apple or Google ID token |
| `POST` | `/user/auth/refresh` | Exchange refresh token for fresh access token |
| `POST` | `/user/auth/logout` | Invalidate active session & tokens |
| `GET` | `/user/auth/me` | Fetch authenticated user profile & tenancies |
| `PATCH` | `/user/auth/profile` | Update user personal details & properties |
| `POST` | `/user/auth/change-password` | Update account password |
| `POST` | `/user/auth/forgot-password` | Request password reset OTP |
| `POST` | `/user/auth/verify-reset-otp` | Verify password reset OTP |
| `POST` | `/user/auth/reset-password` | Set new password using verified OTP |
| `POST` | `/user/auth/check-email` | Check if email/phone exists or has password |
| `POST` | `/user/auth/request-otp` | Send 6-digit OTP (SMS, WhatsApp, or Email) |
| `POST` | `/user/auth/verify-otp` | Verify 6-digit OTP |
| `POST` | `/user/auth/verify-bvn` | Verify Bank Verification Number (KYC) |
| `POST` | `/user/auth/avatar-upload-url` | Generate presigned AWS S3 upload URL for avatar |
| `POST` | `/user/auth/delete-account/request-otp` | Request OTP for account closure |
| `POST` | `/user/auth/delete-account` | Permanently close and delete tenant account |

### Rent Passport & Scores
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/user/auth/score-profile` | Fetch authenticated user Rent Passport score & cycles |
| `GET` | `/public/profile/:slug` | Fetch public read-only Rent Passport profile |
| `GET` | `/user/auth/credibility-requests` | List past rent verification requests |
| `POST` | `/user/auth/request-records` | Request rent verification from past landlord |
| `GET` | `/public/credibility/request/:uuid` | Fetch public verification request details |
| `POST` | `/public/credibility/request/:uuid/fulfill` | Landlord fulfills past rent payment record |
| `GET` | `/user/credibility/pdf` | Download official Rent Passport PDF summary |

### Payments & Invoices
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/payments/transactions/pending` | Fetch pending invoices and line items |
| `POST` | `/payments/initialize` | Initialize Paystack online transaction |
| `GET` | `/payments/verify/:reference` | Verify completed Paystack transaction |
| `POST` | `/payments/switch-dva` | Switch Dedicated Virtual Account bank provider |
| `POST` | `/public/pay/guest-initialize` | Initialize guest payment without authentication |
| `GET` | `/payments/transactions` | Fetch user transaction history list |
| `GET` | `/payments/transactions/:id` | Fetch single transaction details |
| `POST` | `/payments/transactions/receipt` | Generate PDF receipt for transaction |
| `GET` | `/payments/landlords` | Fetch saved landlord bank accounts |
| `POST` | `/payments/landlords` | Save new landlord account for rent payments |
| `GET` | `/payments/banks` | Fetch list of supported commercial banks |
| `GET` | `/payments/verify-account` | Resolve bank account name using account & bank code |
| `GET` | `/payments/bank-details` | Fetch tenant payout bank details |
| `POST` | `/payments/bank-details` | Save tenant payout bank details |
| `POST` | `/payments/manual/proof` | Upload receipt for manual / off-platform payment |
| `POST` | `/payments/manual/proof/manual` | Submit manual payment record details |
| `GET` | `/payments/sse/:userUuid` | Server-Sent Events stream for instant payment alerts |

### Rent Deposit
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/payments/rent-deposit` | Fetch refundable rent deposit balance & ledger |
| `POST` | `/payments/rent-deposit/apply` | Apply deposit credit toward pending invoice |
| `GET` | `/payments/rent-deposit/receipt/:uuid` | Fetch rent deposit receipt |

### Upward Benefits Protection
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/payments/benefits/status` | Fetch active Upward Benefits coverage status |
| `POST` | `/payments/benefits/initialize` | Initialize Upward Benefits payment checkout |
| `POST` | `/payments/benefits/confirm` | Confirm benefits coverage after successful payment |

### My Home (Estate Management via GoodTenants Bridge)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/tenant-app/complaints?propertyUuid=...` | List maintenance complaints |
| `GET` | `/tenant-app/complaints/:id?propertyUuid=...` | Get complaint details & replies |
| `POST` | `/tenant-app/complaints?propertyUuid=...` | Raise new maintenance complaint |
| `POST` | `/tenant-app/complaints/:id/dispute?propertyUuid=...` | Dispute resolved complaint |
| `POST` | `/tenant-app/complaints/:id/feedback?propertyUuid=...` | Submit contractor rating & feedback |
| `POST` | `/tenant-app/files?propertyUuid=...` | Upload photo attachment for complaint |
| `GET` | `/tenant-app/visitors/active?propertyUuid=...` | List active visitor access passes |
| `GET` | `/tenant-app/visitors/history?propertyUuid=...` | List historical visitor passes |
| `POST` | `/tenant-app/visitors/generate?propertyUuid=...` | Generate new visitor access code/PIN |
| `DELETE` | `/tenant-app/visitors/:accessId?propertyUuid=...` | Revoke visitor access pass |
| `GET` | `/tenant-app/transactions?propertyUuid=...` | List estate dues & utility transactions |
| `POST` | `/tenant-app/transactions/proof-of-payment?propertyUuid=...` | Submit proof for estate dues |
| `GET` | `/tenant-app/documents?propertyUuid=...` | List estate handbook & rule documents |
| `PATCH` | `/tenant-app/documents/:id/view?propertyUuid=...` | Mark estate document as read |

### Documents & Contracts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/user/contracts` | Fetch list of tenancy contracts & agreements |
| `POST` | `/user/contracts/upload` | Multipart upload of tenancy agreement |
| `DELETE` | `/user/contracts/:uuid` | Delete uploaded tenancy document |

### Wallet & Savings
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/wallet` | Fetch wallet balance & transactions |
| `POST` | `/wallet/fund` | Initialize wallet deposit |
| `GET` | `/savings/goals` | List active savings goals |
| `POST` | `/savings/goals` | Create new savings goal |
| `PATCH` | `/savings/goals/:id` | Update target or amount of savings goal |

### Alliance Marketplace
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/public/alliance/listings` | Search and filter vetted rental listings |
| `GET` | `/public/alliance/listings/:uuid` | Fetch listing details, photos, and requirements |
| `POST` | `/public/alliance/listings/:uuid/inquiries` | Submit rental inquiry with Rent Passport |

### Notifications & Support
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/user/notifications` | Fetch notifications & unread counts |
| `PATCH` | `/user/notifications/:id/read` | Mark specific notification as read |
| `PATCH` | `/user/notifications/announcements/state` | Update banner/popup dismissal state |
| `POST` | `/user/notifications/device-token` | Register iOS/Android device push token |
| `POST` | `/public/feedback` | Submit bug report or product suggestion |
| `POST` | `/user/support` | Create customer support ticket |
| `GET` | `/user/support` | List user support tickets & resolution status |

---

## 8. Critical Mobile Migration Pitfalls & Implementation Guidelines

1. **Do NOT Use Web Session Replay Tools on Mobile**:
   The primary reason the earlier hybrid app suffered from sluggishness was running continuous DOM mutation recorders inside WebViews. Use native lightweight crash reporting (e.g. Sentry React Native or native Bugsnag).
2. **Keyboard Avoiding View Configuration**:
   On Android, inputs at the bottom of the screen (such as payment amount inputs or OTP digits) frequently get obscured by the soft keyboard. Use `react-native-keyboard-controller` or `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`.
3. **Paystack Integration in React Native**:
   Use `react-native-paystack-webview` or embed the Paystack standard checkout page in a clean dedicated modal with `onSuccess` and `onCancel` JavaScript message listeners. Verify all transactions on the backend via `/payments/verify/:reference`.
4. **SSE Connection in Background App State**:
   Mobile OSs (especially iOS) suspend background sockets within ~30 seconds of app backgrounding. Use `AppState.addEventListener('change', ...)`:
   - When app returns to `'active'`, reconnect the SSE stream and trigger `queryClient.invalidateQueries()`.
5. **Fast Numeric PIN and BVN Inputs**:
   For BVN and OTP inputs, use `keyboardType="number-pad"` and implement automatic focus shifting to the next digit input on change.
6. **Hardware Back Button Handling (Android)**:
   Ensure the Android physical back button dismisses active bottom sheets, modals, and checkout drawers before exiting the current screen.
