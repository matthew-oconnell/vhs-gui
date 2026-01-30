import { create } from 'zustand'
import { TreeNode } from '../utils/schemaParser'
import { Surface } from '../types/surface'
import { ConfigData, BoundaryCondition, State } from '../types/config'
import { ParsedMesh, RegionData } from '../utils/meshParser'
import { CSMBuilder } from '../utils/csmBuilder'

// Helper to ensure deep immutable updates
const updateConfig = (oldConfig: ConfigData, updates: Partial<ConfigData>): ConfigData => {
  return JSON.parse(JSON.stringify({ ...oldConfig, ...updates }))
}

// Box selection settings (persisted)
export interface BoxSelectionSettings {
  // Modifier keys
  boxSelectAllModifier: 'shift' | 'ctrl' | 'alt'
  boxSelectVisibleModifier: 'shift' | 'ctrl' | 'alt'
  // Colors for selection box (configurable for accessibility)
  boxSelectAllColor: string
  boxSelectAllBorder: string
  boxSelectVisibleColor: string
  boxSelectVisibleBorder: string
}

// Bounding sphere for quick rejection during box selection
export interface SurfaceBounds {
  center: { x: number; y: number; z: number }
  radius: number
}

// Runtime box selection state (not persisted)
export interface BoxSelectionState {
  isBoxSelecting: boolean
  boxSelectStart: { x: number; y: number } | null
  boxSelectEnd: { x: number; y: number } | null
  boxSelectMode: 'all' | 'visible' | null
}

export interface CameraSettings {
  rotateSpeed: number
  zoomSpeed: number
  panSpeed: number
  invertZoom: boolean
  multiSelectModifier: 'shift' | 'ctrl' | 'alt'
  selectionMode: 'face' | 'group'
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

// Project setup workflow stages
export type ProjectStage = 
  | 'no-mesh'           // No mesh loaded yet
  | 'mesh-loaded'       // Mesh loaded, ready for BC assignment
  | 'bc-in-progress'    // Some BCs assigned, but not all surfaces
  | 'bc-complete'       // All surfaces have BCs
  | 'init-complete'     // Initial conditions defined
  | 'ready'             // All validation passed, ready to run

interface AppState {
  // Project workflow tracking
  projectStage: ProjectStage
  setProjectStage: (stage: ProjectStage) => void
  updateProjectStage: () => void  // Auto-compute stage based on current state
  selectedNode: TreeNode | null
  setSelectedNode: (node: TreeNode | null) => void
  selectedSurface: Surface | null
  setSelectedSurface: (surface: Surface | null) => void
  selectedSurfaces: Surface[]
  toggleSurfaceSelection: (surface: Surface) => void
  clearSurfaceSelection: () => void
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
  availableSurfaces: Surface[]
  totalVertices: number
  totalFaces: number
  cameraSettings: CameraSettings
  updateCameraSettings: (settings: Partial<CameraSettings>) => void
  setSelectionMode: (mode: 'face' | 'group') => void
  overlayPosition: OverlayPosition
  setOverlayPosition: (position: OverlayPosition) => void
  surfaceVisibility: Record<string, boolean>
  toggleSurfaceVisibility: (surfaceId: string) => void
  surfaceWireframe: Record<string, boolean>
  toggleSurfaceWireframe: (surfaceId: string) => void
  surfaceRenderSettings: Record<string, SurfaceRenderSettings>
  updateSurfaceRenderSettings: (surfaceId: string, settings: Partial<SurfaceRenderSettings>) => void
  updateSurfaceBCName: (surfaceIds: string[], bcName: string) => void
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
  thermoWizardExecuted: boolean
  turbulenceWizardExecuted: boolean
  meshNeedsExport: boolean
  setMeshNeedsExport: (needsExport: boolean) => void
  updateThermodynamics: (thermoConfig: any) => void
  updateTurbulenceModel: (turbulenceConfig: any) => void
  updateProperty: (path: string, key: string, value: any) => void
  initializeConfig: (projectConfig: any) => void
  loadMesh: (parsedMesh: ParsedMesh, filename: string, lump?: boolean) => void
  loadESPSurfaces: (surfaces: Surface[], filename: string, csmContent?: string) => void
  
