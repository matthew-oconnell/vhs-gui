# Quick Start: Fixing Flat Config Access

## Pattern to Find & Replace

### 🔍 Search Pattern:
```typescript
const rootConfig = (configData as any)[rootKey]
```

Or variations:
```typescript
const rootConfig = (state.configData as any)[rootKey]
const rootConfig = (updatedConfig as any)[rootKey]
```

### ✅ Replace With:
Direct access to configData properties

---

## Quick Reference: Common Fixes

### Boundary Conditions
```typescript
// ❌ WRONG
const rootConfig = (configData as any)[rootKey]
const bcs = rootConfig?.['boundary conditions'] || []

// ✅ CORRECT
const bcs = configData['boundary conditions'] || []
```

### States
```typescript
// ❌ WRONG
const rootConfig = (configData as any)[rootKey] || {}
const states = rootConfig.states || {}

// ✅ CORRECT
const states = configData.states || {}
```

### Initialization Regions
```typescript
// ❌ WRONG
const rootConfig = (configData as any)[rootKey]
const initRegions = rootConfig?.['initialization regions'] || []

// ✅ CORRECT
const initRegions = configData['initialization regions'] || []
```

### Updating Config (in Zustand store)
```typescript
// ❌ WRONG
set((state) => {
  const rootKey = 'HyperSolve'
  const rootConfig = (state.configData as any)[rootKey] || {}
  return {
    configData: {
      ...state.configData,
      [rootKey]: {
        ...rootConfig,
        'boundary conditions': [
          ...(rootConfig['boundary conditions'] || []),
          newBC
        ]
      }
    }
  }
})

// ✅ CORRECT
set((state) => ({
  configData: {
    ...state.configData,
    'boundary conditions': [
      ...(state.configData['boundary conditions'] || []),
      newBC
    ]
  }
}))
```

---

## Files Needing Fixes (in priority order)

### 🔴 Critical (breaks core functionality):
1. `src/frontend/store/appStore.ts` - State management
2. `src/frontend/utils/configTransform.ts` - Data transformation

### 🟡 High (breaks UI features):
3. `src/frontend/components/BoundaryConditionDialog/BoundaryConditionDialog.tsx`
4. `src/frontend/components/Viewport3D/Viewport3D.tsx`
5. `src/frontend/components/InitializationRegionDialog/InitializationRegionDialog.tsx`

### 🟢 Medium (display issues):
6. `src/frontend/components/TreePanel/TreePanel.tsx` (partially correct)
7. `src/frontend/components/EditorPanel/EditorPanel.tsx`
8. `src/frontend/components/StatusBar/StatusBar.tsx`
9. `src/frontend/components/SurfacesPanel/SurfacesPanel.tsx`

### ⚪ Low (cleanup):
10. `src/frontend/App.tsx` (mostly done)
11. Remove `rootSolverKey` everywhere
12. Remove `configUtils.ts` helper functions

---

## Testing Checklist (after each fix)

```bash
# 1. Start dev server
cd src/frontend && npm run dev

# 2. Test in browser
# - Open console (check for errors)
# - Load test config file
# - Verify BCs appear in tree
# - Verify states appear in dropdowns
# - Create new BC
# - Edit BC
# - Delete BC
# - Save config
# - Reload config
```

---

## Git Workflow

```bash
# Before starting
git checkout -b fix/flat-config-access
git commit -am "checkpoint: before flat config fixes"

# After each phase
git add .
git commit -m "fix(phase-N): description of what was fixed"

# If something breaks
git diff HEAD  # See what changed
git checkout HEAD -- path/to/file  # Revert single file
git reset --hard HEAD  # Revert everything (nuclear option)
```

---

## Estimated Time per Phase

| Phase | Files | Estimated Time | Risk Level |
|-------|-------|----------------|------------|
| 1. State Management | 1 file | 2-3 hours | MEDIUM |
| 2. Dialogs | 2 files | 2 hours | LOW |
| 3. Panels | 3 files | 1-2 hours | LOW |
| 4. Editors | 1 file | 2-3 hours | MEDIUM |
| 5. Viewport | 1 file | 1-2 hours | LOW |
| 6. Config Utils | 1 file | 2-3 hours | HIGH |
| 7. App.tsx Cleanup | 1 file | 30 min | LOW |
| 8. Legacy Removal | Multiple | 1 hour | LOW |
| 9. Testing | N/A | 2-3 hours | N/A |
| **TOTAL** | **~10 files** | **~16-22 hours** | **2-3 days** |

---

## Emergency Contacts

If you get stuck:
1. Check `BC_LOADING_FIX.md` for the original analysis
2. Check `FLAT_CONFIG_MIGRATION_PLAN.md` for detailed plan
3. Check git history: `git log --oneline --grep="flat config"`
4. Revert to last working state
