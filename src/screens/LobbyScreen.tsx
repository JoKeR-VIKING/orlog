import { useMemo, useState } from 'react';
import { useStore } from '../store/useGameStore';
import { WoodenButton } from '../components/ui/WoodenButton';

export default function LobbyScreen() {
  const code = useStore((s) => s.code);
  const presence = useStore((s) => s.presence);
  const selfSide = useStore((s) => s.selfSide);
  const opponentPresent = useStore((s) => s.opponentPresent);
  const leave = useStore((s) => s.leave);
  const [copied, setCopied] = useState(false);

  const isHost = selfSide === 'host';

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = code; document.body.appendChild(el); el.select();
      try { document.execCommand('copy'); } finally { document.body.removeChild(el); }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const chars = useMemo(() => (code || '').split(''), [code]);

  return (
    <div className="w-full h-full overflow-auto flex items-center justify-center p-6">
      <div className="w-full max-w-xl fade-up" data-testid="lobby-screen">
        <div className="wood-panel p-6 md:p-8">
          <div className="rune-divider text-sm mb-3">
            <span>ᚺᚨᛁᛚ</span>
          </div>
          <h2 className="heading-carved text-3xl md:text-4xl text-center">
            {isHost ? 'Awaiting a challenger' : 'Joining the Saga'}
          </h2>
          <p className="text-center text-[var(--color-text-secondary)] italic mt-1 text-sm md:text-base">
            {isHost
              ? 'Share this rune with a fellow warrior.'
              : opponentPresent
                ? 'Two warriors bound — the saga begins.'
                : 'Waiting for the host to be ready...'}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2" data-testid="session-code">
            {chars.map((c, i) => (
              <div
                key={i}
                className="w-12 h-14 md:w-14 md:h-16 flex items-center justify-center parchment rounded-sm heading-carved text-2xl md:text-3xl text-[#3a2a18]"
                style={{ boxShadow: 'inset 0 0 10px rgba(80,50,20,0.45), 0 2px 6px rgba(0,0,0,0.5)' }}
              >
                {c}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <WoodenButton variant="gold" onClick={copy} data-testid="copy-code-button">
              {copied ? 'Copied ✓' : 'Copy Rune'}
            </WoodenButton>
            <WoodenButton onClick={leave} data-testid="leave-lobby-button">
              Leave
            </WoodenButton>
          </div>

          <div className="rune-divider text-sm mt-8 mb-2" />

          <div className="grid grid-cols-2 gap-3 mt-2 text-sm md:text-base">
            <div className="parchment p-3 text-center">
              <div className="uppercase tracking-widest text-xs text-[#3a2a18] mb-1">Host</div>
              <div className="heading-carved text-[#3a2a18]">
                {presence?.hostId ? '✓ Ready' : '...'}
              </div>
            </div>
            <div className="parchment p-3 text-center">
              <div className="uppercase tracking-widest text-xs text-[#3a2a18] mb-1">Guest</div>
              <div className="heading-carved text-[#3a2a18]">
                {presence?.guestId ? '✓ Ready' : '...'}
              </div>
            </div>
          </div>

          {!opponentPresent && (
            <p className="text-center text-xs text-[var(--color-text-secondary)] italic mt-5 max-w-md mx-auto">
              Tip: open this page in another browser tab and join with the same rune to test locally.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
