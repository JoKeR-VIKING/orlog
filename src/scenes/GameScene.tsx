import { Canvas } from '@react-three/fiber';
import { Bowl, Cup, Table } from '../components/scene/TableAndBowls';
import { useStore } from '../store/useGameStore';

export default function GameScene() {
  const snap = useStore((s) => s.snap);
  const selfSide = useStore((s) => s.selfSide);
  // Place self bowl in the front (closer to camera), opponent in the back
  const selfIsHost = selfSide === 'host';
  const hostZ = selfIsHost ? 1.3 : -1.3;
  const guestZ = selfIsHost ? -1.3 : 1.3;

  return (
    <Canvas
      shadows={false}
      camera={{ position: [0, 5.4, 5.4], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 8, 4]} intensity={0.7} color="#f4c87a" />
      <directionalLight position={[-4, 6, -3]} intensity={0.3} color="#7d94c4" />
      <pointLight position={[0, 2.5, 0]} intensity={0.5} color="#c68234" distance={7} />
      <Table />
      <Bowl x={0} z={hostZ} />
      <Bowl x={0} z={guestZ} />
      <Cup player={snap.host} x={0} z={hostZ} />
      <Cup player={snap.guest} x={0} z={guestZ} />
    </Canvas>
  );
}
