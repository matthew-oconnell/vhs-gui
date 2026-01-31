/**
 * Utility functions for file operations
 */

import { stripJsonComments } from './jsonComments'
import { migrateConfigToFlatStructure, isOldFormat, migrateBCTypes } from './configMigration'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, readFile, readDir, BaseDirectory } from '@tauri-apps/plugin-fs'
import { useConsoleStore } from '../store/consoleStore'

/**
 * Check if running in Tauri environment
 */
export const isTauri = () => {
  // Check if we're in a Tauri context by looking for the __TAURI_INTERNALS__ object
  // This is more reliable than checking window.__TAURI__
  if (typeof window === 'undefined') return false
  
  // @ts-ignore - Tauri internal API
  const hasTauriInternals = '__TAURI_INTERNALS__' in window
  // @ts-ignore - Tauri API
  const hasTauriIPC = '__TAURI_IPC__' in window
  
  return hasTauriInternals || hasTauriIPC
}

/**
 * Helper to log to console panel
 */
const logToConsole = (message: string, level: 'info' | 'error' | 'debug' = 'debug') => {
  const { log } = useConsoleStore.getState()
  log('DEBUG', level, message)
}

/**
 * Log Tauri detection info on first call
 */
let hasLoggedTauriInfo = false
const logTauriDetection = () => {
  if (hasLoggedTauriInfo) return
  hasLoggedTauriInfo = true
  
  const checks = {
    // @ts-ignore
    '__TAURI_INTERNALS__': '__TAURI_INTERNALS__' in window,
    // @ts-ignore
    '__TAURI_IPC__': '__TAURI_IPC__' in window,
    // @ts-ignore
    '__TAURI__': '__TAURI__' in window,
  }
  
  logToConsole(`Tauri detection: ${JSON.stringify(checks)}`, 'debug')
  logToConsole(`isTauri() result: ${isTauri()}`, 'info')
}

/**
 * Saves data as a JSON file and prompts the user to select a save location
 * 
 * @param data The data to be saved as JSON
 * @param defaultFilename Default filename suggestion for the save dialog
 * @returns Promise that resolves when save is complete
 */
