// city.js — Selat Bara: dense bright city grid, 5 districts, beach + sea.
// All procedural Box/Cylinder geometry, MeshLambertMaterial, no textures.
import * as THREE from 'three';
import { buildCar } from './vehicleBuilder.js';
import { buildCharacter as buildPerson } from './characterBuilder.js';

// Deterministic RNG so every screenshot run looks identical.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROADS = [
  { p: -63, w: 8 }, { p: -42, w: 8 }, { p: -21, w: 8 },
  { p: 0, w: 12 },
  { p: 21, w: 8 }, { p: 42, w: 8 }, { p: 63, w: 8 },
];
export const CITY_MIN = -88, CITY_MAX = 88;
export const SEA_X = -96; // shoreline: sea west of this, sand strip to -88.

// Single source of truth for districts (HUD, minimap and big map read this).
export const DISTRICTS = [
  { key: 'bara',  name: 'PELABUHAN BARA', street: 'Dermaga Bara',      color: 0x2f7fd0, standing: 'NEUTRAL', standingVal: 58, rect: { x0: -88, x1: -42, z0: -88, z1: 88 },  label: { x: -77, z: -31 } },
  { key: 'tua',   name: 'KOTA TUA',       street: 'Jalan Kota Tua',    color: 0xe07b39, standing: 'NEUTRAL', standingVal: 47, rect: { x0: -42, x1: 4,   z0: -88, z1: 0 },   label: { x: -31, z: -52 } },
  { key: 'pasar', name: 'PASAR LAMA',     street: 'Jalan Pasar Lama',  color: 0x4da65a, standing: 'WARY',    standingVal: 34, rect: { x0: -42, x1: 4,   z0: 0,   z1: 88 },  label: { x: -31, z: 52 } },
  { key: 'kaca',  name: 'DISTRIK KACA',   street: 'Jalan Kaca',        color: 0x7fb3d5, standing: 'NEUTRAL', standingVal: 58, rect: { x0: 4,   x1: 88,  z0: -88, z1: 0 },   label: { x: 52,  z: -52 } },
  { key: 'emas',  name: 'TANJUNG EMAS',   street: 'Jalan Tanjung Emas', color: 0xd9a83c, standing: 'NEUTRAL', standingVal: 58, rect: { x0: 4,   x1: 88,  z0: 0,   z1: 88 },  label: { x: 52,  z: 52 } },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.rect.x0 && x < d.rect.x1 && z >= d.rect.z0 && z < d.rect.z1) return d;
  }
  return DISTRICTS[0];
}

const FACADES = [0xf6f1e7, 0xf0dfba, 0xa8c8e8, 0xe89a5a, 0xe87a6a, 0x7fc8b8, 0xf2c14e, 0xd8e6f2];
const NEON = [0xff5a8a, 0x39d0ff, 0xffc23a, 0x7dff5e];
const WINDOW_TONES = [0x2c3e50, 0x35485e, 0x22303e, 0x3d5a73];

function lam(color, emissive = 0x000000, ei = 1) {
  return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: ei });
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function buildPalm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.2, 7), lam(0x8a6a42));
  trunk.position.y = 2.1; trunk.castShadow = true;
  g.add(trunk);
  const frondMat = lam(0x3f9e4d);
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 4), frondMat);
    const a = (i / 6) * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.9, 4.5, Math.sin(a) * 0.9);
    f.rotation.z = Math.cos(a) * 1.1; f.rotation.x = -Math.sin(a) * 1.1;
    f.castShadow = true;
    g.add(f);
  }
  const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), lam(0x6b4a22));
  nuts.position.y = 4.15; g.add(nuts);
  return g;
}

