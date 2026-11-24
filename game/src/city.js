// city.js — SELAT BARA. Dense ±8x8 city grid, 5 named districts,
// buildings attached to streets (no empty lots), 2-4 floors, bright
// facades, beach + bright blue sea on the west side, palms, roads with
// double yellow lines. Main roads 12u wide, side streets 8u (brief:
// wide enough for 3 cars abreast). EVERY building gets procedural
// windows — one InstancedMesh for all facades, one row per floor.
// DISTRICTS is the single source of truth for HUD + map (fix #13).
import * as THREE from 'three';
import { lam } from './vehicleBuilder.js';
import { buildSedan, buildVan } from './vehicleBuilder.js';
import { buildPedestrian } from './characterBuilder.js';

export const ROAD_LINES = [-84, -63, -42, -21, 0, 21, 42, 63, 84];
export const MAIN_ROADS = new Set([0]); // x=0 and z=0 are the 12u mains
export function roadWidth(v) { return MAIN_ROADS.has(v) ? 12 : 8; }

export const DISTRICTS = [
  { name: 'PELABUHAN BARA', street: 'Jl. Dermaga Bara', color: 0x4da6ff, standing: 'NEUTRAL', standingVal: 58, rect: [-96, -21, -84, 21], label: [-58, -30] },
  { name: 'KOTA TUA', street: 'Jl. Merdeka Lama', color: 0xffd34d, standing: 'NEUTRAL', standingVal: 47, rect: [-21, 42, -84, -21], label: [10, -52] },
  { name: 'PASAR LAMA', street: 'Jl. Pasar Lama', color: 0xff8c42, standing: 'WARY', standingVal: 34, rect: [-21, 42, -21, 42], label: [10, 31] },
  { name: 'DISTRIK KACA', street: 'Jl. Kaca Raya', color: 0x7ddc7d, standing: 'NEUTRAL', standingVal: 58, rect: [42, 105, -84, 42], label: [73, -21] },
  { name: 'TANJUNG EMAS', street: 'Jl. Tanjung Emas', color: 0xe88bb0, standing: 'NEUTRAL', standingVal: 58, rect: [-21, 105, 42, 105], label: [42, 73] },
];
export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.rect[0] && x <= d.rect[1] && z >= d.rect[2] && z <= d.rect[3]) return d;
  }
  return DISTRICTS[2];
}

