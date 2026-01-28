import { describe, it, expect } from 'vitest'
import { 
  isSingleSpecies, 
  getSpeciesList, 
  validateMassFractions,
  initializeMassFractions 
} from '../thermodynamicsUtils'
import { ConfigData } from '../../types/config'

describe('thermodynamicsUtils', () => {
  describe('isSingleSpecies', () => {
    it('returns true for perfect gas configuration', () => {
      const config: ConfigData = {
        HyperSolve: {
          thermodynamics: {
            species: ['perfect gas']
          }
        }
      }
      
      expect(isSingleSpecies(config)).toBe(true)
    })
    
    it('returns false for multispecies configuration', () => {
      const config: ConfigData = {
        thermodynamics: {
          species: ['N2', 'O2', 'NO']
        }
      }
      
      expect(isSingleSpecies(config)).toBe(false)
    })
    
    it('returns true when no thermodynamics configured', () => {
      const config: ConfigData = {}
      
      expect(isSingleSpecies(config)).toBe(true)
    })
    
    it('returns true when thermodynamics has no species', () => {
      const config: ConfigData = {
        thermodynamics: {}
      }
      
      expect(isSingleSpecies(config)).toBe(true)
    })
  })
  
  describe('getSpeciesList', () => {
    it('returns species array from thermodynamics', () => {
      const config: ConfigData = {
        thermodynamics: {
          species: ['N2', 'O2', 'NO', 'N', 'O']
        }
      }
      
      expect(getSpeciesList(config)).toEqual(['N2', 'O2', 'NO', 'N', 'O'])
    })
    
    it('returns perfect gas as default when no thermodynamics', () => {
      const config: ConfigData = {
      }
      
      expect(getSpeciesList(config)).toEqual(['perfect gas'])
    })
    
    it('returns perfect gas for ideal gas configuration', () => {
      const config: ConfigData = {
        HyperSolve: {
          thermodynamics: {
            species: ['perfect gas'],
            'molecular weight': 28.97,
            'ratio of specific heats': 1.4
          }
        }
      }
      
      expect(getSpeciesList(config)).toEqual(['perfect gas'])
    })
  })
  
  describe('validateMassFractions', () => {
    it('validates correct mass fractions summing to 1.0', () => {
      const massFractions = { 'N2': 0.78, 'O2': 0.22 }
      const species = ['N2', 'O2']
      
      const result = validateMassFractions(massFractions, species)
      
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })
    
    it('accepts mass fractions within tolerance of 1.0', () => {
      const massFractions = { 'N2': 0.78, 'O2': 0.2199 }
      const species = ['N2', 'O2']
      
      const result = validateMassFractions(massFractions, species)
      
      expect(result.valid).toBe(true)
    })
    
    it('rejects mass fractions that sum to less than 1.0', () => {
      const massFractions = { 'N2': 0.5, 'O2': 0.3 }
      const species = ['N2', 'O2']
      
      const result = validateMassFractions(massFractions, species)
      
      expect(result.valid).toBe(false)
      expect(result.message).toContain('sum to')
      expect(result.message).toContain('0.8000')
    })
    
    it('rejects mass fractions that sum to more than 1.0', () => {
      const massFractions = { 'N2': 0.6, 'O2': 0.6 }
      const species = ['N2', 'O2']
      
      const result = validateMassFractions(massFractions, species)
      
      expect(result.valid).toBe(false)
      expect(result.message).toContain('sum to')
      expect(result.message).toContain('1.2000')
    })
    
    it('rejects negative mass fractions', () => {
      const massFractions = { 'N2': 1.2, 'O2': -0.2 }
      const species = ['N2', 'O2']
      
      const result = validateMassFractions(massFractions, species)
      
      expect(result.valid).toBe(false)
      expect(result.message).toContain('cannot be negative')
    })
    
    it('handles multispecies with many components', () => {
      const massFractions = {
        'N2': 0.20,
        'O2': 0.20,
        'NO': 0.20,
        'N': 0.20,
        'O': 0.20
      }
      const species = ['N2', 'O2', 'NO', 'N', 'O']
      
      const result = validateMassFractions(massFractions, species)
      
      expect(result.valid).toBe(true)
    })
  })
  
  describe('initializeMassFractions', () => {
    it('uses Earth 5-species composition when matching species are detected', () => {
      const configData = {
        thermodynamics: {
          species: ['N2', 'O2', 'NO', 'N', 'O']
        }
      }
      const species = ['N2', 'O2', 'NO', 'N', 'O']
      
      const result = initializeMassFractions(species, configData)
      
      // Should use atmospheric composition, not equal distribution
      expect(result['N2']).toBeCloseTo(0.7651, 3)
      expect(result['O2']).toBeCloseTo(0.2349, 3)
      expect(result['NO']).toBe(0.0000)
      expect(result['N']).toBe(0.0000)
      expect(result['O']).toBe(0.0000)
    })
    
    it('uses Earth 7-species composition when matching species are detected', () => {
      const configData = {
        thermodynamics: {
          species: ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-']
        }
      }
      const species = ['N2', 'O2', 'NO', 'N', 'O', 'NO+', 'e-']
      
      const result = initializeMassFractions(species, configData)
      
      expect(result['N2']).toBeCloseTo(0.7651, 3)
      expect(result['O2']).toBeCloseTo(0.2349, 3)
      expect(result['NO+']).toBe(0.0000)
      expect(result['e-']).toBe(0.0000)
    })
    
    it('uses Mars composition when Mars species are detected', () => {
      const configData = {
        thermodynamics: {
          species: ['CO2', 'CO', 'N2', 'O2', 'NO']
        }
      }
      const species = ['CO2', 'CO', 'N2', 'O2', 'NO']
      
      const result = initializeMassFractions(species, configData)
      
      expect(result['CO2']).toBeCloseTo(0.9532, 3)
      expect(result['N2']).toBeCloseTo(0.0270, 3)
      expect(result['NO']).toBe(0.0000)
    })
    
    it('normalizes Earth atmosphere when subset of species requested', () => {
      const species = ['N2', 'O2']
      
      const result = initializeMassFractions(species)
      
      // Should use Earth atmosphere composition, normalized
      const total = 0.7551 + 0.2314 // N2 + O2 from Earth
      expect(result['N2']).toBeCloseTo(0.7551 / total, 3)
      expect(result['O2']).toBeCloseTo(0.2314 / total, 3)
    })
    
    it('filters out perfect gas from species list', () => {
      const species = ['perfect gas', 'N2']
      
      const result = initializeMassFractions(species)
      
      // Should only have N2
      expect(result['N2']).toBe(1.0)
      expect(result['perfect gas']).toBeUndefined()
    })
    
    it('returns empty object when only perfect gas is provided', () => {
      const species = ['perfect gas']
      
      const result = initializeMassFractions(species)
      
      expect(result).toEqual({})
    })
    
    it('falls back to equal distribution for unknown species', () => {
      const species = ['H2', 'He']
      
      const result = initializeMassFractions(species)
      
      expect(result).toEqual({ 'H2': 0.5, 'He': 0.5 })
    })
    
    it('returns empty object for empty species list', () => {
      const species: string[] = []
      
      const result = initializeMassFractions(species)
      
      expect(result).toEqual({})
    })
  })
})
