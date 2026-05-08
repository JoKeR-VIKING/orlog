import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store/useGameStore';
import { WoodenButton } from '../components/ui/WoodenButton';
import { TutorialModal } from '../components/ui/TutorialModal';
import { isRealSupabase } from '../multiplayer/channel';
import type { Difficulty } from '../ai/orlogAI';
import { DIFFICULTY_LABEL, DIFFICULTY_SUBTITLE } from '../ai/orlogAI';
import { readUrlSession } from '../utils/sessionHash';
import { FAVOR_LOADOUT_SIZE, GOD_FAVORS } from '../game/types';
import { showAchievements } from '../achievements/playGames';

const DIFFS: Difficulty[] = ['skald', 'vikingr', 'jarl', 'berserkr'];
const DIFFICULTY_RUNE: Record<Difficulty, string> = {
  skald: 'ᛋ',
  vikingr: 'ᚢ',
  jarl: 'ᛃ',
  berserkr: 'ᛒ',
};
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.orlog.play';
const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || 'https://orlog-ac.vercel.app';

// Nordic gods + legendary figures used as default names.
const NORDIC_NAMES = [
  'Odin', 'Thor', 'Freya', 'Loki', 'Tyr', 'Heimdall', 'Bragi', 'Idun',
  'Njord', 'Frigg', 'Sif', 'Ullr', 'Vidar', 'Vali', 'Hodr', 'Skadi',
  'Freyr', 'Eir', 'Saga', 'Hel', 'Sigyn', 'Fulla', 'Gefjun', 'Ran',
  'Ragnar', 'Bjorn', 'Lagertha', 'Ivar', 'Sigurd', 'Brynhild', 'Astrid',
  'Erik', 'Halfdan', 'Gunnar', 'Hrafn', 'Sven', 'Ulf', 'Ingrid', 'Helga',
];

function randomNordicName(): string {
  return NORDIC_NAMES[Math.floor(Math.random() * NORDIC_NAMES.length)];
}

