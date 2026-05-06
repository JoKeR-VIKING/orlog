import type { PlayerState, PlayerSide } from '../../game/types';
interface Props {
  player: PlayerState;
  side: PlayerSide;
  isSelf: boolean;
  active: boolean;
  floaters: { id: number; text: string; kind: 'dmg' | 'heal' | 'favor'; side: PlayerSide }[];
  align: 'left' | 'right';
}

export function PlayerHUD({ player, side, isSelf, active, floaters, align }: Props) {
  const testSide = side;
  return (
    <div
      className={`wood-panel relative px-2.5 py-2 md:px-3 md:py-2.5 w-48 md:w-56 ${active ? 'pulse-glow' : ''}`}
      data-testid={`player-hud-${testSide}`}
      style={{ textAlign: align }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="heading-carved text-sm md:text-base truncate"
          data-testid={`player-name-${testSide}`}
        >
          {player.name || (side === 'host' ? 'Host' : 'Guest')}
          {isSelf && <span className="ml-1.5 text-[10px] text-[var(--color-gold)] tracking-widest">(YOU)</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="favor-token scale-85" title={`${player.favor} favor`}>⌘</span>
          <span className="text-[var(--color-gold)] heading-carved text-sm md:text-base" data-testid={`player-favor-${testSide}`}>
            {player.favor}
          </span>
        </div>
      </div>

      {/* floaters */}
      <div className="absolute -top-3 left-0 right-0 pointer-events-none">
        {floaters
          .filter((f) => f.side === side)
          .map((f) => (
            <div
              key={f.id}
              className={`float-up heading-carved text-xl md:text-2xl font-bold ${
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
