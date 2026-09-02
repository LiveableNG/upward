#!/bin/sh

# Exit immediately if a command fails
set -e

echo "=========================================="
echo "  Xcode Cloud: Running Post-Clone Setup   "
echo "=========================================="

# Resolve repository root
if [ -n "$CI_PRIMARY_REPOSITORY_PATH" ]; then
    REPO_ROOT="$CI_PRIMARY_REPOSITORY_PATH"
elif [ -n "$CI_WORKSPACE" ]; then
    REPO_ROOT="$CI_WORKSPACE"
else
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

echo "Repository Root: $REPO_ROOT"
cd "$REPO_ROOT"

# Ensure Homebrew / Node environment paths are available in Xcode Cloud
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Check Node version
if command -v node >/dev/null 2>&1; then
    echo "Node version: $(node -v)"
else
    echo "ERROR: Node.js is not installed on this Xcode Cloud runner."
    exit 1
fi

# Enable corepack or install pnpm
if ! command -v pnpm >/dev/null 2>&1; then
    echo "Installing pnpm globally..."
    npm install -g pnpm@10
fi

echo "pnpm version: $(pnpm -v)"

# Install JavaScript dependencies for the workspace
echo "Installing dependencies via pnpm..."
pnpm install --frozen-lockfile || pnpm install

# Run Capacitor sync for iOS
echo "Syncing Capacitor iOS..."
cd "$REPO_ROOT/client/apps/upward-pay"
pnpm cap:sync || npx cap sync ios

echo "=========================================="
echo "  Xcode Cloud Setup Completed Successfully"
echo "=========================================="
