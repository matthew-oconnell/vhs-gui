# Flat Config Structure Migration Plan

## Overview

Systematically fix all code that uses the legacy nested `rootConfig` pattern to use the flat `configData` structure directly.

**Root Cause:** Code inconsistently accesses config data - some uses flat structure (`configData['boundary conditions']`), others use nested structure (`configData.HyperSolve['boundary conditions']`).

**Goal:** Remove all `rootConfig` indirections and access `configData` properties directly.

---

## 🎯 Phase 1: Core State Management (CRITICAL)
**Priority:** HIGH  
**Risk:** MEDIUM - Core state mutations  
**Estimated Time:** 2-3 hours

### Files to Fix:
- `src/frontend/store/appStore.ts`

### Functions Affected:
1. `addBoundaryCondition` - Adding new BCs
2. `updateBoundaryCondition` - Modifying existing BCs
3. `deleteBoundaryCondition` - Removing BCs
4. `addState` - Adding flow states
5. `updateState` - Modifying states
6. `deleteState` - Removing states
7. `updateProjectStage` - Checking BC/state counts

### Changes Required:
```typescript
// ❌ OLD PATTERN
const rootKey = 'HyperSolve'
const rootConfig = (configData as any)[rootKey] || {}
const bcs = rootConfig['boundary conditions'] || []

// ✅ NEW PATTERN
const bcs = configData['boundary conditions'] || []
```

### Testing Steps:
1. ✅ Create new BC → verify it appears in tree
2. ✅ Edit BC properties → verify changes persist
3. ✅ Delete BC → verify it's removed from tree
4. ✅ Create new state → verify it appears in state list
5. ✅ Edit state → verify changes persist
6. ✅ Delete state → verify it's removed

### Success Criteria:
- All BC CRUD operations work correctly
- All state CRUD operations work correctly
- No console errors when performing operations
- Changes persist after save/reload

---

## 🎯 Phase 2: UI Components - Dialogs
**Priority:** HIGH  
**Risk:** LOW - UI only, no state mutation  
**Estimated Time:** 2 hours

### Files to Fix:

#### 2.1 BoundaryConditionDialog
- `src/frontend/components/BoundaryConditionDialog/BoundaryConditionDialog.tsx`

**Lines to fix:**
- Line ~82: `const bcs = rootConfig?.['boundary conditions'] || []`
- Line ~123: `const availableStates = Object.keys(rootConfig.states || {})`

**Testing:**
- Open BC dialog → verify existing BCs are detected
- Select state from dropdown → verify all states appear
- Create BC → verify no conflicts with existing BCs

#### 2.2 InitializationRegionDialog
- `src/frontend/components/InitializationRegionDialog/InitializationRegionDialog.tsx`

**Lines to fix:**
- Line ~117: State list retrieval
- Line ~267: Adding init region to config

**Testing:**
- Open init region dialog → verify states appear in dropdown
- Create init region → verify it's added to config
- Edit init region → verify changes persist

### Success Criteria:
- Dialogs correctly detect existing config data
- Dropdowns show all available options (states, BCs)
- No console errors when opening dialogs

---

## 🎯 Phase 3: UI Components - Panels
**Priority:** MEDIUM  
**Risk:** LOW - Read-only display  
**Estimated Time:** 1-2 hours

### Files to Fix:

#### 3.1 TreePanel
- `src/frontend/components/TreePanel/TreePanel.tsx`

**Lines to fix:**
- Line ~117: BC array access for tree rendering
- Line ~138: States object access for tree rendering
- Line ~183: Init regions array access

**Note:** TreePanel already has CORRECT direct access in `enhanceTreeWithData` function (line 105). Need to verify consistency.

**Testing:**
- Load config → verify BCs appear in tree
- Load config → verify states appear in tree
- Expand/collapse tree nodes → verify structure is correct

#### 3.2 StatusBar
- `src/frontend/components/StatusBar/StatusBar.tsx`

**Lines to fix:**
- Line ~26: BC count for status display

**Testing:**
- Check status bar → verify BC count is accurate
- Add/remove BCs → verify count updates

#### 3.3 SurfacesPanel
- `src/frontend/components/SurfacesPanel/SurfacesPanel.tsx`

**Lines to fix:**
- Line ~29: Finding associated BC for surface

**Testing:**
- Select surface → verify associated BC is shown
- Assign BC to surface → verify association appears

### Success Criteria:
- Tree panel shows all BCs, states, init regions
- Status bar shows accurate counts
- Surfaces panel shows correct BC assignments

---

