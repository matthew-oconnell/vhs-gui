import { ConfigData } from '../types/config'

/**
 * Check if the current configuration is running in single-species (ideal gas) mode
 */
export function isSingleSpecies(configData: ConfigData, rootKey: string = 'HyperSolve'): boolean {
  const thermodynamics = configData[rootKey]?.thermodynamics
  
  if (!thermodynamics || !thermodynamics.species) {
    return true // Default to single-species if no thermodynamics configured
  }
  
  const species = thermodynamics.species
  
  // Single species if only "perfect gas" is present
  return Array.isArray(species) && 
         species.length === 1 && 
         species[0] === 'perfect gas'
}

/**
 * Get the list of species from the thermodynamics configuration
 */
export function getSpeciesList(configData: ConfigData, rootKey: string = 'HyperSolve'): string[] {
  const thermodynamics = configData[rootKey]?.thermodynamics
  
  if (!thermodynamics || !thermodynamics.species) {
    return ['perfect gas'] // Default
  }
  
  return Array.isArray(thermodynamics.species) ? thermodynamics.species : []
}

/**
 * Validate that mass fractions are valid
 * - All values must be >= 0
 * - Sum should equal 1.0 (within tolerance)
 */
export function validateMassFractions(
  massFractions: Record<string, number>,
  species: string[]
): { valid: boolean; message?: string } {
  const fractionValues = Object.values(massFractions)
  
  // Check all values are non-negative
  const hasNegative = fractionValues.some(v => v < 0)
  if (hasNegative) {
    return { valid: false, message: 'Mass fractions cannot be negative' }
  }
  
  // Check sum equals 1.0 (within tolerance)
  const sum = fractionValues.reduce((a, b) => a + b, 0)
  const tolerance = 0.001
  
  if (Math.abs(sum - 1.0) > tolerance) {
    return { 
      valid: false, 
      message: `Mass fractions sum to ${sum.toFixed(4)} (must equal 1.0)` 
    }
  }
  
  return { valid: true }
}

/**
 * Initialize mass fractions with equal distribution across all species
 */
export function initializeMassFractions(species: string[]): Record<string, number> {
  if (species.length === 0) {
    return {}
  }
  
  const equalFraction = 1.0 / species.length
  const massFractions: Record<string, number> = {}
  
  species.forEach(sp => {
    massFractions[sp] = equalFraction
  })
  
  return massFractions
}
