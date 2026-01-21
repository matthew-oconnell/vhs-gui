import { create } from 'zustand'
import { TreeNode } from '../utils/schemaParser'
import { Surface } from '../types/surface'
import { ConfigData, BoundaryCondition, State } from '../types/config'
import { ParsedMesh, RegionData } from '../utils/meshParser'

// Helper to ensure deep immutable updates
const updateConfig = (oldConfig: ConfigData, updates: Partial<ConfigData>): ConfigData => {
  return JSON.parse(JSON.stringify({ ...oldConfig, ...updates }))
}

export interface CameraSettings {
  rotateSpeed: number
  zoomSpeed: number
  panSpeed: number
  invertZoom: boolean
}

export interface OverlayPosition {
  x: number
  y: number
}

export interface SurfaceRenderSettings {
  surfaceColor: string
  meshColor: string
  renderMode: 'surface' | 'mesh' | 'both'
  opacity: number
}

// Global color mode for all surfaces
export type ColorMode = 'assigned-status' | 'bc-type' | 'random' | 'solid'

export interface GlobalRenderSettings {
  colorMode: ColorMode
  hideAssignedSurfaces: boolean
  unassignedColor: string
  assignedColor: string
  solidColor: string
}

interface AppState {
  selectedNode: TreeNode | null
  setSelectedNode: (node: TreeNode | null) => void
  selectedSurface: Surface | null
  setSelectedSurface: (surface: Surface | null) => void
  selectedBC: BoundaryCondition | null
  setSelectedBC: (bc: BoundaryCondition | null) => void
  selectedState: State | null
  setSelectedState: (state: State | null) => void
  selectedViz: { data: any; index: number } | null
  setSelectedViz: (viz: { data: any; index: number } | null) => void
  selectedInitRegion: { data: any; index: number } | null
  setSelectedInitRegion: (region: { data: any; index: number } | null) => void
  soloBC: BoundaryCondition | null
  setSoloBC: (bc: BoundaryCondition | null) => void
  configData: ConfigData
  setConfigData: (configData: ConfigData) => void
  rootSolverKey: string | null
  setRootSolverKey: (key: string | null) => void
  availableSurfaces: Surface[]
  totalVertices: number
  totalFaces: number
  cameraSettings: CameraSettings
  updateCameraSettings: (settings: Partial<CameraSettings>) => void
  overlayPosition: OverlayPosition
  setOverlayPosition: (position: OverlayPosition) => void
  surfaceVisibility: Record<string, boolean>
  toggleSurfaceVisibility: (surfaceId: string) => void
  surfaceWireframe: Record<string, boolean>
  toggleSurfaceWireframe: (surfaceId: string) => void
  surfaceRenderSettings: Record<string, SurfaceRenderSettings>
  updateSurfaceRenderSettings: (surfaceId: string, settings: Partial<SurfaceRenderSettings>) => void
  globalRenderSettings: GlobalRenderSettings
  setColorMode: (mode: ColorMode) => void
  toggleHideAssignedSurfaces: () => void
  setUnassignedColor: (color: string) => void
  setAssignedColor: (color: string) => void
  setSolidColor: (color: string) => void
  addBoundaryCondition: (bc: BoundaryCondition) => void
  updateBoundaryCondition: (id: string, updates: Partial<BoundaryCondition>) => void
  deleteBoundaryCondition: (id: string) => void
  addState: (state: State) => void
  updateState: (id: string, updates: Partial<State>) => void
  deleteState: (id: string) => void
  updateThermodynamics: (thermoConfig: any) => void
  updateProperty: (path: string, key: string, value: any) => void
  initializeConfig: (projectConfig: any) => void
  loadMesh: (parsedMesh: ParsedMesh, filename: string, lump?: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node, selectedSurface: null, selectedBC: null, selectedState: null, selectedViz: null, selectedInitRegion: null }),
  selectedSurface: null,
  setSelectedSurface: (surface) => set({ selectedSurface: surface, selectedNode: null, selectedBC: null, selectedState: null, selectedViz: null, selectedInitRegion: null }),
  selectedBC: null,
  setSelectedBC: (bc) => set({ selectedBC: bc, selectedNode: null, selectedSurface: null, selectedState: null, selectedViz: null, selectedInitRegion: null }),
  selectedState: null,
  setSelectedState: (state) => set({ selectedState: state, selectedNode: null, selectedSurface: null, selectedBC: null, selectedViz: null, selectedInitRegion: null }),
  selectedViz: null,
  setSelectedViz: (viz) => set({ selectedViz: viz, selectedNode: null, selectedSurface: null, selectedBC: null, selectedState: null, selectedInitRegion: null }),
  selectedInitRegion: null,
  setSelectedInitRegion: (region) => set({ selectedInitRegion: region, selectedNode: null, selectedSurface: null, selectedBC: null, selectedState: null, selectedViz: null }),
  soloBC: null,
  setSoloBC: (bc) => set({ soloBC: bc }),
  
  // Initialize with empty configuration
  configData: {
    HyperSolve: {
      'boundary conditions': [],
      states: {}
    }
  },
  
  setConfigData: (configData) => set({ configData }),
  
  // Root solver key from schema (e.g., 'Vulcan' or 'HyperSolve')
  rootSolverKey: null,
  setRootSolverKey: (key) => set((state) => {
    // When root solver key changes, update the default config structure
    const currentConfig = state.configData
    const oldKey = state.rootSolverKey || 'HyperSolve'
    
    // If the key changed and we have default config under the old key, migrate it
    if (key && key !== oldKey && currentConfig[oldKey]) {
      const oldData = currentConfig[oldKey]
      const newConfig = { ...currentConfig }
      delete newConfig[oldKey]
      newConfig[key] = oldData
      return { rootSolverKey: key, configData: newConfig }
    }
    
    // If no config exists yet under any key, create the default structure
    if (key && !currentConfig[key]) {
      return {
        rootSolverKey: key,
        configData: {
          [key]: {
            'boundary conditions': [],
            states: {}
          }
        }
      }
    }
    
    return { rootSolverKey: key }
  }),
  
  availableSurfaces: [],
  totalVertices: 0,
  totalFaces: 0,
  
  // Camera settings with defaults matching Paraview behavior
  cameraSettings: {
    rotateSpeed: 1.5,
    zoomSpeed: 1.2,
    panSpeed: 0.8,
    invertZoom: true // Pulling back zooms in (Paraview-like)
  },
  
  updateCameraSettings: (settings) => set((state) => ({
    cameraSettings: { ...state.cameraSettings, ...settings }
  })),
  
  // Overlay position with default in top-left
  overlayPosition: {
    x: 12,
    y: 12
  },
  
  setOverlayPosition: (position) => set({ overlayPosition: position }),
  
  // Surface visibility - all surfaces visible by default
  surfaceVisibility: {},
  
  toggleSurfaceVisibility: (surfaceId) => set((state) => ({
    surfaceVisibility: {
      ...state.surfaceVisibility,
      [surfaceId]: !(state.surfaceVisibility[surfaceId] ?? true)
    }
  })),
  
  // Surface wireframe - all surfaces solid by default
  surfaceWireframe: {},
  
  toggleSurfaceWireframe: (surfaceId) => set((state) => ({
    surfaceWireframe: {
      ...state.surfaceWireframe,
      [surfaceId]: !(state.surfaceWireframe[surfaceId] ?? false)
    }
  })),
  
  // Surface render settings with defaults
  surfaceRenderSettings: {},
  
  updateSurfaceRenderSettings: (surfaceId, settings) => set((state) => ({
    surfaceRenderSettings: {
      ...state.surfaceRenderSettings,
      [surfaceId]: {
        surfaceColor: state.surfaceRenderSettings[surfaceId]?.surfaceColor ?? '#4a9eff',
        meshColor: state.surfaceRenderSettings[surfaceId]?.meshColor ?? '#ffffff',
        renderMode: state.surfaceRenderSettings[surfaceId]?.renderMode ?? 'surface',
        opacity: state.surfaceRenderSettings[surfaceId]?.opacity ?? 1,
        ...settings
      }
    }
  })),
  
  // Global render settings with defaults
  globalRenderSettings: {
    colorMode: 'solid' as ColorMode,
    hideAssignedSurfaces: false,
    unassignedColor: '#ff4444',
    assignedColor: '#44aa44',
    solidColor: '#4a9eff'
  },
  
  setColorMode: (mode) => set((state) => ({
    globalRenderSettings: { ...state.globalRenderSettings, colorMode: mode }
  })),
  
  toggleHideAssignedSurfaces: () => set((state) => {
    const newHideAssigned = !state.globalRenderSettings.hideAssignedSurfaces
    const rootKey = state.rootSolverKey || 'HyperSolve'
    const boundaryConditions = (state.configData as any)[rootKey]?.['boundary conditions'] || []
    
    // Build new visibility map
    const newVisibility = { ...state.surfaceVisibility }
    
    // For each surface, check if it's assigned to any BC
    state.availableSurfaces.forEach(surface => {
      const surfaceTag = surface.metadata.tag
      const isAssigned = boundaryConditions.some((bc: any) => {
        const tags = bc['mesh boundary tags']
        if (Array.isArray(tags)) {
          return tags.includes(surfaceTag) || tags.includes(String(surfaceTag))
        } else if (typeof tags === 'number') {
          return tags === surfaceTag
        } else if (typeof tags === 'string') {
          return tags.split(',').map((s: string) => parseInt(s.trim(), 10)).includes(surfaceTag)
        }
        return false
      })
      
      if (isAssigned) {
        // Hide assigned surfaces when toggling on, show when toggling off
        newVisibility[surface.id] = !newHideAssigned
      }
    })
    
    return {
      globalRenderSettings: { 
        ...state.globalRenderSettings, 
        hideAssignedSurfaces: newHideAssigned 
      },
      surfaceVisibility: newVisibility
    }
  }),
  
  setUnassignedColor: (color) => set((state) => ({
    globalRenderSettings: { ...state.globalRenderSettings, unassignedColor: color }
  })),
  
  setAssignedColor: (color) => set((state) => ({
    globalRenderSettings: { ...state.globalRenderSettings, assignedColor: color }
  })),
  
  setSolidColor: (color) => set((state) => ({
    globalRenderSettings: { ...state.globalRenderSettings, solidColor: color }
  })),
  
  addBoundaryCondition: (bc) => set((state) => {
    const rootKey = state.rootSolverKey || 'HyperSolve'
    const rootConfig = (state.configData as any)[rootKey] || {}
    
    // If hideAssignedSurfaces is on, hide the surfaces being assigned to this BC
    let newVisibility = state.surfaceVisibility
    if (state.globalRenderSettings.hideAssignedSurfaces && bc['mesh boundary tags']) {
      newVisibility = { ...state.surfaceVisibility }
      const tags = bc['mesh boundary tags']
      
      state.availableSurfaces.forEach(surface => {
        const surfaceTag = surface.metadata.tag
        let isAssignedToThisBC = false
        
        if (Array.isArray(tags)) {
          isAssignedToThisBC = tags.includes(surfaceTag) || tags.includes(String(surfaceTag))
        } else if (typeof tags === 'number') {
          isAssignedToThisBC = tags === surfaceTag
        } else if (typeof tags === 'string') {
          isAssignedToThisBC = tags.split(',').map((s: string) => parseInt(s.trim(), 10)).includes(surfaceTag)
        }
        
        if (isAssignedToThisBC) {
          newVisibility[surface.id] = false
        }
      })
    }
    
    return {
      configData: {
        ...state.configData,
        [rootKey]: {
          ...rootConfig,
          'boundary conditions': [
            ...(rootConfig['boundary conditions'] || []),
            bc
          ]
        }
      },
      surfaceVisibility: newVisibility,
      selectedBC: bc,
      selectedNode: null,
      selectedSurface: null
    }
  }),
  
  updateBoundaryCondition: (id, updates) => set((state) => {
    const rootKey = state.rootSolverKey || 'HyperSolve'
    const rootConfig = (state.configData as any)[rootKey] || {}
    
    // If hideAssignedSurfaces is on and mesh boundary tags are being updated, hide newly assigned surfaces
    let newVisibility = state.surfaceVisibility
    if (state.globalRenderSettings.hideAssignedSurfaces && updates['mesh boundary tags']) {
      newVisibility = { ...state.surfaceVisibility }
      const tags = updates['mesh boundary tags']
      
      state.availableSurfaces.forEach(surface => {
        const surfaceTag = surface.metadata.tag
        let isAssignedToThisBC = false
        
        if (Array.isArray(tags)) {
          isAssignedToThisBC = tags.includes(surfaceTag) || tags.includes(String(surfaceTag))
        } else if (typeof tags === 'number') {
          isAssignedToThisBC = tags === surfaceTag
        } else if (typeof tags === 'string') {
          isAssignedToThisBC = tags.split(',').map((s: string) => parseInt(s.trim(), 10)).includes(surfaceTag)
        }
        
        if (isAssignedToThisBC) {
          newVisibility[surface.id] = false
        }
      })
    }
    
    return {
      configData: {
        ...state.configData,
        [rootKey]: {
          ...rootConfig,
          'boundary conditions': rootConfig['boundary conditions']?.map((bc: any) =>
            bc.id === id ? { ...bc, ...updates } : bc
          ) || []
        }
      },
      surfaceVisibility: newVisibility,
      // Update selectedBC if it's the one being modified
      selectedBC: state.selectedBC?.id === id 
        ? { ...state.selectedBC, ...updates }
        : state.selectedBC
    }
  }),
  
  deleteBoundaryCondition: (id) => set((state) => {
    const rootKey = state.rootSolverKey || 'HyperSolve'
    const rootConfig = (state.configData as any)[rootKey] || {}
    return {
      configData: {
        ...state.configData,
        [rootKey]: {
          ...rootConfig,
          'boundary conditions': rootConfig['boundary conditions']?.filter((bc: any) =>
            bc.id !== id
          ) || []
        }
      },
      selectedBC: state.selectedBC?.id === id ? null : state.selectedBC
    }
  }),
  
  addState: (state) => set((s) => {
    const rootKey = s.rootSolverKey || 'HyperSolve'
    const rootConfig = (s.configData as any)[rootKey] || {}
    console.log('[addState] Adding state:', state.name, 'to', rootKey)
    console.log('[addState] Current states:', Object.keys(rootConfig.states || {}))
    const newConfig = {
      configData: {
        ...s.configData,
        [rootKey]: {
          ...rootConfig,
          states: {
            ...(rootConfig.states || {}),
            [state.name]: state
          }
        }
      },
      selectedState: state,
      selectedNode: null,
      selectedSurface: null,
      selectedBC: null
    }
    console.log('[addState] New states:', Object.keys((newConfig.configData as any)[rootKey]?.states || {}))
    return newConfig
  }),
  
  updateState: (id, updates) => set((s) => {
    const rootKey = s.rootSolverKey || 'HyperSolve'
    const rootConfig = (s.configData as any)[rootKey] || {}
    const states = rootConfig.states || {}
    const currentState = Object.values(states).find((st: any) => st.id === id)
    if (!currentState) return s
    
    const oldName = (currentState as any).name
    const updatedState = { ...currentState, ...updates }
    
    // If name changed, remove old key and add new one
    const newStates = { ...states }
    if (updates.name && updates.name !== oldName) {
      delete newStates[oldName]
      newStates[updates.name] = updatedState
    } else {
      newStates[oldName] = updatedState
    }
    
    return {
      configData: {
        ...s.configData,
        [rootKey]: {
          ...rootConfig,
          states: newStates
        }
      },
      selectedState: s.selectedState?.id === id ? updatedState : s.selectedState
    }
  }),
  
  deleteState: (id) => set((s) => {
    const rootKey = s.rootSolverKey || 'HyperSolve'
    const rootConfig = (s.configData as any)[rootKey] || {}
    const states = rootConfig.states || {}
    const stateToDelete = Object.values(states).find((st: any) => st.id === id)
    if (!stateToDelete) return s
    
    const newStates = { ...states }
    delete newStates[(stateToDelete as any).name]
    
    return {
      configData: {
        ...s.configData,
        [rootKey]: {
          ...rootConfig,
          states: newStates
        }
      },
      selectedState: s.selectedState?.id === id ? null : s.selectedState
    }
  }),

  updateThermodynamics: (thermoConfig) => set((s) => {
    // Use the global root solver key
    const rootKey = s.rootSolverKey || 'HyperSolve'
    
    const thermodynamics: any = {}
    
    if (thermoConfig.gasModel === 'ideal-gas') {
      // Map UI "ideal gas" to schema "perfect gas"
      thermodynamics.species = ['perfect gas']
      thermodynamics['molecular weight'] = thermoConfig.molecularWeight
      thermodynamics['ratio of specific heats'] = thermoConfig.gamma
      thermodynamics['chemical nonequilibrium'] = false
    } else if (thermoConfig.gasModel === 'multispecies') {
      // Multispecies configuration
      // Use user's choice if provided, otherwise default to true
      thermodynamics['chemical nonequilibrium'] = thermoConfig.chemicalNonequilibrium ?? true
      thermodynamics['thermodynamic data source'] = 'NASA_9_coefficient'
      
      if (thermoConfig.planetaryBody === 'earth') {
        // Earth atmosphere models
        if (thermoConfig.speciesModel === '5-species') {
          thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O']
        } else if (thermoConfig.speciesModel === '7-species') {
          thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-']
        } else if (thermoConfig.speciesModel === '11-species') {
          thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'N2+', 'O2+', 'N+', 'O+', 'e-']
        } else {
          // Default to 5-species if not specified
          thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O']
        }
      } else if (thermoConfig.planetaryBody === 'mars') {
        // Mars Park model (5 species)
        thermodynamics.species = ['CO2', 'CO', 'N2', 'O2', 'NO']
      } else if (thermoConfig.reactionModelFile && thermoConfig.selectedSpecies) {
        // Reaction file path
        // Combine reaction species + inert species
        const allSpecies = [...thermoConfig.selectedSpecies]
        if (thermoConfig.inertSpecies && thermoConfig.inertSpecies.length > 0) {
          allSpecies.push(...thermoConfig.inertSpecies)
        }
        thermodynamics.species = allSpecies
        thermodynamics['reaction model filename'] = thermoConfig.reactionModelFile
      } else {
        // No preset selected or custom
        thermodynamics.species = []
      }
    }
    
    return {
      configData: updateConfig(s.configData, {
        [rootKey]: {
          ...s.configData[rootKey],
          thermodynamics
        }
      })
    }
  }),

  updateProperty: (path, key, value) => set((s) => {
    // Parse the path (e.g., "root.HyperSolve.discretization" or "root.Vulcan.discretization")
    const parts = path.replace('root.', '').split('.')
    
    // Deep clone the config to avoid mutations
    const updatedConfig = JSON.parse(JSON.stringify(s.configData))
    
    // Navigate to the target object
    let current: any = updatedConfig
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }
    
    // Set the property
    if (key === '') {
      // If key is empty, replace the whole object at path
      // Navigate to parent instead
      const parentParts = parts.slice(0, -1)
      const lastKey = parts[parts.length - 1]
      let parent: any = updatedConfig
      for (const part of parentParts) {
        if (!parent[part]) {
          parent[part] = {}
        }
        parent = parent[part]
      }
      parent[lastKey] = value
    } else {
      current[key] = value
    }
    
    return { configData: updatedConfig }
  }),
  
  initializeConfig: (projectConfig) => set((s) => {
    const rootKey = s.rootSolverKey || 'HyperSolve'
    console.log('[appStore] initializeConfig using root key:', rootKey)
    
    const newConfig: any = {
      [rootKey]: {
        'boundary conditions': [],
        states: {}
      }
    }
    
    // Set thermodynamics based on gas model
    if (projectConfig.gasModel === 'single-species') {
      newConfig[rootKey].thermodynamics = {
        species: ['perfect gas']
      }
    } else if (projectConfig.gasModel === 'multispecies') {
      // Multispecies configuration
      if (projectConfig.reactionType === 'edl') {
        // EDL chemistry
        newConfig[rootKey].thermodynamics = {
          'chemical nonequilibrium': true
        }
        
        if (projectConfig.planetaryBody === 'earth') {
          // Earth air models
          if (projectConfig.speciesModel === '5-species') {
            newConfig[rootKey].thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O']
          } else if (projectConfig.speciesModel === '7-species') {
            newConfig[rootKey].thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-']
          } else if (projectConfig.speciesModel === '11-species') {
            newConfig[rootKey].thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'N2+', 'O2+', 'N+', 'O+', 'e-']
          }
        } else if (projectConfig.planetaryBody === 'mars') {
          // Mars Park model (5 species)
          newConfig[rootKey].thermodynamics.species = ['CO2', 'CO', 'N2', 'O2', 'NO']
        }
      } else if (projectConfig.reactionType === 'combustion') {
        // Combustion chemistry
        newConfig[rootKey].thermodynamics = {
          'chemical nonequilibrium': true,
          'reaction model filename': projectConfig.reactionModelFile || 'kinetic_data'
        }
        // Species will be extracted from reaction model file later
        newConfig[rootKey].thermodynamics.species = []
      } else if (projectConfig.speciesType === 'non-reacting') {
        // Non-reacting multispecies
        newConfig[rootKey].thermodynamics = {
          'chemical nonequilibrium': false,
          species: [] // User will add species manually
        }
      }
    }
    
    // Set time accuracy based on time mode
    if (projectConfig.timeMode === 'unsteady' && projectConfig.timeAccuracy) {
      newConfig[rootKey]['time accuracy'] = {
        type: 'fixed timestep'
      }
      
      if (projectConfig.timeAccuracy.timeStep) {
        newConfig[rootKey]['time accuracy'].timestep = projectConfig.timeAccuracy.timeStep
      }
      
      if (projectConfig.timeAccuracy.cfl) {
        newConfig[rootKey]['time accuracy'].cfl = projectConfig.timeAccuracy.cfl
      }
      
      if (projectConfig.timeAccuracy.scheme) {
        // Map scheme names to schema values
        const schemeMap: any = {
          'bdf1': 'BDF',
          'bdf2': 'BDF',
          'rk4': 'ESDIRK'
        }
        newConfig[rootKey]['time accuracy'].scheme = schemeMap[projectConfig.timeAccuracy.scheme]
        
        if (projectConfig.timeAccuracy.scheme === 'bdf1') {
          newConfig[rootKey]['time accuracy'].order = 1
        } else if (projectConfig.timeAccuracy.scheme === 'bdf2') {
          newConfig[rootKey]['time accuracy'].order = 2
        } else if (projectConfig.timeAccuracy.scheme === 'rk4') {
          newConfig[rootKey]['time accuracy'].order = 4
        }
      }
    } else {
      // Steady state - use local timestepping
      newConfig[rootKey]['time accuracy'] = {
        type: 'local timestepping'
      }
    }
    
    return {
      ...s,
      configData: newConfig,
      selectedNode: null,
      selectedSurface: null,
      selectedBC: null,
      selectedState: null
    }
  }),
  
  loadMesh: (parsedMesh, filename, lump = false) => set((s) => {
    console.log('[App Store] Loading mesh:', filename, 'with', parsedMesh.regions.length, 'regions', lump ? '(lumping enabled)' : '')
    
    let regionsToProcess = parsedMesh.regions
    const regionCountMap = new Map<string, number>() // Track how many regions per surface name
    
    // Apply lumping if requested
    if (lump) {
      console.log('[App Store] Lumping regions by tag name...')
      
      // Sort regions by tag number
      const sortedRegions = [...parsedMesh.regions].sort((a, b) => a.tag - b.tag)
      
      // Track lumped surfaces by name
      const lumpedSurfaces = new Map<string, RegionData>()
      const nameToTag = new Map<string, number>()
      let nextTag = 1
      
      // Count regions per name
      sortedRegions.forEach(region => {
        regionCountMap.set(region.name, (regionCountMap.get(region.name) || 0) + 1)
      })
      
      // Process regions in sorted order
      sortedRegions.forEach(region => {
        if (lumpedSurfaces.has(region.name)) {
          // Merge with existing lumped surface
          const existing = lumpedSurfaces.get(region.name)!
          console.log(`[App Store] Merging region "${region.name}" (tag ${region.tag}) with existing lumped surface (tag ${nameToTag.get(region.name)})`)
          
          // Combine vertices and normals
          const combinedVertices = new Float32Array(existing.meshData.vertices.length + region.meshData.vertices.length)
          const combinedNormals = new Float32Array(existing.meshData.normals.length + region.meshData.normals.length)
          
          combinedVertices.set(existing.meshData.vertices, 0)
          combinedVertices.set(region.meshData.vertices, existing.meshData.vertices.length)
          combinedNormals.set(existing.meshData.normals, 0)
          combinedNormals.set(region.meshData.normals, existing.meshData.normals.length)
          
          existing.meshData.vertices = combinedVertices
          existing.meshData.normals = combinedNormals
        } else {
          // First time seeing this name - create new lumped surface
          console.log(`[App Store] Creating new lumped surface "${region.name}" with tag ${nextTag} (original tag ${region.tag})`)
          nameToTag.set(region.name, nextTag)
          lumpedSurfaces.set(region.name, {
            name: region.name,
            tag: nextTag,
            meshData: {
              vertices: new Float32Array(region.meshData.vertices),
              normals: new Float32Array(region.meshData.normals)
            }
          })
          nextTag++
        }
      })
      
      regionsToProcess = Array.from(lumpedSurfaces.values())
      console.log(`[App Store] After lumping: ${regionsToProcess.length} surfaces (from ${parsedMesh.regions.length} original regions)`)
    } else {
      // Not lumping - each region is its own surface
      regionsToProcess.forEach(region => {
        regionCountMap.set(region.name, 1)
      })
    }
    
    const surfaces: Surface[] = regionsToProcess.map((region, index) => ({
      id: `mesh-surface-${region.tag}`,
      name: region.name,
      metadata: {
        id: `mesh-surface-${region.tag}`,
        tag: region.tag,
        tagName: region.name.toLowerCase(),
        isLumped: lump && (regionCountMap.get(region.name) || 1) > 1,
        originalRegionCount: regionCountMap.get(region.name) || 1
      },
      geometry: {
        vertices: region.meshData.vertices,
        normals: region.meshData.normals
      }
    }))
    
    console.log('[App Store] Created', surfaces.length, 'surfaces')
    surfaces.forEach(surf => {
      console.log(`  - ${surf.name} (tag ${surf.metadata.tag}): ${surf.geometry!.vertices.length / 3} vertices`)
    })
    
    // Update mesh filename in config
    const updatedConfigData = {
      ...s.configData,
      'mesh filename': filename
    }
    
    return {
      ...s,
      configData: updatedConfigData,
      availableSurfaces: surfaces,
      totalVertices: parsedMesh.totalVertices,
      totalFaces: parsedMesh.totalFaces,
      selectedSurface: null
    }
  })
}))
