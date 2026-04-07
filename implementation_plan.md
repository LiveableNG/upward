# B2B Platform Schema Restructure & API Integration

This plan outlines the architectural changes required to introduce the Upward B2B (Third-Party Software Platform) capabilities. It covers the schema refactoring from "Tenants" to a more generalized "Users" structure, the addition of Company/Manager/Property models, PII encryption, and the external API setup.

## User Review Required

> [!WARNING]  
> **Major Database Refactoring & "Tenant" to "User" Migration**
> The current schema heavily relies on `upward_user`. You requested `users` instead. 
> To align with this, the plan proposes replacing the concept of `upward_user` entirely with `upward_user`. This means existing fields like `fullName` will be split/replaced with `first_name` and `last_name`, and references across the DB (`wallet`, `savings_goal`, `payment_requests`) will be updated from `tenantId` to `userId`. 
> Is this acceptable, or would you prefer a new `upward_user` table that exists alongside `upward_user`? 

> [!IMPORTANT]  
> **PII Encryption Mechanism**
> The database cannot easily index or search natively encrypted text (like email checking during login). To encrypt `first_name`, `last_name`, `phone`, and `email`, the best approach is to either:
> 1. Use **Prisma Field Encryption** (`@prisma/extension-field-encryption`), which handles encryption seamlessly but makes direct DB querying limits (like `findUnique` by email requires a deterministic encryption or blind index).
> 2. Use a **hashed email index** (e.g., `email_hash`) for quick lookups while keeping the actual `email` column encrypted.
> Does a deterministic encryption (approach 2) sound good to you for the email and phone fields? 

## Proposed Changes

---

### Database Schema (Prisma)

We will redefine the Prisma schema to introduce the B2B entities and update the user model.

#### [MODIFY] `schema.prisma`
*   **Rename & Refactor `upward_user` -> `upward_user`:**
    *   Add: `firstName`, `lastName`, `uuid`. (Drop `fullName`).
    *   Fields marked for encryption (PII): `firstName`, `lastName`, `phone`, `email`.
*   **New Entities:**
    *   `upward_company`: `id`, `uuid`, `name`, `address`, `webhook_url`, `apiKey` (Hashed for 3rd party Auth).
    *   `upward_company_user`: Junction table with `id`, `companyId`, `userId`, `invitedAt`, `acceptedAt`.
    *   `upward_manager`: `id`, `uuid`, `companyId`, `firstName`, `lastName`, `phone`, `email`.
    *   `upward_location`: `id`, `uuid`, `country`, `state`, `area`, `subarea`.
    *   `upward_user_property`: `id`, `userId`, `companyId`, `rentAmount`, `managerId`, `rentStartDate`, `rentEndDate`, `locationId`.
*   **Update `upward_payment_request`:**
    *   Rename `tenantId` to `userId`. Add relations to `upward_user_property` so that payments can track rent.

---

### Application Layer (Backend Integration)

#### [NEW] `server/apps/api/src/domains/companies/`
*   **Interfaces**: `company.repository.ts`, `manager.repository.ts`.
*   Define the domains for the B2B entities.

#### [NEW] `server/apps/api/src/application/use-cases/third-party/`
*   `InviteUsersUseCase.ts`: Handles single or bulk payload of users, generated UUID tokens, and upserts generic user data. Emits physical invite links. Does not overwrite existing user profiles.

#### [NEW] `server/apps/api/src/interfaces/http/third-party/`
*   **API Auth Guard**: `ThirdPartyApiKeyGuard.ts` checking the `x-api-key` header against the `upward_company.apiKey`.
*   **Controller**: `ThirdPartyIntegrationController.ts` exposing `POST /v1/external/invites`.

#### [MODIFY] `server/apps/api/src/domains/users/user.repository.ts` (formerly TenantRepo)
*   Modify the repository and NestJS Service files (e.g., Auth, Payments) to point to `upward_user` instead of `upward_user`.

---

### Frontend Layer (Upward-Pay Next.js)

#### [NEW] `client/apps/upward-pay/src/app/invite/[uuid]/page.tsx`
*   **Dynamic Invite UI**: Reads the `uuid` from the URL, calls a new public endpoint (`GET /api/v1/public/invites/:uuid`) to fetch the inviter details (company logo, role, property info) and pre-fill the tenant data.

#### [MODIFY] `client/apps/upward-pay/src/app/signup/page.tsx`
*   **Seamless Onboarding**: If coming from an invite link, streamline the UI so the user only needs to verify the pre-filled data and choose a password.

## Open Questions

1.  **UUID vs ID generation:** Standard `uuid()` from Prisma will be used for both ID and UUID columns if requested, but normally `id` is the primary key UUID. Do you specifically want an integer `id` AND a string `uuid`, or is `id String @id @default(uuid())` sufficient?
2.  **API Key Management:** Do you want an endpoint in an Admin dashboard to generate and revoke API keys for these companies, or should we seed the first ones manually for now?

## Verification Plan

### Automated Tests
- Scaffold standard NestJS unit tests for the `InviteUsersUseCase` ensuring bulk inserts don't overwrite existing users.

### Manual Verification
1.  **DB Check**: Run migrations and verify schema changes manually using `npx prisma studio`.
2.  **Third Party Request**: Mock a property manager making a `POST /v1/external/invites` call via cURL with a generated API Key. Verify the response contains the unique invite links.
3.  **Frontend Flow**: Open the generated invite link (`http://localhost:3000/invite/<uuid>`), verify it displays the company information, and proceed via signup to create the password. Check that the `companies_users.acceptedAt` gets populated.
