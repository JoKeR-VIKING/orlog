import { Canvas } from '@react-three/fiber';
import Dice from '../components/Dice';
import Cup from '../components/Cup';

const GameScene = () => {
  return (
    <Canvas camera={{ position: [0, 5, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <Dice />
      <Cup />
    </Canvas>
  );
};

export default GameScene;