## 🎯 Phase 4: UI Components - Editors
**Priority:** MEDIUM  
**Risk:** MEDIUM - Property editing  
**Estimated Time:** 2-3 hours

### Files to Fix:

#### 4.1 EditorPanel
- `src/frontend/components/EditorPanel/EditorPanel.tsx`

**Lines to fix (multiple locations):**
- ~Line 81: State dropdown rendering
- ~Line 104: BC list access
- ~Line 237: States list access
- ~Line 410-430: Init region editing (2 locations)

**Testing:**
- Edit BC property → verify dropdown shows states
- Edit init region → verify state dropdown works
- Update init region → verify changes persist
- Delete init region → verify it's removed

### Success Criteria:
- Property editor shows correct dropdowns
- Edits to BCs/states/init regions persist
- No console errors during editing

---

## 🎯 Phase 5: 3D Viewport
**Priority:** HIGH  
**Risk:** LOW - Display only  
**Estimated Time:** 1-2 hours

### Files to Fix:

#### 5.1 Viewport3D
- `src/frontend/components/Viewport3D/Viewport3D.tsx`

**Lines to fix:**
- ~Line 1317: Init region rendering (getting regions from config)
- ~Line 1506: BC overlay display
- ~Line 1723: Surface metadata overlay (BC lookup)
- ~Line 1815: Context menu (checking if BCs exist)

**Testing:**
- Load mesh with BCs → verify BC overlay appears on surfaces
- Select surface → verify BC name/type shown in metadata overlay
- Right-click surface → verify "Add to BC" option appears
- View init regions in 3D → verify they render correctly

### Success Criteria:
- BC overlays show on assigned surfaces
- Surface metadata shows correct BC info
- Context menu reflects available BCs
- Init regions render in 3D view

---

## 🎯 Phase 6: Config Utilities
**Priority:** HIGH  
**Risk:** HIGH - Data transformation  
**Estimated Time:** 2-3 hours

### Files to Fix:

#### 6.1 configTransform.ts
- `src/frontend/utils/configTransform.ts`

**Current behavior:** 
- Reads from both flat and nested locations
- Writes back to correct location based on where it found data

**Problem:**
- Still uses `rootConfig` pattern internally
- Line ~27: Gets rootConfig
- Lines 30+: Checks both locations

**Fix:**
- Since we're standardizing on flat structure, simplify to ONLY read/write flat
- Remove all nested structure handling
- Add migration warning if nested structure detected

**Testing:**
- Load old nested config → verify it's migrated correctly
- Load flat config → verify it's preserved correctly
- Transform adds IDs → verify BCs get unique IDs
- Surface name mapping → verify tags convert to numbers

### Success Criteria:
- Old configs auto-migrate on load
- Flat configs load without modification
- IDs are added consistently
- Surface names map to tag numbers correctly

---

## 🎯 Phase 7: App.tsx - Additional Locations
**Priority:** MEDIUM  
**Risk:** LOW - Already partially fixed  
**Estimated Time:** 30 minutes

### Files to Fix:
- `src/frontend/App.tsx`

**Already Fixed (Phase 0):**
- ✅ Line 376-378: Save logging
- ✅ Line 444-445: Validation BC access
- ✅ Line 470: Error path

**Still Need to Fix:**
- Line ~314-322: `cleanConfigForSave` function
  - Currently handles both flat and nested
  - Should simplify to only flat

**Testing:**
- Save config → verify BCs are saved correctly
- Validate config → verify validation works
- Check saved JSON → verify it's flat structure

---

## 🎯 Phase 8: Remove Legacy Code
**Priority:** LOW  
**Risk:** LOW - Cleanup  
**Estimated Time:** 1 hour

### Tasks:
1. **Remove `rootSolverKey` completely**
   - Search for all references
   - Remove from store interface (if it exists)
   - Remove all `|| 'HyperSolve'` fallbacks

2. **Remove `getRootConfig` and `updateRootConfig` utilities**
   - File: `src/frontend/utils/configUtils.ts`
   - These are obsolete with flat structure

3. **Update types**
   - Mark `LegacyConfigData` as fully deprecated
   - Add JSDoc comments warning about nested structure

4. **Clean up migration code**
   - Keep `isOldFormat` and `migrateConfigToFlatStructure` in `configMigration.ts`
   - These are still needed for backwards compatibility

### Success Criteria:
- No references to `rootSolverKey` remain
- No references to `rootConfig` pattern remain
- All configs use flat structure exclusively

---

## 🎯 Phase 9: Testing & Validation
**Priority:** HIGH  
**Risk:** N/A  
**Estimated Time:** 2-3 hours

