// SELAT BARA — dossier build program (step 8).
// Re-written in-session under recording 8 (gta6-01, 2026-11-24).
// Hands the game in: copies game/ and screenshots/ from beside this
// file to /output (or $MAKEFUN_OUTPUT_DIR outside the grader) and
// writes /output/dossier.json with buildDossier from the vendored
// make.fun library. The dossier text is capped at 163,840 bytes
// (text_max_bytes) — the hard limit for this bounty.
//
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Rebuild note: the dossier is rebuilt after every screenshot pass;
//  the 6 rebuild fixes added ~3 KB of game code — still far under
//  the 163,840-byte text cap.)
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// buildDossier returns the dossier as bytes; write them, then read the
// text back as UTF-8 for the size report.
const dossierBytes = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossierBytes);

// Report the dossier text size so the builder can see the budget.
const parsed = JSON.parse(Buffer.from(dossierBytes).toString('utf8'));
const textBytes = Buffer.byteLength(parsed.text ?? '', 'utf8');
console.log('dossier written:', join(out, 'dossier.json'));
console.log('dossier text bytes:', textBytes, '/ 163840');
console.log('dossier text fits:', textBytes <= 163840);
console.log('screenshots:', (parsed.images ?? []).length);
