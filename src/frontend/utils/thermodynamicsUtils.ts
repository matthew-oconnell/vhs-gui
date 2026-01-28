import { ConfigData } from '../types/config'

/**
 * Atmospheric composition data for different planetary bodies
 * Values are mass fractions at sea level / surface conditions
 */
const ATMOSPHERIC_COMPOSITIONS: Record<string, Record<string, number>> = {
  earth: {
    'N2': 0.7551,
    'O2': 0.2314,
    'Ar': 0.0128,
    'CO2': 0.0006
  },
  mars: {
    'CO2': 0.9532,
    'N2': 0.0270,
    'Ar': 0.0160,
    'O2': 0.0013,
    'CO': 0.0007
  }
}

/**
 * Species composition for Earth atmosphere models
 * Based on splitting N2/O2 from standard atmospheric composition
 */
const EARTH_SPECIES_COMPOSITIONS: Record<string, Record<string, number>> = {
  '5-species': {
    'N2': 0.7651,  // Most abundant
    'O2': 0.2349,  // Second most abundant
    'NO': 0.0000,  // Trace/product
    'N': 0.0000,   // Dissociation product
    'O': 0.0000    // Dissociation product
  },
  '7-species': {
    'N2': 0.7651,
    'O2': 0.2349,
    'NO': 0.0000,
    'N': 0.0000,
    'O': 0.0000,
    'NO+': 0.0000,
    'e-': 0.0000
  },
  '11-species': {
    'N2': 0.7651,
    'O2': 0.2349,
    'NO': 0.0000,
    'N': 0.0000,
    'O': 0.0000,
    'NO+': 0.0000,
    'N2+': 0.0000,
    'O2+': 0.0000,
    'N+': 0.0000,
    'O+': 0.0000,
    'e-': 0.0000
  }
}

/**
 * Check if the current configuration is running in single-species (ideal gas) mode
 */
export function isSingleSpecies(configData: ConfigData): boolean {
  const thermodynamics = configData.thermodynamics
  
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
export function getSpeciesList(configData: ConfigData): string[] {
  const thermodynamics = configData.thermodynamics
  
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
 * Initialize mass fractions with realistic atmospheric composition
 * Falls back to equal distribution if no atmospheric data available
 */
export function initializeMassFractions(
  species: string[], 
  configData?: ConfigData
): Record<string, number> {
  if (species.length === 0) {
    return {}
  }
  
  // Filter out 'perfect gas' - it shouldn't be in multispecies
  const validSpecies = species.filter(s => s !== 'perfect gas')
  if (validSpecies.length === 0) {
    return {}
  }
  
  // Try to get atmospheric composition from thermodynamics config
  if (configData) {
    const thermodynamics = configData.thermodynamics
    
    // Check if we have Earth species model
    if (thermodynamics) {
      const speciesList = Array.isArray(thermodynamics.species) ? thermodynamics.species : []
      
      // Match against known Earth models
      for (const [modelName, composition] of Object.entries(EARTH_SPECIES_COMPOSITIONS)) {
        const modelSpecies = Object.keys(composition)
        if (JSON.stringify(speciesList.sort()) === JSON.stringify(modelSpecies.sort())) {
          // Found a matching Earth model - use its composition
          return { ...composition }
        }
      }
      
      // Check for Mars atmosphere (CO2, CO, N2, O2, NO)
      const marsSpecies = ['CO2', 'CO', 'N2', 'O2', 'NO']
      if (JSON.stringify(speciesList.sort()) === JSON.stringify(marsSpecies.sort())) {
        return {
          'CO2': 0.9532,
          'N2': 0.0270,
          'O2': 0.0013,
          'CO': 0.0007,
          'NO': 0.0000  // Trace/product
        }
      }
    }
  }
  
  // Default: Try to match known atmospheric compositions
  // Check if all species are in Earth atmosphere
  const earthSpecies = Object.keys(ATMOSPHERIC_COMPOSITIONS.earth)
  const allInEarth = validSpecies.every(s => earthSpecies.includes(s))
  
  if (allInEarth) {
    // Use Earth atmosphere as base, normalize to available species
    const earthComp = ATMOSPHERIC_COMPOSITIONS.earth
    let sum = 0
    const fractions: Record<string, number> = {}
    
    validSpecies.forEach(s => {
      fractions[s] = earthComp[s] || 0
      sum += fractions[s]
    })
    
    // Normalize to sum to 1.0
    if (sum > 0) {
      validSpecies.forEach(s => {
        fractions[s] /= sum
      })
      return fractions
    }
  }
  
  // Check if all species are in Mars atmosphere
  const marsSpecies = Object.keys(ATMOSPHERIC_COMPOSITIONS.mars)
  const allInMars = validSpecies.every(s => marsSpecies.includes(s))
  
  if (allInMars) {
    const marsComp = ATMOSPHERIC_COMPOSITIONS.mars
    let sum = 0
    const fractions: Record<string, number> = {}
    
    validSpecies.forEach(s => {
      fractions[s] = marsComp[s] || 0
      sum += fractions[s]
    })
    
    // Normalize to sum to 1.0
    if (sum > 0) {
      validSpecies.forEach(s => {
        fractions[s] /= sum
      })
      return fractions
    }
  }
  
  // Fallback: Equal distribution
  const equalFraction = 1.0 / validSpecies.length
  const massFractions: Record<string, number> = {}
  
  validSpecies.forEach(sp => {
    massFractions[sp] = equalFraction
  })
  
  return massFractions
}
