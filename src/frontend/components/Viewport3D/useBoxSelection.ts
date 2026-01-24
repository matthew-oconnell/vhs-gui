import { useCallback, useEffect, useRef } from 'react'
import { useAppStore, BoxSelectionSettings, SurfaceBounds } from '../../store/appStore'
import { Surface } from '../../types/surface'
import * as THREE from 'three'

// Access box selection refs from window (set by Scene component)
function getBoxSelectionRefs(): { canvas: HTMLCanvasElement; camera: THREE.Camera; getControls: () => any } | null {
  return (window as any).boxSelectionRefs || null
}

/**
 * Expand selection to include all surfaces in the same groups (by bcName)
 */
export function expandToGroups(selectedSurfaces: Surface[], allSurfaces: Surface[]): Surface[] {
  // Get all bcNames from selected surfaces
  const selectedBcNames = new Set<string>()
  for (const s of selectedSurfaces) {
    if (s.metadata.bcName) {
      selectedBcNames.add(s.metadata.bcName)
    }
  }
  
  // Include all surfaces with matching bcName, plus ungrouped selected surfaces
  return allSurfaces.filter(s => 
    selectedSurfaces.some(sel => sel.id === s.id) ||
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
    availableSurfaces,
    surfaceBounds,
    surfaceVisibility,
    cameraSettings
  } = useAppStore()
  
  const isBoxSelectingRef = useRef(false)
  
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
    const visibleSurfaces = availableSurfaces.filter(s => 
      surfaceVisibility[s.id] !== false
    )
    
    let selectedInBox: Surface[]
    
    if (mode === 'all') {
      // Select all surfaces with geometry in the box
      selectedInBox = visibleSurfaces.filter(surface => 
        isSurfaceInBox(surface, surfaceBounds[surface.id], boxStart, boxEnd, camera, width, height)
      )
    } else {
      // 'visible' mode - for now, same as 'all' until we implement depth testing
      // TODO: Implement ID render pass for true occlusion testing
      selectedInBox = visibleSurfaces.filter(surface => 
        isSurfaceInBox(surface, surfaceBounds[surface.id], boxStart, boxEnd, camera, width, height)
      )
    }
    
    // Apply group mode if enabled
    if (cameraSettings.selectionMode === 'group') {
      return expandToGroups(selectedInBox, availableSurfaces)
    }
    
    return selectedInBox
  }, [availableSurfaces, surfaceBounds, surfaceVisibility, cameraSettings.selectionMode])
  
  /**
   * Handle pointer down - check for modifier keys and start box selection
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
      e.preventDefault()
      e.stopPropagation()
      
      // Disable camera controls during box selection
      const controls = refs.getControls()
      if (controls) {
        controls.enabled = false
      }
      
      const canvas = refs.canvas
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      isBoxSelectingRef.current = true
      startBoxSelection(x, y, mode)
    }
  }, [boxSelectionSettings, startBoxSelection])
  
  /**
   * Handle pointer move - update box end position
   */
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isBoxSelectingRef.current) return
    
    const refs = getBoxSelectionRefs()
    if (!refs) return
    
    const canvas = refs.canvas
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    updateBoxSelection(x, y)
  }, [updateBoxSelection])
  
  /**
   * Handle pointer up - finalize selection
   */
  const handlePointerUp = useCallback((e: PointerEvent) => {
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
