#!/bin/bash
# Build script - combines React frontend + C++ backend into single server
# Use this for both development and deployment

set -e  # Exit on error

echo "======================================"
echo "Building VHS Server"
echo "======================================"

# Step 1: Build React frontend
echo ""
echo "Step 1: Building React frontend..."

# Copy schema to public directory before build (Vite will include it)
echo "Copying schema to public/schemas..."
mkdir -p public/schemas
cp schemas/input.schema.json public/schemas/

cd src/frontend
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi
npm run build
cd ../..

# Step 2: Build C++ backend
echo ""
echo "Step 2: Building C++ backend..."
cd src/server
./build.sh

# Step 3: Copy React build to server's public directory
echo ""
echo "Step 3: Copying frontend to server..."
cd build
rm -rf public
mkdir -p public
cp -r ../../frontend/dist/* public/

# Ensure schema is in the server's public directory
mkdir -p public/schemas
cp ../../../schemas/input.schema.json public/schemas/

echo ""
echo "======================================"
echo "✅ Build Complete!"
echo "======================================"
echo ""
echo "Server binary: src/server/build/vhs_server"
echo "Frontend files: src/server/build/public/"
echo ""

# Go back to project root
cd ../../..
PROJECT_ROOT=$(pwd)

echo "Launching servers..."
echo ""

# Track PIDs for cleanup
VHS_PID=""
ESP_PID=""

# Cleanup function for Ctrl+C
cleanup() {
    echo ""
    echo "======================================"
    echo "Shutting down servers..."
    echo "======================================"
    
    if [ -n "$VHS_PID" ] && kill -0 "$VHS_PID" 2>/dev/null; then
        echo "Stopping VHS server (PID: $VHS_PID)..."
        kill "$VHS_PID" 2>/dev/null || true
    fi
    
    if [ -n "$ESP_PID" ] && kill -0 "$ESP_PID" 2>/dev/null; then
        echo "Stopping ESP server (PID: $ESP_PID)..."
        kill "$ESP_PID" 2>/dev/null || true
    fi
    
    # Wait a moment for processes to terminate
    sleep 1
    
    # Force kill if still running
    if [ -n "$VHS_PID" ] && kill -0 "$VHS_PID" 2>/dev/null; then
        kill -9 "$VHS_PID" 2>/dev/null || true
    fi
    
    if [ -n "$ESP_PID" ] && kill -0 "$ESP_PID" 2>/dev/null; then
        kill -9 "$ESP_PID" 2>/dev/null || true
    fi
    
    echo "All servers stopped."
    exit 0
}

# Set trap for Ctrl+C (SIGINT) and SIGTERM
trap cleanup SIGINT SIGTERM

# Launch VHS C++ server in background
echo "Starting VHS server on port 8080..."
cd "$PROJECT_ROOT/src/server/build"
./vhs_server > /dev/null 2>&1 &
VHS_PID=$!
echo "  VHS server started (PID: $VHS_PID)"

# Launch ESP Python server in background
echo "Starting ESP server on port 8081..."
cd "$PROJECT_ROOT/src/esp-server"

# Set ESP environment
export ESP_ROOT="$PROJECT_ROOT/third-party/ESP128/EngSketchPad"
export LD_LIBRARY_PATH="$ESP_ROOT/lib:$PROJECT_ROOT/third-party/ESP128/OpenCASCADE-7.8.1/lib:$LD_LIBRARY_PATH"
export PYTHONPATH="$ESP_ROOT/pyESP:$PYTHONPATH"

# Use ESP's bundled Python if available
ESP_PYTHON="$PROJECT_ROOT/third-party/ESP128/Python-3.12.10/bin/python3"
if [ -x "$ESP_PYTHON" ]; then
    PYTHON="$ESP_PYTHON"
else
    PYTHON="python3"
fi

$PYTHON server.py > /dev/null 2>&1 &
ESP_PID=$!
echo "  ESP server started (PID: $ESP_PID)"

# Wait for servers to start
sleep 2

# Check if servers are running
if ! kill -0 "$VHS_PID" 2>/dev/null; then
    echo "ERROR: VHS server failed to start"
    cleanup
fi

if ! kill -0 "$ESP_PID" 2>/dev/null; then
    echo "WARNING: ESP server failed to start (CSM loading will not work)"
    echo "  Make sure uvicorn is installed: pip install uvicorn fastapi"
fi

# Open browser
cd "$PROJECT_ROOT"
if command -v xdg-open > /dev/null; then
    xdg-open http://127.0.0.1:8080
elif command -v open > /dev/null; then
    open http://127.0.0.1:8080
else
    echo "Please open http://127.0.0.1:8080 in your browser"
fi

echo ""
echo "======================================"
echo "Servers running:"
echo "  VHS server:  http://127.0.0.1:8080 (PID: $VHS_PID)"
echo "  ESP server:  http://127.0.0.1:8081 (PID: $ESP_PID)"
echo ""
echo "Press Ctrl+C to stop all servers and exit"
echo "======================================"

# Wait for either server to exit (or Ctrl+C)
wait $VHS_PID $ESP_PID 2>/dev/null || true

# If we get here, a server exited unexpectedly
cleanup
