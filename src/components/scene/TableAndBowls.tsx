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
  // Match DieFaceIcon's 32x32 SVG viewBox, scaled to the generated texture.
  switch (face) {
    case 'axe':
      strokePath(ctx, () => {
        ctx.moveTo(9, 25);
        ctx.lineTo(21, 5);
      });
      fillStrokePath(ctx, 0.8, () => {
        ctx.moveTo(19, 4);
        ctx.bezierCurveTo(26, 4, 29, 9, 26, 15);
        ctx.bezierCurveTo(23, 12, 19, 11, 16, 13);
        ctx.bezierCurveTo(17, 9, 18, 6, 19, 4);
        ctx.closePath();
      });
      fillStrokePath(ctx, 0.45, () => {
        ctx.moveTo(16, 13);
        ctx.bezierCurveTo(12, 12, 10, 10, 10, 7);
        ctx.bezierCurveTo(14, 7, 17, 9, 18, 11);
        ctx.closePath();
      });
      fillCircle(ctx, 9, 25, 1.5);
      strokePath(ctx, () => {
        ctx.moveTo(12, 20);
        ctx.lineTo(7, 19);
      });
      break;
    case 'arrow':
      strokePath(ctx, () => {
        ctx.moveTo(5, 16);
        ctx.lineTo(24, 16);
      });
      fillStrokePath(ctx, 0.82, () => {
        ctx.moveTo(24, 10);
        ctx.lineTo(29, 16);
        ctx.lineTo(24, 22);
        ctx.closePath();
      });
      strokePath(ctx, () => {
        ctx.moveTo(8, 16);
        ctx.lineTo(4, 11);
        ctx.moveTo(8, 16);
        ctx.lineTo(4, 21);
        ctx.moveTo(11, 16);
        ctx.lineTo(7, 12);
        ctx.moveTo(11, 16);
        ctx.lineTo(7, 20);
      });
      break;
    case 'helmet':
      fillStrokePath(ctx, 0.2, () => {
        ctx.moveTo(7, 17);
        ctx.bezierCurveTo(8, 10, 11, 6, 16, 6);
        ctx.bezierCurveTo(21, 6, 24, 10, 25, 17);
        ctx.lineTo(24, 22);
        ctx.lineTo(8, 22);
        ctx.closePath();
      });
      strokePath(ctx, () => {
        ctx.moveTo(7, 17);
        ctx.lineTo(25, 17);
        ctx.moveTo(16, 8);
        ctx.lineTo(16, 24);
        ctx.moveTo(10, 17);
        ctx.lineTo(8, 24);
        ctx.moveTo(22, 17);
        ctx.lineTo(24, 24);
      });
      strokePath(ctx, () => {
        ctx.moveTo(9, 12);
        ctx.bezierCurveTo(6, 9, 5, 7, 4, 5);
        ctx.moveTo(23, 12);
        ctx.bezierCurveTo(26, 9, 27, 7, 28, 5);
      });
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
  ctx.translate(38, 38);
  ctx.scale(5.65, 5.65);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255, 236, 188, 0.45)';
  ctx.shadowBlur = 0.7;
  ctx.shadowOffsetX = -0.35;
  ctx.shadowOffsetY = -0.35;
  ctx.strokeStyle = '#2a1606';
  ctx.fillStyle = '#2a1606';
  ctx.lineWidth = face === 'steal' ? 1.35 : 1.55;
  traceDieFaceGlyph(ctx, face);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.34)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0.35;
  ctx.shadowOffsetY = 0.45;
  ctx.globalAlpha = 0.28;
  traceDieFaceGlyph(ctx, face);
  ctx.restore();
}

// Generate a canvas texture for a simpler readable dice face.
function makeFaceTexture(face: DieFace, grantsFavor: boolean): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const grd = ctx.createRadialGradient(96, 78, 8, 128, 128, 170);
  grd.addColorStop(0, '#fff2cf');
  grd.addColorStop(0.45, '#e9d7ad');
  grd.addColorStop(1, '#a9946c');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const a = 0.035 + Math.random() * 0.055;
    ctx.fillStyle = `rgba(69, 43, 20, ${a})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
  }
  ctx.strokeStyle = 'rgba(40,20,8,0.45)';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 240, 240);
  ctx.strokeStyle = 'rgba(255,245,210,0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 220, 220);
  if (grantsFavor) {
    ctx.save();
    ctx.strokeStyle = '#f2b84f';
    ctx.lineWidth = 22;
    ctx.strokeRect(20, 20, 216, 216);
    ctx.strokeStyle = 'rgba(42,22,6,0.9)';
    ctx.lineWidth = 5;
    ctx.strokeRect(34, 34, 188, 188);
    ctx.restore();
  }
  drawDieFaceGlyph(ctx, face);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
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
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d')!;
  const base = ctx.createLinearGradient(0, 0, 512, 512);
  base.addColorStop(0, dark ? '#241309' : '#50321f');
  base.addColorStop(0.52, dark ? '#4a2b16' : '#855a34');
  base.addColorStop(1, dark ? '#1b0e07' : '#2e1b11');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 560; i++) {
    ctx.strokeStyle = dark
      ? `rgba(${80 + Math.random() * 48},${42 + Math.random() * 26},${19 + Math.random() * 18},${0.22 + Math.random() * 0.38})`
      : `rgba(${145 + Math.random() * 70},${96 + Math.random() * 42},${52 + Math.random() * 30},${0.18 + Math.random() * 0.36})`;
    ctx.lineWidth = 0.45 + Math.random() * 1.7;
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(128, y + (Math.random() * 10 - 5), 384, y + (Math.random() * 10 - 5), 512, y);
    ctx.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 8 + Math.random() * 22;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(20,12,6,0.8)');
    grd.addColorStop(1, 'rgba(30,20,12,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.5, 2.5);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function makeTablePatternTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, c.width, c.height);
  const wash = ctx.createRadialGradient(512, 320, 20, 512, 320, 560);
  wash.addColorStop(0, 'rgba(194, 116, 42, 0.18)');
  wash.addColorStop(0.56, 'rgba(94, 45, 18, 0.08)');
  wash.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(24, 10, 4, 0.72)';
  ctx.fillStyle = 'rgba(24, 10, 4, 0.58)';

  function strokeRect(x: number, y: number, w: number, h: number, width: number, alpha = 0.72) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function rune(x: number, y: number, s: number, flip = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip * s, s);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.moveTo(0, -4);
    ctx.lineTo(15, -16);
    ctx.moveTo(0, 4);
    ctx.lineTo(14, 16);
    ctx.stroke();
    ctx.restore();
  }

  function knotCorner(x: number, y: number, sx: 1 | -1, sy: 1 | -1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.lineWidth = 7;
    for (let i = 0; i < 3; i++) {
      const o = i * 26;
      ctx.beginPath();
      ctx.moveTo(0, 72 + o);
      ctx.bezierCurveTo(45, 70 + o, 45, 22 + o, 86, 22 + o);
      ctx.bezierCurveTo(122, 22 + o, 122, 72 + o, 84, 72 + o);
      ctx.bezierCurveTo(40, 72 + o, 43, 118 + o, 2, 118 + o);
      ctx.stroke();
    }
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.52;
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.lineTo(138, 18);
    ctx.moveTo(18, 18);
    ctx.lineTo(18, 138);
    ctx.stroke();
    ctx.restore();
  }

  strokeRect(44, 44, 936, 552, 8, 0.62);
  strokeRect(78, 78, 868, 484, 3, 0.48);
  strokeRect(112, 112, 800, 416, 2, 0.36);

  knotCorner(72, 72, 1, 1);
  knotCorner(952, 72, -1, 1);
  knotCorner(72, 568, 1, -1);
  knotCorner(952, 568, -1, -1);

  ctx.lineWidth = 4;
  for (let i = 0; i < 18; i++) {
    const x = 150 + i * 43;
    rune(x, 72, 0.62, i % 2 === 0 ? 1 : -1);
    rune(x, 568, 0.62, i % 2 === 0 ? -1 : 1);
  }
  for (let i = 0; i < 9; i++) {
    const y = 150 + i * 43;
    rune(58, y, 0.52, i % 2 === 0 ? 1 : -1);
    rune(966, y, 0.52, i % 2 === 0 ? -1 : 1);
  }

  ctx.save();
  ctx.translate(512, 320);
  ctx.lineWidth = 7;
  ctx.globalAlpha = 0.72;
  ctx.beginPath();
  ctx.arc(0, 0, 120, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    rune(0, -154, 0.46, i % 2 === 0 ? 1 : -1);
    ctx.restore();
  }
  ctx.restore();

  for (let i = 0; i < 44; i++) {
    const x = 160 + ((i * 193) % 704);
    const y = 135 + ((i * 97) % 370);
    const len = 18 + (i % 5) * 10;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((i % 9) - 4) * 0.12);
    ctx.globalAlpha = 0.18 + (i % 3) * 0.04;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();
    ctx.restore();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
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

const BOWL_DIE_Y = 0.72;

const TABLE_PLANKS = [
  '#3b2112',
  '#4b2a16',
  '#2f1a0f',
  '#56311a',
  '#412313',
  '#4f2e18',
  '#352012',
  '#5a351d',
  '#3d2313',
  '#472817',
  '#54321d',
  '#321d11',
] as const;

function TableRuneSegment({
  x,
  z,
  length,
  angle = 0,
  color = '#1b0d06',
}: {
  x: number;
  z: number;
  length: number;
  angle?: number;
  color?: string;
}) {
  return (
    <mesh position={[x, 0.118, z]} rotation-y={angle}>
      <boxGeometry args={[0.035, 0.01, length]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12} roughness={0.9} />
    </mesh>
  );
}

function TableRune({
  x,
  z,
  scale = 1,
  flip = 1,
  color = '#1b0d06',
}: {
  x: number;
  z: number;
  scale?: number;
  flip?: 1 | -1;
  color?: string;
}) {
  return (
    <group>
      <TableRuneSegment x={x} z={z} length={0.46 * scale} color={color} />
      <TableRuneSegment x={x + 0.1 * flip * scale} z={z - 0.09 * scale} length={0.28 * scale} angle={0.75 * flip} color={color} />
      <TableRuneSegment x={x + 0.11 * flip * scale} z={z + 0.08 * scale} length={0.26 * scale} angle={-0.65 * flip} color={color} />
    </group>
  );
}

function RunicBurnMarks() {
  return (
    <group>
      <TableRune x={-4.85} z={-3.0} scale={0.9} color="#241007" />
      <TableRune x={-2.3} z={2.7} scale={0.75} flip={-1} />
      <TableRune x={2.7} z={-2.7} scale={0.82} />
      <TableRune x={4.9} z={2.55} scale={0.72} flip={-1} />
      <TableRuneSegment x={-5.8} z={1.9} length={0.42} angle={-0.34} color="#2a1308" />
      <TableRuneSegment x={5.9} z={-1.8} length={0.5} angle={0.28} color="#2a1308" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const radius = 1.12;
        return (
          <group key={i} rotation-y={-a} position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}>
            <TableRune x={0} z={0} scale={0.42} flip={i % 2 === 0 ? 1 : -1} />
          </group>
        );
      })}
    </group>
  );
}

function TablePlanks() {
  const plankWidth = 14 / TABLE_PLANKS.length;
  return (
    <group>
      {TABLE_PLANKS.map((color, i) => {
        const x = -7 + plankWidth * (i + 0.5);
        const height = 0.052 + (i % 4) * 0.006;
        return (
          <group key={i}>
            <mesh position={[x, 0.018 + height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[plankWidth - 0.035, height, 8.88]} />
              <meshStandardMaterial
                color={color}
                emissive="#120905"
                emissiveIntensity={0.06}
                roughness={0.82}
                metalness={0.01}
              />
            </mesh>
            {Array.from({ length: 5 }).map((_, grainIndex) => {
              const gx = x - plankWidth * 0.34 + grainIndex * plankWidth * 0.15 + ((i + grainIndex) % 3) * 0.015;
              const gz = -3.2 + ((i * 7 + grainIndex * 5) % 9) * 0.78;
              return (
                <mesh key={grainIndex} position={[gx, 0.052 + height, gz]} rotation-y={((i + grainIndex) % 5 - 2) * 0.025}>
                  <boxGeometry args={[0.012, 0.006, 0.85 + ((i + grainIndex) % 4) * 0.28]} />
                  <meshStandardMaterial color="#1d0d06" roughness={0.95} />
                </mesh>
              );
            })}
            {i % 3 === 0 && (
              <mesh position={[x - plankWidth * 0.2, 0.055 + height, -2.6 + (i % 5) * 1.2]} rotation-x={-Math.PI / 2}>
                <circleGeometry args={[0.1 + (i % 4) * 0.025, 18]} />
                <meshStandardMaterial color="#1f0e06" roughness={0.95} />
              </mesh>
            )}
          </group>
        );
      })}
      {Array.from({ length: TABLE_PLANKS.length + 1 }).map((_, i) => {
        const x = -7 + i * plankWidth;
        return (
          <mesh key={i} position={[x, 0.072, 0]}>
            <boxGeometry args={[0.035, 0.026, 8.9]} />
            <meshStandardMaterial color="#120805" roughness={0.95} />
          </mesh>
        );
      })}
      {Array.from({ length: 4 }).map((_, i) => {
        const z = -3.55 + i * 2.35;
        return (
          <mesh key={i} position={[0, 0.076, z]}>
            <boxGeometry args={[13.95, 0.012, 0.025]} />
            <meshStandardMaterial color="#1b0d06" roughness={0.95} />
          </mesh>
        );
      })}
      <RunicBurnMarks />
    </group>
  );
}

export function Table() {
  const tex = useMemo(() => makeWoodTexture(false), []);
  const patternTex = useMemo(() => makeTablePatternTexture(), []);
  return (
    <group>
      {/* Table top */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[14, 9]} />
        <meshStandardMaterial
          map={tex}
          color="#4a2915"
          emissive="#120805"
          emissiveIntensity={0.05}
          roughness={0.86}
          metalness={0.02}
        />
      </mesh>
      <TablePlanks />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.13, 0]}>
        <planeGeometry args={[13.25, 8.15]} />
        <meshBasicMaterial map={patternTex} transparent opacity={0.92} depthWrite={false} />
      </mesh>
      {/* Table rim */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[14.4, 0.16, 9.4]} />
        <meshStandardMaterial color="#1c1009" emissive="#120805" emissiveIntensity={0.08} roughness={0.88} />
      </mesh>
      {/* Side bands (front/back) */}
      <mesh position={[0, -0.3, 4.6]} receiveShadow>
        <boxGeometry args={[14.4, 0.5, 0.3]} />
        <meshStandardMaterial color="#3a2112" emissive="#150906" emissiveIntensity={0.1} roughness={0.78} />
      </mesh>
      <mesh position={[0, -0.3, -4.6]} receiveShadow>
        <boxGeometry args={[14.4, 0.5, 0.3]} />
        <meshStandardMaterial color="#3a2112" emissive="#150906" emissiveIntensity={0.1} roughness={0.78} />
      </mesh>
      {/* Central rune circle */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.082, 0]}>
        <ringGeometry args={[0.55, 0.68, 48]} />
        <meshStandardMaterial color="#5f3214" emissive="#9b561e" emissiveIntensity={0.16} transparent opacity={0.8} roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.084, 0]}>
        <ringGeometry args={[0.22, 0.3, 48]} />
        <meshStandardMaterial color="#4a220f" transparent opacity={0.78} roughness={0.9} />
      </mesh>
      {/* Rune dots around circle */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 0.88;
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[Math.cos(a) * r, 0.086, Math.sin(a) * r]}>
            <circleGeometry args={[0.06, 12]} />
            <meshStandardMaterial color="#5a2d12" transparent opacity={0.82} roughness={0.9} />
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
    <mesh position={[x, y, z]} rotation={[tiltX, rot, tiltZ]} material={materials} castShadow receiveShadow>
      <boxGeometry args={[size, size, size]} />
    </mesh>
  );
}

function BowlRivets() {
  return (
    <group>
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const radius = 0.98;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, 0.87, Math.sin(a) * radius]} castShadow>
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshStandardMaterial color="#7d7f78" metalness={0.6} roughness={0.28} />
          </mesh>
        );
      })}
    </group>
  );
}

function BowlFrontWall() {
  return (
    <group>
      <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.02, 0.86, 0.2, 48, 1, true, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial
          color="#593019"
          emissive="#1b0b04"
          emissiveIntensity={0.18}
          roughness={0.68}
          metalness={0.03}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.64, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.04, 1.04, 0.055, 48, 1, true, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#60625b" metalness={0.7} roughness={0.24} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.44, 0.5]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.78, 36]} />
        <meshStandardMaterial color="#080402" transparent opacity={0.32} roughness={0.98} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CupStaves() {
  const count = 16;
  const radius = 0.82;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        return (
          <mesh key={i} position={[x, -0.02, z]} rotation-y={-angle} castShadow receiveShadow>
            <boxGeometry args={[0.12, 0.9, 0.04]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#87512a' : '#64371c'}
              emissive={i % 2 === 0 ? '#301506' : '#241006'}
              emissiveIntensity={0.2}
              roughness={0.62}
            />
          </mesh>
        );
      })}
    </group>
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
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.08, 0.82, 0.76, 48, 1, true]} />
        <meshStandardMaterial map={tex} color="#5a351d" roughness={0.58} metalness={0.04} />
      </mesh>
      {/* Inner recess base (darker disc visible from above) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.25, 0]}>
        <circleGeometry args={[0.8, 48]} />
        <meshStandardMaterial color="#150c06" roughness={0.95} />
      </mesh>
      {/* Inner wall (slightly lit) */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.94, 0.72, 0.5, 48, 1, true]} />
        <meshStandardMaterial color="#2a1608" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.58, 0.82, 48]} />
        <meshStandardMaterial color="#0b0603" roughness={0.96} transparent opacity={0.64} />
      </mesh>
      <BowlFrontWall />
      {/* Top rim highlight */}
      <mesh position={[0, 0.82, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.88, 1.08, 48]} />
        <meshStandardMaterial color="#8a6130" metalness={0.18} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.835, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.02, 1.12, 56]} />
        <meshStandardMaterial color="#4f5453" metalness={0.65} roughness={0.25} />
      </mesh>
      <BowlRivets />
      {/* 6 dice inside (2 rows of 3) - sit visible above bowl rim */}
      {player.dice.map((d, i) => {
        if (d.kept) return null;
        const visible = isDieVisible ? isDieVisible(d) : !player.rolling;
        if (!visible) return null;
        const col = i % 3;
        const row = Math.floor(i / 3);
        const dx = (col - 1) * 0.42;
        const dz = (row - 0.5) * 0.4;
        const rot = ((d.id * 37) % 100) / 100 * 0.4 - 0.2;
        return <BowlDie key={i} x={dx} y={BOWL_DIE_Y} z={dz} dieId={d.id} sideIndex={d.sideIndex} rot={rot} />;
      })}
      {/* Locked dice are removed from the bowl and placed beside it, visible to both players. */}
      {lockedDice.map((d, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const dx = 1.35 + col * 0.46;
        const dz = (row - 0.5) * 0.46;
        const rot = ((d.id * 53) % 100) / 100 * 0.35 - 0.18;
        return <BowlDie key={`locked-${d.id}`} x={dx} y={0.26} z={dz} dieId={d.id} sideIndex={d.sideIndex} rot={rot} />;
      })}
    </group>
  );
}

// Cup that descends to cover bowl when rolling, hidden otherwise.
export function Cup({ player, x, z }: { player: PlayerState; x: number; z: number }) {
  const tex = useMemo(() => makeWoodTexture(true), []);
  const rolling = player.rolling;

  const spring = useSpring({
    y: rolling ? 0.68 : 6.5,
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
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.7, 0.94, 1.18, 48]} />
          <meshStandardMaterial
            map={tex}
            color="#7d4824"
            emissive="#2b1408"
            emissiveIntensity={0.14}
            roughness={0.58}
            metalness={0.03}
          />
        </mesh>
        <CupStaves />
        <mesh position={[0, 0.6, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <ringGeometry args={[0.36, 0.7, 56]} />
          <meshStandardMaterial map={tex} color="#8b542c" emissive="#331608" emissiveIntensity={0.18} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.575, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.35, 48]} />
          <meshStandardMaterial color="#0b0502" roughness={0.98} transparent opacity={0.86} />
        </mesh>
        <mesh position={[0, 0.55, 0]} rotation-x={Math.PI / 2} castShadow>
          <torusGeometry args={[0.7, 0.04, 10, 56]} />
          <meshStandardMaterial color="#565a55" metalness={0.72} roughness={0.22} />
        </mesh>
        <mesh position={[0, -0.2, 0]} rotation-x={Math.PI / 2} castShadow>
          <torusGeometry args={[0.82, 0.035, 10, 48]} />
          <meshStandardMaterial color="#565a55" metalness={0.66} roughness={0.26} />
        </mesh>
        <mesh position={[0, 0.615, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.39, 0.46, 44]} />
          <meshStandardMaterial color="#c68234" emissive="#c68234" emissiveIntensity={0.28} transparent opacity={0.72} />
        </mesh>
      </animated.group>
    </animated.group>
  );
}
