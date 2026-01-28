/**
 * Configuration migration utilities for converting old nested schema format
 * (with HyperSolve/Vulcan root keys) to new flat schema format.
 * 
 * Schema Migration Context:
 * - Old schema: config.HyperSolve['boundary conditions'] or config.Vulcan['boundary conditions']
 * - New schema: config['boundary conditions'] (all properties at root level)
 * 
 * See: docs/SCHEMA_MIGRATION_PLAN.md
 */

export type ConfigFormat = 'old-hypersolve' | 'old-vulcan' | 'flat'

/**
 * Detect the format of a configuration object
 * 
 * @param config - Configuration object to analyze
 * @returns Format type: 'old-hypersolve', 'old-vulcan', or 'flat'
 */
export const detectConfigFormat = (config: any): ConfigFormat => {
  if (!config || typeof config !== 'object') {
    return 'flat'
  }

  // Check for old nested formats
  if (config.HyperSolve && typeof config.HyperSolve === 'object') {
    return 'old-hypersolve'
  }

  if (config.Vulcan && typeof config.Vulcan === 'object') {
    return 'old-vulcan'
  }

  // Default to flat format
  return 'flat'
}

/**
 * Check if a configuration object uses the old nested format
 * 
 * @param config - Configuration object to check
 * @returns True if config uses old HyperSolve or Vulcan nested structure
 */
export const isOldFormat = (config: any): boolean => {
  const format = detectConfigFormat(config)
  return format === 'old-hypersolve' || format === 'old-vulcan'
}

/**
 * Migrate a configuration from old nested structure to new flat structure
 * 
 * Old format:
 * ```
 * {
 *   "mesh filename": "...",
 *   "HyperSolve": {
 *     "boundary conditions": [...],
 *     "states": {...},
 *     "steps": 500
 *   }
 * }
 * ```
 * 
 * New format:
 * ```
 * {
 *   "mesh filename": "...",
 *   "boundary conditions": [...],
 *   "states": {...},
 *   "steps": 500
 * }
 * ```
 * 
 * @param config - Configuration object (old or new format)
 * @returns Configuration in flat format (deep clone, does not mutate original)
 */
export const migrateConfigToFlatStructure = (config: any): any => {
  // Deep clone to avoid mutating original
  const cloned = JSON.parse(JSON.stringify(config))

  const format = detectConfigFormat(cloned)

  // Already flat - return as-is
  if (format === 'flat') {
    return cloned
  }

  // Determine which nested key to migrate from
  const nestedKey = format === 'old-hypersolve' ? 'HyperSolve' : 'Vulcan'
  const nestedConfig = cloned[nestedKey]

  // Create new flat structure
  const flatConfig: any = {}

  // 1. Copy all root-level properties FIRST (these are typically meta-properties)
  Object.keys(cloned).forEach(key => {
    if (key !== 'HyperSolve' && key !== 'Vulcan') {
      flatConfig[key] = cloned[key]
    }
  })

  // 2. Copy all nested properties to root level (these override root if conflicts)
  if (nestedConfig && typeof nestedConfig === 'object') {
    Object.keys(nestedConfig).forEach(key => {
      flatConfig[key] = nestedConfig[key]
    })
  }

  return flatConfig
}

/**
 * BC type migration mapping from deprecated types to new types
 */
const BC_TYPE_MIGRATIONS: Record<string, string> = {
  'dirichlet': 'fixed inflow',
  'dirichlet profile': 'fixed inflow', // Note: also needs 'profile' option set
  'extrapolation': 'supersonic outflow',
  'no slip': 'no slip wall',
  'wall matching': 'no slip wall', // Note: also needs 'wall matching':true set
  'back pressure': 'subsonic outflow',
  'subsonic inflow total': 'subsonic inflow',
}

/**
 * Migrate deprecated BC types to their new equivalents
 * 
 * @param bc - Boundary condition object
 * @returns Migrated BC object (new object, does not mutate original)
 */
export const migrateBCType = (bc: any): any => {
  if (!bc || !bc.type) {
    return bc
  }

  const newType = BC_TYPE_MIGRATIONS[bc.type]
  if (!newType) {
    return bc // No migration needed
  }

  const migrated = { ...bc, type: newType }

  // Special case: dirichlet profile → fixed inflow with profile option
  if (bc.type === 'dirichlet profile' && bc.profile) {
    migrated.profile = bc.profile
  }

  // Special case: wall matching → no slip wall with wall matching flag
  if (bc.type === 'wall matching') {
    migrated['wall matching'] = true
  }

  return migrated
}

/**
 * Migrate all BCs in a configuration to new types
 * 
 * @param config - Configuration object
 * @returns Configuration with migrated BCs (new object, does not mutate original)
 */
export const migrateBCTypes = (config: any): any => {
  if (!config || !config['boundary conditions']) {
    return config
  }

  const cloned = JSON.parse(JSON.stringify(config))
  
  if (Array.isArray(cloned['boundary conditions'])) {
    cloned['boundary conditions'] = cloned['boundary conditions'].map(migrateBCType)
  }

  return cloned
}
