import { GOD_FAVORS, GOD_FAVOR_MAP } from '../../game/types';
import type { PlayerState } from '../../game/types';
import { WoodenButton } from './WoodenButton';

interface Props {
  player: PlayerState;
  canAct: boolean;
  onCast: (id: string) => void;
  onSkip: () => void;
}

export function GodFavorPanel({ player, canAct, onCast, onSkip }: Props) {
  const pendingCost = player.pendingFavors.reduce(
    (acc, id) => acc + (GOD_FAVOR_MAP[id]?.cost || 0),
    0,
  );
  const effectiveFavor = player.favor - pendingCost;

  return (
    <div
      className="parchment grain-overlay relative p-4 md:p-5 w-full max-w-3xl mx-auto rounded-sm"
      data-testid="god-favor-panel"
    >
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <div>
          <h3 className="heading-carved text-xl md:text-2xl text-[#3a2a18]">God Favors</h3>
          <p className="text-xs md:text-sm italic text-[#5c4427]">Call upon the Æsir. Priority resolves in order.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-xs md:text-sm text-[#3a2a18]">
            Favor <span className="favor-token mx-1 align-middle">⌘</span>
            <span className="font-bold">{effectiveFavor}</span>
            {pendingCost > 0 && <span className="text-[#8a6322] ml-1">(-{pendingCost})</span>}
          </div>
          <WoodenButton
            variant="gold"
            onClick={onSkip}
            disabled={!canAct}
            data-testid="skip-favors-button"
          >
            {player.pendingFavors.length > 0 ? 'Confirm' : 'Skip'}
          </WoodenButton>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        {GOD_FAVORS.map((g) => {
          const chosen = player.pendingFavors.includes(g.id);
          const affordable = effectiveFavor >= g.cost || chosen;
          return (
            <button
              key={g.id}
              className="text-left bg-[#1a1412]/92 border-2 border-[#2d3136] hover:border-[#c68234] rounded-sm p-3 disabled:opacity-45 disabled:cursor-not-allowed transition-all"
              style={{
                boxShadow: chosen
                  ? 'inset 0 0 12px rgba(198,130,52,0.35), 0 0 0 2px #c68234'
                  : '0 3px 8px rgba(0,0,0,0.45), inset 0 0 8px rgba(0,0,0,0.4)',
              }}
              disabled={!canAct || (!affordable && !chosen)}
              onClick={() => onCast(g.id)}
              data-testid={`god-favor-card-${g.id}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-2xl md:text-3xl font-bold rune-title"
                    style={{ color: '#c68234', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                  >
                    {g.icon}
                  </span>
                  <div>
                    <div className="heading-carved text-[var(--color-text-primary)] text-sm md:text-base leading-tight">
                      {g.name}
                    </div>
                    <div className="text-[10px] md:text-xs italic text-[var(--color-text-secondary)]">
                      {g.subtitle}
                    </div>
                  </div>
                </div>
                <div className="text-xs md:text-sm flex-shrink-0">
                  <span className="favor-token mr-1">⌘</span>
                  <span className="text-[var(--color-gold)] font-bold">{g.cost}</span>
                </div>
              </div>
              <p className="text-xs md:text-sm text-[var(--color-text-primary)]/90 leading-snug">
                {g.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
