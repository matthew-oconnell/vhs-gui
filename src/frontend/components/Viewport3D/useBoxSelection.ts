import { useCallback, useEffect, useRef } from 'react'
import { useAppStore, BoxSelectionSettings, SurfaceBounds } from '../../store/appStore'
import { Surface } from '../../types/tag'
import * as THREE from 'three'

// Access box selection refs from window (set by Scene component)
function getBoxSelectionRefs(): { 
  canvas: HTMLCanvasElement; 
  camera: THREE.Camera; 
  renderer: THREE.WebGLRenderer;
  getControls: () => any 
} | null {
  return (window as any).boxSelectionRefs || null
}

/**
 * Convert a surface index to a unique RGB color for ID rendering
 * Uses the index to create a unique color (max ~16 million surfaces)
 */
function indexToColor(index: number): THREE.Color {
  // Add 1 to avoid black (0,0,0) which is the background
  const id = index + 1
  const r = ((id >> 16) & 255) / 255
  const g = ((id >> 8) & 255) / 255
  const b = (id & 255) / 255
  return new THREE.Color(r, g, b)
}

/**
 * Convert RGB values back to a surface index
 */
function colorToIndex(r: number, g: number, b: number): number {
  const id = (r << 16) | (g << 8) | b
  return id - 1 // Subtract 1 because we added 1 in indexToColor
}

/**
 * Expand selection to include all surfaces in the same groups (by bcName)
 */
export function expandToGroups(selectedTags: Surface[], allSurfaces: Surface[]): Surface[] {
  // Get all bcNames from selected surfaces
  const selectedBcNames = new Set<string>()
  for (const s of selectedTags) {
    if (s.metadata.bcName) {
      selectedBcNames.add(s.metadata.bcName)
    }
  }
  
  // Include all surfaces with matching bcName, plus ungrouped selected surfaces
  return allSurfaces.filter(s => 
    selectedTags.some(sel => sel.id === s.id) ||
    (s.metadata.bcName && selectedBcNames.has(s.metadata.bcName))
  )
}

/**
 * Check if a modifier key matches the configured modifier
 */
function checkModifier(e: PointerEvent | MouseEvent, modifier: 'shift' | 'ctrl' | 'alt'): boolean {
  switch (modifier) {
    case 'shift': return e.shiftKey
    case 'ctrl': return e.ctrlKey || e.metaKey
    case 'alt': return e.altKey
  }
}

/**
 * Project a 3D point to 2D screen coordinates
 */
function projectToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number
): { x: number; y: number } {
  const projected = point.clone().project(camera)
  return {
    x: (projected.x + 1) / 2 * width,
    y: (-projected.y + 1) / 2 * height
  }
}

/**
 * Check if a point is inside a 2D box
 */
function isPointInBox(
  point: { x: number; y: number },
  boxStart: { x: number; y: number },
  boxEnd: { x: number; y: number }
): boolean {
  const minX = Math.min(boxStart.x, boxEnd.x)
  const maxX = Math.max(boxStart.x, boxEnd.x)
  const minY = Math.min(boxStart.y, boxEnd.y)
  const maxY = Math.max(boxStart.y, boxEnd.y)
  
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
}

/**
 * Check if a bounding sphere might intersect with the selection box (quick rejection)
 */
function sphereMightBeInBox(
  center: { x: number; y: number; z: number },
  radius: number,
  boxStart: { x: number; y: number },
  boxEnd: { x: number; y: number },
  camera: THREE.Camera,
  width: number,
  height: number
): boolean {
  // Project sphere center to screen
  const centerVec = new THREE.Vector3(center.x, center.y, center.z)
  const screenCenter = projectToScreen(centerVec, camera, width, height)
  
  // Estimate screen-space radius (rough approximation)
  // Project a point at the edge of the sphere
  const cameraPos = camera.position
  const distToCamera = centerVec.distanceTo(cameraPos)
  const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
  const screenRadius = (radius / distToCamera) * (height / (2 * Math.tan(fov / 2)))
  
  // Expand box by screen radius for quick rejection
  const minX = Math.min(boxStart.x, boxEnd.x) - screenRadius
  const maxX = Math.max(boxStart.x, boxEnd.x) + screenRadius
  const minY = Math.min(boxStart.y, boxEnd.y) - screenRadius
  const maxY = Math.max(boxStart.y, boxEnd.y) + screenRadius
  
  return screenCenter.x >= minX && screenCenter.x <= maxX && 
         screenCenter.y >= minY && screenCenter.y <= maxY
}

