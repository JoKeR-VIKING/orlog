import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_HP } from '../../game/engine';

const GEM_SHAPES = [
  { width: 30, height: 21, rotate: -18, clip: 'polygon(7% 46%, 24% 13%, 63% 3%, 92% 30%, 82% 77%, 39% 97%, 12% 78%)', shine: '26% 22%' },
  { width: 23, height: 31, rotate: 12, clip: 'polygon(47% 0%, 84% 12%, 99% 50%, 70% 94%, 29% 100%, 3% 62%, 16% 19%)', shine: '42% 18%' },
  { width: 32, height: 19, rotate: 7, clip: 'polygon(3% 44%, 20% 13%, 55% 0%, 93% 20%, 99% 59%, 70% 92%, 23% 84%)', shine: '32% 18%' },
  { width: 24, height: 29, rotate: -9, clip: 'polygon(36% 0%, 76% 9%, 100% 38%, 83% 82%, 43% 100%, 8% 77%, 0% 34%)', shine: '35% 16%' },
  { width: 29, height: 22, rotate: 21, clip: 'polygon(11% 27%, 41% 0%, 78% 8%, 100% 46%, 75% 88%, 31% 100%, 0% 68%)', shine: '40% 20%' },
  { width: 27, height: 27, rotate: -3, clip: 'polygon(50% 0%, 82% 13%, 100% 46%, 86% 83%, 51% 100%, 13% 85%, 0% 43%, 18% 12%)', shine: '48% 16%' },
] as const;

function gemStyle(index: number) {
  const shape = GEM_SHAPES[index % GEM_SHAPES.length];
  return {
    width: `${shape.width}px`,
    height: `${shape.height}px`,
    ['--gem-rot' as const]: `${shape.rotate}deg`,
    ['--gem-clip' as const]: shape.clip,
    ['--gem-shine' as const]: shape.shine,
    ['--gem-delay' as const]: `${(index % 7) * 110}ms`,
    transform: `rotate(${shape.rotate}deg) translateZ(0)`,
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
