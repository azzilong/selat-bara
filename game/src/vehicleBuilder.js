// vehicleBuilder.js — Selat Bara vehicles: body + cabin + 4 wheels + glass +
// lights, solid colours. Police light bars are BIG and BRIGHT (fix #2).
// Helicopter: spinning rotor + SpotLight beam down. Lambert, no textures.
import * as THREE from 'three';

function lam(color, emissive = 0x000000, ei = 1) {
  return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: ei });
}
function part(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Cars face +Z by default (front at +Z). Length 4.2, width 1.8, height ~1.4,
// wheel radius 0.35. kinds: 'sports' | 'sedan' | 'police' | 'van'.
export function buildCar(opts = {}) {
  const { kind = 'sedan', color = 0x3a6fd8 } = opts;
  const g = new THREE.Group();
  const bodyMat = lam(color);
  const glassMat = lam(0x1a2530);
  const isPolice = kind === 'police';
  const isSports = kind === 'sports';
  const isVan = kind === 'van';

  const bodyLen = isVan ? 4.6 : 4.2;
  const bodyH = isSports ? 0.48 : 0.58;
  const bodyY = isVan ? 0.72 : 0.58;
  // body + cabin
  g.add(part(1.8, bodyH, bodyLen, isPolice ? lam(0xf0f0f0) : bodyMat, 0, bodyY, 0));
  if (isVan) {
    g.add(part(1.7, 0.85, 3.6, isPolice ? lam(0xf0f0f0) : bodyMat, 0, 1.35, -0.2));
    g.add(part(1.5, 0.5, 0.9, glassMat, 0, 1.35, 1.7));
  } else {
    g.add(part(1.5, 0.5, isSports ? 1.7 : 2.1, isPolice ? lam(0xe8e8e8) : bodyMat, 0, bodyY + bodyH / 2 + 0.22, -0.25));
    // windshields: front + rear glass
    g.add(part(1.45, 0.42, 0.08, glassMat, 0, bodyY + bodyH / 2 + 0.22, isSports ? 0.62 : 0.82));
    g.add(part(1.45, 0.42, 0.08, glassMat, 0, bodyY + bodyH / 2 + 0.22, -1.32));
    // side glass
    g.add(part(0.06, 0.36, 1.6, glassMat, 0.76, bodyY + bodyH / 2 + 0.22, -0.25));
    g.add(part(0.06, 0.36, 1.6, glassMat, -0.76, bodyY + bodyH / 2 + 0.22, -0.25));
  }
  // bumpers
  g.add(part(1.82, 0.16, 0.22, lam(0x2c313a), 0, 0.32, bodyLen / 2 + 0.02));
  g.add(part(1.82, 0.16, 0.22, lam(0x2c313a), 0, 0.32, -bodyLen / 2 - 0.02));
  // headlights (white, emissive) + taillights (red, emissive)
  const headMat = lam(0xfff6c8, 0xfff2a0, 1.6);
  const tailMat = lam(0xff2a2a, 0xff2a2a, 1.6);
  for (const s of [-1, 1]) {
    g.add(part(0.34, 0.14, 0.06, headMat, s * 0.6, 0.62, bodyLen / 2 + 0.03));
    g.add(part(0.34, 0.14, 0.06, tailMat, s * 0.6, 0.62, -bodyLen / 2 - 0.03));
  }
  // police: blue side stripe + door shield dot
  if (isPolice) {
    for (const s of [-1, 1]) {
      g.add(part(0.04, 0.3, 3.4, lam(0x2456c8), s * 0.92, 0.62, 0));
    }
    g.add(part(0.04, 0.4, 0.7, lam(0x2456c8), 0.92, 0.95, -0.2));
    g.add(part(0.04, 0.4, 0.7, lam(0x2456c8), -0.92, 0.95, -0.2));
    // BIG roof light bar: black base 1.5 wide, red + blue blocks 0.7 x 0.34,
    // dedicated emissive materials, flashing alternately.
    const barBase = part(1.5, 0.1, 0.5, lam(0x14161a), 0, 1.42, -0.25);
    g.add(barBase);
    const redMat = new THREE.MeshLambertMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 2.6 });
    const blueMat = new THREE.MeshLambertMaterial({ color: 0x2040ff, emissive: 0x2040ff, emissiveIntensity: 2.6 });
    const redBlock = part(0.7, 0.34, 0.46, redMat, -0.38, 1.62, -0.25);
    const blueBlock = part(0.7, 0.34, 0.46, blueMat, 0.38, 1.62, -0.25);
    g.add(redBlock, blueBlock);
    g.userData.lightRed = redMat;
    g.userData.lightBlue = blueMat;
    g.userData.flashPhase = 0;
  }
  // wheels: 4 cylinders, radius 0.35
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 12);
  const wheelMat = lam(0x16181c);
  const hubMat = lam(0x9aa2ab);
  const wheels = [];
  for (const [wx, wz] of [[-0.82, 1.35], [0.82, 1.35], [-0.82, -1.35], [0.82, -1.35]]) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 8), hubMat);
    hub.rotation.z = Math.PI / 2;
    wheel.add(tire, hub);
    wheel.position.set(wx, 0.35, wz);
    g.add(wheel);
    wheels.push(wheel);
  }
  g.userData.wheels = wheels;
  g.userData.kind = kind;
  return g;
}

