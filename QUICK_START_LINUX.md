# Quick Start Guide - VHS CFD GUI for Linux

## For End Users

### Download and Extract

```bash
# Download vhs-gui-v1.0.0.tar.gz (provided by your administrator)

# Extract to your desired location
tar -xzf vhs-gui-v1.0.0.tar.gz

# Navigate to the directory
cd vhs-gui-v1.0.0
```

### Run the Application

**Option 1: Use the launcher (Recommended)**
```bash
./run.sh
```

**Option 2: Run directly**
```bash
./vhs-gui
```

### Installation Examples

**Install to home directory:**
```bash
cd ~
tar -xzf ~/Downloads/vhs-gui-v1.0.0.tar.gz
~/vhs-gui-v1.0.0/vhs-gui
```

**Install to local applications:**
```bash
mkdir -p ~/.local/apps
cd ~/.local/apps
tar -xzf ~/Downloads/vhs-gui-v1.0.0.tar.gz
~/.local/apps/vhs-gui-v1.0.0/vhs-gui
```

**Install system-wide (if you have permissions):**
```bash
sudo mkdir -p /opt
sudo tar -xzf vhs-gui-v1.0.0.tar.gz -C /opt/
/opt/vhs-gui-v1.0.0/vhs-gui
```

### Troubleshooting

**"Permission denied" error:**
```bash
chmod +x vhs-gui
./vhs-gui
```

**Missing libraries error:**

*Ubuntu/Debian:*
```bash
sudo apt install libgtk-3-0 libwebkit2gtk-4.0-37
```

*Fedora:*
```bash
sudo dnf install gtk3 webkit2gtk3
```

**Check what's missing:**
```bash
ldd vhs-gui | grep "not found"
```

### Creating a Desktop Shortcut

Create `~/.local/share/applications/vhs-gui.desktop`:

```ini
[Desktop Entry]
Name=VHS CFD GUI
Comment=CFD Simulation Configuration Tool
Exec=/home/YOUR_USERNAME/vhs-gui-v1.0.0/vhs-gui
Icon=utilities-terminal
Terminal=false
Type=Application
Categories=Science;Engineering;
```

Replace `/home/YOUR_USERNAME/` with the actual path where you extracted the archive.

Then:
```bash
chmod +x ~/.local/share/applications/vhs-gui.desktop
```

The application will appear in your system's application menu.

---

## For Administrators/Distributors

See [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md) for complete distribution instructions.

**Quick distribution:**
1. Run `./create-distribution.sh` from project root
2. Share `dist-package/vhs-gui-v1.0.0.tar.gz` with users
3. Provide the Quick Start section above

**System installation packages** (.deb/.rpm) are also available in `dist-package/` for users who prefer traditional package management.
