#!/bin/bash
# Build and run ESP test

set -e

ESP_TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ESP_ROOT="$ESP_TEST_DIR/../../third-party/ESP128/EngSketchPad"
OCC_ROOT="$ESP_TEST_DIR/../../third-party/ESP128/OpenCASCADE-7.8.1"

echo "========================================="
echo "Building ESP C Library Test"
echo "========================================="
echo "Test directory: $ESP_TEST_DIR"
echo "ESP root: $ESP_ROOT"
echo "OCC root: $OCC_ROOT"
echo ""

# Check if ESP exists
if [ ! -d "$ESP_ROOT" ]; then
    echo "❌ Error: ESP not found at $ESP_ROOT"
    echo "Please install ESP or update the path"
    exit 1
fi

# Check if OpenCASCADE exists
if [ ! -d "$OCC_ROOT" ]; then
    echo "❌ Error: OpenCASCADE not found at $OCC_ROOT"
    echo "EGADS depends on OpenCASCADE libraries"
    exit 1
fi

# Create build directory
cd "$ESP_TEST_DIR"
if [ ! -d "build" ]; then
    mkdir build
fi

cd build

# Configure with CMake
echo "Configuring with CMake..."
cmake -DCMAKE_BUILD_TYPE=Release \
      -DESP_ROOT="$ESP_ROOT" \
      -DOCC_ROOT="$OCC_ROOT" \
      .. || {
    echo "❌ CMake configuration failed"
    exit 1
}

# Build
echo ""
echo "Building..."
make -j$(nproc) || {
    echo "❌ Build failed"
    exit 1
}

echo ""
echo "✅ Build successful"
echo ""
echo "========================================="
echo "Running ESP Test"
echo "========================================="
echo ""

# Set library path and run (must include both ESP and OpenCASCADE)
export LD_LIBRARY_PATH="$ESP_ROOT/lib:$OCC_ROOT/lib:$LD_LIBRARY_PATH"
./esp_test

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Test completed successfully"
    echo "========================================="
else
    echo ""
    echo "========================================="
    echo "❌ Test failed with exit code $exit_code"
    echo "========================================="
fi

exit $exit_code
