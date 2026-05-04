// Central Zustand store for session + game state.
// Host is authoritative. Guest sends actions over the channel; host applies and rebroadcasts.
// Also supports single-player solo mode where an AI controls the guest side locally.

import { create } from 'zustand';
import {
  MAX_REROLLS,
  applyRollForPlayer,
  beginNextRound,
  freshSnapshot,
  resolveRound,
  rollSix,
  winner,
} from '../game/engine';
import type { GameSnapshot, NetMsg, PlayerAction, PlayerSide } from '../game/types';
import { GOD_FAVOR_MAP } from '../game/types';
import { randomCode, randomSeed } from '../game/rng';
import type { Channel, PresenceInfo } from '../multiplayer/channel';
import { createChannel } from '../multiplayer/channel';
import { audio } from '../audio/sounds';
import type { Difficulty } from '../ai/orlogAI';
import { aiDelay, generatePlayerActions } from '../ai/orlogAI';
import { clearUrlSession, writeUrlSession } from '../utils/sessionHash';

type View = 'home' | 'lobby' | 'game' | 'end';

export interface ConnectionState {
  code: string | null;
  view: View;
  channel: Channel | null;
  selfSide: PlayerSide | null;
  presence: PresenceInfo | null;
  opponentPresent: boolean;
  opponentLastSeen: number; // timestamp ms when opponent was last confirmed present
  nameInput: string;
  soundOn: boolean;
  ambientOn: boolean;
  error: string | null;
  aiMode: Difficulty | null; // when non-null, playing solo vs AI
}

export interface AnimationState {
  floaters: { id: number; side: PlayerSide; text: string; kind: 'dmg' | 'heal' | 'favor' }[];
}

export interface Store extends ConnectionState, AnimationState {
  snap: GameSnapshot;
  // session actions
  setName: (name: string) => void;
  hostSession: () => void;
  joinSession: (code: string) => void;
  hostSoloSession: (difficulty: Difficulty) => void;
  leave: () => void;
  toggleSound: () => void;
  toggleAmbient: () => void;
  // player actions
  toggleKeep: (dieId: number) => void;
  doReroll: () => void;
  stand: () => void;
  castFavor: (favorId: string) => void;
  skipFavors: () => void;
  requestRematch: () => void;
  backToHome: () => void;
}

// ---- Helpers ----
function broadcastSnapshot(get: () => Store) {
  const { channel, snap } = get();
  if (!channel) return;
  const msg: NetMsg = { type: 'state', snapshot: structuredClone(snap) };
  channel.send(msg);
}

function floaterId(): number {
  return Math.floor(Math.random() * 1e9);
}

function addFloater(set: (fn: (s: Store) => Partial<Store>) => void, side: PlayerSide, text: string, kind: 'dmg' | 'heal' | 'favor') {
  const id = floaterId();
  set((s) => ({ floaters: [...s.floaters, { id, side, text, kind }] }));
  setTimeout(() => {
    set((s) => ({ floaters: s.floaters.filter((f) => f.id !== id) }));
  }, 1700);
}

// Host performs initial roll: generate seed, apply to both players, broadcast
function hostInitialRoll(get: () => Store, set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void) {
  const { snap } = get();
  const seed = randomSeed();
  const hostFaces = rollSix(seed, 'host');
  const guestFaces = rollSix(seed, 'guest');

  snap.host.rolling = true;
  snap.guest.rolling = true;
  set({ snap: structuredClone(snap) });
  broadcastSnapshot(get);
  audio.play('cupCover');
  setTimeout(() => audio.play('shake'), 250);

  setTimeout(() => {
    const s2 = get().snap;
    applyRollForPlayer(s2.host, hostFaces, true);
    applyRollForPlayer(s2.guest, guestFaces, true);
    s2.host.rolling = false;
    s2.guest.rolling = false;
    s2.host.ready = false;
    s2.guest.ready = false;
    set({ snap: structuredClone(s2) });
    broadcastSnapshot(get);
    audio.play('diceReveal');
    // trigger AI to act if needed
    maybeScheduleAi(get, set);
  }, 1400);
}

