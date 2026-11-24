// characterBuilder.js — SELAT BARA. Realistic proportions (head 1/7 of
// the 1.8u body), built from Box/Capsule geometry, solid Lambert colours.
// Hero Raka: ember-red jacket, cream shirt, SMG. Enemies: orange band +
// rifle. Selat Bara PD: navy + cap. Pedestrians: 3 variants.
import * as THREE from 'three';
import { lam } from './vehicleBuilder.js';

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function limb(w, h, d, mat, x, y, z) {
  return box(w, h, d, mat, x, y, z);
}

// Base humanoid: legs 0.8, torso 0.62, head 0.26 on top => 1.8 total.
// Origin at the feet. Returns group with named parts in userData.
export function buildPerson({ skin = 0xc98d64, shirt = 0xf5ead0, pants = 0x2b3a55, jacket = null, hat = null, gun = null } = {}) {
  const g = new THREE.Group();
  const skinMat = lam(skin);
  const shirtMat = lam(shirt);
  const pantsMat = lam(pants);
  const legL = limb(0.17, 0.8, 0.2, pantsMat, -0.11, 0.4, 0);
  const legR = limb(0.17, 0.8, 0.2, pantsMat, 0.11, 0.4, 0);
  const torso = box(0.5, 0.62, 0.28, shirtMat, 0, 1.11, 0);
  const head = box(0.26, 0.26, 0.26, skinMat, 0, 1.67, 0);
  const armL = limb(0.13, 0.6, 0.15, shirtMat, -0.33, 1.12, 0);
  const armR = limb(0.13, 0.6, 0.15, shirtMat, 0.33, 1.12, 0);
  g.add(legL, legR, torso, head, armL, armR);
  if (jacket) {
    g.add(box(0.54, 0.6, 0.32, lam(jacket), 0, 1.12, 0)); // open jacket shell
    g.add(box(0.2, 0.56, 0.06, lam(0xf5ead0), 0, 1.12, 0.16)); // shirt V
  }
  if (hat) g.add(box(0.32, 0.09, 0.32, lam(hat), 0, 1.84, 0));
  let gunMesh = null;
  if (gun) {
    gunMesh = new THREE.Group();
    gunMesh.add(box(0.09, 0.12, 0.62, lam(0x1a1a1a), 0, 0, -0.2));
    gunMesh.add(box(0.07, 0.18, 0.16, lam(0x1a1a1a), 0, -0.12, 0.05));
    gunMesh.position.set(0.33, 1.35, -0.35); // held forward, right hand
    g.add(gunMesh);
    armR.rotation.x = -1.2; // right arm raised to the gun
  }
  g.userData = { legL, legR, armL, armR, head, torso, gun: gunMesh, kind: 'person' };
  return g;
}

export function buildHero() {
  const h = buildPerson({ shirt: 0xf5ead0, pants: 0x2b3a55, jacket: 0xd43d2a, gun: 'smg' });
  h.userData.kind = 'hero';
  return h;
}
export function buildEnemy() {
  const e = buildPerson({ skin: 0x8a5a3b, shirt: 0x3a3a3a, pants: 0x222222, gun: 'rifle' });
  e.add(box(0.3, 0.08, 0.3, lam(0xe8641b), 0, 1.84, 0)); // orange band
  e.userData.kind = 'enemy';
  return e;
}
export function buildPolice() {
  const p = buildPerson({ skin: 0xb98a5e, shirt: 0x1d3a6e, pants: 0x16294d, hat: 0x16294d, gun: 'pistol' });
  p.add(box(0.52, 0.1, 0.3, lam(0xffd34d), 0, 1.28, 0)); // gold chest band
  p.userData.kind = 'police';
  return p;
}
export function buildPedestrian(variant = 0) {
  const variants = [
    { skin: 0xc98d64, shirt: 0x4da6ff, pants: 0x333333 },
    { skin: 0x8a5a3b, shirt: 0xffd34d, pants: 0x5a3a1a },
    { skin: 0xe8b98a, shirt: 0x7ddc7d, pants: 0x2b3a55 },
  ];
  const v = variants[variant % variants.length];
  const p = buildPerson(v);
  p.userData.kind = 'pedestrian';
  return p;
}

