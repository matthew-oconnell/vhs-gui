/**
 * Utility functions for parsing mesh files (STL and OBJ)
 * Supports multi-region OBJ files with groups
 * 
 * NOTE: This module provides both browser-side parsing and backend API parsing.
 * Use parseMeshFileWithBackend() for production (supports all formats via C++ server).
 * Use parseMeshFile() for local testing or as fallback.
 */

import { uploadAndConvertMesh, checkBackendHealth } from './backendApi'
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
 * Parse mesh file using backend C++ server (preferred method)
 * 
 * Uploads file to backend and receives parsed mesh data.
 * Supports: .obj, .stl, .meshb, .egads, .csm
 * 
 * Falls back to browser-side parsing if backend is unavailable.
 */
export const parseMeshFileWithBackend = async (file: File): Promise<ParsedMesh> => {
  console.log('[Mesh Parser] Parsing with backend:', file.name)
  
  try {
    // Check if backend is available
    const isBackendAvailable = await checkBackendHealth()
    
    if (!isBackendAvailable) {
      console.warn('[Mesh Parser] Backend unavailable, falling back to browser parsing')
      return await parseMeshFile(file)
    }
    
    // Upload and convert using backend
    const backendMesh = await uploadAndConvertMesh(file)
    
    // Convert to internal format
    const internalMesh = convertBackendMeshToInternal(backendMesh)
    
    console.log('[Mesh Parser] Backend parsing successful:', internalMesh.totalVertices, 'vertices')
    return internalMesh
    
  } catch (error) {
    console.error('[Mesh Parser] Backend parsing failed:', error)
    console.warn('[Mesh Parser] Falling back to browser parsing')
    return await parseMeshFile(file)
  }
}

/**
 * Parse mesh file in browser (fallback method)
 * 
 * Limited to .stl and .obj formats only.
 * Use parseMeshFileWithBackend() for full format support.
 */
export const parseMeshFile = async (file: File): Promise<ParsedMesh> => {
  console.log('[Mesh Parser] Starting to parse file:', file.name)
  const ext = file.name.toLowerCase().split('.').pop()
  
  if (ext === 'stl') {
    const meshData = await parseSTL(file)
    
    // Calculate bounding box for STL
    const vertices = meshData.vertices
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    
    for (let i = 0; i < vertices.length; i += 3) {
      minX = Math.min(minX, vertices[i])
      minY = Math.min(minY, vertices[i + 1])
      minZ = Math.min(minZ, vertices[i + 2])
      maxX = Math.max(maxX, vertices[i])
      maxY = Math.max(maxY, vertices[i + 1])
      maxZ = Math.max(maxZ, vertices[i + 2])
    }
    
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const centerZ = (minZ + maxZ) / 2
    const sizeX = maxX - minX
    const sizeY = maxY - minY
    const sizeZ = maxZ - minZ
    const maxDim = Math.max(sizeX, sizeY, sizeZ)
    const scale = 10 / maxDim
    
    // Apply transformation to vertices
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] = (vertices[i] - centerX) * scale
      vertices[i + 1] = (vertices[i + 1] - centerY) * scale
      vertices[i + 2] = (vertices[i + 2] - centerZ) * scale
    }
    
    return {
      regions: [{
        name: file.name.replace('.stl', ''),
        tag: 1,
        meshData
      }],
      totalVertices: meshData.vertices.length / 3,
      totalFaces: meshData.vertices.length / 9,
      globalCenter: [centerX, centerY, centerZ],
      globalScale: scale
    }
  } else if (ext === 'obj') {
    return await parseOBJ(file)
  } else {
    throw new Error(`Unsupported file format: ${ext}`)
  }
}

// ============================================================================
// STL Parsing
// ============================================================================

const parseSTL = async (file: File): Promise<MeshData> => {
  console.log('[STL Parser] Starting to parse file:', file.name)
  const buffer = await file.arrayBuffer()
  console.log('[STL Parser] File size:', buffer.byteLength, 'bytes')
  
  const textDecoder = new TextDecoder('utf-8')
  const header = textDecoder.decode(buffer.slice(0, 80))
  
  const isBinary = isBinarySTL(buffer)
  console.log('[STL Parser] File type:', isBinary ? 'Binary' : 'ASCII')
  
  if (header.toLowerCase().startsWith('solid') && !isBinary) {
    return parseASCIISTL(buffer)
  } else {
    return parseBinarySTL(buffer)
  }
}

