import { useGameStore } from './store/useGameStore.ts';
import GameScene from './scenes/GameScene.tsx';

function App() {
  const roll = useGameStore((s) => s.roll);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <button
        onClick={roll}
        style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}
      >
        Roll
      </button>
      <GameScene />
    </div>
  );
}

export default App;
