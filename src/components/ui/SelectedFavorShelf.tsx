import { useMemo, useState } from 'react';
import { GOD_FAVOR_MAP, sanitizeFavorLoadout } from '../../game/types';
import type { PlayerState } from '../../game/types';

const FAVOR_IMAGE_FILES: Partial<Record<string, string>> = {
  baldr: 'ACV Orlog Baldr.png',
  brunhild: 'ACV Orlog Brunhild.png',
  freyr: 'ACV Orlog Freyr.png',
  heimdall: 'ACV Orlog Heimdall.png',
  hel: 'ACV Orlog Hel.png',
  idun: 'ACV Orlog Idun.png',
  loki: 'ACV Orlog Loki.png',
  mimir: 'ACV Orlog Mimir.png',
  skadi: 'ACV Orlog Skadi.png',
  skuld: 'ACV Orlog Skuld.png',
  thor: 'ACV Orlog Thor.png',
  ullr: 'ACV Orlog Ullr.png',
  vidar: 'ACV Orlog Vidar.png',
};

function favorImageUrl(id: string): string | null {
  const file = FAVOR_IMAGE_FILES[id];
  if (!file) return null;
  return `https://assassinscreed.fandom.com/wiki/Special:Redirect/file/${encodeURIComponent(file)}`;
}

function FavorStatue({
  favorId,
  selected,
}: {
  favorId: string;
  selected: boolean;
}) {
  const favor = GOD_FAVOR_MAP[favorId];
  const [imageFailed, setImageFailed] = useState(false);
  const [open, setOpen] = useState(false);
  if (!favor) return null;
  const imageUrl = favorImageUrl(favorId);

  return (
    <button
      type="button"
      className={`favor-statue ${selected ? 'selected' : ''}`}
      data-testid={`selected-favor-${favor.id}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((current) => !current)}
    >
      <div className="favor-statue-figure">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={favor.name}
            className="favor-statue-image"
            loading="lazy"
            onError={() => setImageFailed(true)}
            referrerPolicy="no-referrer"
            draggable={false}
          />
        ) : (
          <div className="favor-statue-fallback rune-title">{favor.icon}</div>
        )}
      </div>
      <div className="favor-statue-plaque">
        <span className="favor-statue-rune rune-title">{favor.icon}</span>
      </div>
      {open && (
        <div className="favor-statue-tooltip" role="tooltip">
          <div className="favor-statue-tooltip-title">{favor.name}</div>
          <div className="favor-statue-tooltip-cost">
            Cost <span className="favor-token">⌘</span>
            <span>{favor.cost}</span>
          </div>
          <div className="favor-statue-tooltip-text">{favor.description}</div>
        </div>
      )}
    </button>
  );
}

export function SelectedFavorShelf({
  player,
}: {
  player: PlayerState;
}) {
  const loadout = useMemo(
    () =>
      sanitizeFavorLoadout(player.availableFavors)
        .map((id) => GOD_FAVOR_MAP[id])
        .filter(Boolean),
    [player.availableFavors],
  );

  if (loadout.length === 0) return null;

  return (
    <div className="favor-shelf" data-testid="selected-favor-shelf">
      <div className="favor-shelf-items">
        {loadout.map((favor) => (
          <FavorStatue key={favor.id} favorId={favor.id} selected={player.pendingFavors.includes(favor.id)} />
        ))}
      </div>
    </div>
  );
}
