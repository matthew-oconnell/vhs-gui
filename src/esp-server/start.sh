#!/bin/bash

# Start ESP Gateway Server
# This script sets up the environment and starts the Python server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Set ESP environment
export ESP_ROOT="$PROJECT_ROOT/third-party/ESP128/EngSketchPad"

# Check if ESP_ROOT exists
if [ ! -d "$ESP_ROOT" ]; then
    echo "ERROR: ESP_ROOT not found at: $ESP_ROOT"
    echo "Please ensure ESP128 is installed in third-party/ESP128/"
    exit 1
fi

# Set library path for OpenCASCADE and EGADS
export LD_LIBRARY_PATH="$ESP_ROOT/lib:$PROJECT_ROOT/third-party/ESP128/OpenCASCADE-7.8.1/lib:$LD_LIBRARY_PATH"

# Use ESP's bundled Python if available
ESP_PYTHON="$PROJECT_ROOT/third-party/ESP128/Python-3.12.10/bin/python3"
if [ -x "$ESP_PYTHON" ]; then
    PYTHON="$ESP_PYTHON"
    echo "Using ESP bundled Python: $PYTHON"
else
    PYTHON="python3"
    echo "Using system Python: $PYTHON"
fi

# Check for required packages
echo "Checking dependencies..."
$PYTHON -c "import fastapi, uvicorn" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing required packages..."
    $PYTHON -m pip install -r "$SCRIPT_DIR/requirements.txt"
fi

echo ""
echo "=========================================="
echo "ESP Gateway Server"
echo "=========================================="
echo "ESP_ROOT: $ESP_ROOT"
echo "Server will start on http://127.0.0.1:8081"
echo ""

# Start server
cd "$SCRIPT_DIR"
$PYTHON -m uvicorn server:app --host 127.0.0.1 --port 8081 --reload
