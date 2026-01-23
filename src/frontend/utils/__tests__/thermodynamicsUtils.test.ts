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
        HyperSolve: {
          thermodynamics: {
            species: ['N2', 'O2', 'NO']
          }
        }
      }
      
      expect(isSingleSpecies(config)).toBe(false)
    })
    
    it('returns true when no thermodynamics configured', () => {
      const config: ConfigData = {
        HyperSolve: {}
      }
      
      expect(isSingleSpecies(config)).toBe(true)
    })
    
    it('returns true when thermodynamics has no species', () => {
      const config: ConfigData = {
        HyperSolve: {
          thermodynamics: {}
        }
      }
      
      expect(isSingleSpecies(config)).toBe(true)
    })
  })
  
  describe('getSpeciesList', () => {
    it('returns species array from thermodynamics', () => {
      const config: ConfigData = {
        HyperSolve: {
          thermodynamics: {
            species: ['N2', 'O2', 'NO', 'N', 'O']
          }
        }
      }
      
      expect(getSpeciesList(config)).toEqual(['N2', 'O2', 'NO', 'N', 'O'])
    })
    
    it('returns perfect gas as default when no thermodynamics', () => {
      const config: ConfigData = {
        HyperSolve: {}
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
    it('creates equal mass fractions for all species', () => {
      const species = ['N2', 'O2']
      
      const result = initializeMassFractions(species)
      
      expect(result).toEqual({ 'N2': 0.5, 'O2': 0.5 })
    })
    
    it('handles single species', () => {
      const species = ['perfect gas']
      
      const result = initializeMassFractions(species)
      
      expect(result).toEqual({ 'perfect gas': 1.0 })
    })
    
    it('handles multispecies with equal distribution', () => {
      const species = ['N2', 'O2', 'NO', 'N', 'O']
      
      const result = initializeMassFractions(species)
      
      expect(result).toEqual({
        'N2': 0.2,
        'O2': 0.2,
        'NO': 0.2,
        'N': 0.2,
        'O': 0.2
      })
    })
    
    it('returns empty object for empty species list', () => {
      const species: string[] = []
      
      const result = initializeMassFractions(species)
      
      expect(result).toEqual({})
    })
  })
})
