import { useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import type { DieFace, PlayerState } from '../../game/types';

function makeWoodTexture(dark = false): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = dark ? '#3a2315' : '#6b4a2c';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    const shade = dark
      ? `rgba(${70 + Math.random() * 40},${35 + Math.random() * 20},${18 + Math.random() * 15},${0.3 + Math.random() * 0.35})`
      : `rgba(${140 + Math.random() * 60},${95 + Math.random() * 35},${55 + Math.random() * 25},${0.25 + Math.random() * 0.35})`;
    ctx.strokeStyle = shade;
    ctx.lineWidth = 0.5 + Math.random() * 1.2;
    ctx.beginPath();
    const y = Math.random() * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(64, y + (Math.random() * 4 - 2), 192, y + (Math.random() * 4 - 2), 256, y);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 4 + Math.random() * 10;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(20,12,6,0.8)');
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

// Simple die face color (for 3D dice inside bowl, no detailed glyph)
function faceColor(face: DieFace): string {
  switch (face) {
    case 'axe': return '#b74b3d';
    case 'arrow': return '#d18a3a';
    case 'helmet': return '#c2a97a';
    case 'shield': return '#8a9aa8';
    case 'steal': return '#7a5fb5';
    case 'earn': return '#d9b44a';
  }
}

export function Table() {
  const tex = useMemo(() => makeWoodTexture(false), []);
  return (
    <group>
      {/* Table top */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[14, 9]} />
        <meshStandardMaterial map={tex} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Table rim */}
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[14.4, 0.16, 9.4]} />
        <meshStandardMaterial color="#1a120d" roughness={1} />
      </mesh>
      {/* Side bands (front/back) */}
      <mesh position={[0, -0.3, 4.6]}>
        <boxGeometry args={[14.4, 0.5, 0.3]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.3, -4.6]}>
        <boxGeometry args={[14.4, 0.5, 0.3]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.95} />
      </mesh>
      {/* Central rune circle */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.55, 0.68, 48]} />
        <meshStandardMaterial color="#c68234" emissive="#c68234" emissiveIntensity={0.35} transparent opacity={0.75} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.013, 0]}>
        <ringGeometry args={[0.22, 0.3, 48]} />
        <meshStandardMaterial color="#b06820" transparent opacity={0.75} />
      </mesh>
      {/* Rune dots around circle */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 0.88;
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[Math.cos(a) * r, 0.014, Math.sin(a) * r]}>
            <circleGeometry args={[0.06, 12]} />
            <meshStandardMaterial color="#c68234" transparent opacity={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}

// A single die inside the bowl — just a small colored cube showing the rolled face color.
function BowlDie({ x, y, z, face, kept, rot }: { x: number; y: number; z: number; face: DieFace; kept: boolean; rot: number }) {
  return (
    <mesh position={[x, y, z]} rotation-y={rot}>
      <boxGeometry args={[0.18, 0.18, 0.18]} />
      <meshStandardMaterial
        color={faceColor(face)}
        emissive={kept ? '#c68234' : '#000000'}
        emissiveIntensity={kept ? 0.45 : 0}
        roughness={0.6}
      />
    </mesh>
  );
}

export function Bowl({ player, x, z }: { player: PlayerState; x: number; z: number }) {
  const tex = useMemo(() => makeWoodTexture(true), []);
  // Arrange 6 dice inside the bowl in a 2x3 grid (only visible when not rolling and initial roll done)
  const showDice = !player.rolling;

  return (
    <group position={[x, 0, z]}>
      {/* Outer bowl body */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.95, 0.72, 0.76, 36, 1, false]} />
        <meshStandardMaterial map={tex} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Inner recess base (darker disc visible from above) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.25, 0]}>
        <circleGeometry args={[0.68, 36]} />
        <meshStandardMaterial color="#150c06" roughness={0.95} />
      </mesh>
      {/* Inner wall (slightly lit) */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.8, 0.68, 0.5, 36, 1, true]} />
        <meshStandardMaterial color="#2a1608" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Top rim highlight */}
      <mesh position={[0, 0.76, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.78, 0.95, 36]} />
        <meshStandardMaterial color="#6a4222" roughness={0.6} />
      </mesh>
      {/* 6 dice inside */}
      {showDice && player.dice.map((d, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const dx = (col - 1) * 0.3;
        const dz = (row - 0.5) * 0.3;
        const rot = ((d.id * 37) % 100) / 100 * 0.4;
        return <BowlDie key={i} x={dx} y={0.38} z={dz} face={d.face} kept={d.kept} rot={rot} />;
      })}
    </group>
  );
}

// Cup that descends to cover bowl when rolling, hidden otherwise.
export function Cup({ player, x, z }: { player: PlayerState; x: number; z: number }) {
  const tex = useMemo(() => makeWoodTexture(true), []);
  const rolling = player.rolling;

  const spring = useSpring({
    y: rolling ? 0.78 : 6.5,
    config: { tension: 220, friction: 22 },
  });

  const shake = useSpring({
    from: { sx: 0 },
    to: async (next) => {
      if (rolling) {
        for (let i = 0; i < 14; i++) {
          await next({ sx: (Math.random() - 0.5) * 0.08 });
        }
        await next({ sx: 0 });
      } else {
        await next({ sx: 0 });
      }
    },
    config: { tension: 500, friction: 14 },
    reset: rolling,
  });

  // Skip rendering entirely when not rolling (cheaper than animating)
  if (!rolling) return null;

  return (
    <animated.group position-x={x} position-z={z} position-y={spring.y}>
      <animated.group position-x={shake.sx}>
        <mesh>
          <cylinderGeometry args={[0.72, 0.98, 0.9, 36]} />
          <meshStandardMaterial map={tex} roughness={0.8} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.47, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.08, 36]} />
          <meshStandardMaterial color="#3a2412" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.52, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.25, 0.34, 32]} />
          <meshStandardMaterial color="#c68234" emissive="#c68234" emissiveIntensity={0.5} transparent opacity={0.9} />
        </mesh>
      </animated.group>
    </animated.group>
  );
}
