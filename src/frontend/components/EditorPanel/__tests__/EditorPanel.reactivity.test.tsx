import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import EditorPanel from '../EditorPanel'
import { useAppStore } from '../../../store/appStore'

// Mock fetch for schema loading
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      properties: {
        HyperSolve: {
          properties: {
            'time accuracy': {
              type: 'object',
              properties: {
                cfl: { type: 'number', description: 'CFL number' },
                timestep: { type: 'number', description: 'Timestep value' },
                'use local timestepping': { type: 'boolean' },
                scheme: { type: 'string', enum: ['BDF', 'ESDIRK', 'RK'] }
              }
            }
          }
        }
      }
    })
  })
) as any

describe('EditorPanel - Generic Object Editor Reactivity', () => {
  beforeEach(() => {
    // Reset store to clean state with a generic object (time accuracy)
    // This is NOT a special-cased node like thermodynamics, so it will use the generic editor
    useAppStore.setState({
      configData: {
        HyperSolve: {
          'time accuracy': {
            cfl: 1.0,
            timestep: 0.001,
            'use local timestepping': false,
            scheme: 'BDF'
          },
          'boundary conditions': [],
          states: {}
        }
      },
      selectedNode: {
        id: 'root.HyperSolve.time accuracy',
        label: 'time accuracy',
        type: 'object',
        path: 'HyperSolve.time accuracy',
        description: 'Time integration settings'
      } as any,
      selectedBC: null,
      selectedState: null,
      selectedSurface: null,
      selectedViz: null,
      selectedInitRegion: null,
      availableSurfaces: []
    })
  })

  it('updates number input values when config changes via store', async () => {
    const { rerender } = render(<EditorPanel />)
    
    // Wait for component to render
    await screen.findByText('time accuracy')
    
    // Find initial values - using getByDisplayValue for uncontrolled inputs
    const cflInput = screen.getByDisplayValue('1') as HTMLInputElement
    const timestepInput = screen.getByDisplayValue('0.001') as HTMLInputElement
    
    expect(cflInput.value).toBe('1')
    expect(timestepInput.value).toBe('0.001')
    
    // Update config via store
    useAppStore.setState({
      configData: {
        HyperSolve: {
          'time accuracy': {
            cfl: 2.5,
            timestep: 0.0005,
            'use local timestepping': false,
            scheme: 'BDF'
          },
          'boundary conditions': [],
          states: {}
        }
      }
    })
    
    // Force re-render
    rerender(<EditorPanel />)
    
    // THIS WILL FAIL because inputs use defaultValue (uncontrolled)
    // After fix, these should pass
    expect(cflInput.value).toBe('2.5')
    expect(timestepInput.value).toBe('0.0005')
  })

  it('updates boolean toggles when config changes', async () => {
    const { rerender } = render(<EditorPanel />)
    
    await screen.findByText('time accuracy')
    
    // Find checkbox - it should be unchecked initially
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    
    // Update config to enable local timestepping
    useAppStore.setState({
      configData: {
        HyperSolve: {
          'time accuracy': {
            cfl: 1.0,
            timestep: 0.001,
            'use local timestepping': true,  // Changed to true
            scheme: 'BDF'
          },
          'boundary conditions': [],
          states: {}
        }
      }
    })
    
    rerender(<EditorPanel />)
    
    // THIS WILL FAIL - checkbox should be checked now
    expect(checkbox.checked).toBe(true)
  })

  it('updates enum dropdowns when config changes', async () => {
    const { rerender } = render(<EditorPanel />)
    
    await screen.findByText('time accuracy')
    
    // Find the scheme dropdown - should be BDF initially
    const select = screen.getByDisplayValue('BDF') as HTMLSelectElement
    expect(select.value).toBe('BDF')
    
    // Update config to change scheme
    useAppStore.setState({
      configData: {
        HyperSolve: {
          'time accuracy': {
            cfl: 1.0,
            timestep: 0.001,
            'use local timestepping': false,
            scheme: 'ESDIRK'  // Changed
          },
          'boundary conditions': [],
          states: {}
        }
      }
    })
    
    rerender(<EditorPanel />)
    
    // THIS WILL FAIL - select should show ESDIRK
    expect(select.value).toBe('ESDIRK')
  })
})