  // CSM Builder
  csmBuilder: CSMBuilder
  recordCSMOperation: (type: string, command: string, metadata?: any) => void
  exportGeneratedCSM: () => string
  getCSMOperationSummary: () => string
  clearCSMOperations: () => void
  
  // Box selection
  boxSelectionSettings: BoxSelectionSettings
  updateBoxSelectionSettings: (settings: Partial<BoxSelectionSettings>) => void
  boxSelectionState: BoxSelectionState
  setBoxSelectionState: (state: Partial<BoxSelectionState>) => void
  startBoxSelection: (x: number, y: number, mode: 'all' | 'visible') => void
  updateBoxSelection: (x: number, y: number) => void
  endBoxSelection: () => void
  addSurfacesToSelection: (surfaces: Surface[]) => void
  surfaceBounds: Record<string, SurfaceBounds>
  setSurfaceBounds: (bounds: Record<string, SurfaceBounds>) => void
  
  // Panel collapse states
  treeCollapsed: boolean
  editorCollapsed: boolean
  surfacesCollapsed: boolean
  projectFolderCollapsed: boolean
  setTreeCollapsed: (collapsed: boolean) => void
  setEditorCollapsed: (collapsed: boolean) => void
  setSurfacesCollapsed: (collapsed: boolean) => void
  setProjectFolderCollapsed: (collapsed: boolean) => void
  
