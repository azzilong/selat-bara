// SELAT BARA — character builder (step 2).
// Re-written in-session under recording 9 (gta6-01, 2026-11-24).
// Realistic proportions (brief): total height 1.8 units, head ~1/7 of
// body (0.26), torso 0.55, legs 0.85, arms 0.6. Built from BoxGeometry
// + CapsuleGeometry only, solid colours, no textures. Joints live in
// userData so animateWalk / animateIdle can pose the character.
// Walk = 4 frames (limb swing), idle = 2 frames (breathing sway).
// REBUILD #3: drop rings are bigger and brighter (fix #9) so the loot
// above fallen enemies reads from across the street.
import * as THREE from 'three';

const matCache = new Map();
const MAT = (c) => {
  if (!matCache.has(c)) {
    matCache.set(c, new THREE.MeshLambertMaterial({ color: c }));
  }
  return matCache.get(c);
};

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCap = new THREE.CapsuleGeometry(0.5, 1, 4, 8);

function part(group, geo, mat, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// Build one character. opts:
//   skin, hair, top, pants, shoes, jacket (bool: hero coat),
//   hat ('police' | 'cap' | null), gun ('smg' | 'rifle' | null)
// Returns a Group, feet at y=0, facing -Z, ~1.8 units tall.
export function buildCharacter(opts = {}) {
  const skin = opts.skin ?? 0xc98a5b;
  const hair = opts.hair ?? 0x1b1b1b;
  const top = opts.top ?? 0x8a8f96;
  const pants = opts.pants ?? 0x2a2f36;
  const shoes = opts.shoes ?? 0x141414;
  const g = new THREE.Group();

  // legs: 0.85 tall (thigh + shin as one capsule each, pivoted at hip)
  const legL = new THREE.Group();
  legL.position.set(-0.11, 0.85, 0);
  part(legL, unitCap, MAT(pants), 0.16, 0.42, 0.16, 0, -0.42, 0);
  part(legL, unitBox, MAT(shoes), 0.17, 0.09, 0.3, 0, -0.82, -0.04);
  g.add(legL);
  const legR = new THREE.Group();
  legR.position.set(0.11, 0.85, 0);
  part(legR, unitCap, MAT(pants), 0.16, 0.42, 0.16, 0, -0.42, 0);
  part(legR, unitBox, MAT(shoes), 0.17, 0.09, 0.3, 0, -0.82, -0.04);
  g.add(legR);

  // torso: 0.55 tall, 0.42 wide
  const torso = new THREE.Group();
  torso.position.set(0, 0.85, 0);
  part(torso, unitBox, MAT(top), 0.44, 0.55, 0.24, 0, 0.28, 0);
  if (opts.jacket) {
    // hero coat: open front panels + collar, ember-red
    part(torso, unitBox, MAT(0xe63b12), 0.1, 0.5, 0.26, -0.18, 0.28, 0);
    part(torso, unitBox, MAT(0xe63b12), 0.1, 0.5, 0.26, 0.18, 0.28, 0);
    part(torso, unitBox, MAT(0xe63b12), 0.46, 0.1, 0.26, 0, 0.5, 0);
  }
  if (opts.band) {
    // syndicate armband / chest stripe
    part(torso, unitBox, MAT(0xe07b22), 0.46, 0.09, 0.26, 0, 0.32, 0);
  }
  g.add(torso);

  // arms: 0.6 long, pivoted at the shoulder
  const armL = new THREE.Group();
  armL.position.set(-0.28, 1.32, 0);
  part(armL, unitCap, MAT(top), 0.11, 0.28, 0.11, 0, -0.28, 0);
  part(armL, unitCap, MAT(skin), 0.1, 0.08, 0.1, 0, -0.58, 0);
  g.add(armL);
  const armR = new THREE.Group();
  armR.position.set(0.28, 1.32, 0);
  part(armR, unitCap, MAT(top), 0.11, 0.28, 0.11, 0, -0.28, 0);
  part(armR, unitCap, MAT(skin), 0.1, 0.08, 0.1, 0, -0.58, 0);
  g.add(armR);

  // head: 0.26 tall box + hair cap, top of the 1.8-unit figure
  const head = new THREE.Group();
  head.position.set(0, 1.4, 0);
  part(head, unitBox, MAT(skin), 0.26, 0.26, 0.24, 0, 0.13, 0);
  part(head, unitBox, MAT(hair), 0.28, 0.09, 0.26, 0, 0.28, 0);
  part(head, unitBox, MAT(hair), 0.28, 0.16, 0.06, 0, 0.18, 0.12);
  if (opts.hat === 'police') {
    part(head, new THREE.CylinderGeometry(0.17, 0.17, 0.08, 12),
      MAT(0x1d2a4a), 1, 1, 1, 0, 0.33, 0);
    part(head, unitBox, MAT(0x101725), 0.3, 0.03, 0.2, 0, 0.3, -0.14);
  } else if (opts.hat === 'cap') {
    part(head, new THREE.CylinderGeometry(0.15, 0.15, 0.07, 12),
      MAT(0x2e86c1), 1, 1, 1, 0, 0.32, 0);
    part(head, unitBox, MAT(0x2e86c1), 0.24, 0.03, 0.14, 0, 0.3, -0.13);
  }
  g.add(head);

  // weapon, held in the right hand, pointing forward (-Z)
  let gun = null;
  if (opts.gun === 'smg') {
    gun = new THREE.Group();
    part(gun, unitBox, MAT(0x22262c), 0.09, 0.12, 0.55, 0, 0, -0.2);
    part(gun, unitBox, MAT(0x3a3f46), 0.06, 0.16, 0.1, 0, -0.1, -0.05);
    gun.position.set(0.28, 0.78, -0.25);
    g.add(gun);
  } else if (opts.gun === 'rifle') {
    gun = new THREE.Group();
    part(gun, unitBox, MAT(0x2c2118), 0.08, 0.1, 0.85, 0, 0, -0.3);
    part(gun, unitBox, MAT(0x1c1f24), 0.06, 0.06, 0.3, 0, 0.02, -0.72);
    gun.position.set(0.28, 0.85, -0.3);
    g.add(gun);
  }

  g.userData.joints = { legL, legR, armL, armR, torso, head, gun };
  g.userData.kind = 'character';
  return g;
}

// Hero: Raka, the rogue courier — ember-red jacket, jeans, SMG.
export function buildHero() {
  const g = buildCharacter({
    top: 0xd8d3c8, pants: 0x2e4a6b, jacket: true, gun: 'smg',
    skin: 0xc98a5b, hair: 0x1b1b1b,
  });
  g.userData.kind = 'hero';
  return g;
}

// Syndicate enforcer: dark top, orange band, rifle.
export function buildEnemy() {
  const g = buildCharacter({
    top: 0x2b2f36, pants: 0x1c1f24, band: true, gun: 'rifle',
    skin: 0xb98a68, hair: 0x0f0f0f,
  });
  g.userData.kind = 'enemy';
  return g;
}

// Selat Bara PD officer: navy uniform, police hat, SMG.
export function buildPolice() {
  const g = buildCharacter({
    top: 0x2b3a55, pants: 0x1d2733, hat: 'police', gun: 'smg',
    skin: 0xd8a06a, hair: 0x222222,
  });
  g.userData.kind = 'police';
  return g;
}

// Pedestrians: 3 colour variants for the living city.
const PED_VARIANTS = [
  { top: 0xf2c14e, pants: 0x3a3f46, hat: 'cap', skin: 0xd8a06a, hair: 0x3a2a1a },
  { top: 0x7fb069, pants: 0x2a2f36, skin: 0x8a5a3b, hair: 0x111111 },
  { top: 0xe07b9a, pants: 0x4a3a5a, skin: 0xe8b88a, hair: 0x5a3a1a },
];
export function buildPedestrian(variant = 0) {
  const g = buildCharacter(PED_VARIANTS[variant % PED_VARIANTS.length]);
  g.userData.kind = 'pedestrian';
  return g;
}

// --- floating loot drop (REBUILD FIX #6) ----------------------------------
// A drop hovers ~1.0u above a fallen enemy: cash bundle (green, with a
// pale band) or ammo box (gold), plus a glowing ring on the ground
// below it so the eye finds it in a busy frame. The scene bobs it via
// userData.baseY in updateStaged; kind: 'cash' | 'ammo'.
// FIX #12 (user 2026-11-24 ~08:05 WIB: the drops read as plain boxes):
// each drop now carries a big marker built from boxes/cylinders only
// (no textures) — a gold "$" floating above the cash bundle, and a
// gold bullet standing on the ammo box — gold emissive so it reads at
// street distance. updateStaged billboards the whole drop to face the
// camera (no more spin) so the marker never turns away at capture time.
const MARKER_MAT = new THREE.MeshLambertMaterial({
  color: 0xffd24a, emissive: 0xffc400, emissiveIntensity: 2.6 });
const BULLET_TIP_MAT = new THREE.MeshLambertMaterial({
  color: 0xfff2c0, emissive: 0xffffff, emissiveIntensity: 2.0 });

// "$" glyph from boxes, in the XY plane facing +Z: top bar, upper-left
// stem, middle bar, lower-right stem, bottom bar, vertical spine that
// pokes out top and bottom. Chunky bars (0.14) so it reads at ~25u.
function buildDollarMark(mat) {
  const g = new THREE.Group();
  const bar = (sx, sy, x, y) => part(g, unitBox, mat, sx, sy, 0.1, x, y, 0);
  bar(0.6, 0.14, 0, 0.98);      // top bar
  bar(0.14, 0.34, -0.23, 0.81); // upper-left stem
  bar(0.6, 0.14, 0, 0.64);      // middle bar
  bar(0.14, 0.34, 0.23, 0.47);  // lower-right stem
  bar(0.6, 0.14, 0, 0.30);      // bottom bar
  bar(0.14, 1.0, 0, 0.64);      // spine through the middle
  return g;
}

// One bullet standing upright: brass body + pale pointed tip + rim.
function buildBulletMark() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12), MAT(0x8a5a00));
  rim.position.set(0, 0.22, 0);
  rim.castShadow = false;
  g.add(rim);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.45, 12), MARKER_MAT);
  body.position.set(0, 0.5, 0);
  body.castShadow = false;
  g.add(body);
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.24, 12), BULLET_TIP_MAT);
  tip.position.set(0, 0.85, 0);
  tip.castShadow = false;
  g.add(tip);
  return g;
}

