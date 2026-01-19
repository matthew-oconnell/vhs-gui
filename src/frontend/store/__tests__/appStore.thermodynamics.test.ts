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

  // Phase 2: Multispecies - Planetary Atmosphere Tests
  describe('multispecies planetary atmosphere', () => {
    it('creates Earth 5-species atmosphere configuration', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'earth',
        speciesModel: '5-species'
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.HyperSolve?.thermodynamics
      
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O'])
      expect(thermo?.['chemical nonequilibrium']).toBe(true)
      expect(thermo?.['thermodynamic data source']).toBe('NASA_9_coefficient')
      expect(thermo?.['molecular weight']).toBeUndefined()
      expect(thermo?.['ratio of specific heats']).toBeUndefined()
    })

    it('creates Earth 7-species atmosphere configuration', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'earth',
        speciesModel: '7-species'
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.HyperSolve?.thermodynamics
      
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-'])
      expect(thermo?.['chemical nonequilibrium']).toBe(true)
    })

    it('creates Earth 11-species atmosphere configuration', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'earth',
        speciesModel: '11-species'
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.HyperSolve?.thermodynamics
      
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'N2+', 'O2+', 'N+', 'O+', 'e-'])
      expect(thermo?.['chemical nonequilibrium']).toBe(true)
    })

    it('creates Mars Park 5-species atmosphere configuration', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'mars'
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.HyperSolve?.thermodynamics
      
      expect(thermo?.species).toEqual(['CO2', 'CO', 'N2', 'O2', 'NO'])
      expect(thermo?.['chemical nonequilibrium']).toBe(true)
      expect(thermo?.['thermodynamic data source']).toBe('NASA_9_coefficient')
    })

    it('replaces ideal gas configuration with multispecies', () => {
      // Start with ideal gas
      useAppStore.setState({
        configData: {
          HyperSolve: {
            thermodynamics: {
              species: ['perfect gas'],
              'molecular weight': 28.97,
              'ratio of specific heats': 1.4,
              'chemical nonequilibrium': false
            }
          }
        }
      })
      
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'earth',
        speciesModel: '5-species'
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.HyperSolve?.thermodynamics
      
      // Should completely replace with multispecies config
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O'])
      expect(thermo?.['chemical nonequilibrium']).toBe(true)
      expect(thermo?.['molecular weight']).toBeUndefined()
      expect(thermo?.['ratio of specific heats']).toBeUndefined()
    })
  })

  // Phase 3: Multispecies - Reaction File Tests
  describe('multispecies reaction file', () => {
    it('creates configuration from reaction file with species', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        reactionModelFile: 'reac_mod.H2_7x7',
        selectedSpecies: ['H2', 'O2', 'OH', 'H', 'O', 'H2O']
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.HyperSolve?.thermodynamics
      
      expect(thermo?.species).toEqual(['H2', 'O2', 'OH', 'H', 'O', 'H2O'])
      expect(thermo?.['chemical nonequilibrium']).toBe(true)
      expect(thermo?.['thermodynamic data source']).toBe('NASA_9_coefficient')
      expect(thermo?.['reaction model filename']).toBe('reac_mod.H2_7x7')
    })

    it('handles complex species names from reaction files', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        reactionModelFile: 'custom_reactions.dat',
        selectedSpecies: ['CH2CO,ketene', 'C4H9,s-butyl', 'CH3(OH)', 'O2']
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.HyperSolve?.thermodynamics
      
      expect(thermo?.species).toContain('CH2CO,ketene')
      expect(thermo?.species).toContain('C4H9,s-butyl')
      expect(thermo?.species).toContain('CH3(OH)')
      expect(thermo?.['reaction model filename']).toBe('custom_reactions.dat')
    })

    it('replaces planetary atmosphere with reaction file config', () => {
      // Start with planetary atmosphere
      useAppStore.setState({
        configData: {
          HyperSolve: {
            thermodynamics: {
              species: ['N2', 'O2', 'NO', 'N', 'O'],
              'chemical nonequilibrium': true,
              'thermodynamic data source': 'NASA_9_coefficient'
            }
          }
        }
      })
      
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        reactionModelFile: 'reac_mod.combustion',
        selectedSpecies: ['CH4', 'O2', 'CO2', 'H2O', 'N2']
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.HyperSolve?.thermodynamics
      
      // Should completely replace with reaction file config
      expect(thermo?.species).toEqual(['CH4', 'O2', 'CO2', 'H2O', 'N2'])
      expect(thermo?.['reaction model filename']).toBe('reac_mod.combustion')
    })
  })
})
