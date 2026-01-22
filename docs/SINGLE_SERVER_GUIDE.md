# ⚠️ OUTDATED - See ARCHITECTURE.md

This document is outdated. The project now uses TWO servers (C++ + ESP).

**See:** [ARCHITECTURE.md](ARCHITECTURE.md) for current architecture.

---

# Single Server Architecture (OBSOLETE)

## Overview

The C++ server serves both the frontend (static files) and backend API on a single port, eliminating the need for separate dev servers.

**Architecture:**
- **Production:** One server (port 8080) for everything
- **Development:** Optional Vite dev server (port 5173) for hot-reload

## Quick Start

### Build and Run (Automatic)
```bash
./build.sh
# Builds everything and automatically:
# - Starts server on http://127.0.0.1:8080
# - Opens your default browser
```

### Manual Build and Run
```bash
./build.sh  # Just build, don't launch
cd src/server/build && ./vulcan_server
```

**What `build.sh` does:**
1. Builds React frontend → `dist/`
2. Compiles C++ server → `src/server/build/vulcan_server`
3. Copies `dist/*` to `src/server/build/public/`
4. Launches server and opens browser

### Server Architecture

```cpp
// In main.cpp
svr.set_mount_point("/", publicDir.string());  // Serve static files
svr.set_file_request_handler([...]);           // SPA routing fallback
Optional - Hot Reload)

For faster frontend development with hot module reload:
```bash
# Terminal 1: Backend server
cd src/server/build
./vulcan_server

# Terminal 2: Vite dev server (hot reload)
cd src/frontend
npm run dev
# Visit: http://localhost:5173
```

**Note:** You must configure `VITE_API_URL=http://127.0.0.1:8080` in `.env` for dev mode. Development Mode (TWO SERVERS)

Still available for hot reloading:
```bash
# Terminal 1: Backend
./vulcan_server

# Terminal 2: Frontend  
npm run dev
```

## Benefits

✅ **Auto-launch** - `build.sh` opens browser automatically

## File Structure

```
src/server/build/
├── vulcan_server           # Single executable (1.8MB)
├── uploads/                # Mesh upload directory (session-based)
└── public/                 # React build (copied by build.sh)
    ├── index.html
    ├── assets/
    │   ├── index-*.js      (~1.3MB minified)
    │   └── index-*.css     (~35KB)
    └── schemas/
        └── input.schema.json

dist/                       # Frontend build output (temporary)
└── [copied to src/server/build/public/]

src/frontend/public/schemas/
└── input.schema.json       # Source schema (copied during
        └── input.schema.json

src/frontend/public/
└── schemas/
    └── input.schema.json   # Source schema (copied to build)
```

## Testing

```bash
# Health check (API)
curl http://127.0.0.1:8080/api/health

# Frontend (HTML)
curl http://127.0.0.1:8080/

# Static asset
curl http://127.0.0.1:8080/assets/index-DYNVlEL8.js

# Upload mesh
curl -X POST -F "mesh=@waverider.obj" http://127.0.0.1:8080/api/mesh/upload
```

All working from ONE server! 🎉

## Performance

| MImplementation Details

**Server (src/server/src/main.cpp):**
- Static file serving with SPA fallback
- API routes on `/api/*`
- Mesh upload handling with session management

**Build System:**
- `build.sh` - Main build script (builds + launches)
- `src/scripts/create-distribution.sh` - Package for distribution
- `src/scripts/rebuild-frontend.sh` - Quick frontend-only rebuild

**Configuration:**
- Production: API URL is relative (same origin)
- Development: Set `VITE_API_URL` in `.env` for Vite dev server
| Speed | Faster dev | Faster load |

## What Changed

1. **server/src/main.cpp** - Added static file serving
2. **build-production.sh** - Automated build script
3. **.env.production** - Empty API_URL for same-origin
4. **README.md** - Updated documentation

## Next Steps

- [ ] Add HTTPS/SSL support
- [ ] Add gzip compression for static files
- [ ] Add caching headers for assets
- [ ] Add health check endpoint for load balancers
- [ ] Deploy to shared server for team access
