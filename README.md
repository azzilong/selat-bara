# SELAT BARA

[![gta6-01](https://img.shields.io/badge/gta6--01-entry-blue)](https://make.fun)
[![Three.js](https://img.shields.io/badge/Three.js-r160-049ef4)](https://threejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

**SELAT BARA — Strait of Embers.** An original low-poly open-world crime
game built from zero in Three.js. Bright midday sun, a dense living city
on the strait, and one rogue courier against the whole town.

## Story

Raka, a rogue courier, stole the syndicate's ledger — and now the Selat
Bara PD wants him. Outrun the patrol cars, survive the street shootout,
and reach the docks before the heat closes in.

## The city

Five districts — Pelabuhan Bara, Kota Tua, Pasar Lama, Distrik Kaca,
Tanjung Emas — on a dense ±8x8 grid with windowed facades, rooftop props,
neon signs, palms, and a bright blue sea on the west side. Main roads are
12 units wide, side streets 8 — wide enough for three cars abreast.

## Missions

1. **M1 · The Getaway** — steal the sports car, lose the heli (Wanted ★★★).
2. **M2 · The Brutal Shootout** — clear the street, gang drops included.
3. **M3 · High Speed Chase** — drive-by on a patrol car at 112 KM/H.

## Mode Bioskop

Add a URL parameter to jump straight to a staged cinematic frame:

- `?scene=action1` — police chase with heli
- `?scene=action2` — brutal street shootout
- `?scene=action3` — drive-by shooting
- `?scene=map` — full city map with legend and standings
- `?scene=title` — title screen over the midday city

## Controls

WASD drive / walk · E enter car · F exit · Click / Space shoot ·
R map · 1-3 weapons · Enter start.

## Tech

- Three.js r160 (vendored), WebGL, no network while playing.
- No textures, no GLB/GLTF — every model is procedural Box/Capsule
  geometry with solid flat Lambert colours.
- HUD: mission panel, Selat Bara PD response panel with live distances,
  district + standing, wanted status, weapon slots, minimap + full map.
- Build: `MAKEFUN_OUTPUT_DIR=out node main.ts` (dossier ≤ 163,840 bytes).

## License

MIT — see [LICENSE](./LICENSE).
