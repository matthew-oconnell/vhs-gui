#!/bin/bash
# Quick rebuild of just the frontend
# Use this during development when you only changed React code

echo "Rebuilding React frontend..."
npx vite build

echo "Copying to server..."
cd server/build
rm -rf public
mkdir -p public
cp -r ../../dist/* public/

echo "✅ Frontend rebuilt!"
echo ""
echo "Restart server:"
echo "  cd server/build"
echo "  pkill vulcan_server && ./vulcan_server"
