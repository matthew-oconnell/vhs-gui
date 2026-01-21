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
- [ ] Review `State` oneOf array for new state definition modes
- [ ] Update StateWizard options if needed
- [ ] Check thermodynamics planetary atmosphere species lists
- [ ] Update Earth/Mars species arrays in appStore.ts if chemistry models change
- [ ] Verify thermodynamic data source enum values
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