export function buildCity(scene) {
  const rng = mulberry32(20261124);
  const group = new THREE.Group();
  const traffic = [];
  const walkers = [];

  // --- ground, sea, sand ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 210), lam(0x9c8f76));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 0); ground.receiveShadow = true;
  group.add(ground);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(48, 210), lam(0x2fa8d8));
  sea.rotation.x = -Math.PI / 2; sea.position.set(-120, 0.04, 0); sea.receiveShadow = true;
  group.add(sea);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(8, 210), lam(0xe8d8a8));
  sand.rotation.x = -Math.PI / 2; sand.position.set(-92, 0.05, 0); sand.receiveShadow = true;
  group.add(sand);

  // --- roads: asphalt + double yellow centre lines + sidewalks ---
  const asphaltMat = lam(0x33363d);
  const lineMat = lam(0xd9b400);
  const walkMat = lam(0xb5ac9c);
  for (const r of ROADS) {
    // vertical road (runs along z), x = r.p
    const v = box(r.w, 0.06, 176, asphaltMat, r.p, 0.03, 0);
    v.castShadow = false; group.add(v);
    for (const off of [-0.4, 0.4]) {
      const l = box(0.16, 0.02, 176, lineMat, r.p + off, 0.08, 0);
      l.castShadow = false; group.add(l);
    }
    for (const s of [-1, 1]) {
      const sw = box(2.2, 0.05, 176, walkMat, r.p + s * (r.w / 2 + 1.1), 0.04, 0);
      sw.castShadow = false; group.add(sw);
    }
    // horizontal road (runs along x), z = r.p — starts at the shoreline, never crosses the sea
    const h = box(184, 0.06, r.w, asphaltMat, -4, 0.03, r.p);
    h.castShadow = false; group.add(h);
    for (const off of [-0.4, 0.4]) {
      const l = box(184, 0.02, 0.16, lineMat, -4, 0.08, r.p + off);
      l.castShadow = false; group.add(l);
    }
    for (const s of [-1, 1]) {
      const sw = box(184, 0.05, 2.2, walkMat, -4, 0.04, r.p + s * (r.w / 2 + 1.1));
      sw.castShadow = false; group.add(sw);
    }
  }

  // --- buildings: one or two per block, windows via a single InstancedMesh ---
  // block spans along one axis: between neighbouring road edges
  const spans = [];
  let prev = -88;
  for (const r of ROADS) { spans.push([prev + 0.6, r.p - r.w / 2 - 0.6]); prev = r.p + r.w / 2; }
  spans.push([prev + 0.6, 88 - 0.6]);

  const winXf = []; // {x, y, z, ry, tone}
  const winGeo = new THREE.BoxGeometry(0.95, 1.25, 0.07);
  const winMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const buildings = [];
  for (const [x0, x1] of spans) {
    for (const [z0, z1] of spans) {
      const d = districtAt((x0 + x1) / 2, (z0 + z1) / 2);
      const split = rng() < 0.45 && (x1 - x0) > 9;
      const lots = split ? [[x0, (x0 + x1) / 2 - 0.4, z0, z1], [(x0 + x1) / 2 + 0.4, x1, z0, z1]] : [[x0, x1, z0, z1]];
      for (const [lx0, lx1, lz0, lz1] of lots) {
        const w = lx1 - lx0, dep = lz1 - lz0;
        if (w < 3 || dep < 3) continue;
        const floors = 2 + Math.floor(rng() * 3); // 2-4
        const h = floors * 3.2;
        const facade = FACADES[Math.floor(rng() * FACADES.length)];
        const b = box(w, h, dep, lam(facade), (lx0 + lx1) / 2, h / 2, (lz0 + lz1) / 2);
        group.add(b);
        buildings.push({ x: (lx0 + lx1) / 2, z: (lz0 + lz1) / 2, w, d: dep, h, floors, district: d });
        // roof slab + props
        const roof = box(w + 0.3, 0.25, dep + 0.3, lam(0x6b6258), (lx0 + lx1) / 2, h + 0.12, (lz0 + lz1) / 2);
        group.add(roof);
        if (rng() < 0.55) {
          const ac = box(0.9, 0.5, 0.9, lam(0x9aa2ab), (lx0 + lx1) / 2 - w / 4, h + 0.5, (lz0 + lz1) / 2);
          group.add(ac);
        }
        if (rng() < 0.4) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 8), lam(0x7a8894));
          tank.position.set((lx0 + lx1) / 2 + w / 4, h + 0.8, (lz0 + lz1) / 2);
          tank.castShadow = true; group.add(tank);
        }
        if (rng() < 0.35) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), lam(0x555c66));
          ant.position.set((lx0 + lx1) / 2, h + 1.3, (lz0 + lz1) / 2 - dep / 4);
          group.add(ant);
        }
        // neon sign on some facades
        if (rng() < 0.3) {
          const neon = NEON[Math.floor(rng() * NEON.length)];
          const sign = box(0.18, 2.2, 0.9, lam(neon, neon, 1.6), (lx0 + lx1) / 2 + (rng() < 0.5 ? -1 : 1) * (w / 2 + 0.12), h * 0.62, (lz0 + lz1) / 2);
          group.add(sign);
        }
        // shopfront awning in Pasar Lama
        if (d.key === 'pasar' && rng() < 0.6) {
          const awn = box(w * 0.7, 0.12, 1.4, lam(0xd94f3d), (lx0 + lx1) / 2, 3.1, (lz0 + lz1) / 2 + dep / 2 + 0.6);
          awn.rotation.x = 0.25; group.add(awn);
        }
        // windows: one row per floor, on all four facades
        for (let f = 0; f < floors; f++) {
          const y = 1.9 + f * 3.2;
          const colsX = Math.max(1, Math.floor(w / 1.9));
          const colsZ = Math.max(1, Math.floor(dep / 1.9));
          for (let i = 0; i < colsX; i++) {
            const wx = lx0 + 1.1 + (i + 0.5) * ((w - 2.2) / colsX);
            const tone = rng() < 0.12 ? 0xffd27a : WINDOW_TONES[Math.floor(rng() * WINDOW_TONES.length)];
            winXf.push({ x: wx, y, z: lz1 + 0.05, ry: 0, tone });
            winXf.push({ x: wx, y, z: lz0 - 0.05, ry: Math.PI, tone });
          }
          for (let i = 0; i < colsZ; i++) {
            const wz = lz0 + 1.1 + (i + 0.5) * ((dep - 2.2) / colsZ);
            const tone = rng() < 0.12 ? 0xffd27a : WINDOW_TONES[Math.floor(rng() * WINDOW_TONES.length)];
            winXf.push({ x: lx1 + 0.05, y, z: wz, ry: Math.PI / 2, tone });
            winXf.push({ x: lx0 - 0.05, y, z: wz, ry: -Math.PI / 2, tone });
          }
        }
      }
    }
  }
  const winMesh = new THREE.InstancedMesh(winGeo, winMat, winXf.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const col = new THREE.Color();
  winXf.forEach((w, i) => {
    e.set(0, w.ry, 0); q.setFromEuler(e); v.set(w.x, w.y, w.z);
    m4.compose(v, q, s); winMesh.setMatrixAt(i, m4);
    winMesh.setColorAt(i, col.setHex(w.tone));
  });
  winMesh.instanceMatrix.needsUpdate = true;
  if (winMesh.instanceColor) winMesh.instanceColor.needsUpdate = true;
  group.add(winMesh);

  // --- palms: on sidewalks (never on road centrelines) + beach row ---
  const palmSpots = [];
  for (const r of ROADS) {
    for (let z = -80; z <= 80; z += 21) {
      if (rng() < 0.6) palmSpots.push([r.p + (r.w / 2 + 1.7), z + 5]);
      if (rng() < 0.6) palmSpots.push([r.p - (r.w / 2 + 1.7), z - 5]);
    }
  }
  for (let z = -84; z <= 84; z += 14) palmSpots.push([-91, z]);
  for (const [px, pz] of palmSpots) {
    const palm = buildPalm();
    palm.position.set(px, 0, pz);
    palm.rotation.y = rng() * Math.PI * 2;
    group.add(palm);
  }

  // --- street furniture ---
  const benchMat = lam(0x8a6a42), hydMat = lam(0xc22e2e), binMat = lam(0x3a4048);
  function bench(x, z, ry) {
    const g = new THREE.Group();
    g.add(box(1.8, 0.12, 0.55, benchMat, 0, 0.55, 0));
    g.add(box(1.8, 0.7, 0.1, benchMat, 0, 0.85, -0.24));
    g.add(box(0.12, 0.55, 0.5, benchMat, -0.75, 0.28, 0));
    g.add(box(0.12, 0.55, 0.5, benchMat, 0.75, 0.28, 0));
    g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
  }
  bench(-7.8, -14, Math.PI / 2); bench(7.8, 30, -Math.PI / 2); bench(-28, 7.8, 0); bench(49, -7.8, Math.PI);
  for (const [hx, hz] of [[-7.5, 8], [7.5, -28], [28.5, 7.5], [-28.5, -49]]) {
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.65, 8), hydMat);
    hyd.position.set(hx, 0.33, hz); hyd.castShadow = true; group.add(hyd);
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.8, 8), binMat);
    bin.position.set(hx + 1.2, 0.4, hz + 1.2); bin.castShadow = true; group.add(bin);
  }
  // bus stop (kept clear of the action1 camera lane)
  const bus = new THREE.Group();
  bus.add(box(0.12, 2.4, 0.12, lam(0x3a4048), -1.4, 1.2, 0));
  bus.add(box(0.12, 2.4, 0.12, lam(0x3a4048), 1.4, 1.2, 0));
  bus.add(box(3.2, 0.12, 1.4, lam(0x2f7fd0), 0, 2.5, 0));
  bus.add(box(3.0, 0.9, 0.08, lam(0x9fc8e8), 0, 1.6, -0.6));
  bus.add(box(2.6, 0.1, 0.5, benchMat, 0, 0.55, -0.3));
  bus.position.set(28.5, 0, -49); group.add(bus);
  // traffic light at the main intersection
  const tl = new THREE.Group();
  tl.add(box(0.18, 5.2, 0.18, lam(0x2c313a), 0, 2.6, 0));
  tl.add(box(0.5, 1.4, 0.4, lam(0x22262e), 0, 5.0, 0));
  tl.add(box(0.3, 0.3, 0.1, lam(0xff2a2a, 0xff2a2a, 1.8), 0, 5.4, 0.22));
  tl.add(box(0.3, 0.3, 0.1, lam(0xffc23a, 0xffc23a, 1.8), 0, 5.0, 0.22));
  tl.add(box(0.3, 0.3, 0.1, lam(0x2aff5e, 0x2aff5e, 1.8), 0, 4.6, 0.22));
  tl.position.set(6.8, 0, 6.8); group.add(tl);

  // --- parked cars + moving traffic + pedestrians ---
  const parkedDefs = [
    { x: -8, z: -30, ry: 0, color: 0x3a6fd8 },
    { x: 8.5, z: 12, ry: Math.PI, color: 0xe8e8e8 },
    { x: -29, z: -8.5, ry: Math.PI / 2, color: 0x3aa655 },
    { x: 29.5, z: 8.5, ry: -Math.PI / 2, color: 0xd9a83c },
    { x: 50, z: -29, ry: 0, color: 0x8a5ad8 },
    { x: -50, z: 50, ry: Math.PI, color: 0x5a6068 },
  ];
  for (const p of parkedDefs) {
    const car = buildCar({ kind: 'sedan', color: p.color });
    car.position.set(p.x, 0, p.z); car.rotation.y = p.ry; group.add(car);
  }
  const trafficDefs = [
    { axis: 'z', line: -21, from: -80, to: 80, speed: 9, color: 0xe8e8e8, t: 0.3 },
    { axis: 'x', line: 21, from: -80, to: 80, speed: -7, color: 0xd94f3d, t: 0.6 },
    { axis: 'z', line: 42, from: 80, to: -80, speed: 8, color: 0x3a6fd8, t: 0.1 },
  ];
  for (const def of trafficDefs) {
    const car = buildCar({ kind: 'sedan', color: def.color });
    const p = THREE.MathUtils.lerp(def.from, def.to, def.t);
    car.position.set(def.axis === 'z' ? def.line + 2 : p, 0, def.axis === 'z' ? p : def.line - 2);
    car.rotation.y = def.axis === 'z' ? (def.speed > 0 ? 0 : Math.PI) : (def.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
    group.add(car);
    traffic.push({ mesh: car, ...def, t: def.t });
  }
  const walkerDefs = [
    { x: -7.8, z: -40, axis: 'z', from: -60, to: 20, speed: 1.4 },
    { x: 7.8, z: 10, axis: 'z', from: -20, to: 60, speed: -1.2 },
    { x: -30, z: 7.8, axis: 'x', from: -60, to: 10, speed: 1.1 },
    { x: 40, z: -7.8, axis: 'x', from: 0, to: 70, speed: -1.5 },
    { x: -52, z: 28.5, axis: 'x', from: -70, to: -30, speed: 1.3 },
    { x: 52, z: -28.5, axis: 'x', from: 30, to: 70, speed: -1.2 },
    { x: -7.8, z: 60, axis: 'z', from: 30, to: 80, speed: 1.0 },
    { x: 28.5, z: 7.8, axis: 'x', from: 10, to: 60, speed: -1.4 },
  ];
  const walkerSkins = [0xc68e5e, 0x8a5a3a, 0xe8b98a, 0x6b4226];
  const walkerShirts = [0x3a6fd8, 0xe8e8e8, 0xd9a83c, 0x4da65a, 0xe87a6a, 0x7fb3d5, 0x8a5ad8, 0x3aa655];
  walkerDefs.forEach((def, i) => {
    const w = buildPerson({ skin: walkerSkins[i % 4], shirt: walkerShirts[i], pants: 0x2c313a, shoes: 0x222222, hair: 0x2a2018, role: 'pedestrian' });
    w.position.set(def.x, 0, def.z);
    group.add(w);
    walkers.push({ mesh: w, ...def, phase: rng() * 6 });
  });

  scene.add(group);
  return {
    group, buildings, traffic, walkers,
    update(dt) {
      for (const t of traffic) {
        t.t += (t.speed * dt) / (t.to - t.from);
        if (t.t > 1) t.t = 0; if (t.t < 0) t.t = 1;
        const p = THREE.MathUtils.lerp(t.from, t.to, t.t);
        if (t.axis === 'z') t.mesh.position.z = p; else t.mesh.position.x = p;
      }
      for (const w of walkers) {
        w.phase += dt * 2;
        const span = w.to - w.from;
        let p = w.from + ((w.phase * Math.abs(w.speed) * 0.5) % span);
        if (w.speed < 0) p = w.to - ((w.phase * Math.abs(w.speed) * 0.5) % span);
        if (w.axis === 'z') { w.mesh.position.z = p; w.mesh.rotation.y = w.speed > 0 ? 0 : Math.PI; }
        else { w.mesh.position.x = p; w.mesh.rotation.y = w.speed > 0 ? Math.PI / 2 : -Math.PI / 2; }
        const legSwing = Math.sin(w.phase * 4) * 0.35;
        if (w.mesh.userData.legL) { w.mesh.userData.legL.rotation.x = legSwing; w.mesh.userData.legR.rotation.x = -legSwing; }
      }
    },
  };
}
