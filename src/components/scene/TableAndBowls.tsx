import { useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import type { DieFace, PlayerState } from '../../game/types';

function strokePath(ctx: CanvasRenderingContext2D, draw: () => void) {
  ctx.beginPath();
  draw();
  ctx.stroke();
}

function fillStrokePath(ctx: CanvasRenderingContext2D, fillOpacity: number, draw: () => void) {
  ctx.beginPath();
  draw();
  ctx.save();
  ctx.globalAlpha = fillOpacity;
  ctx.fill();
  ctx.restore();
  ctx.stroke();
}

function fillCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fillOpacity = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.save();
  ctx.globalAlpha = fillOpacity;
  ctx.fill();
  ctx.restore();
}

function drawDieFaceGlyph(ctx: CanvasRenderingContext2D, face: DieFace) {
  // Match DieFaceIcon's 32x32 SVG viewBox, scaled to the 128px texture.
  ctx.save();
  ctx.scale(4, 4);
  ctx.strokeStyle = '#2a1606';
  ctx.fillStyle = '#2a1606';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (face) {
    case 'axe':
      strokePath(ctx, () => {
        ctx.moveTo(8, 20);
        ctx.lineTo(22, 6);
      });
      fillStrokePath(ctx, 0.8, () => {
        ctx.moveTo(18, 4);
        ctx.bezierCurveTo(25, 4, 28, 9, 26, 15);
        ctx.bezierCurveTo(22, 11, 17, 10, 15, 12);
        ctx.closePath();
      });
      fillCircle(ctx, 8, 20, 1.4);
      strokePath(ctx, () => {
        ctx.moveTo(8, 20);
        ctx.lineTo(6, 26);
      });
      break;
    case 'arrow':
      strokePath(ctx, () => {
        ctx.moveTo(6, 26);
        ctx.lineTo(26, 6);
      });
      strokePath(ctx, () => {
        ctx.moveTo(20, 6);
        ctx.lineTo(26, 6);
        ctx.lineTo(26, 12);
      });
      fillStrokePath(ctx, 0.7, () => {
        ctx.moveTo(6, 26);
        ctx.lineTo(10, 24);
        ctx.lineTo(8, 28);
        ctx.closePath();
      });
      break;
    case 'helmet':
      fillStrokePath(ctx, 0.15, () => {
        ctx.moveTo(6, 18);
        ctx.bezierCurveTo(6, 11, 10, 6, 16, 6);
        ctx.bezierCurveTo(22, 6, 26, 11, 26, 18);
        ctx.lineTo(26, 22);
        ctx.lineTo(6, 22);
        ctx.closePath();
      });
      strokePath(ctx, () => {
        ctx.moveTo(16, 8);
        ctx.lineTo(16, 22);
      });
      fillCircle(ctx, 11, 16, 1.1);
      fillCircle(ctx, 21, 16, 1.1);
      break;
    case 'shield':
      fillStrokePath(ctx, 0.15, () => {
        ctx.moveTo(16, 5);
        ctx.lineTo(26, 9);
        ctx.lineTo(26, 17);
        ctx.bezierCurveTo(26, 23, 21, 27, 16, 28);
        ctx.bezierCurveTo(11, 27, 6, 23, 6, 17);
        ctx.lineTo(6, 9);
        ctx.closePath();
      });
      strokePath(ctx, () => {
        ctx.moveTo(16, 5);
        ctx.lineTo(16, 28);
      });
      strokePath(ctx, () => {
        ctx.moveTo(6, 14);
        ctx.lineTo(26, 14);
      });
      break;
    case 'steal':
      ctx.beginPath();
      ctx.arc(21, 12, 4, 0, Math.PI * 2);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.restore();
      ctx.stroke();
      strokePath(ctx, () => {
        ctx.moveTo(6, 24);
        ctx.bezierCurveTo(8, 18, 12, 17, 17, 19);
        ctx.bezierCurveTo(20, 20, 22, 22, 22, 25);
      });
      strokePath(ctx, () => {
        ctx.moveTo(9, 18);
        ctx.lineTo(9, 13);
      });
      strokePath(ctx, () => {
        ctx.moveTo(12, 17);
        ctx.lineTo(12, 11);
      });
      strokePath(ctx, () => {
        ctx.moveTo(15, 17);
        ctx.lineTo(15, 12);
      });
      break;
    case 'earn':
      fillStrokePath(ctx, 0.2, () => {
        ctx.moveTo(16, 5);
        ctx.lineTo(26, 16);
        ctx.lineTo(16, 27);
        ctx.lineTo(6, 16);
        ctx.closePath();
      });
      strokePath(ctx, () => {
        ctx.moveTo(16, 9);
        ctx.lineTo(16, 23);
      });
      strokePath(ctx, () => {
        ctx.moveTo(10, 16);
        ctx.lineTo(22, 16);
      });
      strokePath(ctx, () => {
        ctx.moveTo(13, 13);
        ctx.lineTo(19, 19);
      });
      break;
  }
  ctx.restore();
}

