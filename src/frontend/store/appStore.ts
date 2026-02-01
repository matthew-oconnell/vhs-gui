import { create } from 'zustand'
import { TreeNode } from '../utils/schemaParser'
import { Surface } from '../types/tag'  // MIGRATION: Use Tag from types/tag.ts
import { Tag } from '../types/tag'
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
  selectionMode: 'tag' | 'group'  // MIGRATION: Changed from 'face' to 'tag'
}

export interface OverlayPosition {
  x: number
  y: number
}

export interface SurfaceRenderSettings {
  tagColor: string
  meshColor: string
  renderMode: 'tag' | 'mesh' | 'both'
  opacity: number
}

// Global color mode for all tags
export type ColorMode = 'assigned-status' | 'bc-type' | 'random' | 'solid'

export interface GlobalRenderSettings {
  colorMode: ColorMode
  hideAssignedTags: boolean
  unassignedColor: string
  assignedColor: string
  solidColor: string
}

// Project setup workflow stages
export type ProjectStage = 
  | 'no-mesh'           // No mesh loaded yet
  | 'mesh-loaded'       // Mesh loaded, ready for BC assignment
  | 'bc-in-progress'    // Some BCs assigned, but not all tags
  | 'bc-complete'       // All tags have BCs
  | 'init-complete'     // Initial conditions defined
  | 'ready'             // All validation passed, ready to run

interface AppState {
  // Project workflow tracking
  projectStage: ProjectStage
  setProjectStage: (stage: ProjectStage) => void
  updateProjectStage: () => void  // Auto-compute stage based on current state
  selectedNode: TreeNode | null
  setSelectedNode: (node: TreeNode | null) => void
  selectedTag: Surface | null
  setSelectedTag: (tag: Surface | null) => void
  selectedTags: Surface[]
  toggleTagSelection: (tag: Surface) => void
  clearTagSelection: () => void
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
  availableTags: Surface[]
  totalVertices: number
  totalFaces: number
  cameraSettings: CameraSettings
  updateCameraSettings: (settings: Partial<CameraSettings>) => void
  setSelectionMode: (mode: 'tag' | 'group') => void  // MIGRATION: Changed from 'face' to 'tag'
  overlayPosition: OverlayPosition
  setOverlayPosition: (position: OverlayPosition) => void
  tagVisibility: Record<string, boolean>
  toggleTagVisibility: (tagId: string) => void
  tagWireframe: Record<string, boolean>
  toggleTagWireframe: (tagId: string) => void
  tagRenderSettings: Record<string, SurfaceRenderSettings>
  updateTagRenderSettings: (tagId: string, settings: Partial<SurfaceRenderSettings>) => void
  updateTagBCName: (tagIds: string[], bcName: string) => void
  globalRenderSettings: GlobalRenderSettings
  setColorMode: (mode: ColorMode) => void
  toggleHideAssignedTags: () => void
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
  initializationWizardExecuted: boolean
  timeAccuracyWizardExecuted: boolean
  visualizationWizardExecuted: boolean
  meshNeedsExport: boolean
  setMeshNeedsExport: (needsExport: boolean) => void
  updateThermodynamics: (thermoConfig: any) => void
  updateTurbulenceModel: (turbulenceConfig: any) => void
  setInitialState: (stateName: string) => void
  setInitializationWizardExecuted: (executed: boolean) => void
  updateTimeAccuracy: (timeAccuracyConfig: any) => void
  setTimeAccuracyWizardExecuted: (executed: boolean) => void
  addVisualizationOutput: (vizConfig: any) => void
  setVisualizationWizardExecuted: (executed: boolean) => void
  updateProperty: (path: string, key: string, value: any) => void
  initializeConfig: (projectConfig: any) => void
  loadMesh: (parsedMesh: ParsedMesh, filename: string, lump?: boolean) => void
  loadESPSurfaces: (tags: Surface[], filename: string, csmContent?: string) => void
  
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
  addSurfacesToSelection: (tags: Surface[]) => void
  tagBounds: Record<string, SurfaceBounds>
  setSurfaceBounds: (bounds: Record<string, SurfaceBounds>) => void
  
