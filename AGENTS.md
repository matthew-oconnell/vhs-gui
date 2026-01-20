# AI Agent Guidelines for vhs-gui

This document provides guidance for AI agents making changes to this codebase.

## 📋 Key Principle: Maintainability with Schema Updates

This project is a GUI for editing JSON configuration files that conform to `input.schema.json`. The schema is maintained by an upstream team and **will change over time**.

### What This Means for Code Changes

When implementing features or making changes, you must consider:
1. **Will this work if the schema changes?**
2. **Does this introduce hardcoded values that depend on the schema?**

## ⚠️ Critical Rule: Update docs/whenSchemaChanges.md

**WHENEVER you add code that will break or need updates when the schema changes, you MUST update `docs/whenSchemaChanges.md`.**

### Examples That Require Documentation

#### ✅ DO update docs/whenSchemaChanges.md when you:

1. **Add hardcoded arrays of enum values from the schema**
   ```typescript
   // BAD: This list needs manual updates if schema adds new types
   const VISUALIZATION_TYPES = ['point', 'line', 'plane', 'sphere']
   ```
   → Add a new section to docs/whenSchemaChanges.md documenting this array

2. **Create type-specific conditional logic**
   ```typescript
   // BAD: This needs updates if new BC types are added
   if (bcType === 'dirichlet' || bcType === 'riemann') {
     // Show state field
   }
   ```
   → Document which conditionals exist and where

3. **Build wizards or dialogs with hardcoded form fields**
   ```typescript
   // BAD: If schema adds required fields, form is incomplete
   <input name="temperature" />
   <input name="pressure" />
   ```
   → Document the wizard/dialog and its field mapping to schema

4. **Create lists of types that require specific fields**
   ```typescript
   const BC_TYPES_REQUIRING_STATE = ['dirichlet', 'riemann']
   ```
   → Document this mapping in docs/whenSchemaChanges.md

#### ❌ DON'T need to document when you:

1. **Use the schema parser to auto-generate UI**
   - Tree view rendering (automatic)
   - Enum dropdown population (automatic from schema)
   - Required field indicators (automatic)
   - Default values (automatic)

2. **Add generic utility functions**
   - Helper functions that work with any schema
   - Generic validation logic

3. **Make pure UI/styling changes**
   - CSS updates
   - Layout changes
   - Icon changes

## 📝 How to Update docs/whenSchemaChanges.md

When you add schema-dependent code:

1. **Identify the schema dependency**
   - Which part of the schema does your code rely on?
   - What values are hardcoded that come from the schema?

2. **Add a new section or update existing section**
   - Use the existing format (numbered sections)
   - Include file paths and line numbers
   - Show code examples
   - Explain how to update when schema changes

3. **Update the Quick Checklist**
   - Add a checkbox item for testing your new feature

### Template for New Sections

```markdown
### N. [Feature Name]
**File:** `path/to/file.tsx` (lines ~X-Y)

**Hardcoded Array/Logic:**
```typescript
// Show the problematic code
```

**How to Update:**
1. Look in schema at: `[path to relevant schema location]`
2. [Step-by-step instructions]
3. [What to update in the code]

**Example from Schema:**
```json
{
  // Show relevant schema snippet
}
```
```

## 🎯 Decision Framework

Ask yourself these questions when adding new code:

### Question 1: Is this value in the schema?
- **YES** → Will it change if schema updates?
  - **YES** → Is it auto-loaded from schema at runtime?
    - **NO** → **Document it in docs/whenSchemaChanges.md**
    - **YES** → No documentation needed
  - **NO** → No documentation needed
- **NO** → No documentation needed

### Question 2: Does this assume specific schema structure?
- **YES** → Will it break if schema structure changes?
  - **YES** → **Document it in docs/whenSchemaChanges.md**
  - **NO** → No documentation needed
- **NO** → No documentation needed

## 📚 Examples from This Codebase

### Good: Auto-adapting code
```typescript
// This automatically works with any schema changes
const enumValues = schemaProperty.enum || []
return (
  <select>
    {enumValues.map(val => <option key={val} value={val}>{val}</option>)}
  </select>
)
```

