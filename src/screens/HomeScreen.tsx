import { useEffect, useState } from 'react';
import { useStore } from '../store/useGameStore';
import { WoodenButton } from '../components/ui/WoodenButton';
import { isRealSupabase } from '../multiplayer/channel';
import type { Difficulty } from '../ai/orlogAI';
import { DIFFICULTY_LABEL, DIFFICULTY_SUBTITLE } from '../ai/orlogAI';
import { readUrlSession } from '../utils/sessionHash';

const DIFFS: Difficulty[] = ['skald', 'vikingr', 'berserkr'];

export default function HomeScreen() {
  const nameInput = useStore((s) => s.nameInput);
  const setName = useStore((s) => s.setName);
  const hostSession = useStore((s) => s.hostSession);
  const joinSession = useStore((s) => s.joinSession);
  const hostSoloSession = useStore((s) => s.hostSoloSession);
  const soundOn = useStore((s) => s.soundOn);
  const toggleSound = useStore((s) => s.toggleSound);
  const ambientOn = useStore((s) => s.ambientOn);
  const toggleAmbient = useStore((s) => s.toggleAmbient);
  const error = useStore((s) => s.error);
  // On mount, if URL hash has a code, prefill join input + auto-rejoin
  const initial = useState(() => {
    const url = readUrlSession();
    return url;
  })[0];
  const [code, setCode] = useState(initial.code || '');
  const [mode, setMode] = useState<'idle' | 'join' | 'solo'>(
    initial.code ? 'join' : initial.ai ? 'solo' : 'idle',
  );

  useEffect(() => {
    if (!nameInput) setName('Viking');
    // Fully-automatic rejoin: if URL hash has a code or ai, kick the session off
    // after a brief tick so the store/name is set.
    const t = setTimeout(() => {
      if (initial.code) {
        joinSession(initial.code);
      } else if (initial.ai) {
        hostSoloSession(initial.ai);
      }
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full overflow-auto">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-10 md:gap-14 items-center min-h-full">
        <div className="fade-up">
          <div className="rune-divider text-sm mb-4">
            <span>ᛟ ᚱ ᛚ ᛟ ᚷ</span>
          </div>
          <h1 className="heading-carved text-5xl md:text-7xl font-bold text-[var(--color-text-primary)] leading-[1.05]">
            ORLOG
          </h1>
          <p className="text-[var(--color-gold)] italic tracking-widest uppercase text-sm md:text-base mt-2">
            A Game of Fate &middot; 800 AD
          </p>
          <p className="text-[var(--color-text-secondary)] mt-5 leading-relaxed text-base md:text-lg max-w-lg">
            Cast the bones, call upon the Æsir, and carve your foe's fate into the Norns' cloth.
            Two warriors, six dice each, fifteen stones of life &mdash; only one shall tell the saga.
          </p>

          <div className="mt-8 parchment grain-overlay relative p-5 md:p-6 max-w-lg rounded-sm">
            <label className="block text-xs md:text-sm uppercase tracking-widest text-[#3a2a18] mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              maxLength={20}
              placeholder="Thy name, warrior"
              className="w-full bg-[#1a1412] text-[var(--color-text-primary)] border border-[#4a4e53] rounded-sm px-3 py-2 font-[var(--font-heading)] tracking-wider focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
              data-testid="name-input"
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <WoodenButton
                variant="primary"
                onClick={hostSession}
                className="flex-1"
                data-testid="create-session-button"
              >
                Forge a New Saga
              </WoodenButton>
              <WoodenButton
                onClick={() => setMode((m) => (m === 'join' ? 'idle' : 'join'))}
                className="flex-1"
                data-testid="toggle-join-button"
              >
                Join a Saga
              </WoodenButton>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              <WoodenButton
                variant="gold"
                onClick={() => setMode((m) => (m === 'solo' ? 'idle' : 'solo'))}
                className="flex-1"
                data-testid="toggle-solo-button"
              >
                Play Vs the Æsir (Solo)
              </WoodenButton>
            </div>

            {mode === 'join' && (
              <div className="mt-5 fade-up">
                <label className="block text-xs md:text-sm uppercase tracking-widest text-[#3a2a18] mb-2">
                  Session Rune (4-8 characters)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="ABCD23"
                    maxLength={8}
                    className="code-input flex-1"
                    data-testid="join-session-input"
                  />
                  <WoodenButton
                    variant="gold"
                    onClick={() => joinSession(code)}
                    disabled={code.length < 4}
                    data-testid="join-session-button"
                  >
                    Enter
                  </WoodenButton>
                </div>
                {error && (
                  <div className="mt-2 text-sm text-[var(--color-accent)]" data-testid="home-error">
                    {error}
                  </div>
                )}
              </div>
            )}

            {mode === 'solo' && (
              <div className="mt-5 fade-up">
                <label className="block text-xs md:text-sm uppercase tracking-widest text-[#3a2a18] mb-3">
                  Choose a Worthy Foe
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {DIFFS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => hostSoloSession(d)}
                      className="text-left bg-[#1a1412] hover:bg-[#251c19] border-2 border-[#4a3525] hover:border-[var(--color-gold)] rounded-sm px-4 py-3 transition-all"
                      data-testid={`difficulty-${d}-button`}
                      style={{ boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rune-title text-2xl text-[var(--color-gold)] w-7 text-center">
                            {i === 0 ? 'ᛋ' : i === 1 ? 'ᚢ' : 'ᛒ'}
                          </span>
                          <div>
                            <div className="heading-carved text-base text-[var(--color-text-primary)]">
                              {DIFFICULTY_LABEL[d]}
                            </div>
                            <div className="text-xs italic text-[var(--color-text-secondary)] leading-snug">
                              {DIFFICULTY_SUBTITLE[d]}
                            </div>
                          </div>
                        </div>
                        <span className="text-[var(--color-gold)] text-xl">›</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-[#8a7a60]/40">
              <button
                onClick={toggleSound}
                className="text-xs uppercase tracking-widest text-[#3a2a18] hover:text-[#8b261d] transition-colors"
                data-testid="toggle-sound"
              >
                Sound: {soundOn ? 'On' : 'Off'}
              </button>
              <button
                onClick={toggleAmbient}
                className="text-xs uppercase tracking-widest text-[#3a2a18] hover:text-[#8b261d] transition-colors"
                data-testid="toggle-ambient"
              >
                Ambient Drone: {ambientOn ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {!isRealSupabase() && (
            <p className="mt-5 text-xs text-[var(--color-text-secondary)] italic max-w-lg" data-testid="local-mode-notice">
              &#9888; Multiplayer running in local mode (no live Supabase keys). Open a second tab to play yourself, or pick "Play Vs the Æsir" for solo.
            </p>
          )}
        </div>

        <div className="hidden md:block fade-up" style={{ animationDelay: '0.15s' }}>
          <div className="wood-panel p-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-30"
                 style={{
                   background: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><g fill='none' stroke='%23c68234' stroke-opacity='0.55' stroke-width='1' font-family='serif' font-size='22'><text x='10' y='25'>ᚠ</text><text x='60' y='45'>ᚢ</text><text x='110' y='25'>ᚦ</text><text x='150' y='65'>ᛃ</text><text x='25' y='95'>ᚨ</text><text x='85' y='110'>ᚱ</text><text x='140' y='105'>ᚲ</text><text x='15' y='155'>ᚷ</text><text x='70' y='175'>ᚹ</text><text x='130' y='165'>ᚺ</text></g></svg>\")",
                 }}
            />
            <div className="relative z-10 text-center">
              <div className="rune-title text-4xl text-[var(--color-gold)] tracking-widest">ᚠᚢᚦᚨᚱᚲ</div>
              <h2 className="heading-carved text-xl md:text-2xl mt-3">Rules of Orlog</h2>
              <ul className="mt-4 space-y-2 text-sm md:text-base text-[var(--color-text-primary)] text-left">
                <li><span className="text-[var(--color-gold)] font-bold">◆</span> Roll 6 dice, reroll up to twice.</li>
                <li><span className="text-[var(--color-gold)] font-bold">◆</span> Keep dice by clicking them in your tray.</li>
                <li><span className="text-[var(--color-gold)] font-bold">◆</span> Axes / arrows deal damage; helmets / shields block.</li>
                <li><span className="text-[var(--color-gold)] font-bold">◆</span> Hands steal favor ⌘; runes earn favor.</li>
                <li><span className="text-[var(--color-gold)] font-bold">◆</span> Spend ⌘ to call upon the Æsir.</li>
                <li><span className="text-[var(--color-gold)] font-bold">◆</span> First to lose 15 HP loses the saga.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