function hostReroll(get: () => Store, set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void, side: PlayerSide) {
  const { snap } = get();
  const p = snap[side];
  if (p.rollsLeft <= 0) return;
  const allKept = p.dice.every((d) => d.kept);
  if (allKept) return;
  const seed = randomSeed();
  const faces = rollSix(seed, `${side}-rr-${p.rollsLeft}`);
  p.rolling = true;
  p.rollsLeft -= 1;
  set({ snap: structuredClone(snap) });
  broadcastSnapshot(get);
  audio.play('cupCover');
  setTimeout(() => audio.play('shake'), 250);
  setTimeout(() => {
    const s2 = get().snap;
    applyRollForPlayer(s2[side], faces, false);
    s2[side].rolling = false;
    if (s2[side].rollsLeft <= 0) s2[side].ready = true;
    set({ snap: structuredClone(s2) });
    broadcastSnapshot(get);
    audio.play('diceReveal');
    maybeAdvancePhase(get, set);
    maybeScheduleAi(get, set);
  }, 1400);
}

function maybeAdvancePhase(get: () => Store, set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void) {
  const { snap } = get();
  if (snap.phase === 'roll' && snap.host.ready && snap.guest.ready) {
    snap.phase = 'favor';
    snap.host.favorReady = false;
    snap.guest.favorReady = false;
    set({ snap: structuredClone(snap) });
    broadcastSnapshot(get);
    audio.play('horn');
    maybeScheduleAi(get, set);
  } else if (snap.phase === 'favor' && snap.host.favorReady && snap.guest.favorReady) {
    snap.phase = 'resolve';
    set({ snap: structuredClone(snap) });
    broadcastSnapshot(get);
    const report = resolveRound(snap);
    snap.log = [...snap.log.slice(-20), ...report.log];
    if (report.host.damageTaken > 0) addFloater(set, 'host', `-${report.host.damageTaken}`, 'dmg');
    if (report.guest.damageTaken > 0) addFloater(set, 'guest', `-${report.guest.damageTaken}`, 'dmg');
    if (report.host.healed > 0) addFloater(set, 'host', `+${report.host.healed}`, 'heal');
    if (report.guest.healed > 0) addFloater(set, 'guest', `+${report.guest.healed}`, 'heal');
    if (report.host.favorGained > 0) addFloater(set, 'host', `+${report.host.favorGained}⌘`, 'favor');
    if (report.guest.favorGained > 0) addFloater(set, 'guest', `+${report.guest.favorGained}⌘`, 'favor');
    if (report.host.damageTaken > 0 || report.guest.damageTaken > 0) audio.play('damage');
    if (report.host.healed > 0 || report.guest.healed > 0) setTimeout(() => audio.play('heal'), 200);

    set({ snap: structuredClone(snap) });
    broadcastSnapshot(get);

    setTimeout(() => {
      const s2 = get().snap;
      const w = winner(s2);
      if (w) {
        s2.winner = w;
        s2.phase = 'game-over';
        set({ snap: structuredClone(s2), view: 'end' });
        broadcastSnapshot(get);
        const self = get().selfSide;
        if (self && self === w) audio.play('victory');
        else audio.play('defeat');
      } else {
        beginNextRound(s2);
        set({ snap: structuredClone(s2) });
        broadcastSnapshot(get);
        setTimeout(() => {
          hostInitialRoll(get, set);
        }, 900);
      }
    }, 2600);
  }
}

// ---- AI scheduling ----
// Called whenever game state advances. If aiMode is set, plans guest actions.
function maybeScheduleAi(get: () => Store, set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void) {
  const { aiMode, snap, selfSide } = get();
  if (!aiMode) return;
  if (selfSide !== 'host') return; // AI runs on host only
  if (snap.phase !== 'roll' && snap.phase !== 'favor') return;
  if (snap.guest.rolling) return;
  if (snap.phase === 'roll' && snap.guest.ready) return;
  if (snap.phase === 'favor' && snap.guest.favorReady) return;

  // Plan a sequence of actions for the AI guest
  const actions = generatePlayerActions(snap, 'guest', aiMode);
  if (actions.length === 0) return;
  runAiActions(get, set, actions);
}

