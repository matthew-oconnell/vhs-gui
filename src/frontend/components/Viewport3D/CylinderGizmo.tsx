import { useMemo } from 'react'
import * as THREE from 'three'

interface ArrowGizmoProps {
  position: [number, number, number]
  direction: THREE.Vector3
  color: string
  scale: number
  isHovered: boolean
  isDragging: boolean
  onPointerDown: (event: any) => void
  onPointerEnter: () => void
  onPointerLeave: () => void
}

export function ArrowGizmo({
  position,
  direction,
  color,
  scale,
  isHovered,
  isDragging,
  onPointerDown,
  onPointerEnter,
  onPointerLeave
}: ArrowGizmoProps) {
  const rotation = useMemo(() => {
    const axis = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    return [euler.x, euler.y, euler.z] as [number, number, number]
  }, [direction])
  
  const emissiveColor = isHovered || isDragging ? '#ffff00' : color
  const currentColor = isHovered || isDragging ? '#ffff00' : color
  
  return (
    <group
      position={position}
      rotation={rotation}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* Arrow shaft - positioned along local Y axis */}
      <mesh position={[0, scale * 0.5, 0]}>
        <cylinderGeometry args={[scale * 0.05, scale * 0.05, scale, 8]} />
        <meshStandardMaterial 
          color={currentColor}
          emissive={emissiveColor}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Arrow head - at the end of the shaft */}
      <mesh position={[0, scale * 1.15, 0]}>
        <coneGeometry args={[scale * 0.15, scale * 0.3, 8]} />
        <meshStandardMaterial 
          color={currentColor}
          emissive={emissiveColor}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}
