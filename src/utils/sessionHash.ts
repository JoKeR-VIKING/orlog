// Session rune persistence via URL hash.
// On app load, read #code=XXXXXX and optional &ai=easy|medium|hard to auto-restore.

export interface UrlSession {
  code: string | null;
  ai: 'skald' | 'vikingr' | 'berserkr' | null;
}

export function readUrlSession(): UrlSession {
  const hash = window.location.hash || '';
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  const parts = body.split('&').filter(Boolean);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    const [k, v] = p.split('=');
    if (k && v) map[decodeURIComponent(k)] = decodeURIComponent(v);
  });
  const rawCode = (map.code || '').toUpperCase();
  const code = /^[A-Z0-9]{4,8}$/.test(rawCode) ? rawCode : null;
  const aiRaw = (map.ai || '').toLowerCase();
  const ai =
    aiRaw === 'skald' || aiRaw === 'vikingr' || aiRaw === 'berserkr' ? aiRaw : null;
  return { code, ai };
}

export function writeUrlSession(s: UrlSession): void {
  const parts: string[] = [];
  if (s.code) parts.push(`code=${encodeURIComponent(s.code)}`);
  if (s.ai) parts.push(`ai=${encodeURIComponent(s.ai)}`);
  const hash = parts.length ? `#${parts.join('&')}` : '';
  const newUrl = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.replaceState(null, '', newUrl);
}

export function clearUrlSession(): void {
  writeUrlSession({ code: null, ai: null });
}
