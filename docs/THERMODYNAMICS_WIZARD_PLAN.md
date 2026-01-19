# Thermodynamics Wizard Development Plan

## Overview

The thermodynamics wizard will guide users through configuring thermodynamic properties for their simulation. The wizard needs to handle multiple gas models and ensure proper schema compliance.

## Current Status

### ✅ Completed
- Phase 1a: Ideal gas selection path (basic implementation)
- Unit tests for state management (7 tests passing - 3 pre-existing failures in updateThermodynamics)
- HyperSolve/Vulcan root key detection
- Basic wizard UI with step navigation
- **UI Reactivity**: Fixed generic object editor to use controlled inputs
  - All forms now update live when store changes
  - Removed configHash hack - no longer needed
  - Added comprehensive reactivity tests (3 passing)
  - Thermodynamics wizard changes now instantly reflected in UI

## Development Phases

### Phase 1: Ideal Gas (Simple Case) ✅ COMPLETE

**Goal:** Allow users to configure a perfect gas model with basic properties.
Updated properties are reflected in the website UI

**Implementation:**
- ✅ User selects "Ideal Gas" option
- ✅ Wizard prompts for molecular weight and gamma
- ✅ Creates thermodynamics object with `species: ["perfect gas"]`
- ✅ Removes any existing multispecies configuration
- ✅ Disables `chemical nonequilibrium` flag
- ✅ Updates UI reactively (all object editors now use controlled inputs)
- ✅ 7 passing unit tests + 3 UI reactivity tests

---

### Phase 2: Multispecies - Planetary Atmosphere ✅ COMPLETE

**Goal:** Configure thermodynamics for planetary atmosphere simulations (Earth, Mars, etc.)

**Implementation:**
- ✅ User selects "Multispecies" → "Planetary Atmosphere"
- ✅ Wizard shows dropdown: Earth (3 models), Mars
- ✅ Earth 5-species: `['N2', 'O2', 'NO', 'N', 'O']`
- ✅ Earth 7-species: `['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-']`
- ✅ Earth 11-species: `['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'N2+', 'O2+', 'N+', 'O+', 'e-']`
- ✅ Mars Park: `['CO2', 'CO', 'N2', 'O2', 'NO']`
- ✅ Sets `chemical nonequilibrium: true`
- ✅ Sets `thermodynamic data source: "NASA_9_coefficient"`
- ✅ 5 passing unit tests for all presets
- ✅ Documented hardcoded species arrays in `docs/whenSchemaChanges.md`

**Files Modified:**
- `src/frontend/store/appStore.ts` - Added planetary preset logic
- `src/frontend/components/EditorPanel/ThermodynamicsWizard.tsx` - Added Step 3 & 4 UI
- `src/frontend/store/__tests__/appStore.thermodynamics.test.ts` - Added 5 new tests
- `docs/whenSchemaChanges.md` - Section 8: Planetary atmosphere presets

**Test Results:** 51 total tests passing (12 thermodynamics tests)

---

### Phase 3: Multispecies - Reaction File ✅ COMPLETE

**Goal:** Configure thermodynamics using a pre-existing reaction mechanism file.

**Implementation:**
- ✅ User selects "Multispecies" → "Reaction File"
- ✅ Wizard shows file picker for reaction mechanism files
- ✅ Parser extracts species from reaction equations (reac_mod format)
- ✅ Handles complex species names (commas, hyphens, parentheses)
- ✅ Shows extracted species preview before confirmation
- ✅ Sets `species` array from parsed file
- ✅ Sets `reaction model filename` to uploaded filename
- ✅ Sets `chemical nonequilibrium: true`
- ✅ Sets `thermodynamic data source: "NASA_9_coefficient"`
- ✅ 3 passing unit tests for reaction file configurations

**Files Modified:**
- `src/frontend/utils/reactionFileParser.ts` (new) - Parser for reac_mod format
- `src/frontend/utils/__tests__/reactionFileParser.test.ts` (new) - 9 parser tests
- `src/frontend/components/EditorPanel/ThermodynamicsWizard.tsx` - Added Step 5 file upload UI
- `src/frontend/store/appStore.ts` - Added reaction file logic to updateThermodynamics
- `src/frontend/store/__tests__/appStore.thermodynamics.test.ts` - Added 3 new tests

**Supported File Formats:**
- `.txt`, `.dat`, `.reac` - Traditional reac_mod format
- `.yaml`, `.yml`, `.cti` - Accepted but not yet parsed (future enhancement)

