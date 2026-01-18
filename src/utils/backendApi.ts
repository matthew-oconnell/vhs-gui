/**
 * Backend API client for mesh operations
 * 
 * Communicates with the C++ server for mesh upload and conversion
 */

export interface UploadResponse {
  success: boolean
  sessionId: string
  filename: string
  extension: string
  size: string
  sizeBytes: number
  path: string
  message: string
}

export interface MeshRegion {
  name: string
  tag: number
  vertices: number[][]
  cells: number[][]
}

export interface BackendMeshData {
  totalVertices: number
  totalFaces: number
  globalCenter: number[]
  globalScale: number
  regions: MeshRegion[]
}

/**
 * Configuration for backend API
 */
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8080'

/**
 * Upload mesh file to backend
 */
export const uploadMeshToBackend = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('mesh', file)
  
  const response = await fetch(`${API_BASE_URL}/api/mesh/upload`, {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || `Upload failed with status ${response.status}`)
  }
  
  return response.json()
}

/**
 * Convert uploaded mesh to JSON format
 */
export const convertMesh = async (sessionId: string): Promise<BackendMeshData> => {
  const response = await fetch(`${API_BASE_URL}/api/mesh/convert/${sessionId}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Conversion failed' }))
    throw new Error(error.error || `Conversion failed with status ${response.status}`)
  }
  
  return response.json()
}

/**
 * Upload and convert mesh in one call
 */
export const uploadAndConvertMesh = async (file: File): Promise<BackendMeshData> => {
  console.log('[Backend API] Uploading mesh:', file.name)
  
  const uploadResult = await uploadMeshToBackend(file)
  console.log('[Backend API] Upload successful, sessionId:', uploadResult.sessionId)
  
  const meshData = await convertMesh(uploadResult.sessionId)
  console.log('[Backend API] Conversion successful:', meshData.totalVertices, 'vertices,', meshData.totalFaces, 'faces')
  
  return meshData
}

/**
 * Check if backend is available
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    })
    return response.ok
  } catch (error) {
    console.warn('[Backend API] Health check failed:', error)
    return false
  }
}