### Bad: Schema-dependent code (needs documentation)
```typescript
// This breaks if schema adds new BC types
const BC_TYPES = [
  'dirichlet',
  'riemann',
  'no slip'
]
// ⚠️ Must be documented in docs/whenSchemaChanges.md
```

### Good: Making it semi-automatic
```typescript
// Better: Load from schema at runtime
const bcTypes = loadBCTypesFromSchema(schema)

// But if you still hardcode for UX reasons, document it!
const BC_TYPES = ['dirichlet', 'riemann', 'no slip']
// ⚠️ Still needs documentation because it's not fully automatic
```

## 🔄 Workflow Summary

1. **Before implementing**: Consider schema change impact
2. **While implementing**: Note any schema dependencies
3. **After implementing**: Update docs/whenSchemaChanges.md if needed
4. **Before committing**: Review your changes against this checklist

## 💡 Future Vision

The ultimate goal is to minimize manual schema tracking by:
- Auto-generating more UI from schema at runtime
- Creating schema-aware utilities that adapt automatically
- Using TypeScript code generation from schema

Until then, **docs/whenSchemaChanges.md is our safety net** to ensure the project doesn't silently break when the upstream team updates the schema.

---

## 🧪 Test-Driven Development (TDD)

This project uses **Vitest** for unit/integration testing and **React Testing Library** for component testing.

### Testing Philosophy

**Write tests BEFORE implementing new features whenever possible.** Tests serve as:
1. **Specification** - Define expected behavior before coding
2. **Documentation** - Show how the code should be used
3. **Regression Protection** - Prevent future changes from breaking existing functionality
4. **Design Tool** - Force you to think about the API before implementation

### When to Use TDD

#### ✅ **ALWAYS use TDD for:**
- **Utility functions** (pure functions, data transformations)
- **Store actions** (Zustand state management)
- **Business logic** (validation, calculations, data processing)
- **Bug fixes** (write failing test first, then fix)

#### 🟡 **CONSIDER TDD for:**
- **React components** (when UI behavior is complex)
- **Dialog workflows** (multi-step forms, wizards)
- **Integration points** (file I/O, API calls)

#### ❌ **Skip TDD for:**
- **Styling changes** (CSS-only updates)
- **Simple UI tweaks** (moving a button, changing text)
- **Exploratory prototyping** (add tests after you settle on approach)

### TDD Workflow (Red-Green-Refactor)

```bash
# 1. RED: Write a failing test
npm test -- --run src/utils/__tests__/myFunction.test.ts

# 2. GREEN: Write minimal code to make it pass
# Edit the implementation file

# 3. REFACTOR: Improve the code (tests still pass)
# Clean up, optimize, remove duplication

# 4. Repeat for next feature
```

### Running Tests

```bash
# Run all tests in watch mode (TDD mode)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI (visual test runner)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Test File Organization

```
src/
├── utils/
│   ├── fileUtils.ts
│   └── __tests__/
│       └── fileUtils.test.ts
├── store/
│   ├── appStore.ts
│   └── __tests__/
│       └── appStore.test.ts
├── components/
│   └── BoundaryConditionDialog/
│       ├── BoundaryConditionDialog.tsx
│       └── __tests__/
│           └── BoundaryConditionDialog.test.tsx
└── test/
    └── setup.ts  # Global test configuration
```

**Convention:** Place test files in a `__tests__/` subdirectory next to the code being tested.

### Writing Good Tests

#### Structure: Arrange-Act-Assert

```typescript
import { describe, it, expect } from 'vitest'

describe('myFunction', () => {
  it('should do something specific', () => {
    // ARRANGE: Set up test data
    const input = { /* test data */ }
    
    // ACT: Call the function
    const result = myFunction(input)
    
    // ASSERT: Verify the result
    expect(result).toBe(expectedValue)
  })
})
```

#### Test Naming Convention

Use descriptive test names that read like specifications:

```typescript
// ❌ BAD: Vague test names
it('works', () => { /* ... */ })
it('test 1', () => { /* ... */ })

