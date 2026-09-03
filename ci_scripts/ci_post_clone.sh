#!/bin/sh

# Exit immediately if a command fails
set -e

echo "=========================================="
echo "  Xcode Cloud: Running Post-Clone Setup   "
echo "=========================================="

# Prevent Homebrew from spending minutes updating formulas during CI
export HOMEBREW_NO_AUTO_UPDATE=1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

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

# Ensure Node.js is available on Xcode Cloud runner
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js not found in PATH. Attempting Homebrew install..."
    if command -v brew >/dev/null 2>&1; then
        brew install node || true
    fi
fi

# Fallback: Download portable Node.js binary if brew didn't install node
if ! command -v node >/dev/null 2>&1; then
    echo "Downloading standalone Node.js binary..."
    NODE_VERSION="v20.18.0"
    ARCH="$(uname -m)"
    if [ "$ARCH" = "arm64" ]; then
        NODE_DIST="node-${NODE_VERSION}-darwin-arm64"
    else
        NODE_DIST="node-${NODE_VERSION}-darwin-x64"
    fi
    curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/${NODE_DIST}.tar.gz" | tar -xz -C /tmp
    export PATH="/tmp/${NODE_DIST}/bin:$PATH"
fi

echo "Node version: $(node -v)"

# Ensure pnpm is installed
if ! command -v pnpm >/dev/null 2>&1; then
    echo "Installing pnpm..."
    npm install -g pnpm@10
fi

echo "pnpm version: $(pnpm -v)"

# Install dependencies for the workspace
echo "Installing JS dependencies..."
pnpm install --frozen-lockfile || pnpm install

# Run Capacitor sync for iOS
echo "Syncing Capacitor iOS..."
cd "$REPO_ROOT/client/apps/upward-pay"
NEXT_OUTPUT=export pnpm cap:sync || (NEXT_OUTPUT=export next build && npx cap sync ios)

echo "=========================================="
echo "  Xcode Cloud Setup Completed Successfully"
echo "=========================================="
