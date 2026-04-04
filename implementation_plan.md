# Implementation Plan - Optimized Tenant Onboarding & Conversion

This plan implements a high-performance onboarding flow for both invited and waitlist users, leveraging Next.js Server Components for initial data fetching and Tanstack Query for client-side interactivity.

## User Review Required

> [!IMPORTANT]
> **Performance Optimization**: The invitation landing page (`/`) will now fetch data server-side to eliminate client-side waterfalls and improve perceived performance.
> **Database**: We are adding `isConvertedFromWaitlist` to the `upward_tenant` table to track users coming from the launch campaign.
> **Deep Linking**: Mobile app detection will be handled via a lightweight client-side overlay to avoid blocking the initial server-render.

## Proposed Changes

### 1. Backend Implementation (`server/apps/api`)

#### [MODIFY] [schema.prisma](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/server/apps/api/prisma/schema.prisma)

- Update `upward_tenant` model:
  - `invitedByCompanyId`, `invitedByCompanyName`, `invitedByCompanyLogo` (String?)
  - `rentAnniversary` (DateTime?)
  - `address` (String?)
  - `occupation`, `gender`, `dateOfBirth` (String?)
  - `isConvertedFromWaitlist` (Boolean @default(false))

#### [NEW] Domain & Application Layers

- **Domain**: Create `TenantRepository` interface in `src/domains/users/tenant.repository.ts`.
- **Application**: Create `CompleteTenantProfileUseCase` in `src/application/use-cases/tenant/complete-tenant-profile.use-case.ts`.
  - Logic: Upsert `Tenant` record based on email, link to waitlist if applicable (set `isConvertedFromWaitlist: true`), and store profile details.
- **Module**: Register new use case in `ApplicationModule.ts`.

#### [NEW] Infrastructure & Interfaces

- **Infrastructure**: Implement `PrismaTenantRepository` in `src/shared/infrastructure/prisma/repositories/prisma-tenant.repository.ts`.
- **Interface**: Create `TenantController` in `src/interfaces/http/controllers/tenant.controller.ts` with `POST /tenants/complete-profile`.
- **Registration**: Update `HttpModule.ts`.

### 2. Frontend Implementation (`upward-pay`)

#### [MODIFY] Next.js Infrastructure

- Integrate `@tanstack/react-query` for client-side mutations.
- Use `fetch` with Next.js caching (`force-cache` or ISR) for initial invitation data.

#### [MODIFY] [page.tsx](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/client/apps/upward-pay/src/app/page.tsx) (Landing Page)

- **Server Fetching**: Fetch invitation data using a Server Component.
- **Streaming**: Wrap invitation content in `<Suspense>` with a Skeleton placeholder.
- **Deep Link Logic**: Use a lightweight client-side Hook for `upwardpay://` redirection.
- **UI**: Premium design using Lucide icons (e.g., `Rocket`, `Verified`, `CreditCard`) instead of emojis.

#### [NEW] [page.tsx](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/client/apps/upward-pay/src/app/complete-profile/page.tsx)

- Unified multi-step flow using a Client Component for state management.
- **Interactivity**: Use `useMutation` (Tanstack Query) for the final profile submission to handle loading/error states gracefully.
- Fields: Rent Anniversary (with date picker), Full Address, Occupation, etc.

#### [NEW] Reusable Components

- **PoweredByUpward**: Optimized logo with `next/image`.
- **CompanyHeader**: Server component for displaying company metadata.
- **OnboardingCard**: General wrapper for consistency.

### 3. Styling & Optimization

#### [NEW] [onboarding.css](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/client/apps/upward-pay/src/styles/onboarding.css)

- Optimized BEM styles.
- Integrated Project Variables.

## Verification Plan

### Automated

- `npx prisma migrate dev` to verify schema.
- Backend unit tests for `CompleteTenantProfileUseCase`.

### Manual

- **Performance**: Verify 0% client JS for the initial landing page render (except for deep linking logic).
- **Functionality**:
  - Invitation Link -> Prefill -> Complete Profile -> Check DB for correct flags.
  - Waitlist Flow (Email only) -> Complete Profile -> Verify `isConvertedFromWaitlist` is `true`.
- **Visuals**: Audit Lucide icon usage and ensure no emojis remain.
