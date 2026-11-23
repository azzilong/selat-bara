// SELAT BARA — city builder (step 3).
// Re-written in-session under recording 8 (gta6-01, 2026-11-24).
// Dense ±8x8 block grid, 5 named districts, buildings attached to the
// streets (no empty lots), 2-4 floors, bright facades, beach + bright
// blue sea on the west side, palms, double-yellow main roads.
// WINDOWS (user order 2026-11-24): EVERY building gets procedural
// windows — flat glass panes on every facade, one row per floor — via
// one InstancedMesh, plus rooftop props and street furniture so the
// city reads alive. All MeshLambertMaterial, no textures.
import * as THREE from 'three';
import { buildSedan, buildVan, animateWheels } from './vehicleBuilder.js';
import { buildPedestrian, animateWalk } from './characterBuilder.js';

// --- deterministic random so the city is identical every load ---
let seed = 20261124;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

// --- layout constants ---
export const PITCH = 28;          // block pitch (block + road)
export const BLOCK = 20;          // block size
export const SIDE_ROAD = 8;       // side streets: 2 cars abreast
export const MAIN_ROAD = 12;      // main avenues: 3 cars abreast
// road centre lines (9 lines each way, city spans -112 .. +112)
export const LINES = [-112, -84, -56, -28, 0, 28, 56, 84, 112];
const roadWidth = (v) => (v === 0 ? MAIN_ROAD : SIDE_ROAD);

// 5 named districts (original names, own city)
export const DISTRICTS = [
  { name: 'Pelabuhan Bara', x0: -112, z0: -112, x1: -56, z1: 112, color: 0x2fa8d8 },
  { name: 'Kota Tua', x0: -56, z0: -112, x1: 0, z1: 0, color: 0xf2c14e },
  { name: 'Pasar Lama', x0: -56, z0: 0, x1: 0, z1: 112, color: 0xe07b22 },
  { name: 'Distrik Kaca', x0: 0, z0: -112, x1: 112, z1: 0, color: 0x7fb069 },
  { name: 'Tanjung Emas', x0: 0, z0: 0, x1: 112, z1: 112, color: 0xe07b9a },
];
export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return DISTRICTS[0];
}

const FACADES = [0xffffff, 0xf5e6c8, 0xaed6f1, 0xff9a3c, 0xf6a8c0, 0x8fd8c8, 0xffe08a];
const PANE_TONES = [0x2e4a5e, 0x3a5a70, 0x22384a, 0x4a6a80, 0xffe9a8, 0xffd24a];

const matCache = new Map();
const MAT = (c) => {
  if (!matCache.has(c)) matCache.set(c, new THREE.MeshLambertMaterial({ color: c }));
  return matCache.get(c);
};
const EMIT = (c, e) => {
  const k = c + ':' + e;
  if (!matCache.has(k)) {
    matCache.set(k, new THREE.MeshLambertMaterial({ color: c, emissive: e, emissiveIntensity: 0.9 }));
  }
  return matCache.get(k);
};
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10);

function box(group, w, h, d, c, x, y, z, mat = null) {
  const m = new THREE.Mesh(unitBox, mat || MAT(c));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}
function cyl(group, rt, rb, h, c, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), MAT(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// --- palm tree: trunk + 6 fronds, no textures ---
function palm(group, x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const trunk = cyl(g, 0.14 * s, 0.22 * s, 5.2 * s, 0x8a6a42, 0, 2.6 * s, 0, 8);
  trunk.rotation.z = 0.06;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const frond = box(g, 0.5 * s, 0.08 * s, 2.6 * s, 0x3f9e4d,
      Math.cos(a) * 1.1 * s, 5.1 * s, Math.sin(a) * 1.1 * s);
    frond.rotation.y = -a;
    frond.rotation.x = 0.5;
    frond.castShadow = false;
  }
  box(g, 0.5 * s, 0.4 * s, 0.5 * s, 0x6b4a2a, 0, 5.0 * s, 0); // coconuts
  group.add(g);
  return g;
}

