export interface SurfaceMetadata {
  id: string
  tag: number
  tagName: string
  isLumped?: boolean
  originalRegionCount?: number
  bcName?: string  // Boundary condition name (from ESP or user-assigned)
  bodyId?: number  // ESP body ID (for CSM export)
  faceId?: number  // ESP face ID (for CSM export)
}

export interface MeshGeometry {
  vertices: Float32Array
  normals: Float32Array
}

export interface Surface {
  id: string
  name: string
  metadata: SurfaceMetadata
  geometry?: MeshGeometry
}