function runAiActions(
  get: () => Store,
  set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void,
  actions: PlayerAction[],
) {
  const { aiMode } = get();
  if (!aiMode) return;
  let i = 0;
  const step = () => {
    if (!get().aiMode) return;
    if (i >= actions.length) return;
    // Stop if game state moved to a phase this sequence no longer applies to
    const s = get();
    const act = actions[i++];
    const phase = s.snap.phase;
    const g = s.snap.guest;
    if (act.kind === 'toggle_keep' || act.kind === 'reroll' || act.kind === 'stand') {
      if (phase !== 'roll' || g.rolling || g.ready) return;
    }
    if (act.kind === 'cast_favor' || act.kind === 'skip_favors') {
      if (phase !== 'favor' || g.favorReady) return;
    }
    applyAction(get, set, 'guest', act);
    const nextDelay = i < actions.length ? aiDelay(aiMode, 'act') : 0;
    if (i < actions.length) setTimeout(step, nextDelay);
  };
  setTimeout(step, aiDelay(aiMode, 'think'));
}

// Host applies a PlayerAction sent by a guest (or locally)
function applyAction(
  get: () => Store,
  set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void,
  side: PlayerSide,
  action: PlayerAction,
) {
  const { snap } = get();
  const p = snap[side];
  switch (action.kind) {
    case 'set_name': {
      p.name = action.name.slice(0, 24) || (side === 'host' ? 'Host' : 'Guest');
      set({ snap: structuredClone(snap) });
      broadcastSnapshot(get);
      break;
    }
    case 'toggle_keep': {
      if (snap.phase !== 'roll' || p.rolling) break;
      const d = p.dice[action.dieId];
      if (!d) break;
      d.kept = !d.kept;
      set({ snap: structuredClone(snap) });
      broadcastSnapshot(get);
      break;
    }
    case 'reroll': {
      if (snap.phase !== 'roll' || p.rolling || p.ready || p.rollsLeft <= 0) break;
      hostReroll(get, set, side);
      break;
    }
    case 'stand': {
      if (snap.phase !== 'roll' || p.rolling) break;
      p.ready = true;
      set({ snap: structuredClone(snap) });
      broadcastSnapshot(get);
      maybeAdvancePhase(get, set);
      break;
    }
    case 'cast_favor': {
      if (snap.phase !== 'favor') break;
      const god = GOD_FAVOR_MAP[action.favorId];
      if (!god) break;
      const alreadyCost = p.pendingFavors.reduce(
        (acc, id) => acc + (GOD_FAVOR_MAP[id]?.cost || 0),
        0,
      );
      if (p.pendingFavors.includes(god.id)) break;
      if (p.favor - alreadyCost < god.cost) break;
      p.pendingFavors.push(god.id);
      set({ snap: structuredClone(snap) });
      broadcastSnapshot(get);
      break;
    }
    case 'skip_favors': {
      if (snap.phase !== 'favor') break;
      p.favorReady = true;
      set({ snap: structuredClone(snap) });
      broadcastSnapshot(get);
      maybeAdvancePhase(get, set);
      break;
    }
    case 'rematch_request': {
      if (snap.phase !== 'game-over') break;
      if (snap.rematchRequest && snap.rematchRequest !== side) {
        const reset = freshSnapshot(snap.host.name, snap.guest.name);
        set({ snap: reset, view: 'game', floaters: [] });
        broadcastSnapshot(get);
        setTimeout(() => hostInitialRoll(get, set), 500);
      } else {
        snap.rematchRequest = side;
        set({ snap: structuredClone(snap) });
        broadcastSnapshot(get);
        // In solo mode, auto-accept rematch on next tick
        if (get().aiMode && side === 'host') {
          setTimeout(() => applyAction(get, set, 'guest', { kind: 'rematch_request' }), 400);
        }
      }
      break;
    }
  }
}