// --- street furniture: bench / hydrant / bin / bus stop ---
function furniture(group, x, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  box(g, 1.8, 0.1, 0.5, 0x8a5a2e, 0, 0.45, 0); // bench seat
  box(g, 1.8, 0.5, 0.08, 0x8a5a2e, 0, 0.75, 0.22); // back
  box(g, 0.1, 0.45, 0.45, 0x333333, -0.8, 0.22, 0);
  box(g, 0.1, 0.45, 0.45, 0x333333, 0.8, 0.22, 0);
  group.add(g);
}
function hydrant(group, x, z) {
  cyl(group, 0.16, 0.2, 0.7, 0xd8402e, x, 0.35, z, 8);
  cyl(group, 0.1, 0.1, 0.14, 0xd8402e, x, 0.75, z, 8);
}
function bin(group, x, z) {
  cyl(group, 0.28, 0.24, 0.8, 0x2e4a3a, x, 0.4, z, 8);
}

// Build the whole city into the scene. Returns live handles for the loop.
export function buildCity(scene) {
  const city = new THREE.Group();
  scene.add(city);
  const traffic = [];   // moving cars { mesh, axis, from, to, speed, dir }
  const walkers = [];   // pedestrians { mesh, axis, from, to, speed, t }
  const parked = [];

  // --- ground base (grass-green under everything) ---
  const base = new THREE.Mesh(new THREE.PlaneGeometry(460, 460), MAT(0x7fae62));
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.05;
  base.receiveShadow = true;
  city.add(base);

  // --- beach + bright blue sea on the WEST side (x < -112) ---
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(34, 240), MAT(0xeed9a4));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-129, 0.02, 0);
  sand.receiveShadow = true;
  city.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 460), MAT(0x2fa8d8));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-206, 0.0, 0);
  sea.receiveShadow = true;
  city.add(sea);
  const seaLight = new THREE.Mesh(new THREE.PlaneGeometry(18, 460), MAT(0x6fd3f0));
  seaLight.rotation.x = -Math.PI / 2;
  seaLight.position.set(-152, 0.03, 0);
  seaLight.receiveShadow = true;
  city.add(seaLight);
  // beach palms
  for (let z = -100; z <= 100; z += 22) palm(city, -122 + (rnd() * 6 - 3), z, 1.1);

  // --- roads: asphalt strips + sidewalks ---
  // horizontal=true: road runs along Z at x=v. horizontal=false: road
  // runs along X at z=v. (Positions must match the rotation, or every
  // road stacks onto the two centre avenues.)
  for (const v of LINES) {
    const w = roadWidth(v);
    for (const horizontal of [true, false]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(228, w), MAT(0x3c4148));
      road.rotation.x = -Math.PI / 2;
      if (horizontal) road.rotation.z = Math.PI / 2;
      road.position.set(horizontal ? v : 0, 0.06, horizontal ? 0 : v);
      road.receiveShadow = true;
      city.add(road);
      // sidewalks (light grey, slightly raised)
      for (const s of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.PlaneGeometry(228, 2.2), MAT(0xb8b0a0));
        sw.rotation.x = -Math.PI / 2;
        if (horizontal) sw.rotation.z = Math.PI / 2;
        sw.position.set(
          horizontal ? v + s * (w / 2 + 1.1) : 0, 0.12,
          horizontal ? 0 : v + s * (w / 2 + 1.1));
        sw.receiveShadow = true;
        city.add(sw);
      }
      // centre lines: double yellow on main roads, dashed white on side
      if (w === MAIN_ROAD) {
        for (const off of [-0.35, 0.35]) {
          const line = new THREE.Mesh(new THREE.PlaneGeometry(228, 0.28), MAT(0xffd24a));
          line.rotation.x = -Math.PI / 2;
          if (horizontal) line.rotation.z = Math.PI / 2;
          line.position.set(
            horizontal ? v + off : 0, 0.1,
            horizontal ? 0 : v + off);
          city.add(line);
        }
      } else {
        for (let d = -105; d <= 105; d += 12) {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.24), MAT(0xe8e8e8));
          dash.rotation.x = -Math.PI / 2;
          if (horizontal) dash.rotation.z = Math.PI / 2;
          dash.position.set(horizontal ? v : d, 0.1, horizontal ? d : v);
          city.add(dash);
        }
      }
    }
  }

  // --- buildings: one per lot, windows via InstancedMesh ---
  // Block bounds come from the neighbouring road lines, so a building
  // can never overlap a road (main avenues are 12 wide, side 8).
  const windowXforms = []; // { px, py, pz, ry, tone }
  const pushWindow = (px, py, pz, ry, tone) => {
    windowXforms.push({ px, py, pz, ry, tone });
  };
  let buildingCount = 0;
  for (let bi = 0; bi < 8; bi++) {
    for (let bj = 0; bj < 8; bj++) {
      const bx0 = LINES[bi] + roadWidth(LINES[bi]) / 2 + 0.6;
      const bx1 = LINES[bi + 1] - roadWidth(LINES[bi + 1]) / 2 - 0.6;
      const bz0 = LINES[bj] + roadWidth(LINES[bj]) / 2 + 0.6;
      const bz1 = LINES[bj + 1] - roadWidth(LINES[bj + 1]) / 2 - 0.6;
      const cx = (bx0 + bx1) / 2;
      const cz = (bz0 + bz1) / 2;
      const blockW = bx1 - bx0;
      const blockD = bz1 - bz0;
      const district = districtAt(cx, cz);
      const tall = district.name === 'Distrik Kaca';
      // 2 lots per block (split along x), each gets a building
      for (let lot = 0; lot < 2; lot++) {
        const lx = cx - blockW / 4 + lot * (blockW / 2);
        const floors = tall ? 4 : 2 + Math.floor(rnd() * 3); // 2-4
        const h = floors * 3;
        const w = Math.min(8 + rnd() * 2, blockW / 2 - 1.2);
        const d = Math.min(9 + rnd() * 2, blockD - 1.2);
        const facade = pick(FACADES);
        const b = box(city, w, h, d, facade, lx, h / 2, cz);
        b.userData.district = district.name;
        buildingCount++;
        // windows: every facade, one row per floor
        const paneW = 1.3, paneH = 1.5;
        for (let f = 0; f < floors; f++) {
          const wy = 1.6 + f * 3;
          const nX = Math.max(2, Math.floor(w / 2.6));
          for (let k = 0; k < nX; k++) {
            const wx = lx - w / 2 + 1.4 + k * ((w - 2.8) / Math.max(1, nX - 1));
            pushWindow(wx, wy, cz - d / 2 - 0.06, 0, pick(PANE_TONES));
            pushWindow(wx, wy, cz + d / 2 + 0.06, Math.PI, pick(PANE_TONES));
          }
          const nZ = Math.max(2, Math.floor(d / 2.6));
          for (let k = 0; k < nZ; k++) {
            const wz = cz - d / 2 + 1.4 + k * ((d - 2.8) / Math.max(1, nZ - 1));
            pushWindow(lx - w / 2 - 0.06, wy, wz, -Math.PI / 2, pick(PANE_TONES));
            pushWindow(lx + w / 2 + 0.06, wy, wz, Math.PI / 2, pick(PANE_TONES));
          }
        }
        // ground-floor shopfront on the street side (random colour awning)
        if (rnd() < 0.45) {
          const awn = pick([0xe63b12, 0x2e86c1, 0x7fb069, 0xf2c14e]);
          box(city, w * 0.7, 0.25, 1.2, awn, lx, 2.9, cz - d / 2 - 0.5);
          box(city, w * 0.55, 1.1, 0.1, 0x2e4a5e, lx, 1.5, cz - d / 2 - 0.05,
            new THREE.MeshLambertMaterial({ color: 0x2e4a5e }));
        }
        // neon district sign on some main-avenue buildings
        if ((Math.abs(cx) < 30 || Math.abs(cz) < 30) && rnd() < 0.35) {
          const neon = pick([0xff4fa3, 0x2ee6c8, 0xffd24a]);
          const sign = box(city, 2.6, 0.7, 0.15, neon, lx, h - 0.6, cz - d / 2 - 0.12,
            EMIT(neon, neon));
          sign.castShadow = false;
        }
        // rooftop props: AC box / water tank / antenna
        const r = rnd();
        if (r < 0.4) {
          box(city, 1.4, 0.9, 1.4, 0x9aa0a6, lx - 2, h + 0.45, cz);
        } else if (r < 0.7) {
          cyl(city, 0.9, 0.9, 1.8, 0x7a5a3a, lx + 2, h + 0.9, cz, 10);
          cyl(city, 0.95, 0.95, 0.2, 0x5a4230, lx + 2, h + 1.9, cz, 10);
        } else {
          cyl(city, 0.06, 0.06, 3.2, 0x666666, lx, h + 1.6, cz, 6);
          box(city, 1.6, 0.08, 0.08, 0x666666, lx, h + 3.0, cz);
        }
      }
    }
  }
  // one InstancedMesh for ALL window panes
  const paneGeo = new THREE.BoxGeometry(1.3, 1.5, 0.08);
  const paneMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const panes = new THREE.InstancedMesh(paneGeo, paneMat, windowXforms.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const col = new THREE.Color();
  windowXforms.forEach((w, i) => {
    eul.set(0, w.ry, 0);
    q.setFromEuler(eul);
    m4.compose(new THREE.Vector3(w.px, w.py, w.pz), q, new THREE.Vector3(1, 1, 1));
    panes.setMatrixAt(i, m4);
    panes.setColorAt(i, col.setHex(w.tone));
  });
  panes.castShadow = false;
  panes.receiveShadow = false;
  city.add(panes);

  // --- palms along the main avenues + street furniture ---
  for (let d = -98; d <= 98; d += 28) {
    palm(city, -7.2, d + 4, 1);
    palm(city, 7.2, d - 4, 0.9);
    if (d % 56 === 0) {
      furniture(city, -7.6, d + 12, Math.PI / 2);
      furniture(city, 7.6, d - 12, -Math.PI / 2);
      hydrant(city, -7.6, d - 12);
      bin(city, 7.6, d + 12);
    }
  }
  // bus stop on the main east-west avenue
  const bus = new THREE.Group();
  bus.position.set(14, 0, -7.6);
  box(bus, 4.5, 0.25, 1.6, 0x2e86c1, 0, 2.6, 0);
  box(bus, 0.15, 2.6, 0.15, 0x333333, -2.1, 1.3, -0.7);
  box(bus, 0.15, 2.6, 0.15, 0x333333, 2.1, 1.3, -0.7);
  box(bus, 0.15, 2.6, 0.15, 0x333333, -2.1, 1.3, 0.7);
  box(bus, 0.15, 2.6, 0.15, 0x333333, 2.1, 1.3, 0.7);
  box(bus, 3.6, 0.12, 0.5, 0x8a5a2e, 0, 0.5, 0);
  city.add(bus);

  // --- traffic lights at the 4 central intersections ---
  for (const [x, z] of [[0, 0], [0, 28], [28, 0], [-28, 0]]) {
    cyl(city, 0.12, 0.12, 4.2, 0x222222, x + 6.4, 2.1, z + 6.4, 8);
    box(city, 0.5, 1.1, 0.4, 0x1c1f24, x + 6.4, 4.4, z + 6.4);
    const dot = box(city, 0.3, 0.3, 0.1, 0x33ff55, x + 6.4, 4.6, z + 6.15,
      EMIT(0x33ff55, 0x22cc44));
    dot.castShadow = false;
  }

  // --- parked cars along side streets ---
  const parkedSpots = [
    [-20, -56, 0], [20, 56, Math.PI], [-48, 28, 0], [48, -28, Math.PI],
    [-76, 84, Math.PI / 2], [76, -84, -Math.PI / 2],
  ];
  for (const [x, z, ry] of parkedSpots) {
    const c = Math.random() < 0.5 ? buildSedan(pick([0x2e86c1, 0xf2c14e, 0x7fb069, 0xe07b9a])) : buildVan();
    c.position.set(x, 0, z);
    c.rotation.y = ry;
    city.add(c);
    parked.push(c);
  }

  // --- moving traffic: 3 cars looping the main avenues ---
  const routes = [
    { axis: 'z', fixed: 3.1, from: -108, to: 108, speed: 7 },
    { axis: 'z', fixed: -3.1, from: 108, to: -108, speed: 6 },
    { axis: 'x', fixed: 3.1, from: -108, to: 108, speed: 8 },
  ];
  for (const r of routes) {
    const c = buildSedan(pick([0x9b59b6, 0x1abc9c, 0xe67e22, 0x34495e]));
    c.position.set(r.axis === 'z' ? r.fixed : r.from, 0, r.axis === 'z' ? r.from : r.fixed);
    c.rotation.y = r.axis === 'z' ? (r.from < r.to ? Math.PI : 0) : (r.from < r.to ? -Math.PI / 2 : Math.PI / 2);
    city.add(c);
    traffic.push({ mesh: c, ...r, dir: 1 });
  }

  // --- pedestrians strolling the sidewalks (offset from a road line) ---
  for (let i = 0; i < 8; i++) {
    const p = buildPedestrian(i % 3);
    const axis = i % 2 === 0 ? 'z' : 'x';
    const road = [-28, 0, 28][i % 3];
    const side = i % 2 === 0 ? -7.6 : 7.6;
    const fixed = road + side;
    const from = -100 + i * 6;
    const to = 100 - i * 4;
    p.position.set(axis === 'z' ? fixed : from, 0, axis === 'z' ? from : fixed);
    p.rotation.y = axis === 'z' ? 0 : Math.PI / 2;
    city.add(p);
    walkers.push({ mesh: p, axis, fixed, from, to, speed: 1 + rnd() * 0.7, t: rnd() * 6 });
  }

  return {
    group: city,
    buildingCount,
    windowCount: windowXforms.length,
    traffic,
    walkers,
    parked,
    update(dt, time) {
      for (const t of traffic) {
        const m = t.mesh;
        if (t.axis === 'z') {
          m.position.z += t.dir * t.speed * dt;
          if (m.position.z > t.to) { m.position.z = t.to; t.dir = -1; m.rotation.y = 0; }
          if (m.position.z < t.from) { m.position.z = t.from; t.dir = 1; m.rotation.y = Math.PI; }
        } else {
          m.position.x += t.dir * t.speed * dt;
          if (m.position.x > t.to) { m.position.x = t.to; t.dir = -1; m.rotation.y = Math.PI / 2; }
          if (m.position.x < t.from) { m.position.x = t.from; t.dir = 1; m.rotation.y = -Math.PI / 2; }
        }
        animateWheels(m, t.speed, dt);
      }
      for (const w of walkers) {
        w.t += dt;
        const m = w.mesh;
        const span = w.to - w.from;
        const phase = (Math.sin(w.t * 0.25 * w.speed) + 1) / 2; // stroll back & forth
        const pos = w.from + phase * span;
        if (w.axis === 'z') {
          m.position.z = pos;
          m.rotation.y = Math.cos(w.t * 0.25 * w.speed) >= 0 ? 0 : Math.PI;
        } else {
          m.position.x = pos;
          m.rotation.y = Math.cos(w.t * 0.25 * w.speed) >= 0 ? Math.PI / 2 : -Math.PI / 2;
        }
        animateWalk(m, w.t);
      }
    },
  };
}