/**
 * Check if any vertex of a surface is inside the selection box
 */
function isSurfaceInBox(
  surface: Surface,
  bounds: SurfaceBounds | undefined,
  boxStart: { x: number; y: number },
  boxEnd: { x: number; y: number },
  camera: THREE.Camera,
  width: number,
  height: number
): boolean {
  if (!surface.geometry) return false
  
  // Quick rejection using bounding sphere
  if (bounds && !sphereMightBeInBox(bounds.center, bounds.radius, boxStart, boxEnd, camera, width, height)) {
    return false
  }
  
  // Detailed check: project vertices and check if any are in box
  const vertices = surface.geometry.vertices
  const sampleRate = Math.max(1, Math.floor(vertices.length / 300)) // Sample up to ~100 vertices for performance
  
  for (let i = 0; i < vertices.length; i += 3 * sampleRate) {
    const vertex = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2])
    const screenPos = projectToScreen(vertex, camera, width, height)
    
    if (isPointInBox(screenPos, boxStart, boxEnd)) {
      return true
    }
  }
  
  return false
}

/**
 * Perform an ID render pass to find visible surfaces in the selection box.
 * Renders all surfaces with unique colors to an offscreen buffer, then reads
 * back pixels in the selection region to determine which surfaces are visible.
 */
function getVisibleSurfacesInBox(
  surfaces: Surface[],
  boxStart: { x: number; y: number },
  boxEnd: { x: number; y: number },
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  width: number,
  height: number
): Set<number> {
  // Create offscreen render target at a lower resolution for performance
  const scale = 0.5 // Render at half resolution
  const renderWidth = Math.floor(width * scale)
  const renderHeight = Math.floor(height * scale)
  
  const renderTarget = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType
  })
  
  // Create a scene for ID rendering
  const idScene = new THREE.Scene()
  idScene.background = new THREE.Color(0, 0, 0)
  
  // Create ID materials for each surface and add meshes to scene
  const idMaterials: THREE.MeshBasicMaterial[] = []
  
  surfaces.forEach((surface, index) => {
    if (!surface.geometry) return
    
    // Create geometry
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(surface.geometry.vertices, 3))
    
    // Create unique color material
    const color = indexToColor(index)
    const material = new THREE.MeshBasicMaterial({ 
      color, 
      side: THREE.DoubleSide 
    })
    idMaterials.push(material)
    
    // Create mesh
    const mesh = new THREE.Mesh(geom, material)
    idScene.add(mesh)
  })
  
  // Render ID pass
  const originalRenderTarget = renderer.getRenderTarget()
  renderer.setRenderTarget(renderTarget)
  renderer.render(idScene, camera)
  
  // Calculate the selection box region in render target coordinates
  const minX = Math.floor(Math.min(boxStart.x, boxEnd.x) * scale)
  const maxX = Math.ceil(Math.max(boxStart.x, boxEnd.x) * scale)
  const minY = Math.floor(Math.min(boxStart.y, boxEnd.y) * scale)
  const maxY = Math.ceil(Math.max(boxStart.y, boxEnd.y) * scale)
  
  // Clamp to render target bounds
  const readX = Math.max(0, minX)
  const readY = Math.max(0, renderHeight - maxY) // Flip Y for WebGL
  const readWidth = Math.min(maxX - minX, renderWidth - readX)
  const readHeight = Math.min(maxY - minY, renderHeight - readY)
  
  if (readWidth <= 0 || readHeight <= 0) {
    // Selection is outside viewport
    renderer.setRenderTarget(originalRenderTarget)
    renderTarget.dispose()
    idMaterials.forEach(m => m.dispose())
    idScene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
      }
    })
    return new Set()
  }
  
  // Read back pixels
  const pixels = new Uint8Array(readWidth * readHeight * 4)
  renderer.readRenderTargetPixels(renderTarget, readX, readY, readWidth, readHeight, pixels)
  
  // Restore original render target
  renderer.setRenderTarget(originalRenderTarget)
  
  // Find unique surface indices from pixel colors
  const visibleIndices = new Set<number>()
  
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    
    // Skip black pixels (background)
    if (r === 0 && g === 0 && b === 0) continue
    
    const index = colorToIndex(r, g, b)
    if (index >= 0 && index < surfaces.length) {
      visibleIndices.add(index)
    }
  }
  
  // Cleanup
  renderTarget.dispose()
  idMaterials.forEach(m => m.dispose())
  idScene.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
    }
  })
  
  return visibleIndices
}