const isBinarySTL = (buffer: ArrayBuffer): boolean => {
  if (buffer.byteLength < 84) return false
  const view = new DataView(buffer)
  const faceCount = view.getUint32(80, true)
  const expectedSize = 84 + (faceCount * 50)
  return Math.abs(buffer.byteLength - expectedSize) < 100
}

const parseBinarySTL = (buffer: ArrayBuffer): MeshData => {
  console.log('[STL Parser] Parsing binary STL')
  const view = new DataView(buffer)
  const faceCount = view.getUint32(80, true)
  console.log('[STL Parser] Face count:', faceCount)
  
  const vertices = new Float32Array(faceCount * 9)
  const normals = new Float32Array(faceCount * 9)
  
  let offset = 84
  for (let i = 0; i < faceCount; i++) {
    const nx = view.getFloat32(offset, true)
    const ny = view.getFloat32(offset + 4, true)
    const nz = view.getFloat32(offset + 8, true)
    offset += 12
    
    for (let v = 0; v < 3; v++) {
      const vx = view.getFloat32(offset, true)
      const vy = view.getFloat32(offset + 4, true)
      const vz = view.getFloat32(offset + 8, true)
      offset += 12
      
      const idx = i * 9 + v * 3
      vertices[idx] = vx
      vertices[idx + 1] = vy
      vertices[idx + 2] = vz
      
      normals[idx] = nx
      normals[idx + 1] = ny
      normals[idx + 2] = nz
    }
    offset += 2
  }
  
  console.log('[STL Parser] Binary parse complete - vertices:', vertices.length / 3, 'triangles:', faceCount)
  return { vertices, normals }
}

const parseASCIISTL = (buffer: ArrayBuffer): MeshData => {
  console.log('[STL Parser] Parsing ASCII STL')
  const textDecoder = new TextDecoder('utf-8')
  const text = textDecoder.decode(buffer)
  
  const vertices: number[] = []
  const normals: number[] = []
  const lines = text.split('\n')
  let currentNormal: [number, number, number] | null = null
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('facet normal')) {
      const parts = trimmed.split(/\s+/)
      currentNormal = [
        parseFloat(parts[2]),
        parseFloat(parts[3]),
        parseFloat(parts[4])
      ]
    } else if (trimmed.startsWith('vertex')) {
      const parts = trimmed.split(/\s+/)
      vertices.push(
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      )
      if (currentNormal) {
        normals.push(...currentNormal)
      }
    }
  }
  
  console.log('[STL Parser] ASCII parse complete - vertices:', vertices.length / 3)
  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals)
  }
}

// ============================================================================
// OBJ Parsing
// ============================================================================

