// weapons.js — SELAT BARA. Particle pool (blood 0xCC0000, smoke, glass),
// starburst muzzle flash + PointLight (fix #3), bright yellow tracer
// beam + spark burst (fix #5), frozen-frame helpers for the staged
// action scenes. No textures — boxes only.
import * as THREE from 'three';
import { lam } from './vehicleBuilder.js';

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// Small reusable particle pool: coloured boxes with velocity + life.
export class ParticlePool {
  constructor(scene, count = 120) {
    this.scene = scene;
    this.parts = [];
    const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, lam(0xffffff));
      m.visible = false;
      scene.add(m);
      this.parts.push({ mesh: m, vel: new THREE.Vector3(), life: 0, max: 1 });
    }
    this.i = 0;
  }
  spawn(pos, color, count, speed = 3, up = 2, life = 0.7, size = 1) {
    for (let n = 0; n < count; n++) {
      const p = this.parts[this.i];
      this.i = (this.i + 1) % this.parts.length;
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.scale.setScalar(size * (0.7 + Math.random() * 0.6));
      p.mesh.material = lam(color, color, 0.8);
      p.vel.set((Math.random() - 0.5) * speed, Math.random() * up, (Math.random() - 0.5) * speed);
      p.life = p.max = life * (0.6 + Math.random() * 0.8);
    }
  }
  update(dt) {
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 6 * dt;
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 6;
    }
  }
}

// Starburst muzzle flash: fat hot core + cross bars + a real PointLight.
export class MuzzleFlash {
  constructor(scene) {
    this.group = new THREE.Group();
    const hot = lam(0xfff2a0, 0xffd34d, 3.2);
    const core = box(0.3, 0.3, 0.3, hot);
    const barX = box(0.85, 0.12, 0.12, hot);
    const barY = box(0.12, 0.85, 0.12, hot);
    const barZ = box(0.12, 0.12, 0.85, hot);
    this.group.add(core, barX, barY, barZ);
    this.light = new THREE.PointLight(0xffd34d, 30, 9, 1.5);
    this.group.add(this.light);
    this.group.visible = false;
    scene.add(this.group);
    this.timer = 0;
  }
  fire(pos) {
    this.group.position.copy(pos);
    this.group.visible = true;
    this.timer = 0.12;
  }
  // Frozen staged frame: keep the flash ON at full brightness.
  freeze(pos) {
    this.group.position.copy(pos);
    this.group.visible = true;
    this.timer = 999;
  }
  update(dt) {
    if (this.timer <= 0) return;
    this.timer -= dt;
    if (this.timer <= 0) this.group.visible = false;
  }
}

// Bright yellow tracer beam from gun tip to target (fix #5).
export class Tracer {
  constructor(scene) {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 1),
      lam(0xffe14d, 0xffc400, 3.0),
    );
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.timer = 0;
  }
  fire(from, to) {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    this.mesh.position.copy(mid);
    this.mesh.lookAt(to);
    this.mesh.scale.z = from.distanceTo(to);
    this.mesh.visible = true;
    this.timer = 0.25;
  }
  freeze(from, to) {
    this.fire(from, to);
    this.timer = 999;
  }
  update(dt) {
    if (this.timer <= 0) return;
    this.timer -= dt;
    if (this.timer <= 0) this.mesh.visible = false;
  }
}

// One shot: flash + tracer + sparks at the muzzle + blood/smoke at hit.
export function shoot(ctx, from, target, { blood = true } = {}) {
  const { flash, tracer, particles } = ctx;
  flash.fire(from);
  tracer.fire(from, target);
  particles.spawn(from, 0xffe14d, 8, 4, 3, 0.3, 0.8); // sparks at muzzle
  if (blood) {
    particles.spawn(target, 0xcc0000, 14, 3, 2, 0.8, 1); // blood
    particles.spawn(target, 0xcc0000, 20, 5, 1.5, 1.0, 1.6); // big blood (fix #10)
  } else {
    particles.spawn(target, 0x888888, 10, 2, 3, 1.2, 1.4); // smoke
    particles.spawn(target, 0xcfe8ff, 8, 4, 2, 0.5, 0.8); // shattered glass
  }
  return target;
}

// Grey smoke puff from a damaged hood (wrecked cars).
export function smokePuff(particles, pos) {
  particles.spawn(pos, 0x888888, 6, 1.2, 2.5, 1.4, 1.8);
}
