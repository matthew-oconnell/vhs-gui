# ESP bc_name Attribute Guide

## How ESP Attributes Work

### The Problem with Boolean Operations

When you write CSM like this:
```
sphere 0 0 0 1000
attribute bc_name $farfield

import waverider.stp  
attribute bc_name $vehicle
subtract
```

**The attributes are LOST after the `subtract` operation!**

Why? Because:
1. `attribute` attaches to the current body on the stack
2. `subtract` creates a NEW body and discards the old ones
3. The new body has no knowledge of the attributes from the original bodies

### The Correct Way: Use SELECT FACE

To preserve bc_name through boolean operations, you must:
1. Create your final geometry
2. Use `select face` to choose specific faces
3. Apply `attribute bc_name` to those faces

Example:
```
# Create geometry
sphere 0 0 0 1000
import waverider.stp
subtract

# Now tag specific faces of the RESULT
select face 1
attribute bc_name $farfield

select face 5 10
attribute bc_name $vehicle

select face 15
attribute bc_name $symmetry
```

## How to Find Face Numbers

### Method 1: ESP GUI
1. Open your CSM in ESP (serveESP)
2. Click on faces to see their numbers
3. Note which faces correspond to which boundary

### Method 2: Load and Inspect
1. Load CSM without bc_name attributes
2. Look at auto-generated names (Body7_Face1, Body7_Face2, etc.)
3. Identify which faces are which
4. Add `select face` commands to your CSM

## Current Implementation Status

### ✅ What Works
- Reading bc_name attributes from faces
- Falling back to ESP internal _name attribute
- Auto-generating BodyX_FaceY names when no attribute exists

### ❌ What Doesn't Work (Yet)  
- Writing bc_name attributes from the UI back to CSM
- The waverider.csm example as written (attributes lost in boolean ops)

### 🔧 TODO
- Implement UI feature to set bc_name on selected faces
- Generate updated CSM with `select face` + `attribute` commands
- Provide face selection helper in 3D viewport

## Workaround for Now

Until we implement UI-driven bc_name updates:

1. Manually edit your CSM file
2. Add `select face N` and `attribute bc_name $name` after geometry creation
3. Reload the file
4. bc_name will be extracted and used

Example waverider.csm fix:
```
# Original geometry (no attributes lost here)
sphere 0 0 0 1000
import waverider.stp
subtract

set dx @xmax-@xmin
set dy @ymax-@ymin
set dz @zmax-@zmin
box @xmin @ymin @zmin dx 0.5*dy dz
subtract

box 200 @ymin @zmin dx dy dz
subtract

# NOW tag faces of the final result
select face 1
attribute bc_name $farfield

select face 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42
attribute bc_name $vehicle  

# (You'd need to identify which faces are actually symmetry and outflow)
```

## Future Enhancement

Part 2 (UI-driven bc_name updates) will implement:
1. Select faces in 3D viewport
2. Set bc_name through dialog
3. Auto-generate CSM with correct `select face` + `attribute` commands
4. Rebuild geometry with updated attributes

This requires:
- EG_attributeAdd FFI binding
- CSM generation with select/attribute commands
- Model rebuild after attribute changes
