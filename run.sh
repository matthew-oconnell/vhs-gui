#!/bin/bash
# Quick launch script for development (with hot reload)
# Usage: ./run.sh
# 
# For production build and launch, use: ./build.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================"
echo "Launching VHS GUI (Development Mode)"
echo "======================================"

# Step 1: Ensure backend is built
BACKEND_SERVER="$PROJECT_ROOT/src/server/build/vhs_server"

if [ ! -f "$BACKEND_SERVER" ]; then
    echo ""
    echo "Backend server not found. Building..."
    cd "$PROJECT_ROOT/src/server"
    mkdir -p build
    cd build
    cmake .. > /dev/null 2>&1
    # Detect CPU count (cross-platform)
    if command -v nproc > /dev/null; then
        NCPU=$(nproc)
    else
        NCPU=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
    fi
    make -j$NCPU > /dev/null 2>&1
    echo "✅ Backend built"
fi

# Step 2: Generate version info
echo ""
echo "Generating version info..."
"$PROJECT_ROOT/scripts/generate-version.sh"

# Step 3: Start backend server
echo ""
echo "Starting backend server on port 8080..."
"$BACKEND_SERVER" > /tmp/vhs-server.log 2>&1 &
BACKEND_PID=$!
sleep 1

if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend running (PID: $BACKEND_PID)"
else
    echo "⚠️  Backend failed to start (check /tmp/vhs-server.log)"
fi

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down backend server..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    echo "Stopped"
}

trap cleanup EXIT INT TERM

# Step 4: Launch Tauri in dev mode
echo ""
echo "======================================"
echo "Launching desktop app (dev mode)..."
echo "======================================"
echo ""
echo "Hot reload enabled - changes will auto-refresh"
echo "Backend logs: /tmp/vhs-server.log"
echo ""

cd "$PROJECT_ROOT/src/frontend"

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies (first-time only)..."
    npm install
    echo ""
fi

# Set library path for ESP/OpenCASCADE libraries (if installed)
ESP_LIB="$PROJECT_ROOT/third-party/ESP128/EngSketchPad/lib"
OCC_LIB="$PROJECT_ROOT/third-party/ESP128/OpenCASCADE-7.8.1/lib"

if [ -d "$ESP_LIB" ] && [ -d "$OCC_LIB" ]; then
    export DYLD_LIBRARY_PATH="$ESP_LIB:$OCC_LIB:$DYLD_LIBRARY_PATH"
    export LD_LIBRARY_PATH="$ESP_LIB:$OCC_LIB:$LD_LIBRARY_PATH"
fi

# Launch Tauri in dev mode (with hot reload)
npx tauri dev
