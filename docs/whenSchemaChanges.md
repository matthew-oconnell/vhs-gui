# When Schema Changes - Update Checklist

This document tracks hardcoded values that may need updating when `input.schema.json` is updated.

## 🔍 What to Check

### 1. Boundary Condition Types
**File:** `src/components/EditorPanel/EditorPanel.tsx` (lines ~7-22)
**File:** `src/components/BoundaryConditionDialog/BoundaryConditionDialog.tsx` (lines ~25-70)

**Hardcoded Array:**
```typescript
const BC_TYPES = [
  'dirichlet',
  'strongly enforced dirichlet',
  'riemann',
  // ... etc
]
```

**How to Update:**
1. Look in schema at: `definitions["Boundary Condition"].oneOf[]`
2. Each entry has a `$ref` pointing to a BC definition (e.g., `"#/definitions/Dirichlet"`)
3. Each BC definition has a `type.enum` array with the type string
4. Add any new BC type strings to the `BC_TYPES` array in both files
5. Remove any deprecated BC types

**Example from Schema:**
```json
"Dirichlet": {
  "properties": {
    "type": {
      "type": "string",
      "enum": ["dirichlet"]  // ← This is the string we need
    }
  }
}
```

**✅ Automatic - BC Type Descriptions:**
The boundary condition dialog automatically loads descriptions from the schema at runtime using `src/utils/bcTypeDescriptions.ts`. The description displayed below the BC type dropdown is extracted from each BC definition's `description` field. No manual updates needed when descriptions change.

---

### 1a. Boundary Condition Type Categories
**File:** `src/components/BoundaryConditionDialog/BoundaryConditionDialog.tsx` (lines ~75-115)

**Hardcoded Object:**
```typescript
const BC_TYPE_CATEGORIES = {
  'Inflow': [
    'subsonic inflow',
    'fixed inflow',
    'fixed subsonic inflow',
    'mass flux inflow',
    'riemann',
  ],
  'Outflow': [
    'subsonic outflow',
    'supersonic outflow',
  ],
  'Wall': [
    'no slip wall',
    'slip wall',
    'insulated wall',
    'constant temperature',
  ],
  'Numerical': [
    'symmetry',
    'tangent flow',
    'axisymmetric pole',
  ],
  'Advanced': [
    'strong dirichlet',
    'strong particle wall',
    // ... etc
  ]
}
```

**How to Update:**
1. When new BC types are added to the schema, categorize them appropriately
2. Add the new type to the relevant category array (Inflow, Outflow, Wall, Numerical, or Advanced)
3. If a new category makes sense, add it to the object
4. This organization is shown in the BC type dropdown for better UX

**⚠️ Note:** Any BC types in `BC_TYPES` that aren't listed in `BC_TYPE_CATEGORIES` will automatically appear in an "Other" category in the dropdown.

---

### 1b. Boundary Condition Type Name Hints
**File:** `public/bcTypeNameHints.txt`

**Human-Editable Mapping File:**
```txt
# Format: hint_keyword -> bc_type
inlet -> subsonic inflow
outlet -> supersonic outflow
wall -> no slip wall
# ... etc
```

