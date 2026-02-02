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
  surfaces: Array<{ metadata: { tag: number; tagName?: string; bcName?: string } }>,
  rootSolverKey: string = 'HyperSolve'
): any => {
  const transformed = JSON.parse(JSON.stringify(config)) // Deep clone
  
  console.log('[transformLoadedConfig] Called with', surfaces.length, 'surfaces')
  
  // Create a map of BC name (group name) to array of tag numbers
  const bcNameToTags = new Map<string, number[]>()
  surfaces.forEach(surface => {
    const bcName = surface.metadata.bcName || surface.metadata.tagName
    if (bcName) {
      if (!bcNameToTags.has(bcName)) {
        bcNameToTags.set(bcName, [])
      }
      bcNameToTags.get(bcName)!.push(surface.metadata.tag)
    }
  })
  
  console.log('[transformLoadedConfig] BC name to tag numbers map (from', surfaces.length, 'surfaces):')
  console.table(Object.fromEntries(bcNameToTags))
  console.log('[transformLoadedConfig] Total unique BC names:', bcNameToTags.size)
  
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
  
  console.log('[transformLoadedConfig] Found', bcArray?.length || 0, 'boundary conditions to transform')
  
  // Transform boundary conditions: add id/name and convert BC group names to tag numbers
  if (bcArray) {
    const transformedBCs = bcArray.map((bc: any, index: number) => {
      const bcWithId = {
        ...bc,
        id: `bc-${Date.now()}-${index}`,
        name: bc.name || `BC ${index + 1}`
      }
      
      // Convert mesh boundary tags from BC names (e.g., "vehicle") to tag numbers
      if (bc['mesh boundary tags']) {
        const tags = bc['mesh boundary tags']
        
        // If it's a string BC name, convert to array of tag numbers
        if (typeof tags === 'string') {
          const tagNumbers = bcNameToTags.get(tags)
          
          if (tagNumbers && tagNumbers.length > 0) {
            // Found matching surfaces - convert to tag numbers
            bcWithId['mesh boundary tags'] = tagNumbers.length === 1 ? tagNumbers[0] : tagNumbers
            console.log(`[transformLoadedConfig] BC ${index + 1}: Converted "${tags}" → ${JSON.stringify(bcWithId['mesh boundary tags'])} (${tagNumbers.length} tags)`)
          } else {
            // No matching surfaces found - preserve original string value
            console.warn(`[transformLoadedConfig] BC ${index + 1}: No surfaces found with name "${tags}". Available surface names:`, Array.from(bcNameToTags.keys()))
            console.warn(`[transformLoadedConfig] Preserving original value "${tags}" - tags will need to be assigned manually`)
            // Keep the original string value unchanged
          }
        }
        // If it's an array, check if it contains strings that need conversion
        else if (Array.isArray(tags)) {
          // Check if array contains any strings (BC names)
          const hasStrings = tags.some(t => typeof t === 'string')
          
          if (hasStrings) {
            // Convert each string BC name to its tag numbers
            const allTagNumbers: number[] = []
            let anyNotFound = false
            
            tags.forEach((tag: any) => {
              if (typeof tag === 'string') {
                const tagNumbers = bcNameToTags.get(tag)
                if (tagNumbers && tagNumbers.length > 0) {
                  allTagNumbers.push(...tagNumbers)
                } else {
                  console.warn(`[transformLoadedConfig] BC ${index + 1}: No surfaces found with name "${tag}"`)
                  anyNotFound = true
                }
              } else if (typeof tag === 'number') {
                // Already a number, keep it
                allTagNumbers.push(tag)
              }
            })
            
            if (allTagNumbers.length > 0) {
              bcWithId['mesh boundary tags'] = allTagNumbers.length === 1 ? allTagNumbers[0] : allTagNumbers
              console.log(`[transformLoadedConfig] BC ${index + 1}: Converted array ${JSON.stringify(tags)} → ${JSON.stringify(bcWithId['mesh boundary tags'])} (${allTagNumbers.length} tags)`)
            } else if (anyNotFound) {
              console.warn(`[transformLoadedConfig] BC ${index + 1}: No surfaces found for array. Available surface names:`, Array.from(bcNameToTags.keys()))
              // Keep original array if no tags were found
            }
          }
          // If array contains only numbers, leave it as-is (already handled)
        }
        // If it's already a number, leave it as-is
        // (This handles configs that already use tag numbers)
      }
      
      return bcWithId
    })
    
    // Update the BCs in the correct location
    if (transformed['boundary conditions']) {
      transformed['boundary conditions'] = transformedBCs
    } else if (transformed[rootSolverKey]) {
      transformed[rootSolverKey]['boundary conditions'] = transformedBCs
    }
    
    console.log('[transformLoadedConfig] Transformation complete. Boundary conditions:')
    transformedBCs.forEach((bc: any) => {
      console.log(`  - ${bc.name || bc.type}: type="${bc.type}", tags=${JSON.stringify(bc['mesh boundary tags'])}`)
    })
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