  // Project folder
  projectFolderHandle: FileSystemDirectoryHandle | null
  openProjectFolder: (handle: FileSystemDirectoryHandle) => void
  closeProjectFolder: () => void
  refreshProjectFolderTrigger: number
  triggerProjectFolderRefresh: () => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node, selectedSurface: null, selectedSurfaces: [], selectedBC: null, selectedState: null, selectedViz: null, selectedInitRegion: null }),
  selectedSurface: null,
  setSelectedSurface: (surface) => set({ selectedSurface: surface, selectedSurfaces: surface ? [surface] : [], selectedNode: null, selectedBC: null, selectedState: null, selectedViz: null, selectedInitRegion: null }),
  selectedSurfaces: [],
  toggleSurfaceSelection: (surface) => set((state) => {
    const isSelected = state.selectedSurfaces.some(s => s.id === surface.id)
    if (isSelected) {
      // Remove from selection
      const newSelection = state.selectedSurfaces.filter(s => s.id !== surface.id)
      return {
        selectedSurfaces: newSelection,
        selectedSurface: newSelection.length > 0 ? newSelection[newSelection.length - 1] : null
      }
    } else {
      // Add to selection
      const newSelection = [...state.selectedSurfaces, surface]
      return {
        selectedSurfaces: newSelection,
        selectedSurface: surface
      }
    }
  }),
  clearSurfaceSelection: () => set({ selectedSurfaces: [], selectedSurface: null }),
  selectedBC: null,
  // NOTE: BC selection now preserves selectedNode to enable generic rendering
  setSelectedBC: (bc) => set({ selectedBC: bc, selectedSurface: null, selectedState: null, selectedViz: null, selectedInitRegion: null }),
  selectedState: null,
  setSelectedState: (state) => set({ selectedState: state, selectedNode: null, selectedSurface: null, selectedBC: null, selectedViz: null, selectedInitRegion: null }),
  selectedViz: null,
  setSelectedViz: (viz) => set({ selectedViz: viz, selectedNode: null, selectedSurface: null, selectedBC: null, selectedState: null, selectedInitRegion: null }),
  selectedInitRegion: null,
  setSelectedInitRegion: (region) => set({ selectedInitRegion: region, selectedNode: null, selectedSurface: null, selectedBC: null, selectedState: null, selectedViz: null }),
  soloBC: null,
  setSoloBC: (bc) => set({ soloBC: bc }),
  
  // CSM Builder
  csmBuilder: new CSMBuilder(),
  
  recordCSMOperation: (type, command, metadata) => {
    const state = useAppStore.getState()
    state.csmBuilder.recordOperation(type as any, command, metadata)
  },
  
  exportGeneratedCSM: () => {
    const state = useAppStore.getState()
    return state.csmBuilder.export()
  },
  
  getCSMOperationSummary: () => {
    const state = useAppStore.getState()
    return state.csmBuilder.getSummary()
  },
  
  clearCSMOperations: () => {
    const state = useAppStore.getState()
    state.csmBuilder.clearOperations()
  },
  
  // Initialize with empty configuration (flat structure)
  configData: {
    'boundary conditions': [],
    states: {}
  },
  
  setConfigData: (configData) => set({ configData }),
  
  availableSurfaces: [],
  totalVertices: 0,
  totalFaces: 0,
  originalCSMContent: null as string | null,
  csmFilename: null as string | null,
  thermoWizardExecuted: false,
  turbulenceWizardExecuted: false,
  meshNeedsExport: false,
  setMeshNeedsExport: (needsExport) => set({ meshNeedsExport: needsExport }),
  
  // Project workflow stage tracking
  projectStage: 'no-mesh' as ProjectStage,
  
  setProjectStage: (stage) => set({ projectStage: stage }),
  
  updateProjectStage: () => {
    const state = useAppStore.getState()
    const { availableSurfaces, configData } = state
    
    // No mesh loaded
    if (availableSurfaces.length === 0) {
      set({ projectStage: 'no-mesh' })
      return
    }
    
    // Mesh loaded - check BC assignment
    const bcs = configData['boundary conditions'] || []
    
    // Count assigned surfaces
    const assignedSurfaceNames = new Set<string>()
    bcs.forEach((bc: any) => {
      const tags = bc['mesh boundary tags']
      if (tags) {
        if (Array.isArray(tags)) {
          tags.forEach(tag => assignedSurfaceNames.add(String(tag)))
        } else {
          assignedSurfaceNames.add(String(tags))
        }
      }
    })
    
    const totalSurfaces = availableSurfaces.length
    const assignedSurfaces = assignedSurfaceNames.size
    
    // Check if initial conditions are defined
    const states = configData?.states
    const hasInitialConditions = states && Object.keys(states).length > 0
    
    // Determine stage
    if (assignedSurfaces === 0) {
      set({ projectStage: 'mesh-loaded' })
    } else if (assignedSurfaces < totalSurfaces) {
      set({ projectStage: 'bc-in-progress' })
    } else if (!hasInitialConditions) {
      set({ projectStage: 'bc-complete' })
    } else {
      // All BCs assigned and initial conditions set
      set({ projectStage: 'init-complete' })
      // TODO: Add validation check for 'ready' stage
    }
  },
  
  // Camera settings with defaults matching Paraview behavior
  cameraSettings: {
    rotateSpeed: 1.5,
    zoomSpeed: 1.2,
    panSpeed: 0.8,
    invertZoom: true, // Pulling back zooms in (Paraview-like)
    multiSelectModifier: 'shift' as const, // Default modifier for multi-selection
    selectionMode: 'face' as const // Default to individual face selection
  },
  
  updateCameraSettings: (settings) => set((state) => ({
    cameraSettings: { ...state.cameraSettings, ...settings }
  })),
  setSelectionMode: (mode) => set((state) => ({
    cameraSettings: { ...state.cameraSettings, selectionMode: mode }
  })),
  
  // Box selection settings with defaults
  boxSelectionSettings: {
    boxSelectAllModifier: 'shift' as const,
    boxSelectVisibleModifier: 'ctrl' as const,
    boxSelectAllColor: 'rgba(0, 120, 255, 0.2)',
    boxSelectAllBorder: 'rgba(0, 120, 255, 0.8)',
    boxSelectVisibleColor: 'rgba(0, 255, 120, 0.2)',
    boxSelectVisibleBorder: 'rgba(0, 255, 120, 0.8)'
  },
  
  updateBoxSelectionSettings: (settings) => set((state) => ({
    boxSelectionSettings: { ...state.boxSelectionSettings, ...settings }
  })),
  
  // Box selection runtime state
  boxSelectionState: {
    isBoxSelecting: false,
    boxSelectStart: null,
    boxSelectEnd: null,
    boxSelectMode: null
  },
  
  setBoxSelectionState: (newState) => set((state) => ({
    boxSelectionState: { ...state.boxSelectionState, ...newState }
  })),
  
  startBoxSelection: (x, y, mode) => set({
    boxSelectionState: {
      isBoxSelecting: true,
      boxSelectStart: { x, y },
      boxSelectEnd: { x, y },
      boxSelectMode: mode
    }
  }),
  
  updateBoxSelection: (x, y) => set((state) => ({
    boxSelectionState: {
      ...state.boxSelectionState,
      boxSelectEnd: { x, y }
    }
  })),
  
  endBoxSelection: () => set({
    boxSelectionState: {
      isBoxSelecting: false,
      boxSelectStart: null,
      boxSelectEnd: null,
      boxSelectMode: null
    }
  }),
  
  // Add surfaces to selection (additive, no duplicates)
  addSurfacesToSelection: (surfaces) => set((state) => {
    const existingIds = new Set(state.selectedSurfaces.map(s => s.id))
    const newSurfaces = surfaces.filter(s => !existingIds.has(s.id))
    if (newSurfaces.length === 0) return state
    
    const combined = [...state.selectedSurfaces, ...newSurfaces]
    return {
      selectedSurfaces: combined,
      selectedSurface: combined[combined.length - 1],
      selectedNode: null,
      selectedBC: null,
      selectedState: null,
      selectedViz: null,
      selectedInitRegion: null
    }
  }),
  
  // Bounding spheres cache for box selection performance
  surfaceBounds: {},
  
  setSurfaceBounds: (bounds) => set({ surfaceBounds: bounds }),
  
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

  updateSurfaceBCName: (surfaceIds, bcName) => set((state) => {
    // Record CSM operations for each surface
    const surfacesToUpdate = state.availableSurfaces.filter(s => surfaceIds.includes(s.id))
    
    for (const surface of surfacesToUpdate) {
      const bodyId = surface.metadata.bodyId
      const faceId = surface.metadata.faceId
      
      if (bodyId !== undefined && faceId !== undefined) {
        // Use the convenience method to record both select and attribute
        state.csmBuilder.recordBCNameAttribute(bodyId, faceId, bcName, surface.id)
      }
    }
    
    return {
      meshNeedsExport: true, // Mark that mesh needs to be re-exported
      availableSurfaces: state.availableSurfaces.map(surface => 
        surfaceIds.includes(surface.id)
          ? { ...surface, metadata: { ...surface.metadata, tagName: bcName, bcName }, name: bcName }
          : surface
      ),
      selectedSurfaces: state.selectedSurfaces.map(surface =>
        surfaceIds.includes(surface.id)
          ? { ...surface, metadata: { ...surface.metadata, tagName: bcName, bcName }, name: bcName }
          : surface
      ),
      selectedSurface: state.selectedSurface && surfaceIds.includes(state.selectedSurface.id)
        ? { ...state.selectedSurface, metadata: { ...state.selectedSurface.metadata, tagName: bcName, bcName }, name: bcName }
        : state.selectedSurface
    }
  }),
  
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
    const boundaryConditions = state.configData['boundary conditions'] || []
    
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
    
    // Update project stage after BC added
    setTimeout(() => useAppStore.getState().updateProjectStage(), 0)
    
    const bcs = state.configData['boundary conditions'] || []
    
    return {
      configData: {
        ...state.configData,
        'boundary conditions': [...bcs, bc]
      },
      surfaceVisibility: newVisibility,
      selectedBC: bc,
      selectedNode: null,
      selectedSurface: null
    }
  }),
  
  updateBoundaryCondition: (id, updates) => set((state) => {
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
    
    // Update project stage after BC updated
    setTimeout(() => useAppStore.getState().updateProjectStage(), 0)
    
    const bcs = state.configData['boundary conditions'] || []
    
    return {
      configData: {
        ...state.configData,
        'boundary conditions': bcs.map((bc: any) =>
          bc.id === id ? { ...bc, ...updates } : bc
        )
      },
      surfaceVisibility: newVisibility,
      // Update selectedBC if it's the one being modified
      selectedBC: state.selectedBC?.id === id 
        ? { ...state.selectedBC, ...updates }
        : state.selectedBC
    }
  }),
  
  deleteBoundaryCondition: (id) => set((state) => {
    const bcs = state.configData['boundary conditions'] || []
    
    // Update project stage after BC deleted
    setTimeout(() => useAppStore.getState().updateProjectStage(), 0)
    
    return {
      configData: {
        ...state.configData,
        'boundary conditions': bcs.filter((bc: any) => bc.id !== id)
      },
      selectedBC: state.selectedBC?.id === id ? null : state.selectedBC
    }
  }),
  
  addState: (state) => set((s) => {
    console.log('[addState] Adding state:', state.name)
    console.log('[addState] Current states:', Object.keys(s.configData.states || {}))
    
    // Update project stage after state added
    setTimeout(() => useAppStore.getState().updateProjectStage(), 0)
    
    const newConfig = {
      configData: {
        ...s.configData,
        states: {
          ...(s.configData.states || {}),
          [state.name]: state
        }
      },
      selectedState: state,
      selectedNode: null,
      selectedSurface: null,
      selectedBC: null
    }
    console.log('[addState] New states:', Object.keys(newConfig.configData.states || {}))
    return newConfig
  }),
  
  updateState: (id, updates) => set((s) => {
    const states = s.configData.states || {}
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
        states: newStates
      },
      selectedState: s.selectedState?.id === id ? updatedState : s.selectedState
    }
  }),
  
  deleteState: (id) => set((s) => {
    const states = s.configData.states || {}
    const stateToDelete = Object.values(states).find((st: any) => st.id === id)
    if (!stateToDelete) return s
    
    const newStates = { ...states }
    delete newStates[(stateToDelete as any).name]
    
    // Update project stage after state deleted
    setTimeout(() => useAppStore.getState().updateProjectStage(), 0)
    
    return {
      configData: {
        ...s.configData,
        states: newStates
      },
      selectedState: s.selectedState?.id === id ? null : s.selectedState
    }
  }),

  updateThermodynamics: (thermoConfig) => set((s) => {
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
      thermoWizardExecuted: true,
      configData: {
        ...s.configData,
        thermodynamics
      }
    }
  }),

  updateTurbulenceModel: (turbulenceConfig) => set((s) => {
    // Update equation type in the config
    const updatedConfig = JSON.parse(JSON.stringify(s.configData))
    
    // Set equation type based on selection
    updatedConfig['equation type'] = turbulenceConfig.equationType
    
    // If turbulent, configure the turbulence model
    if (turbulenceConfig.equationType === 'turbulent' && turbulenceConfig.turbulenceModelType) {
      // Initialize turbulence model if it doesn't exist
      if (!updatedConfig['turbulence model']) {
        updatedConfig['turbulence model'] = {}
      }
      
      // Set the turbulence model type
      updatedConfig['turbulence model'].type = turbulenceConfig.turbulenceModelType
    } else if (turbulenceConfig.equationType === 'laminar') {
      // For laminar, set turbulence model type to 'laminar' if it exists
      if (!updatedConfig['turbulence model']) {
        updatedConfig['turbulence model'] = {}
      }
      updatedConfig['turbulence model'].type = 'laminar'
    }
    
    return {
      turbulenceWizardExecuted: true,
      configData: updatedConfig
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
    console.log('[appStore] initializeConfig (flat structure)')
    
    const newConfig: any = {
      'boundary conditions': [],
      states: {}
    }
    
    // Set thermodynamics based on gas model
    if (projectConfig.gasModel === 'single-species') {
      newConfig.thermodynamics = {
        species: ['perfect gas']
      }
    } else if (projectConfig.gasModel === 'multispecies') {
      // Multispecies configuration
      if (projectConfig.reactionType === 'edl') {
        // EDL chemistry
        newConfig.thermodynamics = {
          'chemical nonequilibrium': true
        }
        
        if (projectConfig.planetaryBody === 'earth') {
          // Earth air models
          if (projectConfig.speciesModel === '5-species') {
            newConfig.thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O']
          } else if (projectConfig.speciesModel === '7-species') {
            newConfig.thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-']
          } else if (projectConfig.speciesModel === '11-species') {
            newConfig.thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'N2+', 'O2+', 'N+', 'O+', 'e-']
          }
        } else if (projectConfig.planetaryBody === 'mars') {
          // Mars Park model (5 species)
          newConfig.thermodynamics.species = ['CO2', 'CO', 'N2', 'O2', 'NO']
        }
      } else if (projectConfig.reactionType === 'combustion') {
        // Combustion chemistry
        newConfig.thermodynamics = {
          'chemical nonequilibrium': true,
          'reaction model filename': projectConfig.reactionModelFile || 'kinetic_data'
        }
        // Species will be extracted from reaction model file later
        newConfig.thermodynamics.species = []
      } else if (projectConfig.speciesType === 'non-reacting') {
        // Non-reacting multispecies
        newConfig.thermodynamics = {
          'chemical nonequilibrium': false,
          species: [] // User will add species manually
        }
      }
    }
    
    // Set time accuracy based on time mode
    if (projectConfig.timeMode === 'unsteady' && projectConfig.timeAccuracy) {
      newConfig['time accuracy'] = {
        type: 'fixed timestep'
      }
      
      if (projectConfig.timeAccuracy.timeStep) {
        newConfig['time accuracy'].timestep = projectConfig.timeAccuracy.timeStep
      }
      
      if (projectConfig.timeAccuracy.cfl) {
        newConfig['time accuracy'].cfl = projectConfig.timeAccuracy.cfl
      }
      
      if (projectConfig.timeAccuracy.scheme) {
        // Map scheme names to schema values
        const schemeMap: any = {
          'bdf1': 'BDF',
          'bdf2': 'BDF',
          'rk4': 'ESDIRK'
        }
        newConfig['time accuracy'].scheme = schemeMap[projectConfig.timeAccuracy.scheme]
        
        if (projectConfig.timeAccuracy.scheme === 'bdf1') {
          newConfig['time accuracy'].order = 1
        } else if (projectConfig.timeAccuracy.scheme === 'bdf2') {
          newConfig['time accuracy'].order = 2
        } else if (projectConfig.timeAccuracy.scheme === 'rk4') {
          newConfig['time accuracy'].order = 4
        }
      }
    } else {
      // Steady state - use local timestepping
      newConfig['time accuracy'] = {
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
    
    // Compute bounding spheres for box selection performance
    const bounds: Record<string, SurfaceBounds> = {}
    surfaces.forEach(surface => {
      if (surface.geometry) {
        const vertices = surface.geometry.vertices
        // Calculate center (average of all vertices)
        let sumX = 0, sumY = 0, sumZ = 0
        const vertexCount = vertices.length / 3
        for (let i = 0; i < vertices.length; i += 3) {
          sumX += vertices[i]
          sumY += vertices[i + 1]
          sumZ += vertices[i + 2]
        }
        const center = {
          x: sumX / vertexCount,
          y: sumY / vertexCount,
          z: sumZ / vertexCount
        }
        
        // Calculate radius (max distance from center)
        let maxDistSq = 0
        for (let i = 0; i < vertices.length; i += 3) {
          const dx = vertices[i] - center.x
          const dy = vertices[i + 1] - center.y
          const dz = vertices[i + 2] - center.z
          const distSq = dx * dx + dy * dy + dz * dz
          if (distSq > maxDistSq) maxDistSq = distSq
        }
        
        bounds[surface.id] = {
          center,
          radius: Math.sqrt(maxDistSq)
        }
      }
    })
    console.log('[App Store] Computed bounding spheres for', Object.keys(bounds).length, 'surfaces')
    
    // Update mesh filename in config
    const updatedConfigData = {
      ...s.configData,
      'mesh filename': filename
    }
    
    const newState = {
      ...s,
      configData: updatedConfigData,
      availableSurfaces: surfaces,
      surfaceBounds: bounds,
      totalVertices: parsedMesh.totalVertices,
      totalFaces: parsedMesh.totalFaces,
      selectedSurface: null,
      meshNeedsExport: false
    }
    
    // Update project stage after mesh loaded
    setTimeout(() => useAppStore.getState().updateProjectStage(), 0)
    
    return newState
  }),
  
  loadESPSurfaces: (surfaces, filename, csmContent) => set((s) => {
    console.log('[App Store] Loading ESP surfaces from:', filename, 'with', surfaces.length, 'surfaces')
    
    // Calculate totals
    let totalVertices = 0
    let totalFaces = 0
    surfaces.forEach(surf => {
      if (surf.geometry) {
        totalVertices += surf.geometry.vertices.length / 3
        totalFaces += surf.geometry.vertices.length / 9  // Each triangle is 9 floats (3 vertices * 3 coords)
      }
    })
    
    console.log('[App Store] ESP mesh totals:', totalVertices, 'vertices,', totalFaces, 'faces')
    
    // Compute bounding spheres for box selection performance
    const bounds: Record<string, SurfaceBounds> = {}
    surfaces.forEach(surface => {
      if (surface.geometry) {
        const vertices = surface.geometry.vertices
        // Calculate center (average of all vertices)
        let sumX = 0, sumY = 0, sumZ = 0
        const vertexCount = vertices.length / 3
        for (let i = 0; i < vertices.length; i += 3) {
          sumX += vertices[i]
          sumY += vertices[i + 1]
          sumZ += vertices[i + 2]
        }
        const center = {
          x: sumX / vertexCount,
          y: sumY / vertexCount,
          z: sumZ / vertexCount
        }
        
        // Calculate radius (max distance from center)
        let maxDistSq = 0
        for (let i = 0; i < vertices.length; i += 3) {
          const dx = vertices[i] - center.x
          const dy = vertices[i + 1] - center.y
          const dz = vertices[i + 2] - center.z
          const distSq = dx * dx + dy * dy + dz * dz
          if (distSq > maxDistSq) maxDistSq = distSq
        }
        
        bounds[surface.id] = {
          center,
          radius: Math.sqrt(maxDistSq)
        }
      }
    })
    console.log('[App Store] Computed bounding spheres for', Object.keys(bounds).length, 'ESP surfaces')
    
    // Set the base CSM content in CSMBuilder
    if (csmContent) {
      s.csmBuilder.setBase(csmContent)
      console.log('[App Store] Set base CSM in CSMBuilder')
    }
    
    // Update config with mesh filename (CSM filename at root level)
    const updatedConfigData = {
      ...s.configData,
      'mesh filename': filename
    }
    
    const newState = {
      ...s,
      configData: updatedConfigData,
      availableSurfaces: surfaces,
      surfaceBounds: bounds,
      totalVertices,
      totalFaces,
      selectedSurface: null,
      originalCSMContent: csmContent || null,
      csmFilename: filename,
      meshNeedsExport: false
    }
    
    // Update project stage after mesh loaded
    setTimeout(() => useAppStore.getState().updateProjectStage(), 0)
    
    return newState
  }),
  
  // Panel collapse state (default: all expanded)
  treeCollapsed: false,
  editorCollapsed: false,
  surfacesCollapsed: false,
  projectFolderCollapsed: false,
  setTreeCollapsed: (collapsed) => set({ treeCollapsed: collapsed }),
  setEditorCollapsed: (collapsed) => set({ editorCollapsed: collapsed }),
  setSurfacesCollapsed: (collapsed) => set({ surfacesCollapsed: collapsed }),
  setProjectFolderCollapsed: (collapsed) => set({ projectFolderCollapsed: collapsed }),
  
  // Project folder
  projectFolderHandle: null,
  openProjectFolder: (handle) => set({ projectFolderHandle: handle }),
  closeProjectFolder: () => set({ projectFolderHandle: null }),
  refreshProjectFolderTrigger: 0,
  triggerProjectFolderRefresh: () => set((state) => ({ 
    refreshProjectFolderTrigger: state.refreshProjectFolderTrigger + 1 
  })),
}))
