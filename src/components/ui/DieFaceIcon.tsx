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
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (face) {
    case 'axe':
      return (
        <svg {...common}>
          <path d="M9 25 L21 5" />
          <path d="M19 4 C26 4 29 9 26 15 C23 12 19 11 16 13 C17 9 18 6 19 4 Z" fill={color} fillOpacity="0.82" />
          <path d="M16 13 C12 12 10 10 10 7 C14 7 17 9 18 11 Z" fill={color} fillOpacity="0.45" />
          <circle cx="9" cy="25" r="1.5" fill={color} />
          <path d="M12 20 L7 19" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 16 L24 16" />
          <path d="M24 10 L29 16 L24 22 Z" fill={color} fillOpacity="0.82" />
          <path d="M8 16 L4 11 M8 16 L4 21 M11 16 L7 12 M11 16 L7 20" />
        </svg>
      );
    case 'helmet':
      return (
        <svg {...common}>
          <path d="M7 17 C8 10 11 6 16 6 C21 6 24 10 25 17 L24 22 L8 22 Z" fill={color} fillOpacity="0.2" />
          <path d="M7 17 L25 17" />
          <path d="M16 8 L16 24" />
          <path d="M10 17 L8 24 M22 17 L24 24" />
          <path d="M9 12 C6 9 5 7 4 5 M23 12 C26 9 27 7 28 5" />
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
      // Stealing hand silhouette
      return (
        <svg {...common}>
          <path
            d="M9.8 24.8 C7.7 23.7 6.7 21.3 7.4 19.2 C8.1 17.2 10.2 16.1 12.2 16.5 L12.1 10.5
               C12.1 9.4 13 8.5 14.1 8.5 C15.2 8.5 16.1 9.4 16.1 10.5 L16.1 15.1
               L17.7 15.1 L17.7 11.7 C17.7 10.8 18.4 10 19.4 10 C20.3 10 21.1 10.8 21.1 11.7
               L21.1 15.9 L22.3 16.5 L23.1 14.2 C23.5 13.3 24.6 12.9 25.5 13.3
               C26.4 13.7 26.8 14.7 26.5 15.6 L24.9 20.6 C24.2 22.8 22.5 24.5 20.4 25.3
               L16.8 26.6 C14.5 27.4 11.9 26.9 9.8 24.8 Z"
            fill={color}
            stroke="none"
          />
          <path d="M10.4 8.6 C8.9 7.3 7.6 6.9 6.3 6.8" />
          <path d="M13.4 6.8 C12.2 5.1 10.8 4.3 9.2 3.9" />
          <path d="M16.6 6.1 C15.9 4.4 14.8 3.1 13.5 2.1" />
        </svg>
      );
  }
}
