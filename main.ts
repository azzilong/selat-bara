// main.ts — Selat Bara dossier build for make.fun (gta6-01).
// Copies game/ + screenshots/ into $MAKEFUN_OUTPUT_DIR, builds the dossier
// with the kit's buildDossier, writes dossier.json, and reports the text
// size against the 163,840-byte HARD limit. Run: MAKEFUN_OUTPUT_DIR=out node main.ts
import { writeFileSync, rmSync, cpSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || join(root, 'out');

// Fresh output every run: stale files (e.g. a retired screenshot) must never
// be counted, so the whole output dir is removed before copying.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const bytes = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
});
writeFileSync(join(out, 'dossier.json'), bytes);

const parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
const text = typeof parsed.text === 'string' ? parsed.text : '';
const textBytes = Buffer.byteLength(text, 'utf8');
const cut = text.includes('[Cut at');
const images = Array.isArray(parsed.images) ? parsed.images.length : 0;
console.log(`dossier text ${textBytes} / 163840 bytes — ${textBytes <= 163840 && !cut ? 'FITS' : 'OVER LIMIT'}${cut ? ' (TRUNCATED)' : ''}`);
console.log(`screenshots: ${images}, dossier.json: ${bytes.length} bytes`);
if (cut || textBytes > 163840) {
  console.error('dossier text exceeds the limit or was cut — shrink the sources');
  process.exitCode = 1;
}
