import { describe, it, expect } from 'vitest'
import type { ConfigData, BoundaryCondition, State, LegacyConfigData } from '../config'

describe('ConfigData type', () => {
  it('accepts flat boundary conditions array at root level', () => {
    const config: ConfigData = {
      'mesh filename': 'test.ugrid',
      'boundary conditions': [],
      states: {}
    }
    
    expect(config['boundary conditions']).toBeDefined()
    expect(config['boundary conditions']).toEqual([])
  })

  it('accepts states at root level', () => {
    const config: ConfigData = {
      'mesh filename': 'test.ugrid',
      'boundary conditions': [],
      states: {
        freestream: {
          id: 'state-1',
          name: 'freestream',
          'mach number': 2.0,
          temperature: 300,
          pressure: 101325
        }
      }
    }
    
    expect(config.states?.freestream).toBeDefined()
  })

  it('accepts all common root-level properties', () => {
    const config: ConfigData = {
      'mesh filename': 'mesh.ugrid',
      'boundary conditions': [],
      states: {},
      steps: 500,
      'checkpoint frequency': 100,
      discretization: {
        'flux function': 'roe'
      },
      thermodynamics: {
        species: ['N2', 'O2']
      },
      'time accuracy': {
        enabled: true
      }
    }
    
    expect(config.steps).toBe(500)
    expect(config.discretization).toBeDefined()
    expect(config.thermodynamics).toBeDefined()
  })

  it('does not require HyperSolve or Vulcan keys', () => {
    const config: ConfigData = {
      'mesh filename': 'test.ugrid',
      'boundary conditions': [],
      states: {}
    }
    
    // TypeScript should not require HyperSolve or Vulcan
    expect(config).toBeDefined()
  })

  it('accepts initialization regions at root level', () => {
    const config: ConfigData = {
      'mesh filename': 'test.ugrid',
      'boundary conditions': [],
      states: {},
      'initialization regions': [
        {
          id: 'init-1',
          type: 'aabb',
          state: 'shocked',
          lo: [0, 0, 0],
          hi: [1, 1, 1]
        }
      ]
    }
    
    expect(config['initialization regions']).toHaveLength(1)
  })

  it('accepts visualization at root level', () => {
    const config: ConfigData = {
      'mesh filename': 'test.ugrid',
      'boundary conditions': [],
      states: {},
      visualization: [
        {
          type: 'volume',
          filename: 'output.vtk'
        }
      ]
    }
    
    expect(config.visualization).toHaveLength(1)
  })
})

describe('BoundaryCondition type', () => {
  it('accepts standard BC properties', () => {
    const bc: BoundaryCondition = {
      id: 'bc-1',
      name: 'Wall BC',
      type: 'no slip',
      'mesh boundary tags': 1,
      'wall temperature': 300
    }
    
    expect(bc.id).toBe('bc-1')
    expect(bc.type).toBe('no slip')
  })

  it('accepts BCs with state reference', () => {
    const bc: BoundaryCondition = {
      id: 'bc-2',
      type: 'riemann',
      state: 'freestream',
      'mesh boundary tags': 2
    }
    
    expect(bc.state).toBe('freestream')
  })

  it('accepts array of mesh boundary tags', () => {
    const bc: BoundaryCondition = {
      id: 'bc-3',
      type: 'symmetry',
      'mesh boundary tags': [1, 2, 3]
    }
    
    expect(bc['mesh boundary tags']).toEqual([1, 2, 3])
  })
})

describe('State type', () => {
  it('accepts standard state properties', () => {
    const state: State = {
      id: 'state-1',
      name: 'freestream',
      'mach number': 2.0,
      temperature: 300,
      pressure: 101325
    }
    
    expect(state['mach number']).toBe(2.0)
  })

  it('accepts state with angle of attack and yaw', () => {
    const state: State = {
      id: 'state-2',
      name: 'freestream',
      'mach number': 5.0,
      temperature: 220,
      pressure: 50000,
      'angle of attack': 10,
      'angle of yaw': 5
    }
    
    expect(state['angle of attack']).toBe(10)
    expect(state['angle of yaw']).toBe(5)
  })

  it('accepts state with mass fractions', () => {
    const state: State = {
      id: 'state-3',
      name: 'air',
      'mach number': 2.0,
      temperature: 300,
      pressure: 101325,
      'mass fractions': {
        N2: 0.79,
        O2: 0.21
      }
    }
    
    expect(state['mass fractions']).toEqual({ N2: 0.79, O2: 0.21 })
  })
})

describe('LegacyConfigData type (deprecated)', () => {
  it('accepts old HyperSolve nested structure', () => {
    const config: LegacyConfigData = {
      'mesh filename': 'test.ugrid',
      HyperSolve: {
        'boundary conditions': [],
        states: {}
      }
    }
    
    expect(config.HyperSolve?.['boundary conditions']).toBeDefined()
  })

  it('accepts old Vulcan nested structure', () => {
    const config: LegacyConfigData = {
      'mesh filename': 'test.ugrid',
      Vulcan: {
        'boundary conditions': [],
        states: {}
      }
    }
    
    expect(config.Vulcan?.['boundary conditions']).toBeDefined()
  })
})
