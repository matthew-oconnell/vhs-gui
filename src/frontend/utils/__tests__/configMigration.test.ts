import { describe, it, expect } from 'vitest'
import {
  migrateConfigToFlatStructure,
  detectConfigFormat,
  isOldFormat,
  migrateBCType,
  migrateBCTypes
} from '../configMigration'

describe('detectConfigFormat', () => {
  it('detects old HyperSolve format', () => {
    const config = {
      'mesh filename': 'test.ugrid',
      HyperSolve: {
        'boundary conditions': [],
        states: {}
      }
    }

    expect(detectConfigFormat(config)).toBe('old-hypersolve')
  })

  it('detects old Vulcan format', () => {
    const config = {
      'mesh filename': 'test.ugrid',
      Vulcan: {
        'boundary conditions': [],
        states: {}
      }
    }

    expect(detectConfigFormat(config)).toBe('old-vulcan')
  })

  it('detects new flat format with boundary conditions', () => {
    const config = {
      'mesh filename': 'test.ugrid',
      'boundary conditions': [],
      states: {}
    }

    expect(detectConfigFormat(config)).toBe('flat')
  })

  it('detects new flat format without boundary conditions', () => {
    const config = {
      'mesh filename': 'test.ugrid',
      steps: 500
    }

    expect(detectConfigFormat(config)).toBe('flat')
  })

  it('prefers HyperSolve when both HyperSolve and Vulcan exist', () => {
    const config = {
      'mesh filename': 'test.ugrid',
      HyperSolve: { 'boundary conditions': [] },
      Vulcan: { 'boundary conditions': [] }
    }

    expect(detectConfigFormat(config)).toBe('old-hypersolve')
  })

  it('handles empty config object', () => {
    expect(detectConfigFormat({})).toBe('flat')
  })
})

describe('isOldFormat', () => {
  it('returns true for old HyperSolve format', () => {
    const config = {
      HyperSolve: { 'boundary conditions': [] }
    }

    expect(isOldFormat(config)).toBe(true)
  })

  it('returns true for old Vulcan format', () => {
    const config = {
      Vulcan: { 'boundary conditions': [] }
    }

    expect(isOldFormat(config)).toBe(true)
  })

  it('returns false for flat format', () => {
    const config = {
      'mesh filename': 'test.ugrid',
      'boundary conditions': []
    }

    expect(isOldFormat(config)).toBe(false)
  })

  it('returns false for empty config', () => {
    expect(isOldFormat({})).toBe(false)
  })
})

