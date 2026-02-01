# BC Name Feature Test Plan

## Test 1: Load CSM with bc_name attributes

**File:** examples/waverider.csm

**Expected Result:**
- Tags Panel should show 4 groups:
  - farfield (1-2 tags)
  - vehicle (multiple tags)
  - symmetry (1-2 tags)
  - outflow (1-2 tags)
- NOT "Body7_Face1", "Body7_Face2", etc.

**How to Test:**
1. Launch app: `./build.sh` (or already running)
2. Menu → File → Load Geometry → select examples/waverider.csm
3. Check Tags Panel on left - should show named groups

---

## Test 2: Set BC Name via Right-Click

**Expected Result:**
- Selected tag(s) rename immediately
- Tags move to correct group in Tags Panel
- CSMBuilder records operation

**How to Test:**
1. Load waverider.csm (from Test 1)
2. Click a "vehicle" tag in viewport
3. Right-click → "Set BC Name..."
4. Enter "test_wall"
5. Click "Set BC Name"

**Verify:**
- Tag name changes from "vehicle" to "test_wall"
- Tag appears under "test_wall" group in Tags Panel
- Console shows: `[CSMBuilder] Recorded operation: select face...`

---

## Test 3: Multi-Tag BC Name Setting

**Expected Result:**
- All selected tags rename at once
- All move to same group

**How to Test:**
1. Hold Shift (or Ctrl depending on settings)
2. Click multiple tags
3. Right-click → "Set BC Name..." → "shared_wall"

**Verify:**
- All selected tags now show "shared_wall"
- All appear in one "shared_wall" group

---

## Test 4: CSM Export with bc_name Commands

**Expected Result:**
- Exported CSM includes original content + new bc_name commands

**How to Test:**
1. After changing some bc_names (from Test 2/3)
2. Menu → Export → Export CSM
3. Save as test_export.csm
4. Open in text editor

**Verify CSM contains:**
```csm
# ===================================================================
# Operations added by VHS-GUI
# Generated: <timestamp>
# Total operations: <N>
# ===================================================================

select face <X>
attribute bc_name $test_wall

select face <Y> <Z>
attribute bc_name $shared_wall
```

---

## Test 5: Round-Trip (Export + Reload)

**Expected Result:**
- Reloading exported CSM preserves custom bc_names

**How to Test:**
1. Load test_export.csm (from Test 4)
2. Check Tags Panel

**Verify:**
- Custom names ("test_wall", "shared_wall") appear as groups
- Original names ("vehicle", "farfield") still present for unchanged faces

---

## Test 6: No bc_name Attribute (Fallback)

**Expected Result:**
- Tags without bc_name show ESP internal ID (e.g., "Body1_Face12")

**How to Test:**
1. Create simple CSM without bc_name:
```csm
sphere 0 0 0 100
```
2. Load it

**Verify:**
- Tags show "Body1_Face1", "Body1_Face2" (ESP auto-generated names)

---

## Common Issues to Watch For:

❌ **Tags still show "Body7_Face12" after fix**
→ Clear browser cache / rebuild both frontend and Rust

❌ **Set BC Name dialog doesn't appear**
→ Check console for errors in Viewport3D.tsx

❌ **CSM export missing bc_name commands**
→ Check CSMBuilder.hasOperations() returns true

❌ **bc_name attributes lost on export/reload**
→ Verify CSM includes both `select face` AND `attribute bc_name`

---

## Success Criteria:

✅ All 6 tests pass
✅ No console errors
✅ BC names persist through export/reload cycle
✅ UI groups tags by bc_name correctly