// Flash the police light bar: red and blue alternate, bright in midday sun.
export function flashLightBar(car, dt) {
  if (!car.userData.lightRed) return;
  car.userData.flashPhase = (car.userData.flashPhase + dt * 6) % 2;
  const on = car.userData.flashPhase < 1;
  car.userData.lightRed.emissiveIntensity = on ? 3.5 : 0.35;
  car.userData.lightBlue.emissiveIntensity = on ? 0.35 : 3.5;
}

export function spinWheels(car, speed, dt) {
  if (!car.userData.wheels) return;
  const spin = (speed * dt) / 0.35;
  for (const w of car.userData.wheels) w.rotation.x += spin;
}

// Wrecked car: grey, tilted, one wheel missing, smoke point on the hood.
export function buildWreck() {
  const g = buildCar({ kind: 'sedan', color: 0x5a6068 });
  g.rotation.z = 0.06;
  g.rotation.y = 0.35;
  g.position.y = 0.08;
  const hood = new THREE.Object3D();
  hood.position.set(0.2, 0.95, 1.6);
  g.add(hood);
  g.userData.smokePoint = hood;
  // cracked windshield: pale spider-web box
  const crack = part(1.4, 0.4, 0.06, lam(0xd8e6f2, 0xd8e6f2, 0.5), 0, 1.05, 0.84);
  g.add(crack);
  return g;
}

// Police helicopter: body + tail + spinning main rotor + SpotLight beam down.
export function buildHeli() {
  const g = new THREE.Group();
  const bodyMat = lam(0x2456c8);
  g.add(part(1.7, 1.25, 3.1, bodyMat, 0, 0, 0));
  g.add(part(1.5, 0.9, 1.0, lam(0x1a2530), 0, 0.15, 1.15)); // glass nose
  g.add(part(0.5, 0.5, 3.4, bodyMat, 0, 0.25, -2.8)); // tail boom
  g.add(part(0.18, 1.1, 0.7, lam(0xf0f0f0), 0, 0.6, -4.3)); // tail fin
  g.add(part(1.6, 0.14, 0.5, lam(0xf0f0f0), 0, -0.65, 0.6)); // belly stripe
  // skids
  for (const s of [-1, 1]) {
    g.add(part(0.1, 0.1, 2.6, lam(0x2c313a), s * 0.7, -0.85, 0));
    g.add(part(0.08, 0.35, 0.08, lam(0x2c313a), s * 0.7, -0.68, 0.9));
    g.add(part(0.08, 0.35, 0.08, lam(0x2c313a), s * 0.7, -0.68, -0.9));
  }
  // main rotor (spins) + tail rotor
  const rotor = new THREE.Group();
  rotor.add(part(7.2, 0.08, 0.3, lam(0x22262e), 0, 0, 0));
  rotor.add(part(0.3, 0.08, 7.2, lam(0x22262e), 0, 0, 0));
  rotor.position.y = 0.85;
  g.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.add(part(0.08, 1.6, 0.14, lam(0x22262e), 0, 0, 0));
  tailRotor.position.set(0.32, 0.6, -4.3);
  g.add(tailRotor);
  g.userData.rotor = rotor;
  g.userData.tailRotor = tailRotor;
  // searchlight: SpotLight aimed straight down + a visible beam cone
  const spot = new THREE.SpotLight(0xffffff, 60, 60, 0.42, 0.5, 1.2);
  spot.position.set(0, -0.5, 0.4);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -30, 0.4);
  g.add(spotTarget);
  spot.target = spotTarget;
  g.add(spot);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff8d8, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 14, 12, 1, true), beamMat);
  beam.rotation.x = Math.PI; // apex up at the heli
  beam.position.set(0, -7.5, 0.4);
  g.add(beam);
  g.userData.spot = spot;
  // red anti-collision beacon
  const beacon = part(0.18, 0.18, 0.18, lam(0xff2020, 0xff2020, 2.5), 0, 0.75, -1.2);
  g.add(beacon);
  return g;
}

export function animateHeli(heli, dt) {
  if (heli.userData.rotor) heli.userData.rotor.rotation.y += dt * 14;
  if (heli.userData.tailRotor) heli.userData.tailRotor.rotation.x += dt * 18;
}