**How to Update:**
1. When new BC types are added to the schema, add intuitive keyword mappings to `bcTypeNameHints.txt`
2. The file uses simple `keyword -> bc_type` format (one per line)
3. Keywords are case-insensitive and matched against surface tag names
4. More specific hints should come first (they're tried in order)
5. Comments start with `#`

**What it does:**
- When creating a BC, the dialog auto-selects the BC type based on the surface tag name
- Example: Surface named "outlet" automatically selects "supersonic outflow"
- Example: Surface named "wall" automatically selects "no slip wall"
- Improves workflow speed by reducing manual dropdown selection

**Implementation:** Loaded by `src/frontend/utils/bcTypeHintLoader.ts` and used in `BoundaryConditionDialog.tsx`

---

### 2. BC Type-Specific Fields
**File:** `src/components/EditorPanel/EditorPanel.tsx` (renderBCEditor function)
**File:** `src/components/BoundaryConditionDialog/BoundaryConditionDialog.tsx` (conditional sections)

**Hardcoded Logic in EditorPanel:**
```typescript
{(selectedBC.type === 'dirichlet' || 
  selectedBC.type === 'strongly enforced dirichlet' ||
  selectedBC.type === 'subsonic inflow total conditions') && (
  <div className="form-group">
    <label className="form-label">State Name</label>
    // ... state field
  </div>
)}
```

**Hardcoded Arrays in BoundaryConditionDialog:**
```typescript
const BC_TYPES_REQUIRING_STATE = [
  'dirichlet', 'riemann', 'mass flux inflow', // ... etc
]

const BC_TYPES_WITH_WALL_TEMP = [
  'no slip', 'wall matching', 'weak no slip'
]
```

**How to Update:**
1. Check each BC definition in the schema for its `required` and `properties` fields
2. If a BC requires a `state` field, add its type to the conditional and to `BC_TYPES_REQUIRING_STATE`
3. If a BC requires `wall temperature`, add it to `BC_TYPES_WITH_WALL_TEMP`
4. Add new conditional blocks for other BC-specific required fields in both files

**Common Required Fields to Watch:**
- `state` - Reference to a physical state
- `mesh boundary tags` - Always present
- `wall temperature` - For viscous wall types
- BC-specific properties (varies by type)

---

### 4. Initialization Region Types
**File:** `src/components/InitializationRegionDialog/InitializationRegionDialog.tsx` (lines ~8-16)

**Hardcoded Array:**
```typescript
const INIT_REGION_TYPES = [
  'aabb',
  'sphere',
  'cylinder',
  'super ellipse frustum',
  'converging diverging nozzle',
  'injector',
  'boundary layer'
]
```

**Note on Type Aliases:**
The schema defines aliases for some types:
- `'aabb'`, `'box'`, and `'axis-aligned bounding-box'` are all the same type
- The dialog uses `'aabb'` as the canonical type but accepts all three

**Hardcoded Descriptions:**
```typescript
const INIT_REGION_TYPE_DESCRIPTIONS: Record<string, string> = {
  'aabb': 'Define a box (axis-aligned bounding box) and initialize that region with a constant state',
  'sphere': 'Define a sphere and initialize that region with a constant state',
  // ... etc
}
```

**How to Update:**
1. Look in schema at: `definitions["Initialization Regions"].anyOf[]`
2. Each entry has a `$ref` pointing to an initialization region definition (e.g., `"#/definitions/Axis-Aligned Bounding Box Initialization Region"`)
3. Each definition has a `type.enum` array with the type string(s)
4. Add any new initialization region type strings to the `INIT_REGION_TYPES` array
5. Add descriptions to `INIT_REGION_TYPE_DESCRIPTIONS` from each definition's `description` field
6. Remove any deprecated initialization region types

**Example from Schema:**
```json
"Axis-Aligned Bounding Box Initialization Region": {
  "type": "object",
  "description": "Define a box and initialize that region with a constant state.",
  "required": ["state", "type", "lo", "hi"],
  "properties": {
    "type": {
      "type": "string",
      "enum": ["aabb", "box", "axis-aligned bounding-box"]  // ← These are the strings we need
    }
  }
}
```

**Type-Specific Required Fields:**
The dialog has hardcoded form fields for each initialization region type:
- `aabb` / `box`: state, lo [x, y, z], hi [x, y, z]
- `sphere`: state, center [x, y, z], radius
- `cylinder`: state, a [x, y, z], b [x, y, z], radius, optional radius 2, optional align velocity
- `super ellipse frustum`: state, inflow properties (center, a, b, n, local Y), outflow properties, isentropic initialization, mach root, align velocity
- `converging diverging nozzle`: state, throat properties, exit properties, isentropic initialization, mach root, align velocity
- `injector`: state, mesh boundary tags, length
- `boundary layer`: thickness (no state required)

When the schema adds new initialization region types or changes required fields, update the switch statement in `handleCreate()` and add corresponding form fields in the dialog JSX.

---

### 5. Visualization Types
**File:** `src/components/VisualizationDialog/VisualizationDialog.tsx` (lines ~8-16)

**Hardcoded Array:**
```typescript
const VISUALIZATION_TYPES = [
  'point',
  'line',
  'plane',
  'sphere',
  'boundary',
  'volume',
  'volume-debug'
]
```

**Hardcoded Descriptions:**
```typescript
const VIZ_TYPE_DESCRIPTIONS: Record<string, string> = {
  'point': 'Sample the solution at a specific point in the domain',
  'line': 'Sample the solution along a line segment',
  // ... etc
}
```

**How to Update:**
1. Look in schema at: `definitions["Visualization"].anyOf[]`
2. Each entry has a `$ref` pointing to a visualization definition (e.g., `"#/definitions/Point Sample"`)
3. Each definition has a `type.enum` array with the type string
4. Add any new visualization type strings to the `VISUALIZATION_TYPES` array
5. Add descriptions to `VIZ_TYPE_DESCRIPTIONS` from each definition's `description` field
6. Remove any deprecated visualization types

**Example from Schema:**
```json
"Point Sample": {
  "description": "Visualization options for sampling a line in the flow field solution.",
  "required": ["type", "filename", "location"],
  "properties": {
    "type": {
      "type": "string",
      "enum": ["point"]  // ← This is the string we need
    }
  }
}
```

**Type-Specific Required Fields:**
The dialog has hardcoded form fields for each visualization type:
- `point`: location [x, y, z]
- `line`: a [x, y, z], b [x, y, z], optional crinkle
- `plane`: normal [x, y, z], optional center, optional crinkle
- `sphere`: radius, optional center, optional crinkle
- `boundary`: mesh boundary tags
- `volume`, `volume-debug`: no additional fields

When the schema adds new visualization types or changes required fields, update the switch statement in `handleCreate()` and add corresponding form fields in the dialog JSX.

---

### 6. State Definition Modes
**File:** `src/components/EditorPanel/StateWizard.tsx`

**Hardcoded Wizard Options:**
- "State from Static Conditions" → Mach + Static Temp + Static Pressure
- "State from Total Conditions" → Mach + Total Temp + Total Pressure
- "State from Mach and Densities" → Mach + Speed + Temperature
- "It's Complicated" → Manual entry

**How to Update:**
1. Look in schema at: `definitions["State"].oneOf[]`
2. Each entry represents a different valid state definition
3. Check the `required` array for each oneOf option
4. Update wizard modes if new state definition types are added
5. Update field validation in `isValid()` function

**Example from Schema:**
```json
{
  "description": "Physical state description.",
  "required": ["mach number", "temperature", "pressure"],
  "properties": {
    "mach number": { "type": "number" },
    "temperature": { ... },
    "pressure": { ... }
  }
}
```

---

### 7. State Property Editor
**File:** `src/components/EditorPanel/EditorPanel.tsx` (renderStateEditor function)

**Current Fields:**
- State Name
- Mach Number
- Temperature
- Pressure
- Angle of Attack
- Angle of Yaw

**How to Update:**
1. Review all properties across all `State` oneOf options
2. Add new common properties as form fields
3. Consider adding conditional fields for specific state types (similar to BC editor)

---

### 8. BC Type Colors for Rendering
**File:** `src/frontend/utils/surfaceColorUtils.ts` (lines ~77-91)

**Hardcoded Color Map:**
```typescript
export const DEFAULT_BC_TYPE_COLORS: Record<string, string> = {
  'dirichlet': '#4a90d9',      // Blue
  'riemann': '#9b59b6',        // Purple
  'no slip': '#e67e22',        // Orange
  'slip': '#f1c40f',           // Yellow
  'symmetry': '#1abc9c',       // Teal
  'periodic': '#e91e63',       // Pink
  'wall': '#795548',           // Brown
  'inlet': '#2ecc71',          // Green
  'outlet': '#e74c3c',         // Red
  'farfield': '#3498db',       // Light blue
}
```

**How to Update:**
1. Look in schema at: `definitions["Boundary Condition"].oneOf[]`
2. For each BC type, check if it has a default color in the map
3. Add new BC types with visually distinct colors
4. Unknown BC types automatically get a generated color, but explicit colors are preferred for common types

**Note:** This is purely cosmetic - unknown BC types will still render correctly with auto-generated colors. However, adding explicit colors ensures visual consistency and better user experience.

---

### 9. TypeScript Type Definitions
**File:** `src/types/config.ts`

**Hardcoded Interfaces:**
```typescript
export interface BoundaryCondition {
  id: string
  name?: string
  type: string
  'mesh boundary tags'?: MeshBoundaryTags
  state?: string
  [key: string]: any // Catch-all for BC-specific properties
}

export interface State {
  id: string
  name: string
  'mach number'?: number
  temperature?: number
  pressure?: number
  // ... etc
}
```

**How to Update:**
1. Add new strongly-typed optional fields if certain properties become very common
2. The `[key: string]: any` catch-all handles most schema changes automatically
3. Only update if you want TypeScript autocomplete for new fields

---

## 🧪 Testing After Schema Updates

1. **Verify Tree Renders:** Schema parser should automatically handle new properties
2. **Test BC Creation:** Try creating each BC type, ensure type dropdown shows all options
3. **Test State Wizard:** Verify required fields match schema for each wizard mode
4. **Check Required Fields:** Ensure `*` indicators appear on newly required fields
5. **Test Enum Fields:** Any new enum properties should show as dropdowns automatically

---

## ✅ What's Automatic (No Changes Needed)

These adapt automatically when the schema changes:

- ✅ Tree structure and node hierarchy
- ✅ Property descriptions and tooltips
- ✅ Enum value dropdowns (for non-BC-type enums)
- ✅ Required field indicators (`*`)
- ✅ Default values
- ✅ $ref resolution
- ✅ Basic type-specific inputs (string, number, boolean, array, object)

---

### 10. Feature Tags ("only for" Categories)
**File:** `public/featureTagCategories.txt`
**File:** `public/featureTagCategories.README.md`
**File:** `src/frontend/utils/featureFlags.ts` (KNOWN_CATEGORIES array)
**File:** `src/frontend/utils/featureTagLoader.ts`
**File:** `src/frontend/components/SettingsDialog/SettingsDialog.tsx` (feature toggles UI)

**Overview:**
The schema uses `"only for"` arrays to restrict when certain configuration options are shown in the GUI. These tags fall into three categories:
1. **Product tags** - Which solver/product supports the feature (e.g., "vulcan", "hypersolve") - OR logic
2. **Feature tags** - Which capabilities/modules are needed (e.g., "sketch-2-solution", "mhd") - OR logic  
3. **Visibility tags** - Whether to hide the feature by default (e.g., "advanced", "experimental") - ALL must be enabled

**Metadata File: `public/featureTagCategories.txt`**
This file categorizes tags using a simple arrow syntax (similar to `bcTypeNameHints.txt`):
```txt
vulcan -> product
sketch-2-solution -> feature
experimental -> visibility
```

**How to Update When New Tags Appear:**

1. **Identify new tags in schema:**
   ```bash
   # Search for "only for" in schema
   grep -r '"only for"' public/schemas/input.schema.json
   ```

2. **Categorize the new tag in `public/featureTagCategories.txt`:**
   - If it's a solver/product → add line: `new-tag -> product`
   - If it's a capability/module → add line: `new-tag -> feature`
   - If it controls default visibility → add line: `new-tag -> visibility`

3. **Update `KNOWN_CATEGORIES` array in `featureFlags.ts`:**
   ```typescript
   export const KNOWN_CATEGORIES = [
     'vulcan',
     'hypersolve',
     'new-tag-here',  // ← Add new tag
     // ... etc
   ]
   ```

4. **Update Settings UI in `SettingsDialog.tsx`:**
   - The UI automatically groups tags by category using `getTagsByCategory()`
   - Product tags appear in "Solver Products" section
   - Feature tags appear in "Capabilities & Modules" section
   - Visibility tags appear in "Developer Options" section
   - No manual UI updates needed unless you want custom descriptions

**Example - New Tag "quantum-physics":**
1. Add to `featureTagCategories.txt`: `quantum-physics -> feature`
2. Add to `KNOWN_CATEGORIES` in `featureFlags.ts`
3. It will automatically appear in the "Capabilities & Modules" section

**Tag Categories:**
- **Product** (OR logic): `vulcan`, `hypersolve`
- **Feature** (OR logic): `sketch-2-solution`, `mhd`, `particle`, `perfect gas`, `unsteady`, `structured-adaptation`
- **Visibility** (ALL must be enabled): `advanced`, `experimental`, `developer`

**See Also:** `public/featureTagCategories.README.md` for detailed documentation

---

### 11. Time Accuracy Wizard
**File:** `src/frontend/components/EditorPanel/TimeAccuracyWizard.tsx` (lines ~10-40)
**File:** `src/frontend/store/appStore.ts` (updateTimeAccuracy action)

**Hardcoded Values:**

**Time Accuracy Types (Steady State):**
```typescript
const timesteppingType = 'local timestepping' | 'global timestepping'
```

**Unsteady Time Integration:**
```typescript
// Only BDF is shown to users
timestepConfig.method = 'BDF'
timestepConfig.order = 1 or 2  // Only orders 1 and 2 are offered
```

**Note:** "ramped timestep" is intentionally hidden from users per requirements.

**Default Values:**
- Starting CFL: 1.0
- Min CFL: 1e-3
- Max CFL: 1e6
- Steps: 1000
- Timestep (unsteady): 4e-3
- Subiterations: 20
- Subiteration tolerance: 1e-3

**How to Update:**
1. Check schema at: `definitions["Time Accuracy"].properties.type.enum[]`
2. Check schema at: `definitions["Time Accuracy"].properties.method.enum[]`
3. Check schema at: `definitions["Time Accuracy"].properties.order`
4. If new time integration types are added (beyond local/global/fixed/ramped), decide if they should be exposed in the wizard
5. If new schemes beyond BDF are added, decide if unsteady mode should offer them
6. Update defaults if schema default values change

**Example Schema Changes:**
- New `type` value: Decide whether to add to steady or unsteady wizard flow
- New `method` value: Add to unsteady wizard if appropriate
- Changed `order` max: Update radio buttons in wizard

---

### 12. Initialization Wizard
**File:** `src/frontend/components/EditorPanel/InitializationWizard.tsx`
**File:** `src/frontend/store/appStore.ts` (setInitialState action)

**Hardcoded Logic:**
The wizard sets `configData["initial state"]` to a selected state name.

**Schema Dependency:**
- Field: `"initial state"` (string, references a key in `states` object)

**How to Update:**
1. Check if `"initial state"` field name changes in schema
2. Check if initialization regions schema changes (future: some types may not require `state` field)
3. Update wizard text/guidance if initialization semantics change

**Note:** Per upstream team, future schema versions may include initialization region types that don't require a `state` field. The wizard currently focuses only on setting the global initial state.

---

### 13. Visualization Wizard
**File:** `src/frontend/components/EditorPanel/VisualizationWizard.tsx`
**File:** `src/frontend/store/appStore.ts` (addVisualizationOutput action)

**Hardcoded Values:**
- Default type: `'volume'`
- Default filename: `'volume.vtk'`
- Default iteration frequency: `-1` (use checkpoint frequency)

**Schema Dependency:**
- Visualization array: `visualization[]`
- Volume type: From `definitions["Visualization"].anyOf[]` → `definitions["Volume Sample"]`

**How to Update:**
1. Check schema at: `definitions["Visualization"].anyOf[]` for new visualization types
2. Check `definitions["Volume Sample"]` for required/changed fields
3. If `iteration frequency` field changes name or default, update wizard
4. If new output frequency modes are added, update wizard options

**Example Schema Change:**
- If `"iteration frequency"` becomes `"output frequency"`, update:
  ```typescript
  vizConfig['output frequency'] = iterationFrequency
  ```

---

### 14. Nonlinear Solver Settings (Used by Time Accuracy Wizard)
**File:** `src/frontend/store/appStore.ts` (updateTimeAccuracy action)

**Hardcoded Configuration:**
```typescript
updatedConfig['nonlinear solver'] = {
  'starting cfl': <value>,
  'cfl bounds': [<min>, <max>]
}
```

**Schema Dependency:**
- Field: `"nonlinear solver"` → `definitions["Nonlinear Solver Settings"]`
- Properties: `"starting cfl"`, `"cfl bounds"`

**How to Update:**
1. Check schema at: `definitions["Nonlinear Solver Settings"]`
2. If `"starting cfl"` field name changes, update store action
3. If `"cfl bounds"` changes from array to object, update logic
4. Verify default values match schema defaults

---

## 📋 Quick Checklist

When you get a new `input.schema.json`:

- [ ] Check `Boundary Condition` oneOf array for new/removed BC types
- [ ] Update `BC_TYPES` array in EditorPanel.tsx and BoundaryConditionDialog.tsx
- [ ] Update `DEFAULT_BC_TYPE_COLORS` in surfaceColorUtils.ts for new BC types
- [ ] Check each BC definition for required `state` field
- [ ] Update BC type-specific field conditionals
- [ ] Check `Initialization Regions` anyOf array for new/removed initialization region types
- [ ] Update `INIT_REGION_TYPES` array in InitializationRegionDialog.tsx
- [ ] Update initialization region type-specific form fields if required fields change
- [ ] Check `Visualization` anyOf array for new/removed visualization types
- [ ] Update `VISUALIZATION_TYPES` array in VisualizationDialog.tsx
- [ ] Update visualization type-specific form fields if required fields change
- [ ] Check `Time Accuracy.type` enum for new timestepping modes
- [ ] Check `Time Accuracy.method` enum for new integration schemes
- [ ] Verify `nonlinear solver` field names haven't changed (starting cfl, cfl bounds)
- [ ] Check if `initial state` field still exists and has same semantics
- [ ] Verify `visualization` array and volume sample structure
- [ ] Review `State` oneOf array for new state definition modes
- [ ] Update StateWizard options if needed
- [ ] Check thermodynamics planetary atmosphere species lists
- [ ] Update Earth/Mars species arrays in appStore.ts if chemistry models change
- [ ] Verify thermodynamic data source enum values
- [ ] Check for new "only for" tags in schema (search for `"only for"`)
- [ ] Categorize new tags in `public/featureTagCategories.txt` (product/feature/visibility)
- [ ] Add new tags to `KNOWN_CATEGORIES` in featureFlags.ts
- [ ] Settings UI will automatically group tags - no manual updates needed
- [ ] Test BC creation, initialization region creation, visualization creation, state wizard, and thermodynamics wizard
- [ ] Verify all form fields render correctly

---

### 8. Thermodynamics Planetary Atmosphere Presets
**File:** `src/frontend/store/appStore.ts` (updateThermodynamics function, lines ~284-310)

**Hardcoded Arrays:**
```typescript
if (thermoConfig.planetaryBody === 'earth') {
  if (thermoConfig.speciesModel === '5-species') {
    thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O']
  } else if (thermoConfig.speciesModel === '7-species') {
    thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-']
  } else if (thermoConfig.speciesModel === '11-species') {
    thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'N2+', 'O2+', 'N+', 'O+', 'e-']
  }
} else if (thermoConfig.planetaryBody === 'mars') {
  thermodynamics.species = ['CO2', 'CO', 'N2', 'O2', 'NO']
}

thermodynamics['thermodynamic data source'] = 'NASA_9_coefficient'
```

**How to Update:**
1. If upstream chemistry models change (new species added/removed), update the hardcoded species arrays
2. Verify species names match the thermodynamic database used by the solver
3. Check if new planetary bodies should be added (Venus, Titan, etc.)
4. Verify `thermodynamic data source` enum values in schema at `thermodynamics.properties["thermodynamic data source"].enum`
5. Update the default `'NASA_9_coefficient'` if schema changes preferred data source

**Example Update Scenario:**
If Earth 5-species model adds `NO2`:
```typescript
thermodynamics.species = ['N2', 'O2', 'NO', 'NO2', 'N', 'O']  // Added NO2
```

**Where to Find Correct Values:**
- Consult with the upstream Vulcan/HyperSolve team for approved chemistry models
- Check solver documentation for valid species names and thermodynamic data sources
- Species names must match entries in the thermodynamic database (e.g., `thermo.dat`)

**Test After Update:**
```bash
cd src/frontend
npm test -- --run appStore.thermodynamics.test.ts
```

The tests explicitly check each preset:
- Earth 5-species
- Earth 7-species  
- Earth 11-species
- Mars Park 5-species

Update tests if species lists change.

---

### 8a. Thermodynamics Chemistry Model Field
**File:** `src/frontend/store/appStore.ts` (updateThermodynamics and initializeConfig functions)
**File:** `src/frontend/store/__tests__/appStore.thermodynamics.test.ts` (all test assertions)

**Schema Change (January 2026):**
The schema deprecated `"chemical nonequilibrium"` (boolean) and replaced it with `"chemistry model"` (enum).

**Old Schema (deprecated):**
```json
{
  "chemical nonequilibrium": {
    "type": "boolean",
    "description": "<chemical nonequilibrium> has been updated to <chemistry model : finite-rate>.",
    "deprecated": true
  }
}
```

**New Schema (current):**
```json
{
  "chemistry model": {
    "type": "string",
    "enum": ["frozen", "finite-rate"],
    "description": "Chemical reaction modeling",
    "default": "frozen"
  }
}
```

**Mapping in Code:**
The thermodynamics wizard uses `chemicalNonequilibrium: boolean` internally for simplicity, which is mapped to the schema field:
- `true` → `'chemistry model': 'finite-rate'` (reactions enabled)
- `false` → `'chemistry model': 'frozen'` (no reactions)

**Code Locations:**
```typescript
// In updateThermodynamics():
if (thermoConfig.gasModel === 'ideal-gas') {
  thermodynamics['chemistry model'] = 'frozen'
} else if (thermoConfig.gasModel === 'multispecies') {
  const enableChemistry = thermoConfig.chemicalNonequilibrium ?? true
  thermodynamics['chemistry model'] = enableChemistry ? 'finite-rate' : 'frozen'
}

// In initializeConfig():
if (projectConfig.reactionType === 'edl') {
  newConfig.thermodynamics = {
    'chemistry model': 'finite-rate'
  }
} else if (projectConfig.speciesType === 'non-reacting') {
  newConfig.thermodynamics = {
    'chemistry model': 'frozen',
    species: []
  }
}
```

**How to Update if Schema Changes:**
1. Check `thermodynamics["chemistry model"].enum` for valid values
2. Update the mapping logic if new enum values are added (e.g., `'equilibrium'`)
3. Update all test assertions to expect the new enum values
4. Update UI text in `ThermodynamicsWizard.tsx` Step 7 if needed

**Test After Update:**
```bash
cd src/frontend
npm test -- --run appStore.thermodynamics.test.ts
```

All 23 thermodynamics tests check for `'chemistry model'` enum values.

---

### 7. Schema Bug Workarounds - Arrays Missing `items` Property
**File:** `src/frontend/components/EditorPanel/EditorPanel.tsx` (isPropertyPOD and array rendering)
**File:** `src/frontend/components/PropertyEditorDialog/PropertyEditorDialog.tsx` (similar logic)

**Issue:** Some array properties in the schema were missing the `items` property that defines the element type. Per JSON Schema spec, arrays should have `items` to specify element types.

**Status:** ✅ FIXED in upstream schema (January 2026)

**Previously Affected Properties:**
- `thermodynamics.species` - Now correctly has `items: { type: "string" }`

**Workaround Code (kept for robustness):**
```typescript
// In isPropertyPOD():
if (prop.type === 'array') {
  // If no items.type but has a default array with strings, treat as string array
  if (!prop.items && Array.isArray(prop.default) && prop.default.every((v: any) => typeof v === 'string')) {
    return true
  }
  // If no items specified at all, assume it could be an array of strings
  if (!prop.items) {
    return true
  }
}

// In array rendering:
let itemType = prop.items?.type
if (!itemType) {
  // Infer from default values or current values
  const sampleArray = Array.isArray(displayValue) && displayValue.length > 0 
    ? displayValue 
    : (Array.isArray(prop.default) ? prop.default : [])
  if (sampleArray.length > 0) {
    const sampleType = typeof sampleArray[0]
    if (sampleType === 'string' || sampleType === 'number' || sampleType === 'boolean') {
      itemType = sampleType === 'number' ? 'number' : sampleType
    }
  } else {
    itemType = 'string'  // Default assumption
  }
}
```

**Note:** The workaround code is kept for robustness in case other arrays without `items` appear in future schema updates. The explicit `items.type` check takes precedence when present.

---

## 💡 Future Improvements

To make this more automatic:
1. Parse BC types from schema's `Boundary Condition.oneOf` array at runtime
2. Dynamically build state wizard modes from `State.oneOf` required arrays
3. Auto-generate type-specific field logic from BC definitions' required arrays
4. Use TypeScript code generation to create interfaces from schema

For now, manual updates are simpler and more maintainable for a prototype.
