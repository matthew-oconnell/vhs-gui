# Tauri Migration Plan

**Goal:** Convert VHS-GUI from web-based (C++ server + browser) to standalone desktop application using Tauri.

**Branch:** `tauri` (current)

**Estimated Timeline:** 3-4 weeks to production-ready application

---

## Phase 0: Prerequisites & Setup (Day 1)

### 0.1 Install Tauri Prerequisites

**System dependencies:**

```bash
# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# macOS (if testing on Mac)
# Xcode Command Line Tools should already be installed

# Windows (if testing on Windows)
# Install Microsoft C++ Build Tools and WebView2
```

**Rust installation:**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version  # Verify installation
```

**Tauri CLI:**

```bash
cargo install tauri-cli
# Or use npm version for development
npm install -D @tauri-apps/cli
```

### 0.2 Project Structure Planning

**New directory layout:**
```
vulcan-gui/
├── src-tauri/              # NEW - Rust backend
│   ├── src/
│   │   └── main.rs         # Tauri entry point
│   ├── icons/              # App icons
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── src/frontend/           # EXISTING - stays mostly the same
│   ├── App.tsx
│   ├── components/
│   └── ...
├── src/server/             # EXISTING - becomes sidecar binary
├── src/esp-server/         # EXISTING - becomes sidecar binary
└── ...
```

**Checkpoints:**
- [ ] Rust installed and working
- [ ] System dependencies installed
- [ ] Tauri CLI available

---

## Phase 1: Basic Tauri Integration (Days 2-3)

### 1.1 Initialize Tauri

```bash
cd /home/matthew/Projects/vulcan-gui
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api

