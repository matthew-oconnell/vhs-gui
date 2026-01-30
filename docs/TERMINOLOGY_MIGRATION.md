# Terminology Migration Guide

**Date:** January 29, 2026  
**Status:** Migration in progress

## Overview

This document records the terminology migration from confusing/overlapping terms to a clean, consistent model based on the CFD solver's actual concepts.

## Core Principle

The CFD solver only understands:
1. **Tag Numbers** (integers) - identify mesh boundary regions
2. **Tag Names** (strings) - human-readable names for tags

Everything else is either:
- An internal implementation detail
- An external format mapping (ESP, OBJ, STL)
- UI convenience (grouping)

## Terminology Changes

### Old → New Mapping

| Old Term | New Term | Notes |
|----------|----------|-------|
| `Surface` | `Tag` | Core type renamed |
| `SurfaceMetadata` | `TagMetadata` | Core metadata type renamed |
| `surfaces` (state) | `tags` (state) | Store property renamed |
| `bcName` | `tagName` | Clarifies this IS the CFD tag name |
| `tagName` (old) | `espInternalId` | Was ESP's internal "Body1_Face12" identifier |
| `tag` (old number) | `tagNumber` | Explicit that this is the numeric tag |
| `face` (selection mode) | `tag` (selection mode) | Individual tag selection |
| `group` (selection mode) | `group` (selection mode) | Unchanged - groups share same tagName |
| `lump` / `lumping` | *removed* | Auto-group by tagName in UI instead |
| `SurfacesPanel` | `TagsPanel` / `MeshGroupsPanel` | Component renamed |
| `selectedSurface` | `selectedTag` | State property renamed |

### Terms That Stay (External Format Mappings)

These terms remain ONLY in adapter/parser code:

| Term | Where Used | Reason |
|------|------------|--------|
| `"regions"` | `meshAdapter.ts`, OBJ/STL/MESHB parsers | External mesh file format uses this term |
| `"faces"` | `espAdapter.ts`, ESP API calls | ESP library uses this term for geometry faces |
| `"bc_name"` | `csmParser.ts`, ESP attribute handling | ESP CSM file attribute name (maps to our `tagName`) |

## User-Facing Model

**After migration, users see only two concepts:**

1. **Tag** - A numbered mesh boundary region with a name
   - Has a tag number (e.g., 1, 2, 3)
   - Has a tag name (e.g., "wall", "farfield")
   - Displayed in mesh as a distinct colored region

2. **Group** - A UI convenience for tags sharing the same name
   - Tags with name "wall" form a "wall" group
   - Selecting a group selects all tags in that group
   - Groups have no special storage - computed from tags at runtime

## Implementation Notes

### Type System Changes

**Before:**
```typescript
interface Surface {
  id: string
  geometry: BufferGeometry
  metadata: SurfaceMetadata
}

interface SurfaceMetadata {
  tag: number           // Was confusing
  tagName: string       // Was ESP internal ID
  bcName: string        // Was actual CFD tag name
}
```

**After:**
```typescript
interface Tag {
  id: string
  geometry: BufferGeometry
  metadata: TagMetadata
}

interface TagMetadata {
  tagNumber: number     // Clear: the CFD tag number
  tagName: string       // Clear: the CFD tag name
  espInternalId?: string  // Optional: ESP's "Body1_Face12" (for debugging)
}
```

### Store Changes

**Before:**
```typescript
interface AppState {
  surfaces: Surface[]
  selectedSurface: Surface | null
  selectionMode: 'face' | 'group'
}
```

**After:**
```typescript
interface AppState {
  tags: Tag[]
  selectedTag: Tag | null
  selectionMode: 'tag' | 'group'
}
```

### Adapter Mapping (espAdapter.ts)