const parseOBJ = async (file: File): Promise<ParsedMesh> => {
  console.log('[OBJ Parser] Starting to parse file:', file.name)
  const text = await file.text()
  const lines = text.split('\n')
  
  const vertices: number[][] = [] // Global vertex list (1-indexed)
  const regions: Map<string, { tag: number, faces: number[][] }> = new Map()
  let currentGroupName = 'default'
  let currentTag = 1
  
  console.log('[OBJ Parser] Parsing lines...')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    
    const parts = trimmed.split(/\s+/)
    const cmd = parts[0]
    
    if (cmd === 'v') {
      // Vertex: v x y z
      vertices.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      ])
    } else if (cmd === 'g') {
      // Group: g Tag_1 or g inlet
      currentGroupName = parts[1] || 'default'
    } else if (cmd === 'o') {
      // Object: o tag_1 (extract tag number from "tag_N" format)
      const objName = parts[1] || 'tag_1'
      const match = objName.match(/tag_(\d+)/i)
      if (match) {
        currentTag = parseInt(match[1], 10)
      }
      
      // Create region with current group name and extracted tag number
      const regionKey = `${currentGroupName}_${currentTag}`
      if (!regions.has(regionKey)) {
        regions.set(regionKey, { tag: currentTag, faces: [] })
        console.log(`[OBJ Parser] New region: "${currentGroupName}" with tag ${currentTag}`)
      }
    } else if (cmd === 'f') {
      // Face: f v1 v2 v3 or f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3
      const regionKey = `${currentGroupName}_${currentTag}`
      if (!regions.has(regionKey)) {
        regions.set(regionKey, { tag: currentTag, faces: [] })
      }
      
      const faceVertices: number[] = []
      for (let i = 1; i < parts.length; i++) {
        // Parse vertex index (handle v, v/vt, v/vt/vn, v//vn formats)
        const vertexIndex = parseInt(parts[i].split('/')[0])
        faceVertices.push(vertexIndex)
      }
      
      // Triangulate if quad
      if (faceVertices.length === 3) {
        regions.get(regionKey)!.faces.push(faceVertices)
      } else if (faceVertices.length === 4) {
        // Split quad into two triangles
        regions.get(regionKey)!.faces.push([faceVertices[0], faceVertices[1], faceVertices[2]])
        regions.get(regionKey)!.faces.push([faceVertices[0], faceVertices[2], faceVertices[3]])
      }
    }
  }
  
  console.log('[OBJ Parser] Found', vertices.length, 'vertices and', regions.size, 'regions')
  
  // Calculate GLOBAL bounding box from all vertices
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  
  for (const vertex of vertices) {
    minX = Math.min(minX, vertex[0])
    minY = Math.min(minY, vertex[1])
    minZ = Math.min(minZ, vertex[2])
    maxX = Math.max(maxX, vertex[0])
    maxY = Math.max(maxY, vertex[1])
    maxZ = Math.max(maxZ, vertex[2])
  }
  
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const centerZ = (minZ + maxZ) / 2
  const sizeX = maxX - minX
  const sizeY = maxY - minY
  const sizeZ = maxZ - minZ
  const maxDim = Math.max(sizeX, sizeY, sizeZ)
  const globalScale = 10 / maxDim
  
  console.log('[OBJ Parser] Global bounds:', {
    center: [centerX, centerY, centerZ],
    size: [sizeX, sizeY, sizeZ],
    scale: globalScale
  })
  
  // Convert regions to RegionData with global transformation
  const regionDataList: RegionData[] = []
  let totalVertices = 0
  let totalFaces = 0
  
  for (const [regionKey, { tag, faces }] of regions.entries()) {
    // Extract the group name from the regionKey (format: "GroupName_TagNumber")
    const name = regionKey.substring(0, regionKey.lastIndexOf('_'))
    
    const meshData = convertFacesToMeshData(vertices, faces, centerX, centerY, centerZ, globalScale)
    regionDataList.push({ name, tag, meshData })
    totalVertices += meshData.vertices.length / 3
    totalFaces += faces.length
    console.log(`[OBJ Parser] Region "${name}" (tag ${tag}): ${faces.length} faces`)
  }
  
  console.log('[OBJ Parser] Parse complete - total vertices:', totalVertices, 'total faces:', totalFaces)
  
  return {
    regions: regionDataList,
    totalVertices,
    totalFaces,
    globalCenter: [centerX, centerY, centerZ],
    globalScale
  }
}

const convertFacesToMeshData = (
  vertices: number[][], 
  faces: number[][], 
  centerX: number, 
  centerY: number, 
  centerZ: number, 
  scale: number
): MeshData => {
  const vertexArray: number[] = []
  const normalArray: number[] = []
  
  for (const face of faces) {
    // Get three vertices (OBJ is 1-indexed)
    const v1 = vertices[face[0] - 1]
    const v2 = vertices[face[1] - 1]
    const v3 = vertices[face[2] - 1]
    
    // Apply global transformation: center then scale
    const v1t = [(v1[0] - centerX) * scale, (v1[1] - centerY) * scale, (v1[2] - centerZ) * scale]
    const v2t = [(v2[0] - centerX) * scale, (v2[1] - centerY) * scale, (v2[2] - centerZ) * scale]
    const v3t = [(v3[0] - centerX) * scale, (v3[1] - centerY) * scale, (v3[2] - centerZ) * scale]
    
    // Add transformed vertices
    vertexArray.push(...v1t, ...v2t, ...v3t)
    
    // Calculate face normal from transformed vertices
    const e1 = [v2t[0] - v1t[0], v2t[1] - v1t[1], v2t[2] - v1t[2]]
    const e2 = [v3t[0] - v1t[0], v3t[1] - v1t[1], v3t[2] - v1t[2]]
    const normal = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0]
    ]
    
    // Normalize
    const len = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2])
    if (len > 0) {
      normal[0] /= len
      normal[1] /= len
      normal[2] /= len
    }
    
    // Add normal for all three vertices
    normalArray.push(...normal, ...normal, ...normal)
  }
  
  return {
    vertices: new Float32Array(vertexArray),
    normals: new Float32Array(normalArray)
  }
}

// ============================================================================
// File Picker
// ============================================================================

export const pickMeshFile = async (): Promise<File | null> => {
  console.log('[Mesh Parser] Opening file picker')
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.stl,.obj'
    
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
