#!/bin/bash
# Build script - combines React frontend + C++ backend into single server
# Use this for both development and deployment

set -e  # Exit on error

echo "======================================"
echo "Building Vulcan Server"
echo "======================================"

# Step 1: Build React frontend
echo ""
echo "Step 1: Building React frontend..."
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

echo ""
echo "======================================"
echo "✅ Build Complete!"
echo "======================================"
echo ""
echo "Server binary: src/server/build/vulcan_server"
echo "Frontend files: src/server/build/public/"
echo ""
echo "Launching server and opening browser..."
echo ""

# Launch server in background
./vulcan_server > /dev/null 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Open browser
if command -v xdg-open > /dev/null; then
    xdg-open http://127.0.0.1:8080
elif command -v open > /dev/null; then
    open http://127.0.0.1:8080
else
    echo "Please open http://127.0.0.1:8080 in your browser"
fi

echo "Server running with PID: $SERVER_PID"
echo "To stop the server: kill $SERVER_PID"
echo ""
echo "Press Ctrl+C to stop the server and exit"
echo "======================================"

# Wait for user to stop
wait $SERVER_PID
