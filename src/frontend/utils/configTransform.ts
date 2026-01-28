/**
 * Transform loaded configuration to add UI fields and convert surface names to tag numbers
 * 
 * @param config - The raw configuration object loaded from JSON
 * @param surfaces - Array of mesh surfaces with metadata (tag, tagName)
 * @returns Transformed configuration ready for the UI
 */
export const transformLoadedConfig = (config: any, surfaces: Array<{ metadata: { tag: number; tagName: string } }>): any => {
  const transformed = JSON.parse(JSON.stringify(config)) // Deep clone
  
  // Create a map of surface name to tag number
  const nameToTag = new Map<string, number>()
  surfaces.forEach(surface => {
    nameToTag.set(surface.metadata.tagName, surface.metadata.tag)
  })
  
  console.log('[transformLoadedConfig] Surface name to tag map:', Object.fromEntries(nameToTag))
  
  // Add 'id' and 'name' to boundary conditions
  // Convert mesh boundary tags from surface names to numbers
  if (transformed['boundary conditions']) {
    transformed['boundary conditions'] = transformed['boundary conditions'].map((bc: any, index: number) => {
      // Generate ID for UI
      const bcWithId = {
        ...bc,
        id: `bc-${Date.now()}-${index}`,
        name: bc.name || `BC ${index + 1}` // Add default name if missing
      }
      
      // Convert mesh boundary tags from surface names to tag numbers
      if (bcWithId['mesh boundary tags'] !== undefined) {
        const tags = bcWithId['mesh boundary tags']
        console.log(`[transformLoadedConfig] BC "${bcWithId.name || bcWithId.type}" raw tags:`, tags)
        if (Array.isArray(tags)) {
          bcWithId['mesh boundary tags'] = tags.map((tag: string | number) => {
            if (typeof tag === 'string') {
              const tagNum = nameToTag.get(tag)
              console.log(`  - Mapping surface name "${tag}" to tag number:`, tagNum)
              return tagNum ?? tag
            }
            return tag
          })
        } else if (typeof tags === 'string') {
          const tagNum = nameToTag.get(tags)
          console.log(`  - Mapping surface name "${tags}" to tag number:`, tagNum)
          bcWithId['mesh boundary tags'] = tagNum !== undefined ? tagNum : tags
        }
        console.log(`[transformLoadedConfig] BC "${bcWithId.name || bcWithId.type}" transformed tags:`, bcWithId['mesh boundary tags'])
      }
      
      return bcWithId
    })
  }
  
  // Add 'id' to states
  if (transformed.states && typeof transformed.states === 'object') {
    const transformedStates: any = {}
    Object.entries(transformed.states).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === 'object') {
        transformedStates[key] = {
          ...value,
          id: `state-${Date.now()}-${key}`,
          name: key // The state name is the key
        }
      } else {
        transformedStates[key] = value
      }
    })
    transformed.states = transformedStates
  }
  
  // Add 'id' to initialization regions
  if (transformed['initialization regions'] && Array.isArray(transformed['initialization regions'])) {
    transformed['initialization regions'] = transformed['initialization regions'].map((region: any, index: number) => ({
      ...region,
      id: `init-${Date.now()}-${index}`
    }))
  }
  
  return transformed
}
