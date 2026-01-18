import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Maximize2, RotateCw, RotateCcw, Square } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import * as THREE from 'three'
import './CameraToolbar.css'

// Component that provides camera control functions
export function CameraControls() {
  const { camera, controls, invalidate } = useThree()
  const { availableSurfaces, surfaceVisibility, soloBC } = useAppStore()
  const controlsRef = useRef<any>(controls)
  
  useEffect(() => {
    controlsRef.current = controls
  }, [controls])
  
  // Expose camera control functions to parent via window object
  useEffect(() => {
    ;(window as any).cameraControlFunctions = {
      fitToView: () => {
        // Calculate bounding box of all visible surfaces
        const box = new THREE.Box3()
        let hasVisibleGeometry = false
        
        availableSurfaces.forEach(surface => {
          // Check if surface is visible
          const isVisible = surfaceVisibility[surface.id] ?? true
          if (!isVisible) return
          
          // Check if surface belongs to solo BC
          if (soloBC) {
            const tags = soloBC['mesh boundary tags']
            const surfaceTag = surface.metadata.tag
            let belongsToSoloBC = false
            
            if (Array.isArray(tags)) {
              belongsToSoloBC = (tags as any[]).includes(surfaceTag) || (tags as any[]).includes(String(surfaceTag))
            } else if (typeof tags === 'number') {
              belongsToSoloBC = tags === surfaceTag
            } else if (typeof tags === 'string') {
              belongsToSoloBC = tags.split(',').map(s => parseInt(s.trim(), 10)).includes(surfaceTag)
            }
            
            if (!belongsToSoloBC) return
          }
          
          // Add surface geometry to bounding box
          if (surface.geometry) {
            const vertices = surface.geometry.vertices
            for (let i = 0; i < vertices.length; i += 3) {
              box.expandByPoint(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]))
            }
            hasVisibleGeometry = true
          }
        })
        
        if (!hasVisibleGeometry) {
          console.warn('No visible geometry to fit camera to')
          return
        }
        
        // Get bounding sphere
        const center = new THREE.Vector3()
        box.getCenter(center)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
        const cameraDistance = maxDim / (2 * Math.tan(fov / 2)) * 1.5 // 1.5 for some padding
        
        // Get current camera direction
        const direction = new THREE.Vector3()
        camera.getWorldDirection(direction)
        
        // Position camera at distance along current view direction
        const newPosition = center.clone().sub(direction.multiplyScalar(cameraDistance))
        camera.position.copy(newPosition)
        
        // Update controls target
        if (controlsRef.current && 'target' in controlsRef.current) {
          controlsRef.current.target.copy(center)
          controlsRef.current.update()
        }
        
        invalidate()
      },
      
      snapToPlane: (plane: 'xy' | 'yz' | 'xz') => {
        // Get current target (center of rotation)
        const target = controlsRef.current && 'target' in controlsRef.current
          ? controlsRef.current.target.clone()
          : new THREE.Vector3(0, 0, 0)
        
        // Calculate distance from camera to target
        const distance = camera.position.distanceTo(target)
        
        // Set camera position based on plane
        const newPosition = target.clone()
        
        switch (plane) {
          case 'xy': // Look down Z axis (top view)
            newPosition.z += distance
            camera.up.set(0, 1, 0)
            break
          case 'yz': // Look down X axis (side view)
            newPosition.x += distance
            camera.up.set(0, 1, 0)
            break
          case 'xz': // Look down Y axis (front view)
            newPosition.y += distance
            camera.up.set(0, 0, 1)
            break
        }
        
        camera.position.copy(newPosition)
        camera.lookAt(target)
        
        if (controlsRef.current) {
          controlsRef.current.update()
        }
        
        invalidate()
      },
      
      rotateCamera: (degrees: number) => {
        // Get current target
        const target = controlsRef.current && 'target' in controlsRef.current
          ? controlsRef.current.target.clone()
          : new THREE.Vector3(0, 0, 0)
        
        // Rotate the up vector around the viewing direction (in the current plane)
        const viewDirection = new THREE.Vector3()
        camera.getWorldDirection(viewDirection)
        
        const quaternion = new THREE.Quaternion()
        quaternion.setFromAxisAngle(viewDirection, degrees * Math.PI / 180)
        
        const newUp = camera.up.clone()
        newUp.applyQuaternion(quaternion)
        camera.up.copy(newUp)
        
        camera.lookAt(target)
        
        if (controlsRef.current) {
          controlsRef.current.update()
        }
        
        invalidate()
      }
    }
    
    return () => {
      delete (window as any).cameraControlFunctions
    }
  }, [camera, controls, invalidate, availableSurfaces, surfaceVisibility, soloBC])
  
  return null
}

// UI Toolbar component
export function CameraToolbar() {
  const handleFitToView = () => {
    ;(window as any).cameraControlFunctions?.fitToView()
  }
  
  const handleSnapToPlane = (plane: 'xy' | 'yz' | 'xz') => {
    ;(window as any).cameraControlFunctions?.snapToPlane(plane)
  }
  
  const handleRotate = (degrees: number) => {
    ;(window as any).cameraControlFunctions?.rotateCamera(degrees)
  }
  
  return (
    <div className="camera-toolbar">
      <div className="toolbar-group">
        <button 
          className="toolbar-button" 
          onClick={handleFitToView}
          title="Fit camera to visible surfaces"
        >
          <Maximize2 size={14} />
          <span>Fit</span>
        </button>
      </div>
      
      <div className="toolbar-separator" />
      
      <div className="toolbar-group">
        <button 
          className="toolbar-button" 
          onClick={() => handleSnapToPlane('xy')}
          title="View XY plane (top view)"
        >
          <Square size={14} />
          <span>XY</span>
        </button>
        <button 
          className="toolbar-button" 
          onClick={() => handleSnapToPlane('yz')}
          title="View YZ plane (side view)"
        >
          <Square size={14} />
          <span>YZ</span>
        </button>
        <button 
          className="toolbar-button" 
          onClick={() => handleSnapToPlane('xz')}
          title="View XZ plane (front view)"
        >
          <Square size={14} />
          <span>XZ</span>
        </button>
      </div>
      
      <div className="toolbar-separator" />
      
      <div className="toolbar-group">
        <button 
          className="toolbar-button" 
          onClick={() => handleRotate(-90)}
          title="Rotate camera -90°"
        >
          <RotateCcw size={14} />
          <span>-90°</span>
        </button>
        <button 
          className="toolbar-button" 
          onClick={() => handleRotate(90)}
          title="Rotate camera +90°"
        >
          <RotateCw size={14} />
          <span>+90°</span>
        </button>
      </div>
    </div>
  )
}
