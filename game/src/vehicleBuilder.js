// vehicleBuilder.js — SELAT BARA. Cars + helicopter, all procedural
// Box/Capsule geometry, solid Lambert colours, no textures.
// Cars: body + cabin + 4 wheels + glass + lights. Police cars carry a
// BIG bright roof light bar (fix #2) that reads in full midday sun.
import * as THREE from 'three';

export function lam(color, emissive = 0x000000, ei = 1) {
  return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: ei });
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildWheel() {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12), lam(0x1a1a1a));
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 10), lam(0xc8c8c8));
  hub.rotation.z = Math.PI / 2;
  g.add(tyre, hub);
  return g;
}

// Generic car: length along Z, front faces -Z.
export function buildCar({ body = 0xd43d2a, cabin = 0x20242a, glass = 0x9fd8e8, sport = false } = {}) {
  const car = new THREE.Group();
  const bodyMat = lam(body);
  const lower = box(2.0, 0.62, 4.3, bodyMat, 0, 0.55, 0);
  const nose = box(1.9, 0.42, 0.7, bodyMat, 0, 0.5, -2.15);
  const cab = box(1.7, 0.58, 2.1, lam(cabin), 0, 1.12, 0.25);
  const windshield = box(1.66, 0.5, 0.06, lam(glass), 0, 1.1, -0.82);
  windshield.rotation.x = 0.28;
  const rearGlass = box(1.66, 0.46, 0.06, lam(glass), 0, 1.1, 1.32);
  rearGlass.rotation.x = -0.28;
  const roof = box(1.72, 0.08, 2.0, bodyMat, 0, 1.44, 0.25);
  car.add(lower, nose, cab, windshield, rearGlass, roof);
  car.add(box(0.34, 0.16, 0.06, lam(0xfff6c0, 0xfff2a0, 1.6), -0.68, 0.62, -2.52));
  car.add(box(0.34, 0.16, 0.06, lam(0xfff6c0, 0xfff2a0, 1.6), 0.68, 0.62, -2.52));
  car.add(box(0.3, 0.14, 0.06, lam(0xff2a22, 0xff2a22, 1.2), -0.68, 0.66, 2.18));
  car.add(box(0.3, 0.14, 0.06, lam(0xff2a22, 0xff2a22, 1.2), 0.68, 0.66, 2.18));
  car.add(box(2.02, 0.18, 0.12, lam(0x222222), 0, 0.32, -2.2));
  car.add(box(2.02, 0.18, 0.12, lam(0x222222), 0, 0.32, 2.2));
  if (sport) {
    car.add(box(1.9, 0.1, 0.5, lam(0x1c1c1c), 0, 1.02, 2.05)); // rear spoiler
    car.add(box(0.08, 0.22, 0.4, lam(0x1c1c1c), -0.8, 0.9, 2.0));
    car.add(box(0.08, 0.22, 0.4, lam(0x1c1c1c), 0.8, 0.9, 2.0));
  }
  const wheels = [];
  for (const [wx, wz] of [[-0.95, -1.45], [0.95, -1.45], [-0.95, 1.45], [0.95, 1.45]]) {
    const w = buildWheel();
    w.position.set(wx, 0.36, wz);
    car.add(w);
    wheels.push(w);
  }
  car.userData.wheels = wheels;
  car.userData.kind = 'car';
  return car;
}

export function buildSportsCar() {
  return buildCar({ body: 0xd43d2a, sport: true });
}
export function buildSedan() {
  return buildCar({ body: 0x2e86c1 });
}
export function buildVan() {
  const v = buildCar({ body: 0xe8a13a, cabin: 0x333333 });
  v.scale.set(1.05, 1.15, 1.1);
  return v;
}

// Police car: white body, blue doors, "SELAT BARA PD" door band, and a
// BIG roof light bar — 1.5u black base, red + blue blocks 0.7w x 0.34h,
// emissive 2.6 flashing to 3.5 (fix #2: unmistakable in midday sun).
export function buildPoliceCar() {
  const car = buildCar({ body: 0xf2f2f2 });
  car.add(box(2.02, 0.3, 1.6, lam(0x1d4ed8), 0, 0.62, 0.3)); // blue door band
  car.add(box(0.02, 0.2, 1.1, lam(0x111111), -1.01, 0.85, 0.3)); // door stripe L
  car.add(box(0.02, 0.2, 1.1, lam(0x111111), 1.01, 0.85, 0.3)); // door stripe R
  const base = box(1.5, 0.1, 0.55, lam(0x111111), 0, 1.53, 0.25);
  car.add(base);
  const redMat = lam(0xff2020, 0xff1010, 2.6);
  const blueMat = lam(0x2040ff, 0x1020ff, 2.6);
  const red = box(0.7, 0.34, 0.5, redMat, -0.38, 1.74, 0.25);
  const blue = box(0.7, 0.34, 0.5, blueMat, 0.38, 1.74, 0.25);
  car.add(red, blue);
  car.userData.lightBar = { red, blue, redMat, blueMat, phase: 0 };
  car.userData.kind = 'police';
  return car;
}