// ✅ GOOD: Descriptive test names
it('removes id and name fields from boundary conditions', () => { /* ... */ })
it('converts surface tag numbers to surface names', () => { /* ... */ })
it('throws error when JSON file is invalid', () => { /* ... */ })
```

#### What to Test

**✅ DO test:**
- Public API / exported functions
- Edge cases (null, undefined, empty arrays)
- Error conditions (invalid input, missing data)
- Integration between modules
- User-facing behavior (component interactions)

**❌ DON'T test:**
- Implementation details (private functions, internal state)
- Third-party libraries (trust they're tested)
- Trivial code (getters/setters with no logic)

### Example: TDD for a Utility Function

**Scenario:** Create `openJsonFile()` function to load configuration files.

#### Step 1: Write the test FIRST

```typescript
// src/utils/__tests__/fileUtils.test.ts
import { describe, it, expect, vi } from 'vitest'
import { openJsonFile } from '../fileUtils'

describe('openJsonFile', () => {
  it('parses and returns valid JSON file content', async () => {
    // Mock file picker
    const mockFile = new File(
      ['{"HyperSolve": {"boundary conditions": []}}'],
      'config.json',
      { type: 'application/json' }
    )
    
    global.showOpenFilePicker = vi.fn().mockResolvedValue([{
      getFile: () => Promise.resolve(mockFile)
    }])
    
    const result = await openJsonFile()
    
    expect(result).toEqual({
      HyperSolve: { 'boundary conditions': [] }
    })
  })
  
  it('throws error for invalid JSON', async () => {
    const mockFile = new File(['invalid json'], 'bad.json', { type: 'application/json' })
    
    global.showOpenFilePicker = vi.fn().mockResolvedValue([{
      getFile: () => Promise.resolve(mockFile)
    }])
    
    await expect(openJsonFile()).rejects.toThrow()
  })
})
```

#### Step 2: Run test (should FAIL)

```bash
npm test -- --run src/utils/__tests__/fileUtils.test.ts
# Expected: FAIL (function doesn't exist yet)
```

#### Step 3: Implement minimal code to pass

```typescript
// src/utils/fileUtils.ts
export const openJsonFile = async (): Promise<any> => {
  const [fileHandle] = await window.showOpenFilePicker({
    types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
  })
  
  const file = await fileHandle.getFile()
  const text = await file.text()
  return JSON.parse(text) // Throws if invalid JSON
}
```

#### Step 4: Run test (should PASS)

```bash
npm test -- --run src/utils/__tests__/fileUtils.test.ts
# Expected: PASS
```

#### Step 5: Add more tests, refactor

```typescript
it('returns null when user cancels file picker', async () => {
  global.showOpenFilePicker = vi.fn().mockRejectedValue({ name: 'AbortError' })
  const result = await openJsonFile()
  expect(result).toBeNull()
})
```

### Testing React Components

Use React Testing Library to test **user behavior**, not implementation:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BoundaryConditionDialog from '../BoundaryConditionDialog'

describe('BoundaryConditionDialog', () => {
  it('enables create button when surface is selected', async () => {
    const mockOnClose = vi.fn()
    render(<BoundaryConditionDialog isOpen={true} onClose={mockOnClose} />)
    
    // Find checkbox and click it
    const checkbox = screen.getByLabelText(/surface 1/i)
    fireEvent.click(checkbox)
    
    // Create button should now be enabled
    const createButton = screen.getByText('Create Boundary Condition')
    expect(createButton).not.toBeDisabled()
  })
})
```

### Testing Store Actions (Zustand)

Test state updates in isolation:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../appStore'

describe('appStore - boundary conditions', () => {
  beforeEach(() => {
    // Reset store to clean state before each test
    useAppStore.setState({
      configData: { HyperSolve: { 'boundary conditions': [] } },
      selectedBC: null
    })
  })

  it('adds a boundary condition and selects it', () => {
    const bc = { id: '1', type: 'no slip', 'mesh boundary tags': 1 }
    
    useAppStore.getState().addBoundaryCondition(bc)
    
    const state = useAppStore.getState()
    expect(state.configData.HyperSolve?.['boundary conditions']).toHaveLength(1)
    expect(state.selectedBC).toEqual(bc)
  })
})
```

### Mocking in Tests

Use `vi.fn()` and `vi.mock()` to isolate units under test:

```typescript
import { vi } from 'vitest'

