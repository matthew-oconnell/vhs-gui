// Utility to extract BC type descriptions from the schema

import { getFeatureFlags } from './featureFlags'

export interface BCTypeInfo {
  type: string
  description: string
  onlyFor?: string[]
  deprecated?: boolean  // True if this BC type is from a "Deprecated" definition
}

let bcTypeInfoCache: Record<string, BCTypeInfo> | null = null

/**
 * Load and cache BC type descriptions from the schema
 */
export async function loadBCTypeDescriptions(): Promise<Record<string, string>> {
  const info = await loadBCTypeInfo()
  const descriptions: Record<string, string> = {}
  
  Object.entries(info).forEach(([type, typeInfo]) => {
    descriptions[type] = typeInfo.description
  })
  
  return descriptions
}

/**
 * Load and cache full BC type information including "only for" restrictions
 */
export async function loadBCTypeInfo(): Promise<Record<string, BCTypeInfo>> {
  if (bcTypeInfoCache) {
    return bcTypeInfoCache
  }

  try {
    const response = await fetch('/schemas/input.schema.json')
    const schema = await response.json()

    const typeInfo: Record<string, BCTypeInfo> = {}

    // Get BC definition names from the Boundary Condition anyOf
    const bcDefinitions = schema.definitions?.['Boundary Condition']?.anyOf?.map((ref: any) =>
      ref.$ref.replace('#/definitions/', '')
    ) || []

    // For each BC definition, extract enum values, description, "only for", and deprecated status
    bcDefinitions.forEach((defName: string) => {
      const def = schema.definitions?.[defName]
      if (def?.properties?.type?.enum) {
        const description = def.description || 'No description available'
        const onlyFor = def['only for'] as string[] | undefined
        const deprecated = defName.startsWith('Deprecated')  // Mark as deprecated if definition name starts with "Deprecated"
        const enumValues = def.properties.type.enum

        enumValues.forEach((enumVal: string) => {
          typeInfo[enumVal] = {
            type: enumVal,
            description,
            onlyFor,
            deprecated
          }
        })
      }
    })

    bcTypeInfoCache = typeInfo
    return typeInfo
  } catch (error) {
    console.error('Failed to load BC type information:', error)
    return {}
  }
}

/**
 * Get description for a specific BC type
 */
export function getBCTypeDescription(type: string): string {
  return bcTypeInfoCache?.[type]?.description || 'No description available'
}

/**
 * Check if a BC type should be available based on current feature flags
 * Returns true if the BC has no restrictions, or if at least one of its
 * "only for" categories is enabled in the feature flags
 */
export function isBCTypeAvailable(type: string): boolean {
  const info = bcTypeInfoCache?.[type]
  if (!info || !info.onlyFor || info.onlyFor.length === 0) {
    return true // No restrictions, available for all
  }
  
  // Get currently enabled feature categories
  const flags = getFeatureFlags()
  
  // Check if any of the BC's "only for" categories are enabled
  return info.onlyFor.some(category => 
    flags.enabledCategories.has(category)
  )
}

/**
 * Check if a BC type is deprecated
 * Deprecated types can still be loaded from files but should not appear in the UI
 */
export function isBCTypeDeprecated(type: string): boolean {
  return bcTypeInfoCache?.[type]?.deprecated || false
}
