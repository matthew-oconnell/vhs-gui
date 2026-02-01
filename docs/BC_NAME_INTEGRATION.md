# BC Name Integration Summary

## Overview
The BC (Boundary Condition) name feature allows users to label geometric faces in CSM files with meaningful names (e.g., "inlet", "wall", "farfield") that persist through export/import cycles.

## Architecture

### ESP to Frontend Flow
```
CSM File (attribute bc_name $farfield)
    ↓
ESP C Library (EG_attributeRet)
    ↓  
esp_ffi.rs::get_face_bc_name() → extracts bc_name
    ↓
esp_commands.rs::load_csm_file() → Region.bc_name
    ↓
espAdapter.ts::convertESPRegionsToSurfaces()
    ↓
Tag.metadata.tagName = bc_name (or fallback to ESP internal name)
    ↓
UI displays tag names and groups by bcName
```

### Frontend to CSM Export Flow
```
User: Right-click tag → "Set BC Name" → Enter name
    ↓
SetBCNameDialog.tsx → onSet callback
    ↓
updateTagBCName() in appStore.ts
    - Updates metadata.tagName and metadata.bcName
    - Calls csmBuilder.recordBCNameAttribute()
    ↓
CSMBuilder.ts records operations:
    - select face <faceId>
    - attribute bc_name $<name>
    ↓
Export CSM → Includes base CSM + recorded operations
    ↓
Reload CSM → Names preserved
```

## Key Files

### Backend (Rust/ESP)
- `src/frontend/src-tauri/src/esp_ffi.rs`
  - `get_face_bc_name()` - Reads bc_name via EG_attributeRet
  - `try_get_attribute()` - Helper for EGADS attribute extraction
  
- `src/frontend/src-tauri/src/esp_commands.rs`
  - `load_csm_file()` - Loads CSM, builds geometry, extracts regions with bc_name
  - Returns `GeometryData` with `Region[]` containing bc_name field

- `src/frontend/src-tauri/src/csm_generator.rs`
  - `generate_face_attribute_commands()` - Generates CSM attribute commands
  - Groups faces by bc_name to minimize SELECT statements

### Frontend (TypeScript/React)
- `src/frontend/utils/espAdapter.ts`
  - `convertESPRegionsToSurfaces()` - Maps ESP regions to Tags
  - **CRITICAL**: Sets `tagName = bc_name ?? region.name` (fallback logic)
  
- `src/frontend/types/tag.ts`
  - `TagMetadata` interface defines:
    - `tagName` - Display name (from bc_name or user-set)
    - `bcName` - ESP bc_name attribute value
    - `espInternalId` - ESP's auto-generated name (e.g., "Body1_Face12")
    - `bodyId`, `faceId` - For CSM export

- `src/frontend/store/appStore.ts`
  - `updateTagBCName()` - Updates tag metadata and records CSM operations
  
- `src/frontend/utils/csmBuilder.ts`
  - `CSMBuilder` class - Records all user operations
  - `recordBCNameAttribute()` - Records `select face` + `attribute bc_name`
  - `export()` - Generates complete CSM with base + operations

- `src/frontend/components/SetBCNameDialog/SetBCNameDialog.tsx`
  - Modal dialog for setting bc_name on selected tags
  
- `src/frontend/components/Viewport3D/Viewport3D.tsx`
  - Right-click context menu → "Set BC Name..." option
  - Handles multi-tag selection

- `src/frontend/components/TagsPanel/TagsPanel.tsx`
  - Groups tags by `metadata.bcName`
  - Displays tag names from `metadata.tagName`

## Usage

### Reading BC Names from CSM
1. Create CSM with bc_name attributes:
```csm
sphere 0 0 0 1000

import geometry.stp
subtract

# Tag faces AFTER geometry is created
select face 1
attribute bc_name $farfield

select face 2 3 4 5
attribute bc_name $vehicle

select face 10
attribute bc_name $symmetry
```

2. Load in VHS-GUI:
   - Menu → File → Load Geometry → select .csm file
   - Tags Panel shows groups: "farfield", "vehicle", "symmetry"
   - Individual tags display their bc_name

### Setting BC Names in UI
1. Select tag(s) in viewport (Shift/Ctrl-click for multi-select)
2. Right-click → "Set BC Name..."
3. Enter name (e.g., "inlet", "wall")
4. Tag name updates immediately
5. Tag moves to correct group in Tags Panel

### Exporting CSM with BC Names
1. Make changes in UI (set bc_names, create BCs, etc.)
2. Menu → Export → Export CSM
3. Save file
4. Generated CSM includes:
   - Original base CSM content
   - All recorded operations (select face + attribute bc_name)

### Round-Trip Verification
1. Export CSM after setting bc_names
2. Close app
3. Reload exported CSM
4. Verify names persist

## Testing

See `docs/BC_NAME_TEST_PLAN.md` for complete test procedures.

Quick verification:
```bash
# Load example CSM with bc_names
examples/waverider.csm

# Expected groups in Tags Panel:
- farfield
- vehicle
- symmetry
- outflow
```

## Troubleshooting

### Tags show "Body7_Face12" instead of bc_names
**Cause:** Outdated build or CSM without bc_name attributes

**Fix:**
```bash
cd /home/matthew/Projects/vulcan-gui
./build.sh  # Rebuild frontend + Rust
```

### Set BC Name dialog doesn't appear
**Cause:** JavaScript error in Viewport3D

**Fix:** Check browser console for errors

### BC names lost after export/reload
**Cause:** CSM export missing operations

**Check:**
- Exported CSM should have section:
  ```csm
  # ===================================================================
  # Operations added by VHS-GUI
  # ...
  ```
- Verify `select face` + `attribute bc_name` commands present

### ESP fails to read bc_name
**Cause:** Attribute applied before boolean operation

**Fix:** Move `select face` + `attribute` to END of CSM:
```csm
# WRONG (attributes lost in subtract):
sphere 0 0 0 100
attribute bc_name $sphere
import shape.stp
attribute bc_name $shape
subtract

# CORRECT (attributes applied to final result):
sphere 0 0 0 100
import shape.stp
subtract

select face 1
attribute bc_name $sphere_face

select face 2
attribute bc_name $shape_face
```

## Related Documentation

- `docs/ESP_BC_NAME_GUIDE.md` - Detailed ESP attribute mechanics
- `docs/BC_NAME_TEST_PLAN.md` - Testing procedures
- `docs/ESP_NATIVE_INTEGRATION.md` - ESP C library integration
- `docs/TERMINOLOGY_MIGRATION.md` - Tag vs Face vs Surface naming

## Maintenance Notes

### When Adding New CSM Commands
If you add features that generate CSM commands (e.g., geometry operations):
1. Add operation type to `CSMOperation['type']` in csmBuilder.ts
2. Add recording method to `CSMBuilder` class
3. Call recording method from UI interaction
4. Test export/reload cycle

### Schema Changes
This feature is **independent of input.schema.json**. BC names are purely geometric/CAD metadata, not part of the solver configuration schema.

## Future Enhancements

1. **Interactive face selection in ESP viewer**
   - Click face in 3D → shows face number
   - Right-click → "Set BC Name on Face N"

2. **Auto-detect common patterns**
   - Largest face → probably "farfield"
   - Smallest high-curvature faces → probably "vehicle"

3. **Import bc_names from STEP files**
   - Some CAD tools embed face names in STEP
   - Extract during import

4. **Visual bc_name editor**
   - Show CSM with syntax highlighting
   - Inline editing of bc_name attributes
