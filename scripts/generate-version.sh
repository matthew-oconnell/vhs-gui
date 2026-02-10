#!/bin/bash
# Generates version.json with build metadata
# This file is imported by the frontend during build

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_FILE="$PROJECT_ROOT/src/frontend/src/version.json"

# Ensure the file exists before TypeScript compilation
# This prevents build errors when version.json doesn't exist yet
if [ ! -f "$OUTPUT_FILE" ]; then
    cp "$PROJECT_ROOT/src/frontend/src/version.json.template" "$OUTPUT_FILE" 2>/dev/null || true
fi

# Read version from tauri.conf.json
VERSION=$(grep '"version"' "$PROJECT_ROOT/src/frontend/src-tauri/tauri.conf.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')

# Get current date in YYYY-MM-DD format
BUILD_DATE=$(date +%Y-%m-%d)

# Get git commit hash (short form)
if git rev-parse --git-dir > /dev/null 2>&1; then
    GIT_HASH=$(git rev-parse --short HEAD)
else
    GIT_HASH="unknown"
fi

# Create output directory if needed
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Generate JSON file
cat > "$OUTPUT_FILE" << EOF
{
  "version": "v$VERSION",
  "buildDate": "$BUILD_DATE",
  "gitHash": "$GIT_HASH"
}
EOF

echo "✅ Generated version info: v$VERSION • $BUILD_DATE • $GIT_HASH"
