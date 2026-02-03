#!/bin/bash
# Create a distribution package for end users
# Builds native desktop application bundles (macOS .dmg, Linux .deb/.rpm)

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="1.0.0"
DIST_NAME="vhs-gui-v${VERSION}"

echo "======================================"
echo "Creating Native Desktop App Distribution"
echo "======================================"

# Step 1: Build the Tauri desktop application
echo ""
echo "Step 1: Building Tauri desktop application..."
cd "$PROJECT_ROOT/src/frontend"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install
fi

# Inject build info into the source
BUILD_DATE=$(date +"%Y-%m-%d")
BUILD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "  Build info: $BUILD_DATE @ $BUILD_COMMIT"

# Replace placeholders in StatusBar.tsx
sed -i.bak "s/BUILD_DATE/$BUILD_DATE/g" "$PROJECT_ROOT/src/frontend/components/StatusBar/StatusBar.tsx"
sed -i.bak "s/BUILD_COMMIT/$BUILD_COMMIT/g" "$PROJECT_ROOT/src/frontend/components/StatusBar/StatusBar.tsx"

# Build the Tauri app (creates platform-specific bundles)
echo "  Building native bundles..."
npm run tauri build

# Restore original file
if [ -f "$PROJECT_ROOT/src/frontend/components/StatusBar/StatusBar.tsx.bak" ]; then
    mv "$PROJECT_ROOT/src/frontend/components/StatusBar/StatusBar.tsx.bak" "$PROJECT_ROOT/src/frontend/components/StatusBar/StatusBar.tsx"
fi

echo "  ✅ Desktop app built successfully!"

# Step 1.5: Bundle ESP libraries into macOS app
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "Step 1.5: Bundling ESP libraries into app..."
    BUNDLE_APP="$PROJECT_ROOT/src/frontend/src-tauri/target/release/bundle/macos/VHS CFD GUI.app"
    if [ -d "$BUNDLE_APP" ]; then
        FRAMEWORKS_DIR="$BUNDLE_APP/Contents/Frameworks"
        mkdir -p "$FRAMEWORKS_DIR"
        
        # Copy ESP and OpenCASCADE libraries (including versioned symlinks)
        echo "  Copying ESP libraries..."
        find "$PROJECT_ROOT/third-party/ESP128/EngSketchPad/lib" -name "*.dylib" -exec cp -a {} "$FRAMEWORKS_DIR/" \; 2>/dev/null || true
        
        echo "  Copying OpenCASCADE libraries..."
        find "$PROJECT_ROOT/third-party/ESP128/OpenCASCADE-7.8.1/lib" -name "*.dylib" -exec cp -a {} "$FRAMEWORKS_DIR/" \; 2>/dev/null || true
        
        # Count libraries copied
        LIB_COUNT=$(find "$FRAMEWORKS_DIR" -name "*.dylib" -type f | wc -l | tr -d ' ')
        echo "  Copied $LIB_COUNT library files"
        
        # Fix library paths
        echo "  Fixing library paths..."
        "$PROJECT_ROOT/src/frontend/fix-dylib-paths.sh" "$BUNDLE_APP"
    fi
fi

# Step 2: Organize distribution files
echo ""
echo "Step 2: Organizing distribution packages..."
cd "$PROJECT_ROOT"
rm -rf dist-package
mkdir -p dist-package/$DIST_NAME

# Detect OS and copy appropriate bundles
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: Copy .app bundle only (skip DMG)
    BUNDLE_DIR="$PROJECT_ROOT/src/frontend/src-tauri/target/release/bundle"
    
    if [ -d "$BUNDLE_DIR/macos" ]; then
        echo "  Copying macOS .app bundle..."
        cp -r "$BUNDLE_DIR/macos/"*.app "dist-package/$DIST_NAME/" 2>/dev/null || true
        
        # Create run.sh helper script
        cat > "dist-package/$DIST_NAME/run.sh" << 'EOF'
#!/bin/bash
# Helper script to remove quarantine and launch VHS CFD GUI

APP_NAME="VHS CFD GUI.app"

echo "========================================"
echo "VHS CFD GUI - Beta Launcher"
echo "========================================"
echo ""

# Check if app is in current directory
if [ -d "$APP_NAME" ]; then
    echo "Removing quarantine attribute..."
    xattr -cr "$APP_NAME"
    echo "✅ Quarantine removed"
    echo ""
    echo "Launching VHS CFD GUI..."
    open "$APP_NAME"
