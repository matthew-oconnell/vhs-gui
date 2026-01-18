import { Surface } from '../types/surface'

/**
 * Calculate the area-weighted average normal for a surface
 * @param surface The surface to calculate the normal for
 * @returns The normalized area-weighted average normal [x, y, z]
 */
export function calculateAreaWeightedNormal(surface: Surface): [number, number, number] {
  if (!surface.geometry) {
    return [0, 0, 1] // Default to Z-axis if no geometry data
  }

  const { vertices, normals } = surface.geometry
  
  if (!vertices || !normals || vertices.length === 0 || normals.length === 0) {
    return [0, 0, 1]
  }

  let totalArea = 0
  const weightedNormal = { x: 0, y: 0, z: 0 }

  // Process each triangle
  const triangleCount = vertices.length / 9 // 3 vertices per triangle, 3 components per vertex
  for (let i = 0; i < triangleCount; i++) {
    const offset = i * 9

    // Get triangle vertices
    const v0x = vertices[offset + 0]
    const v0y = vertices[offset + 1]
    const v0z = vertices[offset + 2]
    
    const v1x = vertices[offset + 3]
    const v1y = vertices[offset + 4]
    const v1z = vertices[offset + 5]
    
    const v2x = vertices[offset + 6]
    const v2y = vertices[offset + 7]
    const v2z = vertices[offset + 8]

    // Calculate triangle area using cross product
    const edge1x = v1x - v0x
    const edge1y = v1y - v0y
    const edge1z = v1z - v0z
    
    const edge2x = v2x - v0x
    const edge2y = v2y - v0y
    const edge2z = v2z - v0z
    
    const crossX = edge1y * edge2z - edge1z * edge2y
    const crossY = edge1z * edge2x - edge1x * edge2z
    const crossZ = edge1x * edge2y - edge1y * edge2x
    
    const crossLength = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ)
    const area = crossLength / 2

    // Get triangle normal (average of vertex normals)
    const n0x = normals[offset + 0]
    const n0y = normals[offset + 1]
    const n0z = normals[offset + 2]
    
    const n1x = normals[offset + 3]
    const n1y = normals[offset + 4]
    const n1z = normals[offset + 5]
    
    const n2x = normals[offset + 6]
    const n2y = normals[offset + 7]
    const n2z = normals[offset + 8]
    
    let avgNormalX = (n0x + n1x + n2x) / 3
    let avgNormalY = (n0y + n1y + n2y) / 3
    let avgNormalZ = (n0z + n1z + n2z) / 3
    
    // Normalize
    const normalLength = Math.sqrt(avgNormalX * avgNormalX + avgNormalY * avgNormalY + avgNormalZ * avgNormalZ)
    if (normalLength > 0) {
      avgNormalX /= normalLength
      avgNormalY /= normalLength
      avgNormalZ /= normalLength
    }

    // Weight by area
    weightedNormal.x += avgNormalX * area
    weightedNormal.y += avgNormalY * area
    weightedNormal.z += avgNormalZ * area
    totalArea += area
  }

  // Normalize the weighted normal
  if (totalArea > 0) {
    weightedNormal.x /= totalArea
    weightedNormal.y /= totalArea
    weightedNormal.z /= totalArea
    
    const length = Math.sqrt(
      weightedNormal.x * weightedNormal.x + 
      weightedNormal.y * weightedNormal.y + 
      weightedNormal.z * weightedNormal.z
    )
    
    if (length > 0) {
      weightedNormal.x /= length
      weightedNormal.y /= length
      weightedNormal.z /= length
    } else {
      weightedNormal.x = 0
      weightedNormal.y = 0
      weightedNormal.z = 1
    }
  } else {
    weightedNormal.x = 0
    weightedNormal.y = 0
    weightedNormal.z = 1
  }

  return [weightedNormal.x, weightedNormal.y, weightedNormal.z]
}
