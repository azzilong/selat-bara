// Selat Bara — weapons: particle pool (blood / smoke / glass / sparks),
// muzzle flash starburst, bright yellow bullet tracer, simple raycast shots.
import * as THREE from 'three';

// Pooled small-box particles, one InstancedMesh, gravity + fade by scale.
export class Particles {
  constructor(scene, max = 400) {
    this.max = max;
    this.items = [];
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      max,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    scene.add(this.mesh);
    for (let i = 0; i < max; i++) this.dummy.position.set(0, -50, 0), this.dummy.updateMatrix(), this.mesh.setMatrixAt(i, this.dummy.matrix);
  }
  burst(pos, color, n, speed = 4, up = 3, size = 1) {
    for (let k = 0; k < n; k++) {
      const i = this.items.findIndex((it) => it.life <= 0);
      const slot = i >= 0 ? i : this.items.length < this.max ? this.items.length : Math.floor(Math.random() * this.max);
      if (this.items.length <= slot) this.items.push({});
      this.items[slot] = {
        life: 0.7 + Math.random() * 0.5,
        maxLife: 1,
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * up, (Math.random() - 0.5) * speed),
        color, size,
      };
      this.items[slot].maxLife = this.items[slot].life;
    }
  }
  blood(pos, big = false) {
    this.burst(pos, 0xcc0000, big ? 34 : 14, big ? 5 : 3.5, big ? 4 : 2.5, big ? 1.8 : 1);
  }
  smoke(pos, n = 10) {
    this.burst(pos, 0x777777, n, 1.2, 2.2, 4);
  }
  glass(pos) {
    this.burst(pos, 0x9fc4d8, 16, 5, 3, 0.8);
  }
  sparks(pos) {
    this.burst(pos, 0xffc81a, 18, 7, 4, 0.9);
  }
  update(dt) {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (!it || it.life <= 0) continue;
      it.life -= dt;
      it.vel.y -= 9 * dt;
      it.pos.addScaledVector(it.vel, dt);
      if (it.pos.y < 0.08) { it.pos.y = 0.08; it.vel.set(0, 0, 0); }
      const s = it.size * Math.max(0.15, it.life / it.maxLife);
      this.dummy.position.copy(it.pos);
      this.dummy.scale.setScalar(s);
      this.dummy.rotation.set(it.life * 5, it.life * 7, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.color.setHex(it.color);
      this.mesh.setColorAt(i, this.color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// Big starburst muzzle flash: hot core + cross bars + a point light.
export class MuzzleFlash {
  constructor(scene) {
    this.group = new THREE.Group();
    const hot = new THREE.MeshLambertMaterial({ color: 0xffe95a, emissive: 0xffd21a, emissiveIntensity: 4 });
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), hot);
    const barH = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.13, 0.13), hot);
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.85, 0.13), hot);
    const barD = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.75), hot);
    this.light = new THREE.PointLight(0xffd21a, 30, 12, 1.5);
    this.group.add(core, barH, barV, barD, this.light);
    this.group.visible = false;
    scene.add(this.group);
    this.ttl = 0;
  }
  show(pos, dir) {
    this.group.position.copy(pos);
    this.group.lookAt(pos.clone().add(dir));
    this.group.visible = true;
    this.ttl = 0.12;
    this.group.scale.setScalar(1 + Math.random() * 0.3);
  }
  update(dt) {
    if (this.ttl > 0) {
      this.ttl -= dt;
      if (this.ttl <= 0) this.group.visible = false;
    }
  }
}

// Bright yellow tracer beam from the muzzle to the hit point.
export class Tracer {
  constructor(scene) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffe95a, emissive: 0xffd21a, emissiveIntensity: 3.5 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1), mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.ttl = 0;
  }
  fire(from, to) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    this.mesh.position.copy(from).addScaledVector(dir, 0.5);
    this.mesh.lookAt(to);
    this.mesh.scale.set(1, 1, len);
    this.mesh.visible = true;
    this.ttl = 0.14;
  }
  update(dt) {
    if (this.ttl > 0) {
      this.ttl -= dt;
      if (this.ttl <= 0) this.mesh.visible = false;
    }
  }
}

// Raycast shot against a list of target objects (enemies / cars).
export function shoot(origin, dir, targets, range = 60) {
  const ray = new THREE.Raycaster(origin, dir.clone().normalize(), 0.1, range);
  const hits = ray.intersectObjects(targets, true);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj && !obj.userData.kind) obj = obj.parent;
  return { point: hits[0].point, target: obj, distance: hits[0].distance };
}
