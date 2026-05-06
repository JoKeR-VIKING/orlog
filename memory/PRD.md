# Orlog — Viking Dice Game (PRD)

## Problem Statement
Browser-based 3D top-view Viking-themed Orlog dice game (inspired by Assassin's Creed Valhalla). 1v1 multiplayer via session code (no accounts). Stack: Vite + React + TypeScript + Tailwind v4 + @react-three/fiber + Supabase Realtime. No backend. Wooden/parchment/runic 800AD aesthetic.

## User Personas
- **Host**: creates a session, shares a 6-char rune
- **Guest**: joins via rune to play 1v1
- **Solo player**: plays vs AI in 3 difficulties (Skald / Vikingr / Berserkr)
- **Tester (local)**: opens two browser tabs to test multiplayer via BroadcastChannel fallback

## Core Requirements
- No login, no backend
- Session code based multiplayer + reconnection support
- Solo mode vs AI with 3 difficulties
- Full Orlog ruleset: 6 dice, 15 HP, 3 rolls per turn, 6 god favors, axes vs helmets / arrows vs shields, win at 0 HP
- 3D scene (R3F): wooden table + bowls + cup illusion + dice with face glyphs
- Procedural audio (Web Audio): no external files
- Viking aesthetic: Cormorant Unicase / EB Garamond / MedievalSharp fonts, runic SVG bg, parchment + wood textures

## Implementation History
### 2026-01-04 — MVP
- Home/Lobby/Game/End screens, 6-char session codes, full game engine, host-authoritative store, Supabase Realtime broadcast channel + local BroadcastChannel fallback, procedural Web-Audio SFX + ambient drone, 3D scene (table + bowls + cup with shake animation)
- Iter 1 testing: 100% of base flows passed

### 2026-01-04 — v2 (current)
- **URL hash persistence** (`/app/src/utils/sessionHash.ts`): host writes `#code=XXXXXX`, solo writes `#ai=skald|vikingr|berserkr`, reload auto-prefills join input or solo mode
- **Opponent reconnect banner with 45s countdown** (`GameScreen`): when opponent presence drops, parchment banner shows reconnecting + countdown; on timeout shows "End Saga" button. Local channel heartbeat reduced to 1.5s and prune to 8s for snappy detection.
- **Animated 3D dice-face textures** (`TableAndBowls.tsx`): 6 dice per bowl rendered as `BoxGeometry` with multi-material array — top face has canvas-generated glyph (axe/arrow/helmet/shield/hand/rune), sides colored by face semantic, kept dice glow gold (emissive).
- **Solo mode vs AI** (`/app/src/ai/orlogAI.ts` + `useGameStore.hostSoloSession`): 3 difficulties (Skald=novice/Vikingr=mid/Berserkr=expert) with bespoke heuristics for keep selection, reroll/stand decisions, and god-favor casting. Difficulty-tuned action delays for natural feel. AI auto-accepts rematches.
- Iter 2 testing: 11/12 verified directly (95%); End-Saga timeout button code-reviewed only.

## Configuration
- `/app/.env` — `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` placeholders. App auto-detects and falls back to BroadcastChannel. Drop in real keys for live cross-device multiplayer.
- Runtime is the root Vite app; no backend or frontend proxy package is required.

## Next Actions / Backlog
- **P1**: Auto-rejoin on reload — currently URL hash prefills but user must click Enter; could fully automate
- **P2**: More gods (Freyja, Frigg, Bragi, Heimdall) with unlock progression
- **P2**: Cup-cover-bowl during reroll uses 3D mesh; could add hand-cover texture
- **P3**: Public matchmaking lobby (host-advertised sessions via Supabase realtime)
- **P3**: Skins / regional bowls (Norway/England variants)
- **P3**: Replay-share saga stone (downloadable PNG of decisive round)
