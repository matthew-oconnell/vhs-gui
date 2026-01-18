#!/bin/bash
# Build script - combines React frontend + C++ backend into single server
# Use this for both development and deployment

set -e  # Exit on error

echo "======================================"
echo "Building Vulcan Server"
echo "======================================"

# Step 1: Copy schema to frontend public directory
echo ""
echo "Step 1: Copying schema to frontend..."
mkdir -p src/frontend/public/schemas
cp schemas/input.schema.json src/frontend/public/schemas/

# Step 2: Build React frontend
echo ""
echo "Step 2: Building React frontend..."
cd src/frontend
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies first..."
    npm install
fi
npx vite build --config vite.config.ts
cd ../..

# Step 3: Build C++ backend
echo ""
echo "Step 3: Building C++ backend..."
cd src/server
./build.sh

# Step 4: Copy React build to server's public directory
echo ""
echo "Step 4: Copying frontend to server..."
cd build
rm -rf public
mkdir -p public
cp -r ../../../dist/* public/

echo ""
echo "======================================"
echo "✅ Build Complete!"
echo "======================================"
echo ""
echo "Server binary: src/server/build/vulcan_server"
echo "Frontend files: src/server/build/public/"
echo ""
echo "Starting server on http://127.0.0.1:8080"
echo "Press Ctrl+C to stop"
echo ""
echo "Schema location: schemas/input.schema.json (canonical)"
echo ""

# Open browser (cross-platform)
sleep 1
if command -v xdg-open > /dev/null; then
    xdg-open http://127.0.0.1:8080 &
elif command -v open > /dev/null; then
    open http://127.0.0.1:8080 &
elif command -v start > /dev/null; then
    start http://127.0.0.1:8080 &
fi

# Launch server (we're already in src/server/build from Step 3)
./vulcan_server
