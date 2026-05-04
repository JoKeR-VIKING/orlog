// Realtime multiplayer channel wrapper.
// Uses Supabase Realtime broadcast + presence when configured with real keys;
// falls back to BroadcastChannel + localStorage for same-browser testing
// (two tabs on the same machine) when no valid Supabase URL is set.

import { supabase } from '../utils/supabase';
import type { NetMsg, PlayerSide } from '../game/types';

type Handler = (msg: NetMsg, fromId: string) => void;

export interface PresenceInfo {
  hostId: string | null;
  guestId: string | null;
  self: string;
  selfSide: PlayerSide | null;
  full: boolean;
}

export interface Channel {
  code: string;
  selfId: string;
  side: () => PlayerSide | null;
  presence: () => PresenceInfo;
  send: (msg: NetMsg) => void;
  onMessage: (h: Handler) => () => void;
  onPresence: (h: (p: PresenceInfo) => void) => () => void;
  leave: () => void;
  isSupabase: boolean;
}

// Detect if Supabase URL looks real
function supabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || '';
  return (
    url.startsWith('https://') &&
    !url.includes('placeholder') &&
    key.length > 20 &&
    !key.includes('placeholder')
  );
}

function makeId(): string {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  );
}

// -------- Supabase-backed channel --------
function createSupabaseChannel(code: string): Channel {
  const selfId = makeId();
  const msgHandlers = new Set<Handler>();
  const presHandlers = new Set<(p: PresenceInfo) => void>();
  let presenceInfo: PresenceInfo = {
    hostId: null,
    guestId: null,
    self: selfId,
    selfSide: null,
    full: false,
  };
  const channelName = `orlog:${code}`;
  const ch = supabase.channel(channelName, {
    config: { broadcast: { self: false }, presence: { key: selfId } },
  });

  const emitPresence = () => {
    presHandlers.forEach((h) => h({ ...presenceInfo }));
  };

  ch.on('broadcast', { event: 'msg' }, (payload) => {
    const { msg, fromId } = payload.payload as { msg: NetMsg; fromId: string };
    if (fromId === selfId) return;
    msgHandlers.forEach((h) => h(msg, fromId));
  });

  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState<{ side: PlayerSide; joinedAt: number }>();
    // Collect all members
    const members: { id: string; side: PlayerSide; joinedAt: number }[] = [];
    Object.entries(state).forEach(([id, metas]) => {
      const m = metas[0];
      if (m) members.push({ id, side: m.side, joinedAt: m.joinedAt });
    });
    members.sort((a, b) => a.joinedAt - b.joinedAt);
    const host = members.find((m) => m.side === 'host');
    const guest = members.find((m) => m.side === 'guest');
    presenceInfo = {
      hostId: host?.id || null,
      guestId: guest?.id || null,
      self: selfId,
      selfSide: presenceInfo.selfSide,
      full: Boolean(host && guest),
    };
    emitPresence();
  });

  ch.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      // Assign side: if no host yet, we're host; else guest.
      const state = ch.presenceState<{ side: PlayerSide; joinedAt: number }>();
      const hostAlready = Object.values(state).flat().some((m) => (m as { side: PlayerSide }).side === 'host');
      const side: PlayerSide = hostAlready ? 'guest' : 'host';
      presenceInfo = { ...presenceInfo, selfSide: side };
      await ch.track({ side, joinedAt: Date.now() });
    }
  });

  return {
    code,
    selfId,
    isSupabase: true,
    side: () => presenceInfo.selfSide,
    presence: () => presenceInfo,
    send: (msg: NetMsg) => {
      ch.send({ type: 'broadcast', event: 'msg', payload: { msg, fromId: selfId } });
    },
    onMessage: (h) => {
      msgHandlers.add(h);
      return () => msgHandlers.delete(h);
    },
    onPresence: (h) => {
      presHandlers.add(h);
      h({ ...presenceInfo });
      return () => presHandlers.delete(h);
    },
    leave: () => {
      ch.unsubscribe();
    },
  };
}

