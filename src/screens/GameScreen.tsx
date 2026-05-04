import { MAX_ROLLS, useStore } from '../store/useGameStore';
import { WoodenButton } from '../components/ui/WoodenButton';
import { PlayerHUD } from '../components/ui/PlayerHUD';
import { GodFavorPanel } from '../components/ui/GodFavorPanel';
import { DieFaceIcon } from '../components/ui/DieFaceIcon';
import GameScene from '../scenes/GameScene';
import { useEffect, useMemo, useState } from 'react';

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
  const aiMode = useStore((s) => s.aiMode);
  const opponentLastSeen = useStore((s) => s.opponentLastSeen);

  const log = useMemo(() => snap.log.slice(-6), [snap.log]);

  // Tick every 500ms to update reconnect countdown UI
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  if (!selfSide) return null;
  const self = snap[selfSide];
  const opponentSide = selfSide === 'host' ? 'guest' : 'host';
  const opponent = snap[opponentSide];
  const selfTurn = snap.phase === 'roll' && snap.rollTurn === selfSide;
  const selfMustLock = selfTurn && self.turnRolled && !self.ready;
  const selfHasRolled = snap.phase !== 'roll' || self.rollsLeft < MAX_ROLLS || self.turnRolled || self.ready;
  const opponentHasRolled = snap.phase !== 'roll' || opponent.rollsLeft < MAX_ROLLS || opponent.turnRolled || opponent.ready;
  const canSeeOpponentDie = (kept: boolean) => kept || (opponentHasRolled && !selfMustLock && !opponent.rolling);

  const canRoll =
    selfTurn && !self.rolling && !self.ready && !self.turnRolled && self.rollsLeft > 0;
  const canLock = selfTurn && !self.rolling && !self.ready && self.turnRolled;
  const canSelectDice = selfTurn && !self.rolling && !self.ready && self.turnRolled;
  const canFavor = snap.phase === 'favor' && !self.favorReady;

  // Reconnect timer (only relevant in non-solo mode)
  const showReconnect = !aiMode && !opponentPresent && snap.phase !== 'game-over';
  const sinceLastSeen = showReconnect ? Math.max(0, now - (opponentLastSeen || now)) : 0;
  const reconnectSecondsLeft = Math.max(0, Math.ceil((45_000 - sinceLastSeen) / 1000));
  const reconnectTimedOut = showReconnect && reconnectSecondsLeft <= 0;

  return (
    <div className="w-full h-full relative overflow-hidden" data-testid="game-screen">
      {/* Top HUDs */}
      <div className="absolute top-3 left-3 md:top-5 md:left-5 z-20">
        <PlayerHUD
          player={opponent}
          side={selfSide === 'host' ? 'guest' : 'host'}
          isSelf={false}
          active={snap.phase === 'roll' ? snap.rollTurn === opponentSide : snap.phase === 'favor' ? !opponent.favorReady : false}
          floaters={floaters}
          align="left"
        />
      </div>
      <div className="absolute top-3 right-3 md:top-5 md:right-5 z-20">
        <PlayerHUD
          player={self}
          side={selfSide}
          isSelf
          active={snap.phase === 'roll' ? selfTurn : snap.phase === 'favor' ? !self.favorReady : false}
          floaters={floaters}
          align="right"
        />
      </div>

      {/* Left side: game log */}
      {log.length > 0 && (
        <div
          className="absolute left-3 md:left-5 top-36 md:top-40 z-20 parchment px-3 py-2 text-xs md:text-sm text-[#3a2a18] w-64 md:w-72 max-h-52 overflow-hidden"
          data-testid="resolution-log"
        >
          <div className="heading-carved text-[10px] md:text-xs uppercase tracking-widest text-[#5a3a1f] mb-1">
            Saga Log
          </div>
          <div className="space-y-0.5">
            {log.map((line, i) => (
              <div key={i} className="leading-snug">{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* Top center: phase + round */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
        <div className="wood-panel px-4 py-1.5 rounded-sm">
          <span className="heading-carved text-sm md:text-base tracking-widest">
            Round {snap.round} &middot; {phaseLabel(snap.phase)}
          </span>
        </div>
        {!opponentPresent && snap.phase !== 'game-over' && !aiMode && (
          <div className={`mt-2 parchment px-4 py-2 text-xs md:text-sm tracking-wider ${reconnectTimedOut ? 'text-blood' : 'text-[#3a2a18]'}`}
            data-testid="opponent-disconnected" style={{ pointerEvents: 'auto' }}>
            {reconnectTimedOut ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <span className="heading-carved text-blood">The foe has fled the field.</span>
                <WoodenButton variant="gold" onClick={leave} data-testid="abandon-session-button">
                  End Saga
                </WoodenButton>
              </div>
            ) : (
              <span>
                <span className="rune-title text-base mr-2">ᚺ</span>
                Opponent reconnecting&hellip; <span className="text-blood font-bold">{reconnectSecondsLeft}s</span>
              </span>
            )}
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
              <span className="heading-carved text-xs text-text-secondary mr-1 hidden md:inline">
                {opponent.name}:
              </span>
              {opponent.dice.map((d, i) => {
                const visible = canSeeOpponentDie(d.kept);
                return (
                  <div
                    key={i}
                    className={`dice-chip disabled ${d.kept || d.selected ? 'kept' : ''}`}
                    style={{ width: 38, height: 38 }}
                    data-testid={`opponent-dice-${i}`}
                    title={visible ? `${d.face}${d.kept ? ' (locked)' : d.selected ? ' (selected)' : ''}` : 'Hidden'}
                  >
                    {visible ? <DieFaceIcon face={d.face} size={22} /> : <span className="heading-carved text-sm">?</span>}
                    {visible && (d.kept || d.selected) && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gold border border-black/60 text-bg-primary text-[9px] flex items-center justify-center font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Your dice tray */}
            <div
              className="wood-panel p-3 md:p-4 flex flex-col items-center gap-3 w-full max-w-2xl"
              data-testid="dice-tray"
            >
              <div className="flex items-center justify-between w-full">
                <div className="heading-carved text-sm md:text-base text-text-primary">
                  Your Dice {self.ready && <span className="text-gold text-xs ml-2">locked</span>}
                  {snap.phase === 'roll' && !selfTurn && !self.ready && (
                    <span className="text-text-secondary text-xs ml-2">waiting</span>
                  )}
                </div>
                <div className="text-xs md:text-sm text-text-secondary tracking-wider">
                  Rolls Remaining:{' '}
                  <span className="text-gold font-bold" data-testid="rolls-left">
                    {self.rollsLeft}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {self.dice.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleKeep(d.id)}
                    disabled={!canSelectDice || d.kept}
                    className={`dice-chip ${d.kept || d.selected ? 'kept' : ''} ${self.rolling ? 'disabled' : ''}`}
                    style={{ opacity: self.rolling ? 0.4 : 1 }}
                    data-testid={`dice-item-${i}`}
                    title={selfHasRolled || d.kept ? `${d.face}${d.kept ? ' (locked)' : d.selected ? ' (selected)' : ''}` : 'Roll to reveal'}
                  >
                    {selfHasRolled || d.kept ? <DieFaceIcon face={d.face} size={30} /> : <span className="heading-carved text-base">?</span>}
                    {(d.kept || d.selected) && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gold border border-black/60 text-bg-primary text-[10px] flex items-center justify-center font-bold">
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
                    disabled={!canLock}
                    data-testid="stand-button"
                  >
                    Lock Dice
                  </WoodenButton>
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* Top-right overlay leave button */}
      <button
        onClick={leave}
        className="absolute bottom-3 right-3 md:bottom-5 md:right-5 z-30 text-xs uppercase tracking-widest text-text-secondary hover:text-accent transition-colors"
        data-testid="leave-game-button"
      >
        &#x2715; Forfeit
      </button>
      {code && (
        <div className="absolute bottom-3 left-3 md:bottom-5 md:left-5 z-30 text-[10px] md:text-xs uppercase tracking-widest text-text-secondary/60">
          Rune: <span className="text-gold font-bold">{code}</span>
        </div>
      )}
      {aiMode && (
        <div className="absolute bottom-3 left-3 md:bottom-5 md:left-5 z-30 text-[10px] md:text-xs uppercase tracking-widest text-text-secondary/70" data-testid="solo-mode-badge">
          Vs <span className="text-gold font-bold">{aiMode === 'skald' ? 'Skald' : aiMode === 'vikingr' ? 'Vikingr' : 'Berserkr'}</span>
        </div>
      )}
    </div>
  );
}
