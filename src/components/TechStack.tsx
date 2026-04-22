import * as THREE from "three";
import { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  BallCollider,
  Physics,
  RigidBody,
  RapierRigidBody,
} from "@react-three/rapier";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const imageUrls = [
  "/images/react2.webp",
  "/images/next2.webp",
  "/images/node2.webp",
  "/images/express.webp",
  "/images/mongo.webp",
  "/images/mysql.webp",
  "/images/typescript.webp",
  "/images/javascript.webp",
  "/images/firebase.webp",
  "/images/supabase.png",
  "/images/redis.png",
  "/images/cpp.png",
  "/images/python.png",

  
];

// Preload all textures immediately at module load — not waiting until scroll
useTexture.preload(imageUrls);

// 24 segments — smooth enough to look round, cheaper than original 28
const sphereGeometry = new THREE.SphereGeometry(1, 24, 24);

// One sphere per skill — 9 total, no duplicates
const spheres = imageUrls.map(() => ({
  scale: [0.7, 1, 0.8, 1, 1][Math.floor(Math.random() * 5)],
}));

// Reusable vectors — allocated once, never recreated per frame
const _impulseVec = new THREE.Vector3();
const _translationVec = new THREE.Vector3();
const _pointerVec = new THREE.Vector3();

type SphereProps = {
  scale: number;
  r?: typeof THREE.MathUtils.randFloatSpread;
  material: THREE.MeshStandardMaterial;
  isActive: boolean;
};

function SphereGeo({
  scale,
  r = THREE.MathUtils.randFloatSpread,
  material,
  isActive,
}: SphereProps) {
  const api = useRef<RapierRigidBody | null>(null);

  useFrame((_state, delta) => {
    if (!isActive || !api.current) return;
    delta = Math.min(0.05, delta);
    const t = api.current.translation();
    // Reuse _translationVec and _impulseVec — no GC pressure
    _translationVec.set(t.x, t.y, t.z);
    _impulseVec
      .copy(_translationVec)
      .normalize()
      .multiplyScalar(-150 * delta * scale);
    api.current.applyImpulse(_impulseVec, true);
  });

  return (
    <RigidBody
      linearDamping={0.75}
      angularDamping={0.15}
      friction={0.2}
      position={[r(20), r(20) - 25, r(20) - 10]}
      ref={api}
      colliders={false}
    >
      <BallCollider args={[scale]} />
      {/* Removed CylinderCollider — was extra physics work with no visual benefit */}
      <mesh
        scale={scale}
        geometry={sphereGeometry}
        material={material}
        rotation={[0.3, 1, 1]}
      />
    </RigidBody>
  );
}

function Pointer({ isActive }: { isActive: boolean }) {
  const ref = useRef<RapierRigidBody>(null);

  useFrame(({ pointer, viewport }) => {
    if (!isActive || !ref.current) return;
    // Reuse _pointerVec — no per-frame allocation
    _pointerVec.set(
      (pointer.x * viewport.width) / 2,
      (pointer.y * viewport.height) / 2,
      0
    );
    ref.current.setNextKinematicTranslation(_pointerVec);
  });

  return (
    <RigidBody
      position={[100, 100, 100]}
      type="kinematicPosition"
      colliders={false}
      ref={ref}
    >
      <BallCollider args={[2]} />
    </RigidBody>
  );
}

const TechStackContent = ({ isActive }: { isActive: boolean }) => {
  const textures = useTexture(imageUrls);

  const materials = useMemo(() => {
    return textures.map((texture) => {
      // Anisotropic filtering sharpens textures at glancing angles
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        map: texture,
        emissive: "#ffffff",
        emissiveMap: texture,
        emissiveIntensity: 0.6,  // Restored: makes logo textures pop clearly
        metalness: 0.4,
        roughness: 0.8,
      });
    });
  }, [textures]);

  return (
    <Physics gravity={[0, 0, 0]} paused={!isActive}>
      <Pointer isActive={isActive} />
      {spheres.map((props, i) => (
        <SphereGeo
          key={i}
          {...props}
          material={materials[i]}  // each index maps 1-to-1 with imageUrls
          isActive={isActive}
        />
      ))}
    </Physics>
  );
};

const TechStack = () => {
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Trigger a refresh after a short delay to ensure layout is settled
    // (needed in production builds where CSS may compute later)
    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top 80%",
      end: "bottom top",
      onToggle: (self) => setIsActive(self.isActive),
    });

    ScrollTrigger.refresh();

    return () => {
      clearTimeout(refreshTimeout);
      trigger.kill();
    };
  }, []);

  return (
    <div className="techstack" ref={containerRef} id="techstack">
      <h2> My Techstack</h2>

      {/* Canvas stays mounted always — only physics pauses when off-screen.
          Unmounting/remounting Canvas causes slow WebGL context re-init each time.
          Inline style is a hard fallback for production builds where className
          styles may not be applied before the Canvas measures its container. */}
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, stencil: false, depth: false, antialias: true }}
        camera={{ position: [0, 0, 20], fov: 32.5, near: 1, far: 100 }}
        onCreated={(state) => (state.gl.toneMappingExposure = 1.5)}
        className="tech-canvas"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[20, 20, 25]} intensity={1.5} />
        <directionalLight position={[0, 5, -4]} intensity={2} />
        <Suspense fallback={null}>
          <TechStackContent isActive={isActive} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default TechStack;