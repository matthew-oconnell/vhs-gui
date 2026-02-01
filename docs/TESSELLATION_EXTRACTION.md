# ESP Tessellation Extraction Implementation

## Overview

This document describes how 3D mesh data (tessellation) is extracted from ESP/EGADS geometry for rendering in the 3D viewer.

## Problem

CSM files load successfully and build in ESP, but surfaces don't render because no mesh data was being extracted from the built geometry.

## Solution: Using `ocsmGetEgo` + `EG_getTessFace`

### API Discovery

The original implementation attempted to use `ocsmGetBodyObj()`, which **does not exist** in the ESP API.

The correct approach uses:
1. **`ocsmGetEgo()`** - Get EGADS objects (body, tessellation, faces, etc.) from OCSM model
2. **`EG_getTessFace()`** - Extract triangle mesh from EGADS tessellation object

### Function Signature

```c
int ocsmGetEgo(
    void   *modl,           // OCSM model pointer
    int    ibody,           // Body index (1-based)
    int    seltype,         // Type: OCSM_BODY, OCSM_NODE, OCSM_EDGE, or OCSM_FACE
    int    iselect,         // What to get:
                            //   0 = body object
                            //   1 = tessellation object ⭐
                            //   2 = context
                            //   3 = EBody
                            //   4 = tessellation on EBody
    ego    *theEgo          // Output: EGADS object
);

int EG_getTessFace(
    const ego tess,         // Tessellation object (from ocsmGetEgo with iselect=1)
    int fIndex,             // Face index (1-based)
    int *len,               // Output: number of points
    const double **xyz,     // Output: point coordinates [x1,y1,z1, x2,y2,z2, ...]
    const double **uv,      // Output: UV parameters
    const int **ptype,      // Output: point types
    const int **pindex,     // Output: point indices
    int *tlen,              // Output: number of triangles
    const int **tris,       // Output: triangle vertex indices [v1,v2,v3, ...] (1-based!)
    const int **tric        // Output: triangle neighbors
);
```

### Implementation

Located in `/home/matthew/Projects/vulcan-gui/src/frontend/src-tauri/src/esp_ffi.rs`:

```rust
pub fn get_body_tessellation(&self, body_index: i32) -> Result<Vec<FaceTessellation>, String> {
    unsafe {
        // Step 1: Get tessellation object (iselect=1)
        let mut tess: *mut c_void = ptr::null_mut();
        let status = ocsmGetEgo(
            self.ptr,
            body_index,
            OCSM_BODY,  // Requesting body-level object
            1,          // iselect=1 means tessellation
            &mut tess
        );
        
        if status != SUCCESS || tess.is_null() {
            return Err(format!("Failed to get tessellation: status {}", status));
        }
        
        // Step 2: Get number of faces from body info
        let body_info = self.get_body(body_index)?;
        let nfaces = body_info.faces;
        
        let mut face_meshes = Vec::new();
        
        // Step 3: Extract tessellation for each face
        for iface in 1..=nfaces {
            let mut plen: c_int = 0;
            let mut xyz: *const c_double = ptr::null();
            let mut tlen: c_int = 0;
            let mut tris: *const c_int = ptr::null();
            // ... other parameters
            
            EG_getTessFace(tess, iface, &mut plen, &mut xyz, ...);
            
            // Convert C arrays to Rust Vecs
            for i in 0..plen as usize {
                vertices.push([
                    *xyz.offset((i * 3) as isize),      // x
                    *xyz.offset((i * 3 + 1) as isize),  // y
                    *xyz.offset((i * 3 + 2) as isize)   // z
                ]);
            }
            
            for i in 0..tlen as usize {
                // CRITICAL: EGADS uses 1-based indexing, convert to 0-based!
                triangles.push([
                    (*tris.offset((i * 3) as isize) - 1) as i32,
                    (*tris.offset((i * 3 + 1) as isize) - 1) as i32,
                    (*tris.offset((i * 3 + 2) as isize) - 1) as i32
                ]);
            }
            
            face_meshes.push(FaceTessellation { ... });
        }
        
        Ok(face_meshes)
    }
}
```

### Key Implementation Details

1. **Two-step process**:
   - First get tessellation object with `ocsmGetEgo(..., iselect=1)`
   - Then extract face meshes with `EG_getTessFace`

2. **Index conversion**:
   - EGADS bodies/faces are **1-based** (face 1, 2, 3...)
   - Triangle vertex indices from `tris` array are **1-based**
   - Must convert to **0-based** for Rust/frontend (subtract 1)

3. **Memory safety**:
   - All pointers are owned by EGADS - **do not free**
   - Data valid until tessellation object is destroyed
   - Copy to Rust Vecs for safe transfer to frontend

4. **Error handling**:
   - Check `status != SUCCESS` after each call
   - Check tessellation pointer is not null
   - Skip faces that fail (some may not have tessellation)

## Data Flow

```
CSM File
  ↓
ocsmLoad() → OcsmModel
  ↓
ocsmBuild() → Builds geometry + auto-tessellates
  ↓
ocsmGetEgo(iselect=1) → Tessellation object (ego)
  ↓
EG_getTessFace(face_index) → xyz[], tris[] arrays
  ↓
Convert to Rust Vec → FaceTessellation { vertices, triangles }
  ↓
Tauri command → JSON serialization
  ↓
Frontend → ESPRegion[] → Three.js BufferGeometry
  ↓
3D Viewer renders mesh
```

## Troubleshooting

### Tessellation is empty (no triangles)

**Cause**: ESP builds models but doesn't auto-tessellate by default.

**Solution**: Call tessellation before building or configure tessellation parameters.

Check ESP documentation for:
- `ocsmSetTess()` - Set tessellation parameters
- `ocsmTess()` - Explicitly tessellate model

### Mesh looks wrong (inverted, missing faces)

**Possible causes**:
1. **Triangle winding order**: Check if normals are inverted
2. **Index conversion bug**: Verify 1-based → 0-based conversion
3. **Face orientation**: EGADS faces have `senses` (normal direction)

**Debug**:
```rust
println!("Face {}: {} vertices, {} triangles", iface, plen, tlen);
println!("First triangle: [{}, {}, {}]", tris[0], tris[1], tris[2]);
```

### Function not found linker error

**Error**: `undefined symbol: ocsmGetEgo`

**Cause**: ESP libraries not linked or wrong version of ESP.

**Solution**: Check `build.rs` has:
```rust
println!("cargo:rustc-link-lib=dylib=ocsm");
println!("cargo:rustc-link-lib=dylib=egads");
```

Verify ESP version ≥ 1.20 (earlier versions may not have `ocsmGetEgo`).

### Crash when accessing xyz/tris arrays

**Cause**: Accessing data after tessellation object destroyed.

**Solution**: Copy data immediately to Rust Vecs - don't store raw pointers.

## Future Enhancements

1. **Boundary condition names**: Extract `bc_name` attribute from faces using `EG_attributeRet()`
2. **Edge tessellation**: Use `EG_getTessEdge()` for wireframe rendering
3. **Tessellation quality**: Make tessellation parameters user-configurable
4. **Caching**: Cache tessellation data to avoid re-extraction on every render

## References

- ESP API Documentation: `/third-party/ESP128/EngSketchPad/doc/`
- EGADS headers: `/third-party/ESP128/EngSketchPad/include/egads.h`
- OCSM headers: `/third-party/ESP128/EngSketchPad/include/OpenCSM.h`
- Implementation: `src/frontend/src-tauri/src/esp_ffi.rs`
