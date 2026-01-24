/**
 * Geometry utility functions for mesh analysis and manipulation
 */

import { Surface } from '../types/surface'

export interface BoundingBox {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
  center: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  characteristicLength: number
}

/**
 * Calculate the bounding box of a set of surfaces
 * @param surfaces Array of surfaces to analyze
 * @returns Bounding box with min/max/center/size/characteristicLength
 */
export function calculateBoundingBox(surfaces: Surface[]): BoundingBox {
  if (surfaces.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      center: { x: 0, y: 0, z: 0 },
      size: { x: 0, y: 0, z: 0 },
      characteristicLength: 0,
    }
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  // Find min/max across all vertices in all surfaces
  surfaces.forEach(surface => {
    if (!surface.geometry?.vertices) {
      return // Skip surfaces without geometry
    }
    
    // Vertices are stored as Float32Array [x1, y1, z1, x2, y2, z2, ...]
    const vertices = surface.geometry.vertices
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const y = vertices[i + 1]
      const z = vertices[i + 2]
      
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      minZ = Math.min(minZ, z)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      maxZ = Math.max(maxZ, z)
    }
  })

  const sizeX = maxX - minX
  const sizeY = maxY - minY
  const sizeZ = maxZ - minZ

  // Characteristic length is the diagonal of the bounding box
  const characteristicLength = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ)

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2,
    },
    size: { x: sizeX, y: sizeY, z: sizeZ },
    characteristicLength,
  }
}
