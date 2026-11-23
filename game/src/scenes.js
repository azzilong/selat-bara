// SELAT BARA — "Mode Bioskop" scene staging (step 6).
// Re-written in-session under recording 8 (gta6-01, 2026-11-24).
// ?scene=action1/2/3/title stages an exact, FROZEN dramatic frame:
// vehicles and NPCs spawned exactly as the brief describes, cinematic
// camera, full HUD, no random gameplay. The render loop keeps drawing
// the same frame (light bars keep flashing); nothing moves, so the
// screenshot is never blurred.
//
// REBUILD FIXES (user feedback 2026-11-24 ~02:56-03:00 WIB):
// #1 heli lowered into frame in action1 (was 33 deg above horizontal,
//     above the frame top — only the beam showed).
// #2 police light bars are bigger/brighter (see vehicleBuilder.js).
// #3 action2: bigger muzzle flash + light, more blood, bodies in frame.
// #4 action3: hero SEATED INSIDE the car — legs hidden in the cabin,
//     only head + torso + gun arm above the window line, leaning out
//     toward the police car (was a full figure floating at door height).
// #5 bullet tracer + muzzle sparks visible in action2 and action3.
// #6 a floating drop (cash/ammo + glow ring) above every fallen enemy.
import * as THREE from 'three';
import {
  buildSportsCar, buildPoliceCar, buildHelicopter, buildSedan,
  flashLightBar, animateHeli,
} from './vehicleBuilder.js';
import {
  buildHero, buildEnemy, buildPolice, layFallen, buildDrop, dropRing,
} from './characterBuilder.js';

// helpers ---------------------------------------------------------------
function place(obj, x, z, ry) {
  obj.position.set(x, obj.position.y, z);
  obj.rotation.y = ry;
  return obj;
}

// Drop helper: float a loot drop above a fallen enemy + a glow ring on
// the ground below it. Registered in ctx.drops so updateStaged bobs it.
function addDrop(ctx, x, z, kind) {
  const d = buildDrop(kind);
  d.position.set(x, 1.15, z);
  d.scale.setScalar(1.4); // read clearly from across the street
  d.userData.baseY = 1.15;
  d.userData.phase = Math.random() * Math.PI * 2;
  ctx.scene.add(d);
  const ring = dropRing(kind === 'cash' ? 0x7dff8a : 0xffd24a);
  ring.position.set(x, 0.06, z);
  ctx.scene.add(ring);
  (ctx.drops = ctx.drops || []).push(d);
  return d;
}

// --- SCENE 1: "The Getaway" ---------------------------------------------
// Hero sports car on the main east-west avenue, 3 police cars in pursuit,
// heli overhead with the spotlight beam, one police car crashed into a
// building corner with grey smoke, tyre smoke at the hero's rear wheels.
// Camera: low chase behind the hero car.
// REBUILD FIX #1: heli now at (2, 12.5, 0) — ~17 deg above horizontal
// from the camera, inside the ~24 deg frame top — the helicopter itself
// is visible in the chase shot, beam still hitting the road.
export function stageAction1(ctx) {
  const { scene, camera } = ctx;
  // Hero flees NORTH (-Z) down the main avenue; police chase from
  // behind (south), camera sits behind the pursuit — hero ahead,
  // police between camera and hero, all in frame.
  const heroCar = buildSportsCar();
  heroCar.position.set(0, 0, 8);
  heroCar.rotation.y = 0; // facing -Z
  scene.add(heroCar);
  const hero = buildHero();
  hero.position.set(0, 0, 8);
  hero.visible = false; // hero is driving; the car is the subject
  scene.add(hero);

  const police = [];
  const spots = [[-3.4, 16, 0.12], [3.4, 20, -0.1], [-0.8, 25, 0]];
  for (const [x, z, ry] of spots) {
    const p = buildPoliceCar();
    place(p, x, z, ry);
    scene.add(p);
    police.push(p);
  }
  // crashed police car: nose into the building corner on the road edge,
  // smoke from the hood — staged on the RIGHT side so it does not hide
  // behind the pursuit cars (rebuild framing fix, seen in the render).
  const crashed = buildPoliceCar();
  crashed.position.set(6.4, 0, 13);
  crashed.rotation.y = -Math.PI * 0.62;
  scene.add(crashed);
  police.push(crashed);
  ctx.particles.smoke(new THREE.Vector3(7.4, 1.1, 11.2), 26);
  ctx.particles.tireSmoke(new THREE.Vector3(-1.2, 0.25, 10.5), 14);
  ctx.particles.tireSmoke(new THREE.Vector3(1.2, 0.25, 10.5), 14);

  const heli = buildHelicopter();
  heli.position.set(2, 12.5, 0);
  heli.rotation.y = 0.6;
  scene.add(heli);
  ctx.heli = heli;

  camera.position.set(6.5, 4.0, 28);
  camera.lookAt(-1, 1.5, 4);
  camera.fov = 60;
  camera.updateProjectionMatrix();

  ctx.hud.setMission('M1 · THE GETAWAY', 'Wreck the pursuers');
  ctx.hud.setWanted(3);
  ctx.hud.setHealth(100);
  ctx.hud.setArmour(60);
  ctx.hud.setAmmo('SMG', 30, 90);
  ctx.hud.setSpeed(87);
  ctx.hud.showTitle(false);
  ctx.frozen = true;
  ctx.policeCars = police;
  ctx.heroCar = heroCar;
  return { name: 'action1' };
}