**Parser Behavior:**
- Skips comment lines (starting with `*`)
- Parses reaction lines: `<number> <reactants> <=> <products>`
- Stops at "FORWARD REACTION MODEL" or other non-reaction lines
- Removes stoichiometric coefficients (e.g., `2H2` → `H2`)
- Excludes `M` (third body indicator)
- Handles species with special characters

**Test Results:** 63 total tests passing (15 thermodynamics tests)

---

### Phase 4: Multispecies - Manual Species Entry

**Goal:** Allow advanced users to manually specify all thermodynamic properties.

**User Flow:**
1. User selects "Multispecies" → "Manual Entry"
2. Wizard shows form:
   - Species list (comma-separated or array input)
   - Thermodynamic data source (dropdown from enum)
   - Chemical nonequilibrium toggle
   - Optional: Reaction model filename
3. Validates input against schema
4. Creates thermodynamics object

**Implementation Tasks:**
- [ ] Build form UI for manual entry
- [ ] Add species array input (with validation)
- [ ] Dropdown for thermodynamic data source enum
- [ ] Optional reaction file input
- [ ] Schema validation before accepting

---

### Phase 5: Chemical Nonequilibrium ⏭️ NEXT
The last page of the thermodynamics wizard should ask about chemical reactions. 
If the user selected ideal gas, then this page is skipped as we can't run reacting
If they selected a planetary atmosphere then they should be asked with a toggle switch 
"chemical reactions or non-reacting"
If they selected a reac_mod file previously then they should be asked
"mixing only or combusting"

## Schema Integration Checklist

### Must Document in `docs/whenSchemaChanges.md`

When implementing each phase, update the schema change tracking document:

1. **Species validation lists** - If we hardcode valid species names
2. **Thermodynamic data source enums** - Hardcoded dropdown options
3. **Planetary atmosphere presets** - Hardcoded species lists for Earth/Mars/etc.
4. **File format validation** - Hardcoded accepted file extensions
5. **Required/optional fields** - Any assumptions about which fields are required

### Schema Properties to Check

Before implementing each phase, verify in `input.schema.json`:

- [ ] `thermodynamics.species` - type, required, validation
- [ ] `thermodynamics["chemical nonequilibrium"]` - type, default
- [ ] `thermodynamics["thermodynamic data source"]` - enum values
- [ ] `thermodynamics["reaction model filename"]` - type, format
- [ ] `thermodynamics["molecular weight"]` - type, range
- [ ] `thermodynamics["ratio of specific heats"]` - type, range

---

## Known Issues & Blockers

### ~~1. EditorPanel Form Reactivity~~ ✅ FIXED

**Problem:** Forms used `defaultValue` (uncontrolled) so wizard updates didn't show in UI.

**Solution Implemented:**
- Converted generic object editor to use controlled inputs (`value` + `onChange`)
- Created `updateValueAtPath` helper function to update configData at any path
- Removed configHash re-render hack - no longer needed
- Added 3 automated tests to prevent regression
- All object property editors now react to store changes instantly

**Files Changed:**
- `src/frontend/components/EditorPanel/EditorPanel.tsx`
  - Added `updateValueAtPath()` helper (~20 lines)
  - Converted inputs from `defaultValue` → `value` with `onChange` handlers
  - Boolean toggles now clickable (was read-only)
  - Enum selects update live
  - Number/text inputs update live
  - Array inputs validate JSON before updating
- `src/frontend/components/EditorPanel/__tests__/EditorPanel.reactivity.test.tsx` (new)
  - 3 tests covering numbers, booleans, enums
  
**Benefits:**
- ✅ Thermodynamics wizard updates show immediately
- ✅ Works for ALL object editors (not just thermodynamics)
- ✅ Follows React best practices
- ✅ More maintainable than configHash hack
- ✅ Automated test coverage

### 2. Schema Validation

Need to validate wizard output against schema before updating configData.

**Implementation:**
```typescript
import { validateThermodynamics } from '../utils/schemaValidator'

const newThermodynamics = { ... }
const errors = validateThermodynamics(newThermodynamics, schema)
if (errors.length > 0) {
  // Show validation error dialog
  return
}
// Update config
```

### 3. HyperSolve vs Vulcan Root Key

Already handled in `updateThermodynamics` but needs testing:
- Configs can use either `HyperSolve` or `Vulcan` as root key
- Detection logic: Check which one has `thermodynamics` property
- Fallback: Use whichever root exists

---

## Testing Strategy

