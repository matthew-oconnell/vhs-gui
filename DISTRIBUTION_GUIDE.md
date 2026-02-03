# VHS CFD GUI - Linux Distribution Guide

## Overview

The Linux distribution is now a **standalone portable application** that users can extract anywhere and run without installation.

## What Changed

**Before:**
- Only .deb and .rpm installer packages
- Required system installation with sudo privileges
- Installed to /usr/bin/

**After:**
- **Primary:** Standalone tarball (vhs-gui-v1.0.0.tar.gz) - extract and run
- **Optional:** .deb and .rpm packages still available for users who prefer system installation

## Distribution Files

After running `./create-distribution.sh`, you'll find in `dist-package/`:

```
dist-package/
├── vhs-gui-v1.0.0/              # Directory ready for tarball
│   ├── vhs-gui                  # Standalone binary (13 MB)
│   ├── run.sh                   # Helper launcher script
│   └── README.txt               # User installation guide
├── vhs-gui-v1.0.0.tar.gz        # Main distribution (4.5 MB compressed)
├── VHS CFD GUI_1.0.0-beta.1_amd64.deb     # Optional: Debian/Ubuntu installer
└── VHS CFD GUI-1.0.0-beta.1-1.x86_64.rpm  # Optional: Fedora/RHEL installer
```

## User Instructions (Quick Start)

Send users the `vhs-gui-v1.0.0.tar.gz` file with these instructions:

```bash
# Extract anywhere you like
tar -xzf vhs-gui-v1.0.0.tar.gz

# Navigate to directory
cd vhs-gui-v1.0.0

# Run the application
./run.sh
# OR
./vhs-gui
```

That's it! No installation required.

## Installation Locations (User Choice)

Users can extract to any location:
- `~/vhs-gui/` - Their home directory
- `~/.local/vhs-gui/` - Local applications
- `/opt/vhs-gui/` - System-wide (with permissions)
- External drive - Portable use

## System Installation (Optional)

For users who prefer traditional package management:

### Debian/Ubuntu
```bash
sudo dpkg -i "VHS CFD GUI_1.0.0-beta.1_amd64.deb"
```

### Fedora/RHEL
```bash
sudo rpm -i "VHS CFD GUI-1.0.0-beta.1-1.x86_64.rpm"
```

## Dependencies

The binary requires:
- **GTK3** (libgtk-3-0)
- **WebKit2GTK** (libwebkit2gtk-4.0-37)

These are typically pre-installed on modern Linux distributions. If missing:

**Ubuntu/Debian:**
```bash
sudo apt install libgtk-3-0 libwebkit2gtk-4.0-37
```

**Fedora:**
```bash
sudo dnf install gtk3 webkit2gtk3
```

## Creating Desktop Launchers

Users can add VHS CFD GUI to their application menu by creating:

`~/.local/share/applications/vhs-gui.desktop`:
```ini
[Desktop Entry]
Name=VHS CFD GUI
Comment=CFD Simulation Configuration Tool
Exec=/path/to/vhs-gui-v1.0.0/vhs-gui
Terminal=false
Type=Application
Categories=Science;Engineering;
```

## Building the Distribution

From the project root:

```bash
# Clean build and create distribution
./create-distribution.sh
```

This will:
1. Build the Tauri desktop application
2. Copy the standalone binary to `dist-package/vhs-gui-v1.0.0/vhs-gui`
3. Create helper scripts and documentation
4. Package everything into a tarball
5. Also copy .deb/.rpm packages for optional system install

## Testing Locally

```bash
# Extract to a test location
cd /tmp
tar -xzf /home/matthew/Projects/vulcan-gui/dist-package/vhs-gui-v1.0.0.tar.gz

# Run it
cd vhs-gui-v1.0.0
./vhs-gui
```

## Benefits

1. **No sudo required** - Users can run from any location
2. **Portable** - Copy to USB drive, network share, etc.
3. **Multiple versions** - Users can have multiple versions side-by-side
4. **Clean uninstall** - Just delete the directory
5. **Quick testing** - Extract and run immediately

## Comparison with System Installation

| Feature | Standalone Tarball | .deb/.rpm Package |
|---------|-------------------|-------------------|
| Requires sudo | ❌ No | ✅ Yes |
| System integration | Manual (optional) | ✅ Automatic |
| Multiple versions | ✅ Easy | ❌ Difficult |
| Uninstall | Delete directory | Package manager |
| Portable | ✅ Yes | ❌ No |
| Application menu | Manual setup | ✅ Automatic |

## Recommendation

**Primary:** Distribute the `.tar.gz` standalone archive  
**Secondary:** Offer .deb/.rpm for users who prefer system integration

Most modern users prefer standalone apps they can manage themselves without needing admin privileges.