export function buildDrop(kind = 'cash') {
  const g = new THREE.Group();
  const cash = kind === 'cash';
  const bodyMat = new THREE.MeshLambertMaterial({
    color: cash ? 0x2fae4e : 0xffc93c,
    emissive: cash ? 0x1d7a30 : 0xa87800,
    emissiveIntensity: 0.9,
  });
  const body = part(g, unitBox, bodyMat, 0.55, 0.3, 0.38, 0, 0, 0);
  body.castShadow = false;
  if (cash) {
    const band = part(g, unitBox, MAT(0xe8e8d8), 0.57, 0.12, 0.4, 0, 0, 0);
    band.castShadow = false;
    g.add(buildDollarMark(MARKER_MAT)); // FIX #12: big gold "$" above
  } else {
    const lid = part(g, unitBox, MAT(0x8a5a00), 0.57, 0.08, 0.4, 0, 0.18, 0);
    lid.castShadow = false;
    g.add(buildBulletMark()); // FIX #12: gold bullet above the box
  }
  // glow ring flat on the ground under the drop (added to the group at
  // -baseY by the caller; here it sits at y=0 relative to the drop and
  // the caller positions the whole group, so keep the ring as a child
  // that the scene re-parents — simpler: ring is a separate mesh the
  // caller adds at ground level. See dropRing() below.
  g.userData.kind = 'drop';
  g.userData.dropKind = kind;
  return g;
}

