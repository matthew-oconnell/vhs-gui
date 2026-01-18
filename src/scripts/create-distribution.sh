#!/bin/bash
# Create a distribution package for end users
# End users only need this package - NO npm/node required!

set -e

VERSION="1.0.0"
DIST_NAME="vulcan-gui-v${VERSION}"

echo "======================================"
echo "Creating Distribution Package"
echo "======================================"

# Step 1: Build everything
echo ""
echo "Step 1: Building application..."
../../build.sh

# Step 2: Create distribution directory
echo ""
echo "Step 2: Creating distribution package..."
rm -rf dist-package
mkdir -p dist-package/$DIST_NAME

# Step 3: Copy server binary
echo "Copying server binary..."
cp ../server/build/vulcan_server dist-package/$DIST_NAME/

# Step 4: Copy public files  
echo "Copying frontend files..."
cp -r ../server/build/public dist-package/$DIST_NAME/

# Step 5: Create README for end users
cat > dist-package/$DIST_NAME/README.txt << 'EOF'
# Vulcan CFD GUI - User Guide

## Quick Start

1. Run the server:
   ./vulcan_server

2. Open your web browser:
   http://127.0.0.1:8080

That's it!

## Requirements

- Modern web browser (Chrome, Firefox, Edge, Safari)
- No other software needed!

## Options

Run with custom port:
  ./vulcan_server --port 3000

Run on all network interfaces (allow remote access):
  ./vulcan_server --host 0.0.0.0 --port 8080

Help:
  ./vulcan_server --help

## Troubleshooting

- If port 8080 is in use, try a different port with --port
- Make sure ./vulcan_server is executable: chmod +x vulcan_server
- Check firewall if accessing from another machine

## Support

For issues, contact your administrator.
EOF

# Step 6: Create run script for convenience
cat > dist-package/$DIST_NAME/run.sh << 'EOF'
#!/bin/bash
# Convenience script to run Vulcan GUI

echo "Starting Vulcan CFD GUI..."
echo "Open browser: http://127.0.0.1:8080"
echo "Press Ctrl+C to stop"
echo ""

./vulcan_server
EOF

chmod +x dist-package/$DIST_NAME/run.sh

# Step 7: Create archive
echo ""
echo "Step 3: Creating archive..."
cd dist-package
tar -czf ${DIST_NAME}.tar.gz $DIST_NAME
cd ..

echo ""
echo "======================================"
echo "✅ Distribution Package Created!"
echo "======================================"
echo ""
echo "Package: dist-package/${DIST_NAME}.tar.gz"
echo "Size: $(du -h dist-package/${DIST_NAME}.tar.gz | cut -f1)"
echo ""
echo "Contents:"
ls -lh dist-package/$DIST_NAME/
echo ""
echo "To test:"
echo "  cd dist-package/$DIST_NAME"
echo "  ./run.sh"
echo ""
echo "To distribute:"
echo "  scp dist-package/${DIST_NAME}.tar.gz user@server:~/"
echo "  ssh user@server"
echo "  tar -xzf ${DIST_NAME}.tar.gz"
echo "  cd $DIST_NAME"
echo "  ./run.sh"
echo "======================================"
