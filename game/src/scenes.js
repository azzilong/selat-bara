// scenes.js — Selat Bara "Mode Bioskop": frozen staged scenes via ?scene=.
// action1 (M1 getaway), action2 (M2 shootout), action3 (M3 drive-by),
// title (city + hero car), map (full city map). Each forces 12:00 + full HUD.
import * as THREE from 'three';
import { buildCar, buildHeli, buildWreck, flashLightBar, animateHeli } from './vehicleBuilder.js';
import { buildCharacter, setPose, buildDrop } from './characterBuilder.js';
import { MuzzleFlash, Tracer, bloodPool } from './weapons.js';
import { DISTRICTS, districtAt } from './city.js';

export const SCENE_HUD = {
  action1: {
    name: 'M1 · THE GETAWAY', stage: 'STAGE 1/3 · STEAL THE CAR', objective: 'Reach the docks',
    next: 'NEXT Lose the heli', progress: 0.3, wanted: 3,
    district: 'bara', weapon: { slots: [{ name: 'FISTS', owned: true, ammo: '∞' }, { name: 'PISTOL', owned: true, ammo: '12/36' }, { name: 'SMG', owned: true, ammo: '30/90' }], selected: 2 },
    money: 250, speed: { kmh: 96, vehicle: 'SPORTS CAR', damage: 12 },
  },
  action2: {
    name: 'M2 · THE BRUTAL SHOOTOUT', stage: 'STAGE 2/3 · CLEAR THE STREET', objective: 'Kill the Gang',
    next: 'NEXT Vanish', progress: 0.55, wanted: 2,
    district: 'pasar', weapon: { slots: [{ name: 'FISTS', owned: true, ammo: '∞' }, { name: 'PISTOL', owned: true, ammo: '6/24' }, { name: 'SMG', owned: true, ammo: '11/48' }], selected: 2 },
    money: 250, speed: null,
  },
  action3: {
    name: 'M3 · HIGH SPEED CHASE', stage: 'STAGE 3/3 · LOSE THE HEAT', objective: 'Reach the docks',
    next: 'NEXT Reach the docks', progress: 0.8, wanted: 3,
    district: 'tua', weapon: { slots: [{ name: 'FISTS', owned: true, ammo: '∞' }, { name: 'PISTOL', owned: true, ammo: '12/36' }, { name: 'SMG', owned: true, ammo: '30/90' }], selected: 2 },
    money: 250, speed: { kmh: 112, vehicle: "RAKA'S SPORTS CAR", damage: 18 },
  },
  title: {
    name: 'M1 · THE GETAWAY', stage: 'STAGE 1/3 · STEAL THE CAR', objective: 'Reach the docks',
    next: 'NEXT Lose the heli', progress: 0.1, wanted: 0,
    district: 'bara', weapon: { slots: [{ name: 'FISTS', owned: true, ammo: '∞' }, { name: 'PISTOL', owned: false }, { name: 'SMG', owned: false }], selected: 0 },
    money: 250, speed: null,
  },
  map: {
    name: 'M1 · THE GETAWAY', stage: 'STAGE 1/3 · STEAL THE CAR', objective: 'Reach the docks',
    next: 'NEXT Lose the heli', progress: 0.3, wanted: 3,
    district: 'bara', weapon: { slots: [{ name: 'FISTS', owned: true, ammo: '∞' }, { name: 'PISTOL', owned: true, ammo: '12/36' }, { name: 'SMG', owned: true, ammo: '30/90' }], selected: 2 },
    money: 250, speed: null,
  },
};

function pdUnits(list) {
  return list.map(([name, short, role, x, z]) => ({ name, short, role, x, z }));
}

