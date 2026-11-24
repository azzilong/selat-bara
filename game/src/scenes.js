// Selat Bara — "Mode Bioskop": frozen cinematic staging for ?scene=action1/2/3/title.
// Every scene forces 12:00 midday, a fixed cinematic camera, exact spawns,
// full HUD, and a frozen dramatic frame (only rotors, light bars, drops and
// smoke keep moving — the action itself never advances).
import * as THREE from 'three';
import { buildSportsCar, buildPoliceCar, buildHelicopter, buildSedan, flashLightBar, animateHeli } from './vehicleBuilder.js';
import { buildHero, buildEnemy, buildDrop, buildBloodPool, poseFallen } from './characterBuilder.js';

// HUD state per scene. Distances in the police panel are computed live by
// the HUD from the staged police objects; the values here are the staged
// anchor positions.
export const SCENE_HUD = {
  action1: {
    mission: 'M1 · THE GETAWAY', stage: 'STAGE 1/3 · STEAL THE CAR',
    objective: 'Wreck the pursuers', next: 'Lose the heli', progress: 0.25,
    wanted: 3, wantedText: 'AIR UNIT DEPLOYED', money: 250, clock: '12:00',
    weapon: 'SMG', mag: 30, reserve: 90, health: 100, armour: 60,
    speed: 87, vehicle: 'SPORTS CAR', damage: '12% DENTED',
    district: 'PELABUHAN BARA', street: 'Dermaga Bara', standing: 'NEUTRAL', standingVal: 58,
    control: 'CONTROL: 3★ — units responding',
  },
  action2: {
    mission: 'M2 · THE BRUTAL SHOOTOUT', stage: 'STAGE 2/3 · CLEAR THE STREET',
    objective: 'Kill the gang', next: 'Vanish', progress: 0.5,
    wanted: 2, wantedText: 'UNITS RESPONDING', money: 250, clock: '12:00',
    weapon: 'SMG', mag: 11, reserve: 48, health: 72, armour: 45,
    speed: null, vehicle: null, damage: null,
    district: 'PASAR LAMA', street: 'Jalan Pasar Lama', standing: 'WARY', standingVal: 34,
    control: 'CONTROL: 2★ — units responding',
  },
  action3: {
    mission: 'M3 · HIGH SPEED CHASE', stage: 'STAGE 3/3 · LOSE THE HEAT',
    objective: 'Drive-by — lose the heat', next: 'Reach the docks', progress: 0.75,
    wanted: 3, wantedText: 'AIR UNIT DEPLOYED', money: 250, clock: '12:00',
    weapon: 'SMG', mag: 24, reserve: 90, health: 88, armour: 50,
    speed: 112, vehicle: "RAKA'S SPORTS CAR", damage: '18% DENTED',
    district: 'KOTA TUA', street: 'Jalan Kota Tua', standing: 'NEUTRAL', standingVal: 47,
    control: 'CONTROL: 3★ — air unit deployed',
  },
  title: {
    mission: null, wanted: 0, money: 250, clock: '12:00',
    district: 'PELABUHAN BARA', street: 'Dermaga Bara', standing: 'NEUTRAL', standingVal: 58,
  },
  map: {
    mission: 'M1 · THE GETAWAY', stage: 'STAGE 1/3 · STEAL THE CAR',
    objective: 'Reach the docks', next: 'Lose the heli', progress: 0.4,
    wanted: 3, wantedText: 'AIR UNIT DEPLOYED', money: 250, clock: '12:00',
    weapon: 'SMG', mag: 30, reserve: 90, health: 100, armour: 60,
    speed: null, vehicle: null, damage: null,
    district: 'PELABUHAN BARA', street: 'Dermaga Bara', standing: 'NEUTRAL', standingVal: 58,
    control: 'CONTROL: 3★ — units responding',
  },
};

function policeCarAt(x, z, ry = 0) {
  const c = buildPoliceCar();
  c.position.set(x, 0, z);
  c.rotation.y = ry;
  return c;
}

