# Task Breakdown: B2B Schema Restructure & API Integration

- `[ ]` **Phase 1: Database Schema & Prisma Configuration**
  - `[ ]` Update `schema.prisma` to replace `upward_user` with `upward_user`.
  - `[ ]` Add `id Int @id @default(autoincrement())` and `uuid String @unique @default(uuid())` to all models.
  - `[ ]` Split `fullName` into `firstName` and `lastName`.
  - `[ ]` Add B2B models: `upward_company`, `upward_company_user`, `upward_manager`, `upward_location`, `upward_user_property`.
  - `[ ]` Update foreign keys (e.g., `tenantId` to `userId`).
  - `[ ]` Configure Prisma field encryption for PII fields (`firstName`, `lastName`, `phone`, `email`) and add `emailHash` / `phoneHash` for querying.
  - `[ ]` Create and run DB migration.

- `[ ]` **Phase 2: Backend Codebase Refactor**
  - `[ ]` Refactor interfaces and repositories (e.g., `TenantRepository` -> `UserRepository`).
  - `[ ]` Fix all compilation errors across use-cases, services, and controllers due to schema changes.
  - `[ ]` Update data seed scripts with new models and manual Company API Keys.

- `[ ]` **Phase 3: B2B Invite API Integration**
  - `[ ]` Create `ThirdPartyApiKey` auth guard.
  - `[ ]` Build `InviteUsersUseCase` supporting bulk uploads.
  - `[ ]` Create HTTP controller for `POST /v1/external/invites`.
  - `[ ]` Create public endpoint `GET /v1/public/invites/:uuid` for fetching pre-filled metadata.

- `[ ]` **Phase 4: Frontend Upward-Pay Updates**
  - `[ ]` Build dynamic route `app/invite/[uuid]/page.tsx` showing the inviter details.
  - `[ ]` Hook the invite flow into the `signup` page, allowing the user to simply verify details and choose a password.

- `[ ]` **Phase 5: Verification**
  - `[ ]` Confirm backend build succeeds.
  - `[ ]` Test DB CRUD with Prisma Studio or scripts.
  - `[ ]` Perform manual Third-Party curl API request.
  - `[ ]` Verify UI flow.
