import { Canvas, useThree } from '@react-three/fiber'
import { TrackballControls, Grid } from '@react-three/drei'
import { Box as BoxIcon, Maximize2, Camera } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { Surface } from '../../types/surface'
import { BoundaryCondition } from '../../types/config'
import { useState, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { CameraControls, CameraToolbar } from './CameraToolbar'
import { RenderingToolbar } from './RenderingToolbar'
import BoundaryConditionDialog from '../BoundaryConditionDialog/BoundaryConditionDialog'
import { ArrowGizmo } from './CylinderGizmo'
import SurfaceAlreadyAssignedDialog from '../SurfaceAlreadyAssignedDialog/SurfaceAlreadyAssignedDialog'
import ConfirmBCDeletionDialog from '../ConfirmBCDeletionDialog/ConfirmBCDeletionDialog'
import SetBCNameDialog from '../SetBCNameDialog/SetBCNameDialog'
import { getColorForSurface } from '../../utils/surfaceColorUtils'
import './Viewport3D.css'

// Sample surfaces with metadata
const sampleSurfaces: Surface[] = [
  {
    id: 'surface-1',
    name: 'Inlet',
    metadata: { id: 'surface-1', tag: 1, tagName: 'inlet' }
  },
  {
    id: 'surface-2',
    name: 'Outlet',
    metadata: { id: 'surface-2', tag: 2, tagName: 'outlet' }
  },
  {
    id: 'surface-3',
    name: 'Wall',
    metadata: { id: 'surface-3', tag: 3, tagName: 'wall' }
  }
]

function ClickableSurface({ 
  surface, 
  onContextMenu,
  isDraggingCamera
}: { 
  surface: Surface
  onContextMenu: (e: any, surface: Surface) => void
  isDraggingCamera: React.MutableRefObject<boolean>
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)
  // Track right-click position and time to differentiate click from drag
  const rightClickStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  
  const { selectedSurface, setSelectedSurface, selectedSurfaces, toggleSurfaceSelection, clearSurfaceSelection, selectedBC, soloBC, surfaceVisibility, surfaceRenderSettings, globalRenderSettings, configData, rootSolverKey, cameraSettings } = useAppStore()
  const [hovered, setHovered] = useState(false)
  
  // Check if this surface is in the multi-selection
  const isSelected = selectedSurfaces.some(s => s.id === surface.id)
  
  // Get boundary conditions for color logic
  const rootKey = rootSolverKey || 'HyperSolve'
  const boundaryConditions = (configData as any)[rootKey]?.['boundary conditions'] || []
  
  // Get render settings with defaults
  const settings = surfaceRenderSettings[surface.id] ?? {
    surfaceColor: '#4a9eff',
    meshColor: '#ffffff',
    renderMode: 'surface' as const,
    opacity: 1
  }
  
  // Create geometry from Float32Array if available (already centered and scaled globally)
  const geometry = useMemo(() => {
    if (!surface.geometry) return null
    
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(surface.geometry.vertices, 3))
    geom.setAttribute('normal', new THREE.BufferAttribute(surface.geometry.normals, 3))
    
    console.log('[Viewport3D] Created BufferGeometry for', surface.name, ':', surface.geometry.vertices.length / 3, 'vertices')
    return geom
  }, [surface.geometry, surface.name])
  
  // Check if this surface belongs to the selected BC
  const belongsToSelectedBC = selectedBC ? (() => {
    const tags = selectedBC['mesh boundary tags']
    const surfaceTag = surface.metadata.tag
    
    if (Array.isArray(tags)) {
      return (tags as any[]).includes(surfaceTag) || (tags as any[]).includes(String(surfaceTag))
    } else if (typeof tags === 'number') {
      return tags === surfaceTag
    } else if (typeof tags === 'string') {
      return tags.split(',').map(s => parseInt(s.trim(), 10)).includes(surfaceTag)
    }
    return false
  })() : false
  
  // Check if this surface belongs to the soloed BC
  const belongsToSoloBC = soloBC ? (() => {
    const tags = soloBC['mesh boundary tags']
    const surfaceTag = surface.metadata.tag
    
    if (Array.isArray(tags)) {
      return (tags as any[]).includes(surfaceTag) || (tags as any[]).includes(String(surfaceTag))
    } else if (typeof tags === 'number') {
      return tags === surfaceTag
    } else if (typeof tags === 'string') {
      return tags.split(',').map(s => parseInt(s.trim(), 10)).includes(surfaceTag)
    }
    return false
  })() : true // Show all surfaces if no BC is soloed
  
  // Check visibility from store (surfaceVisibility is updated by toggleHideAssignedSurfaces)
  const isVisible = surfaceVisibility[surface.id] ?? true
  
  // Don't render if surface is hidden
  if (!isVisible) {
    return null
  }
  
  // Don't render if BC is soloed and this surface doesn't belong to it
  if (soloBC && !belongsToSoloBC) {
    return null
  }
  
  const handleClick = (e: any) => {
    e.stopPropagation()
    
    // Check if modifier key is pressed for multi-selection
    const modifierKey = cameraSettings.multiSelectModifier
    const isModifierPressed = 
      (modifierKey === 'shift' && e.shiftKey) ||
      (modifierKey === 'ctrl' && (e.ctrlKey || e.metaKey)) ||
      (modifierKey === 'alt' && e.altKey)
    
    // Get selection mode from store
    const selectionMode = cameraSettings.selectionMode || 'face'
    
    if (selectionMode === 'group' && surface.metadata.bcName) {
      // Group selection mode: select all surfaces with same bc_name
      const { availableSurfaces } = useAppStore.getState()
      const groupSurfaces = availableSurfaces.filter(
        s => s.metadata.bcName === surface.metadata.bcName
      )
      
      if (isModifierPressed) {
        // Toggle entire group in/out of selection
        const allSelected = groupSurfaces.every(gs => 
          selectedSurfaces.some(s => s.id === gs.id)
        )
        
        if (allSelected) {
          // Remove all group surfaces from selection
          groupSurfaces.forEach(gs => {
            const isInSelection = selectedSurfaces.some(s => s.id === gs.id)
            if (isInSelection) {
              toggleSurfaceSelection(gs)
            }
          })
        } else {
          // Add all group surfaces to selection
          groupSurfaces.forEach(gs => {
            const isInSelection = selectedSurfaces.some(s => s.id === gs.id)
            if (!isInSelection) {
              toggleSurfaceSelection(gs)
            }
          })
        }
      } else {
        // Replace selection with entire group
        clearSurfaceSelection()
        groupSurfaces.forEach(gs => toggleSurfaceSelection(gs))
      }
    } else {
      // Face selection mode (or ungrouped surface)
      if (isModifierPressed) {
        // Multi-select mode: toggle this surface in/out of selection
        toggleSurfaceSelection(surface)
      } else {
        // Normal mode: select only this surface (clears others)
        setSelectedSurface(surface)
      }
    }
  }
  
  const handlePointerDown = (e: any) => {
    // Track right-click start position and time
    if (e.button === 2) {
      const clientX = e.clientX ?? e.nativeEvent?.clientX ?? 0
      const clientY = e.clientY ?? e.nativeEvent?.clientY ?? 0
      console.log('Right pointer down on surface:', surface.metadata.tagName, 'at', clientX, clientY)
      rightClickStartRef.current = { x: clientX, y: clientY, time: Date.now() }
    }
  }
  
  const handlePointerUp = (e: any) => {
    // Only handle right mouse button
    if (e.button !== 2) return
    
    e.stopPropagation()
    
    const clientX = e.clientX ?? e.nativeEvent?.clientX ?? 0
    const clientY = e.clientY ?? e.nativeEvent?.clientY ?? 0
    
    console.log('Right pointer up on surface:', surface.metadata.tagName, 
                'isDraggingCamera:', isDraggingCamera.current,
                'at', clientX, clientY)
    
    // Don't show menu if we were dragging the camera
    if (isDraggingCamera.current) {
      console.log('Blocking context menu - camera was being dragged')
      rightClickStartRef.current = null
      return
    }
    
    // Check if mouse moved significantly from click start (drag threshold = 5px)
    if (rightClickStartRef.current) {
      const dx = clientX - rightClickStartRef.current.x
      const dy = clientY - rightClickStartRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const duration = Date.now() - rightClickStartRef.current.time
      
      console.log('Distance moved:', distance, 'Duration:', duration + 'ms')
      
      if (distance < 5 && duration < 400) {
        // It was a quick click, not a drag - show context menu
        console.log('Calling onContextMenu')
        onContextMenu(e, surface)
      } else {
        console.log('NOT calling onContextMenu - distance:', distance, 'or duration:', duration, 'too large')
      }
      
      rightClickStartRef.current = null
    } else {
      console.log('NO rightClickStartRef - not showing menu')
    }
  }
  
  const handleContextMenu = (e: any) => {
    // Just prevent the browser's native context menu
    e.stopPropagation()
  }
  
  // Get base color from color mode
  const baseColor = getColorForSurface(
    surface,
    globalRenderSettings.colorMode,
    globalRenderSettings,
    boundaryConditions
  )
  
  // Determine display color (selection/hover overrides base color)
  const displayColor = isSelected ? '#ffd700' : hovered ? '#ffffff' : baseColor
  const emissive = isSelected ? '#aa8800' : hovered ? '#444444' : '#000000'
  const emissiveIntensity = isSelected ? 0.5 : hovered ? 0.2 : 0
  
  // If we have geometry from mesh, use it
  if (geometry) {
    const showSurface = settings.renderMode === 'surface' || settings.renderMode === 'both'
    const showMesh = settings.renderMode === 'mesh' || settings.renderMode === 'both'
    
    return (
      <group>
        {/* Surface mesh */}
        {showSurface && (
          <mesh
            ref={meshRef}
            geometry={geometry}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onContextMenu={handleContextMenu}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
            <meshStandardMaterial 
              color={displayColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              side={THREE.DoubleSide}
              flatShading={true}
              transparent={settings.opacity < 1}
              opacity={settings.opacity}
            />
          </mesh>
        )}
        
        {/* Mesh edges */}
        {showMesh && (
          <lineSegments
            ref={edgesRef}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onContextMenu={handleContextMenu}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
            <edgesGeometry args={[geometry]} />
            <lineBasicMaterial color={settings.meshColor} />
          </lineSegments>
        )}
      </group>
    )
  }
  
  // Otherwise use sample box geometry
  const position: [number, number, number] = surface.id === 'surface-1' ? [0, 0.5, 0] : 
                                              surface.id === 'surface-2' ? [2, 0.5, 0] : 
                                              [-2, 0.25, 0]
  
  const size: [number, number, number] = surface.id === 'surface-1' ? [2, 1, 1] : 
                                          surface.id === 'surface-2' ? [1, 1, 1] : 
                                          [1.5, 0.5, 1.5]
  
  const showSurface = settings.renderMode === 'surface' || settings.renderMode === 'both'
  const showMesh = settings.renderMode === 'mesh' || settings.renderMode === 'both'
  
  return (
    <group position={position}>
      {/* Surface mesh */}
      {showSurface && (
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onContextMenu={handleContextMenu}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={size} />
          <meshStandardMaterial 
            color={displayColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            transparent={settings.opacity < 1}
            opacity={settings.opacity}
          />
        </mesh>
      )}
      
      {/* Mesh edges */}
      {showMesh && (
        <lineSegments
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onContextMenu={handleContextMenu}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
          <lineBasicMaterial color={settings.meshColor} />
        </lineSegments>
      )}
    </group>
  )
}

function InitializationRegionCylinder({ region, isSelected, regionIndex, controlsRef }: { region: any; isSelected: boolean; regionIndex: number; controlsRef: React.RefObject<any> }) {
  const { configData, setConfigData, rootSolverKey } = useAppStore()
  const { gl, raycaster, camera } = useThree()
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null)
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null)
  const dragStartMouse = useRef<THREE.Vector3 | null>(null)
  const dragStartA = useRef<[number, number, number] | null>(null)
  const dragStartB = useRef<[number, number, number] | null>(null)
  const dragStartRadius = useRef<number | null>(null)
  const dragStartRadiusA = useRef<number | null>(null)
  const dragStartRadiusB = useRef<number | null>(null)
  
  const a = region.a || [0, 0, 0]
  const b = region.b || [1, 0, 0]
  const radius = region.radius || 0.5
  const radiusA = region.radiusA ?? radius
  const radiusB = region.radiusB ?? radius
  
  // Compute cylinder axis and perpendicular directions for gizmos
  const { axisDir, perp1, perp2 } = useMemo(() => {
    const start = new THREE.Vector3(a[0], a[1], a[2])
    const end = new THREE.Vector3(b[0], b[1], b[2])
    const axis = new THREE.Vector3().subVectors(end, start)
    const length = axis.length()
    axis.normalize()
    
    // Create two perpendicular vectors
    const perpendicular1 = new THREE.Vector3()
    if (Math.abs(axis.x) < 0.9) {
      perpendicular1.set(1, 0, 0)
    } else {
      perpendicular1.set(0, 1, 0)
    }
    perpendicular1.crossVectors(perpendicular1, axis).normalize()
    
    const perpendicular2 = new THREE.Vector3().crossVectors(axis, perpendicular1).normalize()
    
    return {
      axisDir: axis,
      perp1: perpendicular1,
      perp2: perpendicular2
    }
  }, [a, b])
  
  // Fixed world-space gizmo size (independent of camera and cylinder size)
  const gizmoScale = 0.5
  
  // Compute cylinder dimensions for widget scaling
  const cylinderSize = useMemo(() => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const dz = b[2] - a[2]
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const maxDim = Math.max(length, radius * 2)
    const widgetRadius = Math.max(0.0167, Math.min(0.167, maxDim * 0.0167))
    return { length, widgetRadius }
  }, [a, b, radius])
  
  // Create cylinder geometry
  const { cylinderGeometry, position, quaternion } = useMemo(() => {
    const start = new THREE.Vector3(a[0], a[1], a[2])
    const end = new THREE.Vector3(b[0], b[1], b[2])
    const direction = new THREE.Vector3().subVectors(end, start)
    const length = direction.length()
    
    const pos = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    
    const axis = new THREE.Vector3(0, 1, 0)
    direction.normalize()
    const quat = new THREE.Quaternion().setFromUnitVectors(axis, direction)
    
    const geom = new THREE.CylinderGeometry(radiusB, radiusA, length, 16, 1, false)
    
    return { cylinderGeometry: geom, position: pos, quaternion: quat }
  }, [a, b, radiusA, radiusB])
  
  // Global pointer move handler
  useEffect(() => {
    if (!draggingPoint || !dragStartMouse.current) return
    
    const handleGlobalPointerMove = (event: PointerEvent) => {
      event.stopPropagation()
      event.preventDefault()
      
      if (!dragStartMouse.current || !dragStartA.current || !dragStartB.current) return
      
      const canvas = gl.domElement
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      const mouse = new THREE.Vector2(x, y)
      raycaster.setFromCamera(mouse, camera)
      
      let updates: any = {}
      
      // Sensitivity multiplier to slow down gizmo movements
      const gizmoSensitivity = 0.3
      
      // Handle gizmo arrow drags
      if (draggingPoint.startsWith('axis-') || draggingPoint.startsWith('radius-')) {
        const startPoint = draggingPoint.includes('-a') ? dragStartA.current : dragStartB.current
        const pointWorldPos = new THREE.Vector3(startPoint[0], startPoint[1], startPoint[2])
        
        if (draggingPoint.startsWith('axis-')) {
          // Orange arrow: constrain movement along cylinder axis
          const cameraDir = new THREE.Vector3()
          camera.getWorldDirection(cameraDir)
          const plane = new THREE.Plane()
          plane.setFromNormalAndCoplanarPoint(cameraDir, pointWorldPos)
          
          const intersection = new THREE.Vector3()
          raycaster.ray.intersectPlane(plane, intersection)
          
          if (intersection) {
            const movement = new THREE.Vector3().subVectors(intersection, dragStartMouse.current)
            const axisMovement = movement.dot(axisDir) * gizmoSensitivity
            
            const newPoint: [number, number, number] = [
              startPoint[0] + axisDir.x * axisMovement,
              startPoint[1] + axisDir.y * axisMovement,
              startPoint[2] + axisDir.z * axisMovement
            ]
            
            updates[draggingPoint.includes('-a') ? 'a' : 'b'] = newPoint
          }
        } else if (draggingPoint.startsWith('radius-uniform')) {
          // Blue arrow: change uniform radius
          const plane = new THREE.Plane()
          plane.setFromNormalAndCoplanarPoint(axisDir, pointWorldPos)
          
          const intersection = new THREE.Vector3()
          raycaster.ray.intersectPlane(plane, intersection)
          
          if (intersection) {
            const offset = new THREE.Vector3().subVectors(intersection, dragStartMouse.current)
            const radialChange = offset.dot(perp2) * gizmoSensitivity
            
            // Scale both radii by adding the same delta to each
            const newRadiusA = Math.max(0.01, (dragStartRadiusA.current || radiusA) + radialChange)
            const newRadiusB = Math.max(0.01, (dragStartRadiusB.current || radiusB) + radialChange)
            const newRadius = Math.max(0.01, (dragStartRadius.current || radius) + radialChange)
            
            updates.radius = newRadius
            updates.radiusA = newRadiusA
            updates.radiusB = newRadiusB
          }
        } else if (draggingPoint === 'radius-a' || draggingPoint === 'radius-b') {
          // Green/Red arrow: change per-endpoint radius
          const plane = new THREE.Plane()
          plane.setFromNormalAndCoplanarPoint(axisDir, pointWorldPos)
          
          const intersection = new THREE.Vector3()
          raycaster.ray.intersectPlane(plane, intersection)
          
          if (intersection) {
            const offset = new THREE.Vector3().subVectors(intersection, dragStartMouse.current)
            const radialChange = offset.dot(perp1) * gizmoSensitivity
            const startRadius = draggingPoint === 'radius-a' ? 
              (dragStartRadiusA.current || radiusA) : 
              (dragStartRadiusB.current || radiusB)
            const newRadius = Math.max(0.01, startRadius + radialChange)
            
            updates[draggingPoint === 'radius-a' ? 'radiusA' : 'radiusB'] = newRadius
          }
        }
      } else {
        // Handle sphere widget drags (original logic)
        const pointWorldPos = new THREE.Vector3(
          dragStartA.current[0],
          dragStartA.current[1],
          dragStartA.current[2]
        )
        
        const cameraDir = new THREE.Vector3()
        camera.getWorldDirection(cameraDir)
        
        const plane = new THREE.Plane()
        plane.setFromNormalAndCoplanarPoint(cameraDir, pointWorldPos)
        
        const intersection = new THREE.Vector3()
        raycaster.ray.intersectPlane(plane, intersection)
        
        if (intersection) {
          const movement = new THREE.Vector3()
          movement.subVectors(intersection, dragStartMouse.current)
          
          const startPoint = draggingPoint === 'a' ? dragStartA.current : dragStartB.current
          const newPoint: [number, number, number] = [
            startPoint[0] + movement.x,
            startPoint[1] + movement.y,
            startPoint[2] + movement.z
          ]
          
          updates[draggingPoint] = newPoint
        }
      }
      
      // Apply updates
      const rootKey = rootSolverKey || 'HyperSolve'
      const rootConfig = (configData as any)[rootKey]
      if (Object.keys(updates).length > 0 && rootConfig?.['initialization regions']) {
        const updatedRegions = [...rootConfig['initialization regions']]
        updatedRegions[regionIndex] = {
          ...region,
          ...updates
        }
        const updatedConfig = {
          ...configData,
          [rootKey]: {
            ...rootConfig,
            'initialization regions': updatedRegions
          }
        }
        setConfigData(updatedConfig)
      }
    }
    
    const handleGlobalPointerUp = () => {
      setDraggingPoint(null)
      dragStartMouse.current = null
      dragStartA.current = null
      dragStartB.current = null
      dragStartRadius.current = null
      dragStartRadiusA.current = null
      dragStartRadiusB.current = null
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
    }
    
    window.addEventListener('pointermove', handleGlobalPointerMove)
    window.addEventListener('pointerup', handleGlobalPointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove)
      window.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  }, [draggingPoint, camera, raycaster, gl, configData, setConfigData, region, regionIndex, controlsRef, axisDir, perp1, perp2, radius, radiusA, radiusB, a, b])
  
  const handlePointerDownA = (event: any) => {
    event.stopPropagation()
    
    const intersectionPoint = event.point as THREE.Vector3
    dragStartMouse.current = intersectionPoint.clone()
    dragStartA.current = [...a] as [number, number, number]
    dragStartB.current = [...b] as [number, number, number]
    
    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }
    setDraggingPoint('a')
  }
  
  const handlePointerDownB = (event: any) => {
    event.stopPropagation()
    
    const intersectionPoint = event.point as THREE.Vector3
    dragStartMouse.current = intersectionPoint.clone()
    dragStartA.current = [...a] as [number, number, number]
    dragStartB.current = [...b] as [number, number, number]
    
    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }
    setDraggingPoint('b')
  }
  
  const handleGizmoPointerDown = (event: any, gizmoType: string) => {
    event.stopPropagation()
    
    const intersectionPoint = event.point as THREE.Vector3
    dragStartMouse.current = intersectionPoint.clone()
    dragStartA.current = [...a] as [number, number, number]
    dragStartB.current = [...b] as [number, number, number]
    dragStartRadius.current = radius
    dragStartRadiusA.current = radiusA
    dragStartRadiusB.current = radiusB
    
    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }
    setDraggingPoint(gizmoType)
  }
  
  return (
    <group>
      <mesh position={position} quaternion={quaternion} geometry={cylinderGeometry}>
        <meshStandardMaterial 
          color={isSelected ? 0x00ff00 : 0x00aaff}
          wireframe={!isSelected}
          transparent
          opacity={isSelected ? 0.3 : 0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {isSelected && (
        <mesh
          position={[a[0], a[1], a[2]]}
          onPointerDown={handlePointerDownA}
          onPointerEnter={() => setHoveredPoint('a')}
          onPointerLeave={() => setHoveredPoint(null)}
        >
          <sphereGeometry args={[cylinderSize.widgetRadius, 16, 16]} />
          <meshStandardMaterial 
            color={hoveredPoint === 'a' || draggingPoint === 'a' ? '#ffff00' : '#ff0000'}
            emissive={hoveredPoint === 'a' || draggingPoint === 'a' ? '#ffff00' : '#ff0000'}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {isSelected && (
        <mesh
          position={[b[0], b[1], b[2]]}
          onPointerDown={handlePointerDownB}
          onPointerEnter={() => setHoveredPoint('b')}
          onPointerLeave={() => setHoveredPoint(null)}
        >
          <sphereGeometry args={[cylinderSize.widgetRadius, 16, 16]} />
          <meshStandardMaterial 
            color={hoveredPoint === 'b' || draggingPoint === 'b' ? '#ffff00' : '#00ff00'}
            emissive={hoveredPoint === 'b' || draggingPoint === 'b' ? '#ffff00' : '#00ff00'}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {/* Gizmo arrows for point A */}
      {isSelected && (
        <>
          <ArrowGizmo
            position={[a[0], a[1], a[2]]}
            direction={axisDir}
            color="#ff8800"
            scale={gizmoScale}
            isHovered={hoveredPoint === 'axis-a'}
            isDragging={draggingPoint === 'axis-a'}
            onPointerDown={(e: any) => handleGizmoPointerDown(e, 'axis-a')}
            onPointerEnter={() => setHoveredPoint('axis-a')}
            onPointerLeave={() => setHoveredPoint(null)}
          />
          <ArrowGizmo
            position={[a[0], a[1], a[2]]}
            direction={perp2}
            color="#0088ff"
            scale={gizmoScale}
            isHovered={hoveredPoint === 'radius-uniform-a'}
            isDragging={draggingPoint === 'radius-uniform-a'}
            onPointerDown={(e: any) => handleGizmoPointerDown(e, 'radius-uniform-a')}
            onPointerEnter={() => setHoveredPoint('radius-uniform-a')}
            onPointerLeave={() => setHoveredPoint(null)}
          />
          <ArrowGizmo
            position={[a[0], a[1], a[2]]}
            direction={perp1}
            color="#ff0000"
            scale={gizmoScale}
            isHovered={hoveredPoint === 'radius-a'}
            isDragging={draggingPoint === 'radius-a'}
            onPointerDown={(e: any) => handleGizmoPointerDown(e, 'radius-a')}
            onPointerEnter={() => setHoveredPoint('radius-a')}
            onPointerLeave={() => setHoveredPoint(null)}
          />
        </>
      )}
      
      {/* Gizmo arrows for point B */}
      {isSelected && (
        <>
          <ArrowGizmo
            position={[b[0], b[1], b[2]]}
            direction={axisDir}
            color="#ff8800"
            scale={gizmoScale}
            isHovered={hoveredPoint === 'axis-b'}
            isDragging={draggingPoint === 'axis-b'}
            onPointerDown={(e: any) => handleGizmoPointerDown(e, 'axis-b')}
            onPointerEnter={() => setHoveredPoint('axis-b')}
            onPointerLeave={() => setHoveredPoint(null)}
          />
          <ArrowGizmo
            position={[b[0], b[1], b[2]]}
            direction={perp2}
            color="#0088ff"
            scale={gizmoScale}
            isHovered={hoveredPoint === 'radius-uniform-b'}
            isDragging={draggingPoint === 'radius-uniform-b'}
            onPointerDown={(e: any) => handleGizmoPointerDown(e, 'radius-uniform-b')}
            onPointerEnter={() => setHoveredPoint('radius-uniform-b')}
            onPointerLeave={() => setHoveredPoint(null)}
          />
          <ArrowGizmo
            position={[b[0], b[1], b[2]]}
            direction={perp1}
            color="#00ff00"
            scale={gizmoScale}
            isHovered={hoveredPoint === 'radius-b'}
            isDragging={draggingPoint === 'radius-b'}
            onPointerDown={(e: any) => handleGizmoPointerDown(e, 'radius-b')}
            onPointerEnter={() => setHoveredPoint('radius-b')}
            onPointerLeave={() => setHoveredPoint(null)}
          />
        </>
      )}
    </group>
  )
}

function VisualizationPlane({ viz, isSelected, vizIndex, controlsRef }: { viz: any; isSelected: boolean; vizIndex: number; controlsRef: React.RefObject<any> }) {
  const planeRef = useRef<THREE.Mesh>(null)
  const arrowRef = useRef<THREE.Group>(null)
  const { configData, setConfigData } = useAppStore()
  const { gl, raycaster, camera } = useThree()
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const dragStartPoint = useRef<THREE.Vector3 | null>(null)
  const dragStartCenter = useRef<[number, number, number] | null>(null)
  
  // Get center and normal from viz data
  const center = viz.center || [0, 0, 0]
  const normal = viz.normal || [1, 0, 0]
  
  // Normalize the normal vector
  const normalVec = useMemo(() => {
    const vec = new THREE.Vector3(normal[0], normal[1], normal[2])
    vec.normalize()
    return vec
  }, [normal])
  
  // Global pointer move handler
  useEffect(() => {
    if (!isDragging || !isSelected || !dragStartPoint.current || !dragStartCenter.current) return
    
    const handleGlobalPointerMove = (event: PointerEvent) => {
      event.stopPropagation()
      event.preventDefault()
      
      if (!dragStartPoint.current || !dragStartCenter.current) return
      
      // Convert screen coordinates to normalized device coordinates
      const canvas = gl.domElement
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Update raycaster
      const mouse = new THREE.Vector2(x, y)
      raycaster.setFromCamera(mouse, camera)
      
      // Create a plane perpendicular to the view direction at the arrow position
      const arrowWorldPos = new THREE.Vector3(
        dragStartCenter.current[0],
        dragStartCenter.current[1],
        dragStartCenter.current[2]
      )
      
      // Get camera direction
      const cameraDir = new THREE.Vector3()
      camera.getWorldDirection(cameraDir)
      
      // Create plane for raycasting
      const plane = new THREE.Plane()
      plane.setFromNormalAndCoplanarPoint(cameraDir, arrowWorldPos)
      
      // Raycast to the plane
      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, intersection)
      
      if (intersection) {
        // Calculate the movement from the initial drag point
        const movement = new THREE.Vector3()
        movement.subVectors(intersection, dragStartPoint.current)
        
        // Project movement onto the normal direction
        const distance = movement.dot(normalVec)
        
        // Update center position based on initial center plus movement along normal
        const newCenter: [number, number, number] = [
          dragStartCenter.current[0] + normalVec.x * distance,
          dragStartCenter.current[1] + normalVec.y * distance,
          dragStartCenter.current[2] + normalVec.z * distance
        ]
        
        // Update config data
        if (configData.visualization) {
          const updatedViz = [...configData.visualization]
          updatedViz[vizIndex] = {
            ...viz,
            center: newCenter
          }
          setConfigData({
            ...configData,
            visualization: updatedViz
          })
        }
      }
    }
    
    const handleGlobalPointerUp = () => {
      setIsDragging(false)
      dragStartPoint.current = null
      dragStartCenter.current = null
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
    }
    
    window.addEventListener('pointermove', handleGlobalPointerMove)
    window.addEventListener('pointerup', handleGlobalPointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove)
      window.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  }, [isDragging, isSelected, dragStartPoint.current, dragStartCenter.current, normalVec, configData, vizIndex, viz, setConfigData, controlsRef, gl, raycaster, camera])
  
  // Ensure controls are re-enabled when component unmounts or dragging stops
  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
    }
  }, [controlsRef])
  
  // Re-enable controls if we stop being selected while dragging
  useEffect(() => {
    if (!isSelected && isDragging) {
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
      setIsDragging(false)
      dragStartPoint.current = null
      dragStartCenter.current = null
    }
  }, [isSelected, isDragging, controlsRef])
  
  // Create rotation to align plane with normal
  const rotation = useMemo(() => {
    const defaultNormal = new THREE.Vector3(0, 0, 1) // PlaneGeometry default normal
    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(defaultNormal, normalVec)
    const euler = new THREE.Euler()
    euler.setFromQuaternion(quaternion)
    return [euler.x, euler.y, euler.z] as [number, number, number]
  }, [normalVec])
  
  // Arrow rotation (point along normal)
  const arrowRotation = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0) // Arrow points up by default
    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(defaultDir, normalVec)
    const euler = new THREE.Euler()
    euler.setFromQuaternion(quaternion)
    return [euler.x, euler.y, euler.z] as [number, number, number]
  }, [normalVec])
  
  // Use a large plane size to appear "infinite"
  const planeSize = 100
  
  // Drag handler for the arrow widget
  const handlePointerDown = (e: any) => {
    if (!isSelected) return
    e.stopPropagation()
    // Store the initial drag point and center
    dragStartPoint.current = e.point.clone()
    dragStartCenter.current = [center[0], center[1], center[2]]
    // Disable camera controls while dragging
    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }
    setIsDragging(true)
  }
  
  return (
    <group>
      <mesh
        ref={planeRef}
        position={[center[0], center[1], center[2]]}
        rotation={rotation}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshStandardMaterial 
          color={isSelected ? '#00ff00' : '#4a9eff'}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          emissive={isSelected ? '#00ff00' : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>
      
      {/* Draggable arrow widget - only show when selected */}
      {isSelected && (
        <group
          ref={arrowRef}
          position={[center[0], center[1], center[2]]}
          rotation={arrowRotation}
          onPointerDown={handlePointerDown}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {/* Arrow shaft */}
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 4]} />
            <meshStandardMaterial color={hovered || isDragging ? '#ffff00' : '#ff8800'} />
          </mesh>
          
          {/* Arrow head */}
          <mesh position={[0, 4.5, 0]}>
            <coneGeometry args={[0.3, 1, 16]} />
            <meshStandardMaterial color={hovered || isDragging ? '#ffff00' : '#ff8800'} />
          </mesh>
          
          {/* Arrow tail (opposite direction) */}
          <mesh position={[0, -2, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 4]} />
            <meshStandardMaterial color={hovered || isDragging ? '#ffff00' : '#ff8800'} />
          </mesh>
          
          <mesh position={[0, -4.5, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.3, 1, 16]} />
            <meshStandardMaterial color={hovered || isDragging ? '#ffff00' : '#ff8800'} />
          </mesh>
        </group>
      )}
    </group>
  )
}