// --- SCENE 2: "The Brutal Shootout" --------------------------------------
// Hero behind a wrecked car on the main avenue, firing across the street
// at 4 armed syndicate enemies; muzzle flash frozen at the gun tip,
// blood particles frozen mid-air, 2 enemies already fallen.
// Camera: over-the-shoulder, hero fills 1/3 of the frame.
// REBUILD FIX #3: big starburst flash + flash light, bloodBig splashes
// on both hit points and by the fallen bodies.
// REBUILD FIX #5: a bright yellow tracer beam from the gun tip to the
// far enemy + a spark burst at the muzzle.
// REBUILD FIX #6: a cash drop floats above one fallen enemy, an ammo
// drop above the other, each with a glow ring on the ground.
// (Also fixed: the hero now actually FACES the enemies — rotation.y 0,
//  facing -Z; the old build had him turned away from the street.)
export function stageAction2(ctx) {
  const { scene, camera } = ctx;
  // wrecked cover car, angled like a wreck; hero fires AROUND its side
  // (not hidden behind it), enemies close across the street.
  const wreck = buildSedan(0x5a6068); // wrecked car, mid-grey so it reads
  wreck.position.set(0, 0, 6);
  wreck.rotation.y = Math.PI * 0.14;
  scene.add(wreck);
  ctx.particles.smoke(new THREE.Vector3(0, 1.0, 4.2), 22);

  const hero = buildHero();
  hero.position.set(2.4, 0, 7.8);
  hero.rotation.y = 0; // facing -Z across the street, at the enemies
  // aim pose: gun raised to shoulder height, right arm pointing forward
  const j = hero.userData.joints;
  j.gun.position.set(0.28, 1.05, -0.3);
  j.armR.rotation.x = -1.2;
  j.armL.rotation.x = -0.5;
  scene.add(hero);
  ctx.hero = hero;

  // muzzle flash + tracer + sparks frozen at the hero's gun tip
  const tip = new THREE.Vector3(2.68, 1.1, 6.9);
  const aim = new THREE.Vector3(-2, 1.2, -11);
  const dir = aim.clone().sub(tip).normalize();
  ctx.flash.fire(tip, dir);
  ctx.flash.life = 999; // keep it visible in the frozen frame
  ctx.tracer.fire(tip, aim);
  ctx.tracer.life = 999;
  ctx.particles.sparks(tip, dir, 24);
  // blood where the shots land + by the fallen bodies
  ctx.particles.bloodBig(new THREE.Vector3(-2, 1.2, -11), 26);
  ctx.particles.bloodBig(new THREE.Vector3(2.5, 1.1, -12), 20);
  ctx.particles.bloodBig(new THREE.Vector3(2.5, 0.5, -10.5), 14);
  ctx.particles.bloodBig(new THREE.Vector3(5, 0.5, -11.5), 14);

  // 4 armed enemies across the street; 2 standing and firing, 2 fallen
  const enemies = [];
  const eSpots = [[-4.5, -11, 0], [-1, -12, 0], [2.5, -10.5, 0], [5, -11.5, 0]];
  eSpots.forEach(([x, z], i) => {
    const e = buildEnemy();
    if (i < 2) {
      e.position.set(x, 0, z);
      e.rotation.y = 0; // facing the hero (+Z)
      scene.add(e);
      enemies.push(e);
    } else {
      layFallen(e);
      e.position.set(x, 0.28, z);
      e.rotation.y = i * 0.7;
      scene.add(e);
    }
  });
  // drops floating above the two fallen enemies (fix #6)
  addDrop(ctx, 2.5, -10.5, 'cash');
  addDrop(ctx, 5, -11.5, 'ammo');
  // a police car arriving at the far end, lights flashing
  const p = buildPoliceCar();
  p.position.set(8, 0, -18);
  p.rotation.y = Math.PI * 0.5;
  scene.add(p);
  ctx.policeCars = [p];

  camera.position.set(2.0, 2.4, 14.5);
  camera.lookAt(-2.5, 1.2, -11);
  camera.fov = 60;
  camera.updateProjectionMatrix();

  ctx.hud.setMission('M2 · THE BRUTAL SHOOTOUT', 'Kill the gang');
  ctx.hud.setWanted(2);
  ctx.hud.setHealth(72);
  ctx.hud.setArmour(45);
  ctx.hud.setAmmo('SMG', 11, 48);
  ctx.hud.setSpeed(null);
  ctx.hud.showTitle(false);
  ctx.frozen = true;
  return { name: 'action2' };
}

