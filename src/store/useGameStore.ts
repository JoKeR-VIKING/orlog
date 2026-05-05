// Central Zustand store for session + game state.
// Host is authoritative. Guest sends actions over the channel; host applies and rebroadcasts.
// Also supports single-player solo mode where an AI controls the guest side locally.

import { create } from 'zustand';
import {
  MAX_ROLLS,
  MAX_REROLLS,
  applyResolutionStep,
  applyRollForPlayer,
  beginNextRound,
  buildResolutionSteps,
  freshSnapshot,
  freshSoloSnapshot,
  rollSix,
  winner,
} from '../game/engine';
import type { ResolutionStep } from '../game/types';
import type { GameSnapshot, NetMsg, PlayerAction, PlayerSide } from '../game/types';
import { DEFAULT_FAVOR_LOADOUT, GOD_FAVOR_MAP, sanitizeFavorLoadout } from '../game/types';
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
  favorLoadout: string[];
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
  setFavorLoadout: (favorIds: string[]) => void;
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
  forfeit: () => void;
  markOpponentFled: () => void;
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

function playResolutionFloater(set: (fn: (s: Store) => Partial<Store>) => void, step: ResolutionStep) {
  if (step.kind === 'favor') {
    if (step.hostFavor > 0) addFloater(set, 'host', `+${step.hostFavor}⌘`, 'favor');
    if (step.guestFavor > 0) addFloater(set, 'guest', `+${step.guestFavor}⌘`, 'favor');
  } else if (step.kind === 'attack') {
    if (step.damage > 0) addFloater(set, step.target, `-${step.damage}`, 'dmg');
  } else if (step.kind === 'god') {
    if (step.actorHpDelta > 0) addFloater(set, step.actor, `+${step.actorHpDelta}`, 'heal');
    if (step.targetHpDelta < 0) addFloater(set, step.target, `${step.targetHpDelta}`, 'dmg');
    if (step.actorFavorDelta > 0) addFloater(set, step.actor, `+${step.actorFavorDelta}⌘`, 'favor');
  } else if (step.stolen > 0) {
    addFloater(set, step.actor, `+${step.stolen}⌘`, 'favor');
  }
}

function passRollTurn(snap: GameSnapshot, side: PlayerSide) {
  const other = side === 'host' ? 'guest' : 'host';
  if (!snap[other].ready) {
    snap.rollTurn = other;
  } else if (!snap[side].ready) {
    snap.rollTurn = side;
  }
}

function hasFavorOptions(side: PlayerSide, snap: GameSnapshot): boolean {
  return sanitizeFavorLoadout(snap[side].availableFavors).length > 0;
}

function startResolution(get: () => Store, set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void) {
  const { snap } = get();
  snap.phase = 'resolve';
  snap.resolutionStep = null;
  set({ snap: structuredClone(snap) });
  broadcastSnapshot(get);
  runResolutionSequence(get, set, buildResolutionSteps(snap), 0);
}

// Host performs one active player's roll. Players then lock dice to pass the roll turn.
function hostRoll(get: () => Store, set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void, side: PlayerSide) {
  const { snap } = get();
  const p = snap[side];
  if (snap.phase !== 'roll' || snap.rollTurn !== side) return;
  if (p.rolling || p.ready || p.turnRolled || p.rollsLeft <= 0) return;
  if (p.dice.every((d) => d.kept)) return;

  const initial = p.rollsLeft === MAX_ROLLS;
  const seed = randomSeed();
  const faces = rollSix(seed, `${side}-r${MAX_ROLLS - p.rollsLeft + 1}`);
  p.rolling = true;
  p.rollsLeft -= 1;
  set({ snap: structuredClone(snap) });
  broadcastSnapshot(get);
  audio.play('cupCover');
  setTimeout(() => audio.play('shake'), 250);

  setTimeout(() => {
    const s2 = get().snap;
    applyRollForPlayer(s2[side], faces, initial);
    s2[side].rolling = false;
    s2[side].turnRolled = true;
    set({ snap: structuredClone(s2) });
    broadcastSnapshot(get);
    audio.play('diceReveal');
    maybeScheduleAi(get, set);
  }, 1400);
}

function maybeAdvancePhase(get: () => Store, set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void) {
  const { snap } = get();
  if (snap.phase === 'roll' && snap.host.ready && snap.guest.ready) {
    snap.phase = 'favor';
    snap.host.favorReady = !hasFavorOptions('host', snap);
    snap.guest.favorReady = !hasFavorOptions('guest', snap);
    set({ snap: structuredClone(snap) });
    broadcastSnapshot(get);
    audio.play('horn');
    if (snap.host.favorReady && snap.guest.favorReady) {
      startResolution(get, set);
      return;
    }
    maybeScheduleAi(get, set);
  } else if (snap.phase === 'favor' && snap.host.favorReady && snap.guest.favorReady) {
    startResolution(get, set);
  }
}

