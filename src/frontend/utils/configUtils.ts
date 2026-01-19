/**
 * Helper utility to access the root solver configuration
 * dynamically based on which key exists (Vulcan or HyperSolve)
 */

import { ConfigData } from '../types/config'

/**
 * Get the root solver configuration object from configData
 * @param configData - The configuration data object
 * @param rootSolverKey - The root solver key ('Vulcan' or 'HyperSolve')
 * @returns The solver configuration object or undefined
 */
export const getRootConfig = (
  configData: ConfigData,
  rootSolverKey: string | null
): any => {
  if (!rootSolverKey) {
    // Fallback: try both keys
    return configData.Vulcan || configData.HyperSolve
  }
  
  return (configData as any)[rootSolverKey]
}

/**
 * Update the root solver configuration
 * @param configData - The current configuration data
 * @param rootSolverKey - The root solver key
 * @param updates - Partial updates to apply
 * @returns Updated configuration data
 */
export const updateRootConfig = (
  configData: ConfigData,
  rootSolverKey: string | null,
  updates: Partial<any>
): ConfigData => {
  const key = rootSolverKey || 'HyperSolve'
  
  return {
    ...configData,
    [key]: {
      ...(configData as any)[key],
      ...updates
    }
  }
}
