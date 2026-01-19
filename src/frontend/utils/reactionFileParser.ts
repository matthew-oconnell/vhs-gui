export interface ReactionFileParseResult {
  species: string[]
}

/**
 * Parse a reaction mechanism file (reac_mod format) and extract species list.
 * 
 * Format:
 * - Comments start with "*"
 * - Reaction lines: <number> <reactants> <=> <products>
 * - Stops parsing when encountering non-reaction lines (e.g., "FORWARD REACTION MODEL")
 * - Species can have complex names: commas, hyphens, parentheses
 * - Stoichiometric coefficients are floating point numbers
 * - M is a third body indicator, not a species
 */
export function parseReactionFile(content: string): ReactionFileParseResult {
  const speciesSet = new Set<string>()
  const lines = content.split('\n')
  
  let inReactionSection = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip empty lines
    if (!trimmed) continue
    
    // Skip comment lines
    if (trimmed.startsWith('*')) continue
    
    // Check if we're entering the reaction section
    if (trimmed.includes('REACTION MECHANISM EQUATION LIST')) {
      inReactionSection = true
      continue
    }
    
    // Skip header line
    if (trimmed.includes('REACTION REACTANT SIDE PRODUCT SIDE')) {
      continue
    }
    
    // If we're in the reaction section, check if this is a reaction line
    if (inReactionSection) {
      // Stop parsing if we hit a non-reaction line
      // Reaction lines start with a number
      const firstNonWhitespace = trimmed.match(/^\S+/)
      if (firstNonWhitespace && !/^\d+$/.test(firstNonWhitespace[0])) {
        // First non-whitespace is not a number, stop parsing
        break
      }
      
      // Parse reaction line: <number> <reactants> <=> <products>
      const arrowMatch = trimmed.match(/(.+?)<?=>(.+)/)
      if (!arrowMatch) continue
      
      const reactants = arrowMatch[1]
      const products = arrowMatch[2]
      
      // Extract species from both sides
      extractSpeciesFromSide(reactants, speciesSet)
      extractSpeciesFromSide(products, speciesSet)
    }
  }
  
  // Remove M (third body indicator)
  speciesSet.delete('M')
  
  return {
    species: Array.from(speciesSet)
  }
}

/**
 * Extract species from one side of a reaction equation.
 * Handles stoichiometric coefficients (e.g., "2H2", "1.5O2")
 */
function extractSpeciesFromSide(side: string, speciesSet: Set<string>): void {
  // Remove the reaction number prefix if present
  side = side.replace(/^\d+\s+/, '')
  
  // Split by + to get individual terms
  const terms = side.split('+').map(t => t.trim())
  
  for (const term of terms) {
    if (!term) continue
    
    // Remove stoichiometric coefficient (integer or float at the start)
    // Match: optional floating point number, then the species name
    const match = term.match(/^[\d.]*(.+)$/)
    if (!match) continue
    
    const species = match[1].trim()
    if (species) {
      speciesSet.add(species)
    }
  }
}
