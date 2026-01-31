import { useState, useEffect, useRef } from 'react'
import { Panel, PanelGroup, PanelResizeHandle, type PanelImperativeHandle } from 'react-resizable-panels'
import TreePanel from './components/TreePanel/TreePanel'
import EditorPanel from './components/EditorPanel/EditorPanel'
import TagsPanel from './components/TagsPanel/TagsPanel'
import ProjectFolderPanel from './components/ProjectFolderPanel/ProjectFolderPanel'
import Viewport3D from './components/Viewport3D/Viewport3D'
import TextEditor from './components/TextEditor/TextEditor'
import MenuBar from './components/MenuBar/MenuBar'
import NewProjectWizard, { ProjectConfig } from './components/MenuBar/NewProjectWizard'
import ProjectSetupWizard from './components/ProjectSetupWizard/ProjectSetupWizard'
import SettingsDialog from './components/SettingsDialog/SettingsDialog'
import ValidationErrorDialog from './components/ValidationErrorDialog/ValidationErrorDialog'
import FarfieldWizard from './components/FarfieldWizard/FarfieldWizard'
import ConsolePanel from './components/ConsolePanel/ConsolePanel'
import StatusBar from './components/StatusBar/StatusBar'
import LoadingOverlay from './components/LoadingOverlay/LoadingOverlay'
import { useAppStore } from './store/appStore'
import { useConsoleStore } from './store/consoleStore'
import { pickMeshFile, parseMeshFile } from './utils/meshParser'
import { saveJsonFile, openJsonFile, promptForDirectoryAccess } from './utils/fileUtils'
import { validateAgainstSchema, ValidationErrorItem } from './utils/schemaValidator'
import { loadMeshFromDirectory } from './utils/meshLoader'
import { transformLoadedConfig } from './utils/configTransform'
import { buildCSM, checkESPHealth, buildCSMWithDepsStreaming } from './utils/espApi'
import { convertESPRegionsToSurfaces } from './utils/espAdapter'
import { calculateBoundingBox, BoundingBox } from './utils/geometryUtils'
import './App.css'

