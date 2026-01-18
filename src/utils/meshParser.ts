/**
 * Mesh file parsing via C++ backend server
 * Supports: .obj, .stl, .meshb, .egads, .csm
 * 
 * All mesh parsing is handled by the backend server.
 * The server must be running for mesh loading to work.
 */

import { uploadAndConvertMesh } from './backendApi'
import { convertBackendMeshToInternal } from './meshAdapter'

export interface MeshData {
  vertices: Float32Array
  normals: Float32Array
}

export interface RegionData {
  name: string
  tag: number
  meshData: MeshData
}

export interface ParsedMesh {
  regions: RegionData[]
  totalVertices: number
  totalFaces: number
  globalCenter: [number, number, number]
  globalScale: number
}

/**
 * Parse mesh file using backend C++ server
 * 
 * Uploads file to backend and receives parsed mesh data.
 * Supports: .obj, .stl, .meshb, .egads, .csm
 * 
 * Note: Server must be running for this to work.
 */
export const parseMeshFile = async (file: File): Promise<ParsedMesh> => {
  console.log('[Mesh Parser] Uploading to backend:', file.name)
  
  // Upload and convert using backend
  const backendMesh = await uploadAndConvertMesh(file)
  
  // Convert to internal format
  const internalMesh = convertBackendMeshToInternal(backendMesh)
  
  console.log('[Mesh Parser] Parsing successful:', internalMesh.totalVertices, 'vertices')
  return internalMesh
}

/**
 * Open file picker dialog for mesh files
 * Accepts: .obj, .stl, .meshb, .egads, .csm
 */
export const pickMeshFile = async (): Promise<File | null> => {
  console.log('[Mesh Parser] Opening file picker')
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.stl,.obj,.meshb,.egads,.csm'
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      console.log('[Mesh Parser] File selected:', file?.name || 'none')
      resolve(file || null)
    }
    
    input.oncancel = () => {
      console.log('[Mesh Parser] File picker cancelled')
      resolve(null)
    }
    
    input.click()
  })
}
