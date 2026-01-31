import { Folder, FolderOpen, ChevronRight, ChevronDown, FileJson, Box, PenTool, Flame, File as FileIcon } from 'lucide-react'
import { useState, RefObject, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import { readDirectoryRecursive, getFileIcon, FileTreeNode as BrowserFileNode } from '../../utils/projectFileUtils'
import { readDirectoryTauri, FileTreeNode as TauriFileNode, readProjectFile } from '../../utils/fileUtils'
import './ProjectFolderPanel.css'

// Unified type for rendering
type FileTreeNode = BrowserFileNode | TauriFileNode

// Helper functions to work with both node types
function isDirectory(node: FileTreeNode): boolean {
  if ('type' in node) return node.type === 'directory'
  if ('isDirectory' in node) return node.isDirectory
  return false
}

function getNodeFileType(node: FileTreeNode): string {
  if ('fileType' in node && node.fileType) return getFileIcon(node.fileType)
  if ('name' in node) {
    // Determine from extension for Tauri nodes
    const name = node.name.toLowerCase()
    if (name.endsWith('.json')) return 'file-json'
    if (name.endsWith('.stl') || name.endsWith('.vtk') || name.endsWith('.vtu')) return 'box'
    if (name.endsWith('.step') || name.endsWith('.stp') || name.endsWith('.iges') || name.endsWith('.igs')) return 'pen-tool'
    if (name.startsWith('reac_mod') || name.endsWith('.reac')) return 'flame'
  }
  return 'file'
}

// Get file type category for context menu actions
function getFileCategory(node: FileTreeNode): 'config' | 'mesh' | 'cad' | null {
  if ('fileType' in node) {
    // Browser node with explicit fileType
    if (node.fileType === 'config') return 'config'
    if (node.fileType === 'mesh') return 'mesh'
    if (node.fileType === 'cad') return 'cad'
    return null
  }
  
  // Tauri node - determine from extension
  if ('name' in node) {
    const name = node.name.toLowerCase()
    if (name.endsWith('.json')) return 'config'
    if (name.endsWith('.stl') || name.endsWith('.vtk') || name.endsWith('.vtu') || name.endsWith('.meshb')) return 'mesh'
    if (name.endsWith('.step') || name.endsWith('.stp') || name.endsWith('.iges') || name.endsWith('.igs') || name.endsWith('.csm')) return 'cad'
  }
  
  return null
}

interface ProjectFolderPanelProps {
  panelRef: RefObject<PanelImperativeHandle>
  onLoadConfig?: (fileHandle: FileSystemFileHandle) => Promise<void>
  onLoadMesh?: (fileHandle: FileSystemFileHandle) => Promise<void>
  onLoadCSM?: (fileHandle: FileSystemFileHandle) => Promise<void>
  onOpenProjectFolder?: () => Promise<void>
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  node: FileTreeNode | null
}

function ProjectFolderPanel({ panelRef, onLoadConfig, onLoadMesh, onLoadCSM, onOpenProjectFolder }: ProjectFolderPanelProps) {
  const {
    projectFolderHandle,
    projectFolderCollapsed,
    setProjectFolderCollapsed,
    openProjectFolder
  } = useAppStore()
  
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null
  })
  
  // Load file tree when folder is opened
  useEffect(() => {
    if (projectFolderHandle) {
      setLoading(true)
      
      // Check if we're in Tauri mode (projectFolderHandle is a string path)
      if (typeof projectFolderHandle === 'string') {
        // Tauri mode - use readDirectoryTauri
        readDirectoryTauri(projectFolderHandle)
          .then(tree => {
            setFileTree(tree)
            setLoading(false)
          })
          .catch(error => {
            console.error('Error reading directory (Tauri):', error)
            setLoading(false)
          })
      } else {
        // Browser mode - use FileSystemDirectoryHandle
        readDirectoryRecursive(projectFolderHandle)
          .then(tree => {
            setFileTree(tree)
            setLoading(false)
          })
          .catch(error => {
            console.error('Error reading directory (Browser):', error)
            setLoading(false)
          })
      }
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
    // Use the unified handler from App.tsx (works in both Tauri and Browser modes)
    if (onOpenProjectFolder) {
      await onOpenProjectFolder()
    } else {
      console.error('onOpenProjectFolder handler not provided')
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

  // Close context menu when clicking anywhere
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }))
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu.visible])

  const handleContextMenuAction = async (action: string, node: FileTreeNode) => {
    try {
      // Check if we're in Tauri mode (node has path but no handle)
      if ('path' in node && !('handle' in node)) {
        // Tauri mode - read file from path
        if (node.isDirectory) return
        
        const file = await readProjectFile(node.path)
        if (!file) {
          console.error(`Failed to read file: ${node.path}`)
          return
        }
        
        // Convert File to FileSystemFileHandle-like object for callbacks
        // This is a temporary workaround - ideally callbacks should accept File objects
        const fileHandle = {
          getFile: () => Promise.resolve(file),
          kind: 'file' as const,
          name: node.name
        } as any as FileSystemFileHandle
        
        switch (action) {
          case 'load-config':
            if (onLoadConfig) await onLoadConfig(fileHandle)
            break
          case 'load-mesh':
            if (onLoadMesh) await onLoadMesh(fileHandle)
            break
          case 'load-csm':
            if (onLoadCSM) await onLoadCSM(fileHandle)
            break
        }
      } else if ('handle' in node) {
        // Browser mode - use FileSystemHandle
        if (node.handle.kind !== 'file') return
        const fileHandle = node.handle as FileSystemFileHandle
        
        switch (action) {
          case 'load-config':
            if (onLoadConfig) await onLoadConfig(fileHandle)
            break
          case 'load-mesh':
            if (onLoadMesh) await onLoadMesh(fileHandle)
            break
          case 'load-csm':
            if (onLoadCSM) await onLoadCSM(fileHandle)
            break
        }
      }
    } catch (error) {
      console.error(`Error executing ${action} on ${node.name}:`, error)
    }
    
    setContextMenu({ visible: false, x: 0, y: 0, node: null })
  }

  const FileTreeNodeComponent = ({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) => {
    const [expanded, setExpanded] = useState(true)
    const iconName = getNodeFileType(node)
    const nodeIsDirectory = isDirectory(node)
    
    const handleContextMenu = (e: React.MouseEvent) => {
      if (nodeIsDirectory) return
      
      e.preventDefault()
      e.stopPropagation()
      
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        node
      })
    }
    
    return (
      <div className="file-tree-node" style={{ paddingLeft: `${depth * 12}px` }}>
        {nodeIsDirectory ? (
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
          <div 
            className="file-tree-item file" 
            onContextMenu={handleContextMenu}
            title={`Right-click for options`}
          >
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
      {/* Context Menu */}
      {contextMenu.visible && contextMenu.node && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 10000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {getFileCategory(contextMenu.node) === 'config' && (
            <div 
              className="context-menu-item"
              onClick={() => handleContextMenuAction('load-config', contextMenu.node!)}
            >
              Load Configuration
            </div>
          )}
          {getFileCategory(contextMenu.node) === 'mesh' && (
            <div 
              className="context-menu-item"
              onClick={() => handleContextMenuAction('load-mesh', contextMenu.node!)}
            >
              Load Mesh
            </div>
          )}
          {getFileCategory(contextMenu.node) === 'cad' && (
            <div 
              className="context-menu-item"
              onClick={() => handleContextMenuAction('load-csm', contextMenu.node!)}
            >
              Load Mesh via ESP
            </div>
          )}
        </div>
      )}
      
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
