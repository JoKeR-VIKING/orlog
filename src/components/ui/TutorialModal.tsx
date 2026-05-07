import { useEffect, useMemo, useState } from 'react';
import type { DieFace } from '../../game/types';
import { DieFaceIcon } from './DieFaceIcon';

type SlideKind =
  | 'setup'
  | 'goal'
  | 'roll'
  | 'dice'
  | 'timing'
  | 'exampleSetup'
  | 'exampleEarly'
  | 'exampleAttack'
  | 'exampleSteal'
  | 'exampleLate'
  | 'online';

interface TutorialSlide {
  title: string;
  caption: string;
  kind: SlideKind;
}

const SLIDES: TutorialSlide[] = [
  {
    title: 'Prepare the Saga',
    caption: 'Name your warrior, choose up to three god favors, then play solo, by code, or through matchmaking.',
    kind: 'setup',
  },
  {
    title: 'Win the Duel',
    caption: 'Both players start with 15 health. Every round is about choosing which dice to keep, when to spend favor, and how to survive the final count.',
    kind: 'goal',
  },
  {
    title: 'Roll and Keep',
    caption: 'Roll six dice. Click dice to keep them. Unkept dice may be rerolled until your three rolls are spent, then your tray is locked.',
    kind: 'roll',
  },
  {
    title: 'Read the Dice',
    caption: 'Axes and arrows attack. Helmets block axes, shields block arrows, hands steal favor, and any gold-marked die also earns one favor.',
    kind: 'dice',
  },
  {
    title: 'Timing Matters',
    caption: 'Favor is not one single moment. Early gods change dice before attacks, steal moves favor after attacks, and late gods resolve last.',
    kind: 'timing',
  },
  {
    title: 'Example: Locked Dice',
    caption: 'In this dummy round you begin with 3 favor. Your gold dice add 3 more, and you choose both Vidar and Thor before seeing if the math survives.',
    kind: 'exampleSetup',
  },
  {
    title: 'Example: Early Favor',
    caption: "Vidar resolves before attacks. It removes the foe's helmets, so your axes will be harder to block when damage is counted.",
    kind: 'exampleEarly',
  },
  {
    title: 'Example: Attacks',
    caption: 'Axes compare against helmets and arrows compare against shields. Removed blocks stay removed, so the earlier favor changes this count.',
    kind: 'exampleAttack',
  },
  {
    title: 'Example: Steal',
    caption: "Steal dice happen before late favors. Jarl's hand takes favor now, and that can decide whether your late favor still has enough to resolve.",
    kind: 'exampleSteal',
  },
  {
    title: 'Example: Late Favor',
    caption: 'Late favors are last. Their costs are checked after gold gain, early favors, attacks, and steals have already changed the board.',
    kind: 'exampleLate',
  },
  {
    title: 'Win Anywhere',
    caption: 'Reduce the enemy from 15 health to 0. Android and web players can fight in the same online matches.',
    kind: 'online',
  },
];

function MiniDie({ face, favor, kept }: { face: DieFace | 'favor' | 'hidden'; favor?: boolean; kept?: boolean }) {
  return (
    <div className={`tutorial-die ${favor ? 'favor' : ''} ${kept ? 'kept' : ''}`}>
      {face === 'hidden' ? (
        <span>?</span>
      ) : face === 'favor' ? (
        <span>⌘</span>
      ) : (
        <DieFaceIcon face={face} size={25} />
      )}
    </div>
  );
}

function SetupFrame() {
  return (
    <div className="tutorial-shot">
      <div className="tutorial-home-mini">
        <div className="tutorial-logo-row">
          <div className="tutorial-logo">ᛟ</div>
          <div>
            <div className="heading-carved text-xl">ORLOG</div>
            <div className="tutorial-gold-line">A Game of Fate</div>
          </div>
        </div>
        <div className="tutorial-field">Eivor</div>
        <div className="tutorial-favor-grid">
          {['ᚦ Thor', 'ᛁ Idun', 'ᚢ Vidar'].map((label) => (
            <div className="tutorial-favor-mini selected" key={label}>{label}</div>
          ))}
        </div>
        <div className="tutorial-button-row">
          <div>Forge Saga</div>
          <div>Join Code</div>
          <div>Find Match</div>
        </div>
      </div>
    </div>
  );
}

