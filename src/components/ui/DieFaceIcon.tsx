import type { DieFace } from '../../game/types';
import type { JSX } from 'react';

// SVG icons for each of the 6 dice faces — stroked glyphs, Viking aesthetic.
export function DieFaceIcon({
  face,
  size = 28,
  color = '#2a1606',
}: {
  face: DieFace;
  size?: number;
  color?: string;
}): JSX.Element {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (face) {
    case 'axe':
      // Dane axe
      return (
        <svg {...common}>
          <path d="M8 20 L22 6" />
          <path d="M18 4 C25 4 28 9 26 15 C22 11 17 10 15 12 Z" fill={color} fillOpacity="0.8" />
          <circle cx="8" cy="20" r="1.4" fill={color} />
          <path d="M8 20 L6 26" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M6 26 L26 6" />
          <path d="M20 6 L26 6 L26 12" />
          <path d="M6 26 L10 24 L8 28 Z" fill={color} fillOpacity="0.7" />
        </svg>
      );
    case 'helmet':
      // Viking helmet with nose guard
      return (
        <svg {...common}>
          <path d="M6 18 C6 11 10 6 16 6 C22 6 26 11 26 18 L26 22 L6 22 Z" fill={color} fillOpacity="0.15" />
          <path d="M16 8 L16 22" />
          <circle cx="11" cy="16" r="1.1" fill={color} />
          <circle cx="21" cy="16" r="1.1" fill={color} />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M16 5 L26 9 L26 17 C26 23 21 27 16 28 C11 27 6 23 6 17 L6 9 Z" fill={color} fillOpacity="0.15" />
          <path d="M16 5 L16 28" />
          <path d="M6 14 L26 14" />
        </svg>
      );
    case 'steal':
      // Hand grabbing coin
      return (
        <svg {...common}>
          <circle cx="21" cy="12" r="4" fill={color} fillOpacity="0.35" />
          <path d="M6 24 C8 18 12 17 17 19 C20 20 22 22 22 25" />
          <path d="M9 18 L9 13" />
          <path d="M12 17 L12 11" />
          <path d="M15 17 L15 12" />
        </svg>
      );
  }
}
