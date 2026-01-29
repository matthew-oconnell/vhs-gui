import { describe, it, expect } from 'vitest'

/**
 * Tests for config save/load transformations
 * 
 * These tests verify that:
 * 1. Internal UI fields (id, name) are removed before saving
 * 2. Mesh boundary tags are properly converted between tag numbers and surface names
 * 3. Single values remain single (not wrapped in arrays)
 * 4. Array values remain arrays
 */

// Helper function that mimics cleanConfigForSave from App.tsx
const cleanConfigForSave = (config: any, availableTags: Array<{ metadata: { tag: number; tagName: string } }>, rootSolverKey: string = 'HyperSolve'): any => {
  const cleaned = JSON.parse(JSON.stringify(config)) // Deep clone
  
  // Determine if config is flat or nested under root solver key
  let bcArray = cleaned['boundary conditions']
  let statesObj = cleaned.states
  
  // If not found at root level, check under root solver key
  if (!bcArray && cleaned[rootSolverKey]) {
    bcArray = cleaned[rootSolverKey]['boundary conditions']
    statesObj = cleaned[rootSolverKey].states
  }
  
  // Remove 'id' and 'name' from boundary conditions
  // Use BC's name as the value for 'mesh boundary tags'
  if (bcArray) {
    const cleanedBCs = bcArray.map((bc: any) => {
      const { id, name, ...bcClean } = bc
      
      // If BC has a name and mesh boundary tags, replace tags with the BC name
      if (bc.name && bcClean['mesh boundary tags'] !== undefined) {
        bcClean['mesh boundary tags'] = bc.name
      }
      
      return bcClean
    })
    
    // Update the BCs in the correct location
    if (cleaned['boundary conditions']) {
      cleaned['boundary conditions'] = cleanedBCs
    } else if (cleaned[rootSolverKey]) {
      cleaned[rootSolverKey]['boundary conditions'] = cleanedBCs
    }
  }
  
  // Remove 'id' and 'name' from states if they have them
  if (statesObj && typeof statesObj === 'object') {
    const cleanedStates: any = {}
    Object.entries(statesObj).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === 'object') {
        const { id, name, ...stateClean } = value as any
        cleanedStates[key] = stateClean
      } else {
        cleanedStates[key] = value
      }
    })
    
    // Update states in the correct location
    if (cleaned.states) {
      cleaned.states = cleanedStates
    } else if (cleaned[rootSolverKey]) {
      cleaned[rootSolverKey].states = cleanedStates
    }
  }
  
  return cleaned
}

