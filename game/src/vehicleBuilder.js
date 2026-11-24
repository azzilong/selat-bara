// Selat Bara — vehicle builders (sports car, sedan, van, police car, helicopter).
// All geometry is procedural Three.js boxes/cylinders, MeshLambertMaterial only.
// Cars are built facing -Z (front at -Z). Units are metres-ish; a car is ~4.4 long.
import * as THREE from 'three';

const L = (c, e = 1) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: e });
const M = (c) => new THREE.MeshLambertMaterial({ color: c });

function box(w, h, d, c, x = 0, y = 0, z = 0, mat = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || M(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function wheel(x, z) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12), M(0x1a1a1a));
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 8), M(0xd8d8d8));
  hub.rotation.z = Math.PI / 2;
  g.add(tyre, hub);
  g.position.set(x, 0.36, z);
  return g;
}

// Base car: body + cabin + glass + 4 wheels + lights. Returns a group with
// userData { wheels, body, kind }.
export function buildCar({ color = 0xc0392b, kind = 'sedan', damage = 0 } = {}) {
  const g = new THREE.Group();
  const isSports = kind === 'sports';
  const isVan = kind === 'van';
  const len = isVan ? 5.2 : isSports ? 4.6 : 4.4;
  const bodyH = isVan ? 0.95 : 0.55;
  const bodyY = isVan ? 0.75 : 0.55;
  const body = box(1.9, bodyH, len, color, 0, bodyY, 0);
  g.add(body);
  // cabin / glasshouse
  const cabLen = isVan ? 3.4 : isSports ? 2.0 : 2.2;
  const cabZ = isVan ? -0.3 : 0.25;
  const cabin = box(1.7, 0.5, cabLen, 0x22262e, 0, bodyY + bodyH / 2 + 0.24, cabZ);
  g.add(cabin);
  // glass band: pale blue-grey inset panels on the cabin sides
  const glass = box(1.74, 0.3, cabLen - 0.3, 0x9fc4d8, 0, bodyY + bodyH / 2 + 0.26, cabZ);
  g.add(glass);
  // hood hint
  g.add(box(1.86, 0.1, 0.7, color, 0, bodyY + bodyH / 2 + 0.02, -len / 2 + 0.45));
  // headlights (front = -Z) and taillights
  const hl = L(0xfff2b0, 1.6);
  g.add(box(0.34, 0.12, 0.06, 0, -0.62, bodyY, -len / 2 - 0.01, hl));
  g.add(box(0.34, 0.12, 0.06, 0, 0.62, bodyY, -len / 2 - 0.01, hl));
  const tl = L(0xff2a1a, 1.4);
  g.add(box(0.4, 0.12, 0.06, 0, -0.62, bodyY, len / 2 + 0.01, tl));
  g.add(box(0.4, 0.12, 0.06, 0, 0.62, bodyY, len / 2 + 0.01, tl));
  // bumpers
  g.add(box(1.92, 0.18, 0.18, 0x222222, 0, 0.32, -len / 2 + 0.05));
  g.add(box(1.92, 0.18, 0.18, 0x222222, 0, 0.32, len / 2 - 0.05));
  // wheels
  const wheels = [];
  const wz = len / 2 - 0.85;
  for (const [x, z] of [[-0.88, -wz], [0.88, -wz], [-0.88, wz], [0.88, wz]]) {
    const w = wheel(x, z);
    wheels.push(w);
    g.add(w);
  }
  g.userData = { wheels, body, kind, damage, len };
  return g;
}

export function buildSportsCar(color = 0xd42a1e) {
  return buildCar({ color, kind: 'sports' });
}
export function buildSedan(color = 0x2e6fb0) {
  return buildCar({ color, kind: 'sedan' });
}
export function buildVan(color = 0xe8e8e8) {
  return buildCar({ color, kind: 'van' });
}

