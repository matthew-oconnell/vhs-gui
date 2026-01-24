import { useState, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import TreePanel from './components/TreePanel/TreePanel'
import EditorPanel from './components/EditorPanel/EditorPanel'
import SurfacesPanel from './components/SurfacesPanel/SurfacesPanel'
import Viewport3D from './components/Viewport3D/Viewport3D'
import MenuBar from './components/MenuBar/MenuBar'
import NewProjectWizard, { ProjectConfig } from './components/MenuBar/NewProjectWizard'
import SettingsDialog from './components/SettingsDialog/SettingsDialog'
import ValidationErrorDialog from './components/ValidationErrorDialog/ValidationErrorDialog'
import FarfieldWizard from './components/FarfieldWizard/FarfieldWizard'
import ConsolePanel from './components/ConsolePanel/ConsolePanel'
import { useAppStore } from './store/appStore'
import { useConsoleStore } from './store/consoleStore'
import { pickMeshFile, parseMeshFile } from './utils/meshParser'
import { saveJsonFile, openJsonFile, promptForDirectoryAccess } from './utils/fileUtils'
import { validateAgainstSchema, ValidationErrorItem } from './utils/schemaValidator'
import { loadMeshFromDirectory } from './utils/meshLoader'
import { transformLoadedConfig } from './utils/configTransform'
import { loadSchemaWithSolverKey } from './utils/schemaUtils'
import { buildCSM, checkESPHealth, buildCSMWithDepsStreaming } from './utils/espApi'
import { convertESPRegionsToSurfaces } from './utils/espAdapter'
import { calculateBoundingBox, BoundingBox } from './utils/geometryUtils'
import './App.css'

function App() {
  const [showNewProjectWizard, setShowNewProjectWizard] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showLumpDialog, setShowLumpDialog] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[]>([])
  const [pendingMesh, setPendingMesh] = useState<{ parsedMesh: any; filename: string } | null>(null)
  const [pendingConfig, setPendingConfig] = useState<any>(null) // Store config until mesh loads
  const [showFarfieldWizard, setShowFarfieldWizard] = useState(false)
  const [importedGeometryFile, setImportedGeometryFile] = useState<File | null>(null)
  
  const { configData, initializeConfig, loadMesh, loadESPSurfaces, availableSurfaces, setConfigData, setRootSolverKey } = useAppStore()
  const { setCollapsed, isCollapsed, log } = useConsoleStore()

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

  // Load schema on startup to determine root solver key (Vulcan or HyperSolve)
  useEffect(() => {
    const loadSchemaOnStartup = async () => {
      try {
        const { schema, rootSolverKey } = await loadSchemaWithSolverKey()
        if (rootSolverKey) {
          console.log(`[App] Setting root solver key to: ${rootSolverKey}`)
          setRootSolverKey(rootSolverKey)
        } else {
          console.warn('[App] Could not determine root solver key from schema, defaulting to HyperSolve')
          setRootSolverKey('HyperSolve')
        }
      } catch (error) {
        console.error('[App] Error loading schema on startup:', error)
        setRootSolverKey('HyperSolve') // Default fallback
      }
    }
    
    loadSchemaOnStartup()
  }, [setRootSolverKey])

  const handleNew = () => {
    setShowNewProjectWizard(true)
  }

  const handleCreateProject = (config: ProjectConfig) => {
    console.log('Creating new project with config:', config)
    initializeConfig(config)
    console.log('Config initialized, check store for updated configData')
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
        const currentSurfaces = useAppStore.getState().availableSurfaces
        console.log('[App] Transforming config with surfaces:', currentSurfaces.length)
        console.log('[App] Available surface tags:', currentSurfaces.map(s => `${s.metadata.tagName}=${s.metadata.tag}`))
        const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
        const transformedConfig = transformLoadedConfig(loadedConfig, currentSurfaces, rootKey)
        setConfigData(transformedConfig)
        console.log('[App] Transformed BCs:', (transformedConfig as any)[rootKey]?.['boundary conditions'])
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
    availableSurfaces.forEach(surface => {
      tagToName.set(surface.metadata.tag, surface.metadata.tagName)
    })
    
    // Remove 'id' and 'name' from boundary conditions
    // Convert mesh boundary tags from numbers to surface names
    const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
    const rootConfig = (cleaned as any)[rootKey]
    if (rootConfig?.['boundary conditions']) {
      rootConfig['boundary conditions'] = rootConfig['boundary conditions'].map((bc: any) => {
        const { id, name, ...bcClean } = bc
        
        // Convert mesh boundary tags to surface names
        if (bcClean['mesh boundary tags'] !== undefined) {
          const tags = bcClean['mesh boundary tags']
          if (Array.isArray(tags)) {
            bcClean['mesh boundary tags'] = tags.map(tag => 
              tagToName.get(tag) || tag
            )
          } else if (typeof tags === 'number') {
            const surfaceName = tagToName.get(tags)
            bcClean['mesh boundary tags'] = surfaceName ? [surfaceName] : [tags]
          }
        }
        
        return bcClean
      })
    }
    
    // Remove 'id' and 'name' from states if they have them
    if (rootConfig?.states && typeof rootConfig.states === 'object') {
      const cleanedStates: any = {}
      Object.entries(rootConfig.states).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object') {
          const { id, name, ...stateClean } = value as any
          cleanedStates[key] = stateClean
        } else {
          cleanedStates[key] = value
        }
      })
      rootConfig.states = cleanedStates
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
    const availableSurfaces = useAppStore.getState().availableSurfaces
    const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
    const rootConfig = (configData as any)[rootKey]
    const boundaryConditions = rootConfig?.['boundary conditions'] || []
    
    if (availableSurfaces.length > 0) {
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
      const unassignedSurfaces = availableSurfaces.filter(
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
      log('Geometry', 'info', 'Opening file picker...')
      log('Geometry', 'info', 'Opening file picker...')
      
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
      log('ESP', 'info', `CSM loaded: ${csmContent.split('\n').length} lines`)
      
      // Check for import/restore statements
      const { parseCSMImports } = await import('./utils/csmParser')
      const imports = parseCSMImports(csmContent)
      
      let response
      
      if (imports.length > 0) {
        log('Geometry', 'info', `Found ${imports.length} dependencies: ${imports.join(', ')}`)
        
        // Prompt user for each dependency file
        const dependencies = new Map<string, File>()
        
        for (const importPath of imports) {
          try {
            log('Geometry', 'info', `Select dependency: ${importPath}`)
            log('Geometry', 'info', `Select dependency: ${importPath}`)
            
            const [depHandle] = await window.showOpenFilePicker({
              types: [{
                description: `Required file: ${importPath}`,
                accept: { '*/*': [] }  // Accept any file type
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
              log('Geometry', 'warning', `CSM requires ${importPath} - cancelled`)
              alert(`CSM file requires: ${importPath}\n\nCancelling CSM load.`)
              return
            }
            throw depError
          }
        }
        
        // Build CSM with dependencies
        log('ESP', 'info', `Building CSM with ${dependencies.size} dependencies...`)
        
        const { buildCSMWithDepsStreaming } = await import('./utils/espApi')
        response = await buildCSMWithDepsStreaming(csmContent, dependencies, (logLine) => {
          log('ESP', 'debug', logLine)
        })
        
      } else {
        // No imports - use standard build
        log('ESP', 'info', 'Building CSM (no dependencies)...')
        response = await buildCSM(csmContent)
      }
      
      if (!response.success) {
        log('ESP', 'error', `Build failed: ${response.message}`)
        throw new Error(response.message)
      }
      
      // Add server build log (only for non-streaming builds)
      if (response.build_log?.length) {
        response.build_log.forEach(line => log('ESP', 'debug', line))
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
        const currentSurfaces = useAppStore.getState().availableSurfaces
        console.log('[App] Available surfaces after mesh load:', currentSurfaces.length)
        console.log('[App] Available surface tags:', currentSurfaces.map(s => `${s.metadata.tagName}=${s.metadata.tag}`))
        const rootKey = useAppStore.getState().rootSolverKey || 'HyperSolve'
        const transformedConfig = transformLoadedConfig(pendingConfig, currentSurfaces, rootKey)
        setConfigData(transformedConfig)
        console.log('[App] Configuration set with BCs:', (transformedConfig as any)[rootKey]?.['boundary conditions'])
        setPendingConfig(null)
      }
    }
    setShowLumpDialog(false)
    setPendingMesh(null)
  }

  const handleExportCSM = async () => {
    const { csmFilename, exportGeneratedCSM, csmBuilder } = useAppStore.getState()
    
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
      
      // Generate CSM with import and mark (mark saves stack for later restore)
      // Quote filename to handle spaces and special characters
      const csmContent = `# Imported geometry from ${file.name}
import "${file.name}"
mark
`
      
      log('ESP', 'info', 'CSM generated', { preview: csmContent.trim() })
      
      // Build CSM with the STEP file as dependency
      const dependencies = new Map<string, File>()
      dependencies.set(file.name, file)
      
      log('ESP', 'info', 'Sending STEP file to ESP server...')
      
      const response = await buildCSMWithDepsStreaming(csmContent, dependencies, (logLine) => {
        // Stream ESP output to console
        log('ESP', 'debug', logLine)
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
      
      // Record the initial CSM as base (this includes import, attribute, mark)
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
    
    const { availableSurfaces } = useAppStore.getState()
    
    if (availableSurfaces.length === 0) {
      alert('No geometry loaded.\n\nPlease import geometry first using File → Import Geometry.')
      return
    }
    
    if (!importedGeometryFile) {
      alert('No imported geometry file found.\n\nPlease use File → Import Geometry to import a STEP file first.')
      return
    }
    
    // Calculate bounding box
    const boundingBox = calculateBoundingBox(availableSurfaces)
    console.log('[App] Bounding box:', boundingBox)
    
    // Show wizard
    setShowFarfieldWizard(true)
  }

  const handleFarfieldCreation = async (multiplier: number) => {
    console.log('[App] Creating farfield with multiplier:', multiplier)
    
    try {
      setIsLoading(true)
      setLoadingMessage('Creating farfield domain')
      setLoadingLog([])
      
      // Local array to accumulate ESP log (state updates are async)
      const espLogMessages: string[] = []
      
      const { availableSurfaces, csmBuilder } = useAppStore.getState()
      
      if (!importedGeometryFile) {
        throw new Error('No imported geometry file')
      }
      
      // Calculate farfield parameters
      const boundingBox = calculateBoundingBox(availableSurfaces)
      const radius = boundingBox.characteristicLength * multiplier
      
      setLoadingLog([
        `Geometry center: (${boundingBox.center.x.toFixed(2)}, ${boundingBox.center.y.toFixed(2)}, ${boundingBox.center.z.toFixed(2)})`,
        `Characteristic length: ${boundingBox.characteristicLength.toFixed(2)}`,
        `Multiplier: ${multiplier}`,
        `Farfield radius: ${radius.toFixed(2)}`,
        ''
      ])
      
      // Record operations in CSMBuilder
      csmBuilder.recordSphere(
        boundingBox.center.x,
        boundingBox.center.y,
        boundingBox.center.z,
        radius,
        { description: `Farfield sphere with radius ${radius.toFixed(2)}` }
      )
      csmBuilder.recordOperation('attribute', `attribute bc_name $farfield`, { description: 'Set bc_name to farfield' })
      csmBuilder.recordRestore({ description: 'Restore marked vehicle (swaps stack: sphere becomes bottom)' })
      csmBuilder.recordSubtract({ description: 'Subtract vehicle from farfield sphere' })
      
      // Generate the complete CSM
      const generatedCSM = csmBuilder.export()
      console.log('[App] Generated CSM:\n', generatedCSM)
      
      setLoadingMessage('Building farfield geometry')
      setLoadingLog(prev => [...prev, 'Generated CSM:', generatedCSM, '', 'Sending to ESP server...'])
      
      // Build CSM with STEP file dependency
      const dependencies = new Map<string, File>()
      dependencies.set(importedGeometryFile.name, importedGeometryFile)
      
      const response = await buildCSMWithDepsStreaming(generatedCSM, dependencies, (logLine) => {
        console.log('[ESP]', logLine)  // Log to console for debugging
        setLoadingLog(prev => [...prev, logLine])
        espLogMessages.push(logLine)  // Accumulate in local array
      })
      
      if (!response.success) {
        setIsLoading(false)
        throw new Error(response.message)
      }
      
      console.log('[App] Farfield build successful:', response.message)
      console.log('[App] Got', response.regions?.length || 0, 'regions')
      
      // Check if we actually got any geometry
      if (!response.regions || response.regions.length === 0) {
        setIsLoading(false)
        throw new Error('ESP farfield build completed but no geometry was created. Check the ESP error log for details.')
      }
      
      setLoadingMessage('Processing geometry')
      setLoadingLog(prev => [...prev, '', `✓ Received ${response.regions?.length || 0} faces`])
      
      // Convert ESP regions to surfaces
      const surfaces = convertESPRegionsToSurfaces(response, { centerAndScale: true })
      console.log('[App] Converted to', surfaces.length, 'surfaces')
      
      // Load into store
      const { loadESPSurfaces } = useAppStore.getState()
      loadESPSurfaces(surfaces, `${importedGeometryFile.name} (with farfield)`, generatedCSM)
      
      setIsLoading(false)
      setLoadingMessage('')
      setLoadingLog([])
      
      console.log('[App] Farfield created successfully:', surfaces.length, 'surfaces')
      // Success - farfield domain is now visible in 3D viewer
      
    } catch (error) {
      console.error('[App] Error creating farfield:', error)
      log('ESP', 'error', `Failed to create farfield: ${(error as Error).message}`)
    }
  }

  return (
    <div className="app-container">
      <MenuBar 
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onValidate={handleValidate}
        onExit={handleExit}
        onSettings={handleSettings}
        onLoadMesh={handleLoadMesh}
        onLoadCSM={handleLoadCSM}
        onImportGeometry={handleImportGeometry}
        onCreateFarfield={handleCreateFarfield}
        onExportCSM={handleExportCSM}
      />
      <PanelGroup direction="horizontal">
        {/* Left Panel Group - contains tree, editor, and surfaces vertically stacked */}
        <Panel defaultSize={25} minSize={15} maxSize={40}>
          <PanelGroup direction="vertical">
            {/* Tree Panel - Top */}
            <Panel defaultSize={33} minSize={15}>
              <TreePanel />
            </Panel>
            
            {/* Vertical Resize Handle */}
            <PanelResizeHandle className="resize-handle resize-handle-vertical" />
            
            {/* Editor Panel - Middle */}
            <Panel defaultSize={34} minSize={15}>
              <EditorPanel />
            </Panel>
            
            {/* Vertical Resize Handle */}
            <PanelResizeHandle className="resize-handle resize-handle-vertical" />
            
            {/* Surfaces Panel - Bottom */}
            <Panel defaultSize={33} minSize={15}>
              <SurfacesPanel />
            </Panel>
          </PanelGroup>
        </Panel>

        {/* Horizontal Resize Handle */}
        <PanelResizeHandle className="resize-handle resize-handle-horizontal" />

        {/* Right Panel - 3D Viewport + Console */}
        <Panel defaultSize={75} minSize={40}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            {/* 3D Viewport */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <Viewport3D />
            </div>
            
            {/* Console Panel - explicitly visible for debugging */}
            <div style={{ flexShrink: 0 }}>
              <ConsolePanel />
            </div>
          </div>
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
        const { availableSurfaces } = useAppStore.getState()
        const boundingBox = calculateBoundingBox(availableSurfaces)
        
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
    </div>
  )
}

export default App