# Initialize Tauri (will create src-tauri/ directory)
npx tauri init
```

**Answer prompts:**
- App name: `VHS CFD GUI`
- Window title: `VHS CFD GUI`
- Web assets location: `../src/frontend/dist`
- Dev server URL: `http://localhost:5173`
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build`

### 1.2 Configure Tauri

Edit `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeDevCommand": "cd src/frontend && npm run dev",
    "beforeBuildCommand": "cd src/frontend && npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../src/frontend/dist"
  },
  "package": {
    "productName": "VHS-CFD-GUI",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "all": true,
        "readFile": true,
        "writeFile": true,
        "readDir": true,
        "copyFile": true,
        "createDir": true,
        "removeFile": true,
        "exists": true,
        "scope": ["$APP/*", "$HOME/*"]
      },
      "dialog": {
        "all": true,
        "open": true,
        "save": true
      },
      "http": {
        "all": true,
        "request": true,
        "scope": ["http://127.0.0.1:8080/*", "http://127.0.0.1:8081/*"]
      },
      "shell": {
        "all": false,
        "sidecar": true,
        "scope": [
          { "name": "vhs_server", "sidecar": true },
          { "name": "esp-server", "sidecar": true }
        ]
      }
    },
    "windows": [
      {
        "title": "VHS CFD GUI",
        "width": 1600,
        "height": 1000,
        "resizable": true,
        "fullscreen": false,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

### 1.3 First Test Run

```bash
# From project root
cd src/frontend
npm run build

cd ../..
npx tauri dev
```

**Expected result:** Desktop window opens showing your React app.

**Checkpoints:**
- [ ] Tauri initializes without errors
- [ ] Desktop window opens
- [ ] React app renders correctly
- [ ] Basic UI interactions work

---

## Phase 2: File System Migration (Days 4-6)

### 2.1 Install Tauri Plugins

```bash
cd src/frontend
npm install @tauri-apps/plugin-dialog
npm install @tauri-apps/plugin-fs
```

### 2.2 Create Tauri File Utils Wrapper

Create `src/frontend/utils/tauriFileUtils.ts`:

```typescript
/**
 * Tauri-native file operations
 * Replaces browser File System Access API with Tauri APIs
 */

import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

export const saveJsonFile = async (data: any, defaultFilename: string = 'config.json'): Promise<void> => {
  try {
    const dataToSave = isOldFormat(data) ? migrateConfigToFlatStructure(data) : data
    const jsonString = JSON.stringify(dataToSave, null, 2)
    
    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [{
        name: 'JSON Files',
        extensions: ['json']
      }]
    })
    
    if (filePath) {
      await writeTextFile(filePath, jsonString)
    }
  } catch (error) {
    console.error('Error saving file:', error)
    throw error
  }
}

export const openJsonFile = async (): Promise<any> => {
  const result = await openJsonFileWithHandle()
  return result?.config ?? null
}

export const openJsonFileWithHandle = async (): Promise<{ config: any; filePath: string } | null> => {
  try {
    const filePath = await open({
      multiple: false,
      filters: [{
        name: 'JSON Files',
        extensions: ['json']
      }]
    })
    
    if (!filePath) return null
    
    const content = await readTextFile(filePath as string)
    const config = JSON.parse(stripJsonComments(content))
    
    // Apply migrations if needed
    const migratedConfig = isOldFormat(config) 
      ? migrateConfigToFlatStructure(config) 
      : config
    
    return {
      config: migratedConfig,
      filePath: filePath as string
    }
  } catch (error) {
    console.error('Error opening file:', error)
    throw error
  }
}

// Similar functions for mesh files, dependencies, etc.
export const openMeshFile = async (): Promise<{ path: string; name: string } | null> => {
  const filePath = await open({
    multiple: false,
    filters: [
      { name: 'Mesh Files', extensions: ['obj', 'stl', 'meshb', 'egads'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (!filePath) return null
  
  return {
    path: filePath as string,
    name: (filePath as string).split('/').pop() || 'unknown'
  }
}
```

### 2.3 Update App.tsx File Operations

**Strategy:** Add runtime detection and use Tauri APIs when available.

Add to `src/frontend/utils/platformDetection.ts`:

```typescript
/**
 * Detect if running in Tauri vs browser
 */

declare global {
  interface Window {
    __TAURI__?: any
  }
}

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined
}

export const getFileUtils = async () => {
  if (isTauri()) {
    return await import('./tauriFileUtils')
  } else {
    return await import('./fileUtils')
  }
}
```

Update file operations in `App.tsx`:

```typescript
// OLD:
import { openJsonFile, saveJsonFile } from './utils/fileUtils'

// NEW:
import { getFileUtils } from './utils/platformDetection'

// Usage:
const handleOpenConfig = async () => {
  const fileUtils = await getFileUtils()
  const config = await fileUtils.openJsonFile()
  // ... rest of logic
}
```

### 2.4 Test File Operations

**Checkpoints:**
- [ ] File > Open works in Tauri window (native dialog)
- [ ] File > Save works in Tauri window (native dialog)
- [ ] JSON files load and parse correctly
- [ ] Migration logic still works
- [ ] Error handling graceful

---

## Phase 3: Settings/Preferences Migration (Day 7)

### 3.1 Install Store Plugin

```bash
cd src/frontend
npm install @tauri-apps/plugin-store
```

### 3.2 Create Settings Manager

Create `src/frontend/utils/tauriSettings.ts`:

```typescript
/**
 * Tauri-native settings storage
 * Replaces browser localStorage
 */

import { Store } from '@tauri-apps/plugin-store'

// Create store instance (saved in app data directory)
const store = new Store('.vhs-gui-settings.dat')

export const saveAppSettings = async (key: string, value: any): Promise<void> => {
  await store.set(key, value)
  await store.save()
}

export const loadAppSettings = async (key: string, defaultValue?: any): Promise<any> => {
  const value = await store.get(key)
  return value !== null && value !== undefined ? value : defaultValue
}

export const clearAppSettings = async (): Promise<void> => {
  await store.clear()
  await store.save()
}

// Specific settings helpers
export const saveFeatureFlags = async (flags: any): Promise<void> => {
  await saveAppSettings('featureFlags', flags)
}

export const loadFeatureFlags = async (): Promise<any> => {
  return await loadAppSettings('featureFlags', {})
}

export const saveConsoleHeight = async (height: number): Promise<void> => {
  await saveAppSettings('console-height', height)
}

export const loadConsoleHeight = async (): Promise<number> => {
  return await loadAppSettings('console-height', 300)
}

// ... more specific helpers
```

### 3.3 Update Zustand Stores

Update `src/frontend/store/consoleStore.ts`:

```typescript
import { isTauri } from '../utils/platformDetection'
import * as tauriSettings from '../utils/tauriSettings'

// Wrapper function that uses Tauri or localStorage
const saveToStorage = async (key: string, value: any) => {
  if (isTauri()) {
    await tauriSettings.saveAppSettings(key, value)
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

const loadFromStorage = async (key: string, defaultValue: any) => {
  if (isTauri()) {
    return await tauriSettings.loadAppSettings(key, defaultValue)
  } else {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : defaultValue
  }
}

// Update store actions to use wrapper functions
```

**Checkpoints:**
- [ ] Settings persist between app restarts
- [ ] Feature flags work
- [ ] Console settings persist
- [ ] No localStorage errors in Tauri

---

## Phase 4: Backend Integration - Sidecar Binaries (Days 8-12)

This is the trickiest part. Two approaches:

### Approach A: Sidecar Binaries (Recommended for MVP)

Keep C++ and Python servers as external processes that Tauri manages.

#### 4.1 Build Sidecar Binaries

**C++ Server:**
```bash
cd src/server
./build.sh

# Copy binary to Tauri binaries directory
mkdir -p ../src-tauri/binaries
cp build/vhs_server ../src-tauri/binaries/vhs_server-x86_64-unknown-linux-gnu
```

**For cross-platform:**
```bash
# macOS build (on macOS)
cp build/vhs_server ../src-tauri/binaries/vhs_server-x86_64-apple-darwin

# Windows build (on Windows)
cp build/vhs_server.exe ../src-tauri/binaries/vhs_server-x86_64-pc-windows-msvc.exe
```

**Python ESP Server:**

Option 1 - Bundle Python interpreter:
```bash
# Use PyInstaller to create standalone executable
cd src/esp-server
pip install pyinstaller
pyinstaller --onefile --name esp-server server.py

cp dist/esp-server ../src-tauri/binaries/esp-server-x86_64-unknown-linux-gnu
```

Option 2 - Require Python installation (document in README):
```bash
# Ship server.py as-is, document Python requirement
```

#### 4.2 Configure Sidecars in tauri.conf.json

```json
{
  "tauri": {
    "bundle": {
      "externalBin": [
        "binaries/vhs_server",
        "binaries/esp-server"
      ]
    }
  }
}
```

#### 4.3 Start/Stop Servers from Tauri

Create `src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, State};
use std::process::{Child, Command};
use std::sync::Mutex;

struct ServerProcesses {
    vhs_server: Mutex<Option<Child>>,
    esp_server: Mutex<Option<Child>>,
}

#[tauri::command]
async fn start_backends(state: State<'_, ServerProcesses>) -> Result<String, String> {
    // Start C++ server
    let vhs_process = Command::new("vhs_server")
        .spawn()
        .map_err(|e| format!("Failed to start VHS server: {}", e))?;
    
    *state.vhs_server.lock().unwrap() = Some(vhs_process);
    
    // Start ESP server
    let esp_process = Command::new("esp-server")
        .spawn()
        .map_err(|e| format!("Failed to start ESP server: {}", e))?;
    
    *state.esp_server.lock().unwrap() = Some(esp_process);
    
    Ok("Backends started".to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(ServerProcesses {
            vhs_server: Mutex::new(None),
            esp_server: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![start_backends])
        .setup(|app| {
            // Start backends on app launch
            let handle = app.handle();
            tauri::async_runtime::spawn(async move {
                // Wait a moment for window to load
                std::thread::sleep(std::time::Duration::from_secs(1));
                handle.emit_all("backends-starting", ()).unwrap();
            });
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                // Cleanup: kill backend servers
                // (Add cleanup logic here)
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 4.4 Frontend Changes

Update `App.tsx` to wait for backends:

```typescript
useEffect(() => {
  if (isTauri()) {
    // Listen for backend start event
    const unlisten = await listen('backends-starting', async () => {
      // Wait for servers to be ready
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check backend health
      const healthy = await checkBackendHealth()
      if (healthy) {
        console.log('Backends ready')
      }
    })
    
    return () => {
      unlisten()
    }
  }
}, [])
```

**Checkpoints:**
- [ ] C++ server binary builds for your platform
- [ ] ESP server packaged (PyInstaller or documented requirement)
- [ ] Tauri starts both servers on launch
- [ ] Frontend can connect to localhost:8080 and 8081
- [ ] Servers shut down when app closes

---

## Phase 5: Build & Distribution (Days 13-15)

### 5.1 Configure App Metadata

Update `src-tauri/tauri.conf.json`:

```json
{
  "package": {
    "productName": "VHS-CFD-GUI",
    "version": "0.1.0"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.vhs.cfd-gui",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "resources": [
        "../../public/schemas/*",
        "../../public/*.txt"
      ],
      "targets": ["deb", "appimage", "dmg", "msi"]
    }
  }
}
```

### 5.2 Create App Icons

```bash
# Use a tool like https://icon.kitchen/ or create manually
# Required sizes: 32x32, 128x128, 256x256, 512x512
# Formats needed: .png, .icns (macOS), .ico (Windows)

