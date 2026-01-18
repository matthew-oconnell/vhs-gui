#!/bin/bash
# Quick rebuild of just the frontend
# Use this during development when you only changed React code

echo "Rebuilding React frontend..."
cd src/frontend
npx vite build --config vite.config.ts

echo "Copying to server..."
cd ../server/build
rm -rf public
mkdir -p public
cp -r ../../../dist/* public/

echo "✅ Frontend rebuilt!"
echo ""
echo "Restart server:"
echo "  cd src/server/build"
echo "  pkill vulcan_server && ./vulcan_server"
