import { useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import type { PlayerState } from '../../game/types';

// Render a procedural wood + stone table, two bowls with lids (cups) that lift/cover during rolls.
// The actual dice face display happens in the 2D overlay — the 3D scene sells the "dice in bowl" illusion.

function makeWoodTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  // Base
  ctx.fillStyle = '#3b2a1e';
  ctx.fillRect(0, 0, 256, 256);
  // Horizontal grain
  for (let i = 0; i < 200; i++) {
    ctx.strokeStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 30},${30 + Math.random() * 20},${0.2 + Math.random() * 0.3})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.2;
    ctx.beginPath();
    const y = Math.random() * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(64, y + (Math.random() * 4 - 2), 192, y + (Math.random() * 4 - 2), 256, y);
    ctx.stroke();
  }
  // Darker knots
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 4 + Math.random() * 10;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(20,12,6,0.9)');
    grd.addColorStop(1, 'rgba(30,20,12,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.needsUpdate = true;
  return t;
}

function makeDarkWoodTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = `rgba(${60 + Math.random() * 40},${30 + Math.random() * 20},${15 + Math.random() * 15},${0.3 + Math.random() * 0.3})`;
    ctx.lineWidth = 0.4 + Math.random();
    ctx.beginPath();
    const y = Math.random() * 128;
    ctx.moveTo(0, y);
    ctx.lineTo(128, y + (Math.random() * 3 - 1.5));
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  t.needsUpdate = true;
  return t;
}

export function Table() {
  const tex = useMemo(() => makeWoodTexture(), []);
  return (
    <group>
      {/* Table top */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial map={tex} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Table border (stone rim) */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[10.4, 0.1, 6.4]} />
        <meshStandardMaterial color="#1a120d" roughness={1} />
      </mesh>
      {/* Runic circle engraved between bowls */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.9, 1.1, 48]} />
        <meshStandardMaterial color="#c68234" emissive="#c68234" emissiveIntensity={0.15} transparent opacity={0.6} roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.011, 0]}>
        <ringGeometry args={[0.55, 0.62, 48]} />
        <meshStandardMaterial color="#8a5a1f" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

export function Bowl({ x, z }: { x: number; z: number }) {
  const tex = useMemo(() => makeDarkWoodTexture(), []);
  return (
    <group position={[x, 0, z]}>
      {/* Outer bowl */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[1.1, 0.85, 0.8, 40, 1, false]} />
        <meshStandardMaterial map={tex} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Inner recess (darker) */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.95, 0.75, 0.55, 40, 1, false]} />
        <meshStandardMaterial color="#1a0f08" roughness={0.9} />
      </mesh>
      {/* Rim highlight */}
      <mesh position={[0, 0.82, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.9, 1.1, 40]} />
        <meshStandardMaterial color="#5b3a1f" roughness={0.6} />
      </mesh>
    </group>
  );
}

// Cup / hand covering the bowl while rolling.
// Pseudo-hand: a dome shaped mesh that lifts up and sideways, with shake animation.
export function Cup({
  player,
  x,
  z,
}: {
  player: PlayerState;
  x: number;
  z: number;
}) {
  const tex = useMemo(() => makeDarkWoodTexture(), []);
  const rolling = player.rolling;

  const spring = useSpring({
    // covering = low over the bowl; idle = lifted up off-table
    y: rolling ? 0.78 : 2.2,
    tilt: rolling ? 0 : 0.9,
    config: { tension: 180, friction: 18 },
  });

  // Shake effect via small animated oscillation (driven manually when rolling)
  const shake = useSpring({
    from: { sx: 0 },
    to: async (next) => {
      if (rolling) {
        for (let i = 0; i < 14; i++) {
          await next({ sx: (Math.random() - 0.5) * 0.1 });
        }
        await next({ sx: 0 });
      } else {
        await next({ sx: 0 });
      }
    },
    config: { tension: 500, friction: 14 },
    reset: rolling,
  });

  return (
    <animated.group
      position-x={x}
      position-z={z}
      position-y={spring.y}
      rotation-x={spring.tilt}
    >
      <animated.group position-x={shake.sx}>
        {/* Inverted cup / hand dome */}
        <mesh rotation-x={Math.PI}>
          <cylinderGeometry args={[0.85, 1.2, 1.2, 40, 1, true]} />
          <meshStandardMaterial map={tex} color="#6a4a30" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
        {/* Top cap */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.1, 40]} />
          <meshStandardMaterial color="#4a3020" roughness={0.8} />
        </mesh>
        {/* Rune carving on top */}
        <mesh position={[0, 0.66, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.35, 0.45, 32]} />
          <meshStandardMaterial color="#c68234" emissive="#c68234" emissiveIntensity={0.25} transparent opacity={0.7} />
        </mesh>
      </animated.group>
    </animated.group>
  );
}