// Generate a canvas texture for a dice face glyph (drawn over bone-white background).
function makeFaceTexture(face: DieFace): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  // Aged bone background
  const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 80);
  grd.addColorStop(0, '#f0e2c0');
  grd.addColorStop(1, '#bfae8b');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  // Subtle border
  ctx.strokeStyle = 'rgba(40,20,8,0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 120, 120);
  drawDieFaceGlyph(ctx, face);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// Cache textures per face — generated once.
const FACE_TEX_CACHE = new Map<DieFace, THREE.Texture>();
function getFaceTexture(face: DieFace): THREE.Texture {
  let t = FACE_TEX_CACHE.get(face);
  if (!t) {
    t = makeFaceTexture(face);
    FACE_TEX_CACHE.set(face, t);
  }
  return t;
}

function makeWoodTexture(dark = false): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = dark ? '#3a2315' : '#6b4a2c';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    ctx.strokeStyle = dark
      ? `rgba(${70 + Math.random() * 40},${35 + Math.random() * 20},${18 + Math.random() * 15},${0.3 + Math.random() * 0.35})`
      : `rgba(${140 + Math.random() * 60},${95 + Math.random() * 35},${55 + Math.random() * 25},${0.25 + Math.random() * 0.35})`;
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
// A single die inside the bowl — top face has glyph texture, sides colored.
function BowlDie({ x, y, z, face, kept, rot }: { x: number; y: number; z: number; face: DieFace; kept: boolean; rot: number }) {
  const topTex = getFaceTexture(face);
  const sideColor = faceColor(face);
  const emissiveColor = kept ? '#c68234' : '#000000';
  const emissiveSide = kept ? 0.5 : 0.05;
  const emissiveTop = kept ? 0.45 : 0.05;
  const size = kept ? 0.42 : 0.4;

  const materials = useMemo(() => {
    const sideMat = new THREE.MeshStandardMaterial({
      color: sideColor,
      emissive: new THREE.Color(emissiveColor),
      emissiveIntensity: emissiveSide,
      roughness: 0.55,
      metalness: 0.05,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      emissive: new THREE.Color(emissiveColor),
      emissiveIntensity: emissiveTop,
      roughness: 0.5,
      metalness: 0.0,
    });
    // Order: +X, -X, +Y(top), -Y(bottom), +Z, -Z
    return [
      sideMat.clone(),
      sideMat.clone(),
      topMat,
      sideMat.clone(),
      sideMat.clone(),
      sideMat.clone(),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideColor, topTex, kept]);

  return (
    <mesh position={[x, y, z]} rotation-y={rot} material={materials}>
      <boxGeometry args={[size, size, size]} />
    </mesh>
  );
}

export function Bowl({
  player,
  x,
  z,
  isDieVisible,
}: {
  player: PlayerState;
  x: number;
  z: number;
  isDieVisible?: (die: PlayerState['dice'][number]) => boolean;
}) {
  const tex = useMemo(() => makeWoodTexture(true), []);
  const lockedDice = player.dice.filter((d) => d.kept);

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
      {/* 6 dice inside (2 rows of 3) - sit visible above bowl rim */}
      {player.dice.map((d, i) => {
        if (d.kept) return null;
        const visible = isDieVisible ? isDieVisible(d) : !player.rolling;
        if (!visible) return null;
        const col = i % 3;
        const row = Math.floor(i / 3);
        const dx = (col - 1) * 0.42;
        const dz = (row - 0.5) * 0.42;
        const rot = ((d.id * 37) % 100) / 100 * 0.4 - 0.2;
        return <BowlDie key={i} x={dx} y={0.95} z={dz} face={d.face} kept={d.kept || d.selected} rot={rot} />;
      })}
      {/* Locked dice are removed from the bowl and placed beside it, visible to both players. */}
      {lockedDice.map((d, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const dx = 1.35 + col * 0.46;
        const dz = (row - 0.5) * 0.46;
        const rot = ((d.id * 53) % 100) / 100 * 0.35 - 0.18;
        return <BowlDie key={`locked-${d.id}`} x={dx} y={0.24} z={dz} face={d.face} kept rot={rot} />;
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