**Critical mapping:**
```typescript
// ESP face → CFD tag (1:1 relationship)
// ESP bc_name attribute → CFD tag name
{
  tagNumber: espFace.tess_index,  // ESP's tessellation index
  tagName: espFace.attrs.bc_name || `Tag ${espFace.tess_index}`,  // ESP bc_name IS our tag name
  espInternalId: `${espFace.body}_Face${espFace.index}`  // For reference only
}
```

## Migration Phases

1. **Phase 0:** Create this documentation ✅
2. **Phase 1:** Update type system (types/surface.ts → types/tag.ts)
3. **Phase 2:** Update store layer (appStore.ts)
4. **Phase 3:** Update UI components (rename/refactor)
5. **Phase 4:** Update utilities (adapters, transformers)
6. **Phase 5:** Update user-facing strings (labels, dialogs)
7. **Phase 6:** Update comments and JSDoc
8. **Phase 7:** Remove ALL backward compatibility aliases
9. **Phase 8:** Update documentation
10. **Phase 9:** Testing and validation

## Files Affected

### Type Definitions
- `src/frontend/types/surface.ts` → `src/frontend/types/tag.ts`
- `src/frontend/types/config.ts` (update imports, type references)

### Store
- `src/frontend/store/appStore.ts` (rename properties, methods)

### Components
- `src/frontend/components/SurfacesPanel/` → `TagsPanel/`
- `src/frontend/components/Viewport3D/Viewport3D.tsx`
- `src/frontend/components/BoundaryConditionDialog/`
- `src/frontend/components/TreePanel/TreePanel.tsx`
- All other components using Surface types

### Utilities
- `src/frontend/utils/espAdapter.ts` (clarify bc_name mapping)
- `src/frontend/utils/meshAdapter.ts` (update comments)
- `src/frontend/utils/configTransform.ts`
- `src/frontend/utils/configUtils.ts`
- All other utilities

### Documentation
- `docs/ARCHITECTURE.md`
- `README.md`
- `docs/whenSchemaChanges.md`
- Code comments throughout

## Verification Checklist

After migration:

- [ ] No references to `Surface` type outside external adapters
- [ ] No references to `bcName` (replaced with `tagName`)
- [ ] No `lump` or `lumping` code (UI groups instead)
- [ ] Selection mode is `'tag' | 'group'`, not `'face' | 'group'`
- [ ] UI labels say "Tags" and "Groups", never "Surfaces"
- [ ] Comments explain Tag = CFD concept, not "surface"
- [ ] External adapters clearly document format mappings
- [ ] All tests passing
- [ ] Build succeeds
- [ ] No backward compatibility aliases remain

## Historical Context

### Why This Migration?

The codebase accumulated 12+ overlapping terms for "collections of triangles":
- surface, face, tag, region, group, bc_name, bcName, tagName, mesh boundary tags, lumping, etc.

This created confusion about what concepts actually matter to the CFD solver.

### Key Realizations

1. **ESP bc_name attribute IS the CFD tag name** - not a separate concept
2. **Tag numbers and tag names are the ONLY CFD concepts** - everything else is UI/implementation
3. **Groups are a UI convenience** - not a storage concept
4. **Lumping added complexity** - auto-grouping in UI is better

### Schema Constraints

The JSON schema uses `"mesh boundary tags"` field name. This CANNOT change (external dependency). We map it internally:
- Schema field: `"mesh boundary tags"` (number | string | array)
- Internal representation: `tagNumber` or `tagNumbers` array
- Display: "Tag" / "Tags"

## Questions & Answers

**Q: What about multiple tags with the same name?**  
A: Perfectly valid. Tags are identified by number, named for convenience. Multiple tags can share a name (forms a group).

**Q: What about tags with different names but same number?**  
A: Invalid. Each tag number has exactly one name. Enforced during loading.

**Q: Can I still select individual triangles?**  
A: Yes. Selection mode "tag" selects one tag. Mode "group" selects all tags sharing that name.

**Q: What happened to lumping?**  
A: Removed. Load all tags individually, group them by name in the UI. No forced merging.

---

**End of Migration Guide**