describe('migrateConfigToFlatStructure', () => {
  describe('HyperSolve migration', () => {
    it('migrates basic HyperSolve config to flat structure', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          'boundary conditions': [
            { type: 'no slip', 'mesh boundary tags': 1 }
          ],
          states: {
            freestream: {
              'mach number': 2.0,
              temperature: 300,
              pressure: 101325
            }
          }
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated['boundary conditions']).toEqual(oldConfig.HyperSolve['boundary conditions'])
      expect(migrated.states).toEqual(oldConfig.HyperSolve.states)
      expect(migrated['mesh filename']).toBe('mesh.ugrid')
      expect(migrated.HyperSolve).toBeUndefined()
    })

    it('migrates all nested properties from HyperSolve', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          'boundary conditions': [],
          states: {},
          steps: 1000,
          discretization: { 'flux function': 'roe' },
          thermodynamics: { species: ['N2', 'O2'] },
          'time accuracy': { enabled: true }
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated.steps).toBe(1000)
      expect(migrated.discretization).toEqual({ 'flux function': 'roe' })
      expect(migrated.thermodynamics).toEqual({ species: ['N2', 'O2'] })
      expect(migrated['time accuracy']).toEqual({ enabled: true })
      expect(migrated.HyperSolve).toBeUndefined()
    })

    it('preserves root-level properties during migration', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        restart: true,
        'restart filename': 'restart.snap',
        HyperSolve: {
          'boundary conditions': [],
          states: {},
          steps: 500
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated['mesh filename']).toBe('mesh.ugrid')
      expect(migrated.restart).toBe(true)
      expect(migrated['restart filename']).toBe('restart.snap')
      expect(migrated.steps).toBe(500)
      expect(migrated.HyperSolve).toBeUndefined()
    })

    it('handles nested value taking precedence over root value for same property', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        steps: 100, // Root-level value
        HyperSolve: {
          'boundary conditions': [],
          states: {},
          steps: 500 // Nested value should win
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      // Nested value takes precedence (that's the "real" config)
      expect(migrated.steps).toBe(500)
      expect(migrated.HyperSolve).toBeUndefined()
    })
  })

  describe('Vulcan migration', () => {
    it('migrates basic Vulcan config to flat structure', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        Vulcan: {
          'boundary conditions': [
            { type: 'riemann', state: 'freestream', 'mesh boundary tags': 2 }
          ],
          states: {
            freestream: {
              'mach number': 5.0,
              temperature: 220,
              pressure: 50000
            }
          }
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated['boundary conditions']).toEqual(oldConfig.Vulcan['boundary conditions'])
      expect(migrated.states).toEqual(oldConfig.Vulcan.states)
      expect(migrated['mesh filename']).toBe('mesh.ugrid')
      expect(migrated.Vulcan).toBeUndefined()
    })

    it('migrates all nested properties from Vulcan', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        Vulcan: {
          'boundary conditions': [],
          states: {},
          combustion: { enabled: true },
          'vulcan order': 3
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated.combustion).toEqual({ enabled: true })
      expect(migrated['vulcan order']).toBe(3)
      expect(migrated.Vulcan).toBeUndefined()
    })
  })

  describe('Edge cases and idempotency', () => {
    it('handles already-flat structure (idempotent)', () => {
      const flatConfig = {
        'mesh filename': 'mesh.ugrid',
        'boundary conditions': [
          { type: 'no slip', 'mesh boundary tags': 1 }
        ],
        states: {
          freestream: { 'mach number': 2.0 }
        },
        steps: 500
      }

      const migrated = migrateConfigToFlatStructure(flatConfig)

      // Should return identical structure
      expect(migrated).toEqual(flatConfig)
    })

    it('handles empty HyperSolve object', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {}
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated['mesh filename']).toBe('mesh.ugrid')
      expect(migrated.HyperSolve).toBeUndefined()
    })

    it('handles missing boundary conditions and states', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          steps: 500
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated.steps).toBe(500)
      expect(migrated['boundary conditions']).toBeUndefined()
      expect(migrated.states).toBeUndefined()
      expect(migrated.HyperSolve).toBeUndefined()
    })

    it('handles config with only root-level properties', () => {
      const config = {
        'mesh filename': 'mesh.ugrid',
        restart: true
      }

      const migrated = migrateConfigToFlatStructure(config)

      expect(migrated).toEqual(config)
    })

    it('handles empty config object', () => {
      const migrated = migrateConfigToFlatStructure({})

      expect(migrated).toEqual({})
    })

    it('handles null and undefined values in nested config', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          'boundary conditions': null,
          states: undefined,
          steps: 500
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated['boundary conditions']).toBeNull()
      expect(migrated.states).toBeUndefined()
      expect(migrated.steps).toBe(500)
    })
  })

  describe('Deep cloning behavior', () => {
    it('deep clones the config (does not mutate original)', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          'boundary conditions': [
            { type: 'no slip', 'mesh boundary tags': 1 }
          ],
          states: {
            freestream: { 'mach number': 2.0 }
          }
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      // Modify migrated config
      migrated['boundary conditions'][0].type = 'riemann'
      migrated.states.freestream['mach number'] = 5.0

      // Original should be unchanged
      expect(oldConfig.HyperSolve['boundary conditions'][0].type).toBe('no slip')
      expect(oldConfig.HyperSolve.states.freestream['mach number']).toBe(2.0)
    })
  })

  describe('Complex real-world scenarios', () => {
    it('migrates config with initialization regions', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          'boundary conditions': [],
          states: {},
          'initialization regions': [
            { type: 'aabb', state: 'shocked', lo: [0, 0, 0], hi: [1, 1, 1] }
          ]
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated['initialization regions']).toEqual(
        oldConfig.HyperSolve['initialization regions']
      )
    })

    it('migrates config with visualization settings', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          'boundary conditions': [],
          states: {},
          visualization: [
            { type: 'volume', filename: 'output.vtk' }
          ]
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated.visualization).toEqual(oldConfig.HyperSolve.visualization)
    })

    it('migrates config with sequence array', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        sequence: [
          { Vulcan: { 'boundary conditions': [] }, steps: 100 },
          { Vulcan: { 'boundary conditions': [] }, steps: 200 }
        ],
        HyperSolve: {
          'boundary conditions': [],
          states: {}
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      // Sequence array should be preserved as-is (it has its own nested structure)
      expect(migrated.sequence).toEqual(oldConfig.sequence)
      expect(migrated['boundary conditions']).toEqual(oldConfig.HyperSolve['boundary conditions'])
    })

    it('migrates config with deeply nested objects', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          'boundary conditions': [],
          states: {},
          discretization: {
            'flux function': 'roe',
            'slope limiter': {
              type: 'venkatakrishnan',
              settings: {
                epsilon: 1e-6
              }
            }
          }
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated.discretization).toEqual(oldConfig.HyperSolve.discretization)
      expect(migrated.discretization['slope limiter'].settings.epsilon).toBe(1e-6)
    })

    it('migrates config with array properties', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          'boundary conditions': [
            { type: 'no slip', 'mesh boundary tags': 1 },
            { type: 'riemann', 'mesh boundary tags': 2 }
          ],
          states: {},
          thermodynamics: {
            species: ['N2', 'O2', 'NO', 'N', 'O']
          }
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      expect(migrated['boundary conditions']).toHaveLength(2)
      expect(migrated.thermodynamics.species).toHaveLength(5)
    })
  })

  describe('Both HyperSolve and Vulcan present', () => {
    it('prefers HyperSolve when both exist', () => {
      const oldConfig = {
        'mesh filename': 'mesh.ugrid',
        HyperSolve: {
          'boundary conditions': [{ type: 'no slip' }],
          states: { state1: {} }
        },
        Vulcan: {
          'boundary conditions': [{ type: 'riemann' }],
          states: { state2: {} }
        }
      }

      const migrated = migrateConfigToFlatStructure(oldConfig)

      // Should use HyperSolve values
      expect(migrated['boundary conditions']).toEqual([{ type: 'no slip' }])
      expect(migrated.states).toEqual({ state1: {} })
      expect(migrated.HyperSolve).toBeUndefined()
      expect(migrated.Vulcan).toBeUndefined()
    })
  })
})