else
    echo "❌ Error: Cannot find $APP_NAME in current directory"
    echo "Please run this script from the extracted archive directory."
    exit 1
fi
EOF
        chmod +x "dist-package/$DIST_NAME/run.sh"
    fi
    
    PLATFORM="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux: Copy .deb and .rpm packages
    BUNDLE_DIR="$PROJECT_ROOT/src/frontend/src-tauri/target/release/bundle"
    
    if [ -d "$BUNDLE_DIR/deb" ]; then
        echo "  Copying Debian package (.deb)..."
        cp "$BUNDLE_DIR/deb/"*.deb "dist-package/" 2>/dev/null || true
    fi
    
    if [ -d "$BUNDLE_DIR/rpm" ]; then
        echo "  Copying RPM package (.rpm)..."
        cp "$BUNDLE_DIR/rpm/"*.rpm "dist-package/" 2>/dev/null || true
    fi
    
    PLATFORM="Linux"
else
    echo "  ⚠️  Unknown platform: $OSTYPE"
    PLATFORM="Unknown"
fi

# Step 3: Create README for end users
cat > dist-package/$DIST_NAME/README.txt << 'EOF'
# VHS CFD GUI - Beta Installation Guide

## Quick Start (macOS)

### Option 1: Use the helper script (RECOMMENDED)
```bash
./run.sh
```
This script will:
- Remove the macOS quarantine attribute
- Optionally move the app to /Applications
- Launch the application

### Option 2: Manual installation
1. Copy "VHS CFD GUI.app" to /Applications
2. Remove quarantine:
   ```bash
   xattr -cr "/Applications/VHS CFD GUI.app"
   ```
3. Launch from Applications folder

## First Launch

macOS may still show a security warning. If so:
- Right-click the app → "Open"
- Click "Open" again in the dialog
- App will launch (only needed once)

## Requirements

- **macOS:** 10.15 (Catalina) or later
- **No additional software needed** - fully self-contained!

## Features

- Native desktop application (not browser-based)
- 3D mesh visualization and editing
- Boundary condition configuration
- CFD simulation setup
- JSON schema-driven configuration
- **ESP/OpenCASCADE geometry support included**

## Support

For issues or questions, contact your administrator.

## Beta Testing Notes

This is a BETA release. Please report any issues you encounter.
Build info is shown in the status bar at the bottom of the application.
EOF

# Step 4: Create archive
echo ""
echo "Step 3: Creating archive..."
cd dist-package

if [[ "$PLATFORM" == "macOS" ]]; then
    # Create .tgz instead of .dmg
    tar -czf "${DIST_NAME}.tgz" "$DIST_NAME"
    ARCHIVE_FILE="${DIST_NAME}.tgz"
else
    tar -czf "${DIST_NAME}.tar.gz" "$DIST_NAME"
    ARCHIVE_FILE="${DIST_NAME}.tar.gz"
fi

cd ..

echo ""
echo "======================================"
echo "✅ Distribution Package Created!"
echo "======================================"
echo ""
echo "Platform: $PLATFORM"
echo "Archive: dist-package/$ARCHIVE_FILE"
echo "Size: $(du -h dist-package/$ARCHIVE_FILE | cut -f1)"
echo ""
echo "Contents:"
ls -lh dist-package/$DIST_NAME/
echo ""
echo "To distribute:"
if [[ "$PLATFORM" == "macOS" ]]; then
    echo "  - Share the .tgz file with beta testers"
    echo "  - They should extract and run: ./run.sh"
elif [[ "$PLATFORM" == "Linux" ]]; then
    echo "  - Share .deb files with Debian/Ubuntu users"
    echo "  - Share .rpm files with Fedora/RHEL users"
fi
echo ""
echo "To test locally:"
if [[ "$PLATFORM" == "macOS" ]]; then
    echo "  cd dist-package/$DIST_NAME"
    echo "  ./run.sh"
elif [[ "$PLATFORM" == "Linux" ]]; then
    echo "  sudo dpkg -i dist-package/*.deb  # Debian/Ubuntu"
    echo "  sudo rpm -i dist-package/*.rpm   # Fedora/RHEL"
fi
echo "======================================"