// Staged world pieces that animate a little (rotor, light bars, drops, smoke).
export class StagedScene {
  constructor(scene, hud, pool) {
    this.scene = scene;
    this.hud = hud;
    this.pool = pool;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.animated = []; // {update(dt)}
    this.drops = [];
    this.policeCars = [];
    this.heli = null;
    this.flash = null;
    this.tracer = null;
    this.clock = 0;
  }
  add(obj) { this.group.add(obj); return obj; }
  update(dt) {
    this.clock += dt;
    for (const a of this.animated) a.update(dt);
    // drops bob + billboard to face the camera
    for (const d of this.drops) {
      d.position.y = d.userData.baseY + Math.sin(this.clock * 2 + d.userData.bobPhase) * 0.12;
      if (this.camera) d.lookAt(this.camera.position);
    }
    if (this.pool) this.pool.update(dt);
  }
}

export function stageScene(name, scene, hud, pool, camera) {
  const staged = new StagedScene(scene, hud, pool);
  staged.camera = camera;
  const conf = SCENE_HUD[name] || SCENE_HUD.title;
  const district = DISTRICTS.find((d) => d.key === conf.district) || DISTRICTS[0];
  hud.setMission(conf);
  hud.setWanted(conf.wanted);
  hud.setDistrict(district);
  hud.setWeapon(conf.weapon.slots, conf.weapon.selected);
  hud.setMoney(conf.money);
  hud.setClock('12:00');
  hud.setHealth(name === 'action2' ? 78 : 100, name === 'action2' ? 60 : 100);
  hud.setSpeed(conf.speed ? conf.speed.kmh : null, conf.speed?.vehicle, conf.speed?.damage);
  hud.showHint(false); // frozen scenes hide the hint bar
  hud.setMapMode(name === 'map');
  hud.player = { x: 0, z: 12 };
  hud.enemies = [];
  hud.routeTarget = { x: -88, z: 40, label: 'Dermaga Bara' };

  if (name === 'action1') {
    // M1 getaway: hero sports car driving north on the main avenue, 3 police
    // behind/beside him, heli overhead in frame, crashed car + smoke at right.
    const heroCar = staged.add(buildCar({ kind: 'sports', color: 0xd21f2b }));
    heroCar.position.set(2, 0, 12); heroCar.rotation.y = Math.PI;
    staged.add(heroCar);
    const policeDefs = [
      { name: 'SBPD-7 BARA', short: 'SBPD-7', role: 'IN PURSUIT', x: 4.5, z: 22, ry: Math.PI },
      { name: 'SBPD-12 TANJUNG', short: 'SBPD-12', role: 'RAMMING', x: -4.5, z: 24, ry: Math.PI },
      { name: 'SBPD-19 KACA', short: 'SBPD-19', role: 'IN PURSUIT', x: -4, z: -4, ry: 0 },
    ];
    const units = [];
    for (const def of policeDefs) {
      const pc = staged.add(buildCar({ kind: 'police' }));
      pc.position.set(def.x, 0, def.z); pc.rotation.y = def.ry;
      staged.policeCars.push(pc);
      units.push({ name: def.name, short: def.short, role: def.role, x: def.x, z: def.z });
      staged.animated.push({ update: (dt) => flashLightBar(pc, dt) });
    }
    const heli = staged.add(buildHeli());
    heli.position.set(2, 11, -2);
    staged.heli = heli;
    units.push({ name: 'SBPD-AIR ELANG', short: 'SBPD-AIR', role: 'AIR UNIT', x: 2, z: -2 });
    staged.animated.push({ update: (dt) => animateHeli(heli, dt) });
    hud.setPD(pdUnits(units.map((u) => [u.name, u.short, u.role, u.x, u.z])));
    hud.player = { x: 2, z: 12 };
    // crashed car at the right side + grey smoke from its hood
    const crash = staged.add(buildWreck());
    crash.position.set(9, 0, 2); crash.rotation.y = -0.6;
    staged.animated.push({ update: (dt) => { if (Math.random() < 0.25) pool.smoke(crash.userData.smokePoint.getWorldPosition(new THREE.Vector3()), 1); } });
    // tire smoke behind the hero car
    pool.smoke(new THREE.Vector3(2, 0.3, 16), 8);
    camera.position.set(0, 5, 33);
    camera.lookAt(0, 1.3, 0);
    staged.cameraRig = null;
  }

  if (name === 'action2') {
    // M2 shootout: hero behind a wrecked car, 4 enemies across the street,
    // 2 fallen with drops + blood pools, frozen muzzle flash + tracer.
    const wreck = staged.add(buildWreck());
    wreck.position.set(0, 0, 14); wreck.rotation.y = 0.15;
    const hero = staged.add(buildCharacter({ role: 'hero' }));
    hero.position.set(0.8, 0, 17.5);
    hero.rotation.y = Math.PI; // faces -Z, at the enemies
    staged.hero = hero;
    const enemySpots = [
      { x: -4, z: 4, alive: true }, { x: -1, z: 2, alive: true },
      { x: 3, z: 5, alive: true }, { x: 5.5, z: 1, alive: true },
      { x: -2.5, z: 7, alive: false }, { x: 3.5, z: 8.5, alive: false },
    ];
    const units = [];
    for (const s of enemySpots) {
      const e = staged.add(buildCharacter({ role: 'enemy', shirt: 0x3a3f4a, pants: 0x2c313a }));
      e.position.set(s.x, 0, s.z);
      e.rotation.y = 0; // faces +Z, toward the hero
      if (!s.alive) {
        setPose(e, 'fallen');
        bloodPool(scene, s.x, s.z + 0.6);
        pool.bloodBig(new THREE.Vector3(s.x, 0.3, s.z));
        const drop = buildDrop(s.x < 0 ? 'cash' : 'ammo');
        drop.position.set(s.x, 1.3, s.z);
        staged.add(drop);
        staged.drops.push(drop);
      } else {
        hud.enemies.push({ x: s.x, z: s.z });
      }
    }
    // frozen muzzle flash + bright tracer hero gun -> nearest enemy
    const flash = new MuzzleFlash(scene);
    staged.flash = flash;
    const tip = new THREE.Vector3(1.1, 1.35, 16.6);
    flash.show(tip, new THREE.Vector3(-0.25, 0.05, -1).normalize());
    const tracer = new Tracer(scene);
    staged.tracer = tracer;
    tracer.fire(tip, new THREE.Vector3(-1, 1.2, 2));
    pool.sparks(tip, 16);
    pool.blood(new THREE.Vector3(-1, 1.2, 2), 26);
    // police responding at the edges of the frame
    const pc1 = staged.add(buildCar({ kind: 'police' }));
    pc1.position.set(-14, 0, 26); pc1.rotation.y = Math.PI * 0.75;
    staged.animated.push({ update: (dt) => flashLightBar(pc1, dt) });
    units.push({ name: 'SBPD-7 BARA', short: 'SBPD-7', role: 'IN PURSUIT', x: -14, z: 26 });
    units.push({ name: 'SBPD-12 TANJUNG', short: 'SBPD-12', role: 'RAMMING', x: 14, z: 24 });
    const pc2 = staged.add(buildCar({ kind: 'police' }));
    pc2.position.set(14, 0, 24); pc2.rotation.y = Math.PI * 1.25;
    staged.animated.push({ update: (dt) => flashLightBar(pc2, dt) });
    hud.setPD(pdUnits(units.map((u) => [u.name, u.short, u.role, u.x, u.z])));
    hud.player = { x: 0.8, z: 17.5 };
    camera.position.set(0.5, 3.2, 24.5);
    camera.lookAt(0, 1.1, 6);
  }

  if (name === 'action3') {
    // M3 drive-by: hero car east lane, police car west lane, hero seated
    // INSIDE his car leaning out the left window toward the police car.
    const heroCar = staged.add(buildCar({ kind: 'sports', color: 0xd21f2b }));
    heroCar.position.set(3, 0, 41); heroCar.rotation.y = Math.PI;
    const policeCar = staged.add(buildCar({ kind: 'police' }));
    policeCar.position.set(-3, 0, 39); policeCar.rotation.y = Math.PI;
    staged.animated.push({ update: (dt) => flashLightBar(policeCar, dt) });
    const heli = staged.add(buildHeli());
    heli.position.set(3, 9, 38);
    staged.heli = heli;
    staged.animated.push({ update: (dt) => animateHeli(heli, dt) });
    // hero seated in the cabin: at the car's centre so the body + cabin hide
    // everything below his chest — only head + shoulders + gun arm show
    // above the window line, leaning out toward the police car (-X).
    const hero = staged.add(buildCharacter({ role: 'hero' }));
    hero.position.set(2.9, 0, 41.2);
    hero.rotation.y = -Math.PI / 2; // faces -X, toward the police car
    hero.rotation.z = -0.12; // lean out the window
    staged.hero = hero;
    // muzzle flash + tracer from the hero's gun tip to the police car
    const flash = new MuzzleFlash(scene);
    staged.flash = flash;
    const tip = new THREE.Vector3(2.15, 1.3, 41.2);
    flash.show(tip, new THREE.Vector3(-1, 0.02, -0.15).normalize());
    const tracer = new Tracer(scene);
    staged.tracer = tracer;
    tracer.fire(tip, new THREE.Vector3(-2.4, 1.0, 39.2));
    pool.sparks(tip, 16);
    // shattered glass near the police car door
    pool.glass(new THREE.Vector3(-2.2, 1.0, 39.5), 14);
    const units = [
      ['SBPD-7 BARA', 'SBPD-7', 'IN PURSUIT', -3, 39],
      ['SBPD-12 TANJUNG', 'SBPD-12', 'RAMMING', 6, 30],
      ['SBPD-19 KACA', 'SBPD-19', 'IN PURSUIT', -6, 50],
      ['SBPD-AIR ELANG', 'SBPD-AIR', 'AIR UNIT', 0, 46],
    ];
    hud.setPD(pdUnits(units));
    hud.player = { x: 3, z: 41 };
    camera.position.set(-6, 3.5, 52);
    camera.lookAt(1, 1, 40);
  }

  if (name === 'title') {
    const heroCar = staged.add(buildCar({ kind: 'sports', color: 0xd21f2b }));
    heroCar.position.set(0, 0, 10); heroCar.rotation.y = Math.PI * 0.92;
    const hero = staged.add(buildCharacter({ role: 'hero' }));
    hero.position.set(2.2, 0, 12); hero.rotation.y = -Math.PI * 0.35;
    staged.hero = hero;
    hud.setPD([]);
    hud.player = { x: 0, z: 10 };
    hud.showTitle(true);
    camera.position.set(6, 3, 26);
    camera.lookAt(0, 1.2, 0);
  }

  if (name === 'map') {
    // Full city map: aerial camera behind the panel; hero + police staged
    // ON real roads so PD distances and map markers are live.
    const heroCar = staged.add(buildCar({ kind: 'sports', color: 0xd21f2b }));
    heroCar.position.set(0, 0, 12); heroCar.rotation.y = Math.PI;
    const defs = [
      ['SBPD-7 BARA', 'SBPD-7', 'IN PURSUIT', 21, -21],
      ['SBPD-12 TANJUNG', 'SBPD-12', 'RAMMING', -42, 42],
      ['SBPD-19 KACA', 'SBPD-19', 'IN PURSUIT', 42, 0],
      ['SBPD-AIR ELANG', 'SBPD-AIR', 'AIR UNIT', -21, -42],
    ];
    for (const [nm, short, role, x, z] of defs) {
      if (short === 'SBPD-AIR') {
        const heli = staged.add(buildHeli());
        heli.position.set(x, 14, z);
        staged.heli = heli;
        staged.animated.push({ update: (dt) => animateHeli(heli, dt) });
      } else {
        const pc = staged.add(buildCar({ kind: 'police' }));
        pc.position.set(x, 0, z); pc.rotation.y = Math.PI * 0.75;
        staged.animated.push({ update: (dt) => flashLightBar(pc, dt) });
      }
    }
    hud.setPD(pdUnits(defs));
    hud.player = { x: 0, z: 12 };
    hud.routeTarget = { x: -88, z: 40, label: 'Dermaga Bara' };
    hud.setDistrict(districtAt(0, 12));
    camera.position.set(0, 70, 25);
    camera.lookAt(0, 0, 10);
  }

  hud.tick();
  return staged;
}
