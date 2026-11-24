// scenes.js — SELAT BARA. "Mode Bioskop": ?scene=action1/2/3/map/title.
// Every scene forces 12:00 midday, a cinematic frozen camera, exact
// spawns, full HUD. Frozen at the most dramatic frame so screenshots
// are never blurred. Fixes baked in: heli IN frame (#1), hero seated
// inside the car (#4/#8), tracer + sparks (#5), drops (#6/#9/#12),
// blood pools (#10), map shot (#13/#13a).
import * as THREE from 'three';
import { buildSportsCar, buildPoliceCar, buildHelicopter, buildSedan, buildCar } from './vehicleBuilder.js';
import { buildHero, buildEnemy, buildPolice, buildPedestrian, buildDrop, buildBloodPool, makeFallen } from './characterBuilder.js';
import { shoot, smokePuff } from './weapons.js';

export const SCENE_HUD = {
  action1: {
    mission: 'M1 · THE GETAWAY', objective: 'Lose the heli — reach the docks',
    stage: 'STAGE 1/3 · STEAL THE CAR', next: 'NEXT Lose the heli', progress: 0.34,
    district: 'PELABUHAN BARA', street: 'Jl. Dermaga Bara', standing: 'NEUTRAL', standingVal: 58,
    wanted: 3, wantedText: 'AIR UNIT DEPLOYED', money: 250, clock: '12:00',
    weapon: 'SMG', ammo: '30/90', slot: 3, speed: 112, vehicle: "RAKA'S SPORTS CAR", damage: 12,
  },
  action2: {
    mission: 'M2 · THE BRUTAL SHOOTOUT', objective: 'Kill the Gang — clear the street',
    stage: 'STAGE 2/3 · CLEAR THE STREET', next: 'NEXT Vanish', progress: 0.55,
    district: 'PASAR LAMA', street: 'Jl. Pasar Lama', standing: 'WARY', standingVal: 34,
    wanted: 2, wantedText: 'UNITS RESPONDING', money: 2500, clock: '12:00',
    weapon: 'SMG', ammo: '11/48', slot: 3, speed: 0, vehicle: '', damage: 0,
  },
  action3: {
    mission: 'M3 · HIGH SPEED CHASE', objective: 'Drive-by — take out the patrol car',
    stage: 'STAGE 3/3 · LOSE THE HEAT', next: 'NEXT Reach the docks', progress: 0.8,
    district: 'KOTA TUA', street: 'Jl. Merdeka Lama', standing: 'NEUTRAL', standingVal: 47,
    wanted: 3, wantedText: 'AIR UNIT DEPLOYED', money: 250, clock: '12:00',
    weapon: 'SMG', ammo: '22/90', slot: 3, speed: 112, vehicle: "RAKA'S SPORTS CAR", damage: 18,
  },
  map: {
    mission: 'M1 · THE GETAWAY', objective: 'Lose the heli — reach the docks',
    stage: 'STAGE 1/3 · STEAL THE CAR', next: 'NEXT Lose the heli', progress: 0.34,
    district: 'PELABUHAN BARA', street: 'Jl. Dermaga Bara', standing: 'NEUTRAL', standingVal: 58,
    wanted: 3, wantedText: 'AIR UNIT DEPLOYED', money: 250, clock: '12:00',
    weapon: 'SMG', ammo: '30/90', slot: 3, speed: 0, vehicle: '', damage: 0,
  },
  title: {
    mission: 'M1 · THE GETAWAY', objective: 'Steal the car — lose the heat',
    stage: 'STAGE 1/3 · STEAL THE CAR', next: 'NEXT Lose the heli', progress: 0.1,
    district: 'PELABUHAN BARA', street: 'Jl. Dermaga Bara', standing: 'NEUTRAL', standingVal: 58,
    wanted: 0, wantedText: '', money: 250, clock: '12:00',
    weapon: 'PISTOL', ammo: '12/48', slot: 2, speed: 0, vehicle: '', damage: 0,
  },
};

// Police units for the PD response panel (fix #11a). Positions are set
// per scene; distances are computed live from the real 3D positions.
export function policeUnits() {
  return [
    { code: 'SBPD-7', name: 'BARA', role: 'IN PURSUIT', pos: new THREE.Vector3() },
    { code: 'SBPD-12', name: 'TANJUNG', role: 'RAMMING', pos: new THREE.Vector3() },
    { code: 'SBPD-19', name: 'KACA', role: 'BLOCKING', pos: new THREE.Vector3() },
    { code: 'SBPD-AIR', name: 'ELANG', role: 'AIR UNIT', pos: new THREE.Vector3() },
  ];
}

function placeOnRoad(obj, x, z, rotY = 0) {
  obj.position.set(x, 0, z);
  obj.rotation.y = rotY;
  return obj;
}

