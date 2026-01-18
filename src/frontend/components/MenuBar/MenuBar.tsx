import { useState, useRef, useEffect } from 'react'
import './MenuBar.css'

interface MenuBarProps {
  onNew?: () => void
  onOpen?: () => void
  onSave?: () => void
  onValidate?: () => void
  onExit?: () => void
  onSettings?: () => void
  onLoadMesh?: () => void
}

function MenuBar({ onNew, onOpen, onSave, onValidate, onExit, onSettings, onLoadMesh }: MenuBarProps) {
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
              onClick={() => handleMenuItemClick(onNew || (() => console.log('New')))}
            >
              <span className="menu-option-label">New</span>
              <span className="menu-option-shortcut">Ctrl+N</span>
            </button>
            <button 
              className="menu-option" 
              onClick={() => handleMenuItemClick(onOpen || (() => console.log('Open')))}
            >
              <span className="menu-option-label">Open</span>
              <span className="menu-option-shortcut">Ctrl+O</span>
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
              onClick={() => handleMenuItemClick(onLoadMesh || (() => console.log('Load Mesh')))}
            >
              <span className="menu-option-label">Load Mesh</span>
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
              onClick={() => handleMenuItemClick(onExit || (() => console.log('Exit')))}
            >
              <span className="menu-option-label">Exit</span>
              <span className="menu-option-shortcut">Ctrl+Q</span>
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