### Test Scenarios:

#### 9.1 Config Loading
- [ ] Load old nested config → auto-migrates
- [ ] Load flat config → loads correctly
- [ ] Load config with BCs → BCs appear in tree
- [ ] Load config with states → states appear in dropdowns
- [ ] Load config with init regions → regions render in 3D

#### 9.2 BC Operations
- [ ] Create BC from dialog → appears in tree
- [ ] Create BC from surface context menu → works
- [ ] Edit BC properties → changes persist
- [ ] Delete BC → removed from tree and config
- [ ] Assign surfaces to BC → surfaces show overlay
- [ ] Unassign surfaces from BC → overlay disappears

#### 9.3 State Operations
- [ ] Create state from wizard → appears in dropdowns
- [ ] Edit state → changes persist
- [ ] Delete state → removed from config
- [ ] Reference state in BC → dropdown shows state
- [ ] Reference state in init region → dropdown shows state

#### 9.4 Save/Load Cycle
- [ ] Create config from scratch
- [ ] Add BCs, states, init regions
- [ ] Save to file
- [ ] Close app / reload
- [ ] Load saved file
- [ ] Verify everything loads correctly

#### 9.5 Edge Cases
- [ ] Empty config → doesn't crash
- [ ] Config with no BCs → works
- [ ] Config with no states → works
- [ ] Config with invalid data → shows validation errors

---

## 📋 Implementation Order

### Week 1: Core Functionality
1. **Day 1-2:** Phase 1 (State Management) - CRITICAL
2. **Day 3:** Phase 2 (Dialogs) - HIGH
3. **Day 4:** Phase 3 (Panels) - MEDIUM
4. **Day 5:** Phase 4 (Editors) - MEDIUM

### Week 2: Visualization & Cleanup
1. **Day 1:** Phase 5 (Viewport) - HIGH
2. **Day 2:** Phase 6 (Config Utils) - HIGH
3. **Day 3:** Phase 7 (App.tsx cleanup) - MEDIUM
4. **Day 4:** Phase 8 (Remove legacy) - LOW
5. **Day 5:** Phase 9 (Testing) - HIGH

---

## 🚨 Risk Mitigation

### Before Each Phase:
1. ✅ Commit current changes
2. ✅ Create feature branch for phase
3. ✅ Note current working state

### After Each Phase:
1. ✅ Run app and test manually
2. ✅ Check console for errors
3. ✅ Test CRUD operations for affected features
4. ✅ Commit working state
5. ✅ If broken, revert and re-attempt

### Rollback Plan:
- Each phase is independent
- Can revert individual commits
- Earlier phases can ship without later phases

---

## 📊 Progress Tracking

### Completed:
- [x] Phase 0: App.tsx (Save & Validation) - **DONE**

### In Progress:
- [ ] Phase 1: State Management
- [ ] Phase 2: Dialogs
- [ ] Phase 3: Panels
- [ ] Phase 4: Editors
- [ ] Phase 5: Viewport
- [ ] Phase 6: Config Utils
- [ ] Phase 7: App.tsx Cleanup
- [ ] Phase 8: Legacy Removal
- [ ] Phase 9: Testing

### Blockers:
- None currently

---

## 🎓 Learning for Future

### Update AGENTS.md:
Add warning about this pattern:
```markdown
## ⚠️ Critical: Use Flat Config Structure

**ALWAYS access config data directly:**
```typescript
// ✅ CORRECT
const bcs = configData['boundary conditions'] || []
const states = configData.states || {}

// ❌ WRONG - Legacy nested pattern
const rootConfig = configData.HyperSolve
const bcs = rootConfig?.['boundary conditions']
```

**Why:** The app uses a flat config structure. The nested `HyperSolve`/`Vulcan` keys are legacy and deprecated.
```

### Add to docs/whenSchemaChanges.md:
```markdown
## 0. Config Structure (FLAT ONLY)

All configuration data is stored at the root level:
- `configData['boundary conditions']` (not `configData.HyperSolve['boundary conditions']`)
- `configData.states` (not `configData.HyperSolve.states`)
- `configData['initialization regions']` (not `configData.HyperSolve['initialization regions']`)

If you see code accessing `configData.HyperSolve` or `configData.Vulcan`, it's using the old deprecated pattern.
```

---

## 📝 Notes

- Migration code in `configMigration.ts` should remain for backwards compatibility
- Old configs will auto-migrate on load
- New configs are always saved in flat format
- This plan assumes no one is actively using nested configs in production
