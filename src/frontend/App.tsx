import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import TreePanel from './components/TreePanel/TreePanel'
import EditorPanel from './components/EditorPanel/EditorPanel'
import SurfacesPanel from './components/SurfacesPanel/SurfacesPanel'
import Viewport3D from './components/Viewport3D/Viewport3D'
import MenuBar from './components/MenuBar/MenuBar'
import NewProjectWizard, { ProjectConfig } from './components/MenuBar/NewProjectWizard'
import SettingsDialog from './components/SettingsDialog/SettingsDialog'
import ValidationErrorDialog from './components/ValidationErrorDialog/ValidationErrorDialog'
import { useAppStore } from './store/appStore'
import { pickMeshFile, parseMeshFile } from './utils/meshParser'
import { saveJsonFile, openJsonFile, promptForDirectoryAccess } from './utils/fileUtils'
import { validateAgainstSchema, ValidationErrorItem } from './utils/schemaValidator'
import { loadMeshFromDirectory } from './utils/meshLoader'
import { transformLoadedConfig } from './utils/configTransform'
import './App.css'

function App() {
  const [showNewProjectWizard, setShowNewProjectWizard] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showLumpDialog, setShowLumpDialog] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[]>([])
  const [pendingMesh, setPendingMesh] = useState<{ parsedMesh: any; filename: string } | null>(null)
  const [pendingConfig, setPendingConfig] = useState<any>(null) // Store config until mesh loads
  const { configData, initializeConfig, loadMesh, availableSurfaces, setConfigData } = useAppStore()

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
        const transformedConfig = transformLoadedConfig(loadedConfig, currentSurfaces)
        setConfigData(transformedConfig)
        console.log('[App] Transformed BCs:', transformedConfig.HyperSolve?.['boundary conditions'])
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
    if (cleaned.HyperSolve?.['boundary conditions']) {
      cleaned.HyperSolve['boundary conditions'] = cleaned.HyperSolve['boundary conditions'].map((bc: any) => {
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
    if (cleaned.HyperSolve?.states && typeof cleaned.HyperSolve.states === 'object') {
      const cleanedStates: any = {}
      Object.entries(cleaned.HyperSolve.states).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object') {
          const { id, name, ...stateClean } = value as any
          cleanedStates[key] = stateClean
        } else {
          cleanedStates[key] = value
        }
      })
      cleaned.HyperSolve.states = cleanedStates
    }
    
    return cleaned
  }

  const handleSave = async () => {
    console.log('Save file')
    console.log('Current config:', configData)
    console.log('Boundary conditions:', configData.HyperSolve?.['boundary conditions'])
    console.log('Num BCs:', configData.HyperSolve?.['boundary conditions']?.length || 0)
    
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

  const handleValidate = () => {
    console.log('Validate configuration')
    // TODO: Validate configuration against schema
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
        const transformedConfig = transformLoadedConfig(pendingConfig, currentSurfaces)
        setConfigData(transformedConfig)
        console.log('[App] Configuration set with BCs:', transformedConfig.HyperSolve?.['boundary conditions'])
        setPendingConfig(null)
      }
    }
    setShowLumpDialog(false)
    setPendingMesh(null)
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

        {/* Right Panel - 3D Viewport */}
        <Panel defaultSize={75} minSize={40}>
          <Viewport3D />
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
