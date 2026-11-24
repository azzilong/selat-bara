// weapons.js — Selat Bara weapon effects: muzzle flash, tracer beam, sparks,
// blood particles + pools, smoke, glass. Box geometry only, no textures.
import * as THREE from 'three';

const BLOOD = 0xcc0000;
const BLOOD_DARK = 0x7a0d0d;
const SMOKE = 0x8a8f96;
const SPARK = 0xffd23a;

function lam(color, emissive = 0x000000, ei = 1) {
  return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: ei });
}

// --- generic particle pool (small boxes, recycled) ---
export class ParticlePool {
  constructor(scene, max = 240) {
    this.scene = scene;
    this.items = [];
    const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    for (let i = 0; i < max; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }));
      m.visible = false;
      scene.add(m);
      this.items.push({ mesh: m, vel: new THREE.Vector3(), life: 0, maxLife: 1, grav: 0, fade: true });
    }
    this.cursor = 0;
  }
  burst(pos, color, n, speed = 4, up = 2.5, life = 0.7, grav = -6, size = 1) {
    for (let k = 0; k < n; k++) {
      const p = this.items[this.cursor];
      this.cursor = (this.cursor + 1) % this.items.length;
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.material.color.setHex(color);
      p.mesh.scale.setScalar(size * (0.7 + Math.random() * 0.6));
      p.vel.set((Math.random() - 0.5) * speed, Math.random() * up + 0.5, (Math.random() - 0.5) * speed);
      p.life = life * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.grav = grav;
      p.mesh.material.opacity = 1;
      p.mesh.material.transparent = true;
    }
  }
  blood(pos, n = 26) { this.burst(pos, BLOOD, n, 5, 3, 0.8, -9, 1.4); }
  bloodBig(pos) { this.burst(pos, BLOOD, 34, 6, 3.5, 1.0, -9, 2.0); }
  sparks(pos, n = 18) { this.burst(pos, SPARK, n, 7, 4, 0.35, -4, 0.8); }
  smoke(pos, n = 10) { this.burst(pos, SMOKE, n, 1.2, 1.6, 1.6, 1.5, 2.2); }
  glass(pos, n = 16) { this.burst(pos, 0xd8e6f2, n, 6, 3, 0.6, -9, 0.7); }
  update(dt) {
    for (const p of this.items) {
      if (!p.mesh.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vel.y += p.grav * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.05) { p.mesh.position.y = 0.05; p.vel.set(0, 0, 0); }
      if (p.fade) p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
    }
  }
}

// Flat dark-red pool under a fallen body.
export function bloodPool(scene, x, z, w = 1.9, d = 1.1) {
  const pool = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), lam(BLOOD_DARK));
  pool.position.set(x, 0.06, z);
  pool.receiveShadow = true;
  scene.add(pool);
  return pool;
}

// --- muzzle flash: fat hot core + cross bars + point light ---
export class MuzzleFlash {
  constructor(scene) {
    this.group = new THREE.Group();
    const hot = lam(0xffe14d, 0xffc800, 3.2);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.55), hot);
    const barH = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.3), hot);
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.3), hot);
    this.group.add(core, barH, barV);
    this.light = new THREE.PointLight(0xffcc33, 30, 14, 1.5);
    this.light.position.set(0, 0, 0.3);
    this.group.add(this.light);
    this.group.visible = false;
    scene.add(this.group);
  }
  show(pos, dir) {
    this.group.position.copy(pos);
    this.group.lookAt(pos.clone().add(dir));
    this.group.visible = true;
  }
  hide() { this.group.visible = false; }
}

// --- bullet tracer: bright yellow beam from gun tip to target + sparks ---
export class Tracer {
  constructor(scene) {
    const geo = new THREE.BoxGeometry(0.09, 0.09, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffe14d, emissive: 0xffc800, emissiveIntensity: 2.8 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.glow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1), new THREE.MeshLambertMaterial({ color: 0xfff2a0, emissive: 0xffd23a, emissiveIntensity: 1.6, transparent: true, opacity: 0.55 }));
    this.glow.visible = false;
    scene.add(this.glow);
  }
  fire(from, to) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    const mid = from.clone().add(to).multiplyScalar(0.5);
    for (const m of [this.mesh, this.glow]) {
      m.position.copy(mid);
      m.lookAt(to);
      m.scale.set(1, 1, len);
      m.visible = true;
    }
  }
  hide() { this.mesh.visible = false; this.glow.visible = false; }
}

// --- shooting: raycast from the camera, hit = blood + sparks + flash ---
export function shoot(scene, camera, pool, flash, tracer, enemies, onHit) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  ray.far = 90;
  const hits = ray.intersectObjects(enemies, true);
  const origin = camera.position.clone();
  let end = origin.clone().add(ray.ray.direction.clone().multiplyScalar(60));
  let hitEnemy = null;
  if (hits.length) {
    end = hits[0].point.clone();
    hitEnemy = hits[0].object;
    pool.bloodBig(end);
  }
  const muzzle = origin.clone().add(ray.ray.direction.clone().multiplyScalar(1.2));
  muzzle.y -= 0.25;
  flash.show(muzzle, ray.ray.direction);
  tracer.fire(muzzle, end);
  pool.sparks(muzzle, 14);
  setTimeout(() => { flash.hide(); tracer.hide(); }, 130);
  if (hitEnemy && onHit) onHit(hitEnemy, end);
  return hitEnemy;
}