// Flash the roof bar: alternate red/blue, bright in daylight.
export function flashLightBar(car, dt) {
  const lb = car.userData.lightBar;
  if (!lb) return;
  lb.phase += dt * 6;
  const on = Math.sin(lb.phase) > 0;
  lb.redMat.emissiveIntensity = on ? 3.5 : 0.7;
  lb.blueMat.emissiveIntensity = on ? 0.7 : 3.5;
}

export function animateWheels(car, dt, speed) {
  const wheels = car.userData.wheels;
  if (!wheels) return;
  for (const w of wheels) w.rotation.x += dt * speed * 0.9;
}

// Helicopter: body + glass nose + tail boom + tail fin + skids,
// main rotor (spinning) + tail rotor, SpotLight beam down (fix #1:
// staged low enough to sit inside the chase frame).
export function buildHelicopter() {
  const heli = new THREE.Group();
  const bodyMat = lam(0x1d4ed8);
  const body = box(2.0, 1.5, 3.4, bodyMat, 0, 0, 0);
  const nose = box(1.7, 1.1, 1.0, lam(0x9fd8e8), 0, -0.1, -1.9);
  const tail = box(0.5, 0.5, 4.2, bodyMat, 0, 0.25, 3.4);
  const fin = box(0.14, 1.2, 0.9, lam(0xff2020), 0, 0.7, 5.3);
  heli.add(body, nose, tail, fin);
  heli.add(box(0.3, 0.3, 0.3, lam(0xfff6c0, 0xfff2a0, 1.8), -0.6, -0.4, -2.3));
  heli.add(box(0.3, 0.3, 0.3, lam(0xfff6c0, 0xfff2a0, 1.8), 0.6, -0.4, -2.3));
  // skids
  heli.add(box(0.12, 0.12, 3.2, lam(0x222222), -0.9, -1.0, 0));
  heli.add(box(0.12, 0.12, 3.2, lam(0x222222), 0.9, -1.0, 0));
  heli.add(box(0.1, 0.3, 0.1, lam(0x222222), -0.9, -0.85, -1.2));
  heli.add(box(0.1, 0.3, 0.1, lam(0x222222), 0.9, -0.85, -1.2));
  heli.add(box(0.1, 0.3, 0.1, lam(0x222222), -0.9, -0.85, 1.2));
  heli.add(box(0.1, 0.3, 0.1, lam(0x222222), 0.9, -0.85, 1.2));
  // main rotor (spins) + tail rotor
  const rotor = new THREE.Group();
  rotor.add(box(7.2, 0.08, 0.5, lam(0x222222), 0, 0, 0));
  rotor.add(box(0.5, 0.08, 7.2, lam(0x222222), 0, 0, 0));
  rotor.position.y = 0.95;
  const tailRotor = new THREE.Group();
  tailRotor.add(box(0.08, 1.6, 0.12, lam(0x222222), 0, 0, 0));
  tailRotor.add(box(0.08, 0.12, 1.6, lam(0x222222), 0, 0, 0));
  tailRotor.position.set(0.35, 0.7, 5.3);
  heli.add(rotor, tailRotor);
  // spotlight beam: narrow translucent cone down + real SpotLight
  const beamMat = new THREE.MeshLambertMaterial({
    color: 0xfff8c0, transparent: true, opacity: 0.14, emissive: 0xfff2a0, emissiveIntensity: 0.5,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 11, 16, 1, true), beamMat);
  beam.position.y = -6.2;
  beam.rotation.x = Math.PI; // cone opens downward
  heli.add(beam);
  const spot = new THREE.SpotLight(0xfff8d0, 60, 30, 0.32, 0.5, 1.2);
  spot.position.set(0, -0.8, 0);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -12, 0);
  heli.add(spotTarget);
  spot.target = spotTarget;
  heli.add(spot);
  heli.userData.rotor = rotor;
  heli.userData.tailRotor = tailRotor;
  heli.userData.kind = 'heli';
  return heli;
}

export function animateHeli(heli, dt) {
  if (heli.userData.rotor) heli.userData.rotor.rotation.y += dt * 22;
  if (heli.userData.tailRotor) heli.userData.tailRotor.rotation.x += dt * 30;
}