const FACADES = [0xffffff, 0xfff2cc, 0xcfe8ff, 0xffd9a0, 0xffe8e0, 0xd8f0d8];
const PANE_TONES = [0x2b4a5e, 0x3a5a6e, 0x1f3a4d, 0x4a6a7e];

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildCity(scene) {
  const group = new THREE.Group();
  const animated = { traffic: [], pedestrians: [] };

  // --- ground: grass-green base, sand strip, bright blue sea (west) ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(230, 230), lam(0x8ecb6a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  ground.receiveShadow = true;
  group.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(12, 210), lam(0xf5e0a0));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-90, 0, 0);
  sand.receiveShadow = true;
  group.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(70, 230), lam(0x1e90d6, 0x0a5a8a, 0.4));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-131, 0.02, 0);
  sea.receiveShadow = true;
  group.add(sea);

  // --- roads: full 9x9 grid, asphalt + sidewalks + centre lines ---
  // Horizontal roads start at the shoreline (x -96) so they never cut the sea.
  for (const v of ROAD_LINES) {
    const w = roadWidth(v);
    const asphalt = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
    const walkMat = new THREE.MeshLambertMaterial({ color: 0xb8b8b0 });
    // road along X (varying z)
    const rx = box(201, 0.06, w, asphalt, -4.5, 0, v); // x -105..96
    const rz = box(w, 0.06, 210, asphalt, v, 0, 0);
    group.add(rx, rz);
    // sidewalks hugging both edges
    group.add(box(201, 0.1, 1.6, walkMat, -4.5, 0.02, v - w / 2 - 0.8));
    group.add(box(201, 0.1, 1.6, walkMat, -4.5, 0.02, v + w / 2 + 0.8));
    group.add(box(1.6, 0.1, 210, walkMat, v - w / 2 - 0.8, 0.02, 0));
    group.add(box(1.6, 0.1, 210, walkMat, v + w / 2 + 0.8, 0.02, 0));
    // double yellow centre lines on mains, dashed white on side streets
    const lineMat = new THREE.MeshLambertMaterial({ color: 0xffd34d });
    const dashMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    if (MAIN_ROADS.has(v)) {
      group.add(box(201, 0.02, 0.18, lineMat, -4.5, 0.05, v - 0.25));
      group.add(box(201, 0.02, 0.18, lineMat, -4.5, 0.05, v + 0.25));
      group.add(box(0.18, 0.02, 210, lineMat, v - 0.25, 0.05, 0));
      group.add(box(0.18, 0.02, 210, lineMat, v + 0.25, 0.05, 0));
    } else {
      for (let p = -96; p <= 96; p += 8) {
        group.add(box(3, 0.02, 0.18, dashMat, p, 0.05, v));
        group.add(box(0.18, 0.02, 3, dashMat, v, 0.05, p));
      }
    }
  }

  // --- buildings: one per block cell, attached to streets, no empty lots ---
  // Block bounds come from neighbouring road lines minus half the road
  // width and the sidewalk, so no building ever overlaps a road.
  const windowTransforms = [];
  const winGeo = new THREE.BoxGeometry(1.0, 1.3, 0.08);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const blocks = [];
  for (let i = 0; i < ROAD_LINES.length - 1; i++) {
    for (let j = 0; j < ROAD_LINES.length - 1; j++) {
      const x0 = ROAD_LINES[i] + roadWidth(ROAD_LINES[i]) / 2 + 1.8;
      const x1 = ROAD_LINES[i + 1] - roadWidth(ROAD_LINES[i + 1]) / 2 - 1.8;
      const z0 = ROAD_LINES[j] + roadWidth(ROAD_LINES[j]) / 2 + 1.8;
      const z1 = ROAD_LINES[j + 1] - roadWidth(ROAD_LINES[j + 1]) / 2 - 1.8;
      if (x0 >= x1 || z0 >= z1) continue;
      if (x1 < -84) continue; // beach strip: no buildings west of the shore road
      blocks.push([x0, x1, z0, z1]);
    }
  }
  const dummy = new THREE.Object3D();
  for (const [x0, x1, z0, z1] of blocks) {
    const bw = x1 - x0, bd = z1 - z0;
    const cols = bw > 13 ? 2 : 1, rows = bd > 13 ? 2 : 1;
    for (let ci = 0; ci < cols; ci++) {
      for (let ri = 0; ri < rows; ri++) {
        const w = bw / cols - 1.2, d = bd / rows - 1.2;
        const cx = x0 + (bw / cols) * (ci + 0.5);
        const cz = z0 + (bd / rows) * (ri + 0.5);
        const floors = 2 + Math.floor(rnd() * 3); // 2-4 floors
        const h = floors * 3;
        const facade = FACADES[Math.floor(rnd() * FACADES.length)];
        const b = box(w, h, d, lam(facade), cx, h / 2, cz);
        group.add(b);
        // parapet + rooftop props (AC, water tank, antenna)
        group.add(box(w + 0.3, 0.25, d + 0.3, lam(0x8a8a8a), cx, h + 0.12, cz));
        if (rnd() > 0.4) group.add(box(1.1, 0.7, 0.9, lam(0xb8b8b8), cx - w / 4, h + 0.6, cz));
        if (rnd() > 0.5) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 10), lam(0x7fb3d5));
          tank.position.set(cx + w / 4, h + 0.9, cz - d / 4);
          tank.castShadow = true;
          group.add(tank);
        }
        if (rnd() > 0.5) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.4, 6), lam(0x666666));
          ant.position.set(cx + w / 3, h + 1.4, cz + d / 4);
          group.add(ant);
        }
        // shopfront awning on the street side for ground-floor shops
        if (rnd() > 0.55) {
          const awn = box(w * 0.8, 0.12, 1.4, lam([0xe8641b, 0x2e86c1, 0x1e9e4a][Math.floor(rnd() * 3)]), cx, 3.1, cz - d / 2 - 0.5);
          group.add(awn);
        }
        // windows: one row per floor on every facade, varying pane tone
        const nx = Math.max(2, Math.floor(w / 2.2));
        const nz = Math.max(2, Math.floor(d / 2.2));
        for (let f = 0; f < floors; f++) {
          const wy = 1.8 + f * 3;
          for (let k = 0; k < nx; k++) {
            const wx = cx - w / 2 + (k + 0.5) * (w / nx);
            dummy.position.set(wx, wy, cz - d / 2 - 0.05);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            windowTransforms.push({ m: dummy.matrix.clone(), tone: Math.floor(rnd() * 4) });
            dummy.position.set(wx, wy, cz + d / 2 + 0.05);
            dummy.rotation.set(0, Math.PI, 0);
            dummy.updateMatrix();
            windowTransforms.push({ m: dummy.matrix.clone(), tone: Math.floor(rnd() * 4) });
          }
          for (let k = 0; k < nz; k++) {
            const wz = cz - d / 2 + (k + 0.5) * (d / nz);
            dummy.position.set(cx - w / 2 - 0.05, wy, wz);
            dummy.rotation.set(0, -Math.PI / 2, 0);
            dummy.updateMatrix();
            windowTransforms.push({ m: dummy.matrix.clone(), tone: Math.floor(rnd() * 4) });
            dummy.position.set(cx + w / 2 + 0.05, wy, wz);
            dummy.rotation.set(0, Math.PI / 2, 0);
            dummy.updateMatrix();
            windowTransforms.push({ m: dummy.matrix.clone(), tone: Math.floor(rnd() * 4) });
          }
        }
      }
    }
  }
  // ONE InstancedMesh for every window in the city (single material,
  // per-instance colour for the varying pane tones).
  const winMesh = new THREE.InstancedMesh(winGeo, lam(0xffffff, 0x0a1a24, 0.25), windowTransforms.length);
  windowTransforms.forEach((t, i) => {
    winMesh.setMatrixAt(i, t.m);
    winMesh.setColorAt(i, new THREE.Color(PANE_TONES[t.tone]));
  });
  winMesh.instanceMatrix.needsUpdate = true;
  group.add(winMesh);

  // --- street furniture: benches, hydrants, bins, bus stop, traffic lights ---
  const furnMat = lam(0x5a5a5a);
  for (const v of ROAD_LINES) {
    for (let p = -84; p <= 84; p += 21) {
      if (Math.abs(v) === 0 && p % 42 === 0) continue;
      const onXRoad = rnd() > 0.5;
      const fx = onXRoad ? p : v + roadWidth(v) / 2 + 1.4;
      const fz = onXRoad ? v + roadWidth(v) / 2 + 1.4 : p;
      if (fx < -84 || fx > 100 || fz < -100 || fz > 100) continue;
      const pick = rnd();
      if (pick > 0.7) { // bench
        group.add(box(1.8, 0.1, 0.5, lam(0x8a5a2a), fx, 0.45, fz));
        group.add(box(1.8, 0.5, 0.1, lam(0x8a5a2a), fx, 0.7, fz + 0.22));
        group.add(box(0.1, 0.45, 0.4, furnMat, fx - 0.8, 0.22, fz));
        group.add(box(0.1, 0.45, 0.4, furnMat, fx + 0.8, 0.22, fz));
      } else if (pick > 0.45) { // hydrant (red) + bin (green)
        const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 8), lam(0xd43d2a));
        hyd.position.set(fx, 0.35, fz);
        hyd.castShadow = true;
        group.add(hyd);
        group.add(box(0.5, 0.8, 0.5, lam(0x1e9e4a), fx + 0.9, 0.4, fz));
      } else { // traffic light pole
        group.add(box(0.14, 3.4, 0.14, furnMat, fx, 1.7, fz));
        group.add(box(0.4, 0.9, 0.3, lam(0x222222), fx, 3.2, fz));
        group.add(box(0.2, 0.2, 0.05, lam(0x22cc44, 0x22cc44, 1.5), fx, 3.35, fz - 0.18));
      }
    }
  }
  // bus stop (kept off the action1 camera axis — was at (7.5,0,21))
  const bus = new THREE.Group();
  bus.add(box(3.2, 0.12, 1.6, lam(0x2e86c1), 0, 2.6, 0));
  bus.add(box(0.12, 2.6, 0.12, furnMat, -1.5, 1.3, -0.7));
  bus.add(box(0.12, 2.6, 0.12, furnMat, 1.5, 1.3, -0.7));
  bus.add(box(0.12, 2.6, 0.12, furnMat, -1.5, 1.3, 0.7));
  bus.add(box(0.12, 2.6, 0.12, furnMat, 1.5, 1.3, 0.7));
  bus.add(box(3.0, 0.5, 0.4, lam(0x8a5a2a), 0, 0.5, 0.6));
  bus.position.set(28.5, 0, -49);
  group.add(bus);

  // --- neon signs on a few facades (emissive, midday-visible) ---
  const neonCols = [0xff2a7a, 0x22d3ee, 0xffd34d, 0x7ddc7d];
  for (let i = 0; i < 10; i++) {
    const nx = ROAD_LINES[1 + (i % 7)] + 8;
    const nz = ROAD_LINES[(i * 3) % 8] + 8;
    const c = neonCols[i % neonCols.length];
    const sign = box(0.3, 1.6 + (i % 3) * 0.5, 2.2, lam(c, c, 1.8), nx, 4.5, nz);
    group.add(sign);
  }

  // --- palms: sidewalks only (never on road centrelines) + beach row ---
  function palm(x, z) {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 4.4, 7), lam(0x8a5a2a));
    trunk.position.y = 2.2;
    trunk.castShadow = true;
    p.add(trunk);
    for (let k = 0; k < 6; k++) {
      const frond = box(0.25, 0.08, 2.2, lam(0x2fae4e), 0, 4.5, 0);
      const holder = new THREE.Group();
      holder.rotation.y = (k / 6) * Math.PI * 2;
      frond.position.z = 1.0;
      frond.rotation.x = 0.5;
      holder.add(frond);
      holder.position.y = 4.4;
      p.add(holder);
    }
    p.position.set(x, 0, z);
    group.add(p);
  }
  for (const v of ROAD_LINES) {
    for (let p = -73; p <= 84; p += 21) {
      palm(v + roadWidth(v) / 2 + 1.4, p);
      palm(v - roadWidth(v) / 2 - 1.4, p + 10);
    }
  }
  for (let z = -84; z <= 84; z += 14) palm(-93, z); // beach row

  // --- parked cars + moving traffic + strolling pedestrians ---
  const parkedSpots = [[10, -10], [10, 31], [-10, 52], [31, -31], [52, 10], [-31, -52]];
  for (const [px, pz] of parkedSpots) {
    const c = Math.random() > 0.5 ? buildSedan() : buildVan();
    c.position.set(px, 0, pz);
    c.rotation.y = (Math.abs(px) > Math.abs(pz) ? 0 : Math.PI / 2) + (Math.random() > 0.5 ? 0 : Math.PI);
    group.add(c);
  }
  for (let i = 0; i < 3; i++) {
    const t = buildSedan();
    const axis = i % 2 === 0;
    t.position.set(axis ? ROAD_LINES[2 + i] : -63 + i * 21, 0, axis ? -63 + i * 42 : ROAD_LINES[3 + i]);
    t.rotation.y = axis ? 0 : Math.PI / 2;
    group.add(t);
    animated.traffic.push({ mesh: t, axis, speed: 4 + i, dir: i % 2 === 0 ? 1 : -1, road: axis ? ROAD_LINES[2 + i] : ROAD_LINES[3 + i] });
  }
  for (let i = 0; i < 8; i++) {
    const ped = buildPedestrian(i);
    const v = ROAD_LINES[1 + (i % 7)];
    ped.position.set(v + roadWidth(v) / 2 + 1.4, 0, -70 + i * 20);
    ped.rotation.y = Math.PI / 2;
    group.add(ped);
    animated.pedestrians.push({ mesh: ped, z0: -70 + i * 20, speed: 0.8 + (i % 3) * 0.3, phase: i });
  }

  scene.add(group);
  return { group, animated };
}

export function updateCity(city, t, dt) {
  for (const tr of city.animated.traffic) {
    if (tr.axis) {
      tr.mesh.position.z += tr.speed * tr.dir * dt;
      if (tr.mesh.position.z > 100) tr.mesh.position.z = -100;
      if (tr.mesh.position.z < -100) tr.mesh.position.z = 100;
    } else {
      tr.mesh.position.x += tr.speed * tr.dir * dt;
      if (tr.mesh.position.x > 100) tr.mesh.position.x = -100;
      if (tr.mesh.position.x < -100) tr.mesh.position.x = 100;
    }
  }
  for (const pd of city.animated.pedestrians) {
    pd.mesh.position.z = pd.z0 + Math.sin(t * 0.1 * pd.speed + pd.phase) * 12;
  }
}
