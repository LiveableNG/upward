// @ts-check
import tseslint from 'typescript-eslint'

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
      'apps/client/next-env.d.ts',
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

  // ── Backend (NestJS) — relax rules that conflict with DI patterns ──────────
  {
    files: ['apps/server/**/*.ts'],
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
    files: ['packages/**/*.ts'],
    rules: {
      // Packages export types only; empty export is OK
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
)
