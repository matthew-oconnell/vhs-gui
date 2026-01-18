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
  [key: string]: any // Allow additional properties based on state type
}

export interface ConfigData {
  'mesh filename'?: string
  steps?: number
  HyperSolve?: {
    'boundary conditions'?: BoundaryCondition[]
    states?: Record<string, State> // Key-value pairs where key is the state name
    [key: string]: any
  }
  [key: string]: any
}
