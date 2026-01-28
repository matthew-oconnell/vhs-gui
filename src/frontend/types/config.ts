// Type definitions for the actual CFD configuration data

export type MeshBoundaryTags = number | string | number[] | string[]

export interface BoundaryCondition {
  id: string // UI-generated ID for managing the list
  name?: string // User-friendly name for the BC
  type: string // BC type from enum (dirichlet, viscous wall, etc.)
  'mesh boundary tags'?: MeshBoundaryTags
  state?: string // For BCs that require a state reference
  [key: string]: any // Allow additional properties based on BC type
}

export interface State {
  id: string // UI-generated ID (also used as the key in states object)
  name: string // The key in the states object
  'mach number'?: number
  temperature?: number
  pressure?: number
  speed?: number
  'angle of attack'?: number
  'angle of yaw'?: number
  'mass fractions'?: Record<string, number> // Species name to mass fraction mapping
  [key: string]: any // Allow additional properties based on state type
}

export interface ConfigData {
  // Core required properties (flat structure - new schema)
  'mesh filename'?: string | string[]
  'boundary conditions'?: BoundaryCondition[]
  states?: Record<string, State> // Key-value pairs where key is the state name
  
  // Common solver settings (now at root level)
  steps?: number
  'checkpoint frequency'?: number
  'domain name'?: string
  'equation type'?: string
  
  // Solver configuration sections (now at root level)
  discretization?: any
  thermodynamics?: any
  'time accuracy'?: any
  'turbulence model'?: any
  'nonlinear solver'?: any
  'linear solver'?: any
  'update limits'?: any
  'radiation solver'?: any
  'mhd solver'?: any
  'particle solver'?: any
  
  // Initial conditions (now at root level)
  'initial state'?: string
  'initialization regions'?: Array<any>
  
  // Mesh and adaptation (now at root level)
  'mesh unit length'?: number
  'mesh adaptation'?: any
  'laura mesh adaptation'?: any
  
  // Output and visualization (now at root level)
  visualization?: Array<any>
  components?: any
  
  // Restart settings (now at root level)
  restart?: boolean
  'restart filename'?: string
  'restart in filename'?: string
  'restart out filename'?: string
  
  // Advanced settings (now at root level)
  sequence?: Array<any>
  combustion?: any
  profiling?: any
  debug?: any
  
  // Allow any additional properties for schema flexibility
  [key: string]: any
}

/**
 * @deprecated Legacy nested config structure - use ConfigData directly.
 * The old schema used HyperSolve or Vulcan root keys. New schema is flat.
 * This type is kept for backwards compatibility during migration.
 */
export interface LegacyConfigData {
  'mesh filename'?: string | string[]
  steps?: number
  restart?: boolean
  'restart filename'?: string
  sequence?: Array<any>
  
  HyperSolve?: {
    'boundary conditions'?: BoundaryCondition[]
    states?: Record<string, State>
    [key: string]: any
  }
  
  Vulcan?: {
    'boundary conditions'?: BoundaryCondition[]
    states?: Record<string, State>
    [key: string]: any
  }
  
  [key: string]: any
}