# Place in src-tauri/icons/
```

### 5.3 Build for Distribution

```bash
# Development build
npx tauri build --debug

# Production build
npx tauri build

# Output will be in src-tauri/target/release/bundle/
# - Linux: .deb, .AppImage
# - macOS: .dmg, .app
# - Windows: .msi, .exe
```

### 5.4 Test on Multiple Platforms

**Linux (your primary):**
```bash
npx tauri build
sudo dpkg -i src-tauri/target/release/bundle/deb/vhs-cfd-gui_*.deb
vhs-cfd-gui
```

**macOS (if available):**
```bash
npx tauri build --target universal-apple-darwin
open src-tauri/target/release/bundle/dmg/VHS-CFD-GUI.dmg
```

**Windows (if available via VM or dual boot):**
```powershell
npx tauri build
.\src-tauri\target\release\bundle\msi\VHS-CFD-GUI.msi
```

**Checkpoints:**
- [ ] Build completes without errors
- [ ] Installer created for your platform
- [ ] App installs successfully
- [ ] App launches from Applications/Start Menu
- [ ] All features work in installed version

---

## Phase 6: Testing & Polish (Days 16-20)

### 6.1 Feature Verification Checklist

Test ALL existing features in Tauri version:

- [ ] Project setup wizard
- [ ] Mesh loading (all formats: OBJ, STL, MESHB, EGADS, CSM)
- [ ] Tag visualization and selection
- [ ] Boundary condition creation/editing/deletion
- [ ] BC type wizards (farfield, state, wall temp)
- [ ] Initialization regions
- [ ] Visualization probes
- [ ] File operations (Open, Save, Save As)
- [ ] Settings dialog
- [ ] Console panel
- [ ] 3D viewport (rotation, pan, zoom, camera presets)
- [ ] Configuration tree navigation
- [ ] Property editing
- [ ] Validation errors display
- [ ] ESP integration (CSM loading, bc_name export)

### 6.2 Cross-Platform Testing

Test on at least 2 platforms (Linux + one other):

- [ ] Linux (Ubuntu/Debian)
- [ ] macOS (if available)
- [ ] Windows (if available via VM)

### 6.3 Performance Validation

Compare web vs Tauri:
- [ ] App startup time (should be faster)
- [ ] Mesh loading time (should be same)
- [ ] Memory usage (should be lower)
- [ ] File I/O speed (should be faster)

### 6.4 Add Native Features

**Menu bar:**

Update `src-tauri/src/main.rs`:

```rust
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

