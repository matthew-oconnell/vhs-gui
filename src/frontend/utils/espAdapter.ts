/**
 * Adapter to convert ESP tessellation data to internal Surface format
 */

import { Surface, MeshGeometry } from '../types/surface'
import { ESPRegion, CSMBuildResponse } from './espApi'

/**
 * Convert ESP regions to internal Surface format
 * 
 * ESP returns vertices and triangle cells per face.
 * We need to expand indexed triangles to non-indexed format
 * with computed normals for Three.js BufferGeometry.
 */
export const convertESPRegionsToSurfaces = (
  response: CSMBuildResponse,
  options?: {
    centerAndScale?: boolean
  }
): Surface[] => {
  const { regions } = response
  const centerAndScale = options?.centerAndScale ?? true
  
  // First pass: compute global bounding box if centering
  let globalCenter = [0, 0, 0]
  let globalScale = 1
  
  if (centerAndScale && regions.length > 0) {
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    
    for (const region of regions) {
      for (const v of region.vertices) {
        minX = Math.min(minX, v[0])
        minY = Math.min(minY, v[1])
        minZ = Math.min(minZ, v[2])
        maxX = Math.max(maxX, v[0])
        maxY = Math.max(maxY, v[1])
        maxZ = Math.max(maxZ, v[2])
      }
    }
    
    globalCenter = [
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    ]
    
    const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ)
    globalScale = extent > 0 ? 10 / extent : 1  // Normalize to ~10 units
    
    console.log('[ESP Adapter] Global center:', globalCenter)
    console.log('[ESP Adapter] Global scale:', globalScale)
  }
  
  // Convert each region to a Surface
  const surfaces: Surface[] = regions.map((region, index) => {
    const geometry = convertRegionToGeometry(region, globalCenter, globalScale)
    
    return {
      id: `esp-${region.body}-${region.face}`,
      name: region.name,
      metadata: {
        id: `esp-${region.body}-${region.face}`,
        tag: region.tag,
        tagName: region.name,
        bcName: region.bc_name  // Pass through bc_name from ESP
      },
      geometry
    }
  })
  
  console.log('[ESP Adapter] Converted', surfaces.length, 'surfaces')
  return surfaces
}

/**
 * Convert a single ESP region to MeshGeometry
 */
function convertRegionToGeometry(
  region: ESPRegion,
  globalCenter: number[],
  globalScale: number
): MeshGeometry {
  const { vertices: indexedVerts, cells } = region
  
  // Expand indexed triangles to non-indexed vertices with normals
  const faceCount = cells.length
  const expandedVertices = new Float32Array(faceCount * 9)  // 3 verts * 3 coords
  const normals = new Float32Array(faceCount * 9)
  
  for (let i = 0; i < faceCount; i++) {
    const [i1, i2, i3] = cells[i]
    
    // Get vertex positions (centered and scaled)
    const v1 = [
      (indexedVerts[i1][0] - globalCenter[0]) * globalScale,
      (indexedVerts[i1][1] - globalCenter[1]) * globalScale,
      (indexedVerts[i1][2] - globalCenter[2]) * globalScale
    ]
    const v2 = [
      (indexedVerts[i2][0] - globalCenter[0]) * globalScale,
      (indexedVerts[i2][1] - globalCenter[1]) * globalScale,
      (indexedVerts[i2][2] - globalCenter[2]) * globalScale
    ]
    const v3 = [
      (indexedVerts[i3][0] - globalCenter[0]) * globalScale,
      (indexedVerts[i3][1] - globalCenter[1]) * globalScale,
      (indexedVerts[i3][2] - globalCenter[2]) * globalScale
    ]
    
    // Compute face normal
    const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]]
    const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]]
    
    const normal = [
      edge1[1] * edge2[2] - edge1[2] * edge2[1],
      edge1[2] * edge2[0] - edge1[0] * edge2[2],
      edge1[0] * edge2[1] - edge1[1] * edge2[0]
    ]
    
    // Normalize
    const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2)
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
  
  return {
    vertices: expandedVertices,
    normals
  }
}

/**
 * Lump small ESP regions by body
 * 
 * ESP can return many small faces. This combines faces from the
 * same body into a single surface for easier management.
 */
export const lumpESPRegionsByBody = (
  response: CSMBuildResponse,
  options?: {
    centerAndScale?: boolean
  }
): Surface[] => {
  const { regions } = response
  const centerAndScale = options?.centerAndScale ?? true
  
  // Group regions by body
  const bodiesMap = new Map<number, ESPRegion[]>()
  for (const region of regions) {
    const existing = bodiesMap.get(region.body) || []
    existing.push(region)
    bodiesMap.set(region.body, existing)
  }
  
  // Compute global bounds
  let globalCenter = [0, 0, 0]
  let globalScale = 1
  
  if (centerAndScale && regions.length > 0) {
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    
    for (const region of regions) {
      for (const v of region.vertices) {
        minX = Math.min(minX, v[0])
        minY = Math.min(minY, v[1])
        minZ = Math.min(minZ, v[2])
        maxX = Math.max(maxX, v[0])
        maxY = Math.max(maxY, v[1])
        maxZ = Math.max(maxZ, v[2])
      }
    }
    
    globalCenter = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2]
    const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ)
    globalScale = extent > 0 ? 10 / extent : 1
  }
  
  // Create one surface per body
  const surfaces: Surface[] = []
  
  for (const [bodyId, bodyRegions] of bodiesMap) {
    // Combine all faces from this body
    const totalTriangles = bodyRegions.reduce((sum, r) => sum + r.cells.length, 0)
    const combinedVertices = new Float32Array(totalTriangles * 9)
    const combinedNormals = new Float32Array(totalTriangles * 9)
    
    let offset = 0
    for (const region of bodyRegions) {
      const geom = convertRegionToGeometry(region, globalCenter, globalScale)
      combinedVertices.set(geom.vertices, offset)
      combinedNormals.set(geom.normals, offset)
      offset += geom.vertices.length
    }
    
    // Get body name from first region or use default
    const bodyName = bodyRegions[0]?.name.split('_')[0] || `Body${bodyId}`
    
    surfaces.push({
      id: `esp-body-${bodyId}`,
      name: bodyName,
      metadata: {
        id: `esp-body-${bodyId}`,
        tag: bodyId,
        tagName: bodyName,
        isLumped: true,
        originalRegionCount: bodyRegions.length
      },
      geometry: {
        vertices: combinedVertices,
        normals: combinedNormals
      }
    })
  }
  
  console.log('[ESP Adapter] Lumped into', surfaces.length, 'body surfaces')
  return surfaces
}