function VisualizationLine({ viz, isSelected, vizIndex, controlsRef }: { viz: any; isSelected: boolean; vizIndex: number; controlsRef: React.RefObject<any> }) {
  const { configData, setConfigData } = useAppStore()
  const { gl, raycaster, camera } = useThree()
  const [draggingPoint, setDraggingPoint] = useState<'a' | 'b' | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<'a' | 'b' | null>(null)
  
  const a = viz.a || [0, 0, 0]
  const b = viz.b || [1, 0, 0]
  
  // Global pointer handlers for dragging
  useEffect(() => {
    if (!draggingPoint || !isSelected) return
    
    const handleGlobalPointerMove = (event: PointerEvent) => {
      event.stopPropagation()
      event.preventDefault()
      
      // Convert screen coordinates to normalized device coordinates
      const canvas = gl.domElement
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Update raycaster
      const mouse = new THREE.Vector2(x, y)
      raycaster.setFromCamera(mouse, camera)
      
      // Create a plane perpendicular to the view direction at the point position
      const pointWorldPos = new THREE.Vector3(
        draggingPoint === 'a' ? a[0] : b[0],
        draggingPoint === 'a' ? a[1] : b[1],
        draggingPoint === 'a' ? a[2] : b[2]
      )
      
      // Get camera direction
      const cameraDir = new THREE.Vector3()
      camera.getWorldDirection(cameraDir)
      
      // Create plane for raycasting
      const plane = new THREE.Plane()
      plane.setFromNormalAndCoplanarPoint(cameraDir, pointWorldPos)
      
      // Raycast to the plane
      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, intersection)
      
      if (intersection) {
        const newPoint: [number, number, number] = [intersection.x, intersection.y, intersection.z]
        
        if (configData.visualization) {
          const updatedViz = [...configData.visualization]
          updatedViz[vizIndex] = {
            ...viz,
            [draggingPoint]: newPoint
          }
          setConfigData({
            ...configData,
            visualization: updatedViz
          })
        }
      }
    }
    
    const handleGlobalPointerUp = () => {
      setDraggingPoint(null)
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
    }
    
    window.addEventListener('pointermove', handleGlobalPointerMove)
    window.addEventListener('pointerup', handleGlobalPointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove)
      window.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  }, [draggingPoint, isSelected, a, b, configData, vizIndex, viz, setConfigData, controlsRef, gl, raycaster, camera])
  
  // Ensure controls are re-enabled when component unmounts or dragging stops
  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
    }
  }, [controlsRef])
  
  // Re-enable controls if we stop being selected while dragging
  useEffect(() => {
    if (!isSelected && draggingPoint !== null) {
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
      setDraggingPoint(null)
    }
  }, [isSelected, draggingPoint, controlsRef])
  
  // Create line geometry from points
  const points = useMemo(() => {
    return [
      new THREE.Vector3(a[0], a[1], a[2]),
      new THREE.Vector3(b[0], b[1], b[2])
    ]
  }, [a, b])
  
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points)
    return geom
  }, [points])
  
  // Handlers for point A
  const handlePointerDownA = (e: any) => {
    if (!isSelected) return
    e.stopPropagation()
    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }
    setDraggingPoint('a')
  }
  
  // Handlers for point B
  const handlePointerDownB = (e: any) => {
    if (!isSelected) return
    e.stopPropagation()
    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }
    setDraggingPoint('b')
  }
  
  return (
    <group>
      {/* Line */}
      <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
        color: isSelected ? 0x00ff00 : 0xffff00,
        linewidth: isSelected ? 3 : 2 
      }))} />
      
      {/* Draggable sphere at point A - only show when selected */}
      {isSelected && (
        <mesh
          position={[a[0], a[1], a[2]]}
          onPointerDown={handlePointerDownA}
          onPointerEnter={() => setHoveredPoint('a')}
          onPointerLeave={() => setHoveredPoint(null)}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial 
            color={hoveredPoint === 'a' || draggingPoint === 'a' ? '#ffff00' : '#ff0000'}
            emissive={hoveredPoint === 'a' || draggingPoint === 'a' ? '#ffff00' : '#ff0000'}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {/* Draggable sphere at point B - only show when selected */}
      {isSelected && (
        <mesh
          position={[b[0], b[1], b[2]]}
          onPointerDown={handlePointerDownB}
          onPointerEnter={() => setHoveredPoint('b')}
          onPointerLeave={() => setHoveredPoint(null)}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial 
            color={hoveredPoint === 'b' || draggingPoint === 'b' ? '#ffff00' : '#00ff00'}
            emissive={hoveredPoint === 'b' || draggingPoint === 'b' ? '#ffff00' : '#00ff00'}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  )
}

function Scene({ onSurfaceContextMenu }: { onSurfaceContextMenu: (e: any, surface: Surface) => void }) {
  const { scene, gl } = useThree()
  const { availableSurfaces, cameraSettings, selectedViz, selectedInitRegion, configData, rootSolverKey, clearSurfaceSelection } = useAppStore()
  const controlsRef = useRef<any>(null)
  const isDraggingCamera = useRef(false)
  
  // Set background color
  useEffect(() => {
    scene.background = new THREE.Color(0x1a1a1a)
  }, [scene])
  
  // Track camera dragging to prevent context menu during drag
  useEffect(() => {
    const canvas = gl.domElement
    
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 2) {
        console.log('[Scene] Right pointer down - resetting isDraggingCamera to false')
        isDraggingCamera.current = false // Not dragging yet
      }
    }
    
    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons === 2) {
        if (!isDraggingCamera.current) {
          console.log('[Scene] Right button move detected - setting isDraggingCamera to TRUE')
        }
        isDraggingCamera.current = true // Now we're dragging
      }
    }
    
    const handlePointerUp = (e: PointerEvent) => {
      if (e.button === 2) {
        console.log('[Scene] Right pointer up - isDraggingCamera is:', isDraggingCamera.current, '- will reset in 100ms')
        setTimeout(() => {
          console.log('[Scene] Resetting isDraggingCamera to false after delay')
          isDraggingCamera.current = false
        }, 100) // Small delay to let context menu check the flag
      }
    }
    
    const preventMenu = (e: MouseEvent) => {
      console.log('[Scene] Browser contextmenu event - preventing')
      e.preventDefault() // Always prevent native browser menu
    }
    
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('contextmenu', preventMenu, true)
    
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('contextmenu', preventMenu, true)
    }
  }, [gl])
  
  console.log('[Viewport3D] Rendering scene, availableSurfaces:', availableSurfaces.length)
  
  // Make isDraggingCamera accessible to child components
  const sceneContextValue = useMemo(() => ({ isDraggingCamera }), [])
  
  return (
    <>
      {/* Camera control functions */}
      <CameraControls />
      
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      <directionalLight position={[0, 10, 0]} intensity={0.3} />

      {/* Surfaces from mesh or samples */}
      {availableSurfaces.length > 0 ? (
        availableSurfaces.map((surface) => (
          <ClickableSurface key={surface.id} surface={surface} onContextMenu={onSurfaceContextMenu} isDraggingCamera={isDraggingCamera} />
        ))
      ) : (
        sampleSurfaces.map((surface) => (
          <ClickableSurface key={surface.id} surface={surface} onContextMenu={onSurfaceContextMenu} isDraggingCamera={isDraggingCamera} />
        ))
      )}

      {/* Render visualizations */}
      {configData.visualization && configData.visualization.map((viz: any, index: number) => {
        const isSelected = selectedViz ? selectedViz.index === index : false
        
        // Only render if selected
        if (!isSelected) return null
        
        if (viz.type === 'plane') {
          return <VisualizationPlane key={`viz-plane-${index}`} viz={viz} isSelected={isSelected} vizIndex={index} controlsRef={controlsRef} />
        } else if (viz.type === 'line') {
          return <VisualizationLine key={`viz-line-${index}`} viz={viz} isSelected={isSelected} vizIndex={index} controlsRef={controlsRef} />
        }
        return null
      })}

      {/* Render initialization regions */}
      {(() => {
        // Use the rootSolverKey from the hook (already destructured above)
        const effectiveRootKey = rootSolverKey || 'HyperSolve'
        const rootConfig = (configData as any)[effectiveRootKey]
        return rootConfig?.['initialization regions']?.map((region: any, index: number) => {
        const isSelected = selectedInitRegion ? selectedInitRegion.index === index : false
        
        // Only render if selected
        if (!isSelected) return null
        
        if (region.type === 'cylinder') {
          return <InitializationRegionCylinder key={`init-region-cylinder-${index}`} region={region} isSelected={isSelected} regionIndex={index} controlsRef={controlsRef} />
        }
        return null
      })
      })()}

      {/* Ground grid */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6e6e6e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9d9d9d"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
        onClick={(e) => {
          // Only clear selection if clicking on grid (not on a surface)
          // Check if shift/ctrl/alt is held - if so, don't clear
          const modifierKey = cameraSettings.multiSelectModifier
          const isModifierPressed = 
            (modifierKey === 'shift' && e.shiftKey) ||
            (modifierKey === 'ctrl' && (e.ctrlKey || e.metaKey)) ||
            (modifierKey === 'alt' && e.altKey)
          
          if (!isModifierPressed) {
            clearSurfaceSelection()
          }
        }}
      />

      {/* Camera controls - Trackball style like Paraview */}
      <TrackballControls 
        ref={controlsRef}
        makeDefault
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={cameraSettings.rotateSpeed}
        zoomSpeed={cameraSettings.invertZoom ? -cameraSettings.zoomSpeed : cameraSettings.zoomSpeed}
        panSpeed={cameraSettings.panSpeed}
        staticMoving={false}
        dynamicDampingFactor={0.2}
        minDistance={1}
        maxDistance={100}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.DOLLY
        }}
      />
    </>
  )
}

