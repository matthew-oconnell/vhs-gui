# Tauri File Handling Issues and Recommendations

## Overview
This application was recently migrated from a web-based application with a standalone server to a Tauri desktop application. During the migration, several file handling patterns were incompletely converted, resulting in a **hybrid system** that attempts to use both browser File System Access APIs and Tauri native APIs.

## Critical Issues Found

### 1. **Dual-Mode File Handling is Overly Complex**

**Problem:** Every file operation has duplicate code paths:
- One for browser mode (File System Access API)
- One for Tauri mode (Tauri plugin APIs)

**Example from `fileUtils.ts`:**
```typescript
if (isTauri()) {
  // Tauri native dialog
  const filePath = await open({ ... })
  const text = await readTextFile(filePath)
  // ... process
} else {
  // Browser File System Access API
  const [fileHandle] = await window.showOpenFilePicker({ ... })
  const file = await fileHandle.getFile()
  // ... process
}
```

**Impact:**
- Code duplication across 10+ file operation functions
- Harder to maintain (every change needs 2 implementations)
- Inconsistent behavior between modes
- More surface area for bugs

**Recommendation:** Since this is now a **Tauri-only application**, remove all browser-mode fallbacks. Delete the `isTauri()` detection and simplify to Tauri-only APIs.

---

### 2. **Incomplete Tauri Migration - Still Using Browser APIs**

**Problem:** Two critical places still use browser-only APIs that **don't work in Tauri**:

#### A. Export CSM (App.tsx:938)
```typescript
const handle = await window.showSaveFilePicker({
  suggestedName: csmFilename || 'exported.csm',
  // ...
})
```

**Issue:** `window.showSaveFilePicker` is undefined in Tauri. Should use:
```typescript
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

const filePath = await save({
  defaultPath: csmFilename || 'exported.csm',
  filters: [{ name: 'CSM Files', extensions: ['csm'] }]
})
if (filePath) {
  await writeTextFile(filePath, generatedCSM)
}
```

#### B. ESP Error Log Export (ESPErrorDialog.tsx:23)
```typescript
const handle = await window.showSaveFilePicker({
  suggestedName: 'esp-error.log',
  // ...
})
```

Same issue - needs Tauri API conversion.

---

### 3. **Overly Restrictive File Permissions**

**Problem:** `capabilities/default.json` restricts file access to specific directories:

```json
{
  "identifier": "fs:allow-read-text-file",
  "allow": [
    { "path": "$HOME/**" },
    { "path": "$DESKTOP/**" },
    { "path": "$DOCUMENT/**" },
    { "path": "$DOWNLOAD/**" }
  ]
}
```

**Issues:**
- What if user's project is in `/mnt/data/projects`? Access denied.
- What if config references `/opt/meshes/grid.stl`? Access denied.
- Users can't load files from network shares, USB drives, or non-standard locations.

**Your Requirement:**
> "We should ensure tauri permissions are such that we can fuck with any file we want on the user's machine because we don't know where the user's config files are going to reference other files based on relative paths."

**Current State:** ❌ Permissions are too restrictive

**Recommended Fix:**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "VHS CFD GUI - Full file system access for project files",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-read-dir",
    "fs:allow-exists",
    "fs:allow-stat",
    {
      "identifier": "fs:scope",
      "allow": [
        { "path": "**" }  // Allow all paths - air-gapped environment
      ]
    }
  ]
}
```

**Rationale:**
- Application runs air-gapped (no internet)
- Users control their own machines
- CFD workflows require reading mesh files, config files, geometry files from arbitrary locations
- Restricting to `$HOME` breaks legitimate workflows

---

### 4. **Binary File Reading is Broken**

**Problem:** Binary files (STL, STEP, etc.) are read as text:

```typescript
// fileUtils.ts:582
const content = await readTextFile(filePath as string)
const fileName = (filePath as string).split('/').pop() || 'mesh'
const blob = new Blob([content], { type: 'application/octet-stream' })
```

**Issue:** Binary files (STL, STEP) contain non-UTF8 bytes. Reading as text corrupts them.

**Code Comment Admits This:**
```typescript
// This is a limitation - ideally we'd use readBinaryFile but that requires additional setup
```

**Fix Required:**
```typescript
import { readFile } from '@tauri-apps/plugin-fs'