interface UseBoxSelectionOptions {
  viewportRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Custom hook for box selection functionality
 */
export function useBoxSelection({ viewportRef }: UseBoxSelectionOptions) {
  const {
    boxSelectionSettings,
    boxSelectionState,
    startBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    addSurfacesToSelection,
    availableTags,
    tagBounds,
    tagVisibility,
    cameraSettings
  } = useAppStore()
  
  const isBoxSelectingRef = useRef(false)
  const pendingBoxSelectRef = useRef<{ x: number; y: number; mode: 'all' | 'visible' } | null>(null)
  
  /**
   * Get surfaces within the selection box
   */
  const getSurfacesInBox = useCallback((
    boxStart: { x: number; y: number },
    boxEnd: { x: number; y: number },
    mode: 'all' | 'visible'
  ): Surface[] => {
    const refs = getBoxSelectionRefs()
    if (!refs) return []
    
    const { canvas, camera } = refs
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    
    // Filter to only visible surfaces
    const visibleSurfaces = availableTags.filter(s => 
      tagVisibility[s.id] !== false
    )
    
    let selectedInBox: Surface[]
    
    if (mode === 'all') {
      // Select all surfaces with geometry in the box
      selectedInBox = visibleSurfaces.filter(surface => 
        isSurfaceInBox(surface, tagBounds[surface.id], boxStart, boxEnd, camera, width, height)
      )
    } else {
      // 'visible' mode - use ID render pass for true occlusion testing
      const { renderer } = refs
      
      // First, filter to surfaces that are potentially in the box (quick rejection)
      const potentialSurfaces = visibleSurfaces.filter(surface => 
        isSurfaceInBox(surface, tagBounds[surface.id], boxStart, boxEnd, camera, width, height)
      )
      
      if (potentialSurfaces.length === 0) {
        selectedInBox = []
      } else {
        // Perform ID render pass to find actually visible surfaces
        const visibleIndices = getVisibleSurfacesInBox(
          potentialSurfaces,
          boxStart,
          boxEnd,
          renderer,
          camera,
          width,
          height
        )
        
        // Map indices back to surfaces
        selectedInBox = potentialSurfaces.filter((_, index) => visibleIndices.has(index))
      }
    }
    
    // Apply group mode if enabled
    if (cameraSettings.selectionMode === 'group') {
      return expandToGroups(selectedInBox, availableTags)
    }
    
    return selectedInBox
  }, [availableTags, tagBounds, tagVisibility, cameraSettings.selectionMode])
  
  /**
   * Handle pointer down - check for modifier keys and prepare for potential box selection
   * Don't start box selection immediately - wait for drag to distinguish from shift+click on surface
   */
  const handlePointerDown = useCallback((e: PointerEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return
    
    const refs = getBoxSelectionRefs()
    if (!refs) return
    
    const { boxSelectAllModifier, boxSelectVisibleModifier } = boxSelectionSettings
    
    let mode: 'all' | 'visible' | null = null
    
    if (checkModifier(e, boxSelectAllModifier)) {
      mode = 'all'
    } else if (checkModifier(e, boxSelectVisibleModifier)) {
      mode = 'visible'
    }
    
    if (mode) {
      // Store the mode and start position, but don't start box selection yet
      // This allows shift+click on surfaces to work for multi-selection
      // Box selection only starts when the user actually drags
      const canvas = refs.canvas
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // Store pending box selection info (will be used if drag occurs)
      pendingBoxSelectRef.current = { x, y, mode }
    }
  }, [boxSelectionSettings])
  
  /**
   * Handle pointer move - start box selection if dragging with modifier, or update box
   */
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const refs = getBoxSelectionRefs()
    if (!refs) return
    
    const canvas = refs.canvas
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if we have a pending box selection (user pressed shift/ctrl but hasn't dragged yet)
    if (pendingBoxSelectRef.current && !isBoxSelectingRef.current) {
      const { x: startX, y: startY, mode } = pendingBoxSelectRef.current
      
      // Calculate drag distance (use a threshold to distinguish click from drag)
      const dragThreshold = 3 // pixels
      const dx = x - startX
      const dy = y - startY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > dragThreshold) {
        // User is dragging - start box selection now
        e.preventDefault()
        e.stopPropagation()
        
        // Disable camera controls during box selection
        const controls = refs.getControls()
        if (controls) {
          controls.enabled = false
        }
        
        isBoxSelectingRef.current = true
        startBoxSelection(startX, startY, mode)
        pendingBoxSelectRef.current = null
      }
    }
    
    // Update box end position if already box selecting
    if (isBoxSelectingRef.current) {
      updateBoxSelection(x, y)
    }
  }, [startBoxSelection, updateBoxSelection])
  
  /**
   * Handle pointer up - finalize selection or clear pending box select
   */
  const handlePointerUp = useCallback((e: PointerEvent) => {
    // Clear pending box selection if user didn't drag (was just a click)
    if (pendingBoxSelectRef.current) {
      pendingBoxSelectRef.current = null
      // Don't prevent - let the click through to surface handlers for shift+click multi-select
      return
    }
    
    if (!isBoxSelectingRef.current) return
    
    isBoxSelectingRef.current = false
    
    // Re-enable camera controls
    const refs = getBoxSelectionRefs()
    if (refs) {
      const controls = refs.getControls()
      if (controls) {
        controls.enabled = true
      }
    }
    
    const { boxSelectStart, boxSelectEnd, boxSelectMode } = boxSelectionState
    
    if (boxSelectStart && boxSelectEnd && boxSelectMode) {
      // Only select if box has meaningful size (avoid accidental clicks)
      const width = Math.abs(boxSelectEnd.x - boxSelectStart.x)
      const height = Math.abs(boxSelectEnd.y - boxSelectStart.y)
      
      if (width > 5 && height > 5) {
        const surfaces = getSurfacesInBox(boxSelectStart, boxSelectEnd, boxSelectMode)
        if (surfaces.length > 0) {
          addSurfacesToSelection(surfaces)
        }
      }
    }
    
    endBoxSelection()
  }, [boxSelectionState, getSurfacesInBox, addSurfacesToSelection, endBoxSelection])
  
  /**
   * Attach event listeners to viewport container
   */
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    
    // Use capture phase to intercept before Three.js/camera controls
    viewport.addEventListener('pointerdown', handlePointerDown, { capture: true })
    viewport.addEventListener('pointermove', handlePointerMove)
    viewport.addEventListener('pointerup', handlePointerUp)
    
    // Also listen on window for pointer up in case mouse leaves viewport
    window.addEventListener('pointerup', handlePointerUp)
    
    return () => {
      viewport.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      viewport.removeEventListener('pointermove', handlePointerMove)
      viewport.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [viewportRef, handlePointerDown, handlePointerMove, handlePointerUp])
  
  return {
    isBoxSelecting: boxSelectionState.isBoxSelecting
  }
}