function Viewport3D() {
  const { 
    totalVertices, 
    totalFaces, 
    overlayPosition, 
    setOverlayPosition, 
    selectedSurface,
    setSelectedSurface,
    selectedSurfaces,
    configData,
    addBoundaryCondition,
    setSelectedBC,
    updateBoundaryCondition,
    deleteBoundaryCondition,
    toggleSurfaceVisibility,
    surfaceVisibility,
    selectedInitRegion,
    selectedViz,
    rootSolverKey
  } = useAppStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; surface: Surface } | null>(null)
  const [showBCDialog, setShowBCDialog] = useState(false)
  const [bcDialogInitialSurface, setBCDialogInitialSurface] = useState<Surface | undefined>(undefined)
  const [showAlreadyAssignedDialog, setShowAlreadyAssignedDialog] = useState(false)
  const [showConfirmDeletionDialog, setShowConfirmDeletionDialog] = useState(false)
  const [showSetBCNameDialog, setShowSetBCNameDialog] = useState(false)
  const [conflictingSurface, setConflictingSurface] = useState<Surface | null>(null)
  const [conflictingBC, setConflictingBC] = useState<BoundaryCondition | null>(null)
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const viewportContent = document.querySelector('.viewport-content')
    if (!viewportContent) return
    
    const rect = viewportContent.getBoundingClientRect()
    const statsElement = document.querySelector('.stats') as HTMLElement
    if (!statsElement) return
    
    const statsRect = statsElement.getBoundingClientRect()
    
    let newX = e.clientX - rect.left - dragOffset.x
    let newY = e.clientY - rect.top - dragOffset.y
    
    // Keep within bounds
    newX = Math.max(0, Math.min(newX, rect.width - statsRect.width))
    newY = Math.max(0, Math.min(newY, rect.height - statsRect.height))
    
    setOverlayPosition({ x: newX, y: newY })
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])
  
  // Close context menu if the surface it's attached to becomes invisible
  useEffect(() => {
    if (contextMenu) {
      const isSurfaceVisible = surfaceVisibility[contextMenu.surface.id] ?? true
      if (!isSurfaceVisible) {
        setContextMenu(null)
      }
    }
  }, [surfaceVisibility, contextMenu])
  
  const findBCForSurface = (surface: Surface): BoundaryCondition | null => {
    const rootKey = rootSolverKey || 'HyperSolve'
    const rootConfig = (configData as any)[rootKey]
    const bcs = rootConfig?.['boundary conditions'] || []
    return bcs.find(bc => {
      const tags = bc['mesh boundary tags']
      const surfaceTag = surface.metadata.tag
      
      if (Array.isArray(tags)) {
        return (tags as any[]).includes(surfaceTag) || (tags as any[]).includes(String(surfaceTag))
      } else if (typeof tags === 'number') {
        return tags === surfaceTag
      } else if (typeof tags === 'string') {
        return tags.split(',').map(s => parseInt(s.trim(), 10)).includes(surfaceTag)
      }
      return false
    }) || null
  }
  
  const handleSurfaceContextMenu = (e: any, surface: Surface) => {
    // R3F events don't have preventDefault directly
    if (e.nativeEvent) {
      e.nativeEvent.preventDefault()
    }
    console.log('handleSurfaceContextMenu called:', surface.metadata.tagName, e.clientX, e.clientY)
    setContextMenu({ x: e.clientX, y: e.clientY, surface })
  }
  
  const closeContextMenu = () => {
    setContextMenu(null)
  }
  
  const handleAddToBC = () => {
    if (!contextMenu) return
    
    // TODO: Show dialog to select which BC to add the surface to
    // For now, just log it
    console.log('Add surface to BC:', contextMenu.surface)
    closeContextMenu()
  }
  
  const handleCreateNewBC = () => {
    if (!contextMenu) return
    
    const surface = contextMenu.surface
    const existingBC = findBCForSurface(surface)
    
    if (existingBC) {
      // Surface is already assigned, show warning
      setConflictingSurface(surface)
      setConflictingBC(existingBC)
      setShowAlreadyAssignedDialog(true)
      closeContextMenu()
    } else {
      // Surface is not assigned, proceed normally
      setBCDialogInitialSurface(surface)
      setShowBCDialog(true)
      closeContextMenu()
    }
  }
  
  const handleAddToVisualization = () => {
    if (!contextMenu) return
    
    // TODO: Show dialog to select which visualization to add the surface to
    console.log('Add surface to visualization:', contextMenu.surface)
    closeContextMenu()
  }
  
  const handleCreateNewVisualization = () => {
    if (!contextMenu) return
    
    // TODO: Implement surface visualization creation
    console.log('Create new surface visualization:', contextMenu.surface)
    closeContextMenu()
  }
  
  const handleHideSurface = () => {
    if (!contextMenu) return
    
    toggleSurfaceVisibility(contextMenu.surface.id)
    // Don't call closeContextMenu() - let the useEffect handle it
  }
  
  const handleSetBCName = () => {
    setShowSetBCNameDialog(true)
    closeContextMenu()
  }
  
  const handleBCNameSet = (bcName: string) => {
    const { updateSurfaceBCName, selectedSurfaces } = useAppStore.getState()
    const surfaceIds = selectedSurfaces.map(s => s.id)
    updateSurfaceBCName(surfaceIds, bcName)
  }
  
  const handleGoToBC = () => {
    if (conflictingBC) {
      setSelectedBC(conflictingBC)
      setShowAlreadyAssignedDialog(false)
      setConflictingSurface(null)
      setConflictingBC(null)
    }
  }
  
  const handleRemoveAndContinue = () => {
    if (!conflictingSurface || !conflictingBC) return
    
    const tags = conflictingBC['mesh boundary tags']
    const surfaceTag = conflictingSurface.metadata.tag
    let newTags: number[]
    
    if (Array.isArray(tags)) {
      newTags = (tags as any[]).filter(t => t !== surfaceTag && t !== String(surfaceTag)) as number[]
    } else if (typeof tags === 'number') {
      newTags = []
    } else if (typeof tags === 'string') {
      newTags = tags.split(',').map(s => parseInt(s.trim(), 10)).filter(t => t !== surfaceTag)
    } else {
      newTags = []
    }
    
    // Check if BC will have no surfaces left
    const willBeEmpty = newTags.length === 0
    
    if (willBeEmpty) {
      // Show deletion confirmation dialog
      setShowAlreadyAssignedDialog(false)
      setShowConfirmDeletionDialog(true)
    } else {
      // Remove surface from BC and continue
      updateBoundaryCondition(conflictingBC.id, {
        'mesh boundary tags': newTags.length === 1 ? newTags[0] : newTags
      })
      
      // Open BC creation dialog with the surface
      setBCDialogInitialSurface(conflictingSurface)
      setShowBCDialog(true)
      setShowAlreadyAssignedDialog(false)
      setConflictingSurface(null)
      setConflictingBC(null)
    }
  }
  
  const handleConfirmDeletion = () => {
    if (!conflictingBC || !conflictingSurface) return
    
    // Delete the BC
    deleteBoundaryCondition(conflictingBC.id)
    
    // Open BC creation dialog with the surface
    setBCDialogInitialSurface(conflictingSurface)
    setShowBCDialog(true)
    setShowConfirmDeletionDialog(false)
    setConflictingSurface(null)
    setConflictingBC(null)
  }
  
  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu) {
      window.addEventListener('click', closeContextMenu)
      return () => {
        window.removeEventListener('click', closeContextMenu)
      }
    }
  }, [contextMenu])
  
  // Handle Escape key to deselect surface (only when no dialogs are open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't deselect if any dialog is open
        if (showBCDialog || showAlreadyAssignedDialog || showConfirmDeletionDialog || contextMenu) {
          return
        }
        
        // Deselect surface if one is selected
        if (selectedSurface) {
          setSelectedSurface(null)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedSurface, setSelectedSurface, showBCDialog, showAlreadyAssignedDialog, showConfirmDeletionDialog, contextMenu])
  
  return (
    <div className="panel viewport-panel">
      <div className="panel-header">
        <BoxIcon size={16} />
        <span>3D Viewport</span>
        <div className="viewport-info">
          <span className="info-text">Drag to rotate • Scroll to zoom • Right-click to pan</span>
        </div>
        <div className="panel-actions">
          <button className="icon-button" title="Reset camera">
            <Camera size={14} />
          </button>
          <button className="icon-button" title="Fullscreen">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
      <div className="viewport-content">
        <Canvas
          camera={{ position: [5, 5, 5], fov: 50 }}
          shadows
          onContextMenu={(e) => e.preventDefault()}
        >
          <Scene onSurfaceContextMenu={handleSurfaceContextMenu} />
        </Canvas>
        
        {/* Camera Toolbar */}
        <CameraToolbar />
        
        {/* Rendering Toolbar */}
        <RenderingToolbar />
        
        {/* Overlay UI */}
        <div className="viewport-overlay">
          <div 
            className="stats-overlay" 
            style={{ 
              left: `${overlayPosition.x}px`, 
              top: `${overlayPosition.y}px` 
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="stats">
              <div className="stat-item">Vertices: {totalVertices}</div>
              <div className="stat-item">Faces: {totalFaces}</div>
            </div>
          </div>
          
          {/* Surface metadata overlay */}
          {selectedSurface && (
            <div className="overlay-corner bottom-left">
              <div className="surface-metadata">
                <div className="metadata-header">{selectedSurface.name}</div>
                <div className="metadata-row">Tag: {selectedSurface.metadata.tag}</div>
                {selectedSurface.metadata.bcName && (
                  <div className="metadata-row">BC Name: {selectedSurface.metadata.bcName}</div>
                )}
                {selectedSurface.metadata.isLumped && selectedSurface.metadata.originalRegionCount && (
                  <div className="metadata-row">
                    Lumped: {selectedSurface.metadata.originalRegionCount} region{selectedSurface.metadata.originalRegionCount > 1 ? 's' : ''}
                  </div>
                )}
                {(() => {
                  const rootKey = rootSolverKey || 'HyperSolve'
                  const rootConfig = (configData as any)[rootKey]
                  const bcs = rootConfig?.['boundary conditions'] || []
                  const associatedBC = bcs.find(bc => {
                    const tags = bc['mesh boundary tags']
                    const surfaceTag = selectedSurface.metadata.tag
                    
                    if (Array.isArray(tags)) {
                      return (tags as any[]).includes(surfaceTag) || (tags as any[]).includes(String(surfaceTag))
                    } else if (typeof tags === 'number') {
                      return tags === surfaceTag
                    } else if (typeof tags === 'string') {
                      return tags.split(',').map(s => parseInt(s.trim(), 10)).includes(surfaceTag)
                    }
                    return false
                  })
                  
                  return associatedBC ? (
                    <div className="metadata-row">BC: {associatedBC.name || 'Unnamed'}</div>
                  ) : (
                    <div className="metadata-row unassigned">No BC assigned</div>
                  )
                })()}
              </div>
            </div>
          )}
          
          {/* Multi-selection feedback */}
          {selectedSurfaces.length > 1 && (
            <div className="overlay-corner bottom-left" style={{ marginTop: selectedSurface ? '8px' : '0' }}>
              <div className="selection-feedback">
                <div className="selection-count">
                  {selectedSurfaces.length} face{selectedSurfaces.length > 1 ? 's' : ''} selected
                  {(() => {
                    const { cameraSettings } = useAppStore.getState()
                    if (cameraSettings.selectionMode === 'group' && selectedSurfaces.length > 0) {
                      const bcNames = new Set(selectedSurfaces.map(s => s.metadata.bcName).filter(Boolean))
                      if (bcNames.size > 0) {
                        return <span className="group-info"> ({bcNames.size} group{bcNames.size > 1 ? 's' : ''})</span>
                      }
                    }
                    return null
                  })()}
                </div>
                <button 
                  className="clear-selection-button"
                  onClick={() => useAppStore.getState().clearSurfaceSelection()}
                  title="Clear selection"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
          
          <div className="overlay-corner bottom-right">
            <div className="axis-indicator">
              <div className="axis-label">X</div>
              <div className="axis-label">Y</div>
              <div className="axis-label">Z</div>
            </div>
          </div>
        </div>
        
        {/* Context menu */}
        {contextMenu && (() => {
          const rootKey = rootSolverKey || 'HyperSolve'
          const rootConfig = (configData as any)[rootKey]
          const hasBCs = rootConfig?.['boundary conditions']?.length > 0
          const hasVisualizations = false // TODO: Check when visualizations are implemented
          
          return (
            <div 
              className="context-menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="context-menu-item" onClick={handleSetBCName}>Set BC Name...</div>
              <div className="context-menu-separator" />
              <div className="context-menu-item" onClick={handleHideSurface}>Hide Surface</div>
              <div className="context-menu-separator" />
              {hasBCs && <div className="context-menu-item" onClick={handleAddToBC}>Add to BC</div>}
              <div className="context-menu-item" onClick={handleCreateNewBC}>Create new BC from surface</div>
              {(hasBCs || hasVisualizations) && <div className="context-menu-separator" />}
              {hasVisualizations && <div className="context-menu-item" onClick={handleAddToVisualization}>Add to Visualization</div>}
              <div className="context-menu-item" onClick={handleCreateNewVisualization}>Create new surface visualization</div>
            </div>
          )
        })()}
      </div>
      
      {/* Boundary Condition Dialog */}
      <BoundaryConditionDialog 
        isOpen={showBCDialog}
        onClose={() => {
          setShowBCDialog(false)
          setBCDialogInitialSurface(undefined)
        }}
        initialSurface={bcDialogInitialSurface}
      />
      
      {/* Surface Already Assigned Warning Dialog */}
      {conflictingSurface && conflictingBC && (
        <SurfaceAlreadyAssignedDialog
          isOpen={showAlreadyAssignedDialog}
          onClose={() => {
            setShowAlreadyAssignedDialog(false)
            setConflictingSurface(null)
            setConflictingBC(null)
          }}
          surface={conflictingSurface}
          existingBC={conflictingBC}
          onGoToBC={handleGoToBC}
          onRemoveAndContinue={handleRemoveAndContinue}
        />
      )}
      
      {/* Confirm BC Deletion Dialog */}
      {conflictingBC && (
        <ConfirmBCDeletionDialog
          isOpen={showConfirmDeletionDialog}
          onClose={() => {
            setShowConfirmDeletionDialog(false)
            setConflictingSurface(null)
            setConflictingBC(null)
          }}
          bc={conflictingBC}
          onConfirm={handleConfirmDeletion}
        />
      )}
      
      {/* Set BC Name Dialog */}
      <SetBCNameDialog
        isOpen={showSetBCNameDialog}
        onClose={() => setShowSetBCNameDialog(false)}
        onSet={handleBCNameSet}
        surfaceCount={selectedSurfaces.length}
        currentBCName={selectedSurfaces.length === 1 ? selectedSurfaces[0]?.metadata.bcName : undefined}
      />
    </div>
  )
}

export default Viewport3D
