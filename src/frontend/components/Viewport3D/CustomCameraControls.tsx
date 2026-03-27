import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { useAppStore } from '../../store/appStore'

interface CustomCameraControlsProps {
  enableDamping?: boolean
  dampingFactor?: number
  minDistance?: number
  maxDistance?: number
}

/**
 * ParaView-style camera controls with separate focal point and rotation center.
 *
 * Three independent points:
 *   1. Camera position   — where the eye is
 *   2. Focal point       — what the camera looks at (screen center)
 *   3. Rotation center   — the pivot for rotation (can be anywhere on screen)
 *
 * Rotate:  Both camera position AND focal point orbit around the fixed
 *          rotation center. This keeps the rotation center at the same
 *          screen position — it doesn't snap to the middle.
 * Pan:     Camera position and focal point translate together.
 *          Rotation center stays fixed in world space.
 * Dolly:   Camera moves along its view direction (toward/away from
 *          focal point). Focal point and rotation center stay fixed.
 * Wheel:   Same as dolly.
 *
 * Mouse mapping:
 *   Left:   Rotate
 *   Middle: Pan
 *   Right:  Dolly
 *   Wheel:  Dolly
 */
export const CustomCameraControls = forwardRef<any, CustomCameraControlsProps>((props, ref) => {
  const {
    enableDamping = true,
    dampingFactor = 0.05,
    minDistance = 0.01,
    maxDistance = 100
  } = props

  const { camera, gl, invalidate, set } = useThree()
  const cameraSettings = useAppStore((s: any) => s.cameraSettings)

  // Keep a mutable ref to the current camera so closures always see it
  const cameraRef = useRef(camera)
  cameraRef.current = camera

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

  // Damping state
  const dampingState = useRef({
    rotateVelocity: new THREE.Vector2(0, 0),
    panVelocity: new THREE.Vector2(0, 0),
    zoomVelocity: 0
  })

  // Rotation center — the orbit pivot. Synced from store.
  const rotationCenter = useRef(
    new THREE.Vector3(
      cameraSettings.rotationCenter[0],
      cameraSettings.rotationCenter[1],
      cameraSettings.rotationCenter[2]
    )
  )

  // Focal point — what the camera looks at (determines screen center).
  // Starts coincident with rotation center; they diverge after panning.
  const focalPoint = useRef(
    new THREE.Vector3(
      cameraSettings.rotationCenter[0],
      cameraSettings.rotationCenter[1],
      cameraSettings.rotationCenter[2]
    )
  )

  // Sync rotation center when store changes (user picks a new center)
  useEffect(() => {
    const [x, y, z] = cameraSettings.rotationCenter
    rotationCenter.current.set(x, y, z)
  }, [cameraSettings.rotationCenter])

  // Expose via ref AND register as default controls
  const controlsObject = useRef<any>(null)
  if (!controlsObject.current) {
    controlsObject.current = {
      get enabled() { return enabled.current },
      set enabled(value: boolean) { enabled.current = value },
      get target() { return rotationCenter.current },
      get focalPoint() { return focalPoint.current },
      update: () => { invalidate() },
      // Reset focal point to match a new look-at target (used by fitToView, snapToPlane)
      lookAt: (point: THREE.Vector3) => {
        focalPoint.current.copy(point)
        cameraRef.current.lookAt(point)
        invalidate()
      }
    }
  }

  useImperativeHandle(ref, () => controlsObject.current)

  useEffect(() => {
    set({ controls: controlsObject.current })
    return () => { set({ controls: undefined as any }) }
  }, [set])

  // ───────── Rotate ─────────
  // Orbit both camera position and focal point around rotation center.
  const handleRotate = (deltaX: number, deltaY: number) => {
    const cam = cameraRef.current
    const rotateSpeed = cameraSettings.rotateSpeed
    const center = rotationCenter.current

    const element = gl.domElement
    const angleH = (2 * Math.PI * deltaX) / element.clientHeight * rotateSpeed
    const angleV = (2 * Math.PI * deltaY) / element.clientHeight * rotateSpeed

    // Horizontal: rotate around world-Y
    const qH = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), -angleH
    )

    // Vertical: rotate around camera's local-X (right) axis
    const cameraRight = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0)
    const qV = new THREE.Quaternion().setFromAxisAngle(cameraRight, -angleV)

    // Combined quaternion
    const q = new THREE.Quaternion().multiplyQuaternions(qV, qH)

    // Orbit camera position around center
    const camOffset = new THREE.Vector3().subVectors(cam.position, center)
    camOffset.applyQuaternion(q)
    cam.position.copy(center).add(camOffset)

    // Orbit focal point around center (same rotation)
    const focalOffset = new THREE.Vector3().subVectors(focalPoint.current, center)
    focalOffset.applyQuaternion(q)
    focalPoint.current.copy(center).add(focalOffset)

    // Orient camera to look at the (now orbited) focal point
    cam.lookAt(focalPoint.current)

    invalidate()
  }

  // ───────── Pan ─────────
  // Translate camera + focal point. Rotation center stays fixed.
  const handlePan = (deltaX: number, deltaY: number) => {
    const cam = cameraRef.current
    const panSpeed = cameraSettings.panSpeed
    const center = rotationCenter.current

    const distance = cam.position.distanceTo(center)
    const element = gl.domElement

    let panLeft = (2 * deltaX * distance) / element.clientHeight
    let panUp = (2 * deltaY * distance) / element.clientHeight

    if (cam.type === 'OrthographicCamera') {
      const ortho = cam as THREE.OrthographicCamera
      panLeft *= (ortho.right - ortho.left) / ortho.zoom / 2
      panUp *= (ortho.top - ortho.bottom) / ortho.zoom / 2
    }

    panLeft *= panSpeed
    panUp *= panSpeed

    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0)
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1)

    const panOffset = new THREE.Vector3()
    panOffset.addScaledVector(right, -panLeft)
    panOffset.addScaledVector(up, panUp)

    // Translate camera and focal point; rotation center stays put
    cam.position.add(panOffset)
    focalPoint.current.add(panOffset)

    invalidate()
  }

  // ───────── Dolly / Zoom ─────────
  // Move camera along its view direction. Focal point and rotation center stay fixed.
  const handleZoom = (delta: number) => {
    const cam = cameraRef.current
    const zoomSpeed = cameraSettings.zoomSpeed
    const invertZoom = cameraSettings.invertZoom
    const actualDelta = invertZoom ? -delta : delta

    if (cam.type === 'PerspectiveCamera') {
      const viewDir = new THREE.Vector3()
      cam.getWorldDirection(viewDir)

      // Scale movement by distance to rotation center
      const dist = cam.position.distanceTo(rotationCenter.current)
      const zoomFactor = Math.pow(0.95, actualDelta * zoomSpeed)
      const moveAmount = dist * (1 - zoomFactor)

      const newPos = cam.position.clone().addScaledVector(viewDir, moveAmount)

      // Clamp distance to rotation center
      const newDist = newPos.distanceTo(rotationCenter.current)
      if (newDist >= minDistance && newDist <= maxDistance) {
        cam.position.copy(newPos)
      }
    } else {
      const ortho = cam as THREE.OrthographicCamera
      const zoomFactor = Math.pow(0.95, actualDelta * zoomSpeed)
      ortho.zoom = THREE.MathUtils.clamp(ortho.zoom / zoomFactor, 0.01, 1000)
      ortho.updateProjectionMatrix()
    }

    invalidate()
  }

  // ───────── Mouse events ─────────
  useEffect(() => {
    const element = gl.domElement

    const onPointerDown = (event: PointerEvent) => {
      if (!enabled.current) return
      const s = state.current

      if (event.button === THREE.MOUSE.LEFT) {
        s.rotating = true
        s.rotateStart.set(event.clientX, event.clientY)
      } else if (event.button === THREE.MOUSE.MIDDLE) {
        s.panning = true
        s.panStart.set(event.clientX, event.clientY)
      } else if (event.button === THREE.MOUSE.RIGHT) {
        s.zooming = true
        s.zoomStart.set(event.clientX, event.clientY)
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!enabled.current) return
      const s = state.current
      const cur = new THREE.Vector2(event.clientX, event.clientY)

      if (s.rotating) {
        s.rotateDelta.subVectors(cur, s.rotateStart)
        if (enableDamping) {
          dampingState.current.rotateVelocity.copy(s.rotateDelta)
        } else {
          handleRotate(s.rotateDelta.x, s.rotateDelta.y)
        }
        s.rotateStart.copy(cur)
      } else if (s.panning) {
        s.panDelta.subVectors(cur, s.panStart)
        if (enableDamping) {
          dampingState.current.panVelocity.copy(s.panDelta)
        } else {
          handlePan(s.panDelta.x, s.panDelta.y)
        }
        s.panStart.copy(cur)
      } else if (s.zooming) {
        s.zoomDelta.subVectors(cur, s.zoomStart)
        if (enableDamping) {
          dampingState.current.zoomVelocity = s.zoomDelta.y
        } else {
          handleZoom(s.zoomDelta.y)
        }
        s.zoomStart.copy(cur)
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      const s = state.current
      if (event.button === THREE.MOUSE.LEFT) {
        s.rotating = false
        s.rotateDelta.set(0, 0)
      } else if (event.button === THREE.MOUSE.MIDDLE) {
        s.panning = false
        s.panDelta.set(0, 0)
      } else if (event.button === THREE.MOUSE.RIGHT) {
        s.zooming = false
        s.zoomDelta.set(0, 0)
      }
    }

    const onContextMenu = (event: Event) => { event.preventDefault() }

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

  // ───────── Damping ─────────
  useFrame(() => {
    if (!enableDamping) return
    const d = dampingState.current
    const f = dampingFactor

    if (d.rotateVelocity.lengthSq() > 0.0001) {
      handleRotate(d.rotateVelocity.x, d.rotateVelocity.y)
      d.rotateVelocity.multiplyScalar(1 - f)
    } else {
      d.rotateVelocity.set(0, 0)
    }

    if (d.panVelocity.lengthSq() > 0.0001) {
      handlePan(d.panVelocity.x, d.panVelocity.y)
      d.panVelocity.multiplyScalar(1 - f)
    } else {
      d.panVelocity.set(0, 0)
    }

    if (Math.abs(d.zoomVelocity) > 0.0001) {
      handleZoom(d.zoomVelocity)
      d.zoomVelocity *= (1 - f)
    } else {
      d.zoomVelocity = 0
    }
  })

  return null
})

CustomCameraControls.displayName = 'CustomCameraControls'