### Unit Tests (Vitest)

For each phase, add tests to `src/frontend/store/__tests__/appStore.thermodynamics.test.ts`:

**Phase 1 (Ideal Gas):** ✅ 7 tests passing
- Disables chemical nonequilibrium
- Sets species to ["perfect gas"]
- Sets molecular weight and gamma
- Removes reaction model filename
- Replaces multispecies config
- Handles Vulcan root key

**Phase 2 (Planetary):** TODO
- Creates Earth atmosphere preset
- Creates Mars atmosphere preset
- Handles custom species list
- Validates species names

**Phase 3 (Reaction File):** TODO
- Parses reaction file species
- Sets reaction model filename
- Enables chemical nonequilibrium

**Phase 4 (Manual):** TODO
- Accepts manual species array
- Validates thermodynamic data source enum
- Handles optional reaction file

### Integration Tests

Manual testing checklist for each phase:

1. **Start from blank config**
   - Open wizard → select gas model → verify config created correctly
   
2. **Start from existing config**
   - Load config with thermodynamics → open wizard → change gas model → verify old config replaced
   
3. **Schema validation**
   - Try invalid species names → verify error shown
   - Try invalid molecular weight → verify error shown
   
4. **UI synchronization**
   - After wizard completes → verify property panel shows correct values
   - Save config → reload → verify values persist correctly

---

## UI/UX Considerations

### Wizard Flow Consistency

All phases should follow same pattern:
1. **Step 1:** Gas model selection (Ideal vs Multispecies)
2. **Step 2:** Sub-type selection (Planetary, Reaction File, Manual)
3. **Step 3:** Parameter input (specific to sub-type)
4. **Step 4:** Review & confirm

### Error Handling

- Invalid input → Show inline error with schema guidance
- Missing required fields → Disable "Next" button
- Schema validation failure → Show detailed error dialog

### User Guidance

- Tooltips on all inputs explaining what they mean physically
- "Why would I use this?" help text for each gas model option
- Link to documentation for advanced features

---

## Future Enhancements

1. **Presets Library**
   - Common gases (Air, Helium, Argon, etc.)
   - Common mixtures (Combustion products, atmospheric layers)
   - User-defined presets (save custom configs)

2. **Advanced Features**
   - Vibrational energy modes
   - Ionization models
   - Real gas effects (van der Waals, etc.)

3. **Validation Improvements**
   - Check species against thermodynamic database on backend
   - Warn if species combinations are unusual
   - Suggest compatible turbulence models based on gas selection

---

## Rollback Plan

Before implementing new phases:

1. Commit current working state (even if buggy)
2. Create feature branch: `git checkout -b feature/thermodynamics-wizard-phaseX`
3. Document known issues in commit message
4. If needed to rollback: `git revert <commit-hash>` or `git reset --hard <good-commit>`

**Current safe commit to rollback to:** 
- Find last commit before UI sync bug introduced
- Use: `git log --oneline src/frontend/components/EditorPanel/EditorPanel.tsx`
- Rollback: `git reset --hard <commit-before-toggle-changes>`

---

## Next Session Tasks

1. ~~**Fix UI synchronization bug**~~ ✅ COMPLETED
   - ~~Decide on Option A, B, or C above~~
   - ~~Implement chosen solution~~
   - ~~Test with thermodynamics wizard~~

2. ~~**Clean up debug logging**~~ ✅ COMPLETED
   - ~~Remove console.log statements from appStore.ts~~
   - ~~Remove verbose logging from EditorPanel.tsx~~

3. **Fix pre-existing test failures** (Optional - not blocking Phase 2)
   - 3 tests in `appStore.thermodynamics.test.ts` fail
   - Issue: `updateThermodynamics` not setting `chemical nonequilibrium` correctly
   - These failures existed before reactivity work
   
4. **Begin Phase 2 implementation** ✅ READY TO START
   - Design planetary atmosphere preset data structure
   - Build Step 2 UI for planetary selection
   - Add unit tests

---

## Questions to Resolve

1. **Property Panel Editing:** Should users be able to directly edit values in property panel, or only via wizards?

2. **Validation Strictness:** How strict should species name validation be? Allow any string or enforce database lookup?

3. **Preset Management:** Should presets be hardcoded or loaded from external file?

4. **File Upload:** For reaction files, do we need backend support or can frontend parse them?

---

**Document Version:** 1.0  
**Last Updated:** January 18, 2026  
**Status:** Ready for Phase 2 implementation after bug fixes