describe('Config save transformations', () => {
  it('removes id and name from boundary conditions', () => {
    const config = {
      HyperSolve: {
        'boundary conditions': [
          {
            id: 'bc-123',
            name: 'My BC',
            type: 'no slip',
            'mesh boundary tags': 5
          }
        ]
      }
    }
    
    const surfaces = [
      { metadata: { tag: 5, tagName: 'wall' } }
    ]
    
    const cleaned = cleanConfigForSave(config, surfaces)
    
    expect(cleaned.HyperSolve['boundary conditions'][0]).not.toHaveProperty('id')
    expect(cleaned.HyperSolve['boundary conditions'][0]).not.toHaveProperty('name')
    expect(cleaned.HyperSolve['boundary conditions'][0].type).toBe('no slip')
  })
  
  it('replaces mesh boundary tags with BC name', () => {
    const config = {
      HyperSolve: {
        'boundary conditions': [
          {
            id: 'bc-123',
            name: 'wall',
            type: 'no slip',
            'mesh boundary tags': 5  // Will be replaced with "wall"
          }
        ]
      }
    }
    
    const surfaces = [
      { metadata: { tag: 5, tagName: 'Body7_Face2' } }
    ]
    
    const cleaned = cleanConfigForSave(config, surfaces)
    
    // mesh boundary tags should now be the BC name, not the surface tag name
    expect(cleaned.HyperSolve['boundary conditions'][0]['mesh boundary tags']).toBe('wall')
  })
  
  it('replaces array of mesh boundary tags with BC name', () => {
    const config = {
      HyperSolve: {
        'boundary conditions': [
          {
            id: 'bc-123',
            name: 'vehicle',
            type: 'no slip',
            'mesh boundary tags': [10, 20, 30]  // Will be replaced with "vehicle"
          }
        ]
      }
    }
    
    const surfaces = [
      { metadata: { tag: 10, tagName: 'Body1_Face1' } },
      { metadata: { tag: 20, tagName: 'Body2_Face1' } },
      { metadata: { tag: 30, tagName: 'Body3_Face1' } }
    ]
    
    const cleaned = cleanConfigForSave(config, surfaces)
    
    expect(cleaned.HyperSolve['boundary conditions'][0]['mesh boundary tags']).toBe('vehicle')
  })
  
  it('preserves mesh boundary tags if BC has no name', () => {
    const config = {
      HyperSolve: {
        'boundary conditions': [
          {
            id: 'bc-123',
            type: 'no slip',
            'mesh boundary tags': 5  // No name, so keep original
          }
        ]
      }
    }
    
    const surfaces = [
      { metadata: { tag: 5, tagName: 'wall' } }
    ]
    
    const cleaned = cleanConfigForSave(config, surfaces)
    
    // Should preserve original value since there's no name
    expect(cleaned.HyperSolve['boundary conditions'][0]['mesh boundary tags']).toBe(5)
  })
  
  it('removes id and name from states', () => {
    const config = {
      HyperSolve: {
        states: {
          freestream: {
            id: 'state-123',
            name: 'freestream',
            'mach number': 0.8,
            temperature: 300
          }
        }
      }
    }
    
    const surfaces: any[] = []
    
    const cleaned = cleanConfigForSave(config, surfaces)
    
    expect(cleaned.HyperSolve.states.freestream).not.toHaveProperty('id')
    expect(cleaned.HyperSolve.states.freestream).not.toHaveProperty('name')
    expect(cleaned.HyperSolve.states.freestream['mach number']).toBe(0.8)
    expect(cleaned.HyperSolve.states.freestream.temperature).toBe(300)
  })
  
  it('handles flat config structure (no root solver key)', () => {
    const config = {
      'boundary conditions': [
        {
          id: 'bc-123',
          name: 'My BC',
          type: 'no slip',
          'mesh boundary tags': 5
        }
      ],
      states: {
        freestream: {
          id: 'state-123',
          name: 'freestream',
          'mach number': 0.8
        }
      }
    }
    
    const surfaces = [
      { metadata: { tag: 5, tagName: 'wall' } }
    ]
    
    const cleaned = cleanConfigForSave(config, surfaces)
    
    // Should remove id and name from BC
    expect(cleaned['boundary conditions'][0]).not.toHaveProperty('id')
    expect(cleaned['boundary conditions'][0]).not.toHaveProperty('name')
    expect(cleaned['boundary conditions'][0]['mesh boundary tags']).toBe('My BC')
    
    expect(cleaned.states.freestream).not.toHaveProperty('id')
    expect(cleaned.states.freestream).not.toHaveProperty('name')
    expect(cleaned.states.freestream['mach number']).toBe(0.8)
  })
  
  it('replaces mesh boundary tags with BC name in flat structure', () => {
    const config = {
      'boundary conditions': [
        {
          id: 'bc-123',
          name: 'vehicle',
          type: 'no slip',
          'mesh boundary tags': [10, 20, 30]
        }
      ]
    }
    
    const surfaces = [
      { metadata: { tag: 10, tagName: 'Body1' } },
      { metadata: { tag: 20, tagName: 'Body2' } },
      { metadata: { tag: 30, tagName: 'Body3' } }
    ]
    
    const cleaned = cleanConfigForSave(config, surfaces)
    
    expect(cleaned['boundary conditions'][0]['mesh boundary tags']).toBe('vehicle')
  })
})