import { Folder, FolderOpen, FolderPlus, ChevronRight, ChevronDown, FileJson, Box, PenTool, Flame, File as FileIcon } from 'lucide-react'
import { useState, RefObject, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import { readDirectoryRecursive, getFileIcon, FileTreeNode } from '../../utils/projectFileUtils'
import './ProjectFolderPanel.css'

interface ProjectFolderPanelProps {
  panelRef: RefObject<PanelImperativeHandle>
  onLoadConfig?: (fileHandle: FileSystemFileHandle, parentDir?: FileSystemDirectoryHandle) => Promise<void>
  onLoadMesh?: (fileHandle: FileSystemFileHandle) => Promise<void>
  onLoadCSM?: (fileHandle: FileSystemFileHandle, parentDir?: FileSystemDirectoryHandle) => Promise<void>
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  node: FileTreeNode | null
}

function ProjectFolderPanel({ panelRef, onLoadConfig, onLoadMesh, onLoadCSM }: ProjectFolderPanelProps) {
  const {
    projectFolderHandle,
    projectFolderCollapsed,
    setProjectFolderCollapsed,
    openProjectFolder,
    refreshProjectFolderTrigger
  } = useAppStore()
  
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<FileTreeNode>>(new Set())
  const [lastClickedFile, setLastClickedFile] = useState<FileTreeNode | null>(null)
  const [dragOverNode, setDragOverNode] = useState<FileTreeNode | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null
  })

  // Refresh file tree function
  const refreshFileTree = async () => {
    if (projectFolderHandle && !loading) {
      try {
        const tree = await readDirectoryRecursive(projectFolderHandle)
        setFileTree(tree)
      } catch (error) {
        console.error('Error refreshing directory:', error)
      }
    }
  }

  // Get unique path for a folder (for tracking expanded state)
  const getFolderPath = (node: FileTreeNode, parentPath = ''): string => {
    return parentPath ? `${parentPath}/${node.name}` : node.name
  }

  // Toggle folder expanded state
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }
  
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

  // Periodic refresh (every 3 seconds when folder is open)
  useEffect(() => {
    if (!projectFolderHandle) return
    
    const interval = setInterval(() => {
      refreshFileTree()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [projectFolderHandle])

  // Manual refresh trigger
  useEffect(() => {
    if (refreshProjectFolderTrigger > 0) {
      refreshFileTree()
    }
  }, [refreshProjectFolderTrigger])

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
      switch (action) {
        case 'load-config':
          if (node.handle.kind === 'file' && onLoadConfig) {
            await onLoadConfig(node.handle as FileSystemFileHandle, node.parent)
          }
          break
        case 'load-mesh':
          if (node.handle.kind === 'file' && onLoadMesh) {
            await onLoadMesh(node.handle as FileSystemFileHandle)
          }
          break
        case 'load-csm':
          if (node.handle.kind === 'file' && onLoadCSM) {
            await onLoadCSM(node.handle as FileSystemFileHandle, node.parent)
          }
          break
        case 'delete':
          await handleDeleteFile(node)
          break
        case 'delete-folder':
          await handleDeleteFolder(node)
          break
        case 'create-folder':
          await handleCreateFolder(node)
          break
      }
    } catch (error) {
      console.error(`Error executing ${action} on ${node.name}:`, error)
    }
    
    setContextMenu({ visible: false, x: 0, y: 0, node: null })
  }

  const handleCreateFolder = async (parentNode?: FileTreeNode) => {
    if (!projectFolderHandle) return
    
    const folderName = prompt('Enter folder name:')
    if (!folderName || folderName.trim() === '') return
    
    // Validate folder name (no special characters)
    if (!/^[a-zA-Z0-9_\-\. ]+$/.test(folderName)) {
      alert('Folder name can only contain letters, numbers, spaces, dashes, underscores, and periods.')
      return
    }
    
    try {
      // Get the parent directory (either selected folder or root)
      const parentDir = parentNode?.type === 'directory' 
        ? (parentNode.handle as FileSystemDirectoryHandle)
        : projectFolderHandle
      
      // Create the new directory
      await parentDir.getDirectoryHandle(folderName, { create: true })
      
      // Refresh the file tree
      setLoading(true)
      const tree = await readDirectoryRecursive(projectFolderHandle)
      setFileTree(tree)
      setLoading(false)
    } catch (error) {
      console.error('Error creating folder:', error)
      alert(`Failed to create folder: ${(error as Error).message}`)
    }
  }

  const handleDeleteFile = async (node: FileTreeNode) => {
    if (!projectFolderHandle) return
    
    // Determine which files to delete
    const filesToDelete = selectedFiles.size > 0 && selectedFiles.has(node) 
      ? Array.from(selectedFiles).filter(n => n.handle.kind === 'file')
      : node.handle.kind === 'file' ? [node] : []
    
    if (filesToDelete.length === 0) return
    
    const fileNames = filesToDelete.map(f => f.name).join('\n  • ')
    const confirmed = confirm(
      `Are you sure you want to delete ${filesToDelete.length} file(s)?\n\n  • ${fileNames}\n\nThis action cannot be undone.`
    )
    if (!confirmed) return
    
    try {
      // Delete all selected files
      for (const file of filesToDelete) {
        if (file.parent) {
          await file.parent.removeEntry(file.name, { recursive: false })
        } else {
          await projectFolderHandle.removeEntry(file.name, { recursive: false })
        }
      }
      
      // Clear selection and refresh
      setSelectedFiles(new Set())
      setLastClickedFile(null)
      setLoading(true)
      const tree = await readDirectoryRecursive(projectFolderHandle)
      setFileTree(tree)
      setLoading(false)
    } catch (error) {
      console.error('Error deleting files:', error)
      alert(`Failed to delete files: ${(error as Error).message}`)
    }
  }

  const handleDeleteFolder = async (node: FileTreeNode) => {
    if (!projectFolderHandle || node.type !== 'directory') return
    
    const confirmed = confirm(
      `Are you sure you want to delete the folder "${node.name}" and all its contents?\n\nThis action cannot be undone.`
    )
    if (!confirmed) return
    
    try {
      // Use the parent directory handle to remove the folder recursively
      if (node.parent) {
        await node.parent.removeEntry(node.name, { recursive: true })
      } else {
        // Fallback to root directory if no parent stored
        await projectFolderHandle.removeEntry(node.name, { recursive: true })
      }
      
      // Clear selection and refresh
      setSelectedFiles(new Set())
      setLastClickedFile(null)
      setLoading(true)
      const tree = await readDirectoryRecursive(projectFolderHandle)
      setFileTree(tree)
      setLoading(false)
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert(`Failed to delete folder: ${(error as Error).message}`)
    }
  }

  const handleFileClick = (node: FileTreeNode, e: React.MouseEvent) => {
    if (node.type === 'directory') return
    
    e.stopPropagation()
    
    if (e.shiftKey && lastClickedFile) {
      // Shift-click: select range
      const allFiles = getAllFiles(fileTree)
      const startIdx = allFiles.indexOf(lastClickedFile)
      const endIdx = allFiles.indexOf(node)
      
      if (startIdx !== -1 && endIdx !== -1) {
        const [start, end] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const rangeFiles = allFiles.slice(start, end + 1)
        setSelectedFiles(new Set(rangeFiles))
      }
    } else if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl-click: toggle selection
      const newSelection = new Set(selectedFiles)
      if (newSelection.has(node)) {
        newSelection.delete(node)
      } else {
        newSelection.add(node)
      }
      setSelectedFiles(newSelection)
      setLastClickedFile(node)
    } else {
      // Regular click: select only this file
      setSelectedFiles(new Set([node]))
      setLastClickedFile(node)
    }
  }

  const getAllFiles = (nodes: FileTreeNode[]): FileTreeNode[] => {
    const files: FileTreeNode[] = []
    for (const node of nodes) {
      if (node.type === 'file') {
        files.push(node)
      }
      if (node.children) {
        files.push(...getAllFiles(node.children))
      }
    }
    return files
  }

  const handleDragStart = (node: FileTreeNode, e: React.DragEvent) => {
    if (node.type === 'directory') return
    
    // If dragging a selected file, drag all selected files
    const filesToDrag = selectedFiles.has(node) ? Array.from(selectedFiles) : [node]
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(filesToDrag.map(f => f.name)))
  }

  const handleDragOver = (node: FileTreeNode, e: React.DragEvent) => {
    if (node.type !== 'directory') return
    
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverNode(node)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation()
    setDragOverNode(null)
  }

  const handleDrop = async (targetNode: FileTreeNode, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverNode(null)
    
    if (targetNode.type !== 'directory' || !projectFolderHandle) return
    
    const targetDir = targetNode.handle as FileSystemDirectoryHandle
    
    // Get the files to move
    const filesToMove = selectedFiles.size > 0 ? Array.from(selectedFiles) : []
    if (filesToMove.length === 0) return
    
    try {
      for (const fileNode of filesToMove) {
        if (fileNode.type !== 'file' || !fileNode.parent) continue
        
        const fileHandle = fileNode.handle as FileSystemFileHandle
        const file = await fileHandle.getFile()
        
        // Create new file in target directory
        const newFileHandle = await targetDir.getFileHandle(fileNode.name, { create: true })
        const writable = await newFileHandle.createWritable()
        await writable.write(file)
        await writable.close()
        
        // Delete original file
        await fileNode.parent.removeEntry(fileNode.name)
      }
      
      // Clear selection and refresh
      setSelectedFiles(new Set())
      setLastClickedFile(null)
      setLoading(true)
      const tree = await readDirectoryRecursive(projectFolderHandle)
      setFileTree(tree)
      setLoading(false)
    } catch (error) {
      console.error('Error moving files:', error)
      alert(`Failed to move files: ${(error as Error).message}`)
    }
  }

  const FileTreeNodeComponent = ({ node, depth = 0, parentPath = '' }: { node: FileTreeNode; depth?: number; parentPath?: string }) => {
    const folderPath = getFolderPath(node, parentPath)
    const expanded = expandedFolders.has(folderPath)
    const iconName = node.fileType ? getFileIcon(node.fileType) : 'file'
    const isSelected = selectedFiles.has(node)
    const isDragOver = dragOverNode === node
    
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      // If right-clicking on a non-selected file, select only it
      if (node.type === 'file' && !selectedFiles.has(node)) {
        setSelectedFiles(new Set([node]))
        setLastClickedFile(node)
      }
      
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        node
      })
    }
    
    return (
      <div className="file-tree-node" style={{ paddingLeft: `${depth * 12}px` }}>
        {node.type === 'directory' ? (
          <>
            <div 
              className={`file-tree-item directory ${isDragOver ? 'drag-over' : ''}`}
              onClick={() => toggleFolder(folderPath)}
              onContextMenu={handleContextMenu}
              onDragOver={(e) => handleDragOver(node, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(node, e)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {renderIcon(iconName)}
              <span className="file-name">{node.name}</span>
            </div>
            {expanded && node.children && node.children.map((child, idx) => (
              <FileTreeNodeComponent key={`${child.name}-${idx}`} node={child} depth={depth + 1} parentPath={folderPath} />
            ))}
          </>
        ) : (
          <div 
            className={`file-tree-item file ${isSelected ? 'selected' : ''}`}
            onClick={(e) => handleFileClick(node, e)}
            onContextMenu={handleContextMenu}
            draggable={true}
            onDragStart={(e) => handleDragStart(node, e)}
            title={`Click to select, Shift+Click for range, Cmd/Ctrl+Click to toggle`}
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
          {contextMenu.node.type === 'directory' ? (
            // Directory context menu
            <>
              <div 
                className="context-menu-item"
                onClick={() => handleContextMenuAction('create-folder', contextMenu.node!)}
              >
                New Folder
              </div>
              <div className="context-menu-separator"></div>
              <div 
                className="context-menu-item context-menu-item-danger"
                onClick={() => handleContextMenuAction('delete-folder', contextMenu.node!)}
              >
                Delete Folder
              </div>
            </>
          ) : (
            // File context menu
            <>
              {contextMenu.node.fileType === 'config' && (
                <div 
                  className="context-menu-item"
                  onClick={() => handleContextMenuAction('load-config', contextMenu.node!)}
                >
                  Load Configuration
                </div>
              )}
              {contextMenu.node.fileType === 'mesh' && (
                <div 
                  className="context-menu-item"
                  onClick={() => handleContextMenuAction('load-mesh', contextMenu.node!)}
                >
                  Load Mesh
                </div>
              )}
              {contextMenu.node.fileType === 'cad' && (
                <div 
                  className="context-menu-item"
                  onClick={() => handleContextMenuAction('load-csm', contextMenu.node!)}
                >
                  Load Mesh via ESP
                </div>
              )}
              <div className="context-menu-separator"></div>
              <div 
                className="context-menu-item context-menu-item-danger"
                onClick={() => handleContextMenuAction('delete', contextMenu.node!)}
              >
                {selectedFiles.size > 1 ? `Delete ${selectedFiles.size} Files` : 'Delete File'}
              </div>
            </>
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
              <div className="folder-name-container">
                <div className="folder-name">{projectFolderHandle.name}</div>
                <button 
                  className="new-folder-btn"
                  onClick={() => handleCreateFolder()}
                  title="Create new folder in root"
                >
                  <FolderPlus size={14} />
                </button>
              </div>
              {selectedFiles.size > 0 && (
                <div className="selection-status">
                  {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} selected
                </div>
              )}
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
