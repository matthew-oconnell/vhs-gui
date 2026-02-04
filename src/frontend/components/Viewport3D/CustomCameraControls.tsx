import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { useAppStore } from '../../store/appStore'

interface CustomCameraControlsProps {
  makeDefault?: boolean
  enableDamping?: boolean
  dampingFactor?: number
  minDistance?: number
  maxDistance?: number
}

/**
 * Custom camera controls with a fixed rotation center.
 * 
 * Key features:
 * - Rotation always occurs around a configurable center point (not camera position)
 * - Panning translates the camera without changing the rotation center
 * - Zoom (dolly) moves camera toward/away from rotation center
 * - Works with both perspective and orthographic cameras
 * - Respects camera settings from store (speeds, invert zoom, etc.)
 */
export const CustomCameraControls = forwardRef<any, CustomCameraControlsProps>((props, ref) => {
  const { 
    makeDefault = true,
    enableDamping = true,
    dampingFactor = 0.05,
    minDistance = 0.01,
    maxDistance = 100
  } = props

  const { camera, gl, invalidate } = useThree()
  const { cameraSettings, computeModelCentroid } = useAppStore()
  
  // Control state
  const enabled = useRef(true)
  const state = useRef({
    rotating: false,
    panning: false,
    zooming: false,
    rotateStart: new THREE.Vector2(),
    rotateDelta: new THREE.Vector2(),
    panStart: new THREE.Vector2(),
    panDelta: new THREE.Vector2(),
    zoomStart: new THREE.Vector2(),
    zoomDelta: new THREE.Vector2()
  })
  
  // Damping state (for smooth motion)
  const dampingState = useRef({
    rotateVelocity: new THREE.Vector2(0, 0),
    panVelocity: new THREE.Vector2(0, 0),
    zoomVelocity: 0
  })
  
  // Get rotation center from store or compute it
  const getRotationCenter = (): THREE.Vector3 => {
    if (cameraSettings.useAutoRotationCenter) {
      try {
        const centroid = computeModelCentroid()
        if (centroid) {
          return new THREE.Vector3(centroid[0], centroid[1], centroid[2])
        }
      } catch (error) {
        // If computeModelCentroid fails (e.g., during initialization), fall back to stored center
        console.warn('Failed to compute model centroid:', error)
      }
    }
    const [x, y, z] = cameraSettings.rotationCenter
    return new THREE.Vector3(x, y, z)
  }
  
  // Initialize rotation center from settings (don't auto-compute on first render)
  const rotationCenter = useRef(
    new THREE.Vector3(
      cameraSettings.rotationCenter[0],
      cameraSettings.rotationCenter[1],
      cameraSettings.rotationCenter[2]
    )
  )
  
  // Update rotation center when settings change
  useEffect(() => {
    const newCenter = getRotationCenter()
    rotationCenter.current.copy(newCenter)
  }, [cameraSettings.rotationCenter, cameraSettings.useAutoRotationCenter])
  
  // Expose control methods via ref
  useImperativeHandle(ref, () => ({
    get enabled() { return enabled.current },
    set enabled(value: boolean) { enabled.current = value },
    target: rotationCenter.current,
    update: () => {
      // Manual update if needed
      invalidate()
    }
  }))
  
  // Handle rotation (trackball-style)
  const handleRotate = (deltaX: number, deltaY: number) => {
    const rotateSpeed = cameraSettings.rotateSpeed
    const center = rotationCenter.current
    
    // Convert pixel deltas to rotation angles
    const element = gl.domElement
    const rotateAngleX = (2 * Math.PI * deltaX) / element.clientHeight * rotateSpeed
    const rotateAngleY = (2 * Math.PI * deltaY) / element.clientHeight * rotateSpeed
    
    // Get camera position relative to rotation center
    const offset = new THREE.Vector3().subVectors(camera.position, center)
    
    // Rotate around world Y axis (horizontal mouse movement)
    const quaternionY = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -rotateAngleX
    )
    offset.applyQuaternion(quaternionY)
    
    // Rotate around camera's local X axis (vertical mouse movement)
    const cameraRight = new THREE.Vector3()
    camera.getWorldDirection(new THREE.Vector3())
    cameraRight.crossVectors(camera.up, new THREE.Vector3().subVectors(camera.position, center)).normalize()
    
    const quaternionX = new THREE.Quaternion().setFromAxisAngle(cameraRight, -rotateAngleY)
    offset.applyQuaternion(quaternionX)
    
    // Update camera position
    camera.position.copy(center).add(offset)
    camera.lookAt(center)
    
    invalidate()
  }
  
  // Handle panning (translate camera and rotation center together)
  const handlePan = (deltaX: number, deltaY: number) => {
    const panSpeed = cameraSettings.panSpeed
    const center = rotationCenter.current
    
    // Calculate pan distance based on camera distance from center
    const distance = camera.position.distanceTo(center)
    const element = gl.domElement
    
    let panLeft = (2 * deltaX * distance) / element.clientHeight
    let panUp = (2 * deltaY * distance) / element.clientHeight
    
    // For orthographic camera, scale by zoom
    if (camera.type === 'OrthographicCamera') {
      const orthoCamera = camera as THREE.OrthographicCamera
      panLeft *= (orthoCamera.right - orthoCamera.left) / orthoCamera.zoom / 2
      panUp *= (orthoCamera.top - orthoCamera.bottom) / orthoCamera.zoom / 2
    }
    
    panLeft *= panSpeed
    panUp *= panSpeed
    
    // Get camera's local axes
    const cameraRight = new THREE.Vector3()
    const cameraUp = new THREE.Vector3()
    
    camera.getWorldDirection(new THREE.Vector3())
    cameraRight.setFromMatrixColumn(camera.matrix, 0) // Get right vector
    cameraUp.setFromMatrixColumn(camera.matrix, 1) // Get up vector
    
    // Calculate pan offset in world space
    const panOffset = new THREE.Vector3()
    panOffset.add(cameraRight.multiplyScalar(-panLeft))
    panOffset.add(cameraUp.multiplyScalar(panUp))
    
    // Move both camera and rotation center
    camera.position.add(panOffset)
    rotationCenter.current.add(panOffset)
    
    // Update store with new rotation center (if not in auto mode)
    if (!cameraSettings.useAutoRotationCenter) {
      useAppStore.getState().setRotationCenter([
        rotationCenter.current.x,
        rotationCenter.current.y,
        rotationCenter.current.z
      ])
    }
    
    invalidate()
  }
  
  // Handle zoom/dolly (move camera toward/away from rotation center)
  const handleZoom = (delta: number) => {
    const zoomSpeed = cameraSettings.zoomSpeed
    const invertZoom = cameraSettings.invertZoom
    const center = rotationCenter.current
    
    // Apply invert if enabled
    const actualDelta = invertZoom ? -delta : delta
    
    if (camera.type === 'PerspectiveCamera') {
      // Perspective: move camera along view direction
      const distance = camera.position.distanceTo(center)
      const direction = new THREE.Vector3().subVectors(camera.position, center).normalize()
      
      // Calculate zoom factor (exponential feels more natural)
      const zoomFactor = Math.pow(0.95, actualDelta * zoomSpeed)
      const newDistance = THREE.MathUtils.clamp(distance * zoomFactor, minDistance, maxDistance)
      
      // Update camera position
      camera.position.copy(center).add(direction.multiplyScalar(newDistance))
    } else {
      // Orthographic: adjust zoom level
      const orthoCamera = camera as THREE.OrthographicCamera
      const zoomFactor = Math.pow(0.95, actualDelta * zoomSpeed)
      orthoCamera.zoom = THREE.MathUtils.clamp(orthoCamera.zoom / zoomFactor, 0.01, 1000)
      orthoCamera.updateProjectionMatrix()
    }
    
    invalidate()
  }
  
  // Mouse event handlers
  useEffect(() => {
    const element = gl.domElement
    
    const onPointerDown = (event: PointerEvent) => {
      if (!enabled.current) return
      
      const mouseButton = event.button
      const s = state.current
      
      if (mouseButton === THREE.MOUSE.LEFT) {
        // Left mouse: rotate
        s.rotating = true
        s.rotateStart.set(event.clientX, event.clientY)
      } else if (mouseButton === THREE.MOUSE.MIDDLE) {
        // Middle mouse: pan
        s.panning = true
        s.panStart.set(event.clientX, event.clientY)
      } else if (mouseButton === THREE.MOUSE.RIGHT) {
        // Right mouse: zoom
        s.zooming = true
        s.zoomStart.set(event.clientX, event.clientY)
      }
    }
    
    const onPointerMove = (event: PointerEvent) => {
      if (!enabled.current) return
      
      const s = state.current
      const currentMouse = new THREE.Vector2(event.clientX, event.clientY)
      
      if (s.rotating) {
        s.rotateDelta.subVectors(currentMouse, s.rotateStart)
        
        if (enableDamping) {
          dampingState.current.rotateVelocity.copy(s.rotateDelta)
        } else {
          handleRotate(s.rotateDelta.x, s.rotateDelta.y)
        }
        
        s.rotateStart.copy(currentMouse)
      } else if (s.panning) {
        s.panDelta.subVectors(currentMouse, s.panStart)
        
        if (enableDamping) {
          dampingState.current.panVelocity.copy(s.panDelta)
        } else {
          handlePan(s.panDelta.x, s.panDelta.y)
        }
        
        s.panStart.copy(currentMouse)
      } else if (s.zooming) {
        s.zoomDelta.subVectors(currentMouse, s.zoomStart)
        
        if (enableDamping) {
          dampingState.current.zoomVelocity = s.zoomDelta.y
        } else {
          handleZoom(s.zoomDelta.y)
        }
        
        s.zoomStart.copy(currentMouse)
      }
    }
    
    const onPointerUp = (event: PointerEvent) => {
      const mouseButton = event.button
      const s = state.current
      
      if (mouseButton === THREE.MOUSE.LEFT) {
        s.rotating = false
        s.rotateDelta.set(0, 0)
      } else if (mouseButton === THREE.MOUSE.MIDDLE) {
        s.panning = false
        s.panDelta.set(0, 0)
      } else if (mouseButton === THREE.MOUSE.RIGHT) {
        s.zooming = false
        s.zoomDelta.set(0, 0)
      }
    }
    
    const onContextMenu = (event: Event) => {
      // Prevent default context menu
      event.preventDefault()
    }
    
    const onWheel = (event: WheelEvent) => {
      if (!enabled.current) return
      event.preventDefault()
      
      if (enableDamping) {
        dampingState.current.zoomVelocity += event.deltaY * 0.01
      } else {
        handleZoom(event.deltaY * 0.01)
      }
    }
    
    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('contextmenu', onContextMenu)
    element.addEventListener('wheel', onWheel, { passive: false })
    
    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('contextmenu', onContextMenu)
      element.removeEventListener('wheel', onWheel)
    }
  }, [gl, camera, cameraSettings, enableDamping, minDistance, maxDistance])
  
  // Damping animation
  useFrame(() => {
    if (!enableDamping) return
    
    const d = dampingState.current
    const factor = dampingFactor
    
    // Apply damped rotation
    if (d.rotateVelocity.lengthSq() > 0.0001) {
      handleRotate(d.rotateVelocity.x, d.rotateVelocity.y)
      d.rotateVelocity.multiplyScalar(1 - factor)
    } else {
      d.rotateVelocity.set(0, 0)
    }
    
    // Apply damped panning
    if (d.panVelocity.lengthSq() > 0.0001) {
      handlePan(d.panVelocity.x, d.panVelocity.y)
      d.panVelocity.multiplyScalar(1 - factor)
    } else {
      d.panVelocity.set(0, 0)
    }
    
    // Apply damped zoom
    if (Math.abs(d.zoomVelocity) > 0.0001) {
      handleZoom(d.zoomVelocity)
      d.zoomVelocity *= (1 - factor)
    } else {
      d.zoomVelocity = 0
    }
  })
  
  return null
})

CustomCameraControls.displayName = 'CustomCameraControls'
