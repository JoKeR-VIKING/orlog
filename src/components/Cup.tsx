import { useGameStore } from '../store/useGameStore';
import { useSpring, animated } from '@react-spring/three';

export default function Cup() {
  const phase = useGameStore((s) => s.phase);

  const { positionY } = useSpring({
    positionY: phase === 'covering' ? 0.5 : phase === 'shaking' ? 0.3 : 1,
    config: { tension: 200, friction: 15 },
  });

  return (
    <animated.group position-y={positionY}>
      <mesh>
        <cylinderGeometry args={[1, 0.7, 1.5, 32, 1, true]} />
        <meshStandardMaterial color="#5d4037" side={2} roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 32]} />
        <meshStandardMaterial color="#5d4037" roughness={0.8} metalness={0.2} />
      </mesh>
    </animated.group>
  );
}
