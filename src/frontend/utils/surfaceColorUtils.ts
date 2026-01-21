import { Surface } from '../types/surface'
import { BoundaryCondition } from '../types/config'
import { ColorMode, GlobalRenderSettings } from '../store/appStore'

/**
 * Check if a surface is assigned to any boundary condition
 */
export function isSurfaceAssigned(
  surface: Surface,
  boundaryConditions: BoundaryCondition[]
): boolean {
  const surfaceTag = surface.metadata.tag
  
  for (const bc of boundaryConditions) {
    const tags = bc['mesh boundary tags']
    
    if (Array.isArray(tags)) {
      if ((tags as any[]).includes(surfaceTag) || (tags as any[]).includes(String(surfaceTag))) {
        return true
      }
    } else if (typeof tags === 'number') {
      if (tags === surfaceTag) {
        return true
      }
    } else if (typeof tags === 'string') {
      const tagList = tags.split(',').map(s => parseInt(s.trim(), 10))
      if (tagList.includes(surfaceTag)) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Get the boundary condition assigned to a surface, if any
 */
export function getBCForSurface(
  surface: Surface,
  boundaryConditions: BoundaryCondition[]
): BoundaryCondition | null {
  const surfaceTag = surface.metadata.tag
  
  for (const bc of boundaryConditions) {
    const tags = bc['mesh boundary tags']
    
    if (Array.isArray(tags)) {
      if ((tags as any[]).includes(surfaceTag) || (tags as any[]).includes(String(surfaceTag))) {
        return bc
      }
    } else if (typeof tags === 'number') {
      if (tags === surfaceTag) {
        return bc
      }
    } else if (typeof tags === 'string') {
      const tagList = tags.split(',').map(s => parseInt(s.trim(), 10))
      if (tagList.includes(surfaceTag)) {
        return bc
      }
    }
  }
  
  return null
}

/**
 * Generate a deterministic color from a string (surface ID)
 * Uses a simple hash to ensure the same ID always produces the same color
 */
export function getRandomColorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Use golden ratio to spread hues evenly
  const hue = Math.abs(hash % 360)
  const saturation = 60 + Math.abs((hash >> 8) % 30) // 60-90%
  const lightness = 45 + Math.abs((hash >> 16) % 20) // 45-65%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/**
 * Default colors for BC types
 * These provide good visual distinction between common BC types
 */
export const DEFAULT_BC_TYPE_COLORS: Record<string, string> = {
  'dirichlet': '#4a90d9',      // Blue
  'riemann': '#9b59b6',        // Purple
  'no slip': '#e67e22',        // Orange
  'slip': '#f1c40f',           // Yellow
  'symmetry': '#1abc9c',       // Teal
  'periodic': '#e91e63',       // Pink
  'wall': '#795548',           // Brown
  'inlet': '#2ecc71',          // Green
  'outlet': '#e74c3c',         // Red
  'farfield': '#3498db',       // Light blue
}

/**
 * Get color for a BC type, with fallback to generated color
 */
export function getColorForBCType(
  bcType: string,
  customColors?: Record<string, string>
): string {
  // Check custom colors first
  if (customColors && customColors[bcType]) {
    return customColors[bcType]
  }
  
  // Check default colors
  if (DEFAULT_BC_TYPE_COLORS[bcType]) {
    return DEFAULT_BC_TYPE_COLORS[bcType]
  }
  
  // Generate a deterministic color for unknown types
  return getRandomColorForId(`bc-type-${bcType}`)
}

/**
 * Main function to get the display color for a surface based on color mode
 */
export function getColorForSurface(
  surface: Surface,
  colorMode: ColorMode,
  globalSettings: GlobalRenderSettings,
  boundaryConditions: BoundaryCondition[],
  bcTypeColors?: Record<string, string>
): string {
  switch (colorMode) {
    case 'solid':
      return globalSettings.solidColor
    
    case 'assigned-status': {
      const isAssigned = isSurfaceAssigned(surface, boundaryConditions)
      return isAssigned ? globalSettings.assignedColor : globalSettings.unassignedColor
    }
    
    case 'bc-type': {
      const bc = getBCForSurface(surface, boundaryConditions)
      if (bc && bc.type) {
        return getColorForBCType(bc.type, bcTypeColors)
      }
      // Unassigned surfaces show unassigned color in bc-type mode
      return globalSettings.unassignedColor
    }
    
    case 'random':
      return getRandomColorForId(surface.id)
    
    default:
      return globalSettings.solidColor
  }
}

/**
 * Check if a surface should be visible based on render settings
 */
export function shouldSurfaceBeVisible(
  surface: Surface,
  hideAssignedSurfaces: boolean,
  boundaryConditions: BoundaryCondition[],
  manualVisibility?: boolean
): boolean {
  // Manual visibility override (from SurfacesPanel toggles)
  if (manualVisibility === false) {
    return false
  }
  
  // Hide assigned surfaces if that setting is enabled
  if (hideAssignedSurfaces) {
    const isAssigned = isSurfaceAssigned(surface, boundaryConditions)
    if (isAssigned) {
      return false
    }
  }
  
  return true
}
