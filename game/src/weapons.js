// SELAT BARA — weapon system (step 5).
// Re-written in-session under recording 8 (gta6-01, 2026-11-24).
// Shoot (raycast vs targets), muzzle flash = glowing yellow box at the
// gun tip, blood = small red (0xCC0000) box particles, car damage =
// grey smoke puffs from the hood, shattered glass = pale shards. All
// particles are plain boxes, no textures. One shared particle pool
// keeps the scene cheap.
// REBUILD FIX #3: the muzzle flash is now BIG — a fat glowing core plus
// a star cross and a real PointLight, so the frozen shootout frame
// reads as a gunshot, not a speck. Blood counts are up too.
// REBUILD FIX #5: Tracer — a bright yellow beam from the gun tip to the
// target — plus a spark burst at the muzzle, so the bullet path is
// visible in the action2/action3 frozen frames.
import * as THREE from 'three';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const matCache = new Map();
const MAT = (c) => {
  if (!matCache.has(c)) {
    matCache.set(c, new THREE.MeshLambertMaterial({ color: c }));
  }
  return matCache.get(c);
};
const FLASH_MAT = new THREE.MeshLambertMaterial({
  color: 0xffe14a, emissive: 0xffc400, emissiveIntensity: 2.6 });
const FLASH_MAT_HOT = new THREE.MeshLambertMaterial({
  color: 0xfffbe0, emissive: 0xffffff, emissiveIntensity: 3.0 });
const TRACER_MAT = new THREE.MeshLambertMaterial({
  color: 0xffe14a, emissive: 0xffc400, emissiveIntensity: 3.2 });

// --- particle pool: small boxes with velocity + life ----------------------
export class Particles {
  constructor(scene, max = 220) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < max; i++) {
      const m = new THREE.Mesh(unitBox, MAT(0xffffff));
      m.visible = false;
      m.castShadow = false;
      scene.add(m);
      this.pool.push({ mesh: m, vel: new THREE.Vector3(), life: 0, maxLife: 1, grav: 0 });
    }
    this.next = 0;
  }
  spawn(pos, color, count, spread, up, life, size, grav = 9) {
    for (let n = 0; n < count; n++) {
      const p = this.pool[this.next];
      this.next = (this.next + 1) % this.pool.length;
      p.mesh.visible = true;
      p.mesh.material = MAT(color);
      p.mesh.position.copy(pos);
      p.mesh.scale.setScalar(size * (0.7 + Math.random() * 0.6));
      p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      p.vel.set(
        (Math.random() - 0.5) * spread,
        Math.random() * up,
        (Math.random() - 0.5) * spread);
      p.life = life * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.grav = grav;
    }
  }
  blood(pos, count = 14) {
    this.spawn(pos, 0xcc0000, count, 3.2, 2.4, 0.7, 0.14);
  }
  // REBUILD FIX #3: bigger, chunkier blood — visible from across the street.
  bloodBig(pos, count = 26) {
    this.spawn(pos, 0xcc0000, count, 4.2, 3.0, 0.9, 0.22);
    this.spawn(pos, 0x8f0000, Math.floor(count / 2), 2.4, 1.6, 1.1, 0.16);
  }
  smoke(pos, count = 10) {
    this.spawn(pos, 0x8a8a8a, count, 1.2, 2.6, 1.6, 0.3, -1.5); // rises
  }
  tireSmoke(pos, count = 8) {
    this.spawn(pos, 0x9a9a9a, count, 1.6, 1.2, 0.9, 0.34, -1);
  }
  glass(pos, count = 16) {
    this.spawn(pos, 0xcfe8f5, count, 4.5, 2.0, 0.8, 0.1);
  }
  // REBUILD FIX #5: muzzle sparks — bright yellow-white chips bursting
  // forward from the gun tip, frozen mid-burst in the staged frames.
  sparks(pos, dir, count = 22) {
    for (let n = 0; n < count; n++) {
      const p = this.pool[this.next];
      this.next = (this.next + 1) % this.pool.length;
      p.mesh.visible = true;
      p.mesh.material = n % 3 === 0 ? FLASH_MAT_HOT : MAT(0xffc400);
      p.mesh.position.copy(pos);
      p.mesh.scale.setScalar(0.09 * (0.7 + Math.random() * 0.8));
      p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      // mostly forward along the shot, with a sideways spray
      p.vel.copy(dir).multiplyScalar(3 + Math.random() * 7);
      p.vel.x += (Math.random() - 0.5) * 4;
      p.vel.y += (Math.random() - 0.2) * 3.5;
      p.vel.z += (Math.random() - 0.5) * 4;
      p.life = 0.55 * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.grav = 6;
    }
  }
  update(dt) {
    for (const p of this.pool) {
      if (!p.mesh.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vel.y -= p.grav * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.vel.y = 0;
        p.vel.x *= 0.9;
        p.vel.z *= 0.9;
      }
      const s = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.02, p.mesh.scale.x * (0.4 + 0.6 * s)));
    }
  }
}

