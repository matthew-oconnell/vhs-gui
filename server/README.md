# Vulcan Server - C++ Backend

HTTP server for Vulcan CFD GUI mesh conversion and configuration management.

## Quick Start

### Prerequisites

- C++17 compatible compiler (GCC 7+, Clang 5+, MSVC 2017+)
- CMake 3.15+
- Make or Ninja
- pthread library (usually pre-installed on Linux/macOS)

### Build

```bash
cd server
mkdir build && cd build
cmake ..
make
```

### Run Server

```bash
# From build directory
./vulcan_server

# Custom port and host
./vulcan_server --port 3000
./vulcan_server --host 0.0.0.0 --port 8080
```

### Run Tests

```bash
# From build directory
./vulcan_tests

# Or using CTest
ctest --output-on-failure
```

## API Endpoints

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Vulcan server is running",
  "version": "1.0.0"
}
```

### `GET /api/info`
Server information and available endpoints.

**Response:**
```json
{
  "name": "Vulcan CFD GUI Server",
  "version": "1.0.0",
  "description": "HTTP backend for mesh conversion and configuration management",
  "endpoints": ["/api/health", "/api/info"]
}
```

### `POST /api/mesh/upload`
Upload a mesh file for conversion.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Field: `mesh` (file upload)

**Supported Formats:**
- `.meshb` - Binary mesh format
- `.egads` - EGADS geometry
- `.csm` - Constructive Solid Modeling
- `.obj` - Wavefront OBJ
- `.stl` - STereoLithography

**Success Response (200):**
```json
{
  "success": true,
  "sessionId": "1768761927085_1624",
  "filename": "test.meshb",
  "extension": "meshb",
  "size": "26.00 B",
  "sizeBytes": 26,
  "path": "/tmp/vulcan/uploads/1768761927085_1624/test.meshb",
  "message": "File uploaded successfully. Conversion pending."
}
```

**Error Responses:**
```json
// 400: No file uploaded
{"error":"No file uploaded","field":"mesh"}

// 400: Unsupported format
{"error":"Unsupported file format","extension":"txt","supported":["meshb","egads","csm","obj","stl"]}

// 500: Server error
{"error":"Failed to save file","message":"..."}
```

**Example:**
```bash
curl -X POST -F "mesh=@waverider.meshb" http://127.0.0.1:8080/api/mesh/upload
```

### `GET /api/mesh/convert/{sessionId}`
Convert uploaded mesh to JSON format.

**Request:**
- Method: `GET`
- URL Parameter: `{sessionId}` - Session ID from upload response

**Success Response (200):**
```json
{
  "totalVertices": 50516,
  "totalFaces": 101032,
  "globalCenter": [-350.000000, 499.909000, 0.000000],
  "globalScale": 0.005000,
  "regions": [
    {
      "name": "sphere",
      "tag": 1,
      "vertices": [[x, y, z], ...],
      "cells": [[i1, i2, i3], ...]
    }
  ]
}
```

**Error Responses:**
```json
// 404: Session not found
{"error":"Session not found","sessionId":"..."}

// 404: No mesh file in session
{"error":"No mesh file found in session"}

// 500: Conversion failed
{"error":"Conversion failed","message":"..."}
```

**Example Workflow:**
```bash
# 1. Upload mesh
RESPONSE=$(curl -X POST -F "mesh=@waverider.obj" http://127.0.0.1:8080/api/mesh/upload)
SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')

# 2. Convert mesh
curl http://127.0.0.1:8080/api/mesh/convert/$SESSION_ID > mesh.json

# 3. Use mesh.json in frontend
```

## Development

### Project Structure

```
server/
├── CMakeLists.txt          # Build configuration
├── README.md               # This file
├── src/
│   └── main.cpp            # Server entry point
├── tests/
│   ├── test_main.cpp       # Catch2 test runner
│   └── test_server.cpp     # Server tests
├── include/
│   ├── crow_all.h          # crow HTTP framework
│   └── catch.hpp           # Catch2 testing framework
└── build/                  # Build artifacts (gitignored)
```

### Adding New Endpoints

Edit `src/main.cpp`:

```cpp
CROW_ROUTE(app, "/api/your-endpoint")
([]() {
    crow::json::wvalue response;
    response["data"] = "your data";
    return response;
});
```

### Testing

Tests use [Catch2](https://github.com/catchorg/Catch2) framework.

Add new tests in `tests/`:

```cpp
TEST_CASE("Your test", "[tag]") {
    REQUIRE(1 + 1 == 2);
}
```

## Dependencies

- **cpp-httplib**: Header-only C++ HTTP library (no external dependencies!)
  - Version: 0.15+
  - License: MIT
  - Included in `include/httplib.h`

- **Catch2**: C++ testing framework
  - Version: 2.13.10
  - License: BSL-1.0
  - Included in `include/catch.hpp`

## Next Steps

- [x] Add mesh upload endpoint (`POST /api/mesh/upload`)
- [ ] Integrate mesh conversion libraries
- [ ] Add static file serving for React frontend
- [ ] Implement caching layer
- [ ] Add configuration file support

## Troubleshooting

### Port already in use
```bash
# Find process using port 8080
lsof -i :8080
# Or use a different port
./vulcan_server --port 8081
```

### Build errors
```bash
# Clean build
rm -rf build
mkdir build && cd build
cmake ..
make
```
