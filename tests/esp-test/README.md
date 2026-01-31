# ESP C Library Direct Integration Test

Exploratory test program to understand and validate direct integration with ESP/OCSM C libraries before implementing in Tauri.

## Purpose

This test validates:
1. ✅ Loading CSM files via `ocsmLoad()`
2. ✅ Building geometry via `ocsmBuild()`
3. ✅ Extracting design parameters
4. ✅ Getting tessellation data from EGADS

## Prerequisites

- ESP installed at `../../third-party/ESP128/EngSketchPad`
- CMake 3.15+
- C++17 compiler

## Build

```bash
# From this directory
mkdir build && cd build
cmake ..
make
```

## Run

```bash
./esp_test
```

Expected output:
```
========================================
ESP C Library Direct Integration Test
========================================

EGADS Version: X.X
OCC Revision: ...

=== Test 1: Basic CSM Load and Build ===
✓ CSM loaded successfully
Model info: 
  Branches: 1
  Parameters: 3
  Bodies: 0
...
✅ All tests passed!
```

## Test Cases

### Test 1: Basic CSM Load and Build
- Loads a simple box CSM file
- Verifies `ocsmLoad()` works
- Calls `ocsmBuild()` to create geometry
- Checks model info before/after build

### Test 2: Parameter Extraction
- Extracts DESPMTR values from CSM
- Demonstrates how to get parameter names and values
- Handles both scalar and array parameters

### Test 3: Body Tessellation
- Builds geometry
- Gets body from model
- Tessellates using EGADS `EG_makeTessBody()`
- Extracts triangle mesh data
- Counts vertices and faces

## Key API Functions Tested

### OpenCSM (libocsm.so)
- `ocsmLoad()` - Load CSM file
- `ocsmInfo()` - Get model statistics
- `ocsmBuild()` - Build geometry
- `ocsmGetPmtr()` - Get parameter info
- `ocsmGetValu()` - Get parameter values
- `ocsmGetBody()` - Get body from stack
- `ocsmFree()` - Cleanup

### EGADS (libegads.so)
- `EG_revision()` - Get version
- `EG_getTopology()` - Get body topology
- `EG_makeTessBody()` - Tessellate surface
- `EG_getTessFace()` - Get triangle mesh
- `EG_deleteObject()` - Cleanup

## Next Steps

After validating this works:
1. Create Rust FFI bindings to these C functions
2. Add to Tauri `build.rs` to link ESP libraries
3. Implement Tauri commands that wrap these functions
4. Replace Python ESP server with native calls

## Troubleshooting

**Error: `libocsm.so: cannot open shared object file`**
- Set `LD_LIBRARY_PATH`: `export LD_LIBRARY_PATH=$PWD/../../third-party/ESP128/EngSketchPad/lib:$LD_LIBRARY_PATH`
- Or run from build dir: `LD_LIBRARY_PATH=../../../third-party/ESP128/EngSketchPad/lib ./esp_test`

**Compiler errors about undefined functions:**
- Check that ESP headers are in include path
- Verify `extern "C"` wrapper around includes

**Link errors:**
- Check library order (ocsm before egads)
- Verify ESP libraries exist in lib directory