export function stageScene(name, ctx) {
  const { scene, camera, rig, particles, flash, tracer } = ctx;
  const staged = new THREE.Group();
  scene.add(staged);
  const police = []; // { name, role, obj }
  const drops = [];
  const helis = [];
  const smokeSpots = [];
  let flashJob = null; // { pos, dir, target } re-fired every frame (frozen flash)
  let tracerJob = null; // { from, to }
  let playerPos = new THREE.Vector3(0, 0, 12);
  let routeTarget = null; // mission target for the gold route (map scene)

  const addPolice = (name, role, x, z, ry = 0) => {
    const c = policeCarAt(x, z, ry);
    staged.add(c);
    police.push({ name, role, obj: c });
    return c;
  };

  if (name === 'action1') {
    // The getaway: hero sports car mid-road, 3 police closing in, one
    // crashed car smoking, heli overhead with its beam on the road.
    const heroCar = buildSportsCar(0xd42a1e);
    heroCar.position.set(0, 0, 12);
    staged.add(heroCar);
    playerPos = heroCar.position;
    addPolice('SBPD-7 BARA', 'IN PURSUIT', 2.0, 19);
    addPolice('SBPD-12 TANJUNG', 'IN PURSUIT', -4.6, 17);
    addPolice('SBPD-19 KACA', 'RAMMING', 4.8, 14.5);
    const crash = buildSedan(0xe86a1a);
    crash.position.set(-1.5, 0, 4);
    crash.rotation.set(0, 0.5, 0.1);
    staged.add(crash);
    smokeSpots.push(new THREE.Vector3(-1.5, 1.1, 2.2));
    const heli = buildHelicopter();
    heli.position.set(2, 11, 2);
    staged.add(heli);
    helis.push(heli);
    police.push({ name: 'SBPD-AIR ELANG', role: 'AIR UNIT', obj: heli });
    rig.snap([6.5, 4, 28], [0, 1.5, 4], 60);
  } else if (name === 'action2') {
    // The brutal shootout: hero behind a wrecked car, 4 gang gunmen across
    // the street, 2 already down with drops + blood pools, frozen flash.
    const wreck = buildSedan(0x5a6068);
    wreck.position.set(-1.2, 0, 13);
    wreck.rotation.y = 0.35;
    staged.add(wreck);
    const hero = buildHero();
    hero.position.set(1.6, 0, 16.5);
    hero.rotation.y = 0; // faces -Z, at the gang
    staged.add(hero);
    playerPos = hero.position;
    const gangSpots = [[-4, 0], [-1.5, -1], [1.5, -2], [4, 1]];
    const gang = [];
    for (const [gx, gz] of gangSpots) {
      const e = buildEnemy();
      e.position.set(gx, 0, gz);
      e.rotation.y = Math.PI; // faces +Z, at the hero
      staged.add(e);
      gang.push(e);
    }
    // two fallen gunmen + blood pools + drops
    const fallenSpots = [[2.5, 4, 'cash'], [-2.5, 2.5, 'ammo']];
    for (const [fx, fz, kind] of fallenSpots) {
      const f = buildEnemy();
      f.position.set(fx, 0, fz);
      f.rotation.y = Math.PI / 2;
      poseFallen(f);
      staged.add(f);
      const pool = buildBloodPool();
      pool.position.set(fx, 0.02, fz);
      staged.add(pool);
      const drop = buildDrop(kind);
      drop.position.set(fx, 1.3, fz);
      staged.add(drop);
      drops.push(drop);
      particles.blood(new THREE.Vector3(fx, 0.4, fz), true);
    }
    // frozen muzzle flash + tracer + blood at the hit gunman
    const muzzle = new THREE.Vector3(1.95, 1.35, 15.5);
    const hit = new THREE.Vector3(-1.5, 1.2, -1);
    flashJob = { pos: muzzle, dir: hit.clone().sub(muzzle).normalize() };
    tracerJob = { from: muzzle, to: hit };
    particles.blood(hit, true);
    particles.sparks(muzzle);
    // one distant unit for the response panel's live distance
    addPolice('SBPD-7 BARA', 'RESPONDING', 5, -14, Math.PI);
    rig.snap([0.5, 3.2, 24.5], [0, 1.0, -2], 60);
  } else if (name === 'action3') {
    // Drive-by: hero car + police car side by side, hero leaning OUT of
    // his window (seated inside the cabin, only head/torso/gun arm above
    // the window line), heli overhead, frozen flash + tracer + glass.
    const heroCar = buildSportsCar(0xd42a1e);
    heroCar.position.set(3, 0, 43);
    staged.add(heroCar);
    playerPos = heroCar.position;
    addPolice('SBPD-12 TANJUNG', 'IN PURSUIT', -3.2, 41.5);
    // hero seated INSIDE the car: sunk into the cabin (y -0.15), just
    // inside the left edge, leaning toward the police car (-X).
    const seat = new THREE.Group();
    seat.position.set(2.2, -0.05, 42.6);
    seat.rotation.y = Math.PI / 2; // faces -X, at the police car
    const hero = buildHero();
    hero.rotation.z = 0.4; // lean out toward the police car
    seat.add(hero);
    staged.add(seat);
    const muzzle = new THREE.Vector3(0.9, 1.15, 42.4);
    const hit = new THREE.Vector3(-2.4, 1.0, 41.8);
    flashJob = { pos: muzzle, dir: hit.clone().sub(muzzle).normalize() };
    tracerJob = { from: muzzle, to: hit };
    particles.glass(new THREE.Vector3(-2.5, 1.2, 41.8));
    particles.sparks(muzzle);
    const heli = buildHelicopter();
    heli.position.set(0, 6.8, 40);
    staged.add(heli);
    helis.push(heli);
    police.push({ name: 'SBPD-AIR ELANG', role: 'AIR UNIT', obj: heli });
    const far = buildSedan(0x1a1a1a);
    far.position.set(1, 0, 10);
    staged.add(far);
    rig.snap([-5.5, 3.4, 55], [0, 1.2, 40], 60);
  } else if (name === 'map') {
    // Full city map: oblique aerial behind the big-map panel. Hero car +
    // 3 police + heli staged ON real roads (so the PD panel distances and
    // the big-map markers are live); the mission target is the docks —
    // the gold route's end, labelled on the map.
    const heroCar = buildSportsCar(0xd42a1e);
    heroCar.position.set(0, 0, 12);
    staged.add(heroCar);
    playerPos = heroCar.position;
    addPolice('SBPD-7 BARA', 'IN PURSUIT', 21, -21);
    addPolice('SBPD-12 TANJUNG', 'IN PURSUIT', -42, 42);
    addPolice('SBPD-19 KACA', 'RAMMING', 42, 0);
    const heli = buildHelicopter();
    heli.position.set(-21, 14, -42);
    staged.add(heli);
    helis.push(heli);
    police.push({ name: 'SBPD-AIR ELANG', role: 'AIR UNIT', obj: heli });
    routeTarget = new THREE.Vector3(-88, 0, 40);
    rig.snap([0, 70, 25], [0, 0, 0], 55);
  } else {
    // title: bright midday avenue, hero car centre, police + sedan flanking
    const heroCar = buildSportsCar(0xd42a1e);
    heroCar.position.set(0, 0, 10);
    staged.add(heroCar);
    const pc = policeCarAt(-8, 14, 0);
    staged.add(pc);
    const sedan = buildSedan(0x2e6fb0);
    sedan.position.set(8, 0, 16);
    staged.add(sedan);
    const hero = buildHero();
    hero.position.set(1.8, 0, 12.5);
    hero.rotation.y = Math.PI;
    staged.add(hero);
    rig.snap([0, 4, 34], [0, 2.5, -20], 58);
  }

  let smokeTimer = 0;
  function update(dt, t) {
    for (const h of helis) animateHeli(h, dt, t);
    for (const p of police) {
      if (p.obj.userData.lightBar) flashLightBar(p.obj, t);
    }
    for (const d of drops) {
      d.position.y = d.userData.baseY + Math.sin(t * 2 + d.position.x) * 0.08;
      // billboard: face the camera, stay upright
      d.rotation.y = Math.atan2(camera.position.x - d.position.x, camera.position.z - d.position.z);
    }
    if (flashJob) flash.show(flashJob.pos, flashJob.dir);
    if (tracerJob) tracer.fire(tracerJob.from, tracerJob.to);
    smokeTimer += dt;
    if (smokeTimer > 0.25) {
      smokeTimer = 0;
      for (const s of smokeSpots) particles.smoke(s, 8);
    }
  }

  return { staged, police, playerPos, routeTarget, hud: SCENE_HUD[name] || SCENE_HUD.title, update };
}