export const saveAsJson = async (data: any, defaultFilename: string = 'config.json'): Promise<void> => {
  try {
    logToConsole(`saveAsJson called, isTauri=${isTauri()}`, 'debug')
    
    // Ensure we're saving in the new flat format
    const dataToSave = isOldFormat(data) ? migrateConfigToFlatStructure(data) : data
    
    // Convert data to a formatted JSON string
    const jsonString = JSON.stringify(dataToSave, null, 2);
    
    if (isTauri()) {
      // Tauri mode - use native dialog and file system
      logToConsole('Using Tauri save dialog', 'info')
      const filePath = await save({
        defaultPath: defaultFilename,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      })
      
      logToConsole(`Save path selected: ${filePath}`, 'debug')
      
      if (filePath) {
        await writeTextFile(filePath, jsonString)
        logToConsole(`File saved successfully: ${filePath}`, 'info')
      } else {
        logToConsole('User cancelled save dialog', 'info')
      }
    } else {
      // Browser mode - use File System Access API
      logToConsole('Using browser File System Access API', 'debug')
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: defaultFilename,
        types: [
          {
            description: 'JSON Files',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      logToConsole(`File saved successfully: ${fileHandle.name}`, 'info')
    }
    
    return Promise.resolve();
  } catch (error) {
    // If user cancels the save dialog, this will catch the exception
    if ((error as Error).name !== 'AbortError') {
      logToConsole(`Error saving file: ${error}`, 'error')
    } else {
      logToConsole('User cancelled save dialog', 'info')
    }
    return Promise.reject(error);
  }
};

/**
 * Fallback method for browsers that don't support the File System Access API
 * Creates a download of the JSON data
 * 
 * @param data The data to be saved as JSON
 * @param filename Default filename for the download
 */
export const downloadJson = (data: any, filename: string = 'config.json'): void => {
  // Ensure we're saving in the new flat format
  const dataToSave = isOldFormat(data) ? migrateConfigToFlatStructure(data) : data
  
  // Convert data to a JSON string
  const jsonString = JSON.stringify(dataToSave, null, 2);
  
  // Create a Blob with the JSON data
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append the link to the body, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
};

/**
 * Save JSON data with browser detection for the best available method
 * 
 * @param data The data to be saved
 * @param filename Default filename suggestion
 * @returns Promise that resolves when save is complete
 */
export const saveJsonFile = async (data: any, filename: string = 'config.json'): Promise<void> => {
  try {
    // Check if the File System Access API is available
    if ('showSaveFilePicker' in window) {
      return saveAsJson(data, filename);
    } else {
      // Fallback for browsers that don't support the File System Access API
      downloadJson(data, filename);
      return Promise.resolve();
    }
  } catch (error) {
    console.error('Error saving file:', error);
    return Promise.reject(error);
  }
};

/**
 * Opens a file picker dialog and reads a JSON file
 * 
 * @returns Promise that resolves with the parsed JSON data, or null if user cancels
 * @throws Error if JSON parsing fails or file reading fails
 */
export const openJsonFile = async (): Promise<any> => {
  const result = await openJsonFileWithHandle()
  return result?.config ?? null
}

/**
 * Opens a file picker dialog and reads a JSON file, returning both the config and file handle
 * 
 * @returns Promise that resolves with { config, fileHandle }, or null if user cancels
 * @throws Error if JSON parsing fails or file reading fails
 */
export const openJsonFileWithHandle = async (): Promise<{ config: any; fileHandle: FileSystemFileHandle } | null> => {
  try {
    logTauriDetection()
    logToConsole(`openJsonFileWithHandle called, isTauri=${isTauri()}`, 'debug')
    
    if (isTauri()) {
      // Tauri mode - use native dialog
      logToConsole('Using Tauri dialog API', 'info')
      const filePath = await open({
        multiple: false,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      })
      
      logToConsole(`Selected file path: ${filePath}`, 'debug')
      
      if (filePath && typeof filePath === 'string') {
        const text = await readTextFile(filePath)
        const cleanedText = stripJsonComments(text)
        const rawConfig = JSON.parse(cleanedText)
        
        let config = rawConfig
        if (isOldFormat(config)) {
          logToConsole('Detected old config format - auto-migrating to flat structure', 'info')
          config = migrateConfigToFlatStructure(config)
        }
        
        // Also check if BC types need migration
        config = migrateBCTypes(config)
        
        logToConsole(`File loaded successfully: ${filePath}`, 'info')
        // Return config with null fileHandle (not supported in Tauri yet)
        return { config, fileHandle: null as any }
      }
      
      logToConsole('User cancelled file picker', 'info')
      return null
    } else {
      // Browser mode - use File System Access API
      logToConsole('Using browser File System Access API', 'debug')
      if (!('showOpenFilePicker' in window)) {
        throw new Error('File System Access API is not supported in this browser');
      }

      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'JSON Files',
            accept: {
              'application/json': ['.json']
            }
          }
        ]
      });

      const file = await fileHandle.getFile();
      const text = await file.text();
      const cleanedText = stripJsonComments(text);
      const rawConfig = JSON.parse(cleanedText);
      
      let config = rawConfig
      if (isOldFormat(config)) {
        logToConsole('Detected old config format - auto-migrating to flat structure', 'info')
        config = migrateConfigToFlatStructure(config)
      }
      
      config = migrateBCTypes(config)
      
      logToConsole(`File loaded successfully: ${fileHandle.name}`, 'info')
      return { config, fileHandle }
    }
  } catch (error) {
    // If user cancels the file picker, return null instead of throwing
    if ((error as Error).name === 'AbortError') {
      logToConsole('User cancelled file picker', 'info')
      return null;
    }
    
    // Re-throw other errors (parsing errors, file read errors, etc.)
    logToConsole(`Error opening file: ${error}`, 'error')
    throw error;
  }
};

/**
 * Prompts user to select a directory and returns the directory handle
 * This is used to get access to the directory containing the config file
 * so we can automatically load mesh files from the same directory
 * 
 * @returns Promise that resolves with directory handle, or null if user cancels
 * @throws Error if Directory Picker API not supported
 */
