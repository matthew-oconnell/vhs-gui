import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'
import { useState, RefObject } from 'react'
import { useAppStore } from '../../store/appStore'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import './ProjectFolderPanel.css'

interface ProjectFolderPanelProps {
  panelRef: RefObject<PanelImperativeHandle>
}

function ProjectFolderPanel({ panelRef }: ProjectFolderPanelProps) {
  const {
    projectFolderHandle,
    projectFolderCollapsed,
    setProjectFolderCollapsed,
    openProjectFolder
  } = useAppStore()

  const handleToggleCollapse = () => {
    const newCollapsed = !projectFolderCollapsed
    setProjectFolderCollapsed(newCollapsed)
    
    if (panelRef.current) {
      if (newCollapsed) {
        panelRef.current.collapse()
      } else {
        panelRef.current.expand()
      }
    }
  }

  const handleOpenFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert('Directory Picker API not supported in this browser')
        return
      }

      const handle = await window.showDirectoryPicker({
        mode: 'readwrite' // Need write access for creating folders/moving files later
      })

      openProjectFolder(handle)
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        console.error('Error opening project folder:', error)
      }
    }
  }

  return (
    <div className={`project-folder-panel ${projectFolderCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header" onClick={handleToggleCollapse}>
        <div className="panel-title">
          {projectFolderCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
          <Folder size={16} />
          <span>Project Folder</span>
        </div>
      </div>

      {!projectFolderCollapsed && (
        <div className="panel-content">
          {!projectFolderHandle ? (
            <div className="empty-state">
              <FolderOpen size={48} className="empty-icon" />
              <p className="empty-message">No project folder open</p>
              <button className="open-folder-btn" onClick={handleOpenFolder}>
                Open Project Folder
              </button>
            </div>
          ) : (
            <div className="file-tree">
              <div className="folder-name">{projectFolderHandle.name}</div>
              {/* File tree will go here */}
              <div className="placeholder-text">File tree coming soon...</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProjectFolderPanel
