import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Die, PlayerSide, ResolutionStep } from '../../game/types';
import { BowlDie } from './TableAndBowls';

const CENTER_ORDER: Record<Die['face'], number> = {
  axe: 0,
  arrow: 1,
  helmet: 2,
  shield: 3,
  steal: 4,
};

function sideZ(side: PlayerSide, hostZ: number, guestZ: number): number {
  return side === 'host' ? hostZ : guestZ;
}

function spreadX(index: number, count: number, spacing = 0.5): number {
  return (index - (count - 1) / 2) * spacing;
}

function centerDice(dice: Die[]): Die[] {
  return dice.slice().sort((a, b) => CENTER_ORDER[a.face] - CENTER_ORDER[b.face] || a.id - b.id);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(v: number): number {
  return 1 - Math.pow(1 - v, 3);
}

function RuneCarvings({ y }: { y: number }) {
  return (
    <group position={[0, y, 0.044]}>
      <mesh rotation-z={0.75}>
        <boxGeometry args={[0.012, 0.1, 0.01]} />
        <meshStandardMaterial color="#c68234" emissive="#c68234" emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[0.034, 0.005, 0]} rotation-z={-0.75}>
        <boxGeometry args={[0.012, 0.08, 0.01]} />
        <meshStandardMaterial color="#c68234" emissive="#c68234" emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}

function ShaftBand({ y, radius = 0.052 }: { y: number; radius?: number }) {
  return (
    <mesh position={[0, y, 0]} rotation-x={Math.PI / 2}>
      <torusGeometry args={[radius, 0.008, 6, 18]} />
      <meshStandardMaterial color="#9b6a2f" emissive="#5b3514" emissiveIntensity={0.15} metalness={0.1} roughness={0.36} />
    </mesh>
  );
}

function WeaponShape({ face }: { face: 'axe' | 'arrow' }) {
  if (face === 'arrow') {
    return (
      <group rotation-x={Math.PI / 2} rotation-z={Math.PI / 2}>
        <mesh>
          <cylinderGeometry args={[0.026, 0.026, 0.98, 12]} />
          <meshStandardMaterial color="#6a3d1d" roughness={0.68} />
        </mesh>
        <ShaftBand y={0.28} radius={0.036} />
        <ShaftBand y={-0.22} radius={0.036} />
        <RuneCarvings y={0.02} />
        <mesh position={[0, 0.62, 0]} rotation-z={Math.PI / 4}>
          <coneGeometry args={[0.12, 0.32, 4]} />
          <meshStandardMaterial color="#aeb6ba" emissive="#4f5c62" emissiveIntensity={0.18} metalness={0.35} roughness={0.25} />
        </mesh>
        <mesh position={[0.07, -0.48, 0]} rotation-z={0.42}>
          <coneGeometry args={[0.08, 0.22, 3]} />
          <meshStandardMaterial color="#5a1f1a" emissive="#8b261d" emissiveIntensity={0.14} roughness={0.62} />
        </mesh>
        <mesh position={[-0.07, -0.48, 0]} rotation-z={-0.42}>
          <coneGeometry args={[0.08, 0.22, 3]} />
          <meshStandardMaterial color="#2f402d" emissive="#2c402b" emissiveIntensity={0.12} roughness={0.62} />
        </mesh>
      </group>
    );
  }

  return (
    <group rotation-x={Math.PI / 2} rotation-z={Math.PI / 2}>
      <mesh>
        <cylinderGeometry args={[0.035, 0.04, 0.88, 12]} />
        <meshStandardMaterial color="#5d3519" roughness={0.72} />
      </mesh>
      <ShaftBand y={0.18} />
      <ShaftBand y={0.32} />
      <RuneCarvings y={-0.08} />
      <mesh position={[0.18, 0.42, 0]} scale={[0.44, 0.26, 0.06]} rotation-z={-0.22}>
        <sphereGeometry args={[0.5, 20, 10]} />
        <meshStandardMaterial color="#b8bdc3" emissive="#586269" emissiveIntensity={0.18} metalness={0.32} roughness={0.24} />
      </mesh>
      <mesh position={[-0.1, 0.42, 0]} scale={[0.2, 0.18, 0.058]} rotation-z={0.35}>
        <sphereGeometry args={[0.5, 16, 8]} />
        <meshStandardMaterial color="#8d969b" metalness={0.28} roughness={0.28} />
      </mesh>
      <mesh position={[0.02, 0.42, 0]}>
        <boxGeometry args={[0.12, 0.22, 0.07]} />
        <meshStandardMaterial color="#2a1d14" roughness={0.55} />
      </mesh>
    </group>
  );
}

function FlyingWeapon({
  face,
  start,
  end,
  index,
  blocked,
}: {
  face: 'axe' | 'arrow';
  start: THREE.Vector3;
  end: THREE.Vector3;
  index: number;
  blocked: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const impactRef = useRef<THREE.Mesh>(null);
  const startedAt = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (startedAt.current === null) startedAt.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedAt.current - index * 0.16;
    const progress = clamp01(elapsed / 1.08);
    const eased = easeOutCubic(progress);
    const arc = Math.sin(progress * Math.PI) * 0.6;

    if (groupRef.current) {
      groupRef.current.position.lerpVectors(start, end, eased);
      groupRef.current.position.y += arc;
      groupRef.current.rotation.y = progress * Math.PI * (blocked ? 1.3 : 2);
      const scale = progress >= 1 ? 0.001 : 1;
      groupRef.current.scale.setScalar(scale);
    }

    if (impactRef.current) {
      const pulse = clamp01((elapsed - 0.8) / 0.34);
      impactRef.current.position.copy(end);
      impactRef.current.scale.setScalar(0.2 + pulse * 1.15);
      const material = impactRef.current.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.opacity = (1 - pulse) * 0.75;
      }
    }
  });

  return (
    <>
      <group ref={groupRef} position={start}>
        <mesh>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#c68234" emissive="#c68234" emissiveIntensity={0.45} roughness={0.32} />
        </mesh>
        <WeaponShape face={face} />
      </group>
      <mesh ref={impactRef} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.12, 0.16, 28]} />
        <meshStandardMaterial
          color={blocked ? '#f2b84f' : '#c44536'}
          emissive={blocked ? '#c68234' : '#8b261d'}
          emissiveIntensity={0.55}
          transparent
          opacity={0}
          roughness={0.35}
        />
      </mesh>
    </>
  );
}

