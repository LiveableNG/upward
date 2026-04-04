---
trigger: always_on
---

# Upward Architecture & Coding Guidelines

This document outlines the standard architecture and implementation patterns for the **Upward Project** (NestJS Backend / Next.js Frontend). Follow these to maintain visual and structural consistency.

## 1. Backend: Server-Side Architecture (NestJS)

We follow a strict **Clean Architecture / Domain-Driven Design (DDD)** pattern.

### Layered Responsibilities

- **Domains (`src/domains`)**: Pure business logic and repository **interfaces**.
  - _RULE_: ZERO imports from other layers. Interfaces use `Symbol` for injection tokens (e.g., `export const USER_REPOSITORY = Symbol('USER_REPOSITORY')`).
- **Application (`src/application`)**: Use Cases and DTOs.
  - _RULE_: Each Use Case must be a single class with an `execute()` method.
  - _RULE_: DTOs use `class-validator`. For required properties, use the definite assignment assertion (e.g., `email!: string`).
- **Infrastructure (`src/infrastructure`)**: Concrete implementations (Prisma, external services like AWS S3).
- **Interfaces (`src/interfaces`)**: Controllers (REST/WebSockets).
  - _RULE_: Controllers MUST NOT contain business logic. They only invoke Use Cases.

### Authentication Pattern

- Use **HTTP-Only Cookies** for JWTs (`access_token`, `tenant_refresh`).
- Protect routes using `@UseGuards(JwtAuthGuard)`.

---

## 2. Frontend: Application Architecture (`upward-pay`)

Built with **Next.js App Router (15+)** and **Tanstack Query**.

### Data Fetching & State

- **Server Components**: Prefer Server Components for initial data fetching to eliminate client-side waterfalls.
- **Dynamic APIs**: Always `await searchParams` and `await cookies()` in Server Components.
- **Tanstack Query**: Use `useMutation` for all POST/PATCH/DELETE actions. Integrate with `useQueryClient` for cache invalidation.
- **Forms**: Use `react-hook-form` + `zod` for all inputs. Implement `useWatch` for dynamic UI reactions.

### CSS & Design System

- **Vanilla CSS**: We use a custom, premium design system. Do NOT use Tailwind unless explicitly requested.
- **Design Tokens**: All colors, spacing, and radii must come from `src/styles/variables.css`.
  - _Key Tokens_: `--clay` (Primary), `--dark` (Surface), `--bg` (Background), `--text-muted`.
- **BEM Naming**: Follow the Block Element Modifier naming convention (e.g., `.onboarding__input--error`).

### UI/UX Standards

- **Icons**: ALWAYS use `lucide-react`. Never use emojis.
- **Branding**: Use verified SVG components like `UpwardLogo` for consistency.
- **Feedback**: Implement skeleton loaders (`animate-pulse`) for transition states.
- **Immediate Sync**: In multi-step flows, sync user data to the backend as early as possible (Partial Syncing).

---

## 3. Pre-flight Checklist for Future Agents

1. Did I register the new Use Case in `ApplicationModule.ts`?
2. Did I export/import the correct CSS variables?
3. Did I `await` the dynamic App Router APIs?
4. Is this form using `react-hook-form` with a `zod` resolver?
5. Does the UI follow the BEM naming standard for CSS?