function finishResolution(get: () => Store, set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void) {
  const s2 = get().snap;
  s2.host.pendingFavors = [];
  s2.guest.pendingFavors = [];
  s2.resolutionStep = null;
  const w = winner(s2);
  if (w) {
    s2.winner = w;
    s2.phase = 'game-over';
    s2.endReason = { kind: 'normal' };
    set({ snap: structuredClone(s2), view: 'end' });
    broadcastSnapshot(get);
    const self = get().selfSide;
    if (self && self === w) audio.play('victory');
    else audio.play('defeat');
  } else {
    beginNextRound(s2);
    set({ snap: structuredClone(s2) });
    broadcastSnapshot(get);
    maybeScheduleAi(get, set);
  }
}

function endByForfeit(
  get: () => Store,
  set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void,
  side: PlayerSide,
) {
  const snap = get().snap;
  if (snap.phase === 'game-over') return;
  const victor = side === 'host' ? 'guest' : 'host';
  snap.winner = victor;
  snap.phase = 'game-over';
  snap.endReason = { kind: 'forfeit', side };
  snap.rematchRequest = null;
  snap.resolutionStep = null;
  snap.log = [...snap.log.slice(-20), `${snap[side].name} forfeits the saga.`];
  set({ snap: structuredClone(snap), view: 'end' });
  broadcastSnapshot(get);
  const self = get().selfSide;
  if (self && self === victor) audio.play('victory');
  else audio.play('defeat');
}

function endByOpponentFled(
  get: () => Store,
  set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void,
) {
  const selfSide = get().selfSide;
  if (!selfSide) return;
  const snap = get().snap;
  if (snap.phase === 'game-over') return;
  const fledSide = selfSide === 'host' ? 'guest' : 'host';
  snap.winner = selfSide;
  snap.phase = 'game-over';
  snap.endReason = { kind: 'fled', side: fledSide };
  snap.rematchRequest = null;
  snap.resolutionStep = null;
  snap.log = [...snap.log.slice(-20), `${snap[fledSide].name} fled the field. ${snap[selfSide].name} wins.`];
  set({ snap: structuredClone(snap), view: 'end' });
  if (selfSide === 'host') broadcastSnapshot(get);
  audio.play('victory');
}

function runResolutionSequence(
  get: () => Store,
  set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void,
  steps: ResolutionStep[],
  index: number,
) {
  if (index >= steps.length) {
    setTimeout(() => finishResolution(get, set), 900);
    return;
  }

  setTimeout(() => {
    const snap = get().snap;
    if (snap.phase !== 'resolve') return;
    const applied = applyResolutionStep(snap, steps[index]);
    snap.resolutionStep = applied;
    snap.log = [...snap.log.slice(-20), applied.text];
    set({ snap: structuredClone(snap) });
    broadcastSnapshot(get);
    playResolutionFloater(set, applied);
    if ((applied.kind === 'attack' && applied.damage > 0) || (applied.kind === 'god' && applied.targetHpDelta < 0)) audio.play('damage');
    if (applied.kind === 'favor' || (applied.kind === 'steal' && applied.stolen > 0)) audio.play('diceReveal');
    runResolutionSequence(get, set, steps, index + 1);
  }, index === 0 ? 500 : 1350);
}

