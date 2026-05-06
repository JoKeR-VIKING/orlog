# Orlog — AAA Polish PRD

## Original Problem Statement
> "Access the orlog repo from my github (https://github.com/JoKeR-VIKING/orlog). It is a 1v1 multiplayer game which is supposed to be of viking styled 3d game with top view. I want to improve the graphics and UI, HUD and UX of this game with sound effects and other things to be on the level of a AAA title. The textures and stuff all need to be on the level of a polished AAA game instead of looking like a web hobby project. The background and stuff with runic theme is nice but I want it nicer. The theme is viking, wooden style, runic nordic. The hud and UX of the game also needs to be updated to AAA standard. Lastly the sound effects also need to be crisp and best."
>
> Reference wiki: https://assassinscreed.fandom.com/wiki/Orlog

## Architecture
- **Frontend**: React 19 + Vite 8 + TypeScript + R3F (Three.js) + Tailwind v4 + Zustand + Supabase (multiplayer) + Howler/WebAudio. Runs at port 3000 via `vite --host 0.0.0.0 --port 3000` (supervisor `yarn start`).
- **Backend**: existing FastAPI scaffolding (unused for this game; multiplayer uses Supabase).

## User Personas
- **Solo Viking**: plays vs the AI for quick saga.
- **Saga Caller**: hosts a session and shares rune code.
- **Saga Joiner**: enters rune to fight a friend.

## Core Requirements (static)
- Viking / wooden / runic-nordic AAA aesthetic (graphics, HUD, sound).
- Top-down R3F 3D scene with table, dice bowls, dice, glowing rune circle.
- 1v1 multiplayer + solo-vs-AI mode (3 difficulties).
- Free, royalty-free assets only (procedural / generated client-side).

## What's Been Implemented (Jan 2026 — AAA upgrade)

### 3D Scene (R3F) — `/app/frontend/src/scenes/GameScene.tsx`
- PCF-soft shadow maps + ACES filmic tone mapping + cinematic camera breathing.
- Layered lighting: warm key directional, cool fill, top warm rim, bottom rune uplight.
- 4 flickering torch sconces at table corners (`/components/scene/TorchLights.tsx`) with multi-octave noise flicker animation.
- Atmosphere: distant mossy stone floor, fog, dust-mote `Sparkles`, ember `Sparkles` near torches (`/components/scene/Atmosphere.tsx`).
- Postprocessing: Bloom (mipmap blur for emissives) + Vignette (`/components/scene/PostFX.tsx`).

### Table / Bowls / Dice — `/app/frontend/src/components/scene/TableAndBowls.tsx`
- PBR procedural wood (color + normal) with plank seams, knots, vignette.
- Iron rivets/studs around table perimeter.
- Engraved runic stone ring around table edge with glowing emissive runes.
- Beveled `RoundedBox` dice with rich aged-bone face textures (color + favor frame).
- Iron-bound bowls with riveted rims + glowing rune inset markers.
- Iron-banded wooden cups (used during dice shake) with glowing rune lid.

### Resolution VFX — `/app/frontend/src/components/scene/ResolutionAnimation.tsx`
- Glowing trail behind flying axes/arrows.
- Particle (octahedron) burst on weapon impact.
- Shockwave-style impact ring with emissive flash.
- Improved god-favor: `GodColumn` light beam + golden rune disk + ground glow (`/components/scene/Effects.tsx`).

### HUD / UI Polish
- `wood-panel` upgraded with iron-rivet corner studs + crisp dark border.
- `PlayerHUD` (`/components/ui/PlayerHUD.tsx`) — iron-corner reinforcements, animated runic indicator, gradient HP bar with shimmer + emissive glow + low-HP color shift.
- Cinematic phase banner with rune-overline that animates on phase change.
- Screen-shake CSS animation on damage taken.
- Beveled bone-style dice chips in the keep-tray.
- Cinematic `EndScreen` with iron rivets + glow-aware result title.

### AAA Audio — `/app/frontend/src/audio/sounds.ts`
- Synthetic stone-hall convolver reverb on percussive sounds.
- Ambient layered drone (root + 5th + octave) + filtered brown-noise wind + fire crackle + recurring tribal drum pattern (auto-on by default).
- Wooden cup-cover (sub + mid + scuff layers).
- Multi-layer dice rattle (filtered noise body + 14 random clacks).
- Six-layer dice reveal clacks + dust hiss.
- Damage: sub thump + crunch saw + grit noise.
- Shield block: wood thunk + 4-partial iron ring + spark hiss.
- Heroic 3-oscillator viking horn chord (root + 5th + octave) with vibrato.
- God-invoke shimmer: rising sine sweep + bell stack + sub thump.
- Victory fanfare (major arpeggio + horn + drum punctuation).
- Defeat dirge (descending minor + tolling bell).

### Misc Tweaks
- Default `ambientOn=true` so first-time users get the hall ambience.
- `audio.play('click')` on every interactive game action.
- Fallback Supabase placeholder URL so solo mode never crashes when keys are missing.

## Backlog / Optional improvements
- **P2** Auto-detect aiMode and skip Supabase channel/network entirely (eliminates 3 CORS errors observed in solo).
- **P2** Replace deprecated `THREE.Clock` warning by upgrading drei or using `THREE.Timer`.
- **P2** Camera tilt to 50–55° to make torches more prominently visible from default top-3/4 angle.
- **P2** Add player-emote shortcuts (cheer, taunt) for multiplayer flair.
- **P2** Add a "spectator cam" that orbits during opponent's turn.

## Testing Status (iteration_1.json — Jan 2026)
- 100% of critical solo flows pass (home → solo → game → roll → lock → forfeit → end → home).
- HUDs, 3D scene, VFX, audio init all verified — no JS errors.
- Confirmed visual quality: "beautiful Viking aesthetic: wooden table, glowing iron-bound HUDs, flickering torches in corners, atmospheric vignette/bloom."

## Key Files
- `/app/frontend/src/scenes/GameScene.tsx`
- `/app/frontend/src/components/scene/{TableAndBowls,TorchLights,Atmosphere,PostFX,Effects,ResolutionAnimation}.tsx`
- `/app/frontend/src/components/ui/{PlayerHUD,WoodenButton,GodFavorPanel,HealthGemRack,SelectedFavorShelf,DieFaceIcon}.tsx`
- `/app/frontend/src/screens/{HomeScreen,LobbyScreen,GameScreen,EndScreen}.tsx`
- `/app/frontend/src/audio/sounds.ts`
- `/app/frontend/src/index.css`
- `/app/frontend/src/store/useGameStore.ts`
