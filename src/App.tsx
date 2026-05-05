import { useStore } from './store/useGameStore';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import EndScreen from './screens/EndScreen';

function App() {
  const view = useStore((s) => s.view);
  return (
    <div className="w-full h-full relative" data-testid="app-root">
      {view === 'home' && <HomeScreen />}
      {view === 'lobby' && <LobbyScreen />}
      {view === 'game' && <GameScreen />}
      {view === 'end' && <EndScreen />}
    </div>
  );
}

export default App;
