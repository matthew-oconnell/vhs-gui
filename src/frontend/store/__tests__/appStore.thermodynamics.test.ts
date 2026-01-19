import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../appStore'

describe('appStore - updateThermodynamics', () => {
  beforeEach(() => {
    // Reset store to clean state before each test
    useAppStore.setState({
      configData: {
        HyperSolve: {
          thermodynamics: {
            'chemical nonequilibrium': true,
            species: ['N2', 'O2', 'NO'],
            'reaction model filename': 'kinetic_data'
          }
        }
      },
      selectedNode: null,
      selectedBC: null,
      meshData: null,
      surfaces: []
    })
  })

  it('disables chemical nonequilibrium when ideal gas is selected', () => {
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'ideal-gas',
      molecularWeight: 28.97,
      gamma: 1.4
    })
    
    const state = useAppStore.getState()
    expect(state.configData.HyperSolve?.thermodynamics?.['chemical nonequilibrium']).toBe(false)
  })

  it('sets species to perfect gas for ideal gas', () => {
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'ideal-gas',
      molecularWeight: 28.97,
      gamma: 1.4
    })
    
    const state = useAppStore.getState()
    expect(state.configData.HyperSolve?.thermodynamics?.species).toEqual(['perfect gas'])
  })

  it('sets molecular weight and gamma for ideal gas', () => {
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'ideal-gas',
      molecularWeight: 28.97,
      gamma: 1.4
    })
    
    const state = useAppStore.getState()
    expect(state.configData.HyperSolve?.thermodynamics?.['molecular weight']).toBe(28.97)
    expect(state.configData.HyperSolve?.thermodynamics?.['ratio of specific heats']).toBe(1.4)
  })

  it('removes reaction model filename when ideal gas is selected', () => {
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'ideal-gas',
      molecularWeight: 28.97,
      gamma: 1.4
    })
    
    const state = useAppStore.getState()
    // When we set ideal gas, we should not have reaction model filename
    expect(state.configData.HyperSolve?.thermodynamics?.['reaction model filename']).toBeUndefined()
  })

  it('replaces multispecies configuration with ideal gas', () => {
    // Start with a complex multispecies setup
    useAppStore.setState({
      configData: {
        HyperSolve: {
          thermodynamics: {
            'chemical nonequilibrium': true,
            species: ['N2', 'O2', 'NO', 'N', 'O'],
            'reaction model filename': 'air-5species.dat',
            'thermal nonequilibrium': true
          }
        }
      }
    })
    
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'ideal-gas',
      molecularWeight: 28.97,
      gamma: 1.4
    })
    
    const state = useAppStore.getState()
    const thermo = state.configData.HyperSolve?.thermodynamics
    
    // Should completely replace with ideal gas config
    expect(thermo?.['chemical nonequilibrium']).toBe(false)
    expect(thermo?.species).toEqual(['perfect gas'])
    expect(thermo?.['molecular weight']).toBe(28.97)
    expect(thermo?.['ratio of specific heats']).toBe(1.4)
    expect(thermo?.['reaction model filename']).toBeUndefined()
    expect(thermo?.['thermal nonequilibrium']).toBeUndefined()
  })

  it('handles multispecies selection', () => {
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'multispecies'
    })
    
    const state = useAppStore.getState()
    expect(state.configData.HyperSolve?.thermodynamics?.species).toEqual([])
  })

  it('works with Vulcan root key instead of HyperSolve', () => {
    // Use Vulcan as root key
    useAppStore.setState({
      configData: {
        Vulcan: {
          thermodynamics: {
            'chemical nonequilibrium': true,
            species: ['N2', 'O2', 'NO'],
            'reaction model filename': 'kinetic_data'
          }
        }
      }
    })
    
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'ideal-gas',
      molecularWeight: 28.97,
      gamma: 1.4
    })
    
    const state = useAppStore.getState()
    // Should update Vulcan, not HyperSolve
    expect(state.configData.Vulcan?.thermodynamics?.['chemical nonequilibrium']).toBe(false)
    expect(state.configData.Vulcan?.thermodynamics?.species).toEqual(['perfect gas'])
    expect(state.configData.HyperSolve).toBeUndefined()
  })
})
