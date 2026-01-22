#!/bin/bash
# Build script - combines React frontend + C++ backend into single server
# Use this for both development and deployment

set -e  # Exit on error

echo "======================================"
echo "Building VHS Server"
echo "======================================"

# Step 0: Check and download ESP128 if needed
echo ""
echo "Step 0: Checking ESP128 installation..."

ESP_DIR="third-party/ESP128"
ESP_BASE_URL="https://acdl.mit.edu/ESP/PreBuilts"

# Function to detect OS and architecture
detect_platform() {
    local os=$(uname -s)
    local arch=$(uname -m)
    
    case "$os" in
        Darwin)
            if [ "$arch" = "arm64" ]; then
                echo "ESP128-macos-arm64.tgz"
            else
                echo "ESP128-macos-x86_64.tgz"
            fi
            ;;
        Linux)
            if [ "$arch" = "aarch64" ]; then
                echo "ESP128-linux-aarch64.tgz"
            else
                echo "ESP128-linux-x86_64.tgz"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "ESP128-win-x64.zip"
            ;;
        *)
            echo "unsupported"
            ;;
    esac
}

# Check if ESP128 is already installed
if [ -d "$ESP_DIR" ] && [ "$(ls -A $ESP_DIR 2>/dev/null)" ]; then
    echo "✅ ESP128 found in $ESP_DIR"
else
    echo "ESP128 not found. Downloading..."
    
    # Detect platform
    TARBALL=$(detect_platform)
    
    if [ "$TARBALL" = "unsupported" ]; then
        echo "❌ Error: Unsupported platform $(uname -s) $(uname -m)"
        echo "Please download ESP128 manually from $ESP_BASE_URL"
        exit 1
    fi
    
    # Create third-party directory
    mkdir -p third-party
    
    # Download ESP128
    echo "Downloading $TARBALL..."
    if command -v curl > /dev/null; then
        curl -L -o "third-party/$TARBALL" "$ESP_BASE_URL/$TARBALL"
    elif command -v wget > /dev/null; then
        wget -O "third-party/$TARBALL" "$ESP_BASE_URL/$TARBALL"
    else
        echo "❌ Error: Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    
    # Extract tarball
    echo "Extracting ESP128..."
    cd third-party
    if [[ "$TARBALL" == *.zip ]]; then
        unzip -q "$TARBALL"
    else
        tar -xzf "$TARBALL"
    fi
    
    # Remove tarball to save space
    rm "$TARBALL"
    
    cd ..
    
    echo "✅ ESP128 installed successfully"
fi

# Step 1: Build React frontend
echo ""
echo "Step 1: Building React frontend..."

# Copy schema to public directory before build (Vite will include it)
echo "Copying schema to public/schemas..."
mkdir -p public/schemas
cp schemas/input.schema.json public/schemas/

cd src/frontend
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi
npm run build
cd ../..

# Step 2: Build C++ backend
echo ""
echo "Step 2: Building C++ backend..."
cd src/server
./build.sh

# Step 3: Copy React build to server's public directory
echo ""
echo "Step 3: Copying frontend to server..."
cd build
rm -rf public
mkdir -p public
cp -r ../../frontend/dist/* public/

# Ensure schema is in the server's public directory
mkdir -p public/schemas
cp ../../../schemas/input.schema.json public/schemas/

echo ""
echo "======================================"
echo "✅ Build Complete!"
echo "======================================"
echo ""
echo "Server binary: src/server/build/vhs_server"
echo "Frontend files: src/server/build/public/"
echo ""
echo "Launching servers and opening browser..."
echo ""

# Launch ESP server in background (for CSM file support)
echo "Starting ESP Gateway Server (port 8081)..."
cd ../../esp-server
./start.sh > /dev/null 2>&1 &
ESP_SERVER_PID=$!
cd ../server/build

# Wait a moment for ESP server to initialize
sleep 2

# Launch main server in background
echo "Starting VHS Server (port 8080)..."
./vhs_server > /dev/null 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Open browser
if command -v xdg-open > /dev/null; then
    xdg-open http://127.0.0.1:8080
elif command -v open > /dev/null; then
    open http://127.0.0.1:8080
else
    echo "Please open http://127.0.0.1:8080 in your browser"
fi

echo "Servers running:"
echo "  - VHS Server PID: $SERVER_PID"
echo "  - ESP Server PID: $ESP_SERVER_PID"
echo ""
echo "To stop servers: kill $SERVER_PID $ESP_SERVER_PID"
echo ""
echo "Press Ctrl+C to stop both servers and exit"
echo "======================================"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $SERVER_PID 2>/dev/null
    kill $ESP_SERVER_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for user to stop
wait $SERVER_PID
