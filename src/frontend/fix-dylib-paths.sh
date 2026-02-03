#!/bin/bash
# Fix dylib paths for macOS app bundle
# This script updates install names so libraries can find each other in the bundle

set -e

APP_BUNDLE="$1"
if [ -z "$APP_BUNDLE" ]; then
    echo "Usage: $0 <path-to-app-bundle>"
    exit 1
fi

FRAMEWORKS_DIR="$APP_BUNDLE/Contents/Frameworks"
MACOS_DIR="$APP_BUNDLE/Contents/MacOS"

if [ ! -d "$FRAMEWORKS_DIR" ]; then
    echo "Error: Frameworks directory not found at $FRAMEWORKS_DIR"
    exit 1
fi

echo "Fixing dylib install names in $APP_BUNDLE..."

# Fix all dylibs (ESP + OpenCASCADE)
for dylib in "$FRAMEWORKS_DIR"/*.dylib; do
    if [ -f "$dylib" ]; then
        filename=$(basename "$dylib")
        echo "  Fixing $filename..."
        
        # Change install name to be relative to @executable_path
        install_name_tool -id "@executable_path/../Frameworks/$filename" "$dylib"
        
        # Get actual dependencies from otool and fix them
        otool -L "$dylib" | grep -E '\.dylib' | awk '{print $1}' | while read -r dep_path; do
            # Skip if it's already using @executable_path
            if [[ "$dep_path" == @executable_path/* ]]; then
                continue
            fi
            
            # Skip system libraries
            if [[ "$dep_path" == /usr/* ]] || [[ "$dep_path" == /System/* ]]; then
                continue
            fi
            
            dep_name=$(basename "$dep_path")
            
            # Only fix if this library exists in Frameworks
            if [ -f "$FRAMEWORKS_DIR/$dep_name" ]; then
                install_name_tool -change "$dep_path" "@executable_path/../Frameworks/$dep_name" "$dylib" 2>/dev/null || true
            fi
        done
    fi
done

# Fix main executable
EXECUTABLE="$MACOS_DIR/app"
if [ -f "$EXECUTABLE" ]; then
    echo "  Fixing main executable..."
    
    # Add rpath to Frameworks directory
    install_name_tool -add_rpath "@executable_path/../Frameworks" "$EXECUTABLE" 2>/dev/null || true
    
    # Fix all dylib dependencies - process the list without a subshell
    deps_to_fix=$(otool -L "$EXECUTABLE" | grep -E '\.dylib' | awk '{print $1}')
    
    while IFS= read -r lib_path; do
        # Skip empty lines
        [ -z "$lib_path" ] && continue
        
        # Extract just the filename
        lib_name=$(basename "$lib_path")
        
        # Skip system libraries
        if [[ "$lib_path" == /usr/* ]] || [[ "$lib_path" == /System/* ]]; then
            continue
        fi
        
        # Skip if already using @executable_path
        if [[ "$lib_path" == @executable_path/* ]]; then
            continue
        fi
        
        # Check if this library exists in our Frameworks directory
        if [ -f "$FRAMEWORKS_DIR/$lib_name" ]; then
            echo "    Fixing reference: $lib_path -> @executable_path/../Frameworks/$lib_name"
            install_name_tool -change "$lib_path" "@executable_path/../Frameworks/$lib_name" "$EXECUTABLE"
        fi
    done <<< "$deps_to_fix"
fi

echo "✅ Dylib paths fixed successfully!"
