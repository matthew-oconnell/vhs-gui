#!/bin/bash
# Build production version - combines React frontend + C++ backend into single server

set -e  # Exit on error

echo "======================================"
echo "Building Production Server"
echo "======================================"

# Step 1: Build React frontend
echo ""
echo "Step 1: Building React frontend..."
npm run build

# Step 2: Build C++ backend
echo ""
echo "Step 2: Building C++ backend..."
cd server
./build.sh

# Step 3: Copy React build to server's public directory
echo ""
echo "Step 3: Copying frontend to server..."
cd build
rm -rf public
mkdir -p public
cp -r ../../../dist/* public/

echo ""
echo "======================================"
echo "Production Build Complete!"
echo "======================================"
echo ""
echo "Server binary: server/build/vulcan_server"
echo "Frontend files: server/build/public/"
echo ""
echo "To run production server:"
echo "  cd server/build"
echo "  ./vulcan_server"
echo ""
echo "Then visit: http://127.0.0.1:8080"
echo "======================================"
