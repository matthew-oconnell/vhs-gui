/**
 * Adapter to convert backend mesh data to internal ParsedMesh format
 */

import { ParsedMesh, RegionData, MeshData } from './meshParser'
import { BackendMeshData } from './backendApi'

/**
 * Convert backend mesh data to internal ParsedMesh format
 * 
 * Backend returns mesh data with vertices and cells per region.
 * We need to convert this to the Three.js-compatible format with
 * vertices and normals as Float32Arrays.
 */
export const convertBackendMeshToInternal = (backendMesh: BackendMeshData): ParsedMesh => {
  const regions: RegionData[] = backendMesh.regions.map(region => {
    // Convert vertices to flat Float32Array for Three.js
    const vertexCount = region.vertices.length
    const vertices = new Float32Array(vertexCount * 3)
    
    for (let i = 0; i < vertexCount; i++) {
      vertices[i * 3] = region.vertices[i][0]
      vertices[i * 3 + 1] = region.vertices[i][1]
      vertices[i * 3 + 2] = region.vertices[i][2]
    }
    
    // Convert cells to indexed geometry
    // Each cell is a triangle [v1, v2, v3]
    // We need to expand these to individual vertices for rendering
    const faceCount = region.cells.length
    const expandedVertices = new Float32Array(faceCount * 9) // 3 vertices * 3 coords per triangle
    const normals = new Float32Array(faceCount * 9)
    
    for (let i = 0; i < faceCount; i++) {
      const cell = region.cells[i]
      const v1Idx = cell[0]
      const v2Idx = cell[1]
      const v3Idx = cell[2]
      
      // Get vertex coordinates
      const v1 = [vertices[v1Idx * 3], vertices[v1Idx * 3 + 1], vertices[v1Idx * 3 + 2]]
      const v2 = [vertices[v2Idx * 3], vertices[v2Idx * 3 + 1], vertices[v2Idx * 3 + 2]]
      const v3 = [vertices[v3Idx * 3], vertices[v3Idx * 3 + 1], vertices[v3Idx * 3 + 2]]
      
      // Calculate face normal
      const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]]
      const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]]
      
      const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
      ]
      
      // Normalize
      const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2])
      if (length > 0) {
        normal[0] /= length
        normal[1] /= length
        normal[2] /= length
      }
      
      // Store expanded vertices and normals
      const baseIdx = i * 9
      
      // Vertex 1
      expandedVertices[baseIdx] = v1[0]
      expandedVertices[baseIdx + 1] = v1[1]
      expandedVertices[baseIdx + 2] = v1[2]
      normals[baseIdx] = normal[0]
      normals[baseIdx + 1] = normal[1]
      normals[baseIdx + 2] = normal[2]
      
      // Vertex 2
      expandedVertices[baseIdx + 3] = v2[0]
      expandedVertices[baseIdx + 4] = v2[1]
      expandedVertices[baseIdx + 5] = v2[2]
      normals[baseIdx + 3] = normal[0]
      normals[baseIdx + 4] = normal[1]
      normals[baseIdx + 5] = normal[2]
      
      // Vertex 3
      expandedVertices[baseIdx + 6] = v3[0]
      expandedVertices[baseIdx + 7] = v3[1]
      expandedVertices[baseIdx + 8] = v3[2]
      normals[baseIdx + 6] = normal[0]
      normals[baseIdx + 7] = normal[1]
      normals[baseIdx + 8] = normal[2]
    }
    
    const meshData: MeshData = {
      vertices: expandedVertices,
      normals: normals
    }
    
    return {
      name: region.name,
      tag: region.tag,
      meshData
    }
  })
  
  return {
    regions,
    totalVertices: backendMesh.totalVertices,
    totalFaces: backendMesh.totalFaces,
    globalCenter: backendMesh.globalCenter as [number, number, number],
    globalScale: backendMesh.globalScale
  }
}
