# Thermodynamics Wizard Development Plan

## Overview

The thermodynamics wizard will guide users through configuring thermodynamic properties for their simulation. The wizard needs to handle multiple gas models and ensure proper schema compliance.

## Current Status

### ✅ Completed
- Phase 1a: Ideal gas selection path (basic implementation)
- Unit tests for state management (7 tests passing)
- HyperSolve/Vulcan root key detection
- Basic wizard UI with step navigation

### ⚠️ Issues Found
- **Critical**: UI/data synchronization bug in EditorPanel boolean toggles
  - Issue: Manual DOM manipulation overrides reactive state
  - Impact: `chemical nonequilibrium` toggle shows incorrect state after wizard updates
  - Root cause: `onChange` handler sets inline styles that persist even when `displayValue` changes
  - Needs: Complete refactor of form input handling to be fully reactive OR read-only with wizards-only editing

### 🔄 In Progress
- Debug logging for state updates (needs cleanup after bug fix)

## Development Phases

### Phase 1: Ideal Gas (Simple Case) ✅ MOSTLY DONE

**Goal:** Allow users to configure a perfect gas model with basic properties.

**Steps:**
1. User selects "Ideal Gas" option
2. Wizard prompts for:
   - Molecular weight (default: 28.97 for air)
   - Ratio of specific heats (gamma, default: 1.4 for air)
3. Wizard creates thermodynamics object:
   ```json
   {
     "species": ["perfect gas"],
     "molecular weight": 28.97,
     "ratio of specific heats": 1.4,
     "chemical nonequilibrium": false
   }
   ```
4. Removes any existing multispecies configuration
5. Disables `chemical nonequilibrium` flag

**Remaining Work:**
- Fix UI synchronization bug (see Issues section)
- Remove debug console logs
- Test with real schema validation

---

### Phase 2: Multispecies - Planetary Atmosphere

**Goal:** Configure thermodynamics for planetary atmosphere simulations (Earth, Mars, etc.)

**User Flow:**
1. User selects "Multispecies" → "Planetary Atmosphere"
2. Wizard shows dropdown: Earth, Mars, Venus, Custom
3. For Earth (example):
   ```json
   {
     "species": ["N2", "O2", "NO", "N", "O"],
     "thermodynamic data source": "NASA_9_coefficient",
     "chemical nonequilibrium": true
   }
   ```
4. For Custom: User manually enters species list

**Schema Requirements:**
- `species` must be an array of strings
- `thermodynamic data source` must be from enum (check schema)
- Validate species names against known database

**Implementation Tasks:**
- [ ] Create planetary atmosphere presets (Earth, Mars, Venus)
- [ ] Add species validation against thermodynamic database
- [ ] Build step 2 UI for planetary selection
- [ ] Add "Custom species" path with array input

---

### Phase 3: Multispecies - Reaction File

**Goal:** Configure thermodynamics using a pre-existing reaction mechanism file.

**User Flow:**
1. User selects "Multispecies" → "Reaction File"
2. Wizard prompts to select file (`.yaml`, `.cti`, or other formats supported by schema)
3. Wizard extracts species list from file (or prompts user to confirm)
4. Creates configuration:
   ```json
   {
     "species": ["H2", "O2", "H2O", "H", "O", "OH"],
     "reaction model filename": "h2o2.yaml",
     "thermodynamic data source": "NASA_9_coefficient",
     "chemical nonequilibrium": true
   }
   ```

**Schema Requirements:**
- Check schema for `reaction model filename` property
- Validate file format/extension
- May need backend support to parse reaction files

**Implementation Tasks:**
- [ ] Add file picker for reaction mechanism files
- [ ] Parse reaction file to extract species (or allow manual entry)
- [ ] Validate file format
- [ ] Test with real reaction files (.yaml, .cti, etc.)

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

### 1. EditorPanel Form Reactivity ⚠️ HIGH PRIORITY

**Problem:** Forms use `defaultValue` (uncontrolled) but wizard updates assume reactive UI.

**Options:**
- **Option A:** Make all form inputs controlled (use `value` + `onChange`)
  - Pros: Reactive, always in sync
  - Cons: Performance hit, complex state management
  
- **Option B:** Make forms read-only, wizards/dialogs only
  - Pros: Simple, no sync issues
  - Cons: Users can't directly edit values in property panel
  
- **Option C:** Hybrid - wizards update, save button commits changes
  - Pros: Best of both worlds
  - Cons: Most complex to implement

**Recommendation:** Option B for now (read-only property panel), revisit if users complain.

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

1. **Fix UI synchronization bug**
   - Decide on Option A, B, or C above
   - Implement chosen solution
   - Test with thermodynamics wizard

2. **Clean up debug logging**
   - Remove console.log statements from appStore.ts
   - Remove verbose logging from EditorPanel.tsx

3. **Begin Phase 2 implementation**
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
