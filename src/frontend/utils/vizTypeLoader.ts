/**
 * Utility to load and filter visualization types from the schema based on feature flags
 */

import { getFeatureFlags } from './featureFlags'

export interface VizTypeInfo {
  type: string
  description: string
  onlyFor?: string[]
}

let vizTypeInfoCache: Record<string, VizTypeInfo> | null = null
let schemaCache: any = null

/**
 * Get or load the schema
 */
async function getSchema(): Promise<any> {
  if (schemaCache) {
    return schemaCache
  }
  
  const response = await fetch('/schemas/input.schema.json')
  schemaCache = await response.json()
  return schemaCache
}

/**
 * Load visualization type information from the schema
 */
export async function loadVizTypeInfo(): Promise<Record<string, VizTypeInfo>> {
  if (vizTypeInfoCache) {
    return vizTypeInfoCache
  }

  try {
    const schema = await getSchema()
    const typeInfo: Record<string, VizTypeInfo> = {}

    // Get visualization sample definitions from the schema
    const samplingDef = schema.definitions?.['Sampling']
    if (samplingDef?.anyOf) {
      samplingDef.anyOf.forEach((ref: any) => {
        if (ref.$ref) {
          const defName = ref.$ref.replace('#/definitions/', '')
          const def = schema.definitions?.[defName]
          
          if (def?.properties?.type?.enum) {
            const vizType = def.properties.type.enum[0]
            const description = def.description || 'No description available'
            const onlyFor = def['only for'] as string[] | undefined

            typeInfo[vizType] = {
              type: vizType,
              description,
              onlyFor
            }
          }
        }
      })
    }

    vizTypeInfoCache = typeInfo
    return typeInfo
  } catch (error) {
    console.error('Failed to load visualization type information:', error)
    return {}
  }
}

/**
 * Get available visualization types based on current feature flags
 * Returns a synchronous result using cached data
 */
export function getAvailableVizTypesSync(): string[] {
  if (!vizTypeInfoCache) {
    // Return defaults if not loaded yet
    return ['volume', 'boundary', 'point', 'line', 'plane', 'sphere']
  }

  const flags = getFeatureFlags()

  return Object.entries(vizTypeInfoCache)
    .filter(([_, info]) => {
      if (!info.onlyFor || info.onlyFor.length === 0) {
        return true
      }
      return info.onlyFor.some(category => flags.enabledCategories.has(category))
    })
    .map(([type, _]) => type)
}

/**
 * Get available visualization types based on current feature flags
 */
export async function getAvailableVizTypes(): Promise<string[]> {
  await loadVizTypeInfo()
  return getAvailableVizTypesSync()
}

/**
 * Get type descriptions synchronously
 */
export function getVizTypeDescriptionsSync(): Record<string, string> {
  if (!vizTypeInfoCache) {
    return {
      'volume': 'Output the full domain flow field solution',
      'boundary': 'Output solution data on specific mesh boundary surfaces',
      'point': 'Sample the solution at a specific point in the domain',
      'line': 'Sample the solution along a line segment',
      'plane': 'Sample the solution on a plane slice through the domain',
      'sphere': 'Sample the solution on or within a sphere'
    }
  }

  const descriptions: Record<string, string> = {}
  Object.entries(vizTypeInfoCache).forEach(([type, info]) => {
    descriptions[type] = info.description
  })
  return descriptions
}