fn create_menu() -> Menu {
    let file_menu = Submenu::new(
        "File",
        Menu::new()
            .add_item(CustomMenuItem::new("new", "New Project").accelerator("CmdOrCtrl+N"))
            .add_item(CustomMenuItem::new("open", "Open...").accelerator("CmdOrCtrl+O"))
            .add_item(CustomMenuItem::new("save", "Save").accelerator("CmdOrCtrl+S"))
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Quit),
    );
    
    let mesh_menu = Submenu::new(
        "Mesh",
        Menu::new()
            .add_item(CustomMenuItem::new("load_mesh", "Load Mesh...").accelerator("CmdOrCtrl+M")),
    );
    
    Menu::new()
        .add_submenu(file_menu)
        .add_submenu(mesh_menu)
}

fn main() {
    tauri::Builder::default()
        .menu(create_menu())
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "new" => {
                    event.window().emit("menu-new-project", ()).unwrap();
                }
                "open" => {
                    event.window().emit("menu-open-file", ()).unwrap();
                }
                "save" => {
                    event.window().emit("menu-save-file", ()).unwrap();
                }
                "load_mesh" => {
                    event.window().emit("menu-load-mesh", ()).unwrap();
                }
                _ => {}
            }
        })
        // ... rest of config
}
```

Update `App.tsx` to listen for menu events:

```typescript
useEffect(() => {
  if (!isTauri()) return
  
  const listeners = [
    await listen('menu-new-project', () => handleNewProject()),
    await listen('menu-open-file', () => handleOpenConfig()),
    await listen('menu-save-file', () => handleSaveConfig()),
    await listen('menu-load-mesh', () => handleLoadMesh()),
  ]
  
  return () => {
    listeners.forEach(unlisten => unlisten())
  }
}, [])
```

**Checkpoints:**
- [ ] Native menu bar appears and works
- [ ] Keyboard shortcuts work
- [ ] Menu items trigger correct actions

---

## Phase 7: Documentation & Release (Days 21-22)

### 7.1 Update README.md

```markdown
# VHS CFD GUI