// --- SCENE 3: "High Speed Chase" (drive-by) -------------------------------
// Hero sports car parallel with a police car on the wide main avenue,
// hero leaning out of the window firing — muzzle flash + shattered
// glass frozen mid-air. Camera: low side view, both cars in frame.
// Staging is UNCHANGED from the previous build (user never picked a
// restage option); only fixes #4 and #5 land here.
// REBUILD FIX #4: the hero is now SEATED INSIDE the car — his feet at
// y=0, legs hidden inside the body/cabin, only head + torso + gun arm
// above the window line, leaning forward toward the police car
// (rotation.y -PI/2 faces +X, toward the police; torso/head lean
// forward in local space). The old build stood a full 1.8u figure at
// door height on the car's edge, which read as pasted onto the door.
// REBUILD FIX #5: tracer beam + sparks from the gun tip to the police car.
export function stageAction3(ctx) {
  const { scene, camera } = ctx;
  // Both cars head NORTH (-Z) on the wide main avenue, staged mid-block
  // (z ~ 42, clear of the intersection traffic-light poles): hero in
  // the left lane, police in the right lane. Hero leans out the RIGHT
  // window (facing +X, toward the police car) and fires. Camera sits
  // ahead and to the right — front three-quarter view of both cars.
  const heroCar = buildSportsCar();
  heroCar.position.set(-3.4, 0, 42);
  heroCar.rotation.y = 0; // facing -Z
  scene.add(heroCar);
  ctx.heroCar = heroCar;

  const police = buildPoliceCar();
  police.position.set(3.2, 0, 44);
  police.rotation.y = 0;
  scene.add(police);
  ctx.policeCars = [police];

  // hero seated INSIDE the car, leaning out the right window
  const hero = buildHero();
  hero.position.set(-2.75, 0, 41.4); // inside the cabin (x -4.2..-2.6)
  hero.rotation.y = -Math.PI / 2; // turned toward the police car (+X)
  const hj = hero.userData.joints;
  hj.torso.rotation.x = -0.3; // lean forward, out of the window
  hj.head.rotation.x = -0.3;
  hj.armR.rotation.x = -1.3; // gun arm forward toward the police car
  hj.armL.rotation.x = -0.6;
  hj.gun.position.set(0.3, 1.25, -0.35); // gun above the window line
  scene.add(hero);
  ctx.hero = hero;

  const tip = new THREE.Vector3(-2.2, 1.3, 41.7);
  const aim = new THREE.Vector3(3.2, 1.0, 43.5);
  const dir3 = aim.clone().sub(tip).normalize();
  ctx.flash.fire(tip, dir3);
  ctx.flash.life = 999;
  ctx.tracer.fire(tip, aim);
  ctx.tracer.life = 999;
  ctx.particles.sparks(tip, dir3, 24);
  ctx.particles.glass(new THREE.Vector3(2.2, 1.3, 43.2), 20);
  ctx.particles.bloodBig(new THREE.Vector3(3.2, 1.1, 43.8), 16);
  ctx.particles.tireSmoke(new THREE.Vector3(-4.4, 0.25, 45), 10);
  ctx.particles.tireSmoke(new THREE.Vector3(4.2, 0.25, 47), 10);

  // heli: at (-2, 7.5, 46) — above the road ahead of the cars, near
  // the frame's top centre (~25 deg above the view axis, ~13 deg off
  // centre), so it is actually in the shot. The earlier spots
  // (-10, 10, 42) and (-10, 8, 42) both sat just outside the top-left
  // corner once the camera shifted left — the render said "no heli"
  // twice, so the heli moved to where the frame is.
  const heli = buildHelicopter();
  heli.position.set(-2, 7.5, 46);
  heli.rotation.y = -0.5;
  scene.add(heli);
  ctx.heli = heli;

  // Camera shifted left (x -5) so it sees the hero car's RIGHT side —
  // the side the hero leans out of — instead of only the cars' rears.
  // The drive-by staging itself (cars, road, positions) is unchanged.
  camera.position.set(-5, 3.2, 31);
  camera.lookAt(0, 1.2, 42);
  camera.fov = 60;
  camera.updateProjectionMatrix();

  ctx.hud.setMission('M3 · HIGH SPEED CHASE', 'Drive-by — lose the heat');
  ctx.hud.setWanted(3);
  ctx.hud.setHealth(88);
  ctx.hud.setArmour(50);
  ctx.hud.setAmmo('SMG', 24, 90);
  ctx.hud.setSpeed(112);
  ctx.hud.showTitle(false);
  ctx.frozen = true;
  return { name: 'action3' };
}

