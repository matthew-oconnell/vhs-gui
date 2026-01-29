import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../appStore'

describe('appStore - updateThermodynamics', () => {
  beforeEach(() => {
    // Reset store to clean state before each test
    useAppStore.setState({
      configData: {
        thermodynamics: {
          'chemistry model': 'finite-rate',
          species: ['N2', 'O2', 'NO'],
          'reaction model filename': 'kinetic_data'
        }
      },
      selectedNode: null,
      selectedBC: null,
      meshData: null,
      surfaces: []
    })
  })

  it('sets chemistry model to frozen when ideal gas is selected', () => {
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'ideal-gas',
      molecularWeight: 28.97,
      gamma: 1.4
    })
    
    const state = useAppStore.getState()
    expect(state.configData.thermodynamics?.['chemistry model']).toBe('frozen')
  })

  it('sets species to perfect gas for ideal gas', () => {
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'ideal-gas',
      molecularWeight: 28.97,
      gamma: 1.4
    })
    
    const state = useAppStore.getState()
    expect(state.configData.thermodynamics?.species).toEqual(['perfect gas'])
  })

  it('sets molecular weight and gamma for ideal gas', () => {
    const { updateThermodynamics } = useAppStore.getState()
    
    updateThermodynamics({
      gasModel: 'ideal-gas',
      molecularWeight: 28.97,
      gamma: 1.4
    })
    
    const state = useAppStore.getState()
    expect(state.configData.thermodynamics?.['molecular weight']).toBe(28.97)
    expect(state.configData.thermodynamics?.['ratio of specific heats']).toBe(1.4)
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
    expect(state.configData.thermodynamics?.['reaction model filename']).toBeUndefined()
  })

  it('replaces multispecies configuration with ideal gas', () => {
    // Start with a complex multispecies setup
    useAppStore.setState({
      configData: {
        thermodynamics: {
          'chemistry model': 'finite-rate',
          species: ['N2', 'O2', 'NO', 'N', 'O'],
          'reaction model filename': 'air-5species.dat',
          'thermal nonequilibrium': true
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
    const thermo = state.configData.thermodynamics
    
    // Should completely replace with ideal gas config
    expect(thermo?.['chemistry model']).toBe('frozen')
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
    expect(state.configData.thermodynamics?.species).toEqual([])
  })

  it('works with Vulcan root key instead of HyperSolve', () => {
    // Use Vulcan as root key
    useAppStore.setState({
      configData: {
        thermodynamics: {
          'chemistry model': 'finite-rate',
          species: ['N2', 'O2', 'NO'],
          'reaction model filename': 'kinetic_data'
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
        expect(state.configData.thermodynamics?.['chemistry model']).toBe('frozen')
    expect(state.configData.thermodynamics?.species).toEqual(['perfect gas'])
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
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O'])
      expect(thermo?.['chemistry model']).toBe('finite-rate')
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
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-'])
      expect(thermo?.['chemistry model']).toBe('finite-rate')
    })

    it('creates Earth 11-species atmosphere configuration', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'earth',
        speciesModel: '11-species'
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'N2+', 'O2+', 'N+', 'O+', 'e-'])
      expect(thermo?.['chemistry model']).toBe('finite-rate')
    })

    it('creates Mars Park 5-species atmosphere configuration', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'mars'
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.species).toEqual(['CO2', 'CO', 'N2', 'O2', 'NO'])
      expect(thermo?.['chemistry model']).toBe('finite-rate')
      expect(thermo?.['thermodynamic data source']).toBe('NASA_9_coefficient')
    })

    it('replaces ideal gas configuration with multispecies', () => {
      // Start with ideal gas
      useAppStore.setState({
        configData: {
        thermodynamics: {
              species: ['perfect gas'],
              'molecular weight': 28.97,
              'ratio of specific heats': 1.4,
              'chemistry model': 'frozen'
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
      const thermo = state.configData.thermodynamics
      
      // Should completely replace with multispecies config
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O'])
      expect(thermo?.['chemistry model']).toBe('finite-rate')
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
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.species).toEqual(['H2', 'O2', 'OH', 'H', 'O', 'H2O'])
      expect(thermo?.['chemistry model']).toBe('finite-rate')
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
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.species).toContain('CH2CO,ketene')
      expect(thermo?.species).toContain('C4H9,s-butyl')
      expect(thermo?.species).toContain('CH3(OH)')
      expect(thermo?.['reaction model filename']).toBe('custom_reactions.dat')
    })

    it('adds inert species N to reaction file species list', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        reactionModelFile: 'reac_mod.H2_7x7',
        selectedSpecies: ['H2', 'O2', 'OH', 'H', 'O', 'H2O'],
        inertSpecies: ['N']
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      // Should combine reaction species + inert species
      expect(thermo?.species).toEqual(['H2', 'O2', 'OH', 'H', 'O', 'H2O', 'N'])
      expect(thermo?.['reaction model filename']).toBe('reac_mod.H2_7x7')
    })

    it('adds inert species N2 to reaction file species list', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        reactionModelFile: 'reac_mod.H2_7x7',
        selectedSpecies: ['H2', 'O2', 'OH', 'H', 'O', 'H2O'],
        inertSpecies: ['N2']
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.species).toEqual(['H2', 'O2', 'OH', 'H', 'O', 'H2O', 'N2'])
    })

    it('adds multiple inert species to reaction file species list', () => {
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        reactionModelFile: 'reac_mod.H2_7x7',
        selectedSpecies: ['H2', 'O2', 'OH', 'H', 'O', 'H2O'],
        inertSpecies: ['N', 'N2']
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.species).toEqual(['H2', 'O2', 'OH', 'H', 'O', 'H2O', 'N', 'N2'])
    })

    it('replaces planetary atmosphere with reaction file config', () => {
      // Start with planetary atmosphere
      useAppStore.setState({
        configData: {
        thermodynamics: {
              species: ['N2', 'O2', 'NO', 'N', 'O'],
              'chemistry model': 'finite-rate',
              'thermodynamic data source': 'NASA_9_coefficient'
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
      const thermo = state.configData.thermodynamics
      
      // Should completely replace with reaction file config
      expect(thermo?.species).toEqual(['CH4', 'O2', 'CO2', 'H2O', 'N2'])
      expect(thermo?.['reaction model filename']).toBe('reac_mod.combustion')
    })
  })

  describe('Chemistry Model Toggle (Phase 5)', () => {
    it('sets chemistry model to finite-rate when explicitly set to true', () => {
      useAppStore.setState({
        configData: {},
      })
      
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'earth',
        speciesModel: '5-species',
        chemicalNonequilibrium: true
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.['chemistry model']).toBe('finite-rate')
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O'])
    })

    it('sets chemistry model to frozen when explicitly set to false (frozen flow)', () => {
      useAppStore.setState({
        configData: {},
      })
      
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'earth',
        speciesModel: '7-species',
        chemicalNonequilibrium: false
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.['chemistry model']).toBe('frozen')
      expect(thermo?.species).toEqual(['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-'])
    })

    it('defaults to finite-rate when chemicalNonequilibrium not provided (backwards compatible)', () => {
      useAppStore.setState({
        configData: {},
      })
      
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        planetaryBody: 'mars'
        // chemicalNonequilibrium not provided
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.['chemistry model']).toBe('finite-rate')
      expect(thermo?.species).toEqual(['CO2', 'CO', 'N2', 'O2', 'NO'])
    })

    it('sets chemistry model to frozen for mixing-only combustion', () => {
      useAppStore.setState({
        configData: {},
      })
      
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        reactionModelFile: 'reac_mod.H2',
        selectedSpecies: ['H2', 'O2', 'H2O'],
        chemicalNonequilibrium: false
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.['chemistry model']).toBe('frozen')
      expect(thermo?.['reaction model filename']).toBe('reac_mod.H2')
      expect(thermo?.species).toEqual(['H2', 'O2', 'H2O'])
    })

    it('sets chemistry model to finite-rate for combusting mode', () => {
      useAppStore.setState({
        configData: {},
      })
      
      const { updateThermodynamics } = useAppStore.getState()
      
      updateThermodynamics({
        gasModel: 'multispecies',
        reactionModelFile: 'reac_mod.H2',
        selectedSpecies: ['H2', 'O2', 'H2O', 'OH', 'H', 'O'],
        inertSpecies: ['N2'],
        chemicalNonequilibrium: true
      })
      
      const state = useAppStore.getState()
      const thermo = state.configData.thermodynamics
      
      expect(thermo?.['chemistry model']).toBe('finite-rate')
      expect(thermo?.['reaction model filename']).toBe('reac_mod.H2')
      expect(thermo?.species).toEqual(['H2', 'O2', 'H2O', 'OH', 'H', 'O', 'N2'])
    })
  })
})
