# Multi-Selection Testing Guide

This document describes how to test the multi-selection and drag threshold features to ensure they don't break in future updates.

## Automated Tests

### Store Tests (✅ Passing)

**Location:** `src/frontend/store/__tests__/appStore.multiSelection.test.ts`

**Run:** `npm test -- store/__tests__/appStore.multiSelection.test.ts`

**Coverage:**
- ✅ hoveredGroup state management (set/clear/switch)
- ✅ Multi-selection with shift+click (tag mode)
- ✅ Group selection logic (manual simulation)
- ✅ Selection mode switching (tag ↔ group)
- ✅ Hover + selection integration

These tests verify the Zustand store correctly manages:
- `hoveredGroup`: Tracks which bc_name group is currently hovered
- `selectedTags`: Array of selected surfaces
- `toggleTagSelection()`: Adds/removes surfaces from selection
- `clearTagSelection()`: Clears all selections
- `setHoveredGroup()`: Updates hover state

### Box Selection Tests (⚠️ Requires Component Setup)

**Note:** The `useBoxSelection` hook requires complex viewport setup (refs, Three.js context) making unit tests challenging. Instead, use **manual testing** (see below) or integration tests with full Viewport3D component.

**What needs testing:**
- Drag threshold (3px minimum movement before box selection starts)
- Shift+click passes through to surface handlers (doesn't trigger box selection)
- Camera controls disabled during box drag, re-enabled after
- Modifier keys: Shift (visible), Ctrl/Alt (all)

##Manual Testing Checklist

### Prerequisites
1. Build and run: `./build.sh`
2. Load waverider.csm project (43 surfaces in 4 groups: farfield, vehicle, symmetry, outflow)
3. Open viewport with geometry visible

### Test 1: Hover Highlighting in Group Mode
**Location:** [Viewport3D.tsx](../Viewport3D.tsx#L60-L72)

**Steps:**
1. Set toolbar to "Groups" mode (selection dropdown)
2. Hover over a farfield surface → **Expect:** All farfield surfaces highlight together (gold color)
3. Hover over a vehicle surface → **Expect:** All vehicle surfaces highlight together
4. Move mouse off geometry → **Expect:** Highlight clears

**What to check:**
- All surfaces with same `bc_name` highlight as a unit
- Hovering one member highlights entire group
- Surfaces without `bc_name` highlight individually

**Code to verify:**
```typescript
// appStore.ts
hoveredGroup: string | null  // Should update on hover
setHoveredGroup: (bcName: string | null) => void

// Viewport3D.tsx - ClickableSurface
const shouldShowHover = hovered || 
  (hoveredGroup !== null && surface.metadata.bcName === hoveredGroup)
```

---

### Test 2: Shift+Click Multi-Selection (Tag Mode)
**Location:** [Viewport3D.tsx](../Viewport3D.tsx#L140-L185)

**Steps:**
1. Set toolbar to "Tags" mode
2. Click surface 1 → **Expect:** Gold selection highlight
3. Shift+Click surface 2 → **Expect:** Both surfaces gold (multi-select)
4. Shift+Click surface 3 → **Expect:** Three surfaces selected
5. Shift+Click surface 1 again → **Expect:** Surface 1 deselected, others still selected
6. Click surface 4 (no shift) → **Expect:** Only surface 4 selected (replaces others)

**What to check:**
- Shift+click ADDS to selection (doesn't replace)
- Shift+click on already-selected surface REMOVES it
- Regular click (no shift) REPLACES entire selection
- Gold color indicates selection

**Code to verify:**
```typescript
// Viewport3D.tsx - handleClick
if (isModifierPressed) {
  toggleTagSelection(surface)  // Multi-select
} else {
  setSelectedTag(surface)  // Replace selection
}
```

---

### Test 3: Shift+Click Group Selection (Group Mode)
**Location:** [Viewport3D.tsx](../Viewport3D.tsx#L140-L175)

**Steps:**
1. Set toolbar to "Groups" mode
2. Shift+Click a farfield surface → **Expect:** All farfield surfaces selected (gold)
3. Shift+Click a vehicle surface → **Expect:** All vehicle + farfield selected
4. Shift+Click a farfield surface again → **Expect:** Entire farfield group deselected
5. Click a symmetry surface (no shift) → **Expect:** Only symmetry group selected

**What to check:**
- Shift+click selects/deselects ENTIRE group (all surfaces with same `bc_name`)
- Clicking any group member affects the whole group
- Surfaces without `bc_name` still work individually

**Code to verify:**
```typescript
// Viewport3D.tsx - group selection logic
const groupSurfaces = availableTags.filter(
  s => s.metadata.bcName === surface.metadata.bcName
)
// ... toggles all group members
```

---

### Test 4: Shift+Drag Box Selection (3px Threshold)
**Location:** [useBoxSelection.ts](../useBoxSelection.ts#L385-L428)

**Steps:**
1. Shift+Click and immediately release (no drag) on a surface
   → **Expect:** Surface gets SELECTED (click event passes through)
   → **Expect:** NO box selection appears
2. Shift+Click and drag 10px before releasing
   → **Expect:** Blue box selection rectangle appears
   → **Expect:** Surfaces inside box get selected when released
3. Shift+Click and drag only 2px before releasing
   → **Expect:** NO box selection (below 3px threshold)
   → **Expect:** Click event should pass through to surface

**What to check:**
- Small movements (< 3px) don't trigger box selection
- Box selection only starts after exceeding 3px threshold
- Shift+clicks (without drag) still select surfaces normally

**Code to verify:**
```typescript
// useBoxSelection.ts
const pendingBoxSelectRef = useRef<{ x: number; y: number; mode: 'all' | 'visible' } | null>(null)

// In handlePointerMove:
const dx = e.clientX - pending.x
const dy = e.clientY - pending.y
const distance = Math.sqrt(dx * dx + dy * dy)

if (distance > 3) {
  // NOW start box selection
  setBoxSelection({ startX: pending.x, startY: pending.y, ... })
}
```

---

### Test 5: Camera Controls During Box Selection
**Location:** [useBoxSelection.ts](../useBoxSelection.ts#L440-L460)

**Steps:**
1. Start shift+dragging a box selection
   → **Expect:** Camera rotation/pan DISABLED (can't rotate view while dragging)
2. Release mouse (complete box selection)
   → **Expect:** Camera controls RE-ENABLED immediately
3. Try to rotate camera → **Expect:** Works normally again

**What to check:**
- `controls.enabled = false` during active box selection
- `controls.enabled = true` after box selection completes
- Camera doesn't accidentally rotate while user is drawing selection box

**Code to verify:**
```typescript
// useBoxSelection.ts - handlePointerMove (when starting box)
if (controls) {
  controls.enabled = false
}

// handlePointerUp (when ending box)
if (controls) {
  controls.enabled = true
}
```

---

### Test 6: Selection Mode Persistence
**Location:** [appStore.ts](../../store/appStore.ts)

**Steps:**
1. In Group mode, select farfield group (2 surfaces)
2. Switch to Tag mode via toolbar
   → **Expect:** Both surfaces STILL selected
3. Shift+click another individual surface
   → **Expect:** Now 3 surfaces selected (previous + new one)
4. Switch back to Group mode
   → **Expect:** Same 3 surfaces still selected

**What to check:**
- Selection persists across mode switches
- Switching modes doesn't clear selection
- Behavior changes but selection data stays

---

## Regression Testing

### After Schema Changes
If `input.schema.json` updates, verify:
- Groups still identified by `bc_name` metadata
- Selection logic doesn't hardcode surface types

### After Viewport Changes
If Viewport3D/useBoxSelection modified, verify:
- All 6 manual tests above still pass
- No console errors on shift+click
- Box selection threshold still 3px

### After Store Refactoring
Run automated tests:
```bash
npm test -- store/__tests__/appStore.multiSelection.test.ts
```
All 20 tests should pass.

---

## Common Issues

### Shift+click not working
- **Check:** Does `useBoxSelection` have `pendingBoxSelectRef`?
- **Check:** Is threshold calculation using Euclidean distance?
- **Check:** Does `handlePointerUp` clear pending state?

### Group hover not highlighting all surfaces
- **Check:** Is `hoveredGroup` state in appStore?
- **Check:** Does ClickableSurface check `hoveredGroup === surface.metadata.bcName`?
- **Check:** Is `setHoveredGroup(null)` called on `onPointerOut`?

### Box selection starts on tiny movements
- **Check:** Threshold is `> 3` not `>= 3`
- **Check:** Using `Math.sqrt(dx*dx + dy*dy)` not `Math.abs(dx)` or `Math.abs(dy)`

---

## Performance Notes

These features add minimal overhead:
- `hoveredGroup`: Simple string comparison per frame
- `selectedTags`: Array lookup on click events only
- Drag threshold: 2 coordinate subtractions + 1 sqrt per pointermove

No performance degradation observed with 43-surface waverider model.