export const useStore = create<Store>((set, get) => ({
  code: null,
  view: 'home',
  channel: null,
  selfSide: null,
  presence: null,
  opponentPresent: false,
  opponentLastSeen: 0,
  nameInput: '',
  soundOn: true,
  ambientOn: false,
  error: null,
  aiMode: null,
  floaters: [],
  snap: freshSnapshot(),

  setName: (name) => {
    set({ nameInput: name });
    const { channel, selfSide } = get();
    if (channel && selfSide) {
      const action: PlayerAction = { kind: 'set_name', name };
      if (selfSide === 'host') {
        applyAction(get, set, 'host', action);
      } else {
        channel.send({ type: 'action', side: 'guest', action });
      }
    }
  },

  hostSession: () => {
    const code = randomCode(6);
    const name = get().nameInput || 'Viking';
    openSession(get, set, code, name, null);
  },

  joinSession: (code) => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      set({ error: 'Enter a valid session code.' });
      return;
    }
    const name = get().nameInput || 'Warrior';
    openSession(get, set, clean, name, null);
  },

  hostSoloSession: (difficulty) => {
    const name = get().nameInput || 'Viking';
    openSoloSession(get, set, name, difficulty);
  },

  leave: () => {
    const ch = get().channel;
    if (ch) ch.leave();
    clearUrlSession();
    set({
      channel: null,
      code: null,
      selfSide: null,
      presence: null,
      opponentPresent: false,
      opponentLastSeen: 0,
      aiMode: null,
      view: 'home',
      snap: freshSnapshot(),
      floaters: [],
      error: null,
    });
  },

  toggleSound: () => {
    const next = !get().soundOn;
    audio.setMuted(!next);
    if (!next) {
      audio.toggleAmbient(false);
      set({ soundOn: next, ambientOn: false });
    } else {
      set({ soundOn: next });
    }
  },

  toggleAmbient: () => {
    const next = !get().ambientOn;
    audio.toggleAmbient(next);
    set({ ambientOn: next });
  },

  toggleKeep: (dieId) => {
    const { selfSide, channel } = get();
    if (!selfSide || !channel) return;
    const action: PlayerAction = { kind: 'toggle_keep', dieId };
    if (selfSide === 'host') applyAction(get, set, 'host', action);
    else channel.send({ type: 'action', side: 'guest', action });
  },

  doReroll: () => {
    const { selfSide, channel } = get();
    if (!selfSide || !channel) return;
    const action: PlayerAction = { kind: 'reroll' };
    if (selfSide === 'host') applyAction(get, set, 'host', action);
    else channel.send({ type: 'action', side: 'guest', action });
  },

  stand: () => {
    const { selfSide, channel } = get();
    if (!selfSide || !channel) return;
    const action: PlayerAction = { kind: 'stand' };
    if (selfSide === 'host') applyAction(get, set, 'host', action);
    else channel.send({ type: 'action', side: 'guest', action });
  },

  castFavor: (favorId) => {
    const { selfSide, channel } = get();
    if (!selfSide || !channel) return;
    const action: PlayerAction = { kind: 'cast_favor', favorId };
    if (selfSide === 'host') applyAction(get, set, 'host', action);
    else channel.send({ type: 'action', side: 'guest', action });
  },

  skipFavors: () => {
    const { selfSide, channel } = get();
    if (!selfSide || !channel) return;
    const action: PlayerAction = { kind: 'skip_favors' };
    if (selfSide === 'host') applyAction(get, set, 'host', action);
    else channel.send({ type: 'action', side: 'guest', action });
  },

  requestRematch: () => {
    const { selfSide, channel } = get();
    if (!selfSide || !channel) return;
    const action: PlayerAction = { kind: 'rematch_request' };
    if (selfSide === 'host') applyAction(get, set, 'host', action);
    else channel.send({ type: 'action', side: 'guest', action });
  },

  backToHome: () => get().leave(),
}));

