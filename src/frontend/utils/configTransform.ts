/**
 * Transform loaded configuration to add UI fields and convert tag names to tag numbers
 * 
 * @param config - The raw configuration object loaded from JSON
 * @param surfaces - Array of mesh tags with metadata (tag, tagName)
 * @param rootSolverKey - The root solver key (e.g., 'HyperSolve'), defaults to 'HyperSolve'
 * @returns Transformed configuration ready for the UI
 */
export const transformLoadedConfig = (
  config: any, 
  surfaces: Array<{ metadata: { tag: number; tagName: string } }>,
  rootSolverKey: string = 'HyperSolve'
): any => {
  const transformed = JSON.parse(JSON.stringify(config)) // Deep clone
  
  // Create a map of tag name to tag number
  const nameToTag = new Map<string, number>()
  surfaces.forEach(surface => {
    nameToTag.set(surface.metadata.tagName, surface.metadata.tag)
  })
  
  console.log('[transformLoadedConfig] Tag name to tag number map:', Object.fromEntries(nameToTag))
  
  // Determine if config is flat or nested under root solver key
  let bcArray = transformed['boundary conditions']
  let statesObj = transformed.states
  let initRegionsArray = transformed['initialization regions']
  
  // If not found at root level, check under root solver key
  if (!bcArray && transformed[rootSolverKey]) {
    bcArray = transformed[rootSolverKey]['boundary conditions']
    statesObj = transformed[rootSolverKey].states
    initRegionsArray = transformed[rootSolverKey]['initialization regions']
  }
  
  // Add 'id' and 'name' to boundary conditions
  // Convert mesh boundary tags from tag names to numbers
  if (bcArray) {
    const transformedBCs = bcArray.map((bc: any, index: number) => {
      // Generate ID for UI
      const bcWithId = {
        ...bc,
        id: `bc-${Date.now()}-${index}`,
        name: bc.name || `BC ${index + 1}` // Add default name if missing
      }
      
      // Convert mesh boundary tags from tag names to tag numbers
      if (bcWithId['mesh boundary tags'] !== undefined) {
        const tags = bcWithId['mesh boundary tags']
        console.log(`[transformLoadedConfig] BC "${bcWithId.name || bcWithId.type}" raw tags:`, tags)
        if (Array.isArray(tags)) {
          bcWithId['mesh boundary tags'] = tags.map((tag: string | number) => {
            if (typeof tag === 'string') {
              const tagNum = nameToTag.get(tag)
              console.log(`  - Mapping tag name "${tag}" to tag number:`, tagNum)
              return tagNum ?? tag
            }
            return tag
          })
        } else if (typeof tags === 'string') {
          const tagNum = nameToTag.get(tags)
          console.log(`  - Mapping tag name "${tags}" to tag number:`, tagNum)
          bcWithId['mesh boundary tags'] = tagNum !== undefined ? tagNum : tags
        }
        console.log(`[transformLoadedConfig] BC "${bcWithId.name || bcWithId.type}" transformed tags:`, bcWithId['mesh boundary tags'])
      }
      
      return bcWithId
    })
    
    // Update the BCs in the correct location
    if (transformed['boundary conditions']) {
      transformed['boundary conditions'] = transformedBCs
    } else if (transformed[rootSolverKey]) {
      transformed[rootSolverKey]['boundary conditions'] = transformedBCs
    }
  }
  
  // Add 'id' to states
  if (statesObj && typeof statesObj === 'object') {
    const transformedStates: any = {}
    Object.entries(statesObj).forEach(([key, value]: [string, any]) => {
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
    
    // Update states in the correct location
    if (transformed.states) {
      transformed.states = transformedStates
    } else if (transformed[rootSolverKey]) {
      transformed[rootSolverKey].states = transformedStates
    }
  }
  
  // Add 'id' to initialization regions
  if (initRegionsArray && Array.isArray(initRegionsArray)) {
    const transformedRegions = initRegionsArray.map((region: any, index: number) => ({
      ...region,
      id: `init-${Date.now()}-${index}`
    }))
    
    // Update initialization regions in the correct location
    if (transformed['initialization regions']) {
      transformed['initialization regions'] = transformedRegions
    } else if (transformed[rootSolverKey]) {
      transformed[rootSolverKey]['initialization regions'] = transformedRegions
    }
  }
  
  return transformed
}