// Mock a function
const mockFn = vi.fn().mockReturnValue('mocked value')

// Mock a module
vi.mock('../utils/fileUtils', () => ({
  saveJsonFile: vi.fn().mockResolvedValue(undefined)
}))

// Spy on console methods
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
```

### Coverage Guidelines

Aim for **80%+ coverage** on critical paths:
- ✅ Utility functions: 90%+
- ✅ Store logic: 85%+
- 🟡 Components: 70%+
- 🟡 Integration tests: 60%+

**Check coverage:**
```bash
npm run test:coverage
# Open: coverage/index.html
```

### CI/CD Integration

All tests must pass before merging:

```bash
npm run test:run  # Run all tests once (no watch mode)
npm run build     # Ensure code compiles
```

### TDD Benefits for This Project

1. **Schema changes** - Tests catch breaking changes when schema updates
2. **Refactoring confidence** - Safely improve code structure
3. **Documentation** - Tests show how to use the code
4. **Bug prevention** - Catch issues before manual testing
5. **Faster debugging** - Failing test pinpoints exact problem

---

## 🎨 UI Consistency Guidelines

### Modal Dialog Button Styling

**All modal dialogs must use consistent button classes for a unified look and feel.**

#### Standard Button Classes

Use these standardized classes for all modal dialog buttons:

```tsx
// Primary action button (e.g., "Create", "Save", "OK")
<button className="modal-button modal-button-primary" onClick={handleAction}>
  Create Boundary Condition
</button>

// Secondary action button (e.g., "Cancel", "Back")
<button className="modal-button modal-button-secondary" onClick={onClose}>
  Cancel