export default function HomeScreen() {
  const nameInput = useStore((s) => s.nameInput);
  const setName = useStore((s) => s.setName);
  const hostSession = useStore((s) => s.hostSession);
  const joinSession = useStore((s) => s.joinSession);
  const quickMatch = useStore((s) => s.quickMatch);
  const cancelMatchmaking = useStore((s) => s.cancelMatchmaking);
  const hostSoloSession = useStore((s) => s.hostSoloSession);
  const favorLoadout = useStore((s) => s.favorLoadout);
  const setFavorLoadout = useStore((s) => s.setFavorLoadout);
  const soundOn = useStore((s) => s.soundOn);
  const toggleSound = useStore((s) => s.toggleSound);
  const ambientOn = useStore((s) => s.ambientOn);
  const toggleAmbient = useStore((s) => s.toggleAmbient);
  const error = useStore((s) => s.error);
  const matchmaking = useStore((s) => s.matchmaking);
  // On mount, if URL hash has a code, prefill join input + auto-rejoin
  const initial = useState(() => readUrlSession())[0];
  const [code, setCode] = useState(initial.code || '');
  const [mode, setMode] = useState<'idle' | 'join' | 'solo'>(
    initial.code ? 'join' : initial.ai ? 'solo' : 'idle',
  );
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const isAndroidApp = Capacitor.getPlatform() === 'android';

  const openPlatformLink = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isAndroidApp) return;
    event.preventDefault();
    const opened = window.open(WEBSITE_URL, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.assign(WEBSITE_URL);
  };

  const toggleFavor = (id: string) => {
    if (favorLoadout.includes(id)) {
      setFavorLoadout(favorLoadout.filter((favorId) => favorId !== id));
      return;
    }
    if (favorLoadout.length >= FAVOR_LOADOUT_SIZE) return;
    setFavorLoadout([...favorLoadout, id]);
  };

  useEffect(() => {
    if (!nameInput) setName(randomNordicName());
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
    <div className={`orlog-home-screen relative w-full h-full overflow-auto ${isAndroidApp ? 'android-app' : ''}`}>
      {isAndroidApp && (
        <div className="android-home-action-bar" data-testid="android-home-action-bar">
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="android-home-action primary"
            data-testid="android-tutorial-button"
          >
            <span aria-hidden="true">?</span>
            <strong>How to Play</strong>
          </button>
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noreferrer"
            onClick={openPlatformLink}
            className="android-home-action"
            data-testid="android-web-link"
            aria-label="Play ORLOG on the website"
          >
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M4 5.5C4 4.1 5.1 3 6.5 3h11C18.9 3 20 4.1 20 5.5v8c0 1.4-1.1 2.5-2.5 2.5h-4.2v2H16v2H8v-2h2.7v-2H6.5C5.1 16 4 14.9 4 13.5v-8Zm2.5-.3a.3.3 0 0 0-.3.3v8c0 .2.1.3.3.3h11c.2 0 .3-.1.3-.3v-8a.3.3 0 0 0-.3-.3h-11Z" />
              </svg>
            </span>
            <strong>Web</strong>
          </a>
          <button
            type="button"
            onClick={showAchievements}
            className="android-home-action"
            data-testid="android-achievements-button"
            aria-label="Open Play Games achievements"
          >
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M7 3h10v2h3v3.2c0 2.2-1.5 4.1-3.6 4.6-.6 1.5-1.8 2.7-3.4 3.1V19h4v2H7v-2h4v-3.1c-1.6-.4-2.8-1.6-3.4-3.1C5.5 12.3 4 10.4 4 8.2V5h3V3Zm0 4H6v1.2c0 1 .5 1.9 1.3 2.4C7.1 9.8 7 8.9 7 8V7Zm10 1c0 .9-.1 1.8-.3 2.6.8-.5 1.3-1.4 1.3-2.4V7h-1v1Zm-8-3v3c0 3 1.2 5.8 3 5.8S15 11 15 8V5H9Z" />
              </svg>
            </span>
          </button>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-12 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-10 md:gap-14 items-center min-h-full">
        <div className="fade-up">
          <div className="rune-divider text-sm mb-4">
            <span>ᛟ ᚱ ᛚ ᛟ ᚷ</span>
          </div>
          <div className="flex items-center gap-3 md:gap-5">
            <img
              src="/orlog-logo.svg"
              alt="ORLOG"
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0 drop-shadow-[0_8px_18px_rgba(0,0,0,0.65)]"
            />
            <h1 className="heading-carved text-4xl sm:text-5xl md:text-7xl font-bold text-text-primary leading-[1.05]">
              ORLOG
            </h1>
          </div>
          <p className="text-gold italic tracking-widest uppercase text-sm md:text-base mt-2">
            A Game of Fate &middot; 800 AD
          </p>
          <div className="orlog-home-utility-row mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              className="home-tutorial-plaque"
              data-testid="tutorial-button"
            >
              <span className="home-tutorial-seal" aria-hidden="true">?</span>
              <span className="home-tutorial-copy">
                <span>How to Play</span>
              </span>
            </button>
            <a
              href={isAndroidApp ? WEBSITE_URL : PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              onClick={openPlatformLink}
              className="home-platform-badge"
              data-testid="platform-link"
              aria-label={isAndroidApp ? 'Play ORLOG on the website' : 'Get ORLOG on Google Play'}
            >
              <span className="platform-link-icon" aria-hidden="true">
                {isAndroidApp ? (
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M4 5.5C4 4.1 5.1 3 6.5 3h11C18.9 3 20 4.1 20 5.5v8c0 1.4-1.1 2.5-2.5 2.5h-4.2v2H16v2H8v-2h2.7v-2H6.5C5.1 16 4 14.9 4 13.5v-8Zm2.5-.3a.3.3 0 0 0-.3.3v8c0 .2.1.3.3.3h11c.2 0 .3-.1.3-.3v-8a.3.3 0 0 0-.3-.3h-11Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="m5 3 12.8 7.3c1.5.9 1.5 2.5 0 3.4L5 21c-.8.4-1.5 0-1.5-.9V3.9C3.5 3 4.2 2.6 5 3Zm1 3.5v11l5.2-5.5L6 6.5Zm1.1-.8 5.2 5.5 2.1-2.2-7.3-3.3Zm7.3 9.3-2.1-2.2-5.2 5.5 7.3-3.3Zm1.8-1 1-.6c.5-.3.5-.5 0-.8l-1-.6-2.4 2 2.4 2Z" />
                  </svg>
                )}
              </span>
              <span>{isAndroidApp ? 'Web' : 'Android'}</span>
            </a>
            {isAndroidApp && (
              <button
                type="button"
                onClick={showAchievements}
                className="home-platform-badge"
                data-testid="achievements-button"
                aria-label="Open Play Games achievements"
              >
                <span className="platform-link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M7 3h10v2h3v3.2c0 2.2-1.5 4.1-3.6 4.6-.6 1.5-1.8 2.7-3.4 3.1V19h4v2H7v-2h4v-3.1c-1.6-.4-2.8-1.6-3.4-3.1C5.5 12.3 4 10.4 4 8.2V5h3V3Zm0 4H6v1.2c0 1 .5 1.9 1.3 2.4C7.1 9.8 7 8.9 7 8V7Zm10 1c0 .9-.1 1.8-.3 2.6.8-.5 1.3-1.4 1.3-2.4V7h-1v1Zm-8-3v3c0 3 1.2 5.8 3 5.8S15 11 15 8V5H9Z" />
                  </svg>
                </span>
                <span>Achievements</span>
              </button>
            )}
          </div>
          <p className="text-text-secondary mt-5 leading-relaxed text-base md:text-lg max-w-lg">
            Cast the bones, call upon the Æsir, and carve your foe's fate into the Norns' cloth.
            Two warriors, six dice each, fifteen stones of life &mdash; only one shall tell the saga.
          </p>
          <p className="text-text-secondary/70 mt-3 leading-relaxed text-xs md:text-sm max-w-lg italic">
            * Fan-made dice battle inspired by the Orlog mini-game from Assassin's Creed Valhalla.
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
              className="w-full bg-bg-primary text-text-primary border border-iron rounded-sm px-3 py-2 font-(--font-heading) tracking-wider focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
              data-testid="name-input"
            />

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-xs md:text-sm uppercase tracking-widest text-[#3a2a18]">
                  God Favor Loadout (Optional)
                </label>
                <span className="text-xs uppercase tracking-widest text-[#5c4427]">
                  {favorLoadout.length}/{FAVOR_LOADOUT_SIZE}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {GOD_FAVORS.map((favor) => {
                  const selected = favorLoadout.includes(favor.id);
                  const disabled = !selected && favorLoadout.length >= FAVOR_LOADOUT_SIZE;
                  return (
                    <button
                      key={favor.id}
                      type="button"
                      onClick={() => toggleFavor(favor.id)}
                      disabled={disabled}
                      className={`text-left bg-bg-primary border-2 rounded-sm px-3 py-2 transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                        selected ? 'border-gold' : 'border-[#4a3525] hover:border-gold'
                      }`}
                      style={{
                        boxShadow: selected
                          ? 'inset 0 0 12px rgba(198,130,52,0.35), 0 0 0 2px rgba(198,130,52,0.45)'
                          : 'inset 0 0 8px rgba(0,0,0,0.45)',
                      }}
                      data-testid={`loadout-favor-${favor.id}`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="rune-title text-xl text-gold w-6 text-center shrink-0">
                          {favor.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="heading-carved text-xs text-text-primary leading-tight wrap-break-word">
                            {favor.name}
                          </div>
                          <div className="text-[10px] text-text-secondary leading-snug">
                            <span className="favor-token">⌘</span> {favor.cost} · {favor.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

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
                variant="primary"
                onClick={matchmaking ? cancelMatchmaking : quickMatch}
                className="flex-1"
                data-testid="quick-match-button"
              >
                {matchmaking ? 'Cancel Search' : 'Find Online Match'}
              </WoodenButton>
            </div>

            {matchmaking && (
              <div className="mt-3 text-xs uppercase tracking-widest text-[#5c4427]" data-testid="matchmaking-status">
                Searching for a worthy opponent...
              </div>
            )}

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
                  <div className="mt-2 text-sm text-accent" data-testid="home-error">
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
                  {DIFFS.map((d) => (
                    <button
                      key={d}
                      onClick={() => hostSoloSession(d)}
                      className="text-left bg-bg-primary hover:bg-[#251c19] border-2 border-[#4a3525] hover:border-gold rounded-sm px-4 py-3 transition-all"
                      data-testid={`difficulty-${d}-button`}
                      style={{ boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rune-title text-2xl text-gold w-7 text-center">
                            {DIFFICULTY_RUNE[d]}
                          </span>
                          <div>
                            <div className="heading-carved text-base text-text-primary">
                              {DIFFICULTY_LABEL[d]}
                            </div>
                            <div className="text-xs italic text-text-secondary leading-snug">
                              {DIFFICULTY_SUBTITLE[d]}
                            </div>
                          </div>
                        </div>
                        <span className="text-gold text-xl">›</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-[#8a7a60]/40">
              <button
                onClick={toggleSound}
                className="text-xs uppercase tracking-widest text-[#3a2a18] hover:text-blood transition-colors"
                data-testid="toggle-sound"
              >
                Sound: {soundOn ? 'On' : 'Off'}
              </button>
              <button
                onClick={toggleAmbient}
                className="text-xs uppercase tracking-widest text-[#3a2a18] hover:text-blood transition-colors"
                data-testid="toggle-ambient"
              >
                Ambient Drone: {ambientOn ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {!isRealSupabase() && (
            <p className="mt-5 text-xs text-text-secondary italic max-w-lg" data-testid="local-mode-notice">
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
              <div className="rune-title text-4xl text-gold tracking-widest">ᚠᚢᚦᚨᚱᚲ</div>
              <h2 className="heading-carved text-xl md:text-2xl mt-3">Rules of Orlog</h2>
              <ul className="mt-4 space-y-2 text-sm md:text-base text-text-primary text-left">
                <li><span className="text-gold font-bold">◆</span> Roll 6 dice, reroll up to twice.</li>
                <li><span className="text-gold font-bold">◆</span> Keep dice by clicking them in your tray.</li>
                <li><span className="text-gold font-bold">◆</span> Axes / arrows deal damage; helmets / shields block.</li>
                <li><span className="text-gold font-bold">◆</span> Hands steal favor ⌘; runes earn favor.</li>
                <li><span className="text-gold font-bold">◆</span> Spend ⌘ to call upon the Æsir.</li>
                <li><span className="text-gold font-bold">◆</span> First to lose 15 HP loses the saga.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <TutorialModal
        key={tutorialOpen ? 'tutorial-open' : 'tutorial-closed'}
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
      />
    </div>
  );
}