// -------- Local (BroadcastChannel) fallback --------
// Uses localStorage to track presence (hosts/guests) and BroadcastChannel for msg passing.
function createLocalChannel(code: string): Channel {
  const selfId = makeId();
  const storageKey = `orlog:presence:${code}`;
  const bc = new BroadcastChannel(`orlog:${code}`);
  const msgHandlers = new Set<Handler>();
  const presHandlers = new Set<(p: PresenceInfo) => void>();

  interface LocalPresence {
    members: { id: string; side: PlayerSide; joinedAt: number }[];
  }

  function read(): LocalPresence {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{"members":[]}');
    } catch {
      return { members: [] };
    }
  }
  function write(p: LocalPresence) {
    localStorage.setItem(storageKey, JSON.stringify(p));
  }

  // Clean stale members (> 6s without heartbeat)
  function prune(p: LocalPresence) {
    const now = Date.now();
    p.members = p.members.filter((m) => now - m.joinedAt < 60_000);
    return p;
  }

  // Join: pick host if none, else guest
  const pres = prune(read());
  const hasHost = pres.members.some((m) => m.side === 'host');
  const side: PlayerSide = hasHost ? 'guest' : 'host';
  pres.members.push({ id: selfId, side, joinedAt: Date.now() });
  write(pres);

  let presenceInfo: PresenceInfo = (() => {
    const r = prune(read());
    const host = r.members.find((m) => m.side === 'host');
    const guest = r.members.find((m) => m.side === 'guest');
    return {
      hostId: host?.id || null,
      guestId: guest?.id || null,
      self: selfId,
      selfSide: side,
      full: Boolean(host && guest),
    };
  })();

  // Broadcast a "join" to others, then re-emit presence from localStorage
  const emitPresence = () => {
    const r = prune(read());
    const host = r.members.find((m) => m.side === 'host');
    const guest = r.members.find((m) => m.side === 'guest');
    presenceInfo = {
      hostId: host?.id || null,
      guestId: guest?.id || null,
      self: selfId,
      selfSide: side,
      full: Boolean(host && guest),
    };
    presHandlers.forEach((h) => h({ ...presenceInfo }));
  };

  bc.addEventListener('message', (ev: MessageEvent) => {
    const payload = ev.data as { kind: string; msg?: NetMsg; fromId?: string };
    if (payload.kind === 'msg' && payload.msg && payload.fromId && payload.fromId !== selfId) {
      msgHandlers.forEach((h) => h(payload.msg as NetMsg, payload.fromId as string));
    } else if (payload.kind === 'presence') {
      emitPresence();
    }
  });

  // Heartbeat — keep joinedAt fresh and pings presence
  const heartbeat = setInterval(() => {
    const r = prune(read());
    const me = r.members.find((m) => m.id === selfId);
    if (me) me.joinedAt = Date.now();
    else r.members.push({ id: selfId, side, joinedAt: Date.now() });
    write(r);
    bc.postMessage({ kind: 'presence' });
    emitPresence();
  }, 2500);

  // Storage events from other tabs
  const onStorage = (e: StorageEvent) => {
    if (e.key === storageKey) emitPresence();
  };
  window.addEventListener('storage', onStorage);

  // Initial broadcast
  setTimeout(() => {
    bc.postMessage({ kind: 'presence' });
    emitPresence();
  }, 50);

  return {
    code,
    selfId,
    isSupabase: false,
    side: () => side,
    presence: () => presenceInfo,
    send: (msg) => bc.postMessage({ kind: 'msg', msg, fromId: selfId }),
    onMessage: (h) => {
      msgHandlers.add(h);
      return () => msgHandlers.delete(h);
    },
    onPresence: (h) => {
      presHandlers.add(h);
      h({ ...presenceInfo });
      return () => presHandlers.delete(h);
    },
    leave: () => {
      clearInterval(heartbeat);
      window.removeEventListener('storage', onStorage);
      const r = prune(read());
      r.members = r.members.filter((m) => m.id !== selfId);
      write(r);
      bc.postMessage({ kind: 'presence' });
      bc.close();
    },
  };
}

export function createChannel(code: string): Channel {
  if (supabaseConfigured()) {
    try {
      return createSupabaseChannel(code);
    } catch (e) {
      console.warn('[orlog] Supabase channel failed, falling back to local', e);
      return createLocalChannel(code);
    }
  }
  return createLocalChannel(code);
}

export function isRealSupabase(): boolean {
  return supabaseConfigured();
}
