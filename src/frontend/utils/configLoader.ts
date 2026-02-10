/**
 * Utility functions for loading configurations with mesh auto-loading
 */

/**
 * Load config and automatically load mesh if config specifies one
 * 
 * @param config - The loaded configuration object
 * @param loadMeshByName - Function to call to load mesh by filename
 * @returns The configuration object
 */
export const loadConfigWithMesh = async (
  config: any,
  loadMeshByName: (filename: string) => Promise<void>
): Promise<any> => {
  // Check if config has a mesh filename
  const meshFilename = config['mesh filename']
  
  // Handle empty or missing mesh filename
  if (!meshFilename) {
    return config
  }
  
  // Get the actual filename string (handle array or string)
  let filename: string
  if (Array.isArray(meshFilename)) {
    // If array, use first item
    if (meshFilename.length === 0) {
      return config
    }
    filename = meshFilename[0]
  } else {
    filename = meshFilename
  }
  
  // Don't load for empty strings
  if (filename === '') {
    return config
  }
  
  // Automatically load the mesh
  await loadMeshByName(filename)
  
  return config
}

/**
 * Process a loaded configuration - handles mesh auto-loading for both browser and Tauri modes
 * 
 * This is the SINGLE implementation for "what to do with a config once we have it",
 * regardless of whether it came from File → Open or right-click load.
 * 
 * @param config - The loaded configuration object
 * @param context - Context for loading (Tauri vs Browser mode, callbacks, etc.)
 * @returns Result indicating if mesh was loaded, if lump dialog was shown, etc.
 */
export interface ProcessConfigContext {
  isTauri: boolean
  projectFolderHandle?: string | FileSystemDirectoryHandle | null
  
  // Directory where config file was loaded from (for auto-loading mesh/CSM)
  configDirectoryPath?: string  // Tauri: file path like "/home/user/project/"
  configDirectoryHandle?: FileSystemDirectoryHandle  // Browser: directory handle
  
  // Callbacks for different mesh loading scenarios
  onLoadCSM: (file: File) => Promise<void>
  onLoadMesh: (parsedMesh: any, filename: string, lump: boolean) => void
  onParseMesh: (file: File) => Promise<any>
  onShowLumpDialog: (config: any, parsedMesh: any, filename: string) => void
  onTransformAndSetConfig: (config: any) => void
  onLog: (category: string, level: string, message: string) => void
  
  // Utility functions
  readProjectFile?: (path: string) => Promise<File | null>
  promptForDirectory?: () => Promise<FileSystemDirectoryHandle | null>
}

export interface ProcessConfigResult {
  meshLoaded: boolean
  showedLumpDialog: boolean
}