export const promptForDirectoryAccess = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    // Check if the Directory Picker API is available
    if (!('showDirectoryPicker' in window)) {
      throw new Error('Directory Picker API is not supported in this browser');
    }

    // Prompt user to select the directory
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'read' // We only need read access
    });

    return directoryHandle;
  } catch (error) {
    // If user cancels, return null
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    
    // Re-throw other errors
    throw error;
  }
};

/**
 * Opens a file picker dialog and reads a JSON file, also returning directory handle
 * 
 * @returns Promise that resolves with config and directory handle, or null if user cancels
 * @throws Error if JSON parsing fails or file reading fails
 */
/**
 * Opens JSON file and returns config with directory info (path for Tauri, handle for browser)
 * This allows auto-loading mesh/CSM files from the same directory as the config
 */
export const openJsonFileWithDirectory = async (): Promise<{ 
  config: any
  directoryPath?: string  // Tauri mode
  directoryHandle?: FileSystemDirectoryHandle  // Browser mode
} | null> => {
  try {
    logTauriDetection()
    
    if (isTauri()) {
      // Tauri mode - get file path and extract directory
      const filePath = await open({
        multiple: false,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      })
      
      if (filePath && typeof filePath === 'string') {
        const text = await readTextFile(filePath)
        const cleanedText = stripJsonComments(text)
        let config = JSON.parse(cleanedText)
        
        if (isOldFormat(config)) {
          logToConsole('Detected old config format - auto-migrating', 'info')
          config = migrateConfigToFlatStructure(config)
        }
        
        config = migrateBCTypes(config)
        
        // Extract directory path (e.g., "/home/user/project/" from "/home/user/project/config.json")
        const directoryPath = filePath.substring(0, filePath.lastIndexOf('/') + 1)
        
        logToConsole(`File loaded from: ${filePath}`, 'info')
        logToConsole(`Directory path: ${directoryPath}`, 'debug')
        
        return { config, directoryPath }
      }
      
      return null
    } else {
      // Browser mode - get file and directory handle
      if (!('showOpenFilePicker' in window)) {
        throw new Error('File System Access API is not supported in this browser')
      }

      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      })

      const file = await fileHandle.getFile()
      const text = await file.text()
      const cleanedText = stripJsonComments(text)
      const config = JSON.parse(cleanedText)
      
      let directoryHandle: FileSystemDirectoryHandle | null = null
      
      // Try to get parent directory (non-standard but works in some browsers)
      if ('getParent' in fileHandle && typeof (fileHandle as any).getParent === 'function') {
        try {
          directoryHandle = await (fileHandle as any).getParent()
        } catch (e) {
          console.warn('Could not get parent directory:', e)
        }
      }
      
      // Fallback: use directory picker if parent access failed
      if (!directoryHandle) {
        logToConsole('Could not auto-detect directory. User will be prompted if needed.', 'debug')
        // Return config without directory handle - will prompt later if needed
        return { config, directoryHandle: undefined }
      }
      
      logToConsole(`Config loaded with directory handle`, 'info')
      return { config, directoryHandle }
    }
  } catch (error) {
    // If user cancels the file picker, return null instead of throwing
    if ((error as Error).name === 'AbortError') {
      return null
    }
    
    // Re-throw other errors (parsing errors, file read errors, etc.)
    throw error
  }
}

/**
 * Open file picker for CAD files (STEP, IGES, EGADS)
 * Supports both Tauri and browser environments
 * 
 * @param suggestedName - Optional suggested filename
 * @returns File object or null if cancelled
 */
