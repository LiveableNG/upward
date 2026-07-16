#!/usr/bin/env bash
#
# Upward production deploy — run on the EC2 box only.
#
# Invoked by deploy-hook:
#   bash /var/www/upward/scripts/deploy.sh
#
# Or manually from the server:
#   cd /var/www/upward && bash scripts/deploy.sh
#
# Env (optional, set by deploy-hook):
#   DEPLOY_BRANCH  — git branch (default: production)
#   DEPLOY_COMMIT  — commit sha (informational)
#   DEPLOY_PUSHER  — who pushed (informational)
#   APP_DIR        — override install path (default: /var/www/upward)
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/upward}"
BRANCH="${DEPLOY_BRANCH:-production}"
COMMIT="${DEPLOY_COMMIT:-unknown}"
PUSHER="${DEPLOY_PUSHER:-unknown}"
API_DIR="$APP_DIR/server/apps/api"
ECOSYSTEM="$APP_DIR/devops/ecosystem.config.js"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/api/v1/health}"

log() {
  echo "[upward-deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

die() {
  log "ERROR: $*"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

log "start branch=$BRANCH commit=$COMMIT pusher=$PUSHER"

[[ -d "$APP_DIR/.git" ]] || die "not a git repo: $APP_DIR"
[[ -f "$ECOSYSTEM" ]] || die "missing PM2 ecosystem: $ECOSYSTEM"

require_cmd git
require_cmd pnpm
require_cmd node
require_cmd pm2

cd "$APP_DIR"

# ---------------------------------------------------------------------------
# Code
# ---------------------------------------------------------------------------

log "git fetch/pull origin/$BRANCH"
git fetch --prune origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# Confirm we landed on the expected commit when deploy-hook provided one
if [[ "$COMMIT" != "unknown" && "$COMMIT" =~ ^[a-f0-9]{7,40}$ ]]; then
  HEAD="$(git rev-parse HEAD)"
  if [[ "$HEAD" != "$COMMIT"* && "$COMMIT" != "$HEAD"* ]]; then
    log "WARN: HEAD=$HEAD does not match DEPLOY_COMMIT=$COMMIT (continuing with HEAD)"
  fi
fi

log "HEAD=$(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

log "pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Shared packages → API (migrate + build)
# ---------------------------------------------------------------------------

log "build shared packages"
pnpm --filter @upward/shared-types build
pnpm --filter @upward/common-utils build

log "prisma generate + migrate deploy"
cd "$API_DIR"
pnpm prisma:generate
pnpm exec prisma migrate deploy --schema=prisma/schema

log "build @upward/api"
pnpm build
cd "$APP_DIR"

# Nest may emit dist/main.js or dist/src/main.js depending on tsconfig layout
API_ENTRY=""
if [[ -f "$API_DIR/dist/src/main.js" ]]; then
  API_ENTRY="$API_DIR/dist/src/main.js"
elif [[ -f "$API_DIR/dist/main.js" ]]; then
  API_ENTRY="$API_DIR/dist/main.js"
else
  die "API build produced no dist main.js (checked dist/main.js and dist/src/main.js)"
fi
log "API entry: $API_ENTRY"

# Keep ecosystem in sync with whichever path Nest emitted
if [[ "$API_ENTRY" == *"/dist/src/main.js" ]]; then
  EXPECTED_SCRIPT="dist/src/main.js"
else
  EXPECTED_SCRIPT="dist/main.js"
fi
if ! grep -q "$EXPECTED_SCRIPT" "$ECOSYSTEM"; then
  log "WARN: devops/ecosystem.config.js may not point at $EXPECTED_SCRIPT — check PM2 script path"
fi

# ---------------------------------------------------------------------------
# Frontends
# ---------------------------------------------------------------------------

log "build @upward/web (gateway :3000)"
pnpm --filter @upward/web build

log "build upward-pay (:3001)"
pnpm --filter upward-pay build

log "build upward-pm (:3002)"
pnpm --filter upward-pm build

log "build @upward/admin-site (static → Nginx)"
pnpm --filter @upward/admin-site build

[[ -d "$APP_DIR/client/apps/admin-site/dist" ]] \
  || die "admin-site build missing client/apps/admin-site/dist"

# ---------------------------------------------------------------------------
# Process manager
# ---------------------------------------------------------------------------

LOG_DIR="${LOG_DIR:-/var/log/upward}"
if [[ ! -d "$LOG_DIR" ]]; then
  if mkdir -p "$LOG_DIR" 2>/dev/null; then
    :
  else
    die "cannot create $LOG_DIR — run once on the server: sudo mkdir -p $LOG_DIR && sudo chown $(whoami):$(whoami) $LOG_DIR"
  fi
elif [[ ! -w "$LOG_DIR" ]]; then
  die "$LOG_DIR is not writable by $(whoami) — run: sudo chown $(whoami):$(whoami) $LOG_DIR"
fi

log "pm2 restart / start"
if pm2 describe upward-api >/dev/null 2>&1; then
  pm2 restart upward-api upward-web upward-pay upward-pm --update-env
else
  pm2 start "$ECOSYSTEM" --env production
fi
pm2 save

# ---------------------------------------------------------------------------
# Smoke check (best-effort — don't fail deploy if health is slow)
# ---------------------------------------------------------------------------

log "waiting for API health: $HEALTH_URL"
OK=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    OK=1
    break
  fi
  sleep 2
done

if [[ "$OK" -eq 1 ]]; then
  log "health check OK"
else
  log "WARN: health check did not pass within ~20s — inspect: pm2 logs upward-api"
fi

log "pm2 status"
pm2 status || true

log "done"