// ---- Multiplayer session ----
function openSession(
  get: () => Store,
  set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void,
  code: string,
  name: string,
  ai: Difficulty | null,
) {
  const prev = get().channel;
  if (prev) prev.leave();

  const channel = createChannel(code);

  set({
    channel,
    code,
    view: 'lobby',
    selfSide: null,
    presence: channel.presence(),
    opponentPresent: false,
    opponentLastSeen: Date.now(),
    aiMode: ai,
    error: null,
    snap: freshSnapshot(name, name === 'Host' ? 'Guest' : 'Opponent'),
    floaters: [],
  });
  writeUrlSession({ code, ai: null });
  if (get().ambientOn) audio.toggleAmbient(true);

  const presOff = channel.onPresence((pres) => {
    const selfSide = channel.side();
    const full = pres.full;
    set((s) => ({
      presence: pres,
      selfSide,
      opponentPresent: full,
      opponentLastSeen: full ? Date.now() : s.opponentLastSeen,
    }));

    if (selfSide === 'host' && full && get().view === 'lobby') {
      const snap = get().snap;
      snap.host.name = name;
      set({ view: 'game', snap: structuredClone(snap) });
      broadcastSnapshot(get);
      audio.play('horn');
      setTimeout(() => hostInitialRoll(get, set), 700);
    }
  });

  let hellos = 0;
  const helloTimer = setInterval(() => {
    const sSide = channel.side();
    if (sSide) {
      channel.send({ type: 'hello', side: sSide, name });
      if (sSide === 'guest') {
        channel.send({ type: 'action', side: 'guest', action: { kind: 'set_name', name } });
      } else {
        const snap = get().snap;
        snap.host.name = name;
        set({ snap: structuredClone(snap) });
      }
      clearInterval(helloTimer);
    } else if (hellos++ > 30) {
      clearInterval(helloTimer);
    }
  }, 200);

  const msgOff = channel.onMessage((msg) => {
    const selfSide = channel.side();
    if (!selfSide) return;
    switch (msg.type) {
      case 'state': {
        if (selfSide === 'guest') {
          set({ snap: msg.snapshot, view: msg.snapshot.phase === 'game-over' ? 'end' : 'game' });
        }
        break;
      }
      case 'action': {
        if (selfSide === 'host') applyAction(get, set, msg.side, msg.action);
        break;
      }
      case 'hello': {
        if (selfSide === 'host' && msg.side === 'guest') {
          const snap = get().snap;
          snap.guest.name = msg.name.slice(0, 24) || 'Guest';
          set({ snap: structuredClone(snap) });
          broadcastSnapshot(get);
        }
        break;
      }
      default:
        break;
    }
  });

  const origLeave = channel.leave.bind(channel);
  channel.leave = () => {
    presOff();
    msgOff();
    origLeave();
  };
}

// ---- Solo (vs AI) session ----
function openSoloSession(
  get: () => Store,
  set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void,
  name: string,
  difficulty: Difficulty,
) {
  const prev = get().channel;
  if (prev) prev.leave();

  // Create a mock "channel" that is host-only (no actual network) so host code paths work.
  const mockChannel: Channel = {
    code: 'SOLO',
    selfId: 'local',
    isSupabase: false,
    side: () => 'host',
    presence: () => ({ hostId: 'local', guestId: 'ai', self: 'local', selfSide: 'host', full: true }),
    send: () => {},
    onMessage: () => () => {},
    onPresence: (h) => { h({ hostId: 'local', guestId: 'ai', self: 'local', selfSide: 'host', full: true }); return () => {}; },
    leave: () => {},
  };

  const aiName = difficulty === 'skald' ? 'Skald' : difficulty === 'vikingr' ? 'Vikingr' : 'Berserkr';
  set({
    channel: mockChannel,
    code: null,
    view: 'game',
    selfSide: 'host',
    presence: mockChannel.presence(),
    opponentPresent: true,
    opponentLastSeen: Date.now(),
    aiMode: difficulty,
    error: null,
    snap: freshSnapshot(name, aiName),
    floaters: [],
  });
  writeUrlSession({ code: null, ai: difficulty });
  if (get().ambientOn) audio.toggleAmbient(true);
  audio.play('horn');
  setTimeout(() => hostInitialRoll(get, set), 700);
}

export { MAX_REROLLS };
