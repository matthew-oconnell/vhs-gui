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

- [ ] Add mesh upload endpoint (`POST /api/mesh/upload`)
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
