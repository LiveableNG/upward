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
   - [6.3 Rebuilt Dashboard Home & Score Breakdown™](#63-rebuilt-dashboard-home--score-breakdown)
   - [6.4 PayRent™ & Unified Checkout Flow](#64-payrent--unified-checkout-flow)
   - [6.5 Rent Deposit Balance](#65-rent-deposit-balance)
   - [6.6 Transactions & Verified Receipts](#66-transactions--verified-receipts)
   - [6.7 My Home (Estate & Tenancy Management)](#67-my-home-estate--tenancy-management)
   - [6.8 Tenancy Contracts & Documents](#68-tenancy-contracts--documents)
   - [6.9 Rent Savings Vault, 14.5% Yield & Emergency Liquidity Engine](#69-rent-savings-vault-145-yield--emergency-liquidity-engine)
   - [6.10 Upward Benefits & Rent Support Insurance](#610-upward-benefits--rent-support-insurance)
   - [6.11 Alliance Exclusive Rental Marketplace](#611-alliance-exclusive-rental-marketplace)
   - [6.12 Past Rent Record Requests](#612-past-rent-record-requests)
   - [6.13 Notifications & Announcements](#613-notifications--announcements)
   - [6.14 User Profile, Banking & Account Settings](#614-user-profile-banking--account-settings)
   - [6.15 Close / Delete Account Flow](#615-close--delete-account-flow)
   - [6.16 Help, FAQs & Support Tickets](#616-help-faqs--support-tickets)
   - [6.17 Public & Deep-Link Screens](#617-public--deep-link-screens)
   - [6.18 Multi-Provider Identity & SEC Investor Suitability KYC](#618-multi-provider-identity--sec-investor-suitability-kyc)
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
| **SVG & Score Gauges** | **react-native-svg + react-native-reanimated** | Native GPU-accelerated circular activity rings and progress gauges with smooth 60fps transitions. |
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
│   │   ├── Context-Aware Rent Runway Hero (Active Vault / 14.5% Pitch / Urgent Due)
│   │   ├── Upward Rent Score Card (Conic Apple-style gauge, single-line band mapping)
│   │   ├── Behavioral Metrics Strip (Streak 🔥, On-Time 🛡️, Profile Health ⚡)
│   │   ├── Quick Action Direct Chips (Rent Vault 14.5%, Pay Rent, Save for Home)
│   │   ├── My Home Operations Hub (2x2 Contained Living Grid)
│   │   ├── Emergency Cash Advance Pillar Card (Borrow up to 40%)
│   │   ├── Upward Tenant Protection Package Pillar Card
│   │   └── Recent Transactions Feed with Receipt Links
│   ├── Tab 2: My Home (/dashboard/my-home) [Active tenancies & GoodTenants bridge]
│   ├── Tab 3: Pay Rent (/dashboard/pay-rent)
│   ├── Tab 4: Transactions (/dashboard/transactions)
│   └── Tab 5: Me (Profile & Rent Passport) (/dashboard/me)
│
├── Feature Modals & Push Stacks
│   ├── Rent Passport Full View & Badges (/dashboard/kyc)
│   ├── Rent Passport Score Breakdown Screen (/dashboard/score-breakdown)
│   │   ├── Animated 148px SVG Circular Activity Ring & Frosted Rank Capsule
│   │   ├── 5-Factor Factor Analytics Grid (Timeliness, Streak, Discipline, Tenure, Savings Bonus)
│   │   ├── Verified Payment Cycles Timeline (Status Badges & Score Impact Tags)
│   │   └── Shareable Passport Profile Card & Deep Link
│   ├── Multi-Provider Identity Verification (/dashboard/verify-identity) [BVN / NIN / VNIN]
│   ├── Rent Savings Vault & 14.5% Yield Engine (/dashboard/savings)
│   │   ├── Active Vault Maturity Dashboard (Target, Balance, Accrued 14.5% Profit Ticker)
│   │   ├── Fund Vault via Dedicated Virtual Account (DVA) Modal
│   │   ├── 3-Step SEC Investor Suitability & ARM Connect KYC Modal
│   │   ├── Create Rent Vault Configuration Wizard
│   │   ├── Emergency Cash Advance Drawer (Instant 40% Liquidity @ 3.5% fee)
│   │   ├── Rent Day Settlement Modal (Landlord NIP Direct Routing + Surplus Return)
│   │   ├── Early Liquidation / Break-out Confirmation Sheet
│   │   └── Rent Savings & Yield Simulator (/rent-calculator)
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

### 6.3 Rebuilt Dashboard Home & Score Breakdown™

The Upward Pay mobile dashboard is engineered around **5 Core Strategic Pillars** to maximize daily engagement, rent financial discipline, and tenant retention:
1. **Pillar 1: Flagship Rent Savings & Investment Engine (14.5% Yield & Emergency Cash Advance)**
2. **Pillar 2: Seamless Rent Payment & Verified Settlement Rail**
3. **Pillar 3: Rent Score & Financial Credibility (Rent Passport™)**
4. **Pillar 4: High-Frequency Living Operations (My Home Hub)**
5. **Pillar 5: Tenant Protection & Emergency Liquidity Safety Net**

---

#### Screen: Dashboard Home (`/dashboard`)

- **Architecture & Layout Hierarchy**:
  1. **Deposit Overpayment / Refund Card (`RentDepositCard`)**:
     - Conditionally rendered at top of feed if tenant has an active caution deposit refund or payment surplus.
     - Action: One-tap application toward pending rent invoice.
  2. **Activity & Critical Action Center Carousel**:
     - Rendered if overdue invoices exist, rent is due within 14 days, or identity verification is incomplete.
     - Urgent styling: Red critical badge and warning alert when `anyOverdue === true`.
  3. **Primary Hero: Context-Aware `RentRunwayHero`**:
     - Dynamically evaluates user state and renders one of 3 distinct high-conversion screens:
       - **State A (Active Rent Vault Enrolled)**:
         - Eyebrow: `RENT VAULT · MATURITY LOCKED` (or `SETTLEMENT READY` when maturity is reached).
         - Right badge: Calendar countdown pill showing `X Days to Rent Day`.
         - Target label: `Target: ₦X,XXX,XXX due on [Date]`.
         - Large primary currency display: `₦X,XXX,XXX` (Current balance in Naira).
         - Target Progress Gauge: Visual horizontal progress bar showing `target_completion_percentage%`.
         - Accrued Yield Widget: Glowing green compound returns banner `+₦XX,XXX profit earned (+₦XXX added today @ 14.5% p.a.)`.
         - Action Row: Primary button **Fund Vault** (opens Dedicated Virtual Account modal) + Secondary button **Manage Vault** (routes to `/dashboard/savings`).
       - **State B (No Active Vault, Rent Obligation > 45 Days Away)**:
         - Eyebrow: `RENT RUNWAY · 14.5% COMPOUND YIELD` with sparkles icon.
         - Countdown badge: `X Days to Next Rent`.
         - Target display: Target rent obligation for current property.
         - Dynamic Pitch Widget: Calculates prospective compound returns: `Earn up to +₦XX,XXX in compound returns. Save approx. ₦XX,XXX/month`.
         - Action Row: Primary button **Lock Rent Runway & Earn 14.5%** (routes to `/dashboard/savings`) + Secondary button **Pay Rent Early**.
       - **State C (Rent Due Soon ≤ 45 Days or Overdue)**:
         - Eyebrow: `UPCOMING RENT OBLIGATION` or red `OVERDUE RENT PAYMENT`.
         - Countdown badge: `Due in X Days` or red `X Days Overdue`.
         - Property label: `Target Rent Obligation · [Property Short Address]`.
         - Large bill amount to pay.
         - Action Row: Primary button **Pay Rent Now** (opens Unified Checkout) + Secondary button **Start Rent Vault for Next Year**.
  4. **Pillar 3: Upward Rent Score Card**:
     - Interactive card with press animation (`scale(0.985)`) routing to `/dashboard/score-breakdown`.
     - Left column:
       - Eyebrow: `Upward Rent Score`.
       - Score Value Row: Big bold score (e.g., `780`) + muted `/ 1000`.
       - Subtitle: `Verified Rental Reputation` (or `Starter Profile • Building Track Record` if unscored).
       - Action pill: `View full breakdown` with right chevron.
     - Right column:
       - Compact Apple-style activity ring gauge (rendered natively via `react-native-svg` conic arc or circular progress).
       - Inner ring text: Clean, single-line band label (`STARTER`, `BUILDER`, `PRIME`, `ELITE`) without multi-line wrapping + Rank badge (`Rank A`, `Rank B`).
  5. **Behavioral Metrics Strip**:
     - 3-column horizontal grid tracking tenant financial discipline:
       - **Payment Streak**: Flame icon 🔥, active orange accent when `streak > 0`, label `Payment Streak`.
       - **On-Time Rate**: Shield icon 🛡️, displays `onTimePct%`, label `On-Time Rate`.
       - **Profile Health**: Zap icon ⚡, displays `profileCompletion%`, label `Profile Health`.
  6. **Quick Direct Action Chips**:
     - Fast navigation pill buttons with Lucide icons:
       - `Rent Vault (14.5%)`: Landmark icon, secondary styling -> `/dashboard/savings`.
       - `Pay Rent`: Receipt icon, primary clay highlight -> `/dashboard/pay-rent`.
       - `Save for Home`: Home icon, secondary styling -> `/dashboard/save-for-home`.
  7. **Pillar 4: My Home Operations Hub (`MyHomeQuickHub`)**:
     - Strictly contained 2x2 grid designed to prevent horizontal overflow on compact viewports:
       - Tile 1: **Visitor Pass** (UserCheck icon, shell tint background, subtitle: `Gate access code`, routes to `/dashboard/my-home?tab=visitors`).
       - Tile 2: **Estate Bills** (Receipt icon, blue tint background, subtitle: `Service charge & power`, routes to `/dashboard/my-home?tab=bills`).
       - Tile 3: **Maintenance** (Wrench icon, amber tint background, subtitle: `Report repair ticket`, routes to `/dashboard/my-home?tab=complaints`).
       - Tile 4: **Tenancy Records** (FileText icon, green tint background, subtitle: `Lease & digital receipts`, routes to `/dashboard/receipts`).
  8. **Secondary Strategic Pillar Cards**:
     - **Emergency Cash Advance Card**:
       - Head: Sparkles icon, title `Emergency Cash Advance`, badge `Up to 40%`.
       - Body: `Borrow instantly against your rent vault balance during unforeseen shocks. Your remaining principal keeps compounding at 14.5% p.a.`
       - Footer: `Access Emergency Advance →` (routes to `/dashboard/savings`).
     - **Tenant Protection Package Card**:
       - Head: ShieldAlert icon, title `Tenant Protection Cover`, status pill (`Active` / `Inactive`).
       - Body: `Emergency Rent Relief, legal defense, and deposit protection underwritten for verified tenants.`
       - Footer: `View Coverage Details →` (routes to `/dashboard/benefits`).
  9. **Recent Transactions Feed**:
     - List of last 3 completed transactions with amount, date, status, and PDF receipt download action.

- **Small-Device Responsiveness (320px–375px)**:
  - All button pairs in `RentRunwayHero` and action rows must stack vertically with `flexDirection: 'column'` when screen width ≤ 375px.
  - Padding in cards must scale down from `18px` to `12px` to prevent text truncation.
  - Touch targets must strictly remain ≥ 44pt height per Apple Human Interface Guidelines and Google Material 3.

- **API Endpoints Ingested**:
  - `GET /user/auth/me` (Profile, properties, verification status)
  - `GET /user/auth/score-profile` (Score, rank, band, metrics, payment cycles)
  - `GET /rent-vaults/me` (Active vault, target, balance, accrued yield, DVA details)
  - `GET /payments/transactions/pending` (Pending rent invoices)
  - `GET /payments/transactions` (Completed payment ledger)
  - `GET /payments/rent-deposit` (Caution deposit balance)
  - `GET /payments/benefits/status` (Active protection policy)

---

#### Screen: Score Breakdown (`/dashboard/score-breakdown`)

- **Screen Header**:
  - Native back navigation button (`< ArrowLeft`).
  - Title: `Upward Rent Score™`.
  - Subtitle: `Your creditworthiness and verified rental track record across Nigeria.`
  - Top Action: **Share Profile Link** button. On press, copies vanity URL (`https://upward.goodtenants.io/profile/:slug`) to clipboard with native toast feedback, or triggers native OS share sheet (`expo-sharing`).

- **Hero Gauge Section**:
  - Large circular score gauge:
    - Diameter: `148px × 148px`.
    - Rendered via `react-native-svg` (`Circle` elements with `strokeDasharray` and `strokeDashoffset` animated with `react-native-reanimated`).
    - Color: Dynamic theme stroke (`var(--clay)` for verified, muted gray for unverified).
    - Center content: Numeric score (e.g., `780`) over max score (`/ 1000`).
    - Frosted Rank Floating Capsule: Positioned below circle displaying rank band (`Rank A`, `Rank B`, `Rank C`, `Rank D`, or `STARTER`) with glassmorphism background.
  - Descriptive Status Copy:
    - Scored & Verified: `Verified Rental Reputation • Score is calculated using on-time payment records, consistency streaks, and savings discipline.`
    - Unverified / Starter: `Starter Profile • Complete your profile and pay your rent through Upward to build an accredited score.`

- **5-Factor Analytics Grid**:
  - 5 comprehensive factor cards detailing scoring inputs:
    1. **Payment Timeliness (PT%)**:
       - Icon: Clock, Value: `XX%`.
       - Description: `How often you pay on or before the due date.`
    2. **Payment Consistency**:
       - Icon: Flame, Value: `X cycles`.
       - Description: `Your longest continuous streak of on-time rent cycles.`
    3. **Financial Discipline**:
       - Icon: Target, Value: `XX%`.
       - Description: `The ratio of full payments vs partial payments.`
    4. **Tenure**:
       - Icon: History, Value: `X yrs`.
       - Description: `Length of your verified rent payment history.`
    5. **Savings Bonus**:
       - Icon: TrendingUp, Value: `+XX pts` (Highlighted in green).
       - Description: `Bonus points awarded for your rent preparation savings in your Rent Runway Vault.`

- **Verified Payment Cycles Timeline**:
  - Inset card with table of verified rent payment cycles:
    - Columns: Billing Period / Due Date, Property Label, Amount (NGN), Status Badge, Score Impact Tag.
    - Status Badges:
      - `PAID_ON_TIME` / `PAID_BEFORE_DUE`: Clay/green highlight.
      - `PAID_LATE` / `PARTIAL_LATE` / `MISSED`: Error red highlight.
      - `PENDING`: Warning amber highlight.
    - Score Impact Tags:
      - `Positive` (TrendingUp icon, green badge).
      - `Neutral` (History icon, gray badge).
      - `Negative` (AlertCircle icon, red badge).
      - `No Impact` (Info icon, muted badge).

- **API Endpoint Ingested**:
  - `GET /user/auth/score-profile` (Returns `{ score, rank, band, maxScore, isScorable, metrics, cycles, profile }`).

---

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

### 6.9 Rent Savings Vault, 14.5% Yield & Emergency Liquidity Engine

The **Rent Runway Vault** is Upward’s flagship financial product. It enables tenants to systematically save for their upcoming annual or multi-month rent while earning **14.5% p.a. daily compounding mutual fund returns** underwritten by SEC-regulated asset management partners (ARM Connect). Crucially, it provides a built-in emergency liquidity buffer allowing tenants to borrow up to 40% of their saved funds without breaking their compounding cycle.

---

#### 1. Core Financial & Regulatory Mechanics

- **Underlying Asset & Custody**:
  - Regulated under Nigerian Securities & Exchange Commission (SEC) mutual fund frameworks.
  - Funds are placed in low-risk, high-liquidity Money Market Instruments via ARM Connect B2B2C integration.
- **Yield Calculation Engine**:
  - Annual Percentage Yield: **14.5% p.a.**
  - Compounding frequency: **Daily** (`dailyRate = annualRate / 365`).
  - Interest accrues every 24 hours directly onto the vault ledger:
    $$\text{Daily Accrual} = \text{Current Balance} \times \frac{0.145}{365}$$
- **Vault Lifecycle State Machine**:
  - `ACTIVE`: Vault funded, maturity-locked towards contractual rent date, earning daily compound yield.
  - `SETTLEMENT_READY`: Rent due date reached (`days_to_unlock <= 0`); unlocked for landlord settlement.
  - `SETTLED`: Rent disbursed directly to Landlord NUBAN via Paystack NIP rail with statutory receipt generated.
  - `BROKEN_OUT`: Vault liquidated early by tenant; principal returned, unvested yield forfeited.

---

#### 2. Screen: Rent Vault Dashboard (`/dashboard/savings`)

- **UI Elements & State Display**:
  - **Maturity Header**:
    - Eyebrow badge: `RENT VAULT · MATURITY LOCKED` (or `SETTLEMENT READY`).
    - Countdown pill: `X Days to Rent Day`.
    - Due Date label: `Target: ₦X,XXX,XXX due on [DD MMM YYYY]`.
  - **Balances & Progress**:
    - Large Primary Balance: Current saved amount in NGN (`₦X,XXX,XXX`).
    - Progress Bar: Completed percentage toward target (`target_completion_percentage%`).
  - **Accrued Yield Widget**:
    - Glowing emerald return box: `+₦XX,XXX profit earned (+₦XXX added today @ 14.5% p.a.)`.
  - **Quick Action Bar**:
    - Primary CTA: **Fund Vault** (opens Dedicated Virtual Account modal).
    - Secondary CTA: **Emergency Advance** (opens borrow up to 40% drawer).
    - Settlement CTA: **Execute Rent Settlement** (visible when `days_to_unlock <= 0`).
  - **Break-out Link**:
    - Understated footer link: `Need emergency funds? Break out of vault →`.
- **API Endpoints Ingested**:
  - `GET /rent-vaults/me`: Retrieves user's active vault, balances, accrued yield, and dedicated virtual account.

---

#### 3. Modal: Fund Vault via Dedicated Virtual Account (DVA) (`FundVaultModal`)

- **Purpose**: Zero-fee instant funding via standard Nigerian banking apps (GTBank, Access, Kuda, OPay, etc.).
- **UI Elements**:
  - Dedicated NUBAN Account Number (10 digits).
  - Bank Name (e.g., *Wema Bank* or *Providus Bank* via Monnify/Paystack DVA).
  - Account Name: `Upward / [Tenant Legal Name]`.
  - One-tap **Copy Account Number** button with native clipboard feedback.
  - Transfer instructions: *"Transfer any amount from your bank app. Funds reflect instantly and begin compounding immediately."*
  - Zero transaction fees notice.
- **Webhook Integration**:
  - Transfers are processed asynchronously via `POST /payments/webhooks/rent-savings/paystack`.
  - Mobile client listens to SSE stream or invalidates `rentVault` query on app resume from background.

---

#### 4. Setup Flow: Create Rent Vault (`/dashboard/savings/create`)

- **Step 1: Obligation Details**:
  - Target Rent Amount (`target_amount_kobo`).
  - Contractual Rent Due Date (`contractual_due_date`).
  - Linked Tenancy Property picker.
- **Step 2: Contribution Cadence**:
  - Frequency: `DAILY` | `WEEKLY` | `MONTHLY`.
  - Preferred Funding Method: `DVA` (Dedicated Account) or `CARD_TOKEN` (Automated card charge).
  - Payday preference: Day of month (1 to 31).
- **Step 3: Landlord Settlement Destination**:
  - Bank Code & Bank Name (from `GET /payments/banks`).
  - 10-digit NUBAN Account Number.
  - Real-time Account Name Verification (`GET /payments/verify-account`).
- **Submission**:
  - Calls `POST /rent-vaults`.
  - If tenant has not completed SEC Investor Suitability, immediately triggers `SavingsInvestorKycModal`.

---

#### 5. Drawer: Emergency Cash Advance (`/dashboard/savings/advance`)

- **Value Proposition**: Borrow up to 40% of saved vault balance during unexpected life shocks. **Crucially, the remaining 60% of the tenant's principal continues compounding at 14.5% p.a. without penalty.**
- **Rules & Constraints**:
  - Maximum Advance: `0.40 * current_balance_kobo`.
  - Fixed Processing Fee: **3.5% flat**.
  - Repayment Tenure: 30 days (repayable via card or deducted at rent maturity settlement).
- **Form UI**:
  - Amount slider / numeric input (constrained between ₦5,000 and max 40% eligibility).
  - Fee & Net Disbursement breakdown:
    - *Requested Advance*: ₦100,000
    - *Processing Fee (3.5%)*: ₦3,500
    - *Net Disbursed to Bank*: ₦96,500
  - Destination Account: Pre-filled verified tenant bank account.
- **API Call**:
  - `POST /rent-vaults/:id/advance/disburse`
  - Payload: `{ amount_kobo, destination_bank_code, destination_account_number, destination_account_name }`.
  - Disbursed instantly via Paystack NIP transfer.

---

#### 6. Modal: Rent Day Settlement (`/dashboard/savings/settle`)

- **Trigger**: When `days_to_unlock <= 0` or vault reaches contractual maturity date.
- **Settlement Execution**:
  - Automatically routes target rent directly to landlord's verified NUBAN bank account via NIP transfer rail.
  - **Surplus Allocation**: If `current_balance + accrued_yield > target_amount`, the surplus profit is automatically credited to the tenant's Upward wallet or refunded to their bank account (`disburse_surplus_to_wallet: true`).
  - **Statutory Receipt**: Generates official rent receipt compliant with Lagos State Tenancy Law 2011 (`GET /rent-vaults/:id/receipt.pdf`).
- **API Call**:
  - `POST /rent-vaults/:id/settlement/execute`
  - Payload: `{ landlord_bank_code, landlord_account_number, landlord_name, disburse_surplus_to_wallet: true }`.

---

#### 7. Sheet: Early Liquidation / Break-out (`/dashboard/savings/breakout`)

- **Purpose**: Emergency exit option if tenant needs their entire capital before rent day.
- **Forfeiture Terms**:
  - Principal saved is returned 100% to tenant bank account.
  - Unvested accrued compound yield is forfeited to liquidity reserve.
  - Outstanding emergency advances must be settled from principal.
- **Confirmation Dialog**:
  - Explicit warning alert detailing exact amounts to be received vs forfeited.
  - Two-step confirmation with PIN verification.
- **API Call**:
  - `POST /rent-vaults/:id/breakout`.

---

#### 8. Interactive Tool: Rent Savings Simulator (`/rent-calculator`)

- **Visual Slider Tool**:
  - Target Rent Obligation slider: ₦500,000 to ₦20,000,000.
  - Runway duration: 1 to 12 months.
- **Calculated Projections**:
  - Required Monthly / Weekly Deposit.
  - Projected 14.5% compound returns (e.g. `+₦185,400 earned`).
  - Comparison graph: Upward 14.5% Yield vs Traditional Commercial Bank (0%).
  - Unlocked Emergency Cash Advance Limit (40%).
- **API Call**:
  - `POST /rent-calculator/simulate`
  - Body: `{ targetAmountKobo, monthsRemaining, cadence }`.

---

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

### 6.18 Multi-Provider Identity & SEC Investor Suitability KYC

Upward deploys a multi-tiered identity and regulatory compliance engine designed to verify tenant identities without friction while satisfying stringent Nigerian Securities & Exchange Commission (SEC) requirements for high-yield mutual fund participation.

---

#### 1. Multi-Provider Identity Verification Engine (`/dashboard/verify-identity`)

- **Resilient Verification Cascade**:
  - The backend dynamically balances requests across 3 leading licensed identity providers:
    1. **Monnify KYC API** (Primary rail for fast BVN lookup)
    2. **Prembly / IdentityPass** (Secondary failover for BVN and NIN)
    3. **Dojah** (Tertiary failover with Virtual NIN support)
- **Supported Identity Documents**:
  - `BVN`: 11-digit Bank Verification Number.
  - `NIN`: 11-digit National Identification Number.
  - `VNIN`: 16-character Virtual NIN generated via the NIMC MWS mobile app (`*346*3*NIN*AgentID#`).
- **Fuzzy Name & Date-of-Birth Matching**:
  - Automatically matches provider identity records against the tenant’s registered first/last name.
  - Tolerates swapped name order (First/Last vs Last/First) and compound middle names (e.g. `John Michael` vs `John`).
  - Supports ISO `YYYY-MM-DD` and alphanumeric `DD-MMM-YYYY` (e.g., `18-DEC-1991`) dates of birth.
- **Data Protection & Masking**:
  - Cleartext BVN/NIN is never stored in the database.
  - A SHA-256 hash (`idNumberHash`) is generated to prevent duplicate multi-account abuse.
  - Display output is masked: `*******1234`.
- **API Endpoint**:
  - `POST /user/auth/verify-kyc`
  - Body: `{ "type": "BVN" | "NIN" | "VNIN", "idNumber": "12345678901" }`
  - Response: `{ success: true, message: "Identity verified successfully!" }`

---

#### 2. SEC Investor Suitability Onboarding Modal (`SavingsInvestorKycModal`)

- **Regulatory Purpose**:
  - Mandated by Nigerian SEC rules for collective investment schemes (CIS).
  - Unlocks tenant enrollment in the 14.5% p.a. ARM Money Market Fund B2B2C integration.
- **3-Step In-App Modal Flow**:
  - **Step 1: Regulatory Identity & Security**:
    - BVN (11 numeric digits, validated with regex `/^\d{11}$/`).
    - Mother's Maiden Name (text input, required by SEC for non-reversible investor verification).
  - **Step 2: Investor Suitability & Next of Kin**:
    - Occupation (text input).
    - Source of Funds selector (`Salary` | `Business` | `Savings` | `Investment`).
    - Income Range selector (`Below 500K` | `500K-1M` | `1M-5M` | `5M-10M` | `Above 10M`).
    - Next of Kin Full Name.
    - Next of Kin Relationship (`Spouse` | `Parent` | `Sibling` | `Child` | `Other`).
    - Next of Kin Phone Number (validated local/international format).
  - **Step 3: Settlement Bank Account**:
    - Bank Selector with top 16 commercial and fintech banks (GTBank, Access, Zenith, UBA, Moniepoint, Kuda, OPay, PalmPay, etc.).
    - 10-digit NUBAN Account Number.
    - Verified Account Name (auto-resolved via real-time NIP check).
- **API Endpoint**:
  - `POST /rent-vaults/onboard-investor`
  - Payload:
    ```json
    {
      "bvn": "12345678901",
      "mothers_maiden_name": "Adeyemi",
      "occupation": "Software Engineer",
      "source_of_funds": "Salary",
      "income_range": "1M-5M",
      "next_of_kin_name": "Jane Doe",
      "next_of_kin_relationship": "Spouse",
      "next_of_kin_phone": "+2348098765432",
      "settlement_bank_code": "058",
      "settlement_account_number": "0123456789",
      "settlement_account_name": "JOHN DOE",
      "settlement_bank_name": "Guaranty Trust Bank (GTBank)"
    }
    ```
  - Success Action: Triggers user profile refresh and marks `isInvestorKycCompleted = true`.

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
| `POST` | `/user/auth/verify-bvn` | Verify Bank Verification Number (Legacy KYC) |
| `POST` | `/user/auth/verify-kyc` | Multi-provider KYC verification (BVN, NIN, VNIN) |
| `POST` | `/user/auth/avatar-upload-url` | Generate presigned AWS S3 upload URL for avatar |
| `POST` | `/user/auth/delete-account/request-otp` | Request OTP for account closure |
| `POST` | `/user/auth/delete-account` | Permanently close and delete tenant account |

### Rent Passport & Scores
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/user/auth/score-profile` | Fetch authenticated user Rent Passport score, metrics & cycles |
| `GET` | `/public/profile/:slug` | Fetch public read-only Rent Passport profile |
| `GET` | `/user/auth/credibility-requests` | List past rent verification requests |
| `POST` | `/user/auth/request-records` | Request rent verification from past landlord |
| `GET` | `/public/credibility/request/:uuid` | Fetch public verification request details |
| `POST` | `/public/credibility/request/:uuid/fulfill` | Landlord fulfills past rent payment record |
| `GET` | `/user/auth/credibility/pdf` | Download official Rent Passport PDF summary |

### Rent Runway Vault & 14.5% Yield Engine
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/rent-vaults` | Create and initialize a new Rent Runway Vault |
| `POST` | `/rent-vaults/onboard-investor` | Submit SEC Investor Suitability and Next of Kin profile |
| `GET` | `/rent-vaults/me` | Fetch active vault, balances, 14.5% accrued yield & DVA |
| `POST` | `/rent-vaults/:id/advance/disburse` | Disburse emergency cash advance (up to 40% of vault balance) |
| `POST` | `/rent-vaults/:id/settlement/execute` | Execute rent-day landlord settlement and disburse surplus to wallet |
| `POST` | `/rent-vaults/:id/breakout` | Execute early break-out liquidation of vault |
| `GET` | `/rent-vaults/:id/receipt.pdf` | Download statutory Lagos State Tenancy Law 2011 rent receipt |
| `POST` | `/rent-calculator/simulate` | Simulate rent savings target, daily 14.5% returns & borrowing limits |
| `POST` | `/payments/webhooks/rent-savings/paystack` | Webhook handler for Dedicated Virtual Account (DVA) deposits |
| `POST` | `/payments/webhooks/rent-savings/arm` | Webhook handler for ARM Connect B2B2C status callbacks |

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

### Wallet
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/wallet` | Fetch tenant wallet balance & transactions |
| `POST` | `/wallet/fund` | Initialize wallet top-up via Paystack |

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
   For BVN, NIN, and OTP inputs, use `keyboardType="number-pad"` and implement automatic focus shifting to the next digit input on change.
6. **Hardware Back Button Handling (Android)**:
   Ensure the Android physical back button dismisses active bottom sheets, modals, and checkout drawers before exiting the current screen.
7. **Native SVG Circular Gauges (`react-native-svg` + `react-native-reanimated`)**:
   Do NOT use WebViews or HTML5 canvas to render the Rent Score and Rent Runway activity rings. Use `Svg`, `Circle`, and `G` from `react-native-svg` with `useAnimatedProps` from `react-native-reanimated`. This ensures 60–120fps GPU-accelerated stroke animation without frame drops even on budget Android devices.
8. **Small-Device Responsive Viewports (320px–375px)**:
   Many Nigerian tenants use compact smartphones (iPhone SE, Tecno Spark, Infinix Smart, itel). The UI must strictly follow these rules:
   - Never hardcode fixed pixel widths on buttons, action chips, or modal dialogs.
   - Button pairs in `RentRunwayHero` and action rows must automatically switch to `flexDirection: 'column'` with `width: '100%'` when viewport width ≤ 375px.
   - Card paddings should scale gracefully from `18px` to `12px` to prevent text truncation.
   - All interactive touch targets must strictly satisfy `minHeight: 44` / `minWidth: 44` per Apple HIG and Google Material standards.
9. **Bank Transfer Clipboard Flow & Background State Rehydration**:
   When a tenant taps "Copy Account Number" on the Dedicated Virtual Account (DVA) modal, they typically leave Upward to open their banking app (GTBank, Access, Kuda, OPay, etc.) to complete the NIP transfer.
   - When the user switches back to Upward, the app resumes from background (`AppState === 'active'`).
   - The app must immediately trigger:
     ```typescript
     queryClient.invalidateQueries({ queryKey: ['rentVault'] })
     queryClient.invalidateQueries({ queryKey: ['scoreProfile'] })
     queryClient.invalidateQueries({ queryKey: ['transactions'] })
     ```
   - When the Paystack/Monnify DVA webhook completes, the background SSE socket (`/payments/sse/:userUuid`) fires a `payment.succeeded` event. The app must catch this, play celebratory haptic feedback (`expo-haptics`), and update the 14.5% daily accrued profit ticker immediately.
10. **Client-Side SEC Regulatory PII Encryption**:
    Mother's Maiden Name, BVN, and Next of Kin identifiers are highly sensitive under NDPR (Nigeria Data Protection Regulation) and SEC standards.
    - Encrypt sensitive payloads using AES-256-GCM before persistent caching.
    - Never log investor suitability fields to client console logs or crash analytics.
    - Enforce SSL/TLS certificate pinning on mobile network requests using `@react-native-community/netinfo` and native network interceptors.
