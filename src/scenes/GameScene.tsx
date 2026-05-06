import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ResolutionAnimation } from '../components/scene/ResolutionAnimation';
import { Bowl, Cup, Table } from '../components/scene/TableAndBowls';
import { MAX_ROLLS, useStore } from '../store/useGameStore';
import type { Die, PlayerSide } from '../game/types';

function CameraRig() {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(0, 13, 12);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

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
      shadows
      camera={{ position: [0, 13, 12], fov: 28 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.86} />
      <directionalLight
        castShadow
        position={[5.5, 10, 6]}
        intensity={1.45}
        color="#ffd28a"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[-6, 7, -5]} intensity={0.42} color="#7894b8" />
      <directionalLight position={[0, 12, 0]} intensity={0.34} color="#fff0c8" />
      <pointLight position={[0, 3.4, 0]} intensity={1.25} color="#c68234" distance={11} />
      <pointLight position={[0, 2.4, 3.2]} intensity={1.0} color="#f0b46a" distance={8} />
      <pointLight position={[-3.6, 2.1, 2.8]} intensity={0.55} color="#9f3228" distance={7} />
      <CameraRig />
      <Table />
      <Bowl player={snap.host} x={0} z={hostZ} isDieVisible={(die) => isDieVisible('host', die)} />
      <Bowl player={snap.guest} x={0} z={guestZ} isDieVisible={(die) => isDieVisible('guest', die)} />
      <ResolutionAnimation
        step={snap.resolutionStep}
        hostZ={hostZ}
        guestZ={guestZ}
        hostDice={snap.host.dice}
        guestDice={snap.guest.dice}
        visible={snap.phase === 'resolve'}
      />
      <Cup player={snap.host} x={0} z={hostZ} />
      <Cup player={snap.guest} x={0} z={guestZ} />
    </Canvas>
  );
}
