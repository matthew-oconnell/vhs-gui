# VHS-GUI Architecture

## Overview

The application uses **TWO separate backend servers** for different geometry processing tasks:

1. **C++ Server (port 8080)** - Mesh file parsing and GUI rendering
2. **ESP Gateway Server (port 8081)** - CSM geometry processing via pyOCSM/EGADS

Both servers must run simultaneously for full functionality.

---

## Quick Start

### Build and Run Everything

```bash
./build.sh
# Builds frontend and C++ server, then opens browser
```

Then in a **separate terminal**, start the ESP server:

```bash
cd src/esp-server
./start.sh
# Starts ESP gateway on http://127.0.0.1:8081
```

### Manual Steps

```bash
# Terminal 1: Build and run C++ server
./build.sh
cd src/server/build && ./vhs_server
# Server runs on http://127.0.0.1:8080

# Terminal 2: Run ESP gateway
cd src/esp-server
./start.sh
# Server runs on http://127.0.0.1:8081
```

---

## Server Details

### 1. C++ Server (port 8080)

**Purpose:**
- Serves React frontend (static files from `public/`)
- Parses mesh files (.obj, .stl, .meshb, .egads)
- Provides mesh upload API

**Key Files:**
- `src/server/src/main.cpp` - Main server implementation
- `src/server/src/mesh_converter.hpp` - Mesh parsing logic
- `src/server/build/vhs_server` - Compiled executable

**Endpoints:**
- `GET /` - Serves React app (index.html)
- `GET /assets/*` - Static assets (JS, CSS)
- `GET /schemas/input.schema.json` - Configuration schema
- `POST /api/mesh/upload` - Upload mesh file for parsing
- `POST /api/mesh/convert` - Convert mesh data

**Build:**
```bash
cd src/server
./build.sh
# Creates: src/server/build/vhs_server
```

### 2. ESP Gateway Server (port 8081)

**Purpose:**
- Interface with ESP/pyOCSM for CSM file processing
- Build geometry from CSM scripts
- Return tessellated surfaces for visualization
- Export CSM files with updated bc_name attributes

**Key Files:**
- `src/esp-server/server.py` - FastAPI server
- `src/esp-server/start.sh` - Startup script (sets ESP_ROOT)
- `src/esp-server/requirements.txt` - Python dependencies

**Endpoints:**
- `GET /health` - Check ESP availability and environment
- `POST /csm/build` - Build CSM and return tessellation
- `POST /csm/export-with-bc-names` - Export CSM with updated attributes

**Working Directory:**
- Runs from: `/Users/mdoconn1/Desktop/vhs-gui/src/esp-server`
- Uses temp files for CSM processing

**Dependencies:**
- ESP128 (downloaded automatically by `build.sh`)
- pyOCSM, pyEGADS (from ESP)
- Python packages: FastAPI, uvicorn, numpy, pydantic

**Start:**
```bash
cd src/esp-server
./start.sh
# Sets ESP_ROOT and starts uvicorn server
```

---

## File Flow

### Loading a Mesh File (.obj, .stl, etc.)

```
User selects file
    ↓
Frontend reads file
    ↓
POST to C++ server (:8080/api/mesh/upload)
    ↓
C++ parses mesh → surfaces
    ↓
Frontend receives surfaces
    ↓
Render in 3D viewport
```

### Loading a CSM File

```
User selects .csm file
    ↓
Frontend reads CSM text content
    ↓
POST to ESP server (:8081/csm/build)
    ↓
ESP writes CSM to temp file
    ↓
pyOCSM builds geometry
    ↓
ESP extracts tessellation
    ↓
Frontend receives surfaces
    ↓
Render in 3D viewport
```

**⚠️ Known Issue:** CSM files with `import` statements (e.g., `import waverider.stp`) fail because:
- ESP server writes CSM to temp directory (`/tmp/tmpXYZ.csm`)
- pyOCSM looks for imported files relative to temp directory
- Imported files don't exist in temp directory
- Geometry build fails or returns incomplete results

---

## File Structure

```
vhs-gui/
├── build.sh                          # Main build script
├── schemas/
│   └── input.schema.json             # Source schema (upstream maintained)
├── public/
│   └── schemas/
│       └── input.schema.json         # Copy for Vite publicDir
├── src/
│   ├── frontend/                     # React app
│   │   ├── dist/                     # Build output (copied to server)
│   │   ├── public/                   # Static assets
│   │   ├── components/
│   │   ├── store/
│   │   ├── utils/
│   │   │   ├── espApi.ts             # ESP server client
│   │   │   ├── espAdapter.ts         # ESP → Surface conversion
│   │   │   ├── backendApi.ts         # C++ server client
│   │   │   └── meshAdapter.ts        # Mesh → Surface conversion
│   │   └── vite.config.ts
│   │
│   ├── server/                       # C++ mesh server
│   │   ├── build/
│   │   │   ├── vhs_server            # Compiled executable
│   │   │   └── public/               # Served by C++ server
│   │   │       ├── index.html
│   │   │       ├── assets/
│   │   │       └── schemas/
│   │   ├── src/
│   │   │   ├── main.cpp              # Server + file serving
│   │   │   └── mesh_converter.hpp    # Mesh parsing
│   │   └── build.sh
│   │
│   └── esp-server/                   # Python ESP gateway
│       ├── server.py                 # FastAPI app
│       ├── start.sh                  # Startup script
│       └── requirements.txt          # Python deps
│
└── third-party/
    └── ESP128/                       # Auto-downloaded by build.sh
        ├── EngSketchPad/
        │   ├── lib/                  # EGADS shared libraries
        │   └── pyESP/                # pyOCSM, pyEGADS
        ├── OpenCASCADE-7.8.1/
        └── Python-3.12.10/
```