// --- muzzle flash: big glowing star at the gun tip ------------------------
// REBUILD FIX #3: the old 0.22u box did not read. The flash is now a
// group — a fat hot core (0.55u) + a horizontal bar + a vertical bar
// (the classic starburst) — plus a PointLight that actually lights the
// shooter and the street for the frozen frame.
export class MuzzleFlash {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    const core = new THREE.Mesh(unitBox, FLASH_MAT_HOT);
    core.scale.set(0.5, 0.5, 0.9);
    this.group.add(core);
    const barH = new THREE.Mesh(unitBox, FLASH_MAT);
    barH.scale.set(1.05, 0.16, 0.5);
    this.group.add(barH);
    const barV = new THREE.Mesh(unitBox, FLASH_MAT);
    barV.scale.set(0.16, 1.05, 0.5);
    this.group.add(barV);
    this.mesh = core; // backwards-compatible handle
    this.light = new THREE.PointLight(0xffc400, 0, 12, 1.6);
    this.group.add(this.light);
    scene.add(this.group);
    this.life = 0;
  }
  // show at world pos, pointing along dir
  fire(pos, dir) {
    this.group.visible = true;
    this.group.position.copy(pos).addScaledVector(dir, 0.45);
    this.group.lookAt(pos.clone().addScaledVector(dir, 2));
    const s = 0.9 + Math.random() * 0.25;
    this.group.scale.setScalar(s);
    this.light.intensity = 80;
    this.life = 0.09;
  }
  update(dt) {
    if (this.life > 0) {
      this.life -= dt;
      if (this.life <= 0) {
        this.group.visible = false;
        this.light.intensity = 0;
      }
    }
  }
}

// --- bullet tracer: bright yellow beam from gun tip to target ------------
// REBUILD FIX #5: a stretched emissive box (thin, long) laid exactly
// along the shot line, so the bullet path is visible in the frozen
// action2/action3 frames. One tracer per shot; the staged scenes keep
// it visible by setting life = 999 after firing.
export class Tracer {
  constructor(scene) {
    this.mesh = new THREE.Mesh(unitBox, TRACER_MAT);
    this.mesh.visible = false;
    this.mesh.castShadow = false;
    scene.add(this.mesh);
    this.life = 0;
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
  }
  fire(from, to) {
    this.from.copy(from);
    this.to.copy(to);
    const dir = to.clone().sub(from);
    const len = dir.length();
    this.mesh.visible = true;
    this.mesh.position.copy(from).addScaledVector(dir, 0.5);
    this.mesh.lookAt(to);
    // box Z axis points at the target after lookAt
    this.mesh.scale.set(0.09, 0.09, len);
    this.life = 0.12;
  }
  update(dt) {
    if (this.life > 0) {
      this.life -= dt;
      if (this.life <= 0) this.mesh.visible = false;
    }
  }
}

// --- shooting: raycast from the shooter toward aim ------------------------
const raycaster = new THREE.Raycaster();
const _dir = new THREE.Vector3();
export function shoot(from, target, hittables, range = 60) {
  // from: Vector3 (gun tip), target: Vector3 (aim point)
  _dir.copy(target).sub(from).normalize();
  raycaster.set(from, _dir);
  raycaster.far = range;
  const hits = raycaster.intersectObjects(hittables, true);
  if (!hits.length) return null;
  // walk up to the character / car root the part belongs to
  let o = hits[0].object;
  while (o.parent && !o.userData.kind) o = o.parent;
  return { object: o, point: hits[0].point, distance: hits[0].distance };
}
