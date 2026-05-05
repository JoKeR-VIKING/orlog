import { useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { PHYSICAL_DICE } from '../../game/types';
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

function traceDieFaceGlyph(ctx: CanvasRenderingContext2D, face: DieFace) {
  // Match DieFaceIcon's 32x32 SVG viewBox, scaled to the 128px texture.
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
      fillStrokePath(ctx, 0.95, () => {
        ctx.moveTo(9.8, 24.8);
        ctx.bezierCurveTo(7.7, 23.7, 6.7, 21.3, 7.4, 19.2);
        ctx.bezierCurveTo(8.1, 17.2, 10.2, 16.1, 12.2, 16.5);
        ctx.lineTo(12.1, 10.5);
        ctx.bezierCurveTo(12.1, 9.4, 13, 8.5, 14.1, 8.5);
        ctx.bezierCurveTo(15.2, 8.5, 16.1, 9.4, 16.1, 10.5);
        ctx.lineTo(16.1, 15.1);
        ctx.lineTo(17.7, 15.1);
        ctx.lineTo(17.7, 11.7);
        ctx.bezierCurveTo(17.7, 10.8, 18.4, 10, 19.4, 10);
        ctx.bezierCurveTo(20.3, 10, 21.1, 10.8, 21.1, 11.7);
        ctx.lineTo(21.1, 15.9);
        ctx.lineTo(22.3, 16.5);
        ctx.lineTo(23.1, 14.2);
        ctx.bezierCurveTo(23.5, 13.3, 24.6, 12.9, 25.5, 13.3);
        ctx.bezierCurveTo(26.4, 13.7, 26.8, 14.7, 26.5, 15.6);
        ctx.lineTo(24.9, 20.6);
        ctx.bezierCurveTo(24.2, 22.8, 22.5, 24.5, 20.4, 25.3);
        ctx.lineTo(16.8, 26.6);
        ctx.bezierCurveTo(14.5, 27.4, 11.9, 26.9, 9.8, 24.8);
        ctx.closePath();
      });
      strokePath(ctx, () => {
        ctx.moveTo(10.4, 8.6);
        ctx.bezierCurveTo(8.9, 7.3, 7.6, 6.9, 6.3, 6.8);
      });
      strokePath(ctx, () => {
        ctx.moveTo(13.4, 6.8);
        ctx.bezierCurveTo(12.2, 5.1, 10.8, 4.3, 9.2, 3.9);
      });
      strokePath(ctx, () => {
        ctx.moveTo(16.6, 6.1);
        ctx.bezierCurveTo(15.9, 4.4, 14.8, 3.1, 13.5, 2.1);
      });
      break;
  }
}

function drawDieFaceGlyph(ctx: CanvasRenderingContext2D, face: DieFace) {
  ctx.save();
  ctx.translate(13, 13);
  ctx.scale(3.15, 3.15);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2a1606';
  ctx.fillStyle = '#2a1606';
  ctx.lineWidth = face === 'steal' ? 1.5 : 1.65;
  traceDieFaceGlyph(ctx, face);
  ctx.restore();
}

// Generate a canvas texture for a simpler readable dice face.
function makeFaceTexture(face: DieFace, grantsFavor: boolean): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 80);
  grd.addColorStop(0, '#f0e2c0');
  grd.addColorStop(1, '#bfae8b');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(40,20,8,0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 120, 120);
  if (grantsFavor) {
    ctx.save();
    ctx.strokeStyle = '#f2b84f';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 108, 108);
    ctx.strokeStyle = 'rgba(42,22,6,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 92, 92);
    ctx.restore();
  }
  drawDieFaceGlyph(ctx, face);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// Cache textures per face — generated once.
const FACE_TEX_CACHE = new Map<string, THREE.Texture>();
function getFaceTexture(face: DieFace, grantsFavor: boolean): THREE.Texture {
  const key = `${face}:${grantsFavor ? 'favor' : 'plain'}`;
  let t = FACE_TEX_CACHE.get(key);
  if (!t) {
    t = makeFaceTexture(face, grantsFavor);
    FACE_TEX_CACHE.set(key, t);
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

const TOP_SIDE_LAYOUTS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [3, 2, 0, 1, 4, 5],
  [2, 3, 1, 0, 4, 5],
  [0, 1, 2, 3, 4, 5],
  [1, 0, 3, 2, 4, 5],
  [0, 1, 4, 5, 3, 2],
  [0, 1, 5, 4, 2, 3],
];

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

// A single die inside the bowl — top face reflects the rolled result, while the
// other faces also show glyph textures from that die's physical face layout.
export function BowlDie({
  x,
  y,
  z,
  dieId,
  sideIndex,
  rot,
}: {
  x: number;
  y: number;
  z: number;
  dieId: number;
  sideIndex: number;
  rot: number;
}) {
  const size = 0.4;

  const materials = useMemo(() => {
    const physicalSides = PHYSICAL_DICE[dieId] ?? PHYSICAL_DICE[0];
    const layout = TOP_SIDE_LAYOUTS[sideIndex] ?? TOP_SIDE_LAYOUTS[2];
    return layout.map((physicalSideIndex) => {
      const side = physicalSides[physicalSideIndex];
      return new THREE.MeshStandardMaterial({
        map: getFaceTexture(side.face, side.grantsFavor),
        color: '#f2e5c7',
        emissive: new THREE.Color(side.grantsFavor ? '#5a3510' : '#000000'),
        emissiveIntensity: side.grantsFavor ? 0.06 : 0.02,
        roughness: 0.52,
        metalness: 0.03,
      });
    });
  }, [dieId, sideIndex]);

  const tiltX = ((dieId * 29) % 100) / 100 * 0.22 - 0.11;
  const tiltZ = ((dieId * 17) % 100) / 100 * 0.22 - 0.11;

  return (
    <mesh position={[x, y, z]} rotation={[tiltX, rot, tiltZ]} material={materials}>
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
        return <BowlDie key={i} x={dx} y={0.95} z={dz} dieId={d.id} sideIndex={d.sideIndex} rot={rot} />;
      })}
      {/* Locked dice are removed from the bowl and placed beside it, visible to both players. */}
      {lockedDice.map((d, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const dx = 1.35 + col * 0.46;
        const dz = (row - 0.5) * 0.46;
        const rot = ((d.id * 53) % 100) / 100 * 0.35 - 0.18;
        return <BowlDie key={`locked-${d.id}`} x={dx} y={0.24} z={dz} dieId={d.id} sideIndex={d.sideIndex} rot={rot} />;
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