function App() {
  const [showProjectSetup, setShowProjectSetup] = useState(false)
  const [showNewProjectWizard, setShowNewProjectWizard] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showLumpDialog, setShowLumpDialog] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[]>([])
  const [pendingMesh, setPendingMesh] = useState<{ parsedMesh: any; filename: string } | null>(null)
  const [pendingConfig, setPendingConfig] = useState<any>(null) // Store config until mesh loads
  const [showFarfieldWizard, setShowFarfieldWizard] = useState(false)
  const [importedGeometryFile, setImportedGeometryFile] = useState<File | null>(null)
  const [showThermoWizardFromStatusBar, setShowThermoWizardFromStatusBar] = useState(false)
  const [showTurbulenceWizardFromStatusBar, setShowTurbulenceWizardFromStatusBar] = useState(false)
  const [showInitializationWizard, setShowInitializationWizard] = useState(false)
  const [showTimeAccuracyWizard, setShowTimeAccuracyWizard] = useState(false)
  const [showVisualizationWizard, setShowVisualizationWizard] = useState(false)
  const [espLoading, setEspLoading] = useState(false)
  const [espLoadingMessage, setEspLoadingMessage] = useState('')
  const [espLogLines, setEspLogLines] = useState<string[]>([])
  
  // Text Editor state
  const [textEditorOpen, setTextEditorOpen] = useState(false)
  const [currentCSMContent, setCurrentCSMContent] = useState<string>('')
  const [currentCSMFilename, setCurrentCSMFilename] = useState<string>('')
  
  // Refs for imperative panel control
  const projectFolderPanelRef = useRef<PanelImperativeHandle>(null)
  const treePanelRef = useRef<PanelImperativeHandle>(null)
  const editorPanelRef = useRef<PanelImperativeHandle>(null)
  const meshGroupsPanelRef = useRef<PanelImperativeHandle>(null)
  
  const { 
    configData, 
    initializeConfig, 
    loadMesh, 
    loadESPSurfaces, 
    availableTags, 
    setConfigData,
    treeCollapsed,
    editorCollapsed,
    surfacesCollapsed,
    projectFolderCollapsed
  } = useAppStore()
  const { setCollapsed, isCollapsed, log } = useConsoleStore()

  /**
   * Detect log level from ESP/EGADS message content
   * 
   * ESP output defaults to INFO. Only errors and warnings are special-cased.
   */
  const detectESPLogLevel = (message: string): 'error' | 'warning' | 'info' | 'debug' => {
    const lowerMsg = message.toLowerCase()
    
    // Error patterns
    if (
      lowerMsg.startsWith('error') ||
      lowerMsg.includes('error:') ||
      lowerMsg.includes('bad status') ||
      lowerMsg.includes('failed') ||
      lowerMsg.includes('exception') ||
      lowerMsg.includes('did not create') ||
      lowerMsg.includes('max trys exceeded') ||
      lowerMsg.includes('ocsmerror')
    ) {
      return 'error'
    }
    
    // Warning patterns
    if (
      lowerMsg.includes('warning:') ||
      lowerMsg.includes('egads warning') ||
      lowerMsg.includes('nothing found')
    ) {
      return 'warning'
    }
    
    // Default: Everything else is INFO
    return 'info'
  }

  // Keyboard shortcut for console toggle (Ctrl+`)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        setCollapsed(!isCollapsed)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCollapsed, setCollapsed])

  // Add test logs on startup
  useEffect(() => {
    log('UI', 'success', 'Application started successfully')
    log('DEBUG', 'info', 'Console panel is ready')
    log('ESP', 'info', 'Waiting for ESP operations...')
  }, [log])

  const handleNew = () => {
    setShowNewProjectWizard(true)
  }

  const handleCreateProject = (config: ProjectConfig) => {
    console.log('Creating new project with config:', config)
    initializeConfig(config)
    console.log('Config initialized, check store for updated configData')
  }

  const handleOpenProjectFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert('Directory Picker API not supported in this browser')
        return
      }

      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      })

      const { openProjectFolder } = useAppStore.getState()
      openProjectFolder(handle)
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        console.error('Error opening project folder:', error)
      }
    }
  }

  const handleOpen = async () => {
    try {
      // Open file picker and load JSON
      const loadedConfig = await openJsonFile()
      
      // If user cancelled, do nothing
      if (!loadedConfig) {
        return
      }
      
      // Check if config has mesh filename
      const meshFilename = loadedConfig['mesh filename']
      let meshLoaded = false
      let showedLumpDialog = false
      
      if (meshFilename) {
        // Prompt user to select the directory containing the config and mesh
        const directoryHandle = await promptForDirectoryAccess()
        
        if (directoryHandle) {
          // Try to load mesh from the selected directory
          meshLoaded = await loadMeshFromDirectory(
            typeof meshFilename === 'string' ? meshFilename : meshFilename[0],
            directoryHandle,
            parseMeshFile,
            loadMesh,
            (parsedMesh, filename) => {
              // Mesh has duplicates - will show lump dialog
              // Store config to transform AFTER mesh actually loads
              console.log('[App] Storing pending config to transform after lump dialog resolves')
              showedLumpDialog = true
              setPendingConfig(loadedConfig)
              setPendingMesh({ parsedMesh, filename })
              setShowLumpDialog(true)
            }
          )
          
          if (meshLoaded) {
            console.log(`[App] Mesh "${meshFilename}" loaded automatically from selected directory`)
          } else {
            console.log(`[App] Mesh "${meshFilename}" not found in directory, will need to locate manually`)
          }
        }
        
        // If user cancelled directory selection or mesh not found, they can load it later manually
      }
      
      // If mesh was loaded directly (no lump dialog), transform and set config now
      // If lump dialog was shown, this will be handled in handleLumpChoice
      if (!showedLumpDialog) {
        const currentTags = useAppStore.getState().availableTags
        const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
        console.log('[App] Transforming config with tags:', currentTags.length)
        console.log('[App] Available tag numbers and names:', currentTags.map(s => `${s.metadata.tagName}=${s.metadata.tag}`))
        const transformedConfig = transformLoadedConfig(loadedConfig, currentTags, rootKey)
        setConfigData(transformedConfig)
        console.log('[App] Transformed BCs:', transformedConfig['boundary conditions'])
        console.log('Configuration loaded successfully')
      } else {
        console.log('[App] Config transformation deferred until after lump dialog')
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      alert(`Failed to load configuration: ${(error as Error).message}`)
    }
  }

  // Remove internal GUI fields (id, name, etc.) before saving
  // Also convert mesh boundary tags from numbers to surface names
  const cleanConfigForSave = (config: any): any => {
    const cleaned = JSON.parse(JSON.stringify(config)) // Deep clone
    
    // Create a map of tag number to surface name
    const tagToName = new Map<number, string>()
    availableTags.forEach(surface => {
      tagToName.set(surface.metadata.tag, surface.metadata.tagName)
    })
    
    // Determine if config is flat or nested under root solver key
    const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
    let bcArray = cleaned['boundary conditions']
    let statesObj = cleaned.states
    let targetConfig = cleaned
    
    // If not found at root level, check under root solver key
    if (!bcArray && cleaned[rootKey]) {
      bcArray = cleaned[rootKey]['boundary conditions']
      statesObj = cleaned[rootKey].states
      targetConfig = cleaned[rootKey]
    }
    
    // Remove 'id' and 'name' from boundary conditions
    // Use BC's name as the mesh boundary tags value
    if (bcArray) {
      const cleanedBCs = bcArray.map((bc: any) => {
        const { id, name, ...bcClean } = bc
        
        // Replace mesh boundary tags with the BC's name
        // BCs always have a name (either user-provided or auto-generated like "no slip wall BC")
        if (bcClean['mesh boundary tags'] !== undefined) {
          bcClean['mesh boundary tags'] = bc.name
        }
        
        return bcClean
      })
      
      // Update the BCs in the correct location
      if (cleaned['boundary conditions']) {
        cleaned['boundary conditions'] = cleanedBCs
      } else if (cleaned[rootKey]) {
        cleaned[rootKey]['boundary conditions'] = cleanedBCs
      }
    }
    
    // Remove 'id' and 'name' from states if they have them
    if (statesObj && typeof statesObj === 'object') {
      const cleanedStates: any = {}
      Object.entries(statesObj).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object') {
          const { id, name, ...stateClean } = value as any
          cleanedStates[key] = stateClean
        } else {
          cleanedStates[key] = value
        }
      })
      
      // Update states in the correct location
      if (cleaned.states) {
        cleaned.states = cleanedStates
      } else if (cleaned[rootKey]) {
        cleaned[rootKey].states = cleanedStates
      }
    }
    
    return cleaned
  }

  const handleSave = async () => {
    console.log('Save file')
    console.log('Current config:', configData)
    const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
    const rootConfig = (configData as any)[rootKey]
    console.log('Boundary conditions:', rootConfig?.['boundary conditions'])
    console.log('Num BCs:', rootConfig?.['boundary conditions']?.length || 0)
    
    const configToSave = cleanConfigForSave(configData)
    
    // Load and validate against schema
    try {
      const schemaResponse = await fetch('/schemas/input.schema.json')
      const schema = await schemaResponse.json()
      
      const { valid, errors } = validateAgainstSchema(schema, configToSave)
      
      if (!valid && errors) {
        console.warn('Validation errors found:', errors)
        console.warn('Number of errors:', errors.length)
        const formattedErrors: ValidationErrorItem[] = errors.map(err => ({
          message: err.message || 'Unknown error',
          path: err.instancePath || undefined
        }))
        setValidationErrors(formattedErrors)
        setShowValidationErrors(true)
        return
      }
      
      // Validation passed, save the file
      await saveJsonFile(configToSave, 'config.json')
      console.log('File saved successfully')
    } catch (error) {
      console.error('Error saving file:', error)
    }
  }

  const handleValidate = async () => {
    console.log('Validate configuration')
    
    const errors: ValidationErrorItem[] = []
    
    // Check 1: Validate against schema
    try {
      const schemaResponse = await fetch('/schemas/input.schema.json')
      const schema = await schemaResponse.json()
      
      const configToValidate = cleanConfigForSave(configData)
      const { valid, errors: schemaErrors } = validateAgainstSchema(schema, configToValidate)
      
      if (!valid && schemaErrors) {
        console.warn('Schema validation errors:', schemaErrors.length)
        const formattedSchemaErrors: ValidationErrorItem[] = schemaErrors.map(err => ({
          message: err.message || 'Unknown error',
          path: err.instancePath || undefined
        }))
        errors.push(...formattedSchemaErrors)
      }
    } catch (error) {
      console.error('Error loading schema:', error)
      errors.push({ message: 'Failed to load validation schema' })
    }
    
    // Check 2: Ensure all mesh surfaces are assigned to boundary conditions
    const availableTags = useAppStore.getState().availableTags
    const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
    const rootConfig = (configData as any)[rootKey]
    const boundaryConditions = rootConfig?.['boundary conditions'] || []
    
    if (availableTags.length > 0) {
      // Get all surface tags assigned to BCs
      const assignedTags = new Set<number>()
      boundaryConditions.forEach(bc => {
        const tags = bc['mesh boundary tags']
        if (tags !== undefined) {
          if (Array.isArray(tags)) {
            tags.forEach(tag => {
              if (typeof tag === 'number') {
                assignedTags.add(tag)
              }
            })
          } else if (typeof tags === 'number') {
            assignedTags.add(tags)
          }
        }
      })
      
      // Find unassigned surfaces
      const unassignedSurfaces = availableTags.filter(
        surface => !assignedTags.has(surface.metadata.tag)
      )
      
      if (unassignedSurfaces.length > 0) {
        const surfaceNames = unassignedSurfaces.map(s => s.name).join(', ')
        errors.push({
          message: `Unassigned mesh surfaces: ${surfaceNames}. All surfaces must be assigned to boundary conditions.`,
          path: `${rootKey}.boundary conditions`
        })
      }
    }
    
    // Show results
    if (errors.length > 0) {
      setValidationErrors(errors)
      setShowValidationErrors(true)
      console.warn(`Validation failed with ${errors.length} error(s)`)
    } else {
      // Show success notification
      console.log('✅ Validation passed - configuration is valid')
      alert('✅ Validation passed!\n\nAll checks completed successfully.')
    }
  }

  const handleExit = () => {
    console.log('Exit')
    // TODO: Prompt to save if dirty, then close
  }

  const handleSettings = () => {
    setShowSettingsDialog(true)
  }

  const handleLoadMesh = async () => {
    console.log('[App] Load Mesh clicked')
    try {
      const file = await pickMeshFile()
      if (!file) {
        console.log('[App] No file selected')
        return
      }
      
      console.log('[App] Parsing mesh file...')
      const parsedMesh = await parseMeshFile(file)
      console.log('[App] Mesh parsed successfully:', {
        regions: parsedMesh.regions.length,
        totalVertices: parsedMesh.totalVertices,
        totalFaces: parsedMesh.totalFaces
      })
      
      // Check if there are duplicate tag names
      const tagNames = new Set<string>()
      const hasDuplicates = parsedMesh.regions.some(region => {
        if (tagNames.has(region.name)) {
          return true
        }
        tagNames.add(region.name)
        return false
      })
      
      if (hasDuplicates) {
        console.log('[App] Duplicate tag names detected, showing lumping dialog')
        setPendingMesh({ parsedMesh, filename: file.name })
        setShowLumpDialog(true)
      } else {
        console.log('[App] No duplicate tag names, loading mesh directly')
        loadMesh(parsedMesh, file.name, false)
        console.log('[App] Mesh loaded successfully!')
      }
    } catch (error) {
      console.error('[App] Error loading mesh:', error)
    }
  }

  // Wrapper for loading config from FileSystemFileHandle
  // Auto-loads mesh file if project folder is open
  const handleLoadConfigFromHandle = async (handle: FileSystemFileHandle) => {
    try {
      const file = await handle.getFile()
      const text = await file.text()
      const json = JSON.parse(text)
      
      // Check if config has mesh filename and project folder is open
      const meshFilename = json['mesh filename']
      const { projectFolderHandle } = useAppStore.getState()
      let meshLoaded = false
      let showedLumpDialog = false
      
      if (meshFilename && projectFolderHandle) {
        // Try to auto-load mesh from project folder
        const filename = typeof meshFilename === 'string' ? meshFilename : meshFilename[0]
        console.log(`[App] Auto-loading mesh "${filename}" from project folder...`)
        
        // Check if this is a CSM file (needs ESP server)
        const isCSM = filename.toLowerCase().endsWith('.csm')
        
        if (isCSM) {
          // CSM file - use ESP server
          try {
            const csmHandle = await projectFolderHandle.getFileHandle(filename)
            await handleLoadCSMFromHandle(csmHandle)
            meshLoaded = true
            // CSM loads tags directly, transform config now
            const currentTags = useAppStore.getState().availableTags
            const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
            const transformedConfig = transformLoadedConfig(json, currentTags, rootKey)
            setConfigData(transformedConfig)
            console.log(`[App] CSM "${filename}" loaded automatically from project folder`)
          } catch (error) {
            console.log(`[App] CSM "${filename}" not found in project folder`)
          }
        } else {
          // Regular mesh file - use mesh parser
          meshLoaded = await loadMeshFromDirectory(
            filename,
            projectFolderHandle,
            parseMeshFile,
            loadMesh,
            (parsedMesh, meshName) => {
              // Mesh has duplicates - will show lump dialog
              showedLumpDialog = true
              setPendingConfig(json)
              setPendingMesh({ parsedMesh, filename: meshName })
              setShowLumpDialog(true)
            }
          )
          
          if (meshLoaded) {
            console.log(`[App] Mesh "${filename}" loaded automatically from project folder`)
          } else {
            console.log(`[App] Mesh "${filename}" not found in project folder`)
          }
        }
      }
      
      // If mesh was loaded directly (no lump dialog), transform and set config now
      // If lump dialog was shown, this will be handled in handleLumpChoice
      // Note: CSM files handle transformation above since they load synchronously
      if (!showedLumpDialog && !meshLoaded) {
        const currentTags = useAppStore.getState().availableTags
        const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
        const transformedConfig = transformLoadedConfig(json, currentTags, rootKey)
        setConfigData(transformedConfig)
        console.log('[App] Config loaded successfully')
      } else if (showedLumpDialog) {
        console.log('[App] Config transformation deferred until after lump dialog')
      }
    } catch (error) {
      console.error('[App] Error loading config from handle:', error)
      alert(`Failed to load configuration: ${(error as Error).message}`)
    }
  }

  // Wrapper for loading mesh from FileSystemFileHandle
  const handleLoadMeshFromHandle = async (handle: FileSystemFileHandle) => {
    try {
      const file = await handle.getFile()
      const parsedMesh = await parseMeshFile(file)
      
      // Check for duplicate tag names
      const tagNames = new Set<string>()
      const hasDuplicates = parsedMesh.regions.some(region => {
        if (tagNames.has(region.name)) return true
        tagNames.add(region.name)
        return false
      })
      
      if (hasDuplicates) {
        setPendingMesh({ parsedMesh, filename: handle.name })
        setShowLumpDialog(true)
      } else {
        loadMesh(parsedMesh, handle.name, false)
      }
    } catch (error) {
      console.error('[App] Error loading mesh from handle:', error)
    }
  }

  // Wrapper for loading CAD from FileSystemFileHandle
  const handleLoadCADFromHandle = async (handle: FileSystemFileHandle) => {
    try {
      const file = await handle.getFile()
      handleLoadCADFile(file)
    } catch (error) {
      console.error('[App] Error loading CAD from handle:', error)
    }
  }

  // Wrapper for loading CSM from FileSystemFileHandle with auto-dependency loading
  const handleLoadCSMFromHandle = async (handle: FileSystemFileHandle) => {
    console.log('[App] Load CSM from handle clicked')
    
    try {
      log('ESP', 'info', 'Checking ESP server health...')
      
      // First check if ESP server is available
      const health = await checkESPHealth()
      if (!health.esp_available) {
        log('ESP', 'error', `ESP server not available: ${health.message}`)
        alert(`ESP server not available: ${health.message}\n\nMake sure the ESP gateway server is running on port 8081.`)
        return
      }
      
      log('ESP', 'success', 'ESP server is ready')
      
      const file = await handle.getFile()
      log('Geometry', 'success', `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)
      
      // Read file contents
      const csmContent = await file.text()
      log('ESP', 'info', `CSM loaded: ${csmContent.split('\n').length} lines`)
      
      // Check for import/restore statements
      const { parseCSMImports } = await import('./utils/csmParser')
      const imports = parseCSMImports(csmContent)
      
      const { projectFolderHandle } = useAppStore.getState()
      let response
      
      if (imports.length > 0) {
        log('Geometry', 'info', `Found ${imports.length} dependencies: ${imports.join(', ')}`)
        
        // Prompt user for each dependency file
        const dependencies = new Map<string, File>()
        
        for (const importPath of imports) {
          let loaded = false
          
          // Try auto-loading from project folder first
          if (projectFolderHandle) {
            try {
              log('Geometry', 'info', `Attempting to auto-load: ${importPath}`)
              const depHandle = await projectFolderHandle.getFileHandle(importPath)
              const depFile = await depHandle.getFile()
              dependencies.set(importPath, depFile)
              log('Geometry', 'success', `Auto-loaded: ${depFile.name} (${depFile.size} bytes)`)
              loaded = true
            } catch (error) {
              log('Geometry', 'warning', `Could not auto-load ${importPath}`)
            }
          }
          
          // Fallback: prompt user if not auto-loaded
          if (!loaded) {
            try {
              log('Geometry', 'info', `Waiting for: ${importPath}`)
              
              const [depHandle] = await window.showOpenFilePicker({
                types: [{
                  description: `CSM Dependency: ${importPath}`,
                  accept: { 
                    'application/stp': ['.stp', '.step'],
                    'application/iges': ['.igs', '.iges'],
                    'application/octet-stream': ['.egads'],
                    '*/*': []
                  }
                }],
                suggestedName: importPath,
                multiple: false
              })
              
              const depFile = await depHandle.getFile()
              log('Geometry', 'success', `Loaded: ${depFile.name} (${depFile.size} bytes)`)
              
              // Use the import path as the key (preserves relative path semantics)
              dependencies.set(importPath, depFile)
              
            } catch (depError) {
              if ((depError as any).name === 'AbortError') {
                log('Geometry', 'warning', `User cancelled dependency selection: ${importPath}`)
                alert(
                  `Missing Required File\n\n` +
                  `The CSM file needs: ${importPath}\n\n` +
                  `Without this file, the geometry cannot be loaded.\n` +
                  `Cancelling CSM load.`
                )
                return
              }
              throw depError
            }
          }
        }
        
        // Build CSM with dependencies
        log('ESP', 'info', `Building CSM with ${dependencies.size} dependencies...`)
        setEspLoading(true)
        setEspLoadingMessage('Building CSM geometry')
        setEspLogLines([])
        
        const { buildCSMWithDepsStreaming } = await import('./utils/espApi')
        response = await buildCSMWithDepsStreaming(csmContent, dependencies, (logLine) => {
          const level = detectESPLogLevel(logLine)
          log('ESP', level, logLine)
          setEspLogLines(prev => [...prev, logLine])
        })
        
        setEspLoading(false)
        
      } else {
        // No imports - use standard build
        log('ESP', 'info', 'Building CSM (no dependencies)...')
        setEspLoading(true)
        setEspLoadingMessage('Building CSM geometry')
        setEspLogLines([])
        
        response = await buildCSM(csmContent)
        
        setEspLoading(false)
      }
      
      if (!response.success) {
        log('ESP', 'error', `Build failed: ${response.message}`)
        throw new Error(response.message)
      }
      
      // Add server build log (only for non-streaming builds)
      if (response.build_log?.length) {
        response.build_log.forEach(line => {
          const level = detectESPLogLevel(line)
          log('ESP', level, line)
        })
      }
      
      log('ESP', 'success', `Build complete: ${response.message}`)
      log('Geometry', 'info', `Received ${response.regions?.length || 0} faces, ${response.total_vertices} vertices`)
      log('Geometry', 'info', `Received ${response.regions?.length || 0} faces, ${response.total_vertices} vertices`)
      
      // Convert ESP regions to our Surface format (individual faces)
      const surfaces = convertESPRegionsToSurfaces(response, { centerAndScale: true })
      log('Geometry', 'success', `Converted to ${surfaces?.length || 0} surfaces`)
      
      // Load into the store (pass CSM content for export)
      loadESPSurfaces(surfaces, file.name, csmContent)
      
      // Store CSM content for text editor
      setCurrentCSMContent(csmContent)
      setCurrentCSMFilename(file.name)
      
      log('Geometry', 'success', 'CSM loaded successfully!')
      
    } catch (error) {
      setEspLoading(false)
      if ((error as any).name === 'AbortError') {
        log('Geometry', 'warning', 'File selection cancelled')
        return
      }
      log('Geometry', 'error', `Failed to load CSM: ${(error as Error).message}`)
      console.error('[App] Error loading CSM:', error)
    }
  }

  const handleLoadCSM = async () => {
    console.log('[App] Open CSM clicked')
    
    try {
      log('ESP', 'info', 'Checking ESP server health...')
      
      // First check if ESP server is available
      const health = await checkESPHealth()
      if (!health.esp_available) {
        log('ESP', 'error', `ESP server not available: ${health.message}`)
        alert(`ESP server not available: ${health.message}\n\nMake sure the ESP gateway server is running on port 8081.`)
        return
      }
      
      log('ESP', 'success', 'ESP server is ready')
      log('Geometry', 'info', 'Opening file picker for CSM file...')
      
      // Open file picker for .csm files
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'CSM Files',
          accept: { 'application/octet-stream': ['.csm'] }
        }]
      })
      
      const file = await fileHandle.getFile()
      log('Geometry', 'success', `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)
      
      // Read file contents
      const csmContent = await file.text()
      log('ESP', 'info', `CSM loaded: ${csmContent.split('\n').length} lines`)
      
      // Check for import/restore statements
      const { parseCSMImports } = await import('./utils/csmParser')
      const imports = parseCSMImports(csmContent)
      
      let response
      
      if (imports.length > 0) {
        log('Geometry', 'info', `Found ${imports.length} dependencies: ${imports.join(', ')}`)
        
        // Alert user about required dependency files
        // Use setTimeout to ensure alert shows after any pending React renders
        await new Promise<void>(resolve => {
          setTimeout(() => {
            alert(
              `This CSM file requires ${imports.length} dependency file(s):\n\n` +
              imports.map(f => `  • ${f}`).join('\n') +
              `\n\nYou will now be prompted to select each file.`
            )
            resolve()
          }, 100)
        })
        
        // Prompt user for each dependency file
        const dependencies = new Map<string, File>()
        
        for (const importPath of imports) {
          try {
            log('Geometry', 'info', `Waiting for: ${importPath}`)
            
            const [depHandle] = await window.showOpenFilePicker({
              types: [{
                description: `CSM Dependency: ${importPath}`,
                accept: { 
                  'application/stp': ['.stp', '.step'],
                  'application/iges': ['.igs', '.iges'],
                  'application/octet-stream': ['.egads'],
                  '*/*': []
                }
              }],
              suggestedName: importPath,
              multiple: false
            })
            
            const depFile = await depHandle.getFile()
            log('Geometry', 'success', `Loaded: ${depFile.name} (${depFile.size} bytes)`)
            
            // Use the import path as the key (preserves relative path semantics)
            dependencies.set(importPath, depFile)
            
          } catch (depError) {
            if ((depError as any).name === 'AbortError') {
              log('Geometry', 'warning', `User cancelled dependency selection: ${importPath}`)
              alert(
                `Missing Required File\n\n` +
                `The CSM file needs: ${importPath}\n\n` +
                `Without this file, the geometry cannot be loaded.\n` +
                `Cancelling CSM load.`
              )
              return
            }
            throw depError
          }
        }
        
        // Build CSM with dependencies
        log('ESP', 'info', `Building CSM with ${dependencies.size} dependencies...`)
        setEspLoading(true)
        setEspLoadingMessage('Building CSM geometry')
        setEspLogLines([])
        
        const { buildCSMWithDepsStreaming } = await import('./utils/espApi')
        response = await buildCSMWithDepsStreaming(csmContent, dependencies, (logLine) => {
          const level = detectESPLogLevel(logLine)
          log('ESP', level, logLine)
          setEspLogLines(prev => [...prev, logLine])
        })
        
        setEspLoading(false)
        
      } else {
        // No imports - use standard build
        log('ESP', 'info', 'Building CSM (no dependencies)...')
        setEspLoading(true)
        setEspLoadingMessage('Building CSM geometry')
        setEspLogLines([])
        
        response = await buildCSM(csmContent)
        
        setEspLoading(false)
      }
      
      if (!response.success) {
        log('ESP', 'error', `Build failed: ${response.message}`)
        throw new Error(response.message)
      }
      
      // Add server build log (only for non-streaming builds)
      if (response.build_log?.length) {
        response.build_log.forEach(line => {
          const level = detectESPLogLevel(line)
          log('ESP', level, line)
        })
      }
      
      log('ESP', 'success', `Build complete: ${response.message}`)
      log('Geometry', 'info', `Received ${response.regions?.length || 0} faces, ${response.total_vertices} vertices`)
      log('Geometry', 'info', `Received ${response.regions?.length || 0} faces, ${response.total_vertices} vertices`)
      
      // Convert ESP regions to our Surface format (individual faces)
      const surfaces = convertESPRegionsToSurfaces(response, { centerAndScale: true })
      log('Geometry', 'success', `Converted to ${surfaces?.length || 0} surfaces`)
      
      // Load into the store (pass CSM content for export)
      loadESPSurfaces(surfaces, file.name, csmContent)
      
      log('Geometry', 'success', 'CSM loaded successfully!')
      
    } catch (error) {
      setEspLoading(false)
      if ((error as any).name === 'AbortError') {
        log('Geometry', 'warning', 'File selection cancelled')
        return
      }
      log('Geometry', 'error', `Failed to load CSM: ${(error as Error).message}`)
      console.error('[App] Error loading CSM:', error)
    }
  }

  const handleLumpChoice = (lump: boolean) => {
    if (pendingMesh) {
      console.log('[App] Loading mesh with lump =', lump)
      loadMesh(pendingMesh.parsedMesh, pendingMesh.filename, lump)
      console.log('[App] Mesh loaded successfully!')
      
      // NOW transform and set the pending config with the loaded mesh surfaces
      if (pendingConfig) {
        console.log('[App] Transforming pending config after mesh load')
        const currentTags = useAppStore.getState().availableTags
        const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
        console.log('[App] Available surfaces after mesh load:', currentTags.length)
        console.log('[App] Available surface tags:', currentTags.map(s => `${s.metadata.tagName}=${s.metadata.tag}`))
        const transformedConfig = transformLoadedConfig(pendingConfig, currentTags, rootKey)
        setConfigData(transformedConfig)
        console.log('[App] Configuration set with BCs:', transformedConfig['boundary conditions'])
        setPendingConfig(null)
      }
    }
    setShowLumpDialog(false)
    setPendingMesh(null)
  }

  const handleExportCSM = async () => {
    const { csmFilename, exportGeneratedCSM, csmBuilder, setMeshNeedsExport } = useAppStore.getState()
    
    const hasOperations = csmBuilder.hasOperations()
    const hasBase = csmBuilder.getBase().length > 0
    
    if (!hasBase && !hasOperations) {
      alert('No CSM file loaded and no operations recorded to export')
      return
    }
    
    try {
      // Get the generated CSM from the operation recorder
      const generatedCSM = exportGeneratedCSM()
      
      console.log('[App] Exporting CSM with operation recording')
      console.log('[App] Base CSM length:', csmBuilder.getBase().length)
      console.log('[App] Operations:', csmBuilder.getOperationCount())
      console.log('[App] Operation summary:\n', csmBuilder.getSummary())
      
      // Use File System Access API to show save dialog
      const handle = await window.showSaveFilePicker({
        suggestedName: csmFilename || 'exported.csm',
        types: [{
          description: 'CSM Files',
          accept: { 'application/octet-stream': ['.csm'] }
        }]
      })
      
      // Write the generated content
      const writable = await handle.createWritable()
      await writable.write(generatedCSM)
      await writable.close()
      
      // Mark mesh as no longer needing export
      setMeshNeedsExport(false)
      
      console.log('[App] CSM exported successfully as:', handle.name)
      console.log('[App] Generated CSM preview:\n', generatedCSM.slice(0, 500) + '...')
      alert(`CSM file saved successfully as ${handle.name}\n\nOperations recorded: ${csmBuilder.getOperationCount()}`)
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        console.log('[App] Export cancelled by user')
        return
      }
      console.error('[App] Error exporting CSM:', error)
      alert(`Failed to export CSM: ${(error as Error).message}`)
    }
  }

  const handleImportGeometry = async () => {
    console.log('[App] Import Geometry clicked')
    
    try {
      log('Geometry', 'info', 'Starting geometry import...')
      
      // Check ESP server is available
      log('ESP', 'info', 'Checking ESP server health...')
      const health = await checkESPHealth()
      if (!health.esp_available) {
        log('ESP', 'error', `ESP server not available: ${health.message}`)
        alert(`ESP server not available: ${health.message}\n\nMake sure the ESP gateway server is running on port 8081.`)
        return
      }
      log('ESP', 'success', 'ESP server is ready')
      
      log('Geometry', 'info', 'Opening file picker...')
      log('Geometry', 'info', 'Opening file picker...')
      
      // Open file picker for STEP files
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'STEP Files',
          accept: { 
            'application/step': ['.step', '.stp'],
            'application/octet-stream': ['.step', '.stp']
          }
        }]
      })
      
      const file = await fileHandle.getFile()
      log('Geometry', 'success', `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)
      setImportedGeometryFile(file)
      
      log('ESP', 'info', 'Generating CSM import script...')
      
      // Generate CSM with just the import statement
      // Quote filename to handle spaces and special characters
      const csmContent = `# Imported geometry from ${file.name}
import "${file.name}"
`
      
      log('ESP', 'info', 'CSM generated', { preview: csmContent.trim() })
      
      // Build CSM with the STEP file as dependency
      const dependencies = new Map<string, File>()
      dependencies.set(file.name, file)
      
      log('ESP', 'info', 'Sending STEP file to ESP server...')
      
      const response = await buildCSMWithDepsStreaming(csmContent, dependencies, (logLine) => {
        // Parse ESP output to detect errors, warnings, and info messages
        if (logLine.includes('ERROR:') || logLine.includes('EGADS Error:')) {
          log('ESP', 'error', logLine)
        } else if (logLine.includes('WARNING:') || logLine.includes('EGADS Warning:')) {
          log('ESP', 'warning', logLine)
        } else if (logLine.includes('INFO:')) {
          log('ESP', 'info', logLine)
        } else {
          log('ESP', 'info', logLine)  // Default to info for normal execution output
        }
      })
      
      if (!response.success) {
        log('ESP', 'error', `Build failed: ${response.message}`)
        throw new Error(response.message)
      }
      
      log('ESP', 'success', `Build complete: ${response.message}`)
      log('Geometry', 'info', `Received ${response.regions?.length || 0} faces, ${response.total_vertices} vertices`)
      
      // Check if we actually got any geometry
      if (!response.regions || response.regions.length === 0) {
        log('Geometry', 'error', 'No geometry loaded from STEP file')
        throw new Error('ESP build completed but no geometry was loaded. Check the ESP error log for details.')
      }
      
      log('Geometry', 'info', 'Converting ESP regions to surfaces...')
      
      // Convert ESP regions to surfaces
      const surfaces = convertESPRegionsToSurfaces(response, { centerAndScale: true })
      log('Geometry', 'success', `Converted to ${surfaces.length} surfaces`)
      
      // Load into store
      const { loadESPSurfaces, csmBuilder } = useAppStore.getState()
      loadESPSurfaces(surfaces, file.name, csmContent)
      
      // Store CSM content for text editor
      setCurrentCSMContent(csmContent)
      setCurrentCSMFilename(file.name)
      
      // Record the initial CSM as base (just the import statement)
      csmBuilder.clear()
      csmBuilder.setBase(csmContent) // Set the import CSM as the base
      
      log('Geometry', 'success', `Geometry imported successfully: ${surfaces.length} surfaces loaded`)
      // Success - geometry is now visible in 3D viewer
      
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        log('Geometry', 'warning', 'Import cancelled by user')
        return
      }
      log('Geometry', 'error', `Import failed: ${(error as Error).message}`)
      console.error('[App] Error importing geometry:', error)
    }
  }

  const handleCreateFarfield = async () => {
    console.log('[App] Create Farfield clicked')
    
    const { availableTags } = useAppStore.getState()
    
    if (availableTags.length === 0) {
      alert('No geometry loaded.\n\nPlease import geometry first using File → Import Geometry.')
      return
    }
    
    if (!importedGeometryFile) {
      alert('No imported geometry file found.\n\nPlease use File → Import Geometry to import a STEP file first.')
      return
    }
    
    // Calculate bounding box
    const boundingBox = calculateBoundingBox(availableTags)
    console.log('[App] Bounding box:', boundingBox)
    
    // Show wizard
    setShowFarfieldWizard(true)
  }

  const handleFarfieldCreation = async (multiplier: number) => {
    console.log('[App] Creating farfield with multiplier:', multiplier)
    
    try {
      log('Farfield', 'info', 'Starting farfield domain creation...')
      
      const { availableTags } = useAppStore.getState()
      
      if (!importedGeometryFile) {
        throw new Error('No imported geometry file')
      }
      
      // Calculate farfield parameters
      const boundingBox = calculateBoundingBox(availableTags)
      const radius = boundingBox.characteristicLength * multiplier
      
      log('Farfield', 'info', `Multiplier: ${multiplier}`)
      
      // Generate complete CSM using store/restore pattern
      // This leverages ESP's built-in @xmax, @xmin, etc. variables
      // to automatically center the farfield sphere
      const generatedCSM = `# Farfield domain with imported geometry
import "${importedGeometryFile.name}"
attribute bc_name $vehicle

# Capture vehicle dimensions using ESP built-in variables
set vehicle:length @xmax-@xmin
set vehicle:xmax @xmax

# Store the vehicle for later restore
store vehicle

# Create farfield sphere centered on vehicle
sphere 0 0 0 vehicle:length*${multiplier}
attribute bc_name $farfield

# Translate sphere to be centered on vehicle bounding box
translate vehicle:xmax-(vehicle:length/2) 0 0

# Restore vehicle and subtract from farfield
restore vehicle
subtract
`
      console.log('[App] Generated CSM:\n', generatedCSM)
      
      log('Farfield', 'info', 'Generated CSM script')
      log('ESP', 'info', 'Sending farfield CSM to ESP server...')
      
      // Build CSM with STEP file dependency
      const dependencies = new Map<string, File>()
      dependencies.set(importedGeometryFile.name, importedGeometryFile)
      
      setEspLoading(true)
      setEspLoadingMessage('Creating farfield domain')
      setEspLogLines([])
      
      const response = await buildCSMWithDepsStreaming(generatedCSM, dependencies, (logLine) => {
        // Parse ESP output to detect errors, warnings, and info messages
        if (logLine.includes('ERROR:') || logLine.includes('EGADS Error:')) {
          log('ESP', 'error', logLine)
        } else if (logLine.includes('WARNING:') || logLine.includes('EGADS Warning:')) {
          log('ESP', 'warning', logLine)
        } else if (logLine.includes('INFO:')) {
          log('ESP', 'info', logLine)
        } else {
          log('ESP', 'info', logLine)  // Default to info for normal execution output
        }
        setEspLogLines(prev => [...prev, logLine])
      })
      
      setEspLoading(false)
      
      if (!response.success) {
        log('ESP', 'error', `Farfield build failed: ${response.message}`)
        throw new Error(response.message)
      }
      
      log('ESP', 'success', `Farfield build complete: ${response.message}`)
      console.log('[App] Farfield build successful:', response.message)
      console.log('[App] Got', response.regions?.length || 0, 'regions')
      
      // Check if we actually got any geometry
      if (!response.regions || response.regions.length === 0) {
        log('Farfield', 'error', 'No geometry created from farfield operation')
        throw new Error('ESP farfield build completed but no geometry was created. Check the ESP error log for details.')
      }
      
      log('Farfield', 'info', `Received ${response.regions?.length || 0} faces, ${response.total_vertices} vertices`)
      log('Farfield', 'info', 'Converting ESP regions to surfaces...')
      
      // Convert ESP regions to surfaces
      const surfaces = convertESPRegionsToSurfaces(response, { centerAndScale: true })
      console.log('[App] Converted to', surfaces.length, 'surfaces')
      log('Farfield', 'success', `Converted to ${surfaces.length} surfaces`)
      
      // Load into store
      const { loadESPSurfaces } = useAppStore.getState()
      loadESPSurfaces(surfaces, `${importedGeometryFile.name} (with farfield)`, generatedCSM)
      
      console.log('[App] Farfield created successfully:', surfaces.length, 'surfaces')
      log('Farfield', 'success', `Farfield domain created successfully: ${surfaces.length} surfaces loaded`)
      // Success - farfield domain is now visible in 3D viewer
      
    } catch (error) {
      setEspLoading(false)
      if ((error as any).name === 'AbortError') {
        log('Farfield', 'warning', 'Farfield creation cancelled by user')
        return
      }
      console.error('[App] Error creating farfield:', error)
      log('Farfield', 'error', `Failed to create farfield: ${(error as Error).message}`)
    }
  }

  // Text Editor Handlers
  const handleOpenTextEditor = () => {
    const { originalCSMContent, csmFilename } = useAppStore.getState()
    
    if (!originalCSMContent) {
      alert('No CSM file loaded.\n\nPlease load a CSM file first using File → Open CSM.')
      return
    }
    
    setCurrentCSMContent(originalCSMContent)
    setCurrentCSMFilename(csmFilename || 'untitled.csm')
    setTextEditorOpen(true)
  }

  const handleTextEditorSave = async (newContent: string) => {
    try {
      log('TextEditor', 'info', 'Saving CSM changes and rebuilding geometry...')
      
      // Check ESP server is available
      const health = await checkESPHealth()
      if (!health.esp_available) {
        log('ESP', 'error', `ESP server not available: ${health.message}`)
        alert(`ESP server not available: ${health.message}\n\nMake sure the ESP gateway server is running on port 8081.`)
        return
      }
      
      // Update the content
      setCurrentCSMContent(newContent)
      
      // Parse for imports
      const { parseCSMImports } = await import('./utils/csmParser')
      const imports = parseCSMImports(newContent)
      
      // Get project folder handle for auto-loading dependencies
      const { projectFolderHandle } = useAppStore.getState()
      
      let response
      
      if (imports.length > 0) {
        log('Geometry', 'info', `Found ${imports.length} dependencies: ${imports.join(', ')}`)
        
        // Try to auto-load dependencies from project folder
        const dependencies = new Map<string, File>()
        
        for (const importPath of imports) {
          let loaded = false
          
          if (projectFolderHandle) {
            try {
              log('Geometry', 'info', `Attempting to auto-load: ${importPath}`)
              const depHandle = await projectFolderHandle.getFileHandle(importPath)
              const depFile = await depHandle.getFile()
              dependencies.set(importPath, depFile)
              log('Geometry', 'success', `Auto-loaded: ${depFile.name}`)
              loaded = true
            } catch (error) {
              log('Geometry', 'warning', `Could not auto-load ${importPath}`)
            }
          }
          
          // Fallback: prompt user if not auto-loaded
          if (!loaded) {
            try {
              log('Geometry', 'info', `Waiting for: ${importPath}`)
              
              const [depHandle] = await window.showOpenFilePicker({
                types: [{
                  description: `CSM Dependency: ${importPath}`,
                  accept: { 
                    'application/stp': ['.stp', '.step'],
                    'application/iges': ['.igs', '.iges'],
                    'application/octet-stream': ['.egads'],
                    '*/*': []
                  }
                }],
                suggestedName: importPath,
                multiple: false
              })
              
              const depFile = await depHandle.getFile()
              log('Geometry', 'success', `Loaded: ${depFile.name}`)
              dependencies.set(importPath, depFile)
              
            } catch (depError) {
              if ((depError as any).name === 'AbortError') {
                log('Geometry', 'warning', `User cancelled dependency selection: ${importPath}`)
                alert(`Missing dependency: ${importPath}\n\nCannot rebuild geometry without all dependencies.`)
                return
              }
              throw depError
            }
          }
        }
        
        // Build with dependencies
        setEspLoading(true)
        setEspLoadingMessage('Rebuilding CSM geometry')
        setEspLogLines([])
        
        response = await buildCSMWithDepsStreaming(newContent, dependencies, (logLine) => {
          const level = detectESPLogLevel(logLine)
          log('ESP', level, logLine)
          setEspLogLines(prev => [...prev, logLine])
        })
        
        setEspLoading(false)
        
      } else {
        // No imports - use standard build
        setEspLoading(true)
        setEspLoadingMessage('Rebuilding CSM geometry')
        setEspLogLines([])
        
        response = await buildCSM(newContent)
        
        setEspLoading(false)
      }
      
      if (!response.success) {
        log('ESP', 'error', `Build failed: ${response.message}`)
        throw new Error(response.message)
      }
      
      // Add server build log
      if (response.build_log?.length) {
        response.build_log.forEach(line => {
          const level = detectESPLogLevel(line)
          log('ESP', level, line)
        })
      }
      
      log('ESP', 'success', 'Geometry rebuilt successfully')
      
      // Convert and reload surfaces
      const surfaces = convertESPRegionsToSurfaces(response, { centerAndScale: true })
      loadESPSurfaces(surfaces, currentCSMFilename, newContent)
      
      log('TextEditor', 'success', 'Changes saved and geometry updated!')
      
    } catch (error) {
      setEspLoading(false)
      log('TextEditor', 'error', `Failed to save: ${(error as Error).message}`)
      alert(`Failed to save and rebuild: ${(error as Error).message}`)
    }
  }

  const handleTextEditorClose = () => {
    setTextEditorOpen(false)
  }

  return (
    <div className="app-container">
      <ProjectSetupWizard
        isOpen={showProjectSetup}
        onClose={() => setShowProjectSetup(false)}
        onLoadMesh={handleLoadMesh}
        onLoadCSM={handleLoadCSM}
        onImportCAD={handleImportGeometry}
      />
      
      <MenuBar 
        onNewProject={() => setShowProjectSetup(true)}
        onOpen={handleOpen}
        onOpenProjectFolder={handleOpenProjectFolder}
        onSave={handleSave}
        onValidate={handleValidate}
        onExit={handleExit}
        onSettings={handleSettings}
        onLoadMesh={handleLoadMesh}
        onLoadCSM={handleLoadCSM}
        onImportGeometry={handleImportGeometry}
        onCreateFarfield={handleCreateFarfield}
        onExportCSM={handleExportCSM}
        onEditCSM={handleOpenTextEditor}
      />
      <StatusBar 
        onOpenThermodynamicsWizard={() => setShowThermoWizardFromStatusBar(true)}
        onOpenTurbulenceWizard={() => setShowTurbulenceWizardFromStatusBar(true)}
        onOpenInitializationWizard={() => setShowInitializationWizard(true)}
        onOpenTimeAccuracyWizard={() => setShowTimeAccuracyWizard(true)}
        onOpenVisualizationWizard={() => setShowVisualizationWizard(true)}
        onSaveConfig={handleSave}
      />
      <PanelGroup direction="horizontal">
        {/* Left Panel Group - contains project folder, tree, editor, and surfaces vertically stacked */}
        <Panel defaultSize={25} minSize={15} maxSize={40}>
          <PanelGroup direction="vertical">
            {/* Project Folder Panel - Top */}
            <Panel 
              id="project-folder-panel"
              ref={projectFolderPanelRef}
              defaultSize={25} 
              minSize={10}
              collapsible={true}
              collapsedSize={3}
            >
              <ProjectFolderPanel 
                panelRef={projectFolderPanelRef}
                onLoadConfig={handleLoadConfigFromHandle}
                onLoadMesh={handleLoadMeshFromHandle}
                onLoadCSM={handleLoadCSMFromHandle}
              />
            </Panel>
            
            {/* Vertical Resize Handle */}
            <PanelResizeHandle className="resize-handle resize-handle-vertical" />
            
            {/* Tree Panel */}
            <Panel 
              id="tree-panel"
              ref={treePanelRef}
              defaultSize={25} 
              minSize={15}
              collapsible={true}
              collapsedSize={3}
            >
              <TreePanel panelRef={treePanelRef} />
            </Panel>
            
            {/* Vertical Resize Handle */}
            <PanelResizeHandle className="resize-handle resize-handle-vertical" />
            
            {/* Editor Panel - Middle */}
            <Panel 
              id="editor-panel"
              ref={editorPanelRef}
              defaultSize={25} 
              minSize={15}
              collapsible={true}
              collapsedSize={3}
            >
              <EditorPanel 
                panelRef={editorPanelRef}
                treePanelRef={treePanelRef}
                openThermoWizard={showThermoWizardFromStatusBar} 
                onCloseThermoWizard={() => setShowThermoWizardFromStatusBar(false)}
                openTurbulenceWizard={showTurbulenceWizardFromStatusBar}
                onCloseTurbulenceWizard={() => setShowTurbulenceWizardFromStatusBar(false)}
                openInitializationWizard={showInitializationWizard}
                onCloseInitializationWizard={() => setShowInitializationWizard(false)}
                openTimeAccuracyWizard={showTimeAccuracyWizard}
                onCloseTimeAccuracyWizard={() => setShowTimeAccuracyWizard(false)}
                openVisualizationWizard={showVisualizationWizard}
                onCloseVisualizationWizard={() => setShowVisualizationWizard(false)}
              />
            </Panel>
            
            {/* Vertical Resize Handle */}
            <PanelResizeHandle className="resize-handle resize-handle-vertical" />
            
            {/* Mesh Groups Panel - Bottom */}
            <Panel 
              id="mesh-groups-panel"
              ref={meshGroupsPanelRef}
              defaultSize={25} 
              minSize={15}
              collapsible={true}
              collapsedSize={3}
            >
              <TagsPanel panelRef={meshGroupsPanelRef} />
            </Panel>
          </PanelGroup>
        </Panel>

        {/* Horizontal Resize Handle */}
        <PanelResizeHandle className="resize-handle resize-handle-horizontal" />

        {/* Right Panel - 3D Viewport + Console (with optional Text Editor split) */}
        <Panel defaultSize={75} minSize={40}>
          <PanelGroup direction="vertical">
            {/* Top: Viewport or split Viewport/Editor */}
            <Panel defaultSize={70} minSize={30}>
              {textEditorOpen ? (
                <PanelGroup direction="horizontal">
                  {/* Text Editor */}
                  <Panel defaultSize={50} minSize={30}>
                    <TextEditor
                      content={currentCSMContent}
                      filename={currentCSMFilename}
                      onSave={handleTextEditorSave}
                      onClose={handleTextEditorClose}
                    />
                  </Panel>
                  <PanelResizeHandle className="resize-handle resize-handle-horizontal" />
                  {/* 3D Viewport */}
                  <Panel defaultSize={50} minSize={30}>
                    <Viewport3D />
                  </Panel>
                </PanelGroup>
              ) : (
                <Viewport3D />
              )}
            </Panel>
            
            <PanelResizeHandle className="resize-handle resize-handle-vertical" />
            
            {/* Bottom: Console */}
            <Panel defaultSize={30} minSize={15}>
              <ConsolePanel />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {/* Modals */}
      {showNewProjectWizard && (
        <NewProjectWizard
          onClose={() => setShowNewProjectWizard(false)}
          onCreate={handleCreateProject}
        />
      )}

      {showSettingsDialog && (
        <SettingsDialog
          onClose={() => setShowSettingsDialog(false)}
        />
      )}

      {showValidationErrors && (
        <ValidationErrorDialog
          errors={validationErrors}
          onCancel={() => setShowValidationErrors(false)}
          onContinue={async () => {
            setShowValidationErrors(false)
            // Save anyway - bypass validation
            try {
              const configToSave = cleanConfigForSave(configData)
              await saveJsonFile(configToSave, 'config.json')
              console.log('File saved successfully (validation bypassed)')
            } catch (error) {
              console.error('Error saving file:', error)
            }
          }}
        />
      )}

      {showFarfieldWizard && (() => {
        const { availableTags } = useAppStore.getState()
        const boundingBox = calculateBoundingBox(availableTags)
        
        return (
          <FarfieldWizard
            isOpen={showFarfieldWizard}
            onClose={() => setShowFarfieldWizard(false)}
            boundingBox={boundingBox}
            onCreateFarfield={handleFarfieldCreation}
          />
        )
      })()}
      
      {showLumpDialog && pendingMesh && (() => {
        // Calculate tag name counts
        const tagNameCounts = new Map<string, number>()
        pendingMesh.parsedMesh.regions.forEach((region: any) => {
          tagNameCounts.set(region.name, (tagNameCounts.get(region.name) || 0) + 1)
        })
        
        // Sort by tag number (first appearance) to match lumping order
        const sortedRegions = [...pendingMesh.parsedMesh.regions].sort((a: any, b: any) => a.tag - b.tag)
        const uniqueNames: string[] = []
        const seenNames = new Set<string>()
        sortedRegions.forEach((region: any) => {
          if (!seenNames.has(region.name)) {
            uniqueNames.push(region.name)
            seenNames.add(region.name)
          }
        })
        
        return (
          <div className="modal-overlay" onClick={() => {
            setShowLumpDialog(false)
            setPendingMesh(null)
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Mesh Loading Options</h2>
              <p>
                The mesh file contains <strong>{pendingMesh.parsedMesh.regions.length}</strong> region(s) with duplicate tag names.
              </p>
              <div className="modal-info">
                <p><strong>Lumped output mesh would contain {uniqueNames.length} surface(s):</strong></p>
                <ul style={{ marginTop: '8px', marginBottom: '0', maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueNames.map((name, index) => {
                    const count = tagNameCounts.get(name) || 0
                    return (
                      <li key={name}>
                        Tag {index + 1}: <strong>{name}</strong> ({count} region{count > 1 ? 's' : ''})
                      </li>
                    )
                  })}
                </ul>
              </div>
              <p>
                Do you want to lump surfaces with the same tag name together?
              </p>
              <div className="modal-info">
                <p><strong>Lump:</strong> Merge all regions with the same tag name into a single surface.</p>
                <p><strong>Don't Lump:</strong> Keep each region as a separate surface.</p>
              </div>
              <div className="modal-buttons">
                <button onClick={() => handleLumpChoice(true)}>Lump</button>
                <button onClick={() => handleLumpChoice(false)}>Don't Lump</button>
              </div>
            </div>
          </div>
        )
      })()}
      
      {/* ESP Loading Overlay */}
      {espLoading && (
        <LoadingOverlay
          message={espLoadingMessage}
          logLines={espLogLines}
        />
      )}
    </div>
  )
}

export default App
