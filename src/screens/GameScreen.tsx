import { useStore } from '../store/useGameStore';
import { WoodenButton } from '../components/ui/WoodenButton';
import { PlayerHUD } from '../components/ui/PlayerHUD';
import { GodFavorPanel } from '../components/ui/GodFavorPanel';
import { DieFaceIcon } from '../components/ui/DieFaceIcon';
import GameScene from '../scenes/GameScene';
import { useMemo } from 'react';

function phaseLabel(phase: string) {
  switch (phase) {
    case 'roll':
      return 'Roll Phase';
    case 'favor':
      return 'God Favor Phase';
    case 'resolve':
      return 'Resolution';
    case 'round-end':
      return 'Round Ends...';
    case 'game-over':
      return 'Saga Ends';
    default:
      return phase;
  }
}

export default function GameScreen() {
  const snap = useStore((s) => s.snap);
  const selfSide = useStore((s) => s.selfSide);
  const floaters = useStore((s) => s.floaters);
  const opponentPresent = useStore((s) => s.opponentPresent);
  const leave = useStore((s) => s.leave);
  const toggleKeep = useStore((s) => s.toggleKeep);
  const doReroll = useStore((s) => s.doReroll);
  const stand = useStore((s) => s.stand);
  const castFavor = useStore((s) => s.castFavor);
  const skipFavors = useStore((s) => s.skipFavors);
  const code = useStore((s) => s.code);

  const log = useMemo(() => snap.log.slice(-6), [snap.log]);

  if (!selfSide) return null;
  const self = snap[selfSide];
  const opponent = snap[selfSide === 'host' ? 'guest' : 'host'];

  // roll phase state
  const canRoll =
    snap.phase === 'roll' && !self.rolling && !self.ready && self.rollsLeft > 0;
  const canStand = snap.phase === 'roll' && !self.rolling;
  const canFavor = snap.phase === 'favor' && !self.favorReady;

  return (
    <div className="w-full h-full relative overflow-hidden" data-testid="game-screen">
      {/* Top HUDs */}
      <div className="absolute top-3 left-3 md:top-5 md:left-5 z-20">
        <PlayerHUD
          player={opponent}
          side={selfSide === 'host' ? 'guest' : 'host'}
          isSelf={false}
          active={
            snap.phase === 'roll'
              ? opponent.rolling || !opponent.ready
              : snap.phase === 'favor'
                ? !opponent.favorReady
                : false
          }
          floaters={floaters}
          align="left"
        />
      </div>
      <div className="absolute top-3 right-3 md:top-5 md:right-5 z-20">
        <PlayerHUD
          player={self}
          side={selfSide}
          isSelf
          active={
            snap.phase === 'roll'
              ? self.rolling || !self.ready
              : snap.phase === 'favor'
                ? !self.favorReady
                : false
          }
          floaters={floaters}
          align="right"
        />
      </div>

      {/* Top center: phase + round */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
        <div className="wood-panel px-4 py-1.5 rounded-sm">
          <span className="heading-carved text-sm md:text-base tracking-widest">
            Round {snap.round} &middot; {phaseLabel(snap.phase)}
          </span>
        </div>
        {!opponentPresent && snap.phase !== 'game-over' && (
          <div className="mt-2 parchment px-3 py-1 text-xs md:text-sm text-[#8b261d] tracking-wider"
            data-testid="opponent-disconnected">
            Opponent disconnected... awaiting return
          </div>
        )}
      </div>

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0" data-testid="game-scene-3d">
        <GameScene />
      </div>

      {/* Bottom: dice tray + controls */}
      <div className="absolute left-0 right-0 bottom-0 z-20 px-3 md:px-6 pb-4 md:pb-6 flex flex-col items-center gap-3">
        {snap.phase === 'favor' && (
          <GodFavorPanel
            player={self}
            canAct={canFavor}
            onCast={castFavor}
            onSkip={skipFavors}
          />
        )}

        {(snap.phase === 'roll' || snap.phase === 'resolve' || snap.phase === 'round-end') && (
          <>
            {/* Opponent dice (small, read-only) */}
            <div className="flex items-center gap-1.5 md:gap-2 opacity-85">
              <span className="heading-carved text-xs text-[var(--color-text-secondary)] mr-1 hidden md:inline">
                {opponent.name}:
              </span>
              {opponent.dice.map((d, i) => (
                <div
                  key={i}
                  className="dice-chip disabled"
                  style={{ width: 38, height: 38, opacity: opponent.rolling ? 0.35 : 1 }}
                  data-testid={`opponent-dice-${i}`}
                  title={d.face}
                >
                  <DieFaceIcon face={d.face} size={22} />
                </div>
              ))}
            </div>

            {/* Your dice tray */}
            <div
              className="wood-panel p-3 md:p-4 flex flex-col items-center gap-3 w-full max-w-2xl"
              data-testid="dice-tray"
            >
              <div className="flex items-center justify-between w-full">
                <div className="heading-carved text-sm md:text-base text-[var(--color-text-primary)]">
                  Your Dice {self.ready && <span className="text-[var(--color-gold)] text-xs ml-2">locked</span>}
                </div>
                <div className="text-xs md:text-sm text-[var(--color-text-secondary)] tracking-wider">
                  Rolls Left:{' '}
                  <span className="text-[var(--color-gold)] font-bold" data-testid="rolls-left">
                    {self.rollsLeft}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {self.dice.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleKeep(d.id)}
                    disabled={self.rolling || self.ready || snap.phase !== 'roll'}
                    className={`dice-chip ${d.kept ? 'kept' : ''} ${self.rolling ? 'disabled' : ''}`}
                    style={{ opacity: self.rolling ? 0.4 : 1 }}
                    data-testid={`dice-item-${i}`}
                    title={`${d.face}${d.kept ? ' (kept)' : ''}`}
                  >
                    <DieFaceIcon face={d.face} size={30} />
                    {d.kept && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-gold)] border border-black/60 text-[#1a1412] text-[10px] flex items-center justify-center font-bold">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {snap.phase === 'roll' && (
                <div className="flex items-center gap-3 mt-1">
                  <WoodenButton
                    variant="primary"
                    onClick={doReroll}
                    disabled={!canRoll || self.dice.every((d) => d.kept)}
                    data-testid="roll-dice-button"
                  >
                    Shake &amp; Roll
                  </WoodenButton>
                  <WoodenButton
                    variant="gold"
                    onClick={stand}
                    disabled={!canStand || self.ready}
                    data-testid="stand-button"
                  >
                    Stand (Lock)
                  </WoodenButton>
                </div>
              )}
            </div>
          </>
        )}

        {/* Resolution log */}
        {log.length > 0 && (
          <div
            className="parchment px-3 py-2 max-w-xl text-xs md:text-sm text-[#3a2a18] w-full"
            data-testid="resolution-log"
            style={{ minHeight: 36 }}
          >
            <div className="space-y-0.5">
              {log.map((line, i) => (
                <div key={i} className="leading-snug">{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top-right overlay leave button */}
      <button
        onClick={leave}
        className="absolute bottom-3 right-3 md:bottom-5 md:right-5 z-30 text-xs uppercase tracking-widest text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        data-testid="leave-game-button"
      >
        &#x2715; Forfeit
      </button>
      {code && (
        <div className="absolute bottom-3 left-3 md:bottom-5 md:left-5 z-30 text-[10px] md:text-xs uppercase tracking-widest text-[var(--color-text-secondary)]/60">
          Rune: <span className="text-[var(--color-gold)] font-bold">{code}</span>
        </div>
      )}
    </div>
  );
}
