# SELAT BARA

[![Selat Bara](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/azzilong/selat-bara/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/azzilong/selat-bara/reward.svg)](https://make.fun/bounty/gta6-01)

An original low-poly open-world crime game for the [gta6-01 bounty](https://make.fun/bounty/gta6-01) on make.fun. Built from zero — no copied assets, no textures, no GLB files. Everything is procedural Three.js geometry in bright midday sun.

## Story

Raka, a rogue courier, takes back the docks from the city syndicate — one getaway, one shootout, one chase at a time. The Selat Bara PD is already on his tail, from the docks of Pelabuhan Bara to the glass towers of Distrik Kaca.

## The city

Five named districts — Pelabuhan Bara, Kota Tua, Pasar Lama, Distrik Kaca, Tanjung Emas — on a dense grid with a beach and bright blue sea on the west side, palms, neon signs, shopfront awnings, and windows on every building. Main roads are wide enough for three cars abreast; side streets fit two.

## Missions

- **M1 · The Getaway** — steal the sports car and lose the heli with 3 police cars on your tail. Wanted 3 stars.
- **M2 · The Brutal Shootout** — hold the street behind a wrecked car against the gang: muzzle flash, tracers, blood, fallen bodies, cash and ammo drops.
- **M3 · High Speed Chase** — drive-by shooting at the police car alongside you.

## Features

- Free-roam: walk, drive, shoot, reload, switch weapons (Fists / Pistol / SMG).
- Wanted system with named Selat Bara PD units (SBPD-7 BARA, SBPD-12 TANJUNG, SBPD-19 KACA, SBPD-AIR ELANG) and a live response panel with distances.
- District standing, minimap with gold mission route and wanted radius, and a full city map with legend, POI labels and a standing list.
- "Mode Bioskop" staging via URL: `?scene=action1`, `?scene=action2`, `?scene=action3`, `?scene=title`, `?scene=map` — frozen at the most dramatic frame, full HUD, 12:00 midday.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` over HTTP). Press **Enter** to play. **WASD** move / drive, **E** enter or exit the car, **Click / Space** shoot, **R** reload, **1 / 2 / 3** switch weapons.

## Build

`main.ts` builds the submission dossier (text limit 163,840 bytes):

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Referral code: `evq19zav`