function RollFrame() {
  return (
    <div className="tutorial-shot">
      <div className="tutorial-board-mini">
        <div className="tutorial-hud left">Foe · 15 <span>⌘ 2</span></div>
        <div className="tutorial-hud right">You · 15 <span>⌘ 3</span></div>
        <div className="tutorial-round">Round 1 · Roll Phase</div>
        <div className="tutorial-table">
          <div className="tutorial-dice-row opponent">
            <MiniDie face="hidden" />
            <MiniDie face="hidden" />
            <MiniDie face="hidden" />
            <MiniDie face="hidden" />
          </div>
          <div className="tutorial-dice-row self">
            <MiniDie face="axe" kept />
            <MiniDie face="steal" favor kept />
            <MiniDie face="shield" />
            <MiniDie face="steal" />
            <MiniDie face="arrow" favor />
            <MiniDie face="helmet" />
          </div>
        </div>
        <div className="tutorial-actions">
          <span>Shake & Roll</span>
          <span>Lock Dice</span>
        </div>
      </div>
    </div>
  );
}

function DiceFrame() {
  const dice = [
    ['axe', 'Axe', 'Melee damage'],
    ['arrow', 'Arrow', 'Ranged damage'],
    ['helmet', 'Helmet', 'Blocks axes'],
    ['shield', 'Shield', 'Blocks arrows'],
    ['steal', 'Hand', 'Takes favor'],
    ['favor', 'Gold edge', 'Gains favor'],
  ] as const satisfies ReadonlyArray<readonly [DieFace | 'favor', string, string]>;
  return (
    <div className="tutorial-shot">
      <div className="tutorial-dice-guide">
        {dice.map(([icon, label, text]) => (
          <div className="tutorial-dice-card" key={label}>
            <MiniDie face={icon} favor={label === 'Gold edge'} />
            <div>
              <div className="heading-carved text-sm">{label}</div>
              <div>{text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalFrame() {
  return (
    <div className="tutorial-shot">
      <div className="tutorial-goal-board">
        <div className="tutorial-warrior-card">
          <span>You</span>
          <strong>15 HP</strong>
          <small>⌘ 0 favor</small>
        </div>
        <div className="tutorial-win-track">
          {Array.from({ length: 15 }, (_, i) => (
            <span key={i} className={i > 9 ? 'lost' : ''} />
          ))}
        </div>
        <div className="tutorial-warrior-card foe">
          <span>Jarl</span>
          <strong>15 HP</strong>
          <small>⌘ 0 favor</small>
        </div>
        <div className="tutorial-goal-note">
          Damage removes health stones. Favor buys god powers. The player who reaches 0 health loses.
        </div>
      </div>
    </div>
  );
}

function TimingFrame() {
  return (
    <div className="tutorial-shot">
      <div className="tutorial-timing-panel">
        <div className="tutorial-timing-step">
          <strong>1</strong>
          <span>Gold dice add favor</span>
          <small>Before any god tries to spend.</small>
        </div>
        <div className="tutorial-timing-step early">
          <strong>2</strong>
          <span>Early favors</span>
          <small>Baldr, Skadi, Vidar, Ullr, Brunhild, Freyr, Loki.</small>
        </div>
        <div className="tutorial-timing-step">
          <strong>3</strong>
          <span>Normal attacks</span>
          <small>Axe vs helmet, arrow vs shield.</small>
        </div>
        <div className="tutorial-timing-step steal">
          <strong>4</strong>
          <span>Steal dice</span>
          <small>Hands take favor after attacks.</small>
        </div>
        <div className="tutorial-timing-step late">
          <strong>5</strong>
          <span>Late favors</span>
          <small>Thor, Heimdall, Hel, Idun, Skuld, Mimir resolve last.</small>
        </div>
        <div className="tutorial-timing-warning">
          Costs are checked when each god resolves. Steals can leave a late god without enough favor.
        </div>
      </div>
    </div>
  );
}

function ExampleStats({ youFavor, foeFavor, foeHp }: { youFavor: string; foeFavor: string; foeHp: string }) {
  return (
    <div className="tutorial-example-stats">
      <div><span>You</span><strong>{youFavor}</strong></div>
      <div><span>Jarl</span><strong>{foeHp}</strong><strong>{foeFavor}</strong></div>
    </div>
  );
}

function ExampleDiceRows({ stage }: { stage: 'setup' | 'early' | 'attack' | 'late' | 'steal' }) {
  return (
    <div className={`tutorial-example-dice stage-${stage}`}>
      <div className="tutorial-example-row">
        <span>You</span>
        <MiniDie face="axe" kept />
        <MiniDie face="axe" kept />
        <MiniDie face="arrow" favor kept />
        <MiniDie face="shield" favor kept />
        <MiniDie face="helmet" kept />
        <MiniDie face="shield" favor kept />
      </div>
      <div className="tutorial-example-row foe">
        <span>Jarl</span>
        <MiniDie face="helmet" kept />
        <MiniDie face="steal" kept />
        <MiniDie face="arrow" kept />
        <MiniDie face="shield" kept />
        <MiniDie face="shield" kept />
        <MiniDie face="axe" kept />
      </div>
    </div>
  );
}

function ExampleFrame({ stage }: { stage: 'setup' | 'early' | 'attack' | 'late' | 'steal' }) {
  const copy = {
    setup: {
      stats: { youFavor: '⌘ 3 + 3 gold = 6', foeFavor: '⌘ 5', foeHp: '9 HP' },
      title: 'You choose Vidar and Thor',
      lines: ['Vidar costs 2 and resolves early.', 'Thor costs 4 and resolves late.', "Jarl's hand will steal before late favors."],
    },
    early: {
      stats: { youFavor: '⌘ 6 -> 4', foeFavor: '⌘ 5', foeHp: '9 HP' },
      title: "Vidar removes Jarl's helmet",
      lines: ['Early favors can change the dice count.', 'The helmet is gone before axes attack.', 'Your two axes now have no helmet block.'],
    },
    attack: {
      stats: { youFavor: '⌘ 4', foeFavor: '⌘ 5', foeHp: '9 -> 7 HP' },
      title: 'Normal damage is counted',
      lines: ['Your 2 axes deal 2 damage.', "Your arrow is blocked by Jarl's shield.", "Jarl's attacks are blocked by your helmet and shield."],
    },
    late: {
      stats: { youFavor: '⌘ 3', foeFavor: '⌘ 5 -> 6', foeHp: '7 HP' },
      title: 'Thor checks last and fails',
      lines: ['Late favors resolve after steal.', 'Thor needs 4 favor, but you have 3.', 'The player must judge whether the favor will still do any good.'],
    },
    steal: {
      stats: { youFavor: '⌘ 4 -> 3', foeFavor: '⌘ 5 -> 6', foeHp: '7 HP' },
      title: "Jarl's hand steals before Thor",
      lines: ['The hand takes 1 favor from you.', 'That changes the favor available for late gods.', 'The later cost is checked with this new total.'],
    },
  }[stage];

  return (
    <div className="tutorial-shot">
      <div className="tutorial-example-panel">
        <ExampleStats {...copy.stats} />
        <ExampleDiceRows stage={stage} />
        <div className="tutorial-example-callout">
          <div className="heading-carved">{copy.title}</div>
          {copy.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function OnlineFrame() {
  return (
    <div className="tutorial-shot">
      <div className="tutorial-online">
        <div className="tutorial-device desktop">
          <span>WEB</span>
          <div className="tutorial-device-screen">Code ABCD23</div>
        </div>
        <div className="tutorial-link-rune">ᛟ</div>
        <div className="tutorial-device phone">
          <span>ANDROID</span>
          <div className="tutorial-device-screen">Find Match</div>
        </div>
      </div>
    </div>
  );
}

function SlideFrame({ kind }: { kind: SlideKind }) {
  switch (kind) {
    case 'setup':
      return <SetupFrame />;
    case 'goal':
      return <GoalFrame />;
    case 'roll':
      return <RollFrame />;
    case 'dice':
      return <DiceFrame />;
    case 'timing':
      return <TimingFrame />;
    case 'exampleSetup':
      return <ExampleFrame stage="setup" />;
    case 'exampleEarly':
      return <ExampleFrame stage="early" />;
    case 'exampleAttack':
      return <ExampleFrame stage="attack" />;
    case 'exampleSteal':
      return <ExampleFrame stage="steal" />;
    case 'exampleLate':
      return <ExampleFrame stage="late" />;
    case 'online':
      return <OnlineFrame />;
  }
}

export function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const progress = useMemo(() => `${index + 1}/${SLIDES.length}`, [index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1));
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(SLIDES.length - 1, current + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="tutorial-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-modal-card wood-panel grain-overlay">
        <div className="tutorial-modal-header">
          <div>
            <div className="rune-title text-[var(--color-gold)] text-lg">ᚠᚢᚦᚨᚱᚲ</div>
            <h2 id="tutorial-title" className="heading-carved text-xl md:text-2xl">
              {slide.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="tutorial-close" aria-label="Close tutorial">
            ×
          </button>
        </div>

        <SlideFrame kind={slide.kind} />

        <p className="tutorial-caption">{slide.caption}</p>

        <div className="tutorial-dots" aria-label={`Tutorial slide ${progress}`}>
          {SLIDES.map((item, dotIndex) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Go to ${item.title}`}
              className={dotIndex === index ? 'active' : ''}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>

        <div className="tutorial-modal-footer">
          <button
            type="button"
            className="btn-wood"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
          >
            Back
          </button>
          <span className="tutorial-progress">{progress}</span>
          {index === SLIDES.length - 1 ? (
            <button type="button" className="btn-wood gold" onClick={onClose}>
              Ready
            </button>
          ) : (
            <button
              type="button"
              className="btn-wood gold"
              onClick={() => setIndex((current) => Math.min(SLIDES.length - 1, current + 1))}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
