#!/bin/bash
# Build script - builds all components and launches the desktop application
# Components: C++ backend server, Tauri frontend, ESP server (optional)

set -e  # Exit on error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Step 4: Start ESP server (optional - only if ESP is installed)
echo ""
echo "Step 4: Starting ESP server (optional)..."
ESP_START_SCRIPT="$PROJECT_ROOT/src/esp-server/start.sh"
ESP_ROOT="$PROJECT_ROOT/third-party/ESP128/EngSketchPad"

if [ -d "$ESP_ROOT" ] && [ -f "$ESP_START_SCRIPT" ]; then
    echo "  Starting ESP server on port 8081..."
    cd "$PROJECT_ROOT/src/esp-server"
    bash start.sh > /tmp/esp-server.log 2>&1 &
    ESP_PID=$!
    echo "  ESP PID: $ESP_PID"
    sleep 2
    
    # Check if ESP started successfully
    if ps -p $ESP_PID > /dev/null; then
        echo "  ✅ ESP server running (for geometry operations)"
    else
        echo "  ⚠️  ESP server failed to start (check /tmp/esp-server.log)"
        ESP_PID=""
    fi
else
    echo "  ⚠️  ESP not installed, skipping (Geometry features disabled)"
    ESP_PID=""
fi

cd "$PROJECT_ROOT"

# Step 5: Launch desktop application
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
    [ -n "$ESP_PID" ] && kill $ESP_PID 2>/dev/null && echo "  Stopped ESP server"
}

trap cleanup EXIT INT TERM

if [ -f "$EXECUTABLE" ]; then
    echo ""
    echo "Running: $EXECUTABLE"
    echo "Logs: /tmp/vhs-server.log, /tmp/esp-server.log"
    echo ""
    exec "$EXECUTABLE"
else
    echo "❌ Error: Executable not found at $EXECUTABLE"
    exit 1
fi