// ---- AI scheduling ----
// Called whenever game state advances. If aiMode is set, plans guest actions.
function maybeScheduleAi(get: () => Store, set: (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void) {
  const { aiMode, snap, selfSide } = get();
  if (!aiMode) return;
  if (selfSide !== 'host') return; // AI runs on host only
  if (snap.phase !== 'roll' && snap.phase !== 'favor') return;
  if (snap.guest.rolling) return;
  if (snap.phase === 'roll' && (snap.rollTurn !== 'guest' || snap.guest.ready)) return;
  if (snap.phase === 'favor' && snap.guest.favorReady) return;

  let actions: PlayerAction[];
  if (snap.phase === 'roll' && !snap.guest.turnRolled) {
    actions = [{ kind: 'reroll' }];
  } else if (snap.phase === 'roll') {
    actions = [
      ...generatePlayerActions(snap, 'guest', aiMode).filter((a) => a.kind === 'toggle_keep'),
      { kind: 'stand' },
    ];
  } else {
    actions = generatePlayerActions(snap, 'guest', aiMode);
  }
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
    if (act.kind === 'reroll') {
      if (phase !== 'roll' || s.snap.rollTurn !== 'guest' || g.rolling || g.ready || g.turnRolled) return;
    }
    if (act.kind === 'toggle_keep' || act.kind === 'stand') {
      if (phase !== 'roll' || s.snap.rollTurn !== 'guest' || g.rolling || g.ready || !g.turnRolled) return;
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
    case 'set_loadout': {
      if (p.favorLoadoutLocked) break;
      if (snap.phase !== 'roll' || snap.round !== 1 || p.turnRolled || p.ready) break;
      p.availableFavors = sanitizeFavorLoadout(action.favorIds);
      p.favorLoadoutLocked = true;
      p.pendingFavors = [];
      snap.log = [...snap.log.slice(-20), `${p.name} locks ${p.availableFavors.length} god favor${p.availableFavors.length === 1 ? '' : 's'} for this saga.`];
      set({ snap: structuredClone(snap) });
      broadcastSnapshot(get);
      break;
    }
    case 'toggle_keep': {
      if (snap.phase !== 'roll' || snap.rollTurn !== side || p.rolling || p.ready || !p.turnRolled) break;
      const d = p.dice[action.dieId];
      if (!d) break;
      if (d.kept) break;
      d.selected = !d.selected;
      set({ snap: structuredClone(snap) });
      broadcastSnapshot(get);
      break;
    }
    case 'reroll': {
      hostRoll(get, set, side);
      break;
    }
    case 'stand': {
      if (snap.phase !== 'roll' || snap.rollTurn !== side || p.rolling || p.ready || !p.turnRolled) break;
      p.dice.forEach((d) => {
        if (d.selected) {
          d.kept = true;
          d.selected = false;
        }
      });
      if (p.rollsLeft <= 0 || p.dice.every((d) => d.kept)) {
        p.ready = true;
        p.dice.forEach((d) => {
          d.kept = true;
          d.selected = false;
        });
      }
      p.turnRolled = false;
      passRollTurn(snap, side);
      set({ snap: structuredClone(snap) });
      broadcastSnapshot(get);
      maybeAdvancePhase(get, set);
      maybeScheduleAi(get, set);
      break;
    }
    case 'cast_favor': {
      if (snap.phase !== 'favor') break;
      const god = GOD_FAVOR_MAP[action.favorId];
      if (!god) break;
      if (!p.availableFavors.includes(god.id)) break;
      if (p.pendingFavors.includes(god.id)) {
        p.pendingFavors = [];
      } else {
        if (p.favor < god.cost) break;
        p.pendingFavors = [god.id];
      }
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
    case 'forfeit': {
      endByForfeit(get, set, side);
      break;
    }
    case 'rematch_request': {
      if (snap.phase !== 'game-over') break;
      if (snap.endReason?.kind === 'forfeit' || snap.endReason?.kind === 'fled') break;
      if (snap.rematchRequest && snap.rematchRequest !== side) {
        const reset = freshSnapshot(snap.host.name, snap.guest.name, snap.host.availableFavors, snap.guest.availableFavors);
        set({ snap: reset, view: 'game', floaters: [] });
        broadcastSnapshot(get);
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
  favorLoadout: [...DEFAULT_FAVOR_LOADOUT],
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

  setFavorLoadout: (favorIds) => {
    set({ favorLoadout: sanitizeFavorLoadout(favorIds) });
  },

  hostSession: () => {
    const code = randomCode(6);
    const name = get().nameInput || 'Wanderer';
    openSession(get, set, code, name, null, get().favorLoadout);
  },

  joinSession: (code) => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      set({ error: 'Enter a valid session code.' });
      return;
    }
    const name = get().nameInput || 'Wanderer';
    openSession(get, set, clean, name, null, get().favorLoadout);
  },

  hostSoloSession: (difficulty) => {
    const name = get().nameInput || 'Wanderer';
    openSoloSession(get, set, name, difficulty, get().favorLoadout);
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

  forfeit: () => {
    const { selfSide, channel } = get();
    if (!selfSide || !channel) return;
    const action: PlayerAction = { kind: 'forfeit' };
    if (selfSide === 'host') {
      channel.send({ type: 'action', side: 'host', action });
      applyAction(get, set, 'host', action);
    } else {
      channel.send({ type: 'action', side: 'guest', action });
      endByForfeit(get, set, 'guest');
    }
  },

  markOpponentFled: () => {
    endByOpponentFled(get, set);
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
  favorLoadout: string[],
) {
  const prev = get().channel;
  if (prev) prev.leave();

  const channel = createChannel(code);

  const snap = freshSnapshot(name, name === 'Host' ? 'Guest' : 'Opponent', favorLoadout);
  snap.guest.favorLoadoutLocked = false;

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
    snap,
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
    }
  });

  let hellos = 0;
  const helloTimer = setInterval(() => {
    const sSide = channel.side();
    if (sSide) {
      channel.send({ type: 'hello', side: sSide, name });
      if (sSide === 'guest') {
        channel.send({ type: 'action', side: 'guest', action: { kind: 'set_name', name } });
        channel.send({ type: 'action', side: 'guest', action: { kind: 'set_loadout', favorIds: favorLoadout } });
      } else {
        const snap = get().snap;
        snap.host.name = name;
        snap.host.availableFavors = sanitizeFavorLoadout(favorLoadout);
        snap.host.favorLoadoutLocked = true;
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
        if (selfSide === 'host' || msg.action.kind === 'forfeit') {
          applyAction(get, set, msg.side, msg.action);
        }
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
  favorLoadout: string[],
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
    snap: freshSoloSnapshot(name, aiName, favorLoadout),
    floaters: [],
  });
  writeUrlSession({ code: null, ai: difficulty });
  if (get().ambientOn) audio.toggleAmbient(true);
  audio.play('horn');
}

export { MAX_ROLLS, MAX_REROLLS };