  // Panel collapse states
  treeCollapsed: boolean
  editorCollapsed: boolean
  tagsCollapsed: boolean
  projectFolderCollapsed: boolean
  setTreeCollapsed: (collapsed: boolean) => void
  setEditorCollapsed: (collapsed: boolean) => void
  setSurfacesCollapsed: (collapsed: boolean) => void
  setProjectFolderCollapsed: (collapsed: boolean) => void
  
  // CSM file content for text editor
  originalCSMContent: string | null
  csmFilename: string | null
  
  // Project folder (supports both Tauri paths and browser handles)
  projectFolderHandle: string | FileSystemDirectoryHandle | null
  openProjectFolder: (handle: string | FileSystemDirectoryHandle) => void
  closeProjectFolder: () => void
  
  // Unsaved changes tracking
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (hasChanges: boolean) => void
  markAsModified: () => void
  
  // Reset to blank project
  resetToBlankProject: () => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node, selectedTag: null, selectedTags: [], selectedBC: null, selectedState: null, selectedViz: null, selectedInitRegion: null }),
  selectedTag: null,
  setSelectedTag: (tag) => set({ selectedTag: tag, selectedTags: tag ? [tag] : [], selectedNode: null, selectedBC: null, selectedState: null, selectedViz: null, selectedInitRegion: null }),
  selectedTags: [],
  toggleTagSelection: (tag) => set((state) => {
    const isSelected = state.selectedTags.some(s => s.id === tag.id)
    if (isSelected) {
      // Remove from selection
      const newSelection = state.selectedTags.filter(s => s.id !== tag.id)
      return {
        selectedTags: newSelection,
        selectedTag: newSelection.length > 0 ? newSelection[newSelection.length - 1] : null
      }
    } else {
      // Add to selection
      const newSelection = [...state.selectedTags, tag]
      return {
        selectedTags: newSelection,
        selectedTag: tag
      }
    }
  }),
  clearTagSelection: () => set({ selectedTags: [], selectedTag: null }),
  selectedBC: null,
  // NOTE: BC selection now preserves selectedNode to enable generic rendering
  setSelectedBC: (bc) => set({ selectedBC: bc, selectedTag: null, selectedState: null, selectedViz: null, selectedInitRegion: null }),
  selectedState: null,
  setSelectedState: (state) => set({ selectedState: state, selectedNode: null, selectedTag: null, selectedBC: null, selectedViz: null, selectedInitRegion: null }),
  selectedViz: null,
  setSelectedViz: (viz) => set({ selectedViz: viz, selectedNode: null, selectedTag: null, selectedBC: null, selectedState: null, selectedInitRegion: null }),
  selectedInitRegion: null,
  setSelectedInitRegion: (region) => set({ selectedInitRegion: region, selectedNode: null, selectedTag: null, selectedBC: null, selectedState: null, selectedViz: null }),
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
  
  availableTags: [],
  totalVertices: 0,
  totalFaces: 0,
  originalCSMContent: null as string | null,
  csmFilename: null as string | null,
  thermoWizardExecuted: false,
  turbulenceWizardExecuted: false,
  initializationWizardExecuted: false,
  timeAccuracyWizardExecuted: false,
  visualizationWizardExecuted: false,
  meshNeedsExport: false,
  setMeshNeedsExport: (needsExport) => set({ meshNeedsExport: needsExport }),
  
  // Project workflow stage tracking
  projectStage: 'no-mesh' as ProjectStage,
  
  setProjectStage: (stage) => set({ projectStage: stage }),
  
  updateProjectStage: () => {
    const state = useAppStore.getState()
    const { availableTags, configData } = state
    
    // No mesh loaded
    if (availableTags.length === 0) {
      set({ projectStage: 'no-mesh' })
      return
    }
    
    // Mesh loaded - check BC assignment
    const bcs = configData['boundary conditions'] || []
    
    // Count assigned tags
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
    
    const totalSurfaces = availableTags.length
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
    selectionMode: 'tag' as const // MIGRATION: Changed from 'face' to 'tag' - individual tag selection
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
  
  // Add tags to selection (additive, no duplicates)
  addSurfacesToSelection: (tags) => set((state) => {
    const existingIds = new Set(state.selectedTags.map(s => s.id))
    const newSurfaces = tags.filter(s => !existingIds.has(s.id))
    if (newSurfaces.length === 0) return state
    
    const combined = [...state.selectedTags, ...newSurfaces]
    return {
      selectedTags: combined,
      selectedTag: combined[combined.length - 1],
      selectedNode: null,
      selectedBC: null,
      selectedState: null,
      selectedViz: null,
      selectedInitRegion: null
    }
  }),
  
  // Bounding spheres cache for box selection performance
  tagBounds: {},
  
  setSurfaceBounds: (bounds) => set({ tagBounds: bounds }),
  
  // Overlay position with default in top-left
  overlayPosition: {
    x: 12,
    y: 12
  },
  
  setOverlayPosition: (position) => set({ overlayPosition: position }),
  
  // Tag visibility - all tags visible by default
  tagVisibility: {},
  
  toggleTagVisibility: (tagId) => set((state) => ({
    tagVisibility: {
      ...state.tagVisibility,
      [tagId]: !(state.tagVisibility[tagId] ?? true)
    }
  })),
  
  // Tag wireframe - all tags solid by default
  tagWireframe: {},
  
  toggleTagWireframe: (tagId) => set((state) => ({
    tagWireframe: {
      ...state.tagWireframe,
      [tagId]: !(state.tagWireframe[tagId] ?? false)
    }
  })),
  
  // Tag render settings with defaults
  tagRenderSettings: {},
  
  updateTagRenderSettings: (tagId, settings) => set((state) => ({
    tagRenderSettings: {
      ...state.tagRenderSettings,
      [tagId]: {
        tagColor: state.tagRenderSettings[tagId]?.tagColor ?? '#4a9eff',
        meshColor: state.tagRenderSettings[tagId]?.meshColor ?? '#ffffff',
        renderMode: state.tagRenderSettings[tagId]?.renderMode ?? 'tag',
        opacity: state.tagRenderSettings[tagId]?.opacity ?? 1,
        ...settings
      }
    }
  })),

  updateTagBCName: (tagIds, bcName) => set((state) => {
    // Record CSM operations for each tag
    const tagsToUpdate = state.availableTags.filter(s => tagIds.includes(s.id))
    
    for (const tag of tagsToUpdate) {
      const bodyId = tag.metadata.bodyId
      const faceId = tag.metadata.faceId
      
      if (bodyId !== undefined && faceId !== undefined) {
        // Use the convenience method to record both select and attribute
        state.csmBuilder.recordBCNameAttribute(bodyId, faceId, bcName, tag.id)
      }
    }
    
    return {
      meshNeedsExport: true, // Mark that mesh needs to be re-exported
      availableTags: state.availableTags.map(tag => 
        tagIds.includes(tag.id)
          ? { ...tag, metadata: { ...tag.metadata, tagName: bcName, bcName }, name: bcName }
          : tag
      ),
      selectedTags: state.selectedTags.map(tag =>
        tagIds.includes(tag.id)
          ? { ...tag, metadata: { ...tag.metadata, tagName: bcName, bcName }, name: bcName }
          : tag
      ),
      selectedTag: state.selectedTag && tagIds.includes(state.selectedTag.id)
        ? { ...state.selectedTag, metadata: { ...state.selectedTag.metadata, tagName: bcName, bcName }, name: bcName }
        : state.selectedTag
    }
  }),
  
  // Global render settings with defaults
  globalRenderSettings: {
    colorMode: 'solid' as ColorMode,
    hideAssignedTags: false,
    unassignedColor: '#ff4444',
    assignedColor: '#44aa44',
    solidColor: '#4a9eff'
  },
  
  setColorMode: (mode) => set((state) => ({
    globalRenderSettings: { ...state.globalRenderSettings, colorMode: mode }
  })),
  
  toggleHideAssignedTags: () => set((state) => {
    const newHideAssigned = !state.globalRenderSettings.hideAssignedTags
    const boundaryConditions = state.configData['boundary conditions'] || []
    
    // Build new visibility map
    const newVisibility = { ...state.tagVisibility }
    
    // For each tag, check if it's assigned to any BC
    state.availableTags.forEach(tag => {
      const tagTag = tag.metadata.tag
      const isAssigned = boundaryConditions.some((bc: any) => {
        const tags = bc['mesh boundary tags']
        if (Array.isArray(tags)) {
          return tags.includes(tagTag) || tags.includes(String(tagTag))
        } else if (typeof tags === 'number') {
          return tags === tagTag
        } else if (typeof tags === 'string') {
          return tags.split(',').map((s: string) => parseInt(s.trim(), 10)).includes(tagTag)
        }
        return false
      })
      
      if (isAssigned) {
        // Hide assigned tags when toggling on, show when toggling off
        newVisibility[tag.id] = !newHideAssigned
      }
    })
    
    return {
      globalRenderSettings: { 
        ...state.globalRenderSettings, 
        hideAssignedTags: newHideAssigned 
      },
      tagVisibility: newVisibility
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
    // If hideAssignedTags is on, hide the tags being assigned to this BC
    let newVisibility = state.tagVisibility
    if (state.globalRenderSettings.hideAssignedTags && bc['mesh boundary tags']) {
      newVisibility = { ...state.tagVisibility }
      const tags = bc['mesh boundary tags']
      
      state.availableTags.forEach(tag => {
        const tagTag = tag.metadata.tag
        let isAssignedToThisBC = false
        
        if (Array.isArray(tags)) {
          isAssignedToThisBC = tags.includes(tagTag) || tags.includes(String(tagTag))
        } else if (typeof tags === 'number') {
          isAssignedToThisBC = tags === tagTag
        } else if (typeof tags === 'string') {
          isAssignedToThisBC = tags.split(',').map((s: string) => parseInt(s.trim(), 10)).includes(tagTag)
        }
        
        if (isAssignedToThisBC) {
          newVisibility[tag.id] = false
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
      tagVisibility: newVisibility,
      selectedBC: bc,
      selectedNode: null,
      selectedTag: null,
      hasUnsavedChanges: true
    }
  }),
  
  updateBoundaryCondition: (id, updates) => set((state) => {
    // If hideAssignedTags is on and mesh boundary tags are being updated, hide newly assigned tags
    let newVisibility = state.tagVisibility
    if (state.globalRenderSettings.hideAssignedTags && updates['mesh boundary tags']) {
      newVisibility = { ...state.tagVisibility }
      const tags = updates['mesh boundary tags']
      
      state.availableTags.forEach(tag => {
        const tagTag = tag.metadata.tag
        let isAssignedToThisBC = false
        
        if (Array.isArray(tags)) {
          isAssignedToThisBC = tags.includes(tagTag) || tags.includes(String(tagTag))
        } else if (typeof tags === 'number') {
          isAssignedToThisBC = tags === tagTag
        } else if (typeof tags === 'string') {
          isAssignedToThisBC = tags.split(',').map((s: string) => parseInt(s.trim(), 10)).includes(tagTag)
        }
        
        if (isAssignedToThisBC) {
          newVisibility[tag.id] = false
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
      tagVisibility: newVisibility,
      // Update selectedBC if it's the one being modified
      selectedBC: state.selectedBC?.id === id 
        ? { ...state.selectedBC, ...updates }
        : state.selectedBC,
      hasUnsavedChanges: true
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
      selectedBC: state.selectedBC?.id === id ? null : state.selectedBC,
      hasUnsavedChanges: true
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
      selectedTag: null,
      selectedBC: null,
      hasUnsavedChanges: true
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
      selectedState: s.selectedState?.id === id ? updatedState : s.selectedState,
      hasUnsavedChanges: true
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
      selectedState: s.selectedState?.id === id ? null : s.selectedState,
      hasUnsavedChanges: true
    }
  }),

  updateThermodynamics: (thermoConfig) => set((s) => {
    const thermodynamics: any = {}
    
    if (thermoConfig.gasModel === 'ideal-gas') {
      // Map UI "ideal gas" to schema "perfect gas"
      thermodynamics.species = ['perfect gas']
      thermodynamics['molecular weight'] = thermoConfig.molecularWeight
      thermodynamics['ratio of specific heats'] = thermoConfig.gamma
      thermodynamics['chemistry model'] = 'frozen'
    } else if (thermoConfig.gasModel === 'multispecies') {
      // Multispecies configuration
      // Use user's choice if provided, otherwise default to finite-rate (chemistry enabled)
      // Map boolean to new enum: true -> 'finite-rate', false -> 'frozen'
      const enableChemistry = thermoConfig.chemicalNonequilibrium ?? true
      thermodynamics['chemistry model'] = enableChemistry ? 'finite-rate' : 'frozen'
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

  setInitialState: (stateName) => set((s) => {
    const updatedConfig = JSON.parse(JSON.stringify(s.configData))
    updatedConfig['initial state'] = stateName
    return {
      configData: updatedConfig,
      initializationWizardExecuted: true
    }
  }),

  setInitializationWizardExecuted: (executed) => set({ initializationWizardExecuted: executed }),

  updateTimeAccuracy: (timeAccuracyConfig) => set((s) => {
    const updatedConfig = JSON.parse(JSON.stringify(s.configData))
    
    // Set time accuracy settings
    if (!updatedConfig['time accuracy']) {
      updatedConfig['time accuracy'] = {}
    }
    
    if (timeAccuracyConfig.mode === 'steady') {
      // Steady state: local or global timestepping
      updatedConfig['time accuracy'].type = timeAccuracyConfig.timesteppingType || 'local timestepping'
    } else {
      // Unsteady: fixed timestep with BDF
      updatedConfig['time accuracy'].type = 'fixed timestep'
      updatedConfig['time accuracy'].timestep = timeAccuracyConfig.timestep
      updatedConfig['time accuracy'].method = 'BDF'
      updatedConfig['time accuracy'].order = timeAccuracyConfig.order
      updatedConfig['time accuracy'].subiterations = timeAccuracyConfig.subiterations
      updatedConfig['time accuracy']['subiteration tolerance'] = timeAccuracyConfig.subiterationTolerance
    }
    
    // Set nonlinear solver settings
    if (!updatedConfig['nonlinear solver']) {
      updatedConfig['nonlinear solver'] = {}
    }
    updatedConfig['nonlinear solver']['starting cfl'] = timeAccuracyConfig.startingCfl
    updatedConfig['nonlinear solver']['cfl bounds'] = [timeAccuracyConfig.cflMin, timeAccuracyConfig.cflMax]
    
    // Set steps
    updatedConfig.steps = timeAccuracyConfig.steps
    
    return {
      configData: updatedConfig,
      timeAccuracyWizardExecuted: true
    }
  }),

  setTimeAccuracyWizardExecuted: (executed) => set({ timeAccuracyWizardExecuted: executed }),

  addVisualizationOutput: (vizConfig) => set((s) => {
    const updatedConfig = JSON.parse(JSON.stringify(s.configData))
    
    if (!updatedConfig.visualization) {
      updatedConfig.visualization = []
    }
    
    updatedConfig.visualization.push(vizConfig)
    
    return {
      configData: updatedConfig,
      visualizationWizardExecuted: true
    }
  }),

  setVisualizationWizardExecuted: (executed) => set({ visualizationWizardExecuted: executed }),

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
          'chemistry model': 'finite-rate'
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
          'chemistry model': 'finite-rate',
          'reaction model filename': projectConfig.reactionModelFile || 'kinetic_data'
        }
        // Species will be extracted from reaction model file later
        newConfig.thermodynamics.species = []
      } else if (projectConfig.speciesType === 'non-reacting') {
        // Non-reacting multispecies
        newConfig.thermodynamics = {
          'chemistry model': 'frozen',
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
      selectedTag: null,
      selectedBC: null,
      selectedState: null
    }
  }),
  
  loadMesh: (parsedMesh, filename, lump = false) => set((s) => {
    console.log('[App Store] Loading mesh:', filename, 'with', parsedMesh.regions.length, 'regions', lump ? '(lumping enabled)' : '')
    
    let regionsToProcess = parsedMesh.regions
    const regionCountMap = new Map<string, number>() // Track how many regions per tag name
    
    // Apply lumping if requested
    if (lump) {
      console.log('[App Store] Lumping regions by tag name...')
      
      // Sort regions by tag number
      const sortedRegions = [...parsedMesh.regions].sort((a, b) => a.tag - b.tag)
      
      // Track lumped tags by name
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
          // Merge with existing lumped tag
          const existing = lumpedSurfaces.get(region.name)!
          console.log(`[App Store] Merging region "${region.name}" (tag ${region.tag}) with existing lumped tag (tag ${nameToTag.get(region.name)})`)
          
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
          // First time seeing this name - create new lumped tag
          console.log(`[App Store] Creating new lumped tag "${region.name}" with tag ${nextTag} (original tag ${region.tag})`)
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
      console.log(`[App Store] After lumping: ${regionsToProcess.length} tags (from ${parsedMesh.regions.length} original regions)`)
    } else {
      // Not lumping - each region is its own tag
      regionsToProcess.forEach(region => {
        regionCountMap.set(region.name, 1)
      })
    }
    
    const tags: Surface[] = regionsToProcess.map((region, index) => ({
      id: `mesh-tag-${region.tag}`,
      name: region.name,
      metadata: {
        id: `mesh-tag-${region.tag}`,
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
    
    console.log('[App Store] Created', tags.length, 'tags')
    tags.forEach(surf => {
      console.log(`  - ${surf.name} (tag ${surf.metadata.tag}): ${surf.geometry!.vertices.length / 3} vertices`)
    })
    
    // Compute bounding spheres for box selection performance
    const bounds: Record<string, SurfaceBounds> = {}
    tags.forEach(tag => {
      if (tag.geometry) {
        const vertices = tag.geometry.vertices
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
        
        bounds[tag.id] = {
          center,
          radius: Math.sqrt(maxDistSq)
        }
      }
    })
    console.log('[App Store] Computed bounding spheres for', Object.keys(bounds).length, 'tags')
    
    // Update mesh filename in config
    const updatedConfigData = {
      ...s.configData,
      'mesh filename': filename
    }
    
    const newState = {
      ...s,
      configData: updatedConfigData,
      availableTags: tags,
      tagBounds: bounds,
      totalVertices: parsedMesh.totalVertices,
      totalFaces: parsedMesh.totalFaces,
      selectedTag: null,
      meshNeedsExport: false
    }
    
    // Update project stage after mesh loaded
    setTimeout(() => useAppStore.getState().updateProjectStage(), 0)
    
    return newState
  }),
  
  loadESPSurfaces: (tags, filename, csmContent) => set((s) => {
    const perfStart = performance.now()
    console.log('[App Store] Loading ESP tags from:', filename, 'with', tags.length, 'tags')
    
    // Calculate totals
    const statsStart = performance.now()
    let totalVertices = 0
    let totalFaces = 0
    tags.forEach(surf => {
      if (surf.geometry) {
        totalVertices += surf.geometry.vertices.length / 3
        totalFaces += surf.geometry.vertices.length / 9  // Each triangle is 9 floats (3 vertices * 3 coords)
      }
    })
    
    const statsEnd = performance.now()
    console.log('[App Store] ESP mesh totals:', totalVertices, 'vertices,', totalFaces, 'faces')
    console.log(`[Performance] Stats calculation: ${(statsEnd - statsStart).toFixed(2)}ms`)
    
    // Compute bounding spheres for box selection performance
    const boundsStart = performance.now()
    const bounds: Record<string, SurfaceBounds> = {}
    tags.forEach(tag => {
      if (tag.geometry) {
        const vertices = tag.geometry.vertices
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
        
        bounds[tag.id] = {
          center,
          radius: Math.sqrt(maxDistSq)
        }
      }
    })
    const boundsEnd = performance.now()
    console.log('[App Store] Computed bounding spheres for', Object.keys(bounds).length, 'ESP tags')
    console.log(`[Performance] Bounds computation: ${(boundsEnd - boundsStart).toFixed(2)}ms`)
    
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
    
    const stateUpdateStart = performance.now()
    const newState = {
      ...s,
      configData: updatedConfigData,
      availableTags: tags,
      tagBounds: bounds,
      totalVertices,
      totalFaces,
      selectedTag: null,
      originalCSMContent: csmContent || null,
      csmFilename: filename,
      meshNeedsExport: false
    }
    const stateUpdateEnd = performance.now()
    const totalEnd = performance.now()
    console.log(`[Performance] State update: ${(stateUpdateEnd - stateUpdateStart).toFixed(2)}ms`)
    console.log(`[Performance] Total loadESPSurfaces: ${(totalEnd - perfStart).toFixed(2)}ms`)
    
    // Update project stage after mesh loaded
    setTimeout(() => useAppStore.getState().updateProjectStage(), 0)
    
    return newState
  }),
  
  // Panel collapse state (default: all expanded)
  treeCollapsed: false,
  editorCollapsed: false,
  tagsCollapsed: false,
  projectFolderCollapsed: false,
  setTreeCollapsed: (collapsed) => set({ treeCollapsed: collapsed }),
  setEditorCollapsed: (collapsed) => set({ editorCollapsed: collapsed }),
  setSurfacesCollapsed: (collapsed) => set({ tagsCollapsed: collapsed }),
  setProjectFolderCollapsed: (collapsed) => set({ projectFolderCollapsed: collapsed }),
  
  // Project folder
  projectFolderHandle: null,
  openProjectFolder: (handle) => set({ projectFolderHandle: handle }),
  closeProjectFolder: () => set({ projectFolderHandle: null }),
  
  // Unsaved changes tracking
  hasUnsavedChanges: false,
  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
  markAsModified: () => set({ hasUnsavedChanges: true }),
  
  // Reset to blank project
  resetToBlankProject: () => set({
    // Clear all selections
    selectedNode: null,
    selectedTag: null,
    selectedTags: [],
    selectedBC: null,
    selectedState: null,
    selectedViz: null,
    selectedInitRegion: null,
    soloBC: null,
    
    // Reset configuration
    configData: {
      'boundary conditions': [],
      states: {}
    },
    
    // Clear mesh data
    availableTags: [],
    totalVertices: 0,
    totalFaces: 0,
    tagBounds: {},
    tagVisibility: {},
    tagWireframe: {},
    tagRenderSettings: {},
    
    // Reset CSM data
    originalCSMContent: null,
    csmFilename: null,
    csmBuilder: new CSMBuilder(),
    
    // Reset wizard flags
    thermoWizardExecuted: false,
    turbulenceWizardExecuted: false,
    initializationWizardExecuted: false,
    timeAccuracyWizardExecuted: false,
    visualizationWizardExecuted: false,
    meshNeedsExport: false,
    
    // Reset project stage
    projectStage: 'no-mesh' as ProjectStage,
    
    // Clear project folder
    projectFolderHandle: null,
    
    // Mark as saved (since it's a fresh state)
    hasUnsavedChanges: false
  })
}))
