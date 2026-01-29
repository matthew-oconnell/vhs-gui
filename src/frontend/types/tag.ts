/**
 * Tag - Core type representing a mesh boundary region
 * 
 * A Tag is the fundamental unit in our CFD model. It represents a collection of
 * triangles on the mesh boundary that share the same tag number and tag name.
 * 
 * Key concepts:
 * - tagNumber: The numeric identifier used by the CFD solver
 * - tagName: Human-readable name for the tag (e.g., "wall", "farfield")
 * - Each tag number has exactly ONE tag name (enforced at load time)
 * - Multiple tags can share the same tag name (forms a "group" in the UI)
 */

export interface TagMetadata {
  id: string
  tagNumber: number      // CFD solver tag number (must be unique per tag instance)
  tagName: string        // CFD tag name (e.g., "wall", "farfield")
  
  // Optional ESP/CAD metadata (for CSM export and debugging)
  espInternalId?: string // ESP's internal identifier (e.g., "Body1_Face12")
  bodyId?: number        // ESP body ID (for CSM export)
  faceId?: number        // ESP face ID (for CSM export)
}

export interface MeshGeometry {
  vertices: Float32Array
  normals: Float32Array
}

export interface Tag {
  id: string
  name: string           // Display name (usually same as metadata.tagName)
  metadata: TagMetadata
  geometry?: MeshGeometry
}

/**
 * Group - UI convenience type (not stored)
 * 
 * A Group represents all tags that share the same tagName.
 * Groups are computed at runtime from the tags array, not stored separately.
 */
export interface TagGroup {
  tagName: string        // The shared tag name
  tags: Tag[]            // All tags with this name
  tagNumbers: number[]   // All tag numbers in this group
}

// Phase 7: Backward compatibility alias (will be removed after full migration)
// Use Tag instead of Surface in new code
export type Surface = Tag
