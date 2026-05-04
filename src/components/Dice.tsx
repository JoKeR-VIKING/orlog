import { useGameStore } from '../store/useGameStore';

export default function Dice() {
  const dice = useGameStore((s) => s.dice);

  return (
    <>
      {dice.map((_, i) => (
        <mesh key={i} position={[i * 0.7 - 1.75, 0.25, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.1} />
        </mesh>
      ))}
    </>
  );
}
