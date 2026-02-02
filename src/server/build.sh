#!/bin/bash
# Build script for VHS Server

set -e  # Exit on error

echo "==================================================="
echo "  Building VHS Server"
echo "==================================================="

# Create build directory if it doesn't exist
if [ ! -d "build" ]; then
    echo "Creating build directory..."
    mkdir build
fi

cd build

# Configure with CMake
echo "Configuring with CMake..."
cmake ..

# Build
echo "Building..."
# Use sysctl for macOS (nproc is Linux-only)
if command -v nproc > /dev/null 2>&1; then
    make -j$(nproc)
else
    make -j$(sysctl -n hw.ncpu)
fi

echo ""
echo "==================================================="
echo "  Build complete!"
echo "==================================================="
echo ""
echo "Run the server:"
echo "  ./build/vhs_server"
echo ""
echo "Run tests:"
echo "  ./build/vhs_tests"
echo "  or: cd build && ctest --output-on-failure"
echo ""