describe('migrateBCType', () => {
  it('migrates dirichlet to fixed inflow', () => {
    const bc = { type: 'dirichlet', state: 'freestream', 'mesh boundary tags': 1 }
    const migrated = migrateBCType(bc)
    
    expect(migrated.type).toBe('fixed inflow')
    expect(migrated.state).toBe('freestream')
    expect(migrated['mesh boundary tags']).toBe(1)
  })

  it('migrates dirichlet profile to fixed inflow with profile', () => {
    const bc = { type: 'dirichlet profile', state: 'inlet', profile: 'parabolic', 'mesh boundary tags': 2 }
    const migrated = migrateBCType(bc)
    
    expect(migrated.type).toBe('fixed inflow')
    expect(migrated.profile).toBe('parabolic')
  })

  it('migrates no slip to no slip wall', () => {
    const bc = { type: 'no slip', 'wall temperature': 300, 'mesh boundary tags': 1 }
    const migrated = migrateBCType(bc)
    
    expect(migrated.type).toBe('no slip wall')
    expect(migrated['wall temperature']).toBe(300)
  })

  it('migrates wall matching to no slip wall with flag', () => {
    const bc = { type: 'wall matching', 'mesh boundary tags': 3 }
    const migrated = migrateBCType(bc)
    
    expect(migrated.type).toBe('no slip wall')
    expect(migrated['wall matching']).toBe(true)
  })

  it('migrates extrapolation to supersonic outflow', () => {
    const bc = { type: 'extrapolation', 'mesh boundary tags': 4 }
    const migrated = migrateBCType(bc)
    
    expect(migrated.type).toBe('supersonic outflow')
  })

  it('migrates back pressure to subsonic outflow', () => {
    const bc = { type: 'back pressure', pressure: 101325, 'mesh boundary tags': 5 }
    const migrated = migrateBCType(bc)
    
    expect(migrated.type).toBe('subsonic outflow')
  })

  it('migrates subsonic inflow total to subsonic inflow', () => {
    const bc = { type: 'subsonic inflow total', state: 'inlet', 'mesh boundary tags': 6 }
    const migrated = migrateBCType(bc)
    
    expect(migrated.type).toBe('subsonic inflow')
  })

  it('does not migrate current BC types', () => {
    const bc = { type: 'riemann', state: 'freestream', 'mesh boundary tags': 7 }
    const migrated = migrateBCType(bc)
    
    expect(migrated).toEqual(bc)
  })

  it('handles BC without type field', () => {
    const bc = { 'mesh boundary tags': 1 }
    const migrated = migrateBCType(bc)
    
    expect(migrated).toEqual(bc)
  })
})

describe('migrateBCTypes', () => {
  it('migrates all BCs in a config', () => {
    const config = {
      'boundary conditions': [
        { type: 'dirichlet', state: 'inlet', 'mesh boundary tags': 1 },
        { type: 'no slip', 'wall temperature': 300, 'mesh boundary tags': 2 },
        { type: 'riemann', state: 'freestream', 'mesh boundary tags': 3 }
      ],
      states: {}
    }

    const migrated = migrateBCTypes(config)

    expect(migrated['boundary conditions'][0].type).toBe('fixed inflow')
    expect(migrated['boundary conditions'][1].type).toBe('no slip wall')
    expect(migrated['boundary conditions'][2].type).toBe('riemann') // Not migrated
  })

  it('handles config without boundary conditions', () => {
    const config = { states: {} }
    const migrated = migrateBCTypes(config)
    
    expect(migrated).toEqual(config)
  })

  it('does not mutate original config', () => {
    const config = {
      'boundary conditions': [
        { type: 'dirichlet', state: 'inlet', 'mesh boundary tags': 1 }
      ]
    }

    const migrated = migrateBCTypes(config)

    expect(config['boundary conditions'][0].type).toBe('dirichlet')
    expect(migrated['boundary conditions'][0].type).toBe('fixed inflow')
  })
})
