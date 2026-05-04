# Orlog — Viking Dice Game (PRD)

## Problem Statement
Build a browser-based 3D-looking top-view Viking-themed dice game inspired by Assassin's Creed Valhalla's Orlog mini-game. 1v1 multiplayer via session code (no accounts). Stack: Vite + React + TypeScript + Tailwind v4 + @react-three/fiber + Supabase Realtime. No backend. Wooden/parchment/runic aesthetic, 800 AD Viking vibe.

## User Personas
- **Host**: creates a session, shares a 6-char rune with a friend
- **Guest**: joins a friend's rune to play a 1v1 match
- **Tester (local)**: opens two browser tabs on same origin and plays both sides via BroadcastChannel fallback (works when Supabase keys are placeholders)

## Core Requirements
- No login, no backend
- Session code based multiplayer (create + join)
- Disconnect/rejoin supported on same code while the other player is still present
- Full Orlog ruleset: 6 dice per player, 15 HP, 3 rolls per round, god favors, resolution, win at 0 HP
- 3D scene (R3F): wooden table + bowls + cups with lift/shake illusion (no physics)
- Procedural audio (Web Audio): no external asset files
- Viking aesthetic: wood/parchment/runestone textures, Cormorant Unicase + EB Garamond + MedievalSharp fonts, runic SVG background

## What's Been Implemented (2026-01-04)
- **Home screen** (`/app/src/screens/HomeScreen.tsx`): name input, Forge/Join CTAs, rules panel, sound + ambient toggles, local-mode notice
- **Lobby screen** (`LobbyScreen.tsx`): 6-char rune display, copy button, presence readout
- **Game screen** (`GameScreen.tsx`): two PlayerHUDs (HP stones, favor ⌘, name, floaters), 3D scene layer, dice tray (keep/reroll/stand), god favor panel, resolution log
- **End screen** (`EndScreen.tsx`): Victory/Defeat title, rematch flow, back-to-home
- **Engine** (`/app/src/game/engine.ts`): `rollSix`, `resolveRound`, `beginNextRound`, `winner` — deterministic RNG via shared seed
- **6 God Favors** (`/app/src/game/types.ts`): Baldr, Skadi, Vidar, Thor, Idun, Mimir — each with cost + priority + description
- **Host-authoritative store** (`/app/src/store/useGameStore.ts`): Zustand store syncs via Supabase Realtime channel broadcast; guest sends actions, host mutates + broadcasts snapshot
- **Multiplayer channel** (`/app/src/multiplayer/channel.ts`): Supabase Realtime wrapper with automatic BroadcastChannel+localStorage fallback for local/dummy-key mode
- **3D scene** (`/app/src/components/scene/TableAndBowls.tsx`, `scenes/GameScene.tsx`): procedural wood-texture table, 2 bowls, 2 cups with spring-animated lift + shake
- **Procedural audio** (`/app/src/audio/sounds.ts`): Web-Audio synthesized horn, wooden clacks, cup-cover thud, shake-noise, damage, heal, victory/defeat + toggleable ambient drone+drum loop
- **Styling** (`/app/src/index.css`): Tailwind v4 with Viking theme tokens, wooden buttons, parchment panels, HP stones, favor tokens, floaters, runic SVG bg

## Testing Status
- Iteration 1 (frontend-only, two-tab multiplayer): **100% of testable flows passed**. 30+ data-testids verified. End-screen/rematch flow not exercisable via UI without HP cheat (takes 5-10 rounds of RNG to deplete), but engine logic verified via code review.

## Configuration
- `/app/.env` — `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` currently set to placeholder values; app auto-detects and runs in local BroadcastChannel mode. Swap in real keys to enable cross-device Supabase Realtime multiplayer (zero code change).
- `/app/frontend/package.json` — tiny proxy script that runs Vite in `/app` via supervisor's `yarn start` convention.

## Next Actions / Backlog
- **P1**: Add fan-out loading state for Supabase disconnect/reconnect + explicit "Reconnect" banner animation
- **P1**: Persist session code in URL hash so reload can auto-rejoin
- **P2**: Add more curated gods (Freyja, Frigg, Bragi, Heimdall) with unlock progression
- **P2**: Animated dice-face textures on the 3D bowls (currently faces only show in HUD chips)
- **P2**: Matchmaking lobby list (host-advertised sessions via Supabase)
- **P3**: Skins/regional bowls (Norway / England variants)
- **P3**: Replay log / shareable result card
