import { useState, useRef, useEffect } from 'react'
import './MenuBar.css'

interface MenuBarProps {
  onNewProject?: () => void
  onNewBlankProject?: () => void
  onOpen?: () => void
  onOpenProjectFolder?: () => void
  onSave?: () => void
  onValidate?: () => void
  onExit?: () => void
  onSettings?: () => void
  onImportMesh?: () => void
  onImportCSM?: () => void
  onImportStep?: () => void
  onCreateFarfield?: () => void
  onExportCSM?: () => void
  onEditCSM?: () => void
}

function MenuBar({ onNewProject, onNewBlankProject, onOpen, onOpenProjectFolder, onSave, onValidate, onExit, onSettings, onImportMesh, onImportCSM, onImportStep, onCreateFarfield, onExportCSM, onEditCSM }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenu])

  const handleMenuClick = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu)
  }

  const handleMenuItemClick = (action: () => void | undefined) => {
    setOpenMenu(null)
    if (action) {
      action()
    }
  }

  return (
    <div className="menu-bar" ref={menuRef}>
        <div className="menu-item">
          <button 
            className={`menu-button ${openMenu === 'file' ? 'active' : ''}`}
            onClick={() => handleMenuClick('file')}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="menu-dropdown">
              <button 
                className="menu-option" 
                onClick={() => handleMenuItemClick(onNewProject || (() => console.log('New Project')))}
              >
                <span className="menu-option-label">New Project</span>
                <span className="menu-option-shortcut">Ctrl+N</span>
              </button>
              <button 
                className="menu-option" 
                onClick={() => handleMenuItemClick(onNewBlankProject || (() => console.log('New Blank Project')))}
              >
                <span className="menu-option-label">New Blank Project</span>
              </button>
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onOpen || (() => console.log('Open')))}
            >
              <span className="menu-option-label">Open Project (Config)</span>
              <span className="menu-option-shortcut">Ctrl+O</span>
            </button>
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onOpenProjectFolder || (() => console.log('Open Project Folder')))}
            >
              <span className="menu-option-label">Open Project Folder</span>
            </button>
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onSave || (() => console.log('Save')))}
            >
              <span className="menu-option-label">Save</span>
              <span className="menu-option-shortcut">Ctrl+S</span>
            </button>
            <div className="menu-separator" />
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onExportCSM || (() => console.log('Export CSM')))}
            >
              <span className="menu-option-label">Export CSM</span>
            </button>
            <div className="menu-separator" />
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onValidate || (() => console.log('Validate')))}
            >
              <span className="menu-option-label">Validate</span>
              <span className="menu-option-shortcut">Ctrl+Shift+V</span>
            </button>
            <div className="menu-separator" />
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onExit || (() => {}))}
            >
              <span className="menu-option-label">Exit</span>
              <span className="menu-option-shortcut">Ctrl+Q</span>
            </button>
          </div>
        )}
      </div>

      <div className="menu-item">
        <button 
          className={`menu-button ${openMenu === 'geometry' ? 'active' : ''}`}
          onClick={() => handleMenuClick('geometry')}
        >
          Geometry
        </button>
        {openMenu === 'geometry' && (
          <div className="menu-dropdown">
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onImportMesh || (() => console.log('Import Mesh')))}
            >
              <span className="menu-option-label">Import Mesh</span>
            </button>
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onImportCSM || (() => console.log('Import CSM')))}
            >
              <span className="menu-option-label">Import CSM (ESP)</span>
            </button>
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onImportStep || (() => console.log('Import STEP')))}
            >
              <span className="menu-option-label">Import STEP (ESP)</span>
            </button>
            <div className="menu-separator" />
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onEditCSM || (() => console.log('Edit CSM')))}
            >
              <span className="menu-option-label">Edit CSM</span>
            </button>
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onCreateFarfield || (() => console.log('Create Farfield')))}
            >
              <span className="menu-option-label">Create Farfield Domain</span>
            </button>
          </div>
        )}
      </div>

      <div className="menu-item">
        <button 
          className={`menu-button ${openMenu === 'edit' ? 'active' : ''}`}
          onClick={() => handleMenuClick('edit')}
        >
          Edit
        </button>
        {openMenu === 'edit' && (
          <div className="menu-dropdown">
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onSettings || (() => console.log('Settings')))}
            >
              <span className="menu-option-label">Settings</span>
              <span className="menu-option-shortcut">Ctrl+,</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MenuBar