A desktop application for setting up and configuring CFD simulations.

## Installation

### Linux
Download `VHS-CFD-GUI_x.x.x_amd64.deb` from releases
```bash
sudo dpkg -i VHS-CFD-GUI_*.deb
```

### macOS
Download `VHS-CFD-GUI_x.x.x.dmg` from releases
- Open DMG file
- Drag app to Applications folder

### Windows
Download `VHS-CFD-GUI_x.x.x_x64.msi` from releases
- Run installer
- Follow installation wizard

## Running

Just launch "VHS CFD GUI" from your applications menu.

No servers to start, no terminal commands needed.
```

### 7.2 Create Distribution Package

```bash
# Build for all platforms (if you have access)
npx tauri build --target x86_64-unknown-linux-gnu
npx tauri build --target x86_64-apple-darwin
npx tauri build --target x86_64-pc-windows-msvc

# Package with version number
mkdir -p releases/v0.1.0
cp src-tauri/target/release/bundle/**/VHS-CFD-GUI* releases/v0.1.0/
```

### 7.3 Create CHANGELOG

Create `CHANGELOG.md`:

```markdown
# Changelog

## [0.1.0] - 2026-02-XX

### Changed
- **BREAKING**: Migrated from web-based to native desktop application
- Replaced browser file dialogs with native OS dialogs
- Application now runs as standalone desktop app (no server needed for users)

