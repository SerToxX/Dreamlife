'use client';
import * as THREE from 'three';
import { Canvas as R3FCanvas, type RootState } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';

interface MugSceneProps {
  texture: THREE.CanvasTexture | null;
  onReady?: (state: RootState) => void;
}

const CERAMICA = { roughness: 0.28, clearcoat: 0.65, clearcoatRoughness: 0.22 };

/**
 * Taza modelada con geometría procedural (cilindro + asa), sin depender de
 * un archivo .glb externo.
 *
 * El diseño ahora envuelve los 360° completos del cuerpo (antes solo
 * cubría un lado) — se puede poner texto/imágenes/stickers en cualquier
 * parte alrededor de la taza. La costura donde el diseño "se cierra"
 * (u=0 con u=1) queda rotada para caer justo detrás del asa, igual que en
 * una taza sublimada real, donde nunca se nota.
 *
 * Material: meshPhysicalMaterial con "clearcoat" simula el esmalte
 * brillante de la cerámica; Environment agrega reflejos realistas en vez
 * del acabado plano/mate que tenía antes.
 */
function Mug({ texture }: { texture: THREE.CanvasTexture | null }) {
  return (
    <group>
      {/* Cuerpo cerámico — el diseño envuelve todo el contorno */}
      <mesh castShadow receiveShadow rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 1.7, 64]} />
        <meshPhysicalMaterial {...CERAMICA} map={texture ?? undefined} color={texture ? '#ffffff' : '#fafafa'} />
      </mesh>

      {/* Borde superior, para simular la boca de la taza */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <torusGeometry args={[0.895, 0.022, 16, 64]} />
        <meshPhysicalMaterial {...CERAMICA} color="#fafafa" />
      </mesh>

      {/* Asa, del lado opuesto a la costura del diseño */}
      <mesh position={[-1.02, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.42, 0.09, 16, 32, Math.PI * 1.4]} />
        <meshPhysicalMaterial {...CERAMICA} color="#fafafa" />
      </mesh>

      {/* Base */}
      <mesh position={[0, -0.86, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.03, 48]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.5} />
      </mesh>
    </group>
  );
}

export function MugScene({ texture, onReady }: MugSceneProps) {
  return (
    <R3FCanvas
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={(state) => onReady?.(state)}
    >
      <PerspectiveCamera makeDefault position={[2.6, 0.5, 0]} fov={32} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />
      <Mug texture={texture} />
      <ContactShadows position={[0, -0.87, 0]} opacity={0.4} scale={4} blur={2.2} far={1.2} />
      <Environment preset="apartment" />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={1.8}
        maxDistance={4.5}
        target={[0, 0, 0]}
      />
    </R3FCanvas>
  );
}
