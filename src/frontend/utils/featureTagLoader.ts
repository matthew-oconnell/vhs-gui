/**
 * Loader for feature tag categories metadata file
 * Similar to bcTypeHintLoader.ts
 */

export type TagCategoryType = 'product' | 'feature' | 'visibility'

export interface TagCategoryInfo {
  tag: string
  category: TagCategoryType
}

let tagCategoryCache: Map<string, TagCategoryType> | null = null

/**
 * Load and parse the feature tag categories file
 * Format: tag_name -> category_type
 */
async function loadTagCategories(): Promise<Map<string, TagCategoryType>> {
  try {
    const response = await fetch('/featureTagCategories.txt')
    if (!response.ok) {
      console.warn('Failed to load featureTagCategories.txt, using defaults')
      return getDefaultCategories()
    }
    
    const text = await response.text()
    const categories = new Map<string, TagCategoryType>()
    
    const lines = text.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }
      
      // Parse: tag_name -> category_type
      const match = trimmed.match(/^(.+?)\s*->\s*(.+)$/)
      if (match) {
        const tag = match[1].trim()
        const categoryStr = match[2].trim()
        
        // Validate category type
        if (categoryStr === 'product' || categoryStr === 'feature' || categoryStr === 'visibility') {
          categories.set(tag, categoryStr)
        } else {
          console.warn(`Invalid category type "${categoryStr}" for tag "${tag}"`)
        }
      }
    }
    
    return categories
  } catch (error) {
    console.error('Error loading feature tag categories:', error)
    return getDefaultCategories()
  }
}

/**
 * Get default tag categories (fallback if file not found)
 */
function getDefaultCategories(): Map<string, TagCategoryType> {
  const defaults = new Map<string, TagCategoryType>()
  
  // Products
  defaults.set('vulcan', 'product')
  defaults.set('hypersolve', 'product')
  
  // Features
  defaults.set('sketch-2-solution', 'feature')
  defaults.set('mhd', 'feature')
  defaults.set('particle', 'feature')
  defaults.set('perfect gas', 'feature')
  defaults.set('unsteady', 'feature')
  defaults.set('structured-adaptation', 'feature')
  
  // Visibility toggles
  defaults.set('advanced', 'visibility')
  defaults.set('developer', 'visibility')
  defaults.set('experimental', 'visibility')
  
  return defaults
}

/**
 * Get the category type for a tag
 */
export async function getTagCategory(tag: string): Promise<TagCategoryType | undefined> {
  if (!tagCategoryCache) {
    tagCategoryCache = await loadTagCategories()
  }
  return tagCategoryCache.get(tag)
}

/**
 * Get all tags of a specific category type
 */
export async function getTagsByCategory(categoryType: TagCategoryType): Promise<string[]> {
  if (!tagCategoryCache) {
    tagCategoryCache = await loadTagCategories()
  }
  
  const tags: string[] = []
  for (const [tag, category] of tagCategoryCache.entries()) {
    if (category === categoryType) {
      tags.push(tag)
    }
  }
  return tags
}

/**
 * Get all tag categories (for initialization)
 */
export async function getAllTagCategories(): Promise<Map<string, TagCategoryType>> {
  if (!tagCategoryCache) {
    tagCategoryCache = await loadTagCategories()
  }
  return new Map(tagCategoryCache)
}

/**
 * Clear the cache (for testing or reload)
 */
export function clearTagCategoryCache(): void {
  tagCategoryCache = null
}