// Read as binary Uint8Array
const content = await readFile(filePath)
const blob = new Blob([content], { type: 'application/octet-stream' })
const file = new File([blob], fileName, { type: 'application/octet-stream' })
```

**Impact:** Loading binary mesh files from project folders currently **fails or corrupts data**.

---

### 5. **Project Folder File Loading is Inconsistent**

**Problem:** Different methods of loading files from project folders:

#### Method 1: Config auto-load (configLoader.ts:110)
```typescript
console.log(`[Debug] Auto-loading mesh "${filename}" from project folder...`)
context.onLog('Config', 'info', `Auto-loading mesh "${filename}" from project folder...`)
```

#### Method 2: Right-click load (ProjectFolderPanel.tsx)
```typescript
const file = await readProjectFile(node.path)
// ...then converts File to fake FileSystemFileHandle
```

#### Method 3: Menu -> Load Mesh
```typescript
const file = await openMeshFile()  // Opens dialog, ignores project folder
```

**Inconsistency:** Menu actions **ignore** the project folder even when one is open. Right-click actions work, but use a hacky FileHandle conversion.

**User Expectation:**
> "Once we have a loaded project folder the project panel will show them and we can right click on them to do things with them (like load them). We can also File -> Open various files."

**Current:** ✅ Right-click works (with hacks)
**Current:** ❌ File menu doesn't know about project folder

---

### 6. **No Binary Read Permission**

**Missing Permission:** The capabilities file doesn't include `fs:allow-read-file` (for binary reads).

**Current Permissions:**
```json
"fs:allow-read-text-file"  // ✅ Text only
"fs:allow-write-text-file" // ✅ Text only
"fs:allow-read-dir"        // ✅ Directory listing
```

**Missing:**
```json
"fs:allow-read-file"       // ❌ Binary reads
"fs:allow-write-file"      // ❌ Binary writes
```

**Impact:** Can't properly read STL, STEP, OBJ, or other binary mesh/geometry files.

---

### 7. **Duplicate File Picker Logic**

**Found in:**
- `fileUtils.ts` - 10+ functions with `if (isTauri)` branches
- `App.tsx` - Some direct browser API calls
- `ProjectFolderPanel.tsx` - Mixes both approaches

**Example of Duplication:**
- `openMeshFile()` - Has Tauri and browser paths
- `openCadFile()` - Has Tauri and browser paths
- `openCsmFile()` - Has Tauri and browser paths
- `openProjectFolder()` - Has Tauri and browser paths
- `openJsonFileWithHandle()` - Has Tauri and browser paths
- `openJsonFileWithDirectory()` - Has Tauri and browser paths

**Total:** ~500 lines of code that could be reduced to ~250 lines.

---

## Recommended Architecture Changes

### Phase 1: Fix Critical Bugs (Immediate)

1. **Replace browser APIs in App.tsx and ESPErrorDialog.tsx**
   - Change `window.showSaveFilePicker` to Tauri `save()`
   - Change `FileSystemFileHandle` to direct file writes

2. **Fix binary file reading**
   - Use `readFile()` instead of `readTextFile()` for binary files
   - Update all mesh/geometry loaders

3. **Expand file system permissions**
   - Allow access to all paths (`"path": "**"`)
   - Add binary read/write permissions

### Phase 2: Simplify File Handling (Next Sprint)

4. **Remove browser mode fallbacks**
   - Delete all `if (isTauri())` branches
   - Remove browser-mode code (File System Access API)
   - Simplify `fileUtils.ts` by 50%

5. **Unified file loading**
   - Create single `loadFile(path: string)` function
   - Use everywhere (project folder, menu, auto-load)
   - No more FileHandle → File → FileHandle conversions

### Phase 3: Better UX (Future)

6. **Smart file resolution**
   - When config references `"mesh.stl"`, check project folder first
   - If not found, prompt user only once
   - Remember user's choice for session

7. **Recent files/folders**
   - Track recently opened project folders
   - Quick access in File menu

---

## Specific Code Changes Needed

### 1. Fix Export CSM (App.tsx)

**Current (BROKEN):**
```typescript
const handle = await window.showSaveFilePicker({
  suggestedName: csmFilename || 'exported.csm',
  types: [{
    description: 'CSM Files',
    accept: { 'application/octet-stream': ['.csm'] }
  }]
})
const writable = await handle.createWritable()
await writable.write(generatedCSM)
await writable.close()
```

**Fixed:**
```typescript
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

const filePath = await save({
  defaultPath: csmFilename || 'exported.csm',
  filters: [{ name: 'CSM Files', extensions: ['csm'] }]
})

