/**
 * ESP API Client (Tauri Commands)
 * 
 * Uses Tauri's invoke() to call Rust FFI bindings for ESP geometry operations.
 * Replaces the old Python ESP server.
 */

import { invoke } from '@tauri-apps/api/core'

export interface ESPParameter {
  name: string
  value: number | number[][]
  type: 'scalar' | 'array'
  nrow?: number
  ncol?: number
}

export interface ESPRegion {
  name: string
  tag: number
  body: number
  face: number
  vertices: number[][]  // [[x,y,z], [x,y,z], ...]
  cells: number[][]     // [[v1,v2,v3], [v1,v2,v3], ...]
  bc_name?: string      // Optional boundary condition name from ESP attribute
}

export interface CSMBuildResponse {
  success: boolean
  message: string
  regions: ESPRegion[]
  parameters: ESPParameter[]
  total_vertices: number
  total_faces: number
  build_log?: string[]  // Server output during build
}

export interface ESPHealthResponse {
  status: string
  esp_available: boolean
  esp_root: string | null
  message: string
}

/**
 * Check if ESP functionality is available (compiled with ESP libraries)
 */
export const checkESPHealth = async (): Promise<ESPHealthResponse> => {
  try {
    // Try to get model info - if ESP is disabled, this will fail
    await invoke('get_model_info')
    
    return {
      status: 'ok',
      esp_available: true,
      esp_root: null, // Not needed with Tauri FFI
      message: 'ESP libraries available'
    }
  } catch (error) {
    // If command doesn't exist, ESP is not compiled in
    const message = error instanceof Error ? error.toString() : 'ESP not available'
    const isNotCompiled = message.includes('No handler registered') || message.includes('not found')
    
    return {
      status: 'error',
      esp_available: false,
      esp_root: null,
      message: isNotCompiled 
        ? 'ESP libraries not installed (rebuild with ESP support)' 
        : message
    }
  }
}

/**
 * Build CSM file and return geometry
 * NOTE: Currently only supports file paths, not inline content
 * TODO: Add support for temporary file creation for inline CSM content
 */
export const buildCSM = async (csmFilePath: string): Promise<CSMBuildResponse> => {
  console.log('[ESP API] Loading CSM file via Tauri:', csmFilePath)
  const perfStart = performance.now()
  
  try {
    const invokeStart = performance.now()
    const result = await invoke<any>('load_csm_file', { path: csmFilePath })
    const invokeEnd = performance.now()
    console.log(`[Performance] Tauri invoke (load_csm_file): ${(invokeEnd - invokeStart).toFixed(2)}ms`)
    
    console.log('[ESP API] Build successful')
    console.log('[ESP API] Parameters:', result.parameters?.length || 0)
    console.log('[ESP API] Bodies:', result.bodies?.length || 0)
    console.log('[ESP API] Regions:', result.regions?.length || 0)
    
    const conversionStart = performance.now()
    // Convert Rust response to expected format
    const response = {
      success: true,
      message: 'CSM loaded successfully',
      regions: result.regions?.map((r: any) => ({
        name: r.name,
        tag: r.tag,
        body: r.body,
        face: r.face,
        vertices: r.vertices,
        cells: r.cells,
        bc_name: r.bc_name,
      })) || [],
      parameters: result.parameters?.map((p: any) => ({
        name: p.name,
        value: p.value,
        type: 'scalar', // TODO: Handle arrays
      })) || [],
      total_vertices: result.regions?.reduce((sum: number, r: any) => sum + r.vertices.length, 0) || 0,
      total_faces: result.regions?.reduce((sum: number, r: any) => sum + r.cells.length, 0) || 0,
      build_log: []
    }
    const conversionEnd = performance.now()
    const totalEnd = performance.now()
    console.log(`[Performance] Response conversion: ${(conversionEnd - conversionStart).toFixed(2)}ms`)
    console.log(`[Performance] Total buildCSM: ${(totalEnd - perfStart).toFixed(2)}ms`)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.toString() : 'Build failed'
    throw new Error(message)
  }
}

