import { Folder, FolderOpen, ChevronRight, ChevronDown, FileJson, Box, PenTool, Flame, File as FileIcon } from 'lucide-react'
import { useState, RefObject, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import { readDirectoryRecursive, getFileIcon, FileTreeNode } from '../../utils/projectFileUtils'
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
  
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  
  // Load file tree when folder is opened
  useEffect(() => {
    if (projectFolderHandle) {
      setLoading(true)
      readDirectoryRecursive(projectFolderHandle)
        .then(tree => {
          setFileTree(tree)
          setLoading(false)
        })
        .catch(error => {
          console.error('Error reading directory:', error)
          setLoading(false)
        })
    } else {
      setFileTree([])
    }
  }, [projectFolderHandle])

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

  const renderIcon = (iconName: string, size = 16) => {
    const props = { size, className: 'file-icon' }
    switch (iconName) {
      case 'file-json':
        return <FileJson {...props} />
      case 'box':
        return <Box {...props} />
      case 'pen-tool':
        return <PenTool {...props} />
      case 'flame':
        return <Flame {...props} />
      case 'folder':
        return <Folder {...props} />
      default:
        return <FileIcon {...props} />
    }
  }

  const FileTreeNodeComponent = ({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) => {
    const [expanded, setExpanded] = useState(true)
    const iconName = node.fileType ? getFileIcon(node.fileType) : 'file'
    
    return (
      <div className="file-tree-node" style={{ paddingLeft: `${depth * 12}px` }}>
        {node.type === 'directory' ? (
          <>
            <div 
              className="file-tree-item directory" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {renderIcon(iconName)}
              <span className="file-name">{node.name}</span>
            </div>
            {expanded && node.children && node.children.map((child, idx) => (
              <FileTreeNodeComponent key={`${child.name}-${idx}`} node={child} depth={depth + 1} />
            ))}
          </>
        ) : (
          <div className="file-tree-item file">
            <span className="indent" />
            {renderIcon(iconName)}
            <span className="file-name">{node.name}</span>
          </div>
        )}
      </div>
    )
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
              {loading ? (
                <div className="loading-tree">Loading...</div>
              ) : fileTree.length > 0 ? (
                fileTree.map((node, idx) => (
                  <FileTreeNodeComponent key={`${node.name}-${idx}`} node={node} />
                ))
              ) : (
                <div className="empty-tree">No files found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProjectFolderPanel
