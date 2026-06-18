# Legacy React homepage

Archived on 2026-06-17 when the root `/` route switched to the static HTML landing page (`public/landing.html`).

## Contents

- `page.tsx` — previous Next.js homepage with multi-panel views (home / why / fairness / PM)
- `index.html` — earlier static HTML snapshot from the web app root
- `sections/` — all homepage section components

## Still in use elsewhere

These were **not** archived because other routes depend on them:

- `src/components/layout/header.tsx`
- `src/components/layout/footer.tsx`

## Restoring the old homepage

1. Restore `page.tsx` from this folder to `src/app/page.tsx`
2. Restore section components to `src/components/sections/`
3. Remove the `/` → `/landing.html` rewrite in `src/middleware.ts`
