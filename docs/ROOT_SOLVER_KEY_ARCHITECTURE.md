# Root Solver Key Architecture

## Problem
The GUI was hardcoded to use `HyperSolve` as the root configuration key. However, different schema versions may require either `Vulcan` or `HyperSolve` as the root solver key (as specified in the schema's `required` array). This caused issues when switching between schema versions.

## Solution
Implemented a dynamic root solver key system that:
1. Reads the schema on startup to detect which solver is required
2. Stores the detected key globally in Zustand state
3. Uses this key throughout the application when accessing/updating configuration

## Files Created

### `src/frontend/utils/schemaUtils.ts`
- `extractRootSolverKey(schema)` - Extracts solver key from schema's `required` array
- `loadSchemaWithSolverKey()` - Loads schema and detects solver key

### `src/frontend/utils/configUtils.ts`
- `getRootConfig()` - Helper to access root solver config safely
- `updateRootConfig()` - Helper to update root solver config

### `src/frontend/utils/__tests__/schemaUtils.test.ts`
- 6 tests verifying schema detection logic

## Files Modified

### `src/frontend/store/appStore.ts`
- Added `rootSolverKey: string | null` state
- Added `setRootSolverKey()` action
- Updated all functions to use `rootSolverKey` instead of hardcoded 'HyperSolve':
  - `addBoundaryCondition()`
  - `updateBoundaryCondition()`
  - `deleteBoundaryCondition()`
  - `addState()`
  - `updateState()`
  - `deleteState()`
  - `updateThermodynamics()`
  - `initializeConfig()`

### `src/frontend/App.tsx`
- Added `useEffect` to load schema on startup
- Calls `loadSchemaWithSolverKey()` to detect root solver
- Sets `rootSolverKey` in store (defaults to 'HyperSolve' if detection fails)

## How It Works

1. **On App Startup:**
   ```typescript
   useEffect(() => {
     const { schema, rootSolverKey } = await loadSchemaWithSolverKey()
     setRootSolverKey(rootSolverKey || 'HyperSolve')
   }, [])
   ```

2. **In Store Functions:**
   ```typescript
   const rootKey = state.rootSolverKey || 'HyperSolve'
   const rootConfig = state.configData[rootKey]
   ```

3. **Schema Detection:**
   - Checks `schema.required` array
   - Looks for known solver keys: `['Vulcan', 'HyperSolve', 'vulcan', 'hypersolve']`
   - Returns first match found

## Benefits

- ✅ **Schema Agnostic:** Works with both Vulcan and HyperSolve schemas
- ✅ **Automatic Detection:** No manual configuration needed
- ✅ **Backwards Compatible:** Defaults to 'HyperSolve' if detection fails
- ✅ **Centralized:** Single source of truth in Zustand store
- ✅ **Type Safe:** All config access uses the detected key

## Future Considerations

While this implementation updates the store functions, there are still many React components that directly access `configData.HyperSolve`. These will need to be updated to use the helper functions from `configUtils.ts` or access via the store's `rootSolverKey`. See:

- `src/frontend/components/EditorPanel/EditorPanel.tsx`
- `src/frontend/components/TreePanel/TreePanel.tsx`
- `src/frontend/components/SurfacesPanel/SurfacesPanel.tsx`
- `src/frontend/components/BoundaryConditionDialog/BoundaryConditionDialog.tsx`
- `src/frontend/components/Viewport3D/Viewport3D.tsx`
- `src/frontend/App.tsx` (cleanConfigForSave, handleValidate)

For now, these will continue to work as long as the schema uses 'HyperSolve'. A future task could be to systematically update all component access patterns to use the dynamic key.