function FavorToken({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.11, z]} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[0.13, 24]} />
      <meshStandardMaterial color="#f2b84f" emissive="#c68234" emissiveIntensity={0.55} roughness={0.35} />
    </mesh>
  );
}

function HighlightRing({
  x,
  z,
  color,
}: {
  x: number;
  z: number;
  color: string;
}) {
  return (
    <mesh position={[x, 0.12, z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.26, 0.31, 36]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} transparent opacity={0.9} roughness={0.35} />
    </mesh>
  );
}

function CenterDie({
  die,
  x,
  z,
  active,
}: {
  die: Die;
  x: number;
  z: number;
  active: boolean;
}) {
  return (
    <group>
      {active && <HighlightRing x={x} z={z} color="#f2b84f" />}
      <BowlDie
        x={x}
        y={active ? 0.46 : 0.34}
        z={z}
        dieId={die.id}
        sideIndex={die.sideIndex}
        rot={die.id * 0.13 - 0.3}
      />
    </group>
  );
}

function CenterDiceRow({
  dice,
  z,
  activeFace,
  activeFavor,
  activeCount,
}: {
  dice: Die[];
  z: number;
  activeFace?: Die['face'];
  activeFavor?: boolean;
  activeCount: number;
}) {
  const ordered = centerDice(dice);
  const activeIds = new Set(
    ordered
      .filter((die) => (activeFavor ? die.grantsFavor : die.face === activeFace))
      .slice(0, activeCount)
      .map((die) => die.id),
  );
  return (
    <group>
      {ordered.map((die, i) => {
        return (
          <CenterDie
            key={die.id}
            die={die}
            x={spreadX(i, ordered.length, 0.46)}
            z={z}
            active={activeIds.has(die.id)}
          />
        );
      })}
    </group>
  );
}

