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
    echo "Installing npm dependencies first..."
    npm install
fi
npx vite build --config vite.config.ts

# Step 2: Build C++ backend
echo ""
echo "Step 2: Building C++ backend..."
cd ../server
./build.sh

# Step 3: Copy React build to server's public directory
echo ""
echo "Step 3: Copying frontend to server..."
cd build
rm -rf public
mkdir -p public
cp -r ../../dist/* public/

echo ""
echo "======================================"
echo "✅ Build Complete!"
echo "======================================"
echo ""
echo "Server binary: src/server/build/vulcan_server"
echo "Frontend files: src/server/build/public/"
echo ""
echo "To run server:"
echo "  cd src/server/build"
echo "  ./vulcan_server"
echo ""
echo "Then visit: http://127.0.0.1:8080"
echo ""
echo "For development:"
echo "  1. Edit React files in src/frontend/"
echo "  2. Run: npx vite build"
echo "  3. Run: cd src/server/build && ./vulcan_server"
echo "  (No need for npm dev server!)"
echo "======================================"
