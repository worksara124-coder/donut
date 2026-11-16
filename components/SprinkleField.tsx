"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLORS = ["#fff8e7", "#fbeb93", "#7fd3ff", "#ffd23f", "#47210f", "#ffb3cf"];
const COUNT = 70;

function Sprinkles() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        // deterministic pseudo-random layout
        const r = (n: number) => {
          const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          x: (r(1) - 0.5) * 16,
          y: (r(2) - 0.5) * 9,
          z: -r(3) * 6,
          rx: r(4) * Math.PI,
          rz: r(5) * Math.PI,
          speed: 0.15 + r(6) * 0.35,
          scale: 0.6 + r(7) * 0.9,
          color: COLORS[Math.floor(r(8) * COLORS.length)],
        };
      }),
    [],
  );

  const colored = useRef(false);
  useFrame(({ clock, pointer }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    seeds.forEach((s, i) => {
      // slow fall, wrapping top to bottom
      const y = ((((s.y - t * s.speed * 0.6 + 4.5) % 9) + 9) % 9) - 4.5;
      dummy.position.set(s.x + Math.sin(t * s.speed + i) * 0.3, y, s.z);
      dummy.rotation.set(s.rx + t * s.speed, t * s.speed * 0.6, s.rz + t * s.speed * 0.8);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (!colored.current) m.setColorAt(i, new THREE.Color(s.color));
    });
    if (!colored.current && m.instanceColor) {
      m.instanceColor.needsUpdate = true;
      colored.current = true;
    }
    m.instanceMatrix.needsUpdate = true;
    if (group.current) {
      group.current.rotation.y += (pointer.x * 0.12 - group.current.rotation.y) * 0.04;
      group.current.rotation.x += (-pointer.y * 0.08 - group.current.rotation.x) * 0.04;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <capsuleGeometry args={[0.07, 0.34, 4, 10]} />
        <meshStandardMaterial roughness={0.35} metalness={0} />
      </instancedMesh>
    </group>
  );
}

/** Real 3D sprinkles (instanced capsules) drifting behind the brand story. */
export default function SprinkleField({ paused }: { paused: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={paused ? "never" : "always"}
      camera={{ position: [0, 0, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <Sprinkles />
    </Canvas>
  );
}