if (filePath) {
  await writeTextFile(filePath, generatedCSM)
  log('CSM', 'success', `Exported to ${filePath}`)
}
```

### 2. Fix ESP Error Export (ESPErrorDialog.tsx)

Same pattern as above - replace browser API with Tauri API.

### 3. Update Capabilities (default.json)

**Add permissions:**
```json
{
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-read-file",      // ← Add for binary reads
    "fs:allow-write-file",     // ← Add for binary writes
    "fs:allow-read-dir",
    "fs:allow-exists",
    "fs:allow-stat",
    {
      "identifier": "fs:scope",
      "allow": [{ "path": "**" }]  // ← Allow all paths
    }
  ]
}
```

### 4. Fix Binary File Reading (fileUtils.ts)

**Current (CORRUPTS DATA):**
```typescript
const content = await readTextFile(filePath as string)
const blob = new Blob([content], { type: 'application/octet-stream' })
```

**Fixed:**
```typescript
import { readFile } from '@tauri-apps/plugin-fs'

const content = await readFile(filePath)  // Returns Uint8Array
const blob = new Blob([content], { type: 'application/octet-stream' })
```

### 5. Simplify File Loaders

**Instead of this pattern repeated 10 times:**
```typescript
export const openXFile = async (): Promise<File | null> => {
  if (isTauri()) {
    const filePath = await open({ filters: [...] })
    if (filePath) {
      const content = await readTextFile(filePath)
      return new File([content], fileName)
    }
    return null
  } else {
    const [fileHandle] = await window.showOpenFilePicker(...)
    return await fileHandle.getFile()
  }
}
```

**Just this:**
```typescript
export const openFile = async (filters: FileFilter[]): Promise<{ path: string, content: Uint8Array } | null> => {
  const filePath = await open({ filters })
  if (!filePath) return null
  
  const content = await readFile(filePath)
  return { path: filePath, content }
}

// Specialized wrappers
export const openMeshFile = () => openFile([
  { name: 'Mesh Files', extensions: ['stl', 'obj', 'meshb'] }
])
```

---

## Testing Checklist

After fixes, verify:

- [ ] File → Open Project Folder works from any location
- [ ] File → Open loads config.json from any location
- [ ] Config auto-loads referenced mesh files (relative paths)
- [ ] Config auto-loads referenced CSM files
- [ ] CSM auto-loads referenced STEP files
- [ ] Right-click "Load Mesh" in project folder works
- [ ] Right-click "Load Config" in project folder works
- [ ] File → Export CSM works (currently broken)
- [ ] ESP error log export works (currently broken)
- [ ] Binary STL files load correctly (currently corrupted)
- [ ] Binary STEP files load correctly (currently corrupted)
- [ ] Files on network shares work (`/mnt/nfs/project/`)
- [ ] Files on USB drives work (`/media/usb/meshes/`)
- [ ] No permission errors for valid user paths

---

## Summary of Bugs

| # | Bug | Severity | File(s) |
|---|-----|----------|---------|
| 1 | Export CSM uses browser API in Tauri | **CRITICAL** | App.tsx:938 |
| 2 | ESP error export uses browser API | **HIGH** | ESPErrorDialog.tsx:23 |
| 3 | Binary files read as text (corrupts data) | **CRITICAL** | fileUtils.ts (multiple) |
| 4 | File permissions too restrictive | **HIGH** | capabilities/default.json |
| 5 | Missing binary read/write permissions | **HIGH** | capabilities/default.json |
| 6 | Dual-mode file handling (unnecessary complexity) | **MEDIUM** | fileUtils.ts (entire file) |
| 7 | File loading inconsistent across UI | **MEDIUM** | App.tsx, ProjectFolderPanel.tsx |

---

## Conclusion

The migration to Tauri was incomplete. The application still has:
1. **Browser-only APIs** that don't work in Tauri (critical bugs)
2. **Overly restrictive permissions** that break legitimate workflows
3. **Corrupted binary file reads** due to text-mode reading
4. **Unnecessary dual-mode complexity** (browser + Tauri)

**Next Steps:**
1. Fix the 2 critical browser API bugs (Export CSM, ESP error export)
2. Add binary file permissions and expand scope to `"**"`
3. Fix binary file reading to use `readFile()` not `readTextFile()`
4. (Optional) Simplify by removing browser-mode fallbacks entirely

This will give the application the "native feel" you want, with no permission prompts and seamless file access.