// --- TITLE: bright midday city, hero car + skyline, title overlay --------
export function stageTitle(ctx) {
  const { scene, camera } = ctx;
  const heroCar = buildSportsCar();
  heroCar.position.set(0, 0, 14);
  heroCar.rotation.y = Math.PI * 0.85;
  scene.add(heroCar);
  ctx.heroCar = heroCar;

  const hero = buildHero();
  hero.position.set(2.2, 0, 15.5);
  hero.rotation.y = -0.6;
  scene.add(hero);
  ctx.hero = hero;

  const p1 = buildPoliceCar();
  p1.position.set(-14, 0, 22);
  p1.rotation.y = Math.PI * 1.1;
  scene.add(p1);
  const p2 = buildSedan(0x2e86c1);
  p2.position.set(9, 0, 30);
  p2.rotation.y = Math.PI * 0.9;
  scene.add(p2);
  ctx.policeCars = [p1];

  camera.position.set(0, 8, 44);
  camera.lookAt(0, 2, -10);
  camera.fov = 60;
  camera.updateProjectionMatrix();

  ctx.hud.setMission('', '');
  ctx.hud.setWanted(0);
  ctx.hud.setHealth(100);
  ctx.hud.setArmour(100);
  ctx.hud.setAmmo('SMG', 30, 90);
  ctx.hud.setSpeed(null);
  ctx.hud.showTitle(true);
  ctx.frozen = true;
  return { name: 'title' };
}

// dispatch by URL param
export function stageScene(name, ctx) {
  if (name === 'action1') return stageAction1(ctx);
  if (name === 'action2') return stageAction2(ctx);
  if (name === 'action3') return stageAction3(ctx);
  return stageTitle(ctx);
}

// per-frame upkeep for staged scenes (light bars flash, rotors spin,
// drops bob). Runs in the frozen loop, so the frame stays dramatic
// but never blurs.
export function updateStaged(ctx, dt, time) {
  if (ctx.policeCars) {
    const phase = Math.floor(time * 4);
    for (const p of ctx.policeCars) flashLightBar(p, phase);
  }
  if (ctx.heli) animateHeli(ctx.heli, dt * 0.25); // slow rotor in frozen shots
  if (ctx.drops) {
    for (const d of ctx.drops) {
      d.position.y = d.userData.baseY + Math.sin(time * 2 + d.userData.phase) * 0.12;
      d.rotation.y += dt * 1.2;
    }
  }
}
