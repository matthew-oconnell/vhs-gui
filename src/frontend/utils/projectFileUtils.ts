/**
 * Utilities for working with project folder file trees
 */

export type FileType = 'config' | 'mesh' | 'cad' | 'reaction' | 'folder' | 'unknown'

export interface FileTreeNode {
  name: string
  type: 'file' | 'directory'
  fileType?: FileType
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
  children?: FileTreeNode[]
}

/**
 * Determine file type from filename/extension
 */
export function getFileType(filename: string): FileType {
  const lower = filename.toLowerCase()
  
  // JSON config files
  if (lower.endsWith('.json')) {
    return 'config'
  }
  
  // Mesh files
  if (lower.endsWith('.obj') || lower.endsWith('.stl') || lower.endsWith('.meshb')) {
    return 'mesh'
  }
  
  // CAD files
  if (lower.endsWith('.csm') || lower.endsWith('.stp') || lower.endsWith('.step')) {
    return 'cad'
  }
  
  // Reaction model files (pattern: reac_mod.*)
  if (lower.includes('reac_mod.')) {
    return 'reaction'
  }
  
  return 'unknown'
}

/**
 * Get icon name for a file type (lucide-react icon names)
 */
export function getFileIcon(fileType: FileType): string {
  switch (fileType) {
    case 'config':
      return 'file-json'
    case 'mesh':
      return 'box'
    case 'cad':
      return 'pen-tool'
    case 'reaction':
      return 'flame'
    case 'folder':
      return 'folder'
    default:
      return 'file'
  }
}

/**
 * Recursively read directory structure and build file tree
 */
export async function readDirectoryRecursive(
  directoryHandle: FileSystemDirectoryHandle
): Promise<FileTreeNode[]> {
  const nodes: FileTreeNode[] = []
  
  // Iterate through directory entries
  for await (const [name, handle] of directoryHandle) {
    if (handle.kind === 'file') {
      nodes.push({
        name,
        type: 'file',
        fileType: getFileType(name),
        handle,
      })
    } else if (handle.kind === 'directory') {
      // Recursively read subdirectory
      const children = await readDirectoryRecursive(handle)
      nodes.push({
        name,
        type: 'directory',
        fileType: 'folder',
        handle,
        children,
      })
    }
  }
  
  // Sort alphabetically (directories first, then files)
  nodes.sort((a, b) => {
    // Directories come before files
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    // Then alphabetically by name
    return a.name.localeCompare(b.name)
  })
  
  return nodes
}