### Added
- Native menu bar with keyboard shortcuts
- Persistent settings storage in OS-appropriate location
- Bundled backend servers (no manual server management)
- Cross-platform installers (Linux .deb, macOS .dmg, Windows .msi)

### Improved
- Faster startup time (no browser launch)
- Lower memory footprint
- Better file system access
- Professional desktop app experience
```

### 7.4 Migration Notes for Existing Users

Create `docs/MIGRATION_FROM_WEB.md`:

```markdown
# Migrating from Web Version to Desktop App

## For End Users

**Old workflow:**
1. Clone repository
2. Run build script
3. Start C++ server
4. Start ESP server
5. Open browser to localhost:8080

**New workflow:**
1. Download installer for your OS
2. Install
3. Launch from Applications menu

That's it! No more terminal commands, no more server management.

## For Developers

The application architecture is now:

- **Tauri app** wraps the React frontend
- **C++ and Python servers** run as sidecar processes (auto-managed)
- **File operations** use native OS dialogs instead of browser APIs
- **Settings** stored in OS-appropriate location instead of localStorage

See TAURI_DEVELOPMENT.md for development setup.
```

**Checkpoints:**
- [ ] README updated with installation instructions
- [ ] CHANGELOG created
- [ ] Migration guide written
- [ ] Build artifacts organized in releases folder

---

## Rollback Plan

If Tauri migration fails or has blocking issues:

```bash
# Switch back to main branch
git checkout main

# Delete tauri branch if needed
git branch -D tauri

# Continue with web-based architecture
```

The beauty of doing this on a branch: **main branch stays working** the entire time.

---

## Success Criteria

Migration is complete when:

✅ Desktop app launches without manual server starting
✅ All features from web version work identically  
✅ File operations use native OS dialogs
✅ Settings persist between sessions
✅ Installable package created for at least Linux
✅ App feels like a native desktop application
✅ Documentation updated for end users

---

## Key Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| ESP server hard to bundle | Document Python requirement, ship server.py |
| C++ server doesn't cross-compile | Build on each platform separately |
| Tauri learning curve too steep | Start with simple features, iterate |
| Performance worse than web | Profile and optimize, or rollback |
| File I/O APIs don't cover edge cases | Keep fallbacks to browser APIs where needed |

---

## Daily Progress Tracking

Use this checklist:

**Week 1:**
- [ ] Day 1: Prerequisites installed, Tauri initialized
- [ ] Day 2: Basic app window rendering React
- [ ] Day 3: File open dialog working
- [ ] Day 4: File save dialog working
- [ ] Day 5: Settings storage migrated
- [ ] Day 6: All file operations tested
- [ ] Day 7: Weekend break / catchup

**Week 2:**
- [ ] Day 8: C++ server builds as sidecar
- [ ] Day 9: ESP server packaged
- [ ] Day 10: Servers auto-start on app launch
- [ ] Day 11: Backend communication working
- [ ] Day 12: All mesh loading working
- [ ] Day 13: Build system configured
- [ ] Day 14: Weekend break / catchup

**Week 3:**
- [ ] Day 15: First installable package created
- [ ] Day 16-17: Feature testing
- [ ] Day 18-19: Bug fixes
- [ ] Day 20: Cross-platform testing (if possible)
- [ ] Day 21: Weekend break / catchup

**Week 4:**
- [ ] Day 22: Documentation updates
- [ ] Day 23: Release packaging
- [ ] Day 24-25: Final testing
- [ ] Day 26: Merge to main OR decide to rollback

---

## Next Steps

1. **Review this plan** - adjust timeline based on your availability
2. **Start with Phase 0** - install Rust and Tauri CLI
3. **Work incrementally** - commit after each phase
4. **Test frequently** - don't wait until the end
5. **Ask for help** - Tauri Discord is very responsive

Ready to proceed with Phase 0?
