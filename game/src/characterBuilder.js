// Selat Bara — character builders + drops.
// Realistic proportions: 1.8u tall, head 0.26u (1/7 of height). All boxes,
// MeshLambertMaterial only, no textures. Characters face -Z by default.
import * as THREE from 'three';

const M = (c) => new THREE.MeshLambertMaterial({ color: c });
const L = (c, e = 1) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: e });

function box(w, h, d, c, x = 0, y = 0, z = 0, mat = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || M(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Shared skeleton: legs 0.8, torso 0.6, head 0.26, arms at the sides.
// Returns { group, head, torso, armL, armR, legL, legR, gun }.
function buildBody({ skin = 0xd9a066, shirt = 0xcccccc, pants = 0x2a3550, jacket = null, hat = null }) {
  const g = new THREE.Group();
  const legL = box(0.17, 0.8, 0.2, pants, -0.11, 0.4, 0);
  const legR = box(0.17, 0.8, 0.2, pants, 0.11, 0.4, 0);
  const torso = box(0.46, 0.6, 0.26, shirt, 0, 1.1, 0);
  const head = box(0.26, 0.26, 0.26, skin, 0, 1.67, 0);
  const armL = box(0.13, 0.62, 0.15, jacket || shirt, -0.31, 1.12, 0);
  const armR = box(0.13, 0.62, 0.15, jacket || shirt, 0.31, 1.12, 0);
  g.add(legL, legR, torso, head, armL, armR);
  if (jacket) g.add(box(0.48, 0.62, 0.28, jacket, 0, 1.1, 0)); // open jacket shell
  if (hat) g.add(box(0.3, 0.09, 0.3, hat, 0, 1.84, 0));
  return { group: g, head, torso, armL, armR, legL, legR, gun: null };
}

// Raka — the hero. Ember-red jacket, dark jeans, SMG in his right hand.
export function buildHero() {
  const c = buildBody({ skin: 0xd9a066, shirt: 0xf2ead8, pants: 0x2a3550, jacket: 0xd42a1e });
  // hair
  c.group.add(box(0.27, 0.09, 0.27, 0x1a1a1a, 0, 1.83, 0));
  // SMG: dark box + barrel, held forward from the right hand
  const gun = new THREE.Group();
  gun.add(box(0.09, 0.12, 0.55, 0x1c1c1c, 0, 0, -0.2));
  gun.add(box(0.05, 0.05, 0.3, 0x1c1c1c, 0, 0.02, -0.55));
  gun.add(box(0.07, 0.16, 0.1, 0x1c1c1c, 0, -0.12, 0.05));
  gun.position.set(0.31, 1.28, -0.3);
  c.group.add(gun);
  c.gun = gun;
  // aim the right arm forward (gun arm)
  c.armR.rotation.x = -1.35;
  c.armR.position.set(0.31, 1.32, -0.14);
  c.group.userData = { ...c, kind: 'hero' };
  return c.group;
}

// Syndicate gunman: orange band on the arm, rifle held across the body.
export function buildEnemy() {
  const c = buildBody({ skin: 0xc98d5a, shirt: 0x3a3f46, pants: 0x222222, jacket: 0x8a5a2a });
  c.group.add(box(0.27, 0.09, 0.27, 0x111111, 0, 1.83, 0));
  // orange gang band on the left arm
  c.group.add(box(0.15, 0.1, 0.17, 0xe86a1a, -0.31, 1.28, 0));
  const gun = new THREE.Group();
  gun.add(box(0.08, 0.1, 0.8, 0x222222, 0, 0, -0.25));
  gun.add(box(0.05, 0.14, 0.12, 0x222222, 0, -0.1, 0.1));
  gun.position.set(0.2, 1.25, -0.35);
  c.group.add(gun);
  c.gun = gun;
  c.armR.rotation.x = -1.2;
  c.armR.position.set(0.31, 1.3, -0.12);
  c.group.userData = { ...c, kind: 'enemy' };
  return c.group;
}

// Selat Bara PD officer: navy uniform, peaked cap, pistol at the hip.
export function buildPolice() {
  const c = buildBody({ skin: 0xd9a066, shirt: 0x1a2a55, pants: 0x141c33, hat: 0x0e1530 });
  c.group.add(box(0.32, 0.05, 0.32, 0x0e1530, 0, 1.86, -0.02)); // cap brim
  c.group.add(box(0.48, 0.08, 0.28, 0xd8d8d8, 0, 1.28, 0)); // duty belt
  c.group.userData = { ...c, kind: 'police' };
  return c.group;
}

// Pedestrians: three colour variants, no weapons.
export function buildPedestrian(variant = 0) {
  const v = [
    { skin: 0xe8b98a, shirt: 0x4a90c8, pants: 0x5a4a3a },
    { skin: 0x8a5a3a, shirt: 0xe8e06a, pants: 0x3a3a3a },
    { skin: 0xd9a066, shirt: 0xc86a9a, pants: 0x2a4a6a },
  ][variant % 3];
  const c = buildBody(v);
  c.group.add(box(0.27, 0.08, 0.27, 0x2a1a0a, 0, 1.83, 0));
  c.group.userData = { ...c, kind: 'pedestrian', variant };
  return c.group;
}

// Lay a character flat (rotation X 90 deg) — a fallen body.
export function poseFallen(char) {
  char.rotation.x = -Math.PI / 2;
  char.position.y = 0.14;
}

// Flat dark-red blood pool under a fallen body.
export function buildBloodPool() {
  const p = box(1.9, 0.03, 1.1, 0x7a0a0a, 0, 0.02, 0);
  p.receiveShadow = true;
  return p;
}

// Drops floating above fallen enemies. Cash gets a big gold "$" built from
// boxes (procedural geometry only, no textures); ammo gets an upright brass
// bullet. Both bob and carry a bright glow ring.
export function buildDrop(kind = 'cash') {
  const g = new THREE.Group();
  const ringMat = L(kind === 'cash' ? 0x2aff66 : 0xffc81a, 2.0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.07, 8, 24), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  g.add(ring);
  if (kind === 'cash') {
    // green cash bundle
    g.add(box(0.9, 0.3, 0.55, 0x1a8a3a, 0, 0.35, 0));
    g.add(box(0.92, 0.1, 0.57, 0xf2ead8, 0, 0.35, 0));
    // big gold "$" glyph from chunky boxes, floating above the bundle
    const gold = L(0xffc81a, 2.6);
    const s = new THREE.Group();
    const bar = (w, x, y) => s.add(box(w, 0.14, 0.1, 0, x, y, 0, gold));
    bar(0.62, 0, 0.42); // top bar
    bar(0.62, 0, 0); // middle bar
    bar(0.62, 0, -0.42); // bottom bar
    s.add(box(0.14, 0.34, 0.1, 0, -0.24, 0.21, 0, gold)); // upper-left stem
    s.add(box(0.14, 0.34, 0.1, 0, 0.24, -0.21, 0, gold)); // lower-right stem
    s.add(box(0.12, 1.1, 0.1, 0, 0, 0, 0, gold)); // vertical spine
    s.position.y = 1.15;
    s.scale.setScalar(1.15);
    g.add(s);
    g.userData.marker = s;
  } else {
    // gold ammo box
    g.add(box(0.85, 0.35, 0.55, 0xc89a1a, 0, 0.38, 0));
    g.add(box(0.87, 0.08, 0.57, 0x8a6a10, 0, 0.38, 0));
    // upright brass bullet: cylinder body + pale cone tip + rim
    const brass = L(0xd8a018, 1.8);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 10), brass);
    body.position.y = 0.95;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 10), L(0xf2ead8, 1.2));
    tip.position.y = 1.42;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 10), brass);
    rim.position.y = 0.68;
    g.add(body, tip, rim);
    g.userData.marker = body;
  }
  g.userData = { ...g.userData, kind: 'drop', dropKind: kind, baseY: 1.3, ring };
  return g;
}
