import { Canvas } from '@react-three/fiber';
import { Bowl, Cup, Table } from '../components/scene/TableAndBowls';
import { MAX_ROLLS, useStore } from '../store/useGameStore';
import type { Die, PlayerSide } from '../game/types';

export default function GameScene() {
  const snap = useStore((s) => s.snap);
  const selfSide = useStore((s) => s.selfSide);
  const selfIsHost = selfSide === 'host';
  const hostZ = selfIsHost ? 2.2 : -2.2;
  const guestZ = selfIsHost ? -2.2 : 2.2;
  const selfMustLock = Boolean(
    selfSide && snap.phase === 'roll' && snap.rollTurn === selfSide && snap[selfSide].turnRolled && !snap[selfSide].ready,
  );
  const isDieVisible = (side: PlayerSide, die: Die) => {
    if (die.kept) return true;
    if (snap.phase !== 'roll') return true;
    const player = snap[side];
    const hasRolled = player.rollsLeft < MAX_ROLLS || player.turnRolled || player.ready;
    if (!hasRolled) return false;
    if (side === selfSide) return !player.rolling;
    return !player.rolling && !selfMustLock;
  };

  return (
    <Canvas
      shadows={false}
      camera={{ position: [0, 13, 12], fov: 28 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={1.0} />
      <directionalLight position={[6, 12, 7]} intensity={1.3} color="#f4c87a" />
      <directionalLight position={[-7, 9, -5]} intensity={0.7} color="#c4a878" />
      <directionalLight position={[0, 15, 0]} intensity={0.7} color="#ffe8b8" />
      <pointLight position={[0, 4, 0]} intensity={1.0} color="#c68234" distance={14} />
      <Table />
      <Bowl player={snap.host} x={0} z={hostZ} isDieVisible={(die) => isDieVisible('host', die)} />
      <Bowl player={snap.guest} x={0} z={guestZ} isDieVisible={(die) => isDieVisible('guest', die)} />
      <Cup player={snap.host} x={0} z={hostZ} />
      <Cup player={snap.guest} x={0} z={guestZ} />
    </Canvas>
  );
}