---

## Build System

### `./build.sh` (Main Build Script)

**Steps:**
1. ✅ Check/download ESP128 if missing
2. 📦 Build React frontend (`npm run build` → `dist/`)
3. 📋 Copy schema to `public/schemas/`
4. 🔨 Build C++ server (CMake → `vhs_server`)
5. 📂 Copy `dist/` to `src/server/build/public/`
6. 🚀 Start C++ server and open browser

**Note:** Does NOT start ESP server - must be started manually.

### Frontend Build

```bash
cd src/frontend
npm install
npm run build
# Output: dist/ (index.html, assets/, schemas/)
```

### C++ Server Build

```bash
cd src/server
./build.sh  # Runs CMake
# Output: build/vhs_server
```

---

## Development Workflow

### Standard Development (Production Build)

```bash
# Terminal 1: Build and run everything
./build.sh
# Opens browser to http://127.0.0.1:8080

# Terminal 2: Start ESP server
cd src/esp-server && ./start.sh
```

### Frontend Hot-Reload Development

```bash
# Terminal 1: C++ server
cd src/server/build && ./vhs_server

# Terminal 2: ESP server  
cd src/esp-server && ./start.sh

# Terminal 3: Vite dev server (hot reload)
cd src/frontend
npm run dev
# Opens http://localhost:5173
```

**Config for dev mode:** Set `VITE_API_URL` in `.env`:
```env
VITE_C_API_URL=http://127.0.0.1:8080
VITE_ESP_API_URL=http://127.0.0.1:8081
```

---

## Testing

### Health Checks

```bash
# C++ server
curl http://127.0.0.1:8080/api/health

# ESP server
curl http://127.0.0.1:8081/health
```

### Upload Mesh

```bash
curl -X POST \
  -F "mesh=@examples/waverider.obj" \
  http://127.0.0.1:8080/api/mesh/upload
```

### Build CSM

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"csm_content": "sphere 0 0 0 10"}' \
  http://127.0.0.1:8081/csm/build
```

---

## Environment Variables

### ESP Server

Set in `src/esp-server/start.sh`:

- `ESP_ROOT` - Path to ESP installation (auto-set to `third-party/ESP128/EngSketchPad`)
- `LD_LIBRARY_PATH` - Shared library paths for EGADS/OpenCASCADE

### Frontend

Set in `.env` (optional for dev mode):

- `VITE_C_API_URL` - C++ server URL (default: same origin in production)
- `VITE_ESP_API_URL` - ESP server URL (default: http://127.0.0.1:8081)

---

## Configuration

### Frontend (vite.config.ts)

```typescript
export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../../public'), // Schema files
  server: {
    port: 5173,  // Dev mode only
  },
  build: {
    outDir: 'dist',
  }
})
```

### C++ Server (main.cpp)

```cpp
svr.set_mount_point("/", publicDir.string());        // Serve static files
svr.Post("/api/mesh/upload", handleMeshUpload);      // Mesh API
svr.Post("/api/mesh/convert", handleMeshConvert);    // Mesh conversion
```

### ESP Server (server.py)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        # ...
    ]
)
```

---

## Performance Notes

| Component | Size | Load Time |
|-----------|------|-----------|
| Frontend JS | ~1.3MB | ~200ms |
| Frontend CSS | ~35KB | ~20ms |
| C++ executable | ~1.8MB | n/a |
| ESP startup | n/a | ~2-3s |

---

## Known Issues

### 1. CSM Import Statements

**Problem:** CSM files with `import` statements fail to load correctly.

**Example:**
```csm
import waverider.stp  # ❌ File not found
sphere 0 0 0 1000
subtract
```

**Cause:** ESP server writes CSM to temp directory; imported files not available.

**Workaround:** Use absolute paths or single-file CSM scripts.

**Fix in progress:** See GitHub issue #XX

### 2. ESP Server Must Be Started Manually

**Problem:** `build.sh` doesn't start ESP server automatically.

**Workaround:** Run `cd src/esp-server && ./start.sh` in separate terminal.

---

## Future Improvements

- [ ] Auto-start ESP server from `build.sh`
- [ ] Fix CSM import statement handling (multi-file upload)
- [ ] Add HTTPS/SSL support for production
- [ ] Add gzip compression for static assets
- [ ] Package as single distributable binary
- [ ] Add systemd/launchd service files for auto-start
- [ ] Merge C++ and ESP servers into single process (embed Python)

---

## Troubleshooting

### "ESP server not available"

1. Check if ESP server is running: `curl http://127.0.0.1:8081/health`
2. Start ESP server: `cd src/esp-server && ./start.sh`
3. Check ESP_ROOT: Should point to `third-party/ESP128/EngSketchPad`

### "Cannot connect to backend"

1. Check if C++ server is running: `curl http://127.0.0.1:8080/api/health`
2. Rebuild: `./build.sh`
3. Check port 8080 is not in use: `lsof -i :8080`

### "Configuration tree is empty"

1. Check schema file exists: `ls src/server/build/public/schemas/input.schema.json`
2. Rebuild frontend: `cd src/frontend && npm run build`
3. Re-run `./build.sh` to copy files

### "CSM file loads but shows wrong geometry"

- Likely an `import` statement issue
- Check console for ESP build errors
- Try loading the imported file separately

---

## See Also

- [README.md](../README.md) - Project overview
- [AGENTS.md](AGENTS.md) - AI agent guidelines
- [whenSchemaChanges.md](whenSchemaChanges.md) - Schema update guide
- [ROOT_SOLVER_KEY_ARCHITECTURE.md](ROOT_SOLVER_KEY_ARCHITECTURE.md) - Configuration structure