</button>
```

#### CSS Definition

Each dialog's CSS file should include these styles (copied from StateWizard.css):

```css
.modal-button {
  padding: 8px 16px;
  border: none;
  border-radius: 3px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.modal-button-primary {
  background-color: #0e639c;
  color: #ffffff;
}

.modal-button-primary:hover {
  background-color: #1177bb;
}

.modal-button-primary:disabled {
  background-color: #3e3e42;
  color: #858585;
  cursor: not-allowed;
}

.modal-button-secondary {
  background-color: #3e3e42;
  color: #cccccc;
}

.modal-button-secondary:hover {
  background-color: #505050;
}
```

#### Key Properties

- **No borders** - Clean, flat design
- **No box shadows** - Simple visual style
- **Simple transitions** - Only background color changes on hover
- **Consistent sizing** - 8px vertical, 16px horizontal padding
- **VS Code theme colors** - Matches editor color scheme

#### Examples

Dialogs following this pattern:
- ✅ StateWizard (EditorPanel/StateWizard.tsx)
- ✅ BoundaryConditionDialog
- ✅ Other modal dialogs

**Why This Matters:** Consistent button styling creates a professional, cohesive user experience. Users should not have to relearn button interactions across different dialogs.

---

**Remember: If you hardcode it, document it. Future maintainers (human or AI) will thank you.**

---

## 📁 Static File Handling (Schemas, Assets)

### Schema File Distribution

The JSON schema file (`input.schema.json`) must be accessible to the frontend at runtime. Here's the proper setup:

**Directory Structure:**
```
/home/matthew/Projects/vhs-gui/
├── schemas/input.schema.json          # Source of truth (maintained by upstream)
├── public/schemas/input.schema.json   # Copy for Vite publicDir
├── src/frontend/
│   ├── vite.config.ts                 # Configured with publicDir
│   └── dist/schemas/input.schema.json # Build output (copied by Vite)
└── src/server/build/public/
    └── schemas/input.schema.json      # Final server location (copied by build.sh)
```

**Build Flow:**
1. **Source:** `schemas/input.schema.json` (upstream maintained)
2. **Copy to public:** Manual copy or build script: `cp schemas/input.schema.json public/schemas/`
3. **Vite publicDir:** In `vite.config.ts`, configure `publicDir: path.resolve(__dirname, '../../public')`
4. **Build output:** `npm run build` copies `public/` → `dist/`
5. **Server deployment:** `build.sh` copies `dist/` → `src/server/build/public/`
6. **Runtime access:** Frontend fetches from `/schemas/input.schema.json`

**Critical Configuration (vite.config.ts):**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../../public'), // ⚠️ ESSENTIAL for schema files
  server: {
    port: 3000,
    open: true
  },
  // ... rest of config
})
```

**What NOT to do:**
- ❌ Don't rely on bundler to include JSON files automatically
- ❌ Don't use dynamic imports for large schema files (slow, bundler issues)
- ❌ Don't hardcode schema content in source code
- ❌ Don't forget to copy schema to `public/` directory

**Checklist when schema updates:**
1. ✅ Copy updated schema from `schemas/` to `public/schemas/`
2. ✅ Rebuild frontend: `npm run build` (in `src/frontend/`)
3. ✅ Rebuild server: `./build.sh` (from project root)
4. ✅ Verify file exists: `src/server/build/public/schemas/input.schema.json`
5. ✅ Test in browser: Open network tab, confirm schema loads

**Troubleshooting:**
- **Empty configuration tree?** → Schema not being served by backend
  - Check: `ls src/server/build/public/schemas/input.schema.json`
  - Fix: Run `./build.sh` to rebuild and copy files
  
- **404 on schema fetch?** → Vite publicDir misconfigured
  - Check: `vite.config.ts` has `publicDir: path.resolve(__dirname, '../../public')`
  - Check: `dist/schemas/input.schema.json` exists after `npm run build`
  
- **Schema out of date?** → Forgot to copy from source
  - Fix: `cp schemas/input.schema.json public/schemas/input.schema.json`

---

## 📝 Commit Message Guidelines

**Keep commit messages SHORT and focused on WHY, not WHAT.**

### Format

```
type: brief summary of why this change was needed

Optional: One-line explanation if the "why" isn't obvious.
```

### Rules

1. **First line ≤ 72 characters** - Should be a complete summary
2. **Focus on WHY, not WHAT** - Git diff shows what changed
3. **No bullet lists** - If you need bullets, your commit is too big
4. **No test results** - Tests pass or the commit doesn't happen
5. **No file lists** - Git tracks this automatically
6. **No documentation** - The code/docs speak for themselves

### Good Examples

```
fix: schema files not served by backend

The configuration tree was empty because Vite wasn't copying
public/ directory to dist. Configured publicDir in vite.config.ts.
```

```
refactor: move package-lock.json to src/frontend/

Keeps config files with their corresponding source code.
```

```
feat: add backend health check before mesh upload

Prevents upload errors when server is down.
```

### Bad Examples (from our history)

```
❌ feat: integrate React frontend with C++ backend API

Frontend Integration Complete:
- Created backend API client (backendApi.ts) with upload/convert functions
- Created mesh adapter (meshAdapter.ts) to convert backend format to internal format
...
(30+ more lines)
```

**Why it's bad:** 
- Novel-length commit message
- Lists implementation details (visible in diff)
- Includes test results (should be automatic)
- Duplicates documentation

**Better version:**
```
✅ feat: integrate frontend with C++ backend for mesh parsing

Removes browser-side STL parsing. All mesh loading now uses
backend API for consistent format support.
```

### When to Commit

- ✅ One logical change per commit
- ✅ All tests passing
- ✅ Code is self-documenting or has inline comments
- ❌ Don't commit work-in-progress with "WIP" messages
- ❌ Don't bundle unrelated changes together

### Commit Types

- `feat:` - New feature for users
- `fix:` - Bug fix
- `refactor:` - Code restructuring without behavior change
- `docs:` - Documentation only
- `test:` - Adding/fixing tests
- `chore:` - Build process, dependencies, tooling

