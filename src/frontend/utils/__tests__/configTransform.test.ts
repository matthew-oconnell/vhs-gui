import { describe, it, expect, beforeEach, vi } from 'vitest'
import { transformLoadedConfig } from '../configTransform'

// Mock Date.now() to get predictable IDs in tests
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(1234567890)
})

/**
 * Test the transformation of loaded config to match mesh surfaces
 * 
 * When a config file has BCs with surface name references (e.g., "wall"),
 * and a mesh is loaded with surfaces that have tag names (e.g., "wall" = tag 5),
 * the transformation should convert the BC's surface name to the tag number.
 */
describe('Config transformation with mesh surfaces', () => {
  it('converts BC surface names to tag numbers when mesh is loaded', () => {
    // ARRANGE: Config with BC referencing surface name "wall"
    const loadedConfig = {
      'mesh filename': 'test.obj',
      'boundary conditions': [
        {
          type: 'no slip',
          'mesh boundary tags': 'wall'  // Surface name from config file
        }
      ]
    }
    
    // ARRANGE: Mesh surfaces with tag names and numbers
    const surfaces = [
      {
        id: 'surface-1',
        name: 'Surface 1',
        metadata: {
          tag: 5,
          tagName: 'wall'
        }
      }
    ]
    
    // ACT: Transform the config (function to be implemented)
    const transformedConfig = transformLoadedConfig(loadedConfig, surfaces)
    
    // ASSERT: BC should now have tag number instead of name
    expect(transformedConfig['boundary conditions'][0]['mesh boundary tags']).toBe(5)
    expect(transformedConfig['boundary conditions'][0]).toHaveProperty('id')
    expect(transformedConfig['boundary conditions'][0]).toHaveProperty('name')
  })
  
  it('converts BC surface name arrays to tag number arrays', () => {
    const loadedConfig = {
      'boundary conditions': [
        {
          type: 'dirichlet',
          'mesh boundary tags': ['inlet', 'outlet']  // Array of surface names
        }
      ]
    }
    
    const surfaces = [
      { id: '1', name: 'Inlet', metadata: { tag: 10, tagName: 'inlet' } },
      { id: '2', name: 'Outlet', metadata: { tag: 20, tagName: 'outlet' } }
    ]
    
    const transformedConfig = transformLoadedConfig(loadedConfig, surfaces)
    
    expect(transformedConfig['boundary conditions'][0]['mesh boundary tags']).toEqual([10, 20])
  })
  
  it('preserves tag numbers that are already numeric', () => {
    const loadedConfig = {
        'boundary conditions': [
          {
            type: 'no slip',
            'mesh boundary tags': 5  // Already a number
          }
        ]
      }
    
    const surfaces = [
      { id: '1', name: 'Wall', metadata: { tag: 5, tagName: 'wall' } }
    ]
    
    const transformedConfig = transformLoadedConfig(loadedConfig, surfaces)
    
    expect(transformedConfig['boundary conditions'][0]['mesh boundary tags']).toBe(5)
  })
  
  it('handles missing surface names gracefully', () => {
    const loadedConfig = {
        'boundary conditions': [
          {
            type: 'no slip',
            'mesh boundary tags': 'nonexistent-surface'
          }
        ]
      }
    
    const surfaces = [
      { id: '1', name: 'Wall', metadata: { tag: 5, tagName: 'wall' } }
    ]
    
    const transformedConfig = transformLoadedConfig(loadedConfig, surfaces)
    
    // Should preserve the original value if no match found
    expect(transformedConfig['boundary conditions'][0]['mesh boundary tags']).toBe('nonexistent-surface')
  })
  
  it('handles nested config with root solver key (HyperSolve)', () => {
    const loadedConfig = {
      HyperSolve: {
        'mesh filename': 'test.obj',
        'boundary conditions': [
          {
            type: 'no slip',
            'mesh boundary tags': 'wall'
          }
        ]
      }
    }
    
    const surfaces = [
      { id: '1', name: 'Wall', metadata: { tag: 5, tagName: 'wall' } }
    ]
    
    const transformedConfig = transformLoadedConfig(loadedConfig, surfaces, 'HyperSolve')
    
    // Should transform BCs under the root solver key
    expect(transformedConfig.HyperSolve['boundary conditions'][0]['mesh boundary tags']).toBe(5)
    expect(transformedConfig.HyperSolve['boundary conditions'][0]).toHaveProperty('id')
    expect(transformedConfig.HyperSolve['boundary conditions'][0]).toHaveProperty('name')
  })
  
  it('handles nested config with custom root solver key', () => {
    const loadedConfig = {
      CustomSolver: {
        'boundary conditions': [
          {
            type: 'dirichlet',
            'mesh boundary tags': ['inlet', 'outlet']
          }
        ]
      }
    }
    
    const surfaces = [
      { id: '1', name: 'Inlet', metadata: { tag: 10, tagName: 'inlet' } },
      { id: '2', name: 'Outlet', metadata: { tag: 20, tagName: 'outlet' } }
    ]
    
    const transformedConfig = transformLoadedConfig(loadedConfig, surfaces, 'CustomSolver')
    
    expect(transformedConfig.CustomSolver['boundary conditions'][0]['mesh boundary tags']).toEqual([10, 20])
  })
})
