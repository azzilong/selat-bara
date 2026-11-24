# Selat Bara

[![Selat Bara on make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Selat Bara rank](https://make.fun/badge/gta6-01/azzilong/selat-bara/rank.svg)](https://make.fun/bounty/gta6-01)
[![Selat Bara reward](https://make.fun/badge/gta6-01/azzilong/selat-bara/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game built for [make.fun's "Make GTA 6" bounty](https://make.fun/bounty/gta6-01).
Low-poly, bright solid flat colours, no textures — a sunny midday city, a rogue courier, and the
Selat Bara PD on his tail.

## Story

Raka is a courier who refused one delivery too many. Now the syndicate owns the streets of
Selat Bara — and the police own Raka. Three jobs stand between him and the docks: outrun the
pursuit, silence the gang, and lose the heat for good.

## Features

- **A living midday city** — a dense 8×8 grid across five districts (Pelabuhan Bara, Kota Tua,
  Pasar Lama, Distrik Kaca, Tanjung Emas), every building windowed with rooftop props, neon
  shop signs, palms, a beach and bright blue sea on the west side, and wide roads with
  double yellow lines.
- **Three missions** — M1 *The Getaway* (outrun three police cars under the police heli),
  M2 *The Brutal Shootout* (clear the gang from the street, muzzle flashes, blood, drops),
  M3 *High Speed Chase* (drive-by shooting from inside the car).
- **GTA-style systems** — wanted stars with a live Selat Bara PD response panel, health and
  armour, weapon slots (fists / pistol / SMG), money and clock, a gold-bordered minimap with
  a mission route line and wanted radius, and a speedometer with vehicle damage.
- **"Mode Bioskop"** — frozen cinematic staging via URL: `?scene=action1` (police chase),
  `?scene=action2` (street shootout), `?scene=action3` (drive-by), `?scene=title` (title
  screen over the bright city). Every scene is locked at 12:00 with the full HUD.
- **Pure procedural Three.js** — every car, character, building and effect is built from
  boxes and cylinders in code. No textures, no GLB/GLTF, no network while playing.

## How to play

Open `game/index.html` in a browser (serve the `game/` folder over HTTP, e.g.
`python3 -m http.server` inside `game/`).

- **WASD / arrows** — move (on foot) or drive (in a car)
- **E** — enter / exit the car
- **Click / Space** — shoot the SMG
- **R** — reload
- **1 / 3** — switch between fists and SMG
- **Enter** — start from the title screen

Selat Bara is original work built for the make.fun "Make GTA 6" bounty:
its own name, districts, story, characters and colours. Three.js r160 is
vendored under `game/vendor/`.
