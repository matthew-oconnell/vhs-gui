import * as THREE from 'three'
import { useAppStore } from '../../store/appStore'

/**
 * Visual indicator for the rotation center.
 * Shows a 3D crosshair at the rotation center point.
 */
export function RotationCenterIndicator() {
  const { cameraSettings } = useAppStore()
  
  // Don't render if not enabled
  if (!cameraSettings.showRotationCenter) {
    return null
  }
  
  const [x, y, z] = cameraSettings.rotationCenter
  const size = 0.5 // Size of the crosshair arms
  const thickness = 0.02 // Thickness of the lines
  
  return (
    <group position={[x, y, z]}>
      {/* X axis - Red */}
      <mesh position={[size / 2, 0, 0]}>
        <boxGeometry args={[size, thickness, thickness]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.8} depthTest={false} />
      </mesh>
      <mesh position={[-size / 2, 0, 0]}>
        <boxGeometry args={[size, thickness, thickness]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.8} depthTest={false} />
      </mesh>
      
      {/* Y axis - Green */}
      <mesh position={[0, size / 2, 0]}>
        <boxGeometry args={[thickness, size, thickness]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.8} depthTest={false} />
      </mesh>
      <mesh position={[0, -size / 2, 0]}>
        <boxGeometry args={[thickness, size, thickness]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.8} depthTest={false} />
      </mesh>
      
      {/* Z axis - Blue */}
      <mesh position={[0, 0, size / 2]}>
        <boxGeometry args={[thickness, thickness, size]} />
        <meshBasicMaterial color="#0000ff" transparent opacity={0.8} depthTest={false} />
      </mesh>
      <mesh position={[0, 0, -size / 2]}>
        <boxGeometry args={[thickness, thickness, size]} />
        <meshBasicMaterial color="#0000ff" transparent opacity={0.8} depthTest={false} />
      </mesh>
      
      {/* Center sphere */}
      <mesh>
        <sphereGeometry args={[thickness * 3, 16, 16]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.9} depthTest={false} />
      </mesh>
    </group>
  )
}
