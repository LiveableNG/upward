# Revised Auth Strategy: HTTP-Only Cookies & Feature-Based Organization

Eliminate `localStorage` usage by moving the Access Token to an HTTP-Only cookie and refactor the `upward-pay` authentication logic to follow the repository's feature-based architecture.

## User Review Required

> [!IMPORTANT]
> **Complete Cookie Auth**: Access tokens will now be stored in HTTP-only cookies. This means they are automatically sent by the browser/Capacitor but are inaccessible to JavaScript, significantly reducing XSS risks.
> **LocalStorage Deprecation**: `localStorage` will no longer be used for tokens or user profile data; state will be managed in memory (via hooks) or fetched from a `/me` endpoint.

## Proposed Changes

---

### [Component] Backend (server/apps/api)

#### [MODIFY] [jwt.strategy.ts](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/server/apps/api/src/auth/strategies/jwt.strategy.ts)

- Update to extract the access token from both the `Authorization` header AND an `access_token` cookie.

#### [MODIFY] [auth.controller.ts](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/server/apps/api/src/auth/auth.controller.ts) & [tenant.controller.ts](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/server/apps/api/src/tenant/tenant.controller.ts)

- Update standard cookie-setting logic to include an `access_token` cookie (short-lived) alongside the `refresh_token` (long-lived).
- Ensure both are `httpOnly`, `secure`, and correctly configured for cross-domain usage where necessary.

---

### [Component] Frontend (client/apps/upward-pay)

#### [MODIFY] [api-client.ts](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/client/apps/upward-pay/src/lib/api-client.ts)

- **REMOVE** `localStorage` token extraction and the `Authorization` header logic.
- Rely solely on `{ credentials: 'include' }` for session management.

#### [MOVE] [Auth Feature Reorganization](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/client/apps/upward-pay/src/features/auth)

- **Components**: Place `LoginForm` and `SignupForm` inside `src/features/auth/component/`.
- **Services**:
  - [authService.ts](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/client/apps/upward-pay/src/features/auth/services/authService.ts): Update to match new endpoint behaviors.
  - [tokenService.ts](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/client/apps/upward-pay/src/features/auth/services/tokenService.ts): **DEPRECATE** or replace with logic that manages in-memory authentication state (no `localStorage`).
- **Hooks**:
  - [useLogin.tsx](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/client/apps/upward-pay/src/features/auth/hooks/useLogin.tsx): Refactor to use the new service and handle redirection without manual token setting.
  - [NEW] `useSignup.tsx`: Implement multi-step signup hook logic.

#### [MODIFY] [App Pages](file:///c:/Users/owner/Desktop/2025/Good%20Tenant/upward/client/apps/upward-pay/src/app)

- Update `/login` and `/signup` to use components from the `features/auth` layer.

---

## Open Questions

1. **In-Memory State**: Since we are removing `localStorage`, would you like a React Context provider specifically for the user profile, or should we continue using a base hook that fetches from `/me`?
2. **Capacitor Specifics**: For the mobile app, we'll assume the CapacitorHttp plugin is used or the webview handles cookies correctly between domains. Does your setup require specific CORS headers for a specific mobile app origin?

## Verification Plan

### Automated Verification

- Backend tests to ensure cookies are set in the response headers of `/auth/login` and `/tenant/auth/login`.

### Manual Verification

- Log in and verify that no `upward_token` exists in Application -> Local Storage.
- Verify that standard API requests (e.g., getting dashboard data) still work (headers should include the cookies automatically).