// Fallen body: the person rotated 90° on its back (fix #3/#10).
export function makeFallen(person) {
  person.rotation.x = -Math.PI / 2;
  person.position.y = 0.14;
  person.userData.fallen = true;
  return person;
}

// Drops above fallen enemies (fixes #6/#9/#12): scale 2.0, bobbing +
// glow ring, billboarded to the camera in scenes.js. CASH carries a big
// gold "$" built from boxes only (no textures); AMMO carries a brass
// bullet (cylinder body + pale cone tip + rim). Procedural geometry only.
export function buildDrop(kind = 'cash') {
  const g = new THREE.Group();
  const gold = lam(0xffd34d, 0xffb400, 2.6);
  if (kind === 'cash') {
    // green cash bundle
    const bundle = box(0.85, 0.32, 0.55, lam(0x1e9e4a, 0x0a5c22, 0.6), 0, 0, 0);
    const band = box(0.87, 0.34, 0.14, lam(0xf5f5f5), 0, 0, 0);
    g.add(bundle, band);
    // big "$" glyph above the bundle: chunky bars + spine that sticks
    // out top and bottom so it can never read as a plain box or a "5".
    const s = new THREE.Group();
    s.add(box(0.62, 0.15, 0.1, gold, 0, 0.42, 0)); // top bar
    s.add(box(0.2, 0.15, 0.1, gold, -0.21, 0.28, 0)); // upper-left stem
    s.add(box(0.62, 0.15, 0.1, gold, 0, 0.14, 0)); // middle bar
    s.add(box(0.2, 0.15, 0.1, gold, 0.21, 0.0, 0)); // lower-right stem
    s.add(box(0.62, 0.15, 0.1, gold, 0, -0.14, 0)); // bottom bar
    s.add(box(0.16, 0.98, 0.1, gold, 0, 0.14, 0)); // vertical spine
    s.position.y = 0.55;
    g.add(s);
    g.userData.marker = s;
  } else {
    // gold ammo box + upright brass bullet
    const ammoBox = box(0.7, 0.4, 0.5, lam(0xc9a227, 0x8a6d00, 0.8), 0, 0, 0);
    g.add(ammoBox);
    const bullet = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 10), lam(0xd4af37, 0x8a6d00, 1.2));
    body.position.y = 0.45;
    body.castShadow = true;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 10), lam(0xf5ead0, 0xffffff, 0.6));
    tip.position.y = 0.85;
    tip.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10), lam(0x8a6d00));
    rim.position.y = 0.22;
    bullet.add(body, tip, rim);
    g.add(bullet);
    g.userData.marker = bullet;
  }
  // glow ring under the drop
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.8, 24),
    new THREE.MeshLambertMaterial({ color: 0xffd34d, emissive: 0xffb400, emissiveIntensity: 2.0, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.55;
  g.add(ring);
  g.userData.kind = 'drop';
  g.userData.dropKind = kind;
  g.scale.setScalar(2.0);
  return g;
}

// Flat dark-red blood pool under a fallen body (fix #10).
export function buildBloodPool() {
  const pool = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.03, 1.1),
    lam(0x7a0a0a, 0x4d0000, 0.5),
  );
  pool.position.y = 0.02;
  pool.receiveShadow = true;
  return pool;
}

// Simple walk/idle animation: swing legs + arms.
export function animateWalk(person, t, speed = 1) {
  const u = person.userData;
  if (!u || !u.legL) return;
  const s = Math.sin(t * 8 * speed);
  u.legL.rotation.x = s * 0.5;
  u.legR.rotation.x = -s * 0.5;
  if (!u.gun) {
    u.armL.rotation.x = -s * 0.4;
    u.armR.rotation.x = s * 0.4;
  }
}
