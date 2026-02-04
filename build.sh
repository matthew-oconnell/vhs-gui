#!/bin/bash
# Build script - builds all components and launches the desktop application
# Components: C++ backend server, Tauri frontend (ESP integrated via Rust FFI)
# Usage: ./build.sh [--force]
#   --force    Force a clean rebuild (clears all caches)

set -e  # Exit on error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse command line arguments
FORCE_REBUILD=false
if [ "$1" == "--force" ] || [ "$1" == "-f" ]; then
    FORCE_REBUILD=true
    echo "======================================"
    echo "FORCE REBUILD MODE"
    echo "======================================"
fi

echo "======================================"
echo "Building VHS Desktop Application"
echo "======================================"

# Step 1: Build C++ backend server
echo ""
echo "Step 1: Building C++ backend server..."
cd "$PROJECT_ROOT/src/server"

if [ ! -d "build" ]; then
    echo "  Creating build directory..."
    mkdir build
fi

cd build
echo "  Configuring with CMake..."
cmake .. > /dev/null 2>&1
echo "  Building with make..."
make -j$(nproc) > /dev/null 2>&1
echo "  ✅ Backend server built: src/server/build/vhs_server"

# Step 2: Build Tauri desktop application
echo ""
echo "Step 2: Building Tauri desktop application..."
cd "$PROJECT_ROOT/src/frontend"

# Force rebuild if requested
if [ "$FORCE_REBUILD" = true ]; then
    echo "  🧹 Cleaning build caches..."
    rm -rf dist
    rm -rf src-tauri/target/release/bundle
    echo "  ✨ Caches cleared"
fi

echo "  Running: npx tauri build"
npx tauri build

echo "  ✅ Desktop app built: src/frontend/src-tauri/target/release/app"

cd "$PROJECT_ROOT"

echo ""
echo "======================================"
echo "✅ All components built successfully!"
echo "======================================"

# Step 3: Start backend server
echo ""
echo "Step 3: Starting backend server..."
BACKEND_SERVER="$PROJECT_ROOT/src/server/build/vhs_server"

if [ -f "$BACKEND_SERVER" ]; then
    echo "  Starting backend on port 8080..."
    "$BACKEND_SERVER" > /tmp/vhs-server.log 2>&1 &
    BACKEND_PID=$!
    echo "  Backend PID: $BACKEND_PID"
    sleep 1
    
    # Check if backend started successfully
    if ps -p $BACKEND_PID > /dev/null; then
        echo "  ✅ Backend server running"
    else
        echo "  ⚠️  Backend server failed to start (check /tmp/vhs-server.log)"
    fi
else
    echo "  ⚠️  Backend server not found, skipping"
    BACKEND_PID=""
fi

cd "$PROJECT_ROOT"

# Step 4: Launch desktop application
echo ""
echo "======================================"
echo "Launching desktop application..."
echo "======================================"
EXECUTABLE="$PROJECT_ROOT/src/frontend/src-tauri/target/release/app"

# Cleanup function to stop servers on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null && echo "  Stopped backend server"
}

trap cleanup EXIT INT TERM

if [ -f "$EXECUTABLE" ]; then
    # Set library path for ESP/OpenCASCADE libraries (if installed)
    ESP_LIB="$PROJECT_ROOT/third-party/ESP128/EngSketchPad/lib"
    OCC_LIB="$PROJECT_ROOT/third-party/ESP128/OpenCASCADE-7.8.1/lib"
    
    if [ -d "$ESP_LIB" ] && [ -d "$OCC_LIB" ]; then
        export LD_LIBRARY_PATH="$ESP_LIB:$OCC_LIB:$LD_LIBRARY_PATH"
        echo "  ℹ️  ESP libraries found - geometry features enabled"
    fi
    
    echo ""
    echo "Running: $EXECUTABLE"
    echo "Logs: /tmp/vhs-server.log"
    echo ""
    exec "$EXECUTABLE"
else
    echo "❌ Error: Executable not found at $EXECUTABLE"
    exit 1
fi
