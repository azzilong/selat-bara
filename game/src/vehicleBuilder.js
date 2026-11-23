// SELAT BARA — vehicle builders (step 2).
// Re-written in-session under recording 8 (gta6-01, 2026-11-24).
// All vehicles are pure Three.js geometry, solid MeshLambertMaterial,
// no textures, no GLB. One shared material cache keeps the scene cheap.
// Car spec (brief): body + cabin + 4 wheels + glass + lights, solid
// colours; length 4.2, width 1.8, height 1.4, wheel radius 0.35.
// REBUILD FIX #2: the police roof light bar is BIGGER and TALLER and
// much brighter now — the old 0.45-wide bar washed out in midday sun
// and the cars did not read as police. The bar is now unmistakable.
import * as THREE from 'three';

const matCache = new Map();
export const MAT = (c) => {
  if (!matCache.has(c)) {
    matCache.set(c, new THREE.MeshLambertMaterial({ color: c }));
  }
  return matCache.get(c);
};
const EMIT = (c, e) => {
  const key = c + ':' + e;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({
      color: c, emissive: e, emissiveIntensity: 1.0 }));
  }
  return matCache.get(key);
};

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 12);

function part(group, geo, mat, sx, sy, sz, x, y, z, rz = 0, rx = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  if (rz) m.rotation.z = rz;
  if (rx) m.rotation.x = rx;
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// A wheel: dark tyre cylinder rotated 90 deg so its axis is across the car.
function wheel(group, x, z) {
  const w = part(group, unitCyl, MAT(0x141414), 0.35, 0.24, 0.35, x, 0.35, z, Math.PI / 2);
  const hub = part(group, unitCyl, MAT(0x9aa0a6), 0.18, 0.25, 0.18, x, 0.35, z, Math.PI / 2);
  hub.castShadow = false;
  return w;
}

// Base car: body + cabin + glass + 4 wheels + headlights + taillights.
// opts: { body, cabin, glass, sport } — returns a Group, forward = -Z.
export function buildCar(opts = {}) {
  const body = opts.body ?? 0xd8402e;
  const cabin = opts.cabin ?? 0x20262e;
  const glass = opts.glass ?? 0x9fd8ef;
  const g = new THREE.Group();
  const low = opts.sport ? 0.62 : 0.78; // sports cars sit lower
  // main body slab
  part(g, unitBox, MAT(body), 1.8, low, 4.2, 0, 0.55, 0);
  // cabin with glass band
  part(g, unitBox, MAT(cabin), 1.6, 0.55, 2.2, 0, 0.55 + low / 2 + 0.27, -0.2);
  part(g, unitBox, MAT(glass), 1.62, 0.3, 2.0, 0, 0.55 + low / 2 + 0.3, -0.2);
  // hood + boot lines
  part(g, unitBox, MAT(body), 1.7, 0.12, 0.9, 0, 0.55 + low / 2 - 0.02, 1.65);
  // wheels
  const wheels = [];
  for (const [x, z] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) {
    wheels.push(wheel(g, x, z));
  }
  // headlights (front = -Z? forward is -Z, so front is z=-2.1)
  part(g, unitBox, EMIT(0xfff6c0, 0xffe89a), 0.34, 0.14, 0.08, -0.6, 0.72, -2.1);
  part(g, unitBox, EMIT(0xfff6c0, 0xffe89a), 0.34, 0.14, 0.08, 0.6, 0.72, -2.1);
  // taillights
  part(g, unitBox, EMIT(0xff2a1e, 0xcc1408), 0.34, 0.14, 0.08, -0.6, 0.72, 2.1);
  part(g, unitBox, EMIT(0xff2a1e, 0xcc1408), 0.34, 0.14, 0.08, 0.6, 0.72, 2.1);
  g.userData.wheels = wheels;
  g.userData.kind = 'car';
  return g;
}

// Hero sports car: bright ember-red, low, rear spoiler, black bonnet stripe.
export function buildSportsCar() {
  const g = buildCar({ body: 0xe63b12, cabin: 0x181c22, sport: true });
  part(g, unitBox, MAT(0x181c22), 1.7, 0.08, 0.7, 0, 0.98, -0.6); // bonnet stripe
  part(g, unitBox, MAT(0x181c22), 1.7, 0.08, 0.5, 0, 1.02, 2.05); // spoiler
  part(g, unitBox, MAT(0x181c22), 0.08, 0.22, 0.4, -0.8, 0.9, 2.05);
  part(g, unitBox, MAT(0x181c22), 0.08, 0.22, 0.4, 0.8, 0.9, 2.05);
  g.userData.kind = 'sports';
  return g;
}

// Plain sedan in a bright city colour (traffic / parked cars).
export function buildSedan(color = 0x2e86c1) {
  const g = buildCar({ body: color, cabin: 0x232a33 });
  g.userData.kind = 'sedan';
  return g;
}

// City van: taller box body, sliding-door look, for traffic variety.
export function buildVan(color = 0xf2c14e) {
  const g = new THREE.Group();
  part(g, unitBox, MAT(color), 1.9, 1.5, 4.4, 0, 0.95, 0);
  part(g, unitBox, MAT(0x9fd8ef), 1.92, 0.5, 1.1, 0, 1.35, -1.2);
  part(g, unitBox, MAT(0x232a33), 1.7, 0.4, 0.9, 0, 0.55, -1.9);
  const wheels = [];
  for (const [x, z] of [[-0.9, 1.45], [0.9, 1.45], [-0.9, -1.45], [0.9, -1.45]]) {
    wheels.push(wheel(g, x, z));
  }
  part(g, unitBox, EMIT(0xfff6c0, 0xffe89a), 0.3, 0.14, 0.08, -0.6, 0.6, -2.2);
  part(g, unitBox, EMIT(0xfff6c0, 0xffe89a), 0.3, 0.14, 0.08, 0.6, 0.6, -2.2);
  part(g, unitBox, EMIT(0xff2a1e, 0xcc1408), 0.3, 0.14, 0.08, -0.6, 0.6, 2.2);
  part(g, unitBox, EMIT(0xff2a1e, 0xcc1408), 0.3, 0.14, 0.08, 0.6, 0.6, 2.2);
  g.userData.wheels = wheels;
  g.userData.kind = 'van';
  return g;
}

// Police interceptor: white body, blue doors + bonnet, flashing light bar.
// userData.lightBar = { red, blue } — flash by toggling emissiveIntensity.
// REBUILD FIX #2: the bar is now BIG — a wide black base (1.5u) with two
// tall red/blue blocks (0.7w x 0.34h x 0.42d) on dedicated high-emissive
// materials (base intensity 2.6, flashing to 3.5), so the red/blue reads
// clearly even in full midday sun.
export function buildPoliceCar() {
  const g = buildCar({ body: 0xf4f6f7, cabin: 0x1c2733 });
  part(g, unitBox, MAT(0x1d4ed8), 1.82, 0.5, 2.4, 0, 0.62, 0.2); // blue side band
  part(g, unitBox, MAT(0x1d4ed8), 1.7, 0.1, 0.9, 0, 0.96, -1.5); // blue bonnet
  part(g, unitBox, MAT(0xffffff), 1.2, 0.06, 0.5, 0, 1.0, 0.4); // roof plate
  const barBase = part(g, unitBox, MAT(0x111418), 1.5, 0.18, 0.46, 0, 1.12, 0.4);
  barBase.castShadow = false;
  // dedicated (per-car) light materials — bright enough for midday
  const redMat = new THREE.MeshLambertMaterial({
    color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 2.6 });
  const blueMat = new THREE.MeshLambertMaterial({
    color: 0x2050ff, emissive: 0x0030ff, emissiveIntensity: 2.6 });
  const red = part(g, unitBox, redMat, 0.7, 0.34, 0.42, -0.38, 1.36, 0.4);
  const blue = part(g, unitBox, blueMat, 0.7, 0.34, 0.42, 0.38, 1.36, 0.4);
  red.castShadow = false;
  blue.castShadow = false;
  g.userData.lightBar = { red, blue };
  g.userData.kind = 'police';
  return g;
}

// Flash the police light bar: alternate red / blue each call.
export function flashLightBar(car, phase) {
  const bar = car.userData.lightBar;
  if (!bar) return;
  const on = phase % 2 === 0;
  bar.red.material.emissiveIntensity = on ? 3.5 : 0.25;
  bar.blue.material.emissiveIntensity = on ? 0.25 : 3.5;
}

// Police helicopter: body + tail boom + main + tail rotors + skids,
// plus a downward SpotLight (the air-support beam in the chase shots).
export function buildHelicopter() {
  const g = new THREE.Group();
  // fuselage
  part(g, unitBox, MAT(0xf4f6f7), 2.0, 1.3, 3.2, 0, 0, 0);
  part(g, unitBox, MAT(0x1d4ed8), 2.02, 0.4, 3.0, 0, -0.3, 0); // blue belly band
  part(g, unitBox, MAT(0x9fd8ef), 1.9, 0.55, 1.0, 0, 0.25, -1.1); // cockpit glass
  // tail boom + fin
  part(g, unitBox, MAT(0xf4f6f7), 0.5, 0.5, 3.6, 0, 0.2, 3.2);
  part(g, unitBox, MAT(0x1d4ed8), 0.12, 1.1, 0.9, 0, 0.7, 4.8);
  // skids
  part(g, unitBox, MAT(0x222222), 0.12, 0.12, 3.0, -0.8, -0.85, 0);
  part(g, unitBox, MAT(0x222222), 0.12, 0.12, 3.0, 0.8, -0.85, 0);
  part(g, unitBox, MAT(0x222222), 0.1, 0.5, 0.1, -0.8, -0.6, -0.8);
  part(g, unitBox, MAT(0x222222), 0.1, 0.5, 0.1, 0.8, -0.6, -0.8);
  part(g, unitBox, MAT(0x222222), 0.1, 0.5, 0.1, -0.8, -0.6, 0.8);
  part(g, unitBox, MAT(0x222222), 0.1, 0.5, 0.1, 0.8, -0.6, 0.8);
  // main rotor (spins around Y)
  const rotor = new THREE.Group();
  rotor.position.set(0, 0.85, 0);
  part(rotor, unitBox, MAT(0x222222), 7.2, 0.08, 0.35, 0, 0, 0);
  part(rotor, unitBox, MAT(0x222222), 0.35, 0.08, 7.2, 0, 0, 0);
  g.add(rotor);
  // tail rotor (spins around X, at the fin)
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.35, 0.7, 4.9);
  part(tailRotor, unitBox, MAT(0x222222), 0.08, 1.6, 0.2, 0, 0, 0);
  part(tailRotor, unitBox, MAT(0x222222), 0.08, 0.2, 1.6, 0, 0, 0);
  g.add(tailRotor);
  // searchlight: SpotLight aimed straight down + a visible beam cone
  const spot = new THREE.SpotLight(0xfffbe0, 900, 90, 0.32, 0.45, 1.2);
  spot.position.set(0, -0.7, 0);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -30, 0);
  g.add(spotTarget);
  spot.target = spotTarget;
  g.add(spot);
  const beam = part(g, new THREE.CylinderGeometry(0.4, 2.2, 20, 16, 1, true),
    new THREE.MeshLambertMaterial({
      color: 0xfffbe0, transparent: true, opacity: 0.14,
      side: THREE.DoubleSide, depthWrite: false }),
    1, 1, 1, 0, -10.5, 0);
  beam.castShadow = false;
  g.userData.rotor = rotor;
  g.userData.tailRotor = tailRotor;
  g.userData.spot = spot;
  g.userData.kind = 'heli';
  return g;
}

// Spin the heli rotors; dt in seconds.
export function animateHeli(heli, dt) {
  if (!heli.userData.rotor) return;
  heli.userData.rotor.rotation.y += dt * 14;
  heli.userData.tailRotor.rotation.x += dt * 18;
}

// Spin car wheels to match road speed (units/second).
export function animateWheels(car, speed, dt) {
  const wheels = car.userData.wheels;
  if (!wheels) return;
  const spin = (speed / 0.35) * dt;
  for (const w of wheels) w.rotation.x += spin;
}
