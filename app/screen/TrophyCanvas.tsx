'use client'

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function TrophyMesh() {
  const group = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    group.current.rotation.y += delta * 0.6
  })

  const gold = {
    color: '#FFD700',
    metalness: 1,
    roughness: 0.15,
    envMapIntensity: 2,
  }

  return (
    <group ref={group} position={[0, -0.5, 0]}>
      {/* Base plate */}
      <mesh position={[0, -2.2, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.3, 0.18, 64]} />
        <meshStandardMaterial {...gold} roughness={0.1} />
      </mesh>
      {/* Lower base step */}
      <mesh position={[0, -2.0, 0]} castShadow>
        <cylinderGeometry args={[0.85, 1.1, 0.18, 64]} />
        <meshStandardMaterial {...gold} />
      </mesh>

      {/* Stem */}
      <mesh position={[0, -1.1, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.32, 1.6, 32]} />
        <meshStandardMaterial {...gold} />
      </mesh>

      {/* Collar — flared base of cup */}
      <mesh position={[0, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.22, 0.5, 64]} />
        <meshStandardMaterial {...gold} roughness={0.1} />
      </mesh>

      {/* Cup lower body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.68, 0.72, 1.5, 64]} />
        <meshStandardMaterial {...gold} roughness={0.12} />
      </mesh>

      {/* Cup upper body — tapers inward */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.68, 0.8, 64]} />
        <meshStandardMaterial {...gold} roughness={0.1} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.48, 0.5, 32]} />
        <meshStandardMaterial {...gold} />
      </mesh>

      {/* Globe on top */}
      <mesh position={[0, 2.65, 0]} castShadow>
        <sphereGeometry args={[0.38, 64, 64]} />
        <meshStandardMaterial color="#1a7abf" metalness={0.6} roughness={0.3} envMapIntensity={1.5} />
      </mesh>
      {/* Globe land masses (subtle rings) */}
      <mesh position={[0, 2.65, 0]}>
        <torusGeometry args={[0.38, 0.015, 16, 64]} />
        <meshStandardMaterial color="#2ecc71" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.012, 16, 64]} />
        <meshStandardMaterial color="#2ecc71" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Left handle */}
      <mesh position={[-0.85, 0.9, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <torusGeometry args={[0.32, 0.055, 16, 48, Math.PI]} />
        <meshStandardMaterial {...gold} />
      </mesh>
      {/* Right handle */}
      <mesh position={[0.85, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <torusGeometry args={[0.32, 0.055, 16, 48, Math.PI]} />
        <meshStandardMaterial {...gold} />
      </mesh>
    </group>
  )
}

export default function TrophyCanvas() {
  return (
    <div style={{ width: 260, height: 320 }}>
      <Canvas
        camera={{ position: [0, 1, 6], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={3} />
        <directionalLight position={[-4, 2, -4]} intensity={1.2} color="#ffe0a0" />
        <directionalLight position={[0, -4, 4]} intensity={0.6} color="#a0c8ff" />
        <pointLight position={[0, 4, 3]} intensity={2} color="#ffffff" />
        <pointLight position={[3, 0, 3]} intensity={1} color="#ffd700" />
        <TrophyMesh />
      </Canvas>
    </div>
  )
}