// Flat glowing ring that marks a drop's ground position.
// REBUILD #3 FIX #9: bigger (0.8 radius) and brighter (emissive 2.0)
// than the old 0.55 ring — the old one barely read at street distance.
export function dropRing(color = 0x7dff8a) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.09, 8, 28),
    new THREE.MeshLambertMaterial({
      color, emissive: color, emissiveIntensity: 2.0 }));
  m.rotation.x = Math.PI / 2;
  m.position.y = 0.06;
  m.castShadow = false;
  return m;
}

// Walk cycle: 4 frames — legs and arms swing in opposition.
export function animateWalk(ch, t) {
  const j = ch.userData.joints;
  if (!j) return;
  const s = Math.sin(t * 9);
  j.legL.rotation.x = s * 0.55;
  j.legR.rotation.x = -s * 0.55;
  j.armL.rotation.x = -s * 0.45;
  j.armR.rotation.x = s * 0.45;
  j.torso.position.y = 0.85 + Math.abs(Math.cos(t * 9)) * 0.03;
}

// Idle: 2 frames — slow breathing sway, arms at rest.
export function animateIdle(ch, t) {
  const j = ch.userData.joints;
  if (!j) return;
  j.legL.rotation.x = 0;
  j.legR.rotation.x = 0;
  j.armL.rotation.x = Math.sin(t * 1.6) * 0.04;
  j.armR.rotation.x = -Math.sin(t * 1.6) * 0.04;
  j.torso.position.y = 0.85 + Math.sin(t * 1.6) * 0.012;
  j.torso.rotation.y = Math.sin(t * 0.8) * 0.03;
}

// A fallen body: lay the character flat (rotation X 90 deg), motionless.
export function layFallen(ch) {
  ch.rotation.x = -Math.PI / 2;
  ch.position.y = 0.28;
  ch.userData.fallen = true;
  return ch;
}