// Persistent blood splash: static red boxes scattered around a point.
function staticBlood(scene, x, z) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xcc0000, emissive: 0x660000, emissiveIntensity: 0.6 });
  for (let i = 0; i < 14; i++) {
    const s = 0.12 + Math.random() * 0.2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(s, 0.04, s), mat);
    const a = Math.random() * Math.PI * 2;
    const r = 0.3 + Math.random() * 1.1;
    b.position.set(x + Math.sin(a) * r, 0.05, z + Math.cos(a) * r);
    b.rotation.y = Math.random() * Math.PI;
    scene.add(b);
  }
}

// Stage one scene. Returns { units, routeTarget, heroPos, mapMode }.
export function stageScene(name, ctx) {
  const { scene, camera, weapons } = ctx;
  const units = policeUnits();
  const out = { units, routeTarget: new THREE.Vector3(-88, 0, 40), heroPos: new THREE.Vector3(0, 0, 12), mapMode: false };
  const heroCar = buildSportsCar();
  const hero = buildHero();

  if (name === 'action1') {
    // Police chase on the z=0 main road (12u wide): hero car ahead,
    // 3 police spread behind, heli LOW and IN FRAME (fix #1: y 11).
    camera.position.set(0, 5, 33);
    camera.lookAt(0, 1.5, 0);
    placeOnRoad(heroCar, 0, 12, Math.PI);
    scene.add(heroCar);
    const spots = [[4.5, 22, Math.PI], [-4.5, 24, Math.PI], [-4, -4, 0]];
    spots.forEach(([x, z, r], i) => {
      const p = buildPoliceCar();
      placeOnRoad(p, x, z, r);
      scene.add(p);
      units[i].pos.set(x, 0, z);
      units[i].mesh = p;
    });
    const heli = buildHelicopter();
    heli.position.set(2, 11, 0);
    scene.add(heli);
    units[3].pos.set(2, 11, 0);
    units[3].mesh = heli;
    // crashed car on the right shoulder, smoking — grey wreck, not a
    // normal car, so it reads as crashed at a glance.
    const wreck = buildCar({ body: 0x5a6068 });
    placeOnRoad(wreck, 8.5, -2, 0.5);
    wreck.rotation.z = 0.08;
    scene.add(wreck);
    smokePuff(weapons.particles, new THREE.Vector3(8.5, 1.2, -3.5));
    out.heroPos.set(0, 0, 12);
  } else if (name === 'action2') {
    // Brutal street shootout: hero behind a wrecked car, 4 armed
    // enemies ahead, 2 fallen with drops + blood pools, frozen flash +
    // tracer + sparks (fixes #3/#5/#6/#9/#10/#12).
    camera.position.set(0.5, 3.2, 24.5);
    camera.lookAt(0, 1.5, 8);
    const wreck = buildCar({ body: 0x5a6068 });
    wreck.position.set(2.5, 0, 13);
    wreck.rotation.y = 0.4;
    wreck.rotation.z = 0.05;
    scene.add(wreck);
    hero.position.set(1.2, 0, 15.5);
    hero.rotation.y = Math.PI; // faces -Z toward the enemies
    hero.userData.armR.rotation.x = -1.2;
    scene.add(hero);
    const enemySpots = [[-3, 4, 'cash'], [3.5, 2, 'ammo'], [-5, 8, null], [5.5, 9, null]];
    enemySpots.forEach(([x, z], i) => {
      const e = buildEnemy();
      e.position.set(x, 0, z);
      e.rotation.y = 0; // faces +Z toward the hero
      scene.add(e);
    });
    // two fallen enemies with drops + blood pools
    const fallen1 = makeFallen(buildEnemy());
    fallen1.position.set(-2.5, 0.14, 6);
    fallen1.rotation.y = 0.6;
    const fallen2 = makeFallen(buildEnemy());
    fallen2.position.set(4.2, 0.14, 5);
    fallen2.rotation.y = -0.9;
    scene.add(fallen1, fallen2);
    const pool1 = buildBloodPool();
    pool1.position.set(-2.5, 0.02, 6);
    const pool2 = buildBloodPool();
    pool2.position.set(4.2, 0.02, 5);
    scene.add(pool1, pool2);
    // static blood splashes (persistent — ParticlePool spawns fade
    // before the capture, so the frozen frame needs real geometry).
    staticBlood(scene, -2.5, 6);
    staticBlood(scene, 4.2, 5);
    const drop1 = buildDrop('cash');
    drop1.position.set(-2.5, 1.3, 6);
    const drop2 = buildDrop('ammo');
    drop2.position.set(4.2, 1.3, 5);
    scene.add(drop1, drop2);
    out.drops = [drop1, drop2];
    // frozen muzzle flash + tracer + sparks from the hero's gun
    const gunTip = new THREE.Vector3(1.6, 1.5, 14.6);
    const target = new THREE.Vector3(-3, 1.3, 4);
    weapons.flash.freeze(gunTip);
    weapons.tracer.freeze(gunTip, target);
    weapons.particles.spawn(gunTip, 0xffe14d, 10, 4, 3, 0.4, 0.9);
    weapons.particles.spawn(target, 0xcc0000, 22, 5, 2, 1.0, 1.6);
    weapons.particles.spawn(new THREE.Vector3(-2.5, 0.4, 6), 0xcc0000, 16, 3, 1.5, 1.0, 1.4);
    // police staged far back for the PD panel distances
    const pdSpots = [[-8, 30], [8, 32], [0, 36]];
    pdSpots.forEach(([x, z], i) => {
      const p = buildPoliceCar();
      placeOnRoad(p, x, z, Math.PI);
      scene.add(p);
      units[i].pos.set(x, 0, z);
      units[i].mesh = p;
    });
    const heli = buildHelicopter();
    heli.position.set(-6, 12, 18);
    scene.add(heli);
    units[3].pos.set(-6, 12, 18);
    units[3].mesh = heli;
    out.heroPos.set(1.2, 0, 15.5);
  } else if (name === 'action3') {
    // Drive-by on the x=0 main road: hero sports car + police car side
    // by side, hero SEATED INSIDE his car (fix #4/#8: at the car's
    // centre, y 0, only head + shoulders + gun arm above the window
    // line, leaning toward the police car), frozen tracer + sparks
    // (fix #5), heli fully in frame top-centre.
    camera.position.set(-6, 4, 55);
    camera.lookAt(0, 1.2, 40);
    placeOnRoad(heroCar, 3, 42, Math.PI);
    scene.add(heroCar);
    const police = buildPoliceCar();
    placeOnRoad(police, -3, 40, Math.PI);
    scene.add(police);
    units[0].pos.set(-3, 0, 40);
    units[0].mesh = police;
    // hero seated inside the car: centre of the cabin, legs hidden by
    // the body, leaning -X toward the police car, gun out the window.
    hero.position.set(2.9, 0, 42);
    hero.rotation.y = -Math.PI / 2; // faces -X, toward the police car
    hero.rotation.z = 0.12; // lean out
    hero.userData.armR.rotation.x = -1.2;
    scene.add(hero);
    const gunTip = new THREE.Vector3(1.6, 1.35, 41.6);
    const target = new THREE.Vector3(-3, 1.0, 40);
    weapons.flash.freeze(gunTip);
    weapons.tracer.freeze(gunTip, target);
    weapons.particles.spawn(gunTip, 0xffe14d, 10, 4, 3, 0.4, 0.9);
    weapons.particles.spawn(target, 0xcfe8ff, 10, 4, 2, 0.5, 0.9); // glass
    const heli = buildHelicopter();
    heli.position.set(3, 9, 38);
    scene.add(heli);
    units[3].pos.set(3, 9, 38);
    units[3].mesh = heli;
    // second + third police further back for the PD panel, kept
    // fully inside the frame (not clipped at the right edge).
    const extra = [[3.5, 48], [-5, 49]];
    extra.forEach(([x, z], i) => {
      const p = buildPoliceCar();
      placeOnRoad(p, x, z, Math.PI);
      scene.add(p);
      units[i + 1].pos.set(x, 0, z);
      units[i + 1].mesh = p;
    });
    out.heroPos.set(3, 0, 42);
  } else if (name === 'map') {
    // Full city map (fix #13/#13a): oblique aerial camera, hero car on
    // the road, police staged ON real roads so PD distances + map
    // markers are live. The big-map panel is drawn by hud.js.
    camera.position.set(0, 70, 25);
    camera.lookAt(0, 0, 0);
    placeOnRoad(heroCar, 0, 12, Math.PI);
    scene.add(heroCar);
    const pdSpots = [[21, -21], [-42, 42], [42, 0]];
    pdSpots.forEach(([x, z], i) => {
      const p = buildPoliceCar();
      placeOnRoad(p, x, z, i === 1 ? Math.PI / 2 : 0);
      scene.add(p);
      units[i].pos.set(x, 0, z);
      units[i].mesh = p;
    });
    const heli = buildHelicopter();
    heli.position.set(-21, 14, -42);
    scene.add(heli);
    units[3].pos.set(-21, 14, -42);
    units[3].mesh = heli;
    out.mapMode = true;
    out.heroPos.set(0, 0, 12);
  } else {
    // title: bright midday city, hero car on the main road, hero
    // standing by the car, camera on the road axis.
    camera.position.set(0, 4.5, 30);
    camera.lookAt(0, 1.5, 8);
    placeOnRoad(heroCar, 0, 12, Math.PI);
    scene.add(heroCar);
    hero.position.set(2.2, 0, 14);
    hero.rotation.y = Math.PI * 0.75;
    scene.add(hero);
    const ped1 = buildPedestrian(0);
    ped1.position.set(-4, 0, 18);
    const ped2 = buildPedestrian(1);
    ped2.position.set(5, 0, 20);
    scene.add(ped1, ped2);
    out.heroPos.set(0, 0, 12);
  }
  return out;
}
