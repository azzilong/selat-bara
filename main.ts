// Selat Bara — dossier build program (node 22, no network).
// Copies game/ + screenshots/ into $MAKEFUN_OUTPUT_DIR, then builds the
// dossier with the vendored make.fun game library and writes dossier.json.
// Usage: MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(import.meta.dirname);
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || 'out');

mkdirSync(outDir, { recursive: true });
for (const name of ['game', 'screenshots']) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) throw new Error(`missing ${name}/ in ${repoRoot}`);
  cpSync(src, join(outDir, name), { recursive: true, force: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
const text = Buffer.from(dossier).toString('utf8');
const parsed = JSON.parse(text);
const gameText = Buffer.byteLength(parsed.text, 'utf8');
const cut = parsed.text.includes('[Cut at');
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier text ${gameText} / 163840 bytes — ${gameText <= 163840 ? 'FITS' : 'OVER LIMIT'}${cut ? ' — WARNING: sources were CUT to fit!' : ' (all sources included)'}`);
console.log(`screenshots: ${parsed.images.length}, dossier.json: ${dossier.length} bytes`);
console.log('entries in out/:', readdirSync(outDir).join(', '));