export const processLoadedConfig = async (
  config: any,
  context: ProcessConfigContext
): Promise<ProcessConfigResult> => {
  const meshFilename = config['mesh filename']
  let meshLoaded = false
  let showedLumpDialog = false
  
  if (!meshFilename) {
    // No mesh to load - just set config
    context.onTransformAndSetConfig(config)
    return { meshLoaded: false, showedLumpDialog: false }
  }
  
  const filename = typeof meshFilename === 'string' ? meshFilename : meshFilename[0]
  
  console.log(`[Debug] Config references mesh: "${filename}"`)
  console.log(`[Debug] Config directory path:`, context.configDirectoryPath)
  console.log(`[Debug] Config directory handle:`, context.configDirectoryHandle)
  console.log(`[Debug] Project folder handle:`, context.projectFolderHandle)
  console.log(`[Debug] Is Tauri:`, context.isTauri)
  
  if (context.isTauri) {
    // TAURI MODE: Load from config directory (if available) or project folder
    const directoryPath = context.configDirectoryPath || (typeof context.projectFolderHandle === 'string' ? context.projectFolderHandle : null)
    
    if (directoryPath && context.readProjectFile) {
      console.log(`[Debug] Auto-loading mesh "${filename}" from project folder...`)
      context.onLog('Config', 'info', `Auto-loading mesh "${filename}" from project folder...`)
      
      const isCSM = filename.toLowerCase().endsWith('.csm')
      const meshPath = `${directoryPath}/${filename}`
      
      try {
        const meshFile = await context.readProjectFile(meshPath)
        
        if (meshFile) {
          if (isCSM) {
            // CSM file - load with ESP server
            await context.onLoadCSM(meshFile)
            meshLoaded = true
            context.onLog('Config', 'success', `CSM "${filename}" loaded successfully`)
            // CSM loads tags directly, transform config now
            context.onTransformAndSetConfig(config)
          } else {
            // Regular mesh - parse and check for duplicates
            const parsedMesh = await context.onParseMesh(meshFile)
            
            // Check for duplicate tag names
            const tagNames = new Set<string>()
            const hasDuplicates = parsedMesh.regions.some((r: any) => {
              if (tagNames.has(r.tagName)) return true
              tagNames.add(r.tagName)
              return false
            })
            
            if (hasDuplicates) {
              showedLumpDialog = true
              context.onShowLumpDialog(config, parsedMesh, filename)
            } else {
              context.onLoadMesh(parsedMesh, filename, false)
              meshLoaded = true
              context.onTransformAndSetConfig(config)
            }
            
            context.onLog('Config', 'success', `Mesh "${filename}" loaded successfully`)
          }
        } else {
          const locationLabel = directoryPath ? directoryPath : 'project folder'
          context.onLog('Config', 'warning', `Mesh "${filename}" not found in ${locationLabel}`)
          context.onTransformAndSetConfig(config)
        }
      } catch (error) {
        console.error(`[Debug] Failed to load mesh "${filename}":`, error)
        context.onLog('Config', 'info', `Use File → Load Mesh to load "${filename}"`)
        context.onTransformAndSetConfig(config)
      }
    } else {
      // No directory available in Tauri mode
      context.onLog('Config', 'info', `Config references "${filename}". Use File → Load Mesh`)
      context.onTransformAndSetConfig(config)
    }
  } else {
    // BROWSER MODE: Try config directory, then project folder, then prompt
    const isCSM = filename.toLowerCase().endsWith('.csm')
    let directoryHandle: FileSystemDirectoryHandle | null = null
    let source = 'unknown'
    
    // Priority 1: Config directory handle (from where config was loaded)
    if (context.configDirectoryHandle) {
      directoryHandle = context.configDirectoryHandle
      source = 'config directory'
      console.log(`[Debug] Using config directory handle for "${filename}"`)
    }
    // Priority 2: Project folder handle (if user opened project folder)
    else if (context.projectFolderHandle && typeof context.projectFolderHandle !== 'string') {
      directoryHandle = context.projectFolderHandle as FileSystemDirectoryHandle
      source = 'project folder'
      console.log(`[Debug] Using project folder handle for "${filename}"`)
    }
    // Priority 3: Prompt user for directory
    else if (context.promptForDirectory) {
      directoryHandle = await context.promptForDirectory()
      source = 'selected directory'
    }
    
    if (directoryHandle) {
      try {
        const fileHandle = await directoryHandle.getFileHandle(filename)
        const file = await fileHandle.getFile()
        
        if (isCSM) {
          // CSM file - load with ESP server
          await context.onLoadCSM(file)
          meshLoaded = true
          context.onLog('Config', 'success', `CSM "${filename}" loaded successfully`)
          // CSM loads tags directly, transform config now
          context.onTransformAndSetConfig(config)
        } else {
          // Regular mesh - parse and check for duplicates
          const parsedMesh = await context.onParseMesh(file)
          
          // Check for duplicate tag names
          const tagNames = new Set<string>()
          const hasDuplicates = parsedMesh.regions.some((r: any) => {
            if (tagNames.has(r.tagName)) return true
            tagNames.add(r.tagName)
            return false
          })
          
          if (hasDuplicates) {
            showedLumpDialog = true
            context.onShowLumpDialog(config, parsedMesh, filename)
          } else {
            context.onLoadMesh(parsedMesh, filename, false)
            meshLoaded = true
            context.onTransformAndSetConfig(config)
          }
          
          context.onLog('Config', 'success', `Mesh "${filename}" loaded successfully`)
        }
      } catch (error) {
        console.error('[Debug] Mesh not found in directory:', error)
        context.onLog('Config', 'info', `Mesh "${filename}" not found in ${source}`)
        context.onTransformAndSetConfig(config)
      }
    } else {
      // User cancelled directory selection or no prompt available
      context.onTransformAndSetConfig(config)
    }
  }
  
  return { meshLoaded, showedLumpDialog }
}
