/**
 * Utility for loading boundary condition type hints from bcTypeNameHints.txt
 */

let cachedHints: Map<string, string> | null = null

/**
 * Load and parse the BC type name hints file
 * @returns Map of hint keywords to BC types
 */
export const loadBCTypeHints = async (): Promise<Map<string, string>> => {
  if (cachedHints) {
    return cachedHints
  }

  try {
    const response = await fetch('/bcTypeNameHints.txt')
    if (!response.ok) {
      console.warn('Failed to load BC type hints file, using fallback')
      return new Map()
    }

    const text = await response.text()
    const hints = new Map<string, string>()

    // Parse line by line
    const lines = text.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed.length === 0) {
        continue
      }

      // Parse "hint -> bc_type" format
      const match = trimmed.match(/^(.+?)\s*->\s*(.+)$/)
      if (match) {
        const hint = match[1].trim().toLowerCase()
        const bcType = match[2].trim()
        hints.set(hint, bcType)
      }
    }

    cachedHints = hints
    return hints
  } catch (error) {
    console.warn('Error loading BC type hints:', error)
    return new Map()
  }
}

/**
 * Find matching BC type from tag name using hint mappings
 * @param tagName Surface tag name
 * @param availableTypes List of available BC types
 * @param hints Optional pre-loaded hints map
 * @returns Matched BC type or null
 */
export const findBCTypeFromHints = (
  tagName: string,
  availableTypes: string[],
  hints: Map<string, string>
): string | null => {
  const normalized = tagName.toLowerCase().trim()
  
  // Try exact hint match first (most specific)
  if (hints.has(normalized)) {
    const suggested = hints.get(normalized)!
    if (availableTypes.includes(suggested)) {
      return suggested
    }
  }

  // Try partial matches (tag name contains hint keyword)
  for (const [hint, bcType] of hints.entries()) {
    if (normalized.includes(hint) && availableTypes.includes(bcType)) {
      return bcType
    }
  }

  // Fallback: try exact BC type name match
  const exactMatch = availableTypes.find(type => type === normalized)
  if (exactMatch) return exactMatch

  // Fallback: try partial match (tag name contains BC type)
  const partialMatch = availableTypes.find(type => normalized.includes(type))
  if (partialMatch) return partialMatch

  // Fallback: try reverse match (BC type contains tag name)
  const reverseMatch = availableTypes.find(type => type.includes(normalized))
  if (reverseMatch) return reverseMatch

  return null
}
