/**
 * ESP Gateway API Client
 * 
 * Communicates with the Python ESP server for CSM geometry operations
 */

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
}

export interface ESPHealthResponse {
  status: string
  esp_available: boolean
  esp_root: string | null
  message: string
}

/**
 * Configuration for ESP Gateway API
 */
const ESP_API_BASE_URL = (import.meta as any).env?.VITE_ESP_API_URL || 'http://127.0.0.1:8081'

/**
 * Check if ESP server is available
 */
export const checkESPHealth = async (): Promise<ESPHealthResponse> => {
  try {
    const response = await fetch(`${ESP_API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    
    if (!response.ok) {
      return {
        status: 'error',
        esp_available: false,
        esp_root: null,
        message: `Server returned ${response.status}`
      }
    }
    
    return response.json()
  } catch (error) {
    return {
      status: 'error',
      esp_available: false,
      esp_root: null,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

/**
 * Build CSM content and return tessellated geometry
 */
export const buildCSM = async (csmContent: string): Promise<CSMBuildResponse> => {
  console.log('[ESP API] Building CSM, content length:', csmContent.length)
  
  const response = await fetch(`${ESP_API_BASE_URL}/csm/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      csm_content: csmContent
    })
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Build failed' }))
    throw new Error(error.detail || `Build failed with status ${response.status}`)
  }
  
  const result = await response.json()
  console.log('[ESP API] Build successful:', result.message)
  console.log('[ESP API] Regions:', result.regions.length, 'Parameters:', result.parameters.length)
  
  return result
}

/**
 * Convert ArrayBuffer to base64 string (handles large files)
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 8192 // Process 8KB at a time to avoid stack overflow
  let binary = ''
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode(...chunk)
  }
  
  return btoa(binary)
}

/**
 * Build CSM content with dependency files and return tessellated geometry
 * 
 * @param csmContent The main CSM file content
 * @param dependencies Map of filename -> File object for imported files
 */
export const buildCSMWithDeps = async (
  csmContent: string,
  dependencies: Map<string, File>
): Promise<CSMBuildResponse> => {
  console.log('[ESP API] Building CSM with', dependencies.size, 'dependencies')
  
  // Convert File objects to base64 for JSON transfer
  const depsBase64: Record<string, string> = {}
  
  for (const [filename, file] of dependencies.entries()) {
    const arrayBuffer = await file.arrayBuffer()
    const base64 = arrayBufferToBase64(arrayBuffer)
    depsBase64[filename] = base64
    console.log('[ESP API] Encoded dependency:', filename, '(', file.size, 'bytes )')
  }
  
  const response = await fetch(`${ESP_API_BASE_URL}/csm/build-with-deps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      csm_content: csmContent,
      dependencies: depsBase64
    })
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Build failed' }))
    throw new Error(error.detail || `Build failed with status ${response.status}`)
  }
  
  const result = await response.json()
  console.log('[ESP API] Build with deps successful:', result.message)
  console.log('[ESP API] Regions:', result.regions.length, 'Parameters:', result.parameters.length)
  
  return result
}

/**
 * Load CSM file from disk and build it
 */
export const loadAndBuildCSMFile = async (file: File): Promise<CSMBuildResponse> => {
  console.log('[ESP API] Loading CSM file:', file.name)
  
  const content = await file.text()
  return buildCSM(content)
}

/**
 * Export CSM with updated bc_name attributes
 */
export const exportCSMWithBCNames = async (
  csmContent: string,
  bcNameUpdates: Array<{ body: number; face: number; bc_name: string }>
): Promise<string> => {
  console.log('[ESP API] Exporting CSM with', bcNameUpdates.length, 'bc_name updates')
  
  try {
    const response = await fetch(`${ESP_API_BASE_URL}/csm/export-with-bc-names`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csm_content: csmContent,
        bc_name_updates: bcNameUpdates
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Export failed')
    }
    
    const result = await response.json()
    console.log('[ESP API] Export successful:', result.message)
    return result.csm_content
  } catch (error) {
    console.error('[ESP API] Export failed:', error)
    throw error
  }
}