export const openCadFile = async (suggestedName?: string): Promise<File | null> => {
  logTauriDetection()
  
  try {
    if (isTauri()) {
      // Tauri mode - use native file picker
      logToConsole('Using Tauri native file picker for CAD files', 'debug')
      
      const filters = [
        { name: 'STEP Files', extensions: ['stp', 'step'] },
        { name: 'IGES Files', extensions: ['igs', 'iges'] },
        { name: 'EGADS Files', extensions: ['egads'] },
        { name: 'All Files', extensions: ['*'] }
      ]
      
      const filePath = await open({
        title: suggestedName ? `Select ${suggestedName}` : 'Select CAD File',
        filters,
        multiple: false
      })
      
      if (filePath) {
        // Read as binary for STEP, IGES, EGADS files
        const content = await readFile(filePath as string)
        // Create a File-like object for compatibility
        const fileName = (filePath as string).split('/').pop() || 'file'
        const blob = new Blob([content], { type: 'application/octet-stream' })
        const file = new File([blob], fileName, { type: 'application/octet-stream' })
        
        logToConsole(`CAD file loaded: ${fileName}`, 'info')
        return file
      }
      
      logToConsole('User cancelled CAD file picker', 'info')
      return null
    } else {
      // Browser mode - use File System Access API
      logToConsole('Using browser File System Access API for CAD files', 'debug')
      
      const options: any = {
        types: [{
          description: suggestedName ? `CAD File: ${suggestedName}` : 'CAD Files',
          accept: { 
            'application/stp': ['.stp', '.step'],
            'application/iges': ['.igs', '.iges'],
            'application/octet-stream': ['.egads'],
            '*/*': []
          }
        }],
        multiple: false
      }
      
      if (suggestedName) {
        options.suggestedName = suggestedName
      }
      
      const [fileHandle] = await window.showOpenFilePicker(options)
      const file = await fileHandle.getFile()
      
      logToConsole(`CAD file loaded: ${file.name}`, 'info')
      return file
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logToConsole('User cancelled CAD file picker', 'info')
      return null
    }
    
    logToConsole(`Error opening CAD file: ${error}`, 'error')
    throw error
  }
}

/**
 * Open file picker for CSM files
 * Supports both Tauri and browser environments
 * 
 * @returns File object or null if cancelled
 */
export const openCsmFile = async (): Promise<File | null> => {
  logTauriDetection()
  
  try {
    if (isTauri()) {
      // Tauri mode - use native file picker
      logToConsole('Using Tauri native file picker for CSM files', 'debug')
      
      const filePath = await open({
        title: 'Select CSM File',
        filters: [{ name: 'CSM Files', extensions: ['csm'] }],
        multiple: false
      })
      
      if (filePath) {
        // CSM files can contain binary data, read as binary
        const content = await readFile(filePath as string)
        const fileName = (filePath as string).split('/').pop() || 'file.csm'
        const blob = new Blob([content], { type: 'application/octet-stream' })
        const file = new File([blob], fileName, { type: 'application/octet-stream' })
        
        logToConsole(`CSM file loaded: ${fileName}`, 'info')
        return file
      }
      
      logToConsole('User cancelled CSM file picker', 'info')
      return null
    } else {
      // Browser mode - use File System Access API
      logToConsole('Using browser File System Access API for CSM files', 'debug')
      
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'CSM Files',
          accept: { 'application/octet-stream': ['.csm'] }
        }]
      })
      
      const file = await fileHandle.getFile()
      logToConsole(`CSM file loaded: ${file.name}`, 'info')
      return file
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logToConsole('User cancelled CSM file picker', 'info')
      return null
    }
    
    logToConsole(`Error opening CSM file: ${error}`, 'error')
    throw error
  }
}

/**
 * Open file picker for mesh files (.stl, .obj, .meshb, .egads, .csm)
 * Supports both Tauri and browser environments
 * 
 * @returns File object or null if cancelled
 */
export const openMeshFile = async (): Promise<File | null> => {
  logTauriDetection()
  
  try {
    if (isTauri()) {
      // Tauri mode - use native file picker
      logToConsole('Using Tauri native file picker for mesh files', 'debug')
      
      const filePath = await open({
        title: 'Select Mesh File',
        filters: [
          { name: 'Mesh Files', extensions: ['stl', 'obj', 'meshb', 'egads', 'csm'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        multiple: false
      })
      
      if (filePath) {
        // Read as binary for proper STL, OBJ, MESHB handling
        const content = await readFile(filePath as string)
        const fileName = (filePath as string).split('/').pop() || 'mesh'
        const blob = new Blob([content], { type: 'application/octet-stream' })
        const file = new File([blob], fileName, { type: 'application/octet-stream' })
        
        logToConsole(`Mesh file loaded: ${fileName}`, 'info')
        return file
      }
      
      logToConsole('User cancelled mesh file picker', 'info')
      return null
    } else {
      // Browser mode - use input element for better compatibility
      logToConsole('Using browser file input for mesh files', 'debug')
      
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.stl,.obj,.meshb,.egads,.csm'
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file) {
            logToConsole(`Mesh file selected: ${file.name}`, 'info')
            resolve(file)
          } else {
            logToConsole('No mesh file selected', 'info')
            resolve(null)
          }
        }
        
        input.oncancel = () => {
          logToConsole('Mesh file picker cancelled', 'info')
          resolve(null)
        }
        
        input.click()
      })
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logToConsole('User cancelled mesh file picker', 'info')
      return null
    }
    
    logToConsole(`Error opening mesh file: ${error}`, 'error')
    throw error
  }
}