/**
 * Build CSM with dependency files
 * 
 * NOTE: With Tauri FFI, dependencies must be written to temp files first
 * TODO: Implement temp file creation and cleanup
 * 
 * @param csmFilePath Path to main CSM file
 * @param dependencies Map of filename -> File object for imported files
 */
export const buildCSMWithDeps = async (
  csmFilePath: string,
  dependencies: Map<string, File>
): Promise<CSMBuildResponse> => {
  console.log('[ESP API] Building CSM with', dependencies.size, 'dependencies')
  
  // TODO: Write dependency files to temp directory
  // For now, just call buildCSM with the main file
  console.warn('[ESP API] Dependency handling not yet implemented in Tauri version')
  
  return buildCSM(csmFilePath)
}

/**
 * Build CSM with dependencies - STREAMING VERSION
 * Provides real-time log updates via callback as build progresses
 * 
 * NOTE: Streaming not yet implemented in Tauri version
 * TODO: Add event-based logging through Tauri events
 * 
 * @param csmFilePath Path to main CSM file
 * @param dependencies Map of filename -> File object for imported files
 * @param onLog Callback function to receive log messages as they arrive
 */
export const buildCSMWithDepsStreaming = async (
  csmFilePath: string,
  dependencies: Map<string, File>,
  onLog: (message: string) => void
): Promise<CSMBuildResponse> => {
  console.log('[ESP API] Building CSM (streaming not yet implemented in Tauri)')
  
  onLog('Loading CSM file...')
  onLog(`Path: ${csmFilePath}`)
  
  if (dependencies.size > 0) {
    onLog(`Warning: ${dependencies.size} dependencies found but not yet supported`)
  }
  
  const result = await buildCSM(csmFilePath)
  
  onLog(`Build complete: ${result.parameters.length} parameters, ${result.total_faces} faces`)
  
  return result
}

/**
 * Load CSM file from disk and build it
 * 
 * NOTE: In Tauri, we need the file path, not the File object content
 */
export const loadAndBuildCSMFile = async (filePath: string): Promise<CSMBuildResponse> => {
  console.log('[ESP API] Loading CSM file:', filePath)
  
  return buildCSM(filePath)
}

/**
 * Export CSM with updated bc_name attributes
 * 
 * Generates SELECT FACE + ATTRIBUTE commands and inserts them into the CSM file.
 * The modified CSM is saved and the model is reloaded.
 * 
 * @param csmFilePath - Path to the CSM file
 * @param bcNameUpdates - Array of face bc_name updates { body, face, bc_name }
 * @returns Success message
 */
export const exportCSMWithBCNames = async (
  csmFilePath: string,
  bcNameUpdates: Array<{ body: number; face: number; bc_name: string }>
): Promise<string> => {
  console.log('[ESP API] Updating bc_names for', bcNameUpdates.length, 'faces')
  
  // Convert updates array to face index -> bc_name map
  // For now, assume single body (body index not used in generator yet)
  const faceBcNames: Record<number, string> = {}
  for (const update of bcNameUpdates) {
    faceBcNames[update.face] = update.bc_name
  }
  
  const result = await invoke('update_face_bc_names', {
    csmPath: csmFilePath,
    faceBcNames
  })
  
  console.log('[ESP API] Update result:', result)
  return result as string
}

/**
 * Close the current ESP model and free native resources
 * Should be called when creating a new blank project or before loading a new model
 */
export const closeESPModel = async (): Promise<void> => {
  try {
    await invoke('close_model')
    console.log('[ESP API] ✅ ESP model closed successfully')
  } catch (error) {
    console.warn('[ESP API] ⚠️ Error closing ESP model:', error)
    // Don't throw - we want cleanup to continue even if close fails
  }
}
