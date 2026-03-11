// @ts-check

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce lowercase type
    'type-case': [2, 'always', 'lower-case'],
    // Allowed commit types (conventional commits + extras for this project)
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Code style (formatting, semicolons, etc.)
        'refactor', // Code change (no feature, no fix)
        'perf', // Performance improvement
        'test', // Adding / updating tests
        'build', // Build system or external dependencies
        'ci', // CI/CD changes
        'chore', // Other (e.g. updating .gitignore)
        'revert', // Revert a previous commit
        'wip', // Work in progress (for draft branch pushes only)
      ],
    ],
    // Cap subject length
    'subject-max-length': [2, 'always', 100],
    // No full stop at end of subject
    'subject-full-stop': [2, 'never', '.'],
  },
}
