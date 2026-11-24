[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/azzilong/selat-bara/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/azzilong/selat-bara/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SELAT BARA

An original open-world crime game built from zero for the [make.fun](https://make.fun) gta6-01 bounty. Bright midday sun, a dense low-poly city, and a rogue courier who has run out of roads to run on.

## The story

Raka is a courier who moves packages no one else will touch. One delivery goes wrong, the syndicate wants him quiet, and the Selat Bara PD wants him in cuffs — so now the whole city is after him. Steal the car, clear the street, lose the heat, and reach the docks before the net closes.

## The city

Selat Bara is a dense low-poly port city on a ±8x8 grid, five named districts pressed shoulder to shoulder with no empty lots:

- **Pelabuhan Bara** — the docks, where every getaway ends
- **Kota Tua** — the old town, narrow streets and tall facades
- **Pasar Lama** — the old market, crowded stalls and tight corners
- **Distrik Kaca** — the glass district, bright towers and wide avenues
- **Tanjung Emas** — the golden cape, palm-lined roads by the sea

One side of the city is a beach with bright blue sea. Buildings run 2–4 floors with bright facades — white, cream, light blue, orange — every one of them windowed, with rooftop props, neon signs, shopfront awnings, bus stops, benches, hydrants and palms so the streets read alive. Main roads are wide enough for three cars abreast; side streets take two. Roads carry double yellow lines.

## Missions

- **M1 — The Getaway**: Raka in a sports car, chased by three police cars and a helicopter. Wanted: 3 stars.
- **M2 — The Brutal Shootout**: Raka behind a wrecked car, trading fire with four armed enemies. Muzzle flash, blood, fallen bodies, cash and ammo drops. Objective: kill the gang.
- **M3 — High Speed Chase**: a drive-by shooting from a speeding car, Raka leaning out of the window at the police car alongside.

## Mode Bioskop

Every action scene is staged exactly, not left to random gameplay. Open the game with a scene parameter:

- `?scene=action1` — the police chase: cars, helicopter, crash
- `?scene=action2` — the brutal street shootout: bodies, muzzle flash, cover
- `?scene=action3` — the drive-by: parallel cars, shattered glass
- `?scene=map` — the full city map: districts, legend, route, standings
- `?scene=title` — the title screen over the bright midday city

Each scene forces in-game time to 12:00, sets a cinematic camera (low behind the car, or over-the-shoulder when shooting), spawns the vehicles and NPCs exactly as described, hides the menus, shows the full HUD (Wanted, Health, Armour, Ammo, Minimap), and freezes at the most dramatic frame.

## HUD

GTA-style, all at once: mission panel with stage, next step and progress bar; the Selat Bara PD response panel with named units, roles and live distances in metres; wanted stars with a status line ("AIR UNIT DEPLOYED", "UNITS RESPONDING"); district name, street and standing above a gold-bordered minimap with a route line and wanted-radius circle; three weapon slots; money and clock top-right; speedometer with vehicle name and damage when driving.

## Controls

- **WASD** — move / drive
- **E** — enter / exit car
- **Click / Space** — shoot
- **R** — reload
- **1 / 2 / 3** — switch weapon (Fists / Pistol / SMG)

## Tech notes

- Three.js r160, vendored as an ES module — no network while playing
- Bright flat solid colours everywhere, no textures, no GLB/GLTF
- MeshLambertMaterial throughout; HemisphereLight (sky 0x87CEEB, ground 0xE0C090, 0.8) and DirectionalLight (0xFFF8E7, 1.5) with shadows; background 0x87CEEB, fog 0x87CEEB
- Characters built from boxes and capsules with realistic proportions (head 1/7 of body height); cars are body + cabin + 4 wheels + glass + lights
- Action effects are pure geometry: muzzle flash as a glowing yellow box, blood as red box particles and pools, car damage as grey smoke, police light bars with flashing red-blue emissive blocks, helicopter with spinning rotor and a spotlight beam
- Entry: `game/index.html`, bootstrap `game/src/main.js`
- Build program: `main.ts` (dossier ≤ 163,840 bytes)

## Screenshots

Four staged shots in `screenshots/` (mirrored in `game/screenshots/`): 1-action1 (the chase), 2-action2 (the shootout), 3-action3 (the drive-by), 4-map (the city map).

## License

MIT — see `LICENSE`.
