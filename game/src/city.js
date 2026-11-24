// Selat Bara — the city: dense ±8x8 grid, 5 named districts, beach + sea,
// wide roads with double yellow lines, windowed buildings, palms, furniture.
// Roads run along X and Z at fixed lines; buildings fill every block.
import * as THREE from 'three';
import { buildSedan, buildSportsCar, buildVan } from './vehicleBuilder.js';
import { buildPedestrian } from './characterBuilder.js';

export const LINES = [-84, -63, -42, -21, 0, 21, 42, 63, 84];
const MAIN = new Set([-84, -42, 0, 42, 84]);
export const roadWidth = (v) => (MAIN.has(v) ? 12 : 8);

const FACADES = [0xf2efe9, 0xf5d9a0, 0xa9c6de, 0xe8913a, 0x8fb8a8, 0xd8d8d8, 0xc9a86a, 0x9fb8c8];
const PANE = [0x2e3d4e, 0x3a4a5e, 0x24303e, 0x4a5a6e, 0xffd98a];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M = (c) => new THREE.MeshLambertMaterial({ color: c });
const L = (c, e = 1) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: e });

function bx(parent, w, h, d, c, x, y, z, mat = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || M(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// District table — the single source of truth for names, streets, colours,
// map rects [x0, z0, x1, z1] (same schematic as the minimap) and standing.
// Standing values come from the staged HUD scenes (M1 Pelabuhan Bara 58,
// M3 Kota Tua 47, M2 Pasar Lama 34); Distrik Kaca / Tanjung Emas have no
// staged override, so they carry the game's free-roam default (NEUTRAL 58).
export const DISTRICTS = [
  { name: 'PELABUHAN BARA', street: 'Dermaga Bara', color: 0x4a90c8, css: '#4a90c8', standing: 'NEUTRAL', standingVal: 58, rect: [-96, -96, -42, 96], label: [-69, -31] },
  { name: 'KOTA TUA', street: 'Jalan Kota Tua', color: 0xc86a3a, css: '#c86a3a', standing: 'NEUTRAL', standingVal: 47, rect: [-42, -96, 42, -21], label: [0, -52] },
  { name: 'PASAR LAMA', street: 'Jalan Pasar Lama', color: 0x7ab86a, css: '#7ab86a', standing: 'WARY', standingVal: 34, rect: [-42, -21, 42, 96], label: [0, 31] },
  { name: 'DISTRIK KACA', street: 'Jalan Kaca', color: 0x8fb8d8, css: '#8fb8d8', standing: 'NEUTRAL', standingVal: 58, rect: [42, -96, 96, 0], label: [69, -52] },
  { name: 'TANJUNG EMAS', street: 'Jalan Emas', color: 0xd8a018, css: '#d8a018', standing: 'NEUTRAL', standingVal: 58, rect: [42, 0, 96, 96], label: [69, 52] },
];

// District lookup by world position.
export function districtAt(x, z) {
  if (x < -42) return DISTRICTS[0];
  if (x >= 42 && z < 0) return DISTRICTS[3];
  if (x >= 42 && z >= 0) return DISTRICTS[4];
  if (z < -21) return DISTRICTS[1];
  return DISTRICTS[2];
}

export function buildCity(scene) {
  const rng = mulberry32(1337);
  const g = new THREE.Group();
  scene.add(g);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  // --- ground, beach, sea ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), M(0x9c9c90));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-40, 0, 0);
  ground.receiveShadow = true;
  g.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(18, 220), M(0xe8d8a0));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-105, 0.01, 0);
  sand.receiveShadow = true;
  g.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(160, 240), M(0x1e9bd8));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-195, -0.05, 0);
  g.add(sea);

  // --- roads (asphalt), sidewalks, double yellow lines, dashes ---
  const asphalt = M(0x2e3138);
  const walkMat = M(0xbdbdb4);
  const yellow = M(0xe8c81a);
  const dashMat = M(0xe8e8e8);
  for (const v of LINES) {
    const w = roadWidth(v);
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(w, 192), asphalt);
    rx.rotation.x = -Math.PI / 2; rx.position.set(v, 0.01, 0); rx.receiveShadow = true;
    g.add(rx);
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(192, w), asphalt);
    rz.rotation.x = -Math.PI / 2; rz.position.set(0, 0.02, v); rz.receiveShadow = true;
    g.add(rz);
    // sidewalks: 2u strips on both edges
    for (const s of [-1, 1]) {
      const sx = new THREE.Mesh(new THREE.PlaneGeometry(2, 192), walkMat);
      sx.rotation.x = -Math.PI / 2;
      sx.position.set(v + s * (w / 2 + 1), 0.03, 0); sx.receiveShadow = true;
      g.add(sx);
      const sz = new THREE.Mesh(new THREE.PlaneGeometry(192, 2), walkMat);
      sz.rotation.x = -Math.PI / 2;
      sz.position.set(0, 0.03, v + s * (w / 2 + 1)); sz.receiveShadow = true;
      g.add(sz);
    }
    // double yellow centre lines
    for (const s of [-0.35, 0.35]) {
      bx(g, 0.25, 0.04, 192, 0, v + s, 0.04, 0, yellow);
      bx(g, 192, 0.04, 0.25, 0, 0, 0.04, v + s, yellow);
    }
  }
  // white lane dashes on main roads (instanced)
  const dashGeo = new THREE.BoxGeometry(0.25, 0.03, 2.2);
  const dashPositions = [];
  for (const v of LINES) {
    if (!MAIN.has(v)) continue;
    for (let p = -92; p <= 92; p += 8) {
      dashPositions.push([v - 3, 0.05, p, 0], [v + 3, 0.05, p, 1]);
      dashPositions.push([p, 0.05, v - 3, 1], [p, 0.05, v + 3, 1]);
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashPositions.length);
  const dummy = new THREE.Object3D();
  dashPositions.forEach(([x, y, z, rot], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.y = rot ? Math.PI / 2 : 0;
    dummy.updateMatrix();
    dashes.setMatrixAt(i, dummy.matrix);
  });
  dashes.receiveShadow = true;
  g.add(dashes);

  // --- buildings: two per block, windows on every facade ---
  const winTransforms = [];
  const winColors = [];
  const buildings = [];
  const winDummy = new THREE.Object3D();
  const winColor = new THREE.Color();
  for (let i = 0; i < LINES.length - 1; i++) {
    for (let j = 0; j < LINES.length - 1; j++) {
      const x0 = LINES[i] + roadWidth(LINES[i]) / 2 + 1;
      const x1 = LINES[i + 1] - roadWidth(LINES[i + 1]) / 2 - 1;
      const z0 = LINES[j] + roadWidth(LINES[j]) / 2 + 1;
      const z1 = LINES[j + 1] - roadWidth(LINES[j + 1]) / 2 - 1;
      const bw = x1 - x0, bd = z1 - z0;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const splitX = bw >= bd;
      for (let k = 0; k < 2; k++) {
        const floors = 2 + Math.floor(rng() * 3); // 2-4 floors
        const h = floors * 3;
        const w = splitX ? bw / 2 - 1 : bw - 1.5;
        const d = splitX ? bd - 1.5 : bd / 2 - 1;
        const px = splitX ? x0 + bw / 4 + k * (bw / 2) : cx;
        const pz = splitX ? cz : z0 + bd / 4 + k * (bd / 2);
        const facade = pick(FACADES);
        const b = bx(g, w, h, d, facade, px, h / 2, pz);
        buildings.push({ mesh: b, x: px, z: pz, w, d, h, floors });
        // flat roof cap
        bx(g, w + 0.3, 0.25, d + 0.3, 0x6a6a62, px, h + 0.1, pz);
        // rooftop props
        const r = rng();
        if (r < 0.55) bx(g, 1.4, 0.7, 1.0, 0xb8b8b0, px - w / 4, h + 0.55, pz, M(0xb8b8b0));
        if (r > 0.3 && r < 0.6) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 10), M(0x7a8a9a));
          tank.position.set(px + w / 4, h + 0.9, pz);
          tank.castShadow = true;
          g.add(tank);
        }
        if (rng() < 0.35) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.6, 6), M(0x555555));
          ant.position.set(px + w / 3, h + 1.4, pz - d / 4);
          g.add(ant);
          bx(g, 1.2, 0.06, 0.06, 0x555555, px + w / 3, h + 2.4, pz - d / 4);
        }
        // neon shop sign + awning on some ground floors
        if (rng() < 0.3) {
          const neon = pick([0xff4a6a, 0x2affc8, 0xffc81a, 0x4a9aff]);
          bx(g, Math.min(3.4, w - 1), 0.6, 0.12, 0, px, 3.1, pz - d / 2 - 0.05, L(neon, 1.8));
          bx(g, Math.min(4, w - 0.5), 0.15, 1.4, pick([0xd42a1e, 0x2a6a4a, 0x1a4fd0]), px, 2.6, pz - d / 2 - 0.7);
        }
        // windows: one row per floor, all four facades
        for (let f = 0; f < floors; f++) {
          const wy = 1.6 + f * 3;
          const colsX = Math.max(1, Math.floor(w / 2.6));
          const colsZ = Math.max(1, Math.floor(d / 2.6));
          for (let cxi = 0; cxi < colsX; cxi++) {
            const wx = px - w / 2 + (cxi + 0.5) * (w / colsX);
            winTransforms.push([wx, wy, pz - d / 2 - 0.04, 0]);
            winTransforms.push([wx, wy, pz + d / 2 + 0.04, 0]);
          }
          for (let czi = 0; czi < colsZ; czi++) {
            const wz = pz - d / 2 + (czi + 0.5) * (d / colsZ);
            winTransforms.push([px - w / 2 - 0.04, wy, wz, 1]);
            winTransforms.push([px + w / 2 + 0.04, wy, wz, 1]);
          }
        }
      }
    }
  }
  const winGeo = new THREE.BoxGeometry(1.1, 1.4, 0.08);
  const winMesh = new THREE.InstancedMesh(winGeo, M(0xffffff), winTransforms.length);
  winTransforms.forEach(([x, y, z, rot], i) => {
    winDummy.position.set(x, y, z);
    winDummy.rotation.y = rot ? Math.PI / 2 : 0;
    winDummy.updateMatrix();
    winMesh.setMatrixAt(i, winDummy.matrix);
    winColor.setHex(rng() < 0.1 ? 0xffd98a : pick(PANE));
    winMesh.setColorAt(i, winColor);
  });
  g.add(winMesh);

  // --- palms: beach row + along main roads ---
  const palmSpots = [];
  for (let z = -90; z <= 90; z += 12) palmSpots.push([-100, z]);
  for (const v of [-42, 0, 42]) {
    for (let p = -84; p <= 84; p += 21) {
      palmSpots.push([v + 7.5, p]);
      palmSpots.push([v - 7.5, p]);
    }
  }
  for (const [px, pz] of palmSpots) {
    if (rng() < 0.25) continue;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 4.2, 7), M(0x8a6a3a));
    trunk.position.y = 2.1;
    trunk.castShadow = true;
    palm.add(trunk);
    for (let f = 0; f < 6; f++) {
      const frond = bx(palm, 2.4, 0.08, 0.7, 0x2a9a4a, 0, 0, 0);
      frond.position.set(Math.cos((f / 6) * Math.PI * 2) * 1.1, 4.3, Math.sin((f / 6) * Math.PI * 2) * 1.1);
      frond.rotation.y = -(f / 6) * Math.PI * 2;
      frond.rotation.z = 0.45;
    }
    palm.position.set(px, 0, pz);
    g.add(palm);
  }

  // --- street furniture: lamps, hydrants, bins, benches, bus stops, traffic lights ---
  const lampMat = M(0x3a3a3a);
  for (const v of [-42, 0, 42]) {
    for (let p = -80; p <= 80; p += 20) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 6), lampMat);
      pole.position.y = 2.7; pole.castShadow = true;
      const arm = bx(lamp, 1.6, 0.1, 0.1, 0x3a3a3a, 0.8, 5.3, 0);
      const head = bx(lamp, 0.5, 0.12, 0.3, 0, 1.5, 5.25, 0, L(0xfff2b0, 1.2));
      lamp.add(pole);
      lamp.position.set(v + 7, 0, p);
      g.add(lamp);
    }
  }
  for (let i = 0; i < 14; i++) {
    const hx = pick(LINES) + (rng() < 0.5 ? -7 : 7);
    const hz = pick(LINES) + (rng() < 0.5 ? -7 : 7);
    const hyd = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 8), M(0xd42a1e));
    body.position.y = 0.35;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 8), M(0xd42a1e));
    cap.position.y = 0.78;
    hyd.add(body, cap);
    hyd.position.set(hx, 0, hz);
    g.add(hyd);
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.8, 8), M(0x2a4a3a));
    bin.position.set(hx + 1.2, 0.4, hz);
    bin.castShadow = true;
    g.add(bin);
  }
  for (const [bxp, bzp] of [[-7, -28], [7, 28], [-49, 7], [49, -7]]) {
    const bench = new THREE.Group();
    bench.add(bx(bench, 2.0, 0.12, 0.6, 0x8a5a2a, 0, 0.45, 0));
    bench.add(bx(bench, 2.0, 0.6, 0.1, 0x8a5a2a, 0, 0.85, 0.28));
    bench.add(bx(bench, 0.1, 0.45, 0.5, 0x3a3a3a, -0.9, 0.22, 0));
    bench.add(bx(bench, 0.1, 0.45, 0.5, 0x3a3a3a, 0.9, 0.22, 0));
    bench.position.set(bxp, 0, bzp);
    g.add(bench);
  }
  // bus stop shelter at (7, 21)
  const stop = new THREE.Group();
  stop.add(bx(stop, 0.12, 2.4, 0.12, 0x3a3a3a, -1.6, 1.2, 0));
  stop.add(bx(stop, 0.12, 2.4, 0.12, 0x3a3a3a, 1.6, 1.2, 0));
  stop.add(bx(stop, 3.6, 0.12, 1.6, 0x1a4fd0, 0, 2.5, 0));
  stop.add(bx(stop, 3.4, 1.0, 0.08, 0x9fc4d8, 0, 1.6, 0.7));
  stop.position.set(28.5, 0, -49);
  g.add(stop);
  // traffic lights at the four main-road intersections near centre
  const trafficLights = [];
  for (const [tx, tz] of [[7.5, 7.5], [-7.5, 7.5], [7.5, -7.5], [-7.5, -7.5]]) {
    const tl = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.6, 6), M(0x222222));
    pole.position.y = 2.8; pole.castShadow = true;
    tl.add(pole);
    const headBox = bx(tl, 0.5, 1.3, 0.4, 0x111111, 0, 5.2, 0);
    const redL = bx(tl, 0.3, 0.3, 0.06, 0, 0, 5.55, -0.22, L(0xff2a1a, 1.5));
    const grnL = bx(tl, 0.3, 0.3, 0.06, 0, 0, 4.85, -0.22, L(0x2aff66, 0.4));
    tl.add(headBox, redL, grnL);
    tl.position.set(tx, 0, tz);
    g.add(tl);
    trafficLights.push({ red: redL.material, green: grnL.material });
  }

  // --- parked cars + moving traffic + strolling pedestrians ---
  const parked = [
    [buildSedan(0x2e6fb0), -4.2, -30, 0], [buildSportsCar(0xe8a81a), 4.2, -52, Math.PI],
    [buildSedan(0x7a3aa0), -4.2, 35, 0], [buildVan(0xe8e8e8), 4.2, 60, Math.PI],
    [buildSedan(0x3a8a5a), -25.5, -8, Math.PI / 2], [buildSportsCar(0x1a1a1a), 25.5, 14, -Math.PI / 2],
  ];
  for (const [car, x, z, ry] of parked) {
    car.position.set(x, 0, z);
    car.rotation.y = ry;
    g.add(car);
  }
  const traffic = [];
  const trafficDefs = [
    { car: buildSedan(0xc8c8c8), lane: -21, speed: 9, z: -40 },
    { car: buildSedan(0x8a2a2a), lane: 21, speed: 11, z: 20 },
    { car: buildVan(0x4a6a8a), lane: 0, speed: 8, z: 70 },
  ];
  for (const d of trafficDefs) {
    d.car.position.set(d.lane + 2.6, 0, d.z);
    d.car.rotation.y = d.speed > 0 ? Math.PI : 0;
    g.add(d.car);
    traffic.push(d);
  }
  const peds = [];
  for (let i = 0; i < 8; i++) {
    const p = buildPedestrian(i);
    const line = pick(LINES);
    p.position.set(line + (rng() < 0.5 ? -7 : 7), 0, -80 + rng() * 160);
    p.rotation.y = rng() * Math.PI * 2;
    g.add(p);
    peds.push({ mesh: p, line, dir: rng() < 0.5 ? 1 : -1, speed: 1.2 + rng() * 0.8 });
  }

  function update(dt, t) {
    for (const d of traffic) {
      d.car.position.z += d.speed * dt * (d.car.rotation.y === 0 ? -1 : 1);
      if (d.car.position.z > 95) d.car.position.z = -95;
      if (d.car.position.z < -95) d.car.position.z = 95;
      for (const w of d.car.userData.wheels) w.rotation.x += (d.speed * dt) / 0.36;
    }
    for (const p of peds) {
      p.mesh.position.z += p.dir * p.speed * dt;
      if (p.mesh.position.z > 92 || p.mesh.position.z < -92) p.dir *= -1;
      p.mesh.rotation.y = p.dir > 0 ? Math.PI : 0;
      p.mesh.position.y = Math.abs(Math.sin(t * 6 + p.line)) * 0.03; // walk bob
    }
    // traffic lights cycle
    const phase = Math.floor(t / 4) % 2 === 0;
    for (const tl of trafficLights) {
      tl.red.emissiveIntensity = phase ? 1.8 : 0.3;
      tl.green.emissiveIntensity = phase ? 0.3 : 1.8;
    }
  }

  return { group: g, districtAt, update, buildings };
}
