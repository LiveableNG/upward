# 4. Git Workflow & Branching Guidelines

This guide describes how to manage code contributions, branch strategy, pull requests, and automated deployments.

---

## 1. Branch Strategy

We maintain two primary deployment branches:

```
production (Live Release) ──► Deploys to https://upward.goodtenants.io
   ▲
   │ (Merge verified releases)
   │
dev (Integration/Staging) ───► Deploys to https://upward-web.vercel.app
   ▲
   ├── feat/user-dashboard (Developer Feature)
   ├── fix/webhook-timeout (Developer Bugfix)
   └── chore/dep-update    (Developer Chore)
```

### 1.1 Development Branches
*   **`dev`**: This is our main integration branch. All developers branch off `dev` and merge their completed features/fixes back into `dev` via Pull Requests.
*   **`production`**: This is the live production branch. Once code is tested and verified on the staging deployment, `dev` is merged into `production`.

### 1.2 Feature/Fix Branches
When writing code, create a descriptive branch off `dev`:
*   `feat/[short-description]` for new features (e.g. `feat/dva-payouts`).
*   `fix/[short-description]` for bug fixes (e.g. `fix/validation-error`).
*   `chore/[short-description]` for maintenance tasks (e.g. `chore/update-readme`).

---

## 2. Commit Format (Conventional Commits)

Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) format. This format is enforced via a Git pre-commit hook (powered by `commitlint` and `husky`).

### Format
```
<type>(<scope>): <subject>
```

### Examples
*   `feat(payments): integrate dedicated virtual accounts`
*   `fix(auth): correct token refresh interceptor fallback`
*   `docs(readme): add onboarding links`

### Allowed Types
`feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `chore` · `revert`

---

## 3. Contribution Workflow

1.  **Sync Local Repository**: Ensure your local `dev` branch is up to date:
    ```bash
    git checkout dev
    git pull origin dev
    ```
2.  **Create your Branch**:
    ```bash
    git checkout -b feat/add-kyc-documents
    ```
3.  **Code and Commit**: Commit changes using the conventional commit structure.
4.  **Push Changes**:
    ```bash
    git push origin feat/add-kyc-documents
    ```
5.  **Submit Pull Request**: Open a PR on GitHub targeting the `dev` branch.
6.  **Continuous Integration**: Vercel will automatically build a deployment preview. Check the preview to verify functionality.
7.  **Review & Merge**: Once the code is reviewed and approved, it will be merged into `dev`.
8.  **Staging Testing**: Verify your merged change on the staging environment: [https://upward-web.vercel.app](https://upward-web.vercel.app).
9.  **Deploying to Production**: Verified features on `dev` will be packaged and merged into `production` to go live at [https://upward.goodtenants.io](https://upward.goodtenants.io).
