import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_HP } from '../../game/engine';

const GEM_SHAPES = [
  { width: 26, height: 18, rotate: -18, radius: '58% 42% 55% 45% / 42% 56% 44% 58%' },
  { width: 22, height: 26, rotate: 14, radius: '48% 52% 46% 54% / 42% 44% 56% 58%' },
  { width: 28, height: 16, rotate: 8, radius: '60% 40% 56% 44% / 48% 52% 48% 52%' },
  { width: 20, height: 24, rotate: -10, radius: '44% 56% 46% 54% / 54% 40% 60% 46%' },
  { width: 25, height: 19, rotate: 22, radius: '55% 45% 58% 42% / 52% 48% 52% 48%' },
] as const;

function gemStyle(index: number) {
  const shape = GEM_SHAPES[index % GEM_SHAPES.length];
  return {
    width: `${shape.width}px`,
    height: `${shape.height}px`,
    ['--gem-rot' as const]: `${shape.rotate}deg`,
    transform: `rotate(${shape.rotate}deg)`,
    borderRadius: shape.radius,
  };
}

interface Props {
  hp: number;
  side: 'self' | 'opponent';
}

export function HealthGemRack({ hp, side }: Props) {
  const prevHp = useRef(hp);
  const [vanishing, setVanishing] = useState<number[]>([]);
  const [appearing, setAppearing] = useState<number[]>([]);

  useEffect(() => {
    if (hp < prevHp.current) {
      const removed = Array.from({ length: prevHp.current - hp }, (_, i) => hp + i);
      setAppearing((current) => current.filter((index) => !removed.includes(index)));
      setVanishing((current) => Array.from(new Set([...current, ...removed])));
      const timeout = window.setTimeout(() => {
        setVanishing((current) => current.filter((index) => !removed.includes(index)));
      }, 780);
      prevHp.current = hp;
      return () => window.clearTimeout(timeout);
    }
    if (hp > prevHp.current) {
      const restored = Array.from({ length: hp - prevHp.current }, (_, i) => prevHp.current + i);
      setVanishing((current) => current.filter((index) => !restored.includes(index)));
      setAppearing((current) => Array.from(new Set([...current, ...restored])));
      const timeout = window.setTimeout(() => {
        setAppearing((current) => current.filter((index) => !restored.includes(index)));
      }, 820);
      prevHp.current = hp;
      return () => window.clearTimeout(timeout);
    }
    prevHp.current = hp;
    return undefined;
  }, [hp]);

  const gems = useMemo(
    () =>
      Array.from({ length: MAX_HP }, (_, index) => {
        const alive = index < hp;
        const isVanishing = vanishing.includes(index);
        const isAppearing = appearing.includes(index);
        return { index, alive, isVanishing, isAppearing };
      }),
    [appearing, hp, vanishing],
  );

  return (
    <div
      className={`health-gem-rack ${side}`}
      data-testid={`health-gem-rack-${side}`}
      aria-label={`${hp} health stones remaining`}
    >
      {gems.map(({ index, alive, isVanishing, isAppearing }) => {
        if (!alive && !isVanishing && !isAppearing) return null;
        return (
          <div
            key={index}
            className={`health-gem ${alive ? 'alive' : ''} ${isVanishing ? 'vanishing' : ''} ${isAppearing ? 'appearing' : ''}`}
            style={gemStyle(index)}
            title={`Health stone ${index + 1}`}
          />
        );
      })}
    </div>
  );
}
