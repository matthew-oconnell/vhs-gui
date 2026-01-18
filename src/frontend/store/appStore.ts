import { create } from 'zustand'
import { TreeNode } from '../utils/schemaParser'
import { Surface } from '../types/surface'
import { ConfigData, BoundaryCondition, State } from '../types/config'
import { ParsedMesh, RegionData } from '../utils/meshParser'

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
  addBoundaryCondition: (bc: BoundaryCondition) => void
  updateBoundaryCondition: (id: string, updates: Partial<BoundaryCondition>) => void
  deleteBoundaryCondition: (id: string) => void
  addState: (state: State) => void
  updateState: (id: string, updates: Partial<State>) => void
  deleteState: (id: string) => void
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
  
  addBoundaryCondition: (bc) => set((state) => ({
    configData: {
      ...state.configData,
      HyperSolve: {
        ...state.configData.HyperSolve,
        'boundary conditions': [
          ...(state.configData.HyperSolve?.['boundary conditions'] || []),
          bc
        ]
      }
    },
    selectedBC: bc,
    selectedNode: null,
    selectedSurface: null
  })),
  
  updateBoundaryCondition: (id, updates) => set((state) => ({
    configData: {
      ...state.configData,
      HyperSolve: {
        ...state.configData.HyperSolve,
        'boundary conditions': state.configData.HyperSolve?.['boundary conditions']?.map(bc =>
          bc.id === id ? { ...bc, ...updates } : bc
        ) || []
      }
    },
    // Update selectedBC if it's the one being modified
    selectedBC: state.selectedBC?.id === id 
      ? { ...state.selectedBC, ...updates }
      : state.selectedBC
  })),
  
  deleteBoundaryCondition: (id) => set((state) => ({
    configData: {
      ...state.configData,
      HyperSolve: {
        ...state.configData.HyperSolve,
        'boundary conditions': state.configData.HyperSolve?.['boundary conditions']?.filter(bc =>
          bc.id !== id
        ) || []
      }
    },
    selectedBC: state.selectedBC?.id === id ? null : state.selectedBC
  })),
  
  addState: (state) => set((s) => ({
    configData: {
      ...s.configData,
      HyperSolve: {
        ...s.configData.HyperSolve,
        states: {
          ...(s.configData.HyperSolve?.states || {}),
          [state.name]: state
        }
      }
    },
    selectedState: state,
    selectedNode: null,
    selectedSurface: null,
    selectedBC: null
  })),
  
  updateState: (id, updates) => set((s) => {
    const states = s.configData.HyperSolve?.states || {}
    const currentState = Object.values(states).find(st => st.id === id)
    if (!currentState) return s
    
    const oldName = currentState.name
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
        HyperSolve: {
          ...s.configData.HyperSolve,
          states: newStates
        }
      },
      selectedState: s.selectedState?.id === id ? updatedState : s.selectedState
    }
  }),
  
  deleteState: (id) => set((s) => {
    const states = s.configData.HyperSolve?.states || {}
    const stateToDelete = Object.values(states).find(st => st.id === id)
    if (!stateToDelete) return s
    
    const newStates = { ...states }
    delete newStates[stateToDelete.name]
    
    return {
      configData: {
        ...s.configData,
        HyperSolve: {
          ...s.configData.HyperSolve,
          states: newStates
        }
      },
      selectedState: s.selectedState?.id === id ? null : s.selectedState
    }
  }),
  
  initializeConfig: (projectConfig) => set((s) => {
    const newConfig: any = {
      HyperSolve: {
        'boundary conditions': [],
        states: {}
      }
    }
    
    // Set thermodynamics based on gas model
    if (projectConfig.gasModel === 'single-species') {
      newConfig.HyperSolve.thermodynamics = {
        species: ['perfect gas']
      }
    } else if (projectConfig.gasModel === 'multispecies') {
      // Multispecies configuration
      if (projectConfig.reactionType === 'edl') {
        // EDL chemistry
        newConfig.HyperSolve.thermodynamics = {
          'chemical nonequilibrium': true
        }
        
        if (projectConfig.planetaryBody === 'earth') {
          // Earth air models
          if (projectConfig.speciesModel === '5-species') {
            newConfig.HyperSolve.thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O']
          } else if (projectConfig.speciesModel === '7-species') {
            newConfig.HyperSolve.thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-']
          } else if (projectConfig.speciesModel === '11-species') {
            newConfig.HyperSolve.thermodynamics.species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'N2+', 'O2+', 'N+', 'O+', 'e-']
          }
        } else if (projectConfig.planetaryBody === 'mars') {
          // Mars Park model (5 species)
          newConfig.HyperSolve.thermodynamics.species = ['CO2', 'CO', 'N2', 'O2', 'NO']
        }
      } else if (projectConfig.reactionType === 'combustion') {
        // Combustion chemistry
        newConfig.HyperSolve.thermodynamics = {
          'chemical nonequilibrium': true,
          'reaction model filename': projectConfig.reactionModelFile || 'kinetic_data'
        }
        // Species will be extracted from reaction model file later
        newConfig.HyperSolve.thermodynamics.species = []
      } else if (projectConfig.speciesType === 'non-reacting') {
        // Non-reacting multispecies
        newConfig.HyperSolve.thermodynamics = {
          'chemical nonequilibrium': false,
          species: [] // User will add species manually
        }
      }
    }
    
    // Set time accuracy based on time mode
    if (projectConfig.timeMode === 'unsteady' && projectConfig.timeAccuracy) {
      newConfig.HyperSolve['time accuracy'] = {
        type: 'fixed timestep'
      }
      
      if (projectConfig.timeAccuracy.timeStep) {
        newConfig.HyperSolve['time accuracy'].timestep = projectConfig.timeAccuracy.timeStep
      }
      
      if (projectConfig.timeAccuracy.cfl) {
        newConfig.HyperSolve['time accuracy'].cfl = projectConfig.timeAccuracy.cfl
      }
      
      if (projectConfig.timeAccuracy.scheme) {
        // Map scheme names to schema values
        const schemeMap: any = {
          'bdf1': 'BDF',
          'bdf2': 'BDF',
          'rk4': 'ESDIRK'
        }
        newConfig.HyperSolve['time accuracy'].scheme = schemeMap[projectConfig.timeAccuracy.scheme]
        
        if (projectConfig.timeAccuracy.scheme === 'bdf1') {
          newConfig.HyperSolve['time accuracy'].order = 1
        } else if (projectConfig.timeAccuracy.scheme === 'bdf2') {
          newConfig.HyperSolve['time accuracy'].order = 2
        } else if (projectConfig.timeAccuracy.scheme === 'rk4') {
          newConfig.HyperSolve['time accuracy'].order = 4
        }
      }
    } else {
      // Steady state - use local timestepping
      newConfig.HyperSolve['time accuracy'] = {
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
