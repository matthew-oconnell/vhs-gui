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
    # Linux: Create standalone portable app
    BUNDLE_DIR="$PROJECT_ROOT/src/frontend/src-tauri/target/release"
    
    if [ -f "$BUNDLE_DIR/app" ]; then
        echo "  Copying standalone binary..."
        cp "$BUNDLE_DIR/app" "dist-package/$DIST_NAME/vhs-gui"
        chmod +x "dist-package/$DIST_NAME/vhs-gui"
        
        # Create run.sh helper script
        cat > "dist-package/$DIST_NAME/run.sh" << 'EOF'
#!/bin/bash
# Helper script to launch VHS CFD GUI

APP_NAME="vhs-gui"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "VHS CFD GUI - Beta Launcher"
echo "========================================"
echo ""

cd "$SCRIPT_DIR"

# Check if binary exists
if [ -f "$APP_NAME" ]; then
    echo "Launching VHS CFD GUI..."
    ./"$APP_NAME"
else
    echo "❌ Error: Cannot find $APP_NAME in current directory"
    echo "Please run this script from the extracted archive directory."
    exit 1
fi
EOF
        chmod +x "dist-package/$DIST_NAME/run.sh"
        
        # Also copy installer packages to dist-package root (for users who prefer system installation)
        if [ -d "$PROJECT_ROOT/src/frontend/src-tauri/target/release/bundle/deb" ]; then
            echo "  Also copying .deb package (optional system install)..."
            cp "$PROJECT_ROOT/src/frontend/src-tauri/target/release/bundle/deb/"*.deb "dist-package/" 2>/dev/null || true
        fi
        
        if [ -d "$PROJECT_ROOT/src/frontend/src-tauri/target/release/bundle/rpm" ]; then
            echo "  Also copying .rpm package (optional system install)..."
            cp "$PROJECT_ROOT/src/frontend/src-tauri/target/release/bundle/rpm/"*.rpm "dist-package/" 2>/dev/null || true
        fi
    fi
    
    PLATFORM="Linux"
else
    echo "  ⚠️  Unknown platform: $OSTYPE"
    PLATFORM="Unknown"
fi

# Step 3: Create README for end users
if [[ "$PLATFORM" == "macOS" ]]; then
    cat > dist-package/$DIST_NAME/README.txt << 'EOF'
# VHS CFD GUI - Beta Installation Guide (macOS)

## Quick Start

### Option 1: Use the helper script (RECOMMENDED)
```bash
./run.sh
```
This script will:
- Remove the macOS quarantine attribute
- Launch the application

### Option 2: Manual launch
1. Remove quarantine:
   ```bash
   xattr -cr "VHS CFD GUI.app"
   ```
2. Double-click "VHS CFD GUI.app"

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
elif [[ "$PLATFORM" == "Linux" ]]; then
    cat > dist-package/$DIST_NAME/README.txt << 'EOF'
# VHS CFD GUI - Beta Installation Guide (Linux)

## Quick Start - Standalone App (RECOMMENDED)

Simply extract and run - **no installation required!**

### Option 1: Use the helper script
```bash
./run.sh
```

### Option 2: Run directly
```bash
./vhs-gui
```

## Installation Location

You can extract this archive **anywhere you like**:
- Your home directory: `~/vhs-gui/`
- A local applications folder: `~/.local/vhs-gui/`
- A shared location: `/opt/vhs-gui/`
- Even a USB drive for portable use!

## Creating a Desktop Launcher (Optional)

To add VHS CFD GUI to your application menu:

1. Create a desktop file at `~/.local/share/applications/vhs-gui.desktop`:
   ```ini
   [Desktop Entry]
   Name=VHS CFD GUI
   Comment=CFD Simulation Configuration Tool
   Exec=/path/to/your/vhs-gui-v1.0.0/vhs-gui
   Terminal=false
   Type=Application
   Categories=Science;Engineering;
   ```

2. Replace `/path/to/your/` with the actual path where you extracted the archive

3. Make it executable:
   ```bash
   chmod +x ~/.local/share/applications/vhs-gui.desktop
   ```

## System Installation (Alternative)

If you prefer a traditional system installation, you can use the installer packages
available in the parent directory:

### Debian/Ubuntu (.deb)
```bash
sudo dpkg -i "VHS CFD GUI_1.0.0-beta.1_amd64.deb"
```

### Fedora/RHEL (.rpm)
```bash
sudo rpm -i "VHS CFD GUI-1.0.0-beta.1-1.x86_64.rpm"
```

**Note:** System installation is NOT required. The standalone binary works perfectly!

## Requirements

- **Linux:** Modern distribution (tested on Ubuntu 20.04+, Fedora 36+)
- **Libraries:** GTK3, WebKit2GTK (usually pre-installed)
  - Ubuntu/Debian: `sudo apt install libgtk-3-0 libwebkit2gtk-4.0-37`
  - Fedora: `sudo dnf install gtk3 webkit2gtk3`

## Features

- Native desktop application (not browser-based)
- 3D mesh visualization and editing
- Boundary condition configuration
- CFD simulation setup
- JSON schema-driven configuration
- **ESP/OpenCASCADE geometry support included**

## Troubleshooting

### "Permission denied" error
Make sure the binary is executable:
```bash
chmod +x vhs-gui
```

### Missing libraries
Install the required GTK libraries (see Requirements section above)

### Application won't start
Check if any libraries are missing:
```bash
ldd vhs-gui
```

## Support

For issues or questions, contact your administrator.

## Beta Testing Notes

This is a BETA release. Please report any issues you encounter.
Build info is shown in the status bar at the bottom of the application.
EOF
fi

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
    echo "  - Share the .tgz file with users"
    echo "  - They should extract and run: ./run.sh"
elif [[ "$PLATFORM" == "Linux" ]]; then
    echo "  - Share the .tar.gz file with users"
    echo "  - They can extract it anywhere and run: ./run.sh or ./vhs-gui"
    echo "  - Optional: .deb/.rpm packages available in dist-package/ for system install"
fi
echo ""
echo "To test locally:"
if [[ "$PLATFORM" == "macOS" ]]; then
    echo "  cd dist-package/$DIST_NAME"
    echo "  ./run.sh"
elif [[ "$PLATFORM" == "Linux" ]]; then
    echo "  cd dist-package/$DIST_NAME"
    echo "  ./run.sh"
    echo ""
    echo "  OR extract anywhere:"
    echo "  tar -xzf dist-package/$ARCHIVE_FILE -C ~/"
    echo "  cd ~/$DIST_NAME"
    echo "  ./vhs-gui"
fi
echo "======================================"
