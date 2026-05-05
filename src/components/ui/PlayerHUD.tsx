import type { PlayerState, PlayerSide } from '../../game/types';
import { MAX_HP } from '../../game/engine';

interface Props {
  player: PlayerState;
  side: PlayerSide;
  isSelf: boolean;
  active: boolean;
  floaters: { id: number; text: string; kind: 'dmg' | 'heal' | 'favor'; side: PlayerSide }[];
  align: 'left' | 'right';
}

export function PlayerHUD({ player, side, isSelf, active, floaters, align }: Props) {
  const stones = Array.from({ length: MAX_HP }, (_, i) => i < player.hp);
  const testSide = side;
  return (
    <div
      className={`wood-panel relative p-3 md:p-4 w-64 md:w-72 ${active ? 'pulse-glow' : ''}`}
      data-testid={`player-hud-${testSide}`}
      style={{ textAlign: align }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="heading-carved text-lg md:text-xl truncate"
          data-testid={`player-name-${testSide}`}
        >
          {player.name || (side === 'host' ? 'Host' : 'Guest')}
          {isSelf && <span className="ml-2 text-xs text-[var(--color-gold)] tracking-widest">(YOU)</span>}
        </div>
        <div className="flex items-center gap-1">
          <span className="favor-token" title={`${player.favor} favor`}>⌘</span>
          <span className="text-[var(--color-gold)] heading-carved text-lg" data-testid={`player-favor-${testSide}`}>
            {player.favor}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-[3px] max-w-full" data-testid={`player-hp-${testSide}`}>
        {stones.map((alive, i) => (
          <div key={i} className={`hp-stone ${alive ? '' : 'lost'}`} title={`HP ${i + 1}`} />
        ))}
      </div>
      <div className="mt-1 text-xs text-[var(--color-text-secondary)] tracking-wider">
        <span>HP </span>
        <span className="text-[var(--color-text-primary)] font-semibold">{player.hp}</span>
        <span> / {MAX_HP}</span>
      </div>

      {/* floaters */}
      <div className="absolute -top-4 left-0 right-0 pointer-events-none">
        {floaters
          .filter((f) => f.side === side)
          .map((f) => (
            <div
              key={f.id}
              className={`float-up heading-carved text-2xl md:text-3xl font-bold ${
                f.kind === 'dmg'
                  ? 'text-[var(--color-accent)]'
                  : f.kind === 'heal'
                    ? 'text-green-400'
                    : 'text-[var(--color-gold)]'
              }`}
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
            >
              {f.text}
            </div>
          ))}
      </div>
    </div>
  );
}
