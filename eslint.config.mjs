// @ts-check
import tseslint from 'typescript-eslint'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/build/**',
      'client/apps/web/next-env.d.ts',
      'common/shared-types/dist/**',
    ],
  },

  // ── TypeScript — all workspaces ────────────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: tseslint.configs.recommended,
    rules: {
      // Enforce `import type` for type-only imports (helps tree-shaking)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Warn on unused vars but allow leading-underscore prefix to opt out
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Warn rather than error to avoid blocking iteration speed
      '@typescript-eslint/no-explicit-any': 'warn',
      // No floating (unhandled) promises
      '@typescript-eslint/no-floating-promises': 'off', // requires type-info; enable later
      // Allow `require()` only in config files
      '@typescript-eslint/no-require-imports': 'error',
    },
  },

  // ── DDD Layer Restrictions (server/apps/api) ──────────────────────────────
  {
    files: ['server/apps/api/src/interfaces/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@domains/*'],
              message:
                'Interfaces must not depend directly on domains. Use the application layer (@application).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['server/apps/api/src/domains/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@shared/infrastructure/*', '@application/*', '@interfaces/*'],
              message: 'Domains must be pure and have no dependencies on other layers.',
            },
          ],
        },
      ],
    },
  },

  // ── Backend (NestJS) — relax rules that conflict with DI patterns ──────────
  {
    files: ['server/apps/api/**/*.ts'],
    rules: {
      // DISABLE THE RULE THAT BREAKS NESTJS DI
      // NestJS needs classes (values) for metadata reflection/injection
      '@typescript-eslint/consistent-type-imports': 'off',
      // NestJS modules, guards, interceptors etc. are empty classes by design
      '@typescript-eslint/no-extraneous-class': 'off',
      // NestJS uses parameter decorators that look like "unused" params
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ── Packages (shared-types, utils) — no project reference needed ──────────
  {
    files: ['common/**/*.ts', 'client/libs/**/*.ts', 'server/libs/**/*.ts'],
    rules: {
      // Packages export types only; empty export is OK
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // ── Admin-site (Vite/React) — react-refresh plugin ────────────────────────
  // lint-staged runs eslint from the repo root so only this config is loaded;
  // we must register the plugin here so its rules are recognised.
  {
    files: ['client/apps/admin-site/**/*.{ts,tsx}'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
)
