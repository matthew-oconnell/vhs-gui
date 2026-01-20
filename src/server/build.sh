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
make -j$(nproc)

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
