// main.ts — SELAT BARA build program (gta6-01).
// Copies game/ + screenshots/ into $MAKEFUN_OUTPUT_DIR, writes
// dossier.json via buildDossier, and reports the dossier text size
// against the HARD 163,840-byte limit.
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const bytes = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
});
writeFileSync(join(outDir, 'dossier.json'), bytes);

const parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
const textBytes = Buffer.byteLength(parsed.text, 'utf8');
const shots = Array.isArray(parsed.images) ? parsed.images.length : 0;
console.log(`dossier text ${textBytes} / 163840 bytes — ${textBytes <= 163840 ? 'FITS' : 'OVER LIMIT'}`);
console.log(`screenshots: ${shots}`);
if (typeof parsed.text === 'string' && parsed.text.includes('[Cut at')) {
  throw new Error('dossier text was truncated by buildDossier — sources were cut');
}
if (textBytes > 163840) throw new Error('dossier text exceeds the 163,840-byte limit');
console.log(`dossier.json ${bytes.length} bytes, exit 0`);