export function ResolutionAnimation({
  step,
  hostZ,
  guestZ,
  hostDice,
  guestDice,
  visible,
}: {
  step: ResolutionStep | null | undefined;
  hostZ: number;
  guestZ: number;
  hostDice: Die[];
  guestDice: Die[];
  visible: boolean;
}) {
  const hostRowZ = sideZ('host', hostZ, guestZ) * 0.24;
  const guestRowZ = sideZ('guest', hostZ, guestZ) * 0.24;

  const attackFlights = useMemo(() => {
    if (!step || step.kind !== 'attack') return [];
    const actorZ = sideZ(step.actor, hostZ, guestZ);
    const targetZ = sideZ(step.target, hostZ, guestZ);
    const attackRowZ = actorZ * 0.24;
    const blockRowZ = targetZ * 0.24;
    const hpRowZ = targetZ * 0.72;

    return Array.from({ length: step.attack }, (_, i) => {
      const blocked = i < step.blocked;
      const startX = spreadX(i, step.attack);
      const damageIndex = i - step.blocked;
      const endX = blocked ? spreadX(i, Math.max(step.blocked, 1)) : spreadX(damageIndex, Math.max(step.damage, 1), 0.34);
      const end = new THREE.Vector3(endX, 1.35, blocked ? blockRowZ : hpRowZ);
      return {
        id: `${step.id}-${i}`,
        index: i,
        blocked,
        start: new THREE.Vector3(startX, 1.35, attackRowZ),
        end,
      };
    });
  }, [guestZ, hostZ, step]);

  if (!visible) return null;

  const activeHostFace = step?.kind === 'attack' && step.actor === 'host' ? step.attackFace : step?.kind === 'attack' && step.target === 'host' ? step.blockFace : undefined;
  const activeGuestFace = step?.kind === 'attack' && step.actor === 'guest' ? step.attackFace : step?.kind === 'attack' && step.target === 'guest' ? step.blockFace : undefined;
  const activeHostCount = step?.kind === 'attack' && step.actor === 'host' ? step.attack : step?.kind === 'attack' && step.target === 'host' ? step.blocked : 0;
  const activeGuestCount = step?.kind === 'attack' && step.actor === 'guest' ? step.attack : step?.kind === 'attack' && step.target === 'guest' ? step.blocked : 0;

  if (!step) {
    return (
      <group>
        <CenterDiceRow dice={hostDice} z={hostRowZ} activeCount={0} />
        <CenterDiceRow dice={guestDice} z={guestRowZ} activeCount={0} />
      </group>
    );
  }

  if (step.kind === 'favor') {
    return (
      <group>
        <CenterDiceRow dice={hostDice} z={hostRowZ} activeFavor activeCount={step.hostFavor} />
        <CenterDiceRow dice={guestDice} z={guestRowZ} activeFavor activeCount={step.guestFavor} />
        {Array.from({ length: step.hostFavor }, (_, i) => (
          <FavorToken key={`host-favor-${step.id}-${i}`} x={spreadX(i, step.hostFavor, 0.28)} z={hostRowZ + 0.34} />
        ))}
        {Array.from({ length: step.guestFavor }, (_, i) => (
          <FavorToken key={`guest-favor-${step.id}-${i}`} x={spreadX(i, step.guestFavor, 0.28)} z={guestRowZ + 0.34} />
        ))}
      </group>
    );
  }

  if (step.kind === 'steal') {
    const actorZ = sideZ(step.actor, hostZ, guestZ);
    const targetZ = sideZ(step.target, hostZ, guestZ);
    return (
      <group>
        <CenterDiceRow dice={hostDice} z={hostRowZ} activeFace={step.actor === 'host' ? 'steal' : undefined} activeCount={step.actor === 'host' ? step.steal : 0} />
        <CenterDiceRow dice={guestDice} z={guestRowZ} activeFace={step.actor === 'guest' ? 'steal' : undefined} activeCount={step.actor === 'guest' ? step.steal : 0} />
        {Array.from({ length: step.steal }, (_, i) => (
          <FavorToken key={`steal-${step.id}-${i}`} x={spreadX(i, step.steal, 0.3)} z={targetZ * 0.24} />
        ))}
        {step.stolen > 0 &&
          Array.from({ length: step.stolen }, (_, i) => (
            <FavorToken key={`stolen-${step.id}-${i}`} x={spreadX(i, step.stolen, 0.3)} z={actorZ * 0.24} />
          ))}
      </group>
    );
  }

  if (step.kind === 'god') {
    const actorZ = sideZ(step.actor, hostZ, guestZ) * 0.24;
    return (
      <group key={step.id}>
        <CenterDiceRow dice={hostDice} z={hostRowZ} activeCount={0} />
        <CenterDiceRow dice={guestDice} z={guestRowZ} activeCount={0} />
        <mesh position={[0, 0.18, actorZ]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.42, 0.5, 36]} />
          <meshStandardMaterial color="#f2b84f" emissive="#c68234" emissiveIntensity={0.75} transparent opacity={0.9} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.2, actorZ]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.22, 24]} />
          <meshStandardMaterial color="#3a2518" emissive="#8a531f" emissiveIntensity={0.28} roughness={0.45} />
        </mesh>
      </group>
    );
  }

  return (
    <group key={step.id}>
      <CenterDiceRow dice={hostDice} z={hostRowZ} activeFace={activeHostFace} activeCount={activeHostCount} />
      <CenterDiceRow dice={guestDice} z={guestRowZ} activeFace={activeGuestFace} activeCount={activeGuestCount} />
      {attackFlights.map((flight) => (
        <FlyingWeapon
          key={flight.id}
          face={step.attackFace}
          start={flight.start}
          end={flight.end}
          index={flight.index}
          blocked={flight.blocked}
        />
      ))}
    </group>
  );
}