// Police car: white body, blue side stripe, black cabin, and a BIG bright
// roof light bar (red + blue blocks, tall emissive) so it reads as police
// even in full midday sun.
export function buildPoliceCar() {
  const g = buildCar({ color: 0xf2f4f6, kind: 'sedan' });
  const len = g.userData.len;
  // blue side stripes
  g.add(box(0.04, 0.22, len - 0.6, 0x1a4fd0, -0.96, 0.62, 0));
  g.add(box(0.04, 0.22, len - 0.6, 0x1a4fd0, 0.96, 0.62, 0));
  // black hood band
  g.add(box(1.92, 0.06, 1.1, 0x1a1a1a, 0, 0.86, -len / 2 + 0.8));
  // --- roof light bar: black base + two BIG tall blocks ---
  const barY = 1.32;
  g.add(box(1.5, 0.1, 0.5, 0x111111, 0, barY, 0.25));
  const redMat = L(0xff1a1a, 2.6);
  const blueMat = L(0x1a55ff, 2.6);
  const red = box(0.7, 0.34, 0.42, 0, -0.36, barY + 0.2, 0.25, redMat);
  const blue = box(0.7, 0.34, 0.42, 0, 0.36, barY + 0.2, 0.25, blueMat);
  g.add(red, blue);
  g.userData.lightBar = { red, blue, redMat, blueMat, phase: Math.random() * 6 };
  g.userData.kind = 'police';
  return g;
}

// Alternate the two light-bar blocks; t is seconds.
export function flashLightBar(car, t) {
  const lb = car.userData.lightBar;
  if (!lb) return;
  const on = Math.sin(t * 9 + lb.phase) > 0;
  lb.redMat.emissiveIntensity = on ? 3.6 : 0.5;
  lb.blueMat.emissiveIntensity = on ? 0.5 : 3.6;
}

export function animateWheels(car, speed, dt) {
  const spin = (speed * dt) / 0.36;
  for (const w of car.userData.wheels) w.rotation.x += spin;
}

// Police helicopter: white body, blue stripe, skids, spinning main + tail
// rotors, and a SpotLight + visible beam cone aimed at the road below.
export function buildHelicopter() {
  const g = new THREE.Group();
  const body = box(2.0, 1.5, 4.2, 0xf2f4f6, 0, 0, 0);
  g.add(body);
  g.add(box(2.04, 0.3, 4.24, 0x1a4fd0, 0, -0.2, 0)); // blue stripe
  // glass nose
  g.add(box(1.7, 0.7, 0.5, 0x9fc4d8, 0, 0.15, -2.1));
  // tail boom + fin + tail rotor
  g.add(box(0.5, 0.5, 3.2, 0xf2f4f6, 0, 0.25, 3.4));
  g.add(box(0.16, 1.3, 0.9, 0x1a4fd0, 0, 0.7, 4.8));
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.32, 0.6, 4.85);
  tailRotor.add(box(0.08, 1.8, 0.12, 0x222222, 0, 0, 0));
  tailRotor.add(box(0.08, 0.12, 1.8, 0x222222, 0, 0, 0));
  g.add(tailRotor);
  // main rotor mast + blades
  g.add(box(0.3, 0.5, 0.3, 0x222222, 0, 0.95, 0));
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.25, 0);
  rotor.add(box(7.2, 0.08, 0.34, 0x1a1a1a, 0, 0, 0));
  rotor.add(box(0.34, 0.08, 7.2, 0x1a1a1a, 0, 0, 0));
  g.add(rotor);
  // skids
  g.add(box(0.12, 0.12, 3.6, 0x222222, -0.85, -0.95, 0));
  g.add(box(0.12, 0.12, 3.6, 0x222222, 0.85, -0.95, 0));
  g.add(box(0.1, 0.5, 0.1, 0x222222, -0.85, -0.7, -1.2));
  g.add(box(0.1, 0.5, 0.1, 0x222222, 0.85, -0.7, -1.2));
  g.add(box(0.1, 0.5, 0.1, 0x222222, -0.85, -0.7, 1.2));
  g.add(box(0.1, 0.5, 0.1, 0x222222, 0.85, -0.7, 1.2));
  // searchlight: SpotLight + a pale translucent beam cone to the road
  const spot = new THREE.SpotLight(0xfff6c8, 60, 40, 0.32, 0.5, 1.2);
  spot.position.set(0, -0.8, -0.5);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -14, -0.5);
  g.add(spotTarget);
  spot.target = spotTarget;
  g.add(spot);
  const beamMat = new THREE.MeshLambertMaterial({
    color: 0xfff6c8, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 13, 12, 1, true), beamMat);
  beam.position.set(0, -7.2, -0.5);
  beam.rotation.x = Math.PI; // wide end down
  g.add(beam);
  g.userData = { rotor, tailRotor, spot, beam };
  return g;
}

export function animateHeli(heli, dt, t) {
  heli.userData.rotor.rotation.y += dt * 14;
  heli.userData.tailRotor.rotation.x += dt * 22;
  // gentle hover bob
  heli.position.y += Math.sin(t * 1.4) * 0.002;
}
