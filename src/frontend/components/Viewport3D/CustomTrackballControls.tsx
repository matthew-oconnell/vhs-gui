import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CustomTrackballControlsProps {
  focalPoint: [number, number, number]
  rotateSpeed?: number
  zoomSpeed?: number
  panSpeed?: number
  dampingFactor?: number
  minDistance?: number
  maxDistance?: number
}

/**
 * Custom trackball camera controls that rotate around a configurable focal point.
 * Unlike standard trackball controls, the focal point can be moved independently
 * of the camera position, enabling ParaView-style interaction where:
 * - Rotation happens around the focal point
 * - Panning translates both camera and focal point together
 * - Focal point can be set by picking a surface point
 */
export function CustomTrackballControls({
  focalPoint,
  rotateSpeed = 1.5,
  zoomSpeed = 1.2,
  panSpeed = 0.8,
  dampingFactor = 0,
  minDistance = 0.01,
  maxDistance = 100
}: CustomTrackballControlsProps) {
  const { camera, gl } = useThree()
  const isDragging = useRef(false)
  const mouseButton = useRef<number | null>(null)
  const previousMouse = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)
  
  // Target states for damping
  const targetOffset = useRef(new THREE.Vector3())
  const currentOffset = useRef(new THREE.Vector3())
  
  // Initialize camera to look at focal point
  useEffect(() => {
    const focal = new THREE.Vector3(...focalPoint)
    camera.lookAt(focal)
    
    // Calculate initial offset from camera to focal point
    targetOffset.current.copy(camera.position).sub(focal)
    currentOffset.current.copy(targetOffset.current)
  }, [])
  
  // Update when focal point changes
  useEffect(() => {
    const focal = new THREE.Vector3(...focalPoint)
    // Maintain same offset relative to new focal point
    targetOffset.current.copy(camera.position).sub(focal)
    currentOffset.current.copy(targetOffset.current)
  }, [focalPoint[0], focalPoint[1], focalPoint[2]])
  
  useEffect(() => {
    const canvas = gl.domElement
    
    const handlePointerDown = (e: PointerEvent) => {
      isDragging.current = true
      mouseButton.current = e.button
      previousMouse.current = { x: e.clientX, y: e.clientY }
      hasMoved.current = false
    }
    
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current || mouseButton.current === null) return
      
      const deltaX = e.clientX - previousMouse.current.x
      const deltaY = e.clientY - previousMouse.current.y
      
      // Track if mouse actually moved (more than 2 pixels)
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        hasMoved.current = true
      }
      
      previousMouse.current = { x: e.clientX, y: e.clientY }
      
      const focal = new THREE.Vector3(...focalPoint)
      
      if (mouseButton.current === 0) {
        // LEFT MOUSE: Rotate around focal point
        handleRotate(deltaX, deltaY, focal)
      } else if (mouseButton.current === 1) {
        // MIDDLE MOUSE: Pan (translate focal point and camera together)
        handlePan(deltaX, deltaY, focal)
      } else if (mouseButton.current === 2) {
        // RIGHT MOUSE: Dolly/Zoom
        handleDolly(deltaY, focal)
      }
    }
    
    const handlePointerUp = () => {
      isDragging.current = false
      mouseButton.current = null
    }
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const focal = new THREE.Vector3(...focalPoint)
      handleDolly(e.deltaY * 0.1, focal)
    }
    
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [gl, focalPoint])
  
  const handleRotate = (deltaX: number, deltaY: number, focal: THREE.Vector3) => {
    // Get camera axes
    const offset = targetOffset.current.clone()
    const up = camera.up.clone()
    const right = new THREE.Vector3().crossVectors(up, offset).normalize()
    const actualUp = new THREE.Vector3().crossVectors(offset, right).normalize()
    
    // Rotate around up axis (horizontal mouse movement)
    const horizontalAngle = (deltaX / window.innerWidth) * Math.PI * rotateSpeed
    const horizontalQuat = new THREE.Quaternion().setFromAxisAngle(actualUp, -horizontalAngle)
    offset.applyQuaternion(horizontalQuat)
    
    // Rotate around right axis (vertical mouse movement)
    const verticalAngle = (deltaY / window.innerHeight) * Math.PI * rotateSpeed
    const verticalQuat = new THREE.Quaternion().setFromAxisAngle(right, -verticalAngle)
    offset.applyQuaternion(verticalQuat)
    
    // Update target offset
    targetOffset.current.copy(offset)
  }
  
  const handlePan = (deltaX: number, deltaY: number, focal: THREE.Vector3) => {
    // Calculate pan amount based on camera distance
    const distance = targetOffset.current.length()
    const panAmount = distance * panSpeed * 0.001
    
    // Get camera right and up vectors
    const offset = targetOffset.current.clone().normalize()
    const up = camera.up.clone()
    const right = new THREE.Vector3().crossVectors(up, offset).normalize()
    const actualUp = new THREE.Vector3().crossVectors(offset, right).normalize()
    
    // Calculate pan vector
    const panVector = new THREE.Vector3()
    panVector.addScaledVector(right, -deltaX * panAmount)
    panVector.addScaledVector(actualUp, deltaY * panAmount)
    
    // Move both focal point and offset (so camera moves too)
    // We need to trigger a focal point update in the store
    // For now, just move the camera - the focal point can be updated by the parent
    const newFocal = focal.clone().add(panVector)
    
    // Update camera position
    const newCameraPos = newFocal.clone().add(targetOffset.current)
    camera.position.copy(newCameraPos)
    camera.lookAt(newFocal)
    
    // NOTE: Parent component should listen to pan events and update focalPoint in store
    // For now, we'll dispatch a custom event
    gl.domElement.dispatchEvent(new CustomEvent('focalpoint-pan', { 
      detail: { newFocal: [newFocal.x, newFocal.y, newFocal.z] }
    }))
  }
  
  const handleDolly = (delta: number, focal: THREE.Vector3) => {
    // Zoom by moving camera closer/farther from focal point
    // Note: zoomSpeed is already negated if invertZoom is true in parent
    const offset = targetOffset.current
    const distance = offset.length()
    const zoomDelta = delta * zoomSpeed * 0.001 * distance
    
    const newDistance = Math.max(minDistance, Math.min(maxDistance, distance + zoomDelta))
    const scale = newDistance / distance
    
    offset.multiplyScalar(scale)
    targetOffset.current.copy(offset)
  }
  
  // Apply damping each frame
  useFrame(() => {
    const focal = new THREE.Vector3(...focalPoint)
    
    // Smoothly interpolate current offset toward target offset (or apply immediately if no damping)
    if (dampingFactor > 0) {
      currentOffset.current.lerp(targetOffset.current, dampingFactor)
    } else {
      currentOffset.current.copy(targetOffset.current)
    }
    
    // Update camera position
    const newCameraPos = focal.clone().add(currentOffset.current)
    camera.position.copy(newCameraPos)
    camera.lookAt(focal)
  })
  
  // Expose hasMoved flag for parent components
  useEffect(() => {
    ;(gl.domElement as any)._controlsHasMoved = hasMoved
  }, [])
  
  return null
}
