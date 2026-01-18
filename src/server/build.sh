#!/bin/bash
# Build script for Vulcan Server

set -e  # Exit on error

echo "==================================================="
echo "  Building Vulcan Server"
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
echo "  ./build/vulcan_server"
echo ""
echo "Run tests:"
echo "  ./build/vulcan_tests"
echo "  or: cd build && ctest --output-on-failure"
echo ""