/**
 * Open directory picker for project folders
 * Supports both Tauri and browser environments
 * 
 * @returns Directory path (Tauri) or FileSystemDirectoryHandle (browser), or null if cancelled
 */
export const openProjectFolder = async (): Promise<string | FileSystemDirectoryHandle | null> => {
  logTauriDetection()
  
  try {
    if (isTauri()) {
      // Tauri mode - use native directory picker
      logToConsole('Using Tauri native directory picker', 'debug')
      
      const dirPath = await open({
        title: 'Select Project Folder',
        directory: true,
        multiple: false
      })
      
      if (dirPath && typeof dirPath === 'string') {
        logToConsole(`Project folder selected: ${dirPath}`, 'info')
        return dirPath
      }
      
      logToConsole('User cancelled directory picker', 'info')
      return null
    } else {
      // Browser mode - use File System Access API
      logToConsole('Using browser directory picker', 'debug')
      
      if (!('showDirectoryPicker' in window)) {
        throw new Error('Directory Picker API is not supported in this browser')
      }
      
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      })
      
      logToConsole(`Project folder selected: ${dirHandle.name}`, 'info')
      return dirHandle
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logToConsole('User cancelled directory picker', 'info')
      return null
    }
    
    logToConsole(`Error opening directory: ${error}`, 'error')
    throw error
  }
}

/**
 * File tree node structure for displaying directory contents
 */
export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle  // For browser mode compatibility
}

/**
 * Read directory contents recursively (Tauri version)
 * @param dirPath Absolute directory path
 * @returns Array of file tree nodes
 */
export const readDirectoryTauri = async (dirPath: string): Promise<FileTreeNode[]> => {
  try {
    const entries = await readDir(dirPath)
    const nodes: FileTreeNode[] = []
    
    for (const entry of entries) {
      const fullPath = `${dirPath}/${entry.name}`
      const node: FileTreeNode = {
        name: entry.name || '',
        path: fullPath,
        isDirectory: entry.isDirectory || false
      }
      
      if (node.isDirectory) {
        // Recursively read subdirectories
        node.children = await readDirectoryTauri(fullPath)
      }
      
      nodes.push(node)
    }
    
    // Sort: directories first, then files, alphabetically
    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    logToConsole(`Error reading directory ${dirPath}: ${error}`, 'error')
    return []
  }
}

/**
 * Read a file from the project folder (Tauri version)
 * @param filePath Absolute file path
 * @returns File object
 */
export const readProjectFile = async (filePath: string): Promise<File | null> => {
  try {
    if (isTauri()) {
      const fileName = filePath.split('/').pop() || 'file'
      const ext = fileName.split('.').pop()?.toLowerCase() || ''
      
      // Determine if file should be read as binary or text
      const binaryExtensions = ['stl', 'obj', 'meshb', 'step', 'stp', 'iges', 'igs', 'egads']
      const isBinary = binaryExtensions.includes(ext)
      
      let content: Uint8Array | string
      if (isBinary) {
        // Read as binary for mesh and CAD files
        content = await readFile(filePath)
      } else {
        // Read as text for JSON, CSM text files
        content = await readTextFile(filePath)
      }
      
      const blob = new Blob([content], { type: 'application/octet-stream' })
      return new File([blob], fileName, { type: 'application/octet-stream' })
    } else {
      // Browser mode would use FileSystemFileHandle
      throw new Error('readProjectFile only works in Tauri mode')
    }
  } catch (error) {
    logToConsole(`Error reading file ${filePath}: ${error}`, 'error')
    return null
  }
}