import { useStore } from '../store/useGameStore';
import { WoodenButton } from '../components/ui/WoodenButton';

export default function EndScreen() {
  const snap = useStore((s) => s.snap);
  const selfSide = useStore((s) => s.selfSide);
  const requestRematch = useStore((s) => s.requestRematch);
  const leave = useStore((s) => s.leave);

  if (!selfSide) return null;

  const youWon = snap.winner === selfSide;
  const pendingRematch = snap.rematchRequest;
  const youAsked = pendingRematch === selfSide;
  const endKind = snap.endReason?.kind || 'normal';
  const endedByForfeit = endKind === 'forfeit';
  const endedByFled = endKind === 'fled';
  const hideRematch = endedByForfeit || endedByFled;
  const opponentSide = selfSide === 'host' ? 'guest' : 'host';
  const opponentName = snap[opponentSide].name || 'Opponent';

  const resultTitle = endedByForfeit
    ? youWon ? 'Victory by Forfeit' : 'Forfeit'
    : endedByFled
      ? 'Opponent Fled'
      : youWon ? 'Victory' : 'Defeat';
  const resultCopy = endedByForfeit
    ? youWon
      ? `${opponentName} yielded the saga.`
      : 'You yielded the saga.'
    : endedByFled
      ? `${opponentName} fled the field. Victory is yours.`
      : youWon
        ? 'The Norns have carved glory into your thread.'
        : 'Another saga begins in Valhalla. Rise once more.';

  return (
    <div className="w-full h-full overflow-auto flex items-center justify-center p-6">
      <div className="wood-panel p-8 md:p-10 max-w-xl w-full text-center fade-up relative" data-testid="end-screen">
        <div className="rune-divider text-sm mb-4">
          <span className={youWon ? 'text-[var(--color-gold)]' : 'text-[var(--color-accent)]'}>
            {youWon ? 'ᚢᛁᚲᛏᛟᚱᛁᚨ' : 'ᛞᛖᚠᛖᚨᛏ'}
          </span>
        </div>
        <h1
          className={`heading-carved text-4xl md:text-6xl ${
            youWon ? 'text-[var(--color-gold)]' : 'text-[var(--color-accent)]'
          }`}
          data-testid="end-result"
        >
          {resultTitle}
        </h1>
        <p className="mt-3 text-[var(--color-text-secondary)] italic">
          {resultCopy}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {!hideRematch && (
            <WoodenButton
              variant="primary"
              onClick={requestRematch}
              disabled={youAsked}
              data-testid="rematch-button"
            >
              {youAsked ? 'Waiting on Foe...' : pendingRematch ? 'Accept Rematch' : 'Rematch'}
            </WoodenButton>
          )}
          <WoodenButton variant="gold" onClick={leave} data-testid="home-button">
            Back to Mead Hall
          </WoodenButton>
        </div>

        {!hideRematch && pendingRematch && !youAsked && (
          <p className="mt-4 text-sm text-[var(--color-gold)] italic">
            Your foe wants another round!
          </p>
        )}

        <div className="mt-8 parchment px-4 py-3 text-xs md:text-sm text-[#3a2a18] text-left">
          <div className="heading-carved text-[#3a2a18] mb-1">Last tales:</div>
          <div className="space-y-0.5">
            {snap.log.slice(-6).map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
