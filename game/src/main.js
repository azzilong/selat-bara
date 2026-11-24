// main.js — SELAT BARA. Bootstrap, free-roam loop (walk/drive/shoot,
// 3 missions, wanted + police pursuit + heli, enemy AI, busted/
// respawn, money, clock), and Mode Bioskop scene staging via
// ?scene=action1|action2|action3|map|title. Bright midday lighting is
// MANDATED: HemisphereLight(0x87CEEB, 0xE0C090, 0.8),
// DirectionalLight(0xFFF8E7, 1.5, castShadow), bg 0x87CEEB,
// Fog(0x87CEEB, 60, 200), MeshLambertMaterial everywhere.
import * as THREE from 'three';
import { buildCity, updateCity, districtAt } from './city.js';
import { buildSportsCar, buildPoliceCar, buildHelicopter, flashLightBar, animateHeli, animateWheels } from './vehicleBuilder.js';
import { buildHero, buildEnemy, buildPolice, animateWalk } from './characterBuilder.js';
import { CarController, FootController, CameraRig } from './physics.js';
import { ParticlePool, MuzzleFlash, Tracer, shoot, smokePuff } from './weapons.js';
import { SCENE_HUD, stageScene, policeUnits } from './scenes.js';
import { HUD } from './hud.js';

export const SCENES = ['action1', 'action2', 'action3', 'map', 'title'];
const params = new URLSearchParams(location.search);
const sceneName = params.get('scene') || '';
const sceneMode = SCENES.includes(sceneName);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1280, 720);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 60, 200);
const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.1, 400);
camera.position.set(0, 5, 30);

const hemi = new THREE.HemisphereLight(0x87ceeb, 0xe0c090, 0.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff8e7, 1.5);
sun.position.set(40, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -110;
sun.shadow.camera.right = 110;
sun.shadow.camera.top = 110;
sun.shadow.camera.bottom = -110;
scene.add(sun);

const city = buildCity(scene);
const hud = new HUD();
const weapons = {
  particles: new ParticlePool(scene),
  flash: new MuzzleFlash(scene),
  tracer: new Tracer(scene),
};
const rig = new CameraRig(camera);

// --- input ---
const input = { forward: false, back: false, left: false, right: false, shoot: false };
const KEYMAP = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) input[KEYMAP[e.code]] = true;
  if (e.code === 'Space') input.shoot = true;
  if (e.code === 'KeyE' && !sceneMode) tryEnterCar();
  if (e.code === 'KeyR') hud.setMapMode(!hud.mapMode);
});
addEventListener('keyup', (e) => {
  if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false;
  if (e.code === 'Space') input.shoot = false;
});
addEventListener('mousedown', () => { if (!sceneMode) input.shoot = true; });
addEventListener('mouseup', () => { input.shoot = false; });

// --- game state (free roam) ---
const state = {
  started: false, inCar: false, wanted: 0, money: 250, health: 100, armour: 50,
  ammo: { pistol: 12, smg: 30 }, weapon: 'smg', mission: 1, clock: 12 * 60,
};
const hero = buildHero();
hero.position.set(0, 0, 14);
scene.add(hero);
const heroCar = buildSportsCar();
heroCar.position.set(0, 0, 12);
heroCar.rotation.y = Math.PI;
scene.add(heroCar);
const carCtl = new CarController(heroCar);
const footCtl = new FootController(hero);
const police = [];
const heli = buildHelicopter();
heli.visible = false;
scene.add(heli);
const enemies = [];
for (let i = 0; i < 4; i++) {
  const e = buildEnemy();
  e.position.set(-12 + i * 8, 0, -30 - i * 6);
  scene.add(e);
  enemies.push(e);
}
const clockEl = document.getElementById('clock');

function tryEnterCar() {
  if (state.inCar) return;
  if (hero.position.distanceTo(heroCar.position) < 4) {
    state.inCar = true;
    hero.visible = false;
  }
}
function exitCar() {
  state.inCar = false;
  hero.visible = true;
  hero.position.copy(heroCar.position).add(new THREE.Vector3(2.5, 0, 0));
}

// --- wanted / police pursuit (free roam) ---
function spawnPolice(n) {
  while (police.length < n) {
    const p = buildPoliceCar();
    const a = Math.random() * Math.PI * 2;
    p.position.set(heroCar.position.x + Math.sin(a) * 30, 0, heroCar.position.z + Math.cos(a) * 30);
    scene.add(p);
    police.push(p);
  }
  while (police.length > n) scene.remove(police.pop());
}
function updatePolice(dt) {
  const target = state.inCar ? heroCar.position : hero.position;
  for (const p of police) {
    const dir = new THREE.Vector3().subVectors(target, p.position);
    dir.y = 0;
    const d = dir.length();
    if (d > 0.1) {
      dir.normalize();
      p.rotation.y = Math.atan2(dir.x, dir.z);
      p.position.addScaledVector(dir, Math.min(9, d) * dt);
    }
    flashLightBar(p, dt);
  }
  if (state.wanted >= 3) {
    heli.visible = true;
    heli.position.set(target.x + 6, 12, target.z - 8);
    animateHeli(heli, dt);
  } else heli.visible = false;
}
function fmtClock() {
  const h = Math.floor(state.clock / 60) % 24;
  const m = Math.floor(state.clock % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// --- Mode Bioskop: frozen staged scene ---
if (sceneMode) {
  // hide the free-roam hero + hero car so they never block the frame,
  // and freeze city traffic + pedestrians out of the staged shots too
  // (a traffic sedan sat in front of the action1 camera in round 11).
  hero.visible = false;
  heroCar.visible = false;
  for (const e of enemies) e.visible = false;
  for (const tr of city.animated.traffic) tr.mesh.visible = false;
  for (const pd of city.animated.pedestrians) pd.mesh.visible = false;
  const staged = stageScene(sceneName, { scene, camera, weapons });
  const d = SCENE_HUD[sceneName];
  hud.setScene(d, { units: staged.units, routeTarget: staged.routeTarget, heroPos: staged.heroPos, mapMode: staged.mapMode, frozen: true });
  document.getElementById('title-overlay').style.display = sceneName === 'title' ? 'flex' : 'none';
  document.getElementById('hud').style.display = 'block';
  // drops billboard to the camera so the "$" / bullet can never turn away
  const drops = staged.drops || [];
  const clock = new THREE.Clock();
  let rendered = false;
  function stageLoop() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    for (const drop of drops) {
      drop.position.y = 1.3 + Math.sin(t * 2 + drop.position.x) * 0.12;
      drop.lookAt(camera.position);
    }
    for (const u of staged.units) {
      if (u.mesh && u.mesh.userData.kind === 'heli') animateHeli(u.mesh, dt);
      if (u.mesh && u.mesh.userData.lightBar) flashLightBar(u.mesh, dt);
    }
    updateCity(city, t, dt);
    weapons.particles.update(dt);
    weapons.flash.update(0); // frozen: flash stays on
    weapons.tracer.update(0);
    hud.tick();
    renderer.render(scene, camera);
    if (!rendered) {
      rendered = true;
      window.__ready = true;
      document.title = 'SELAT BARA';
    }
    requestAnimationFrame(stageLoop);
  }
  stageLoop();
} else {
  // --- free roam ---
  document.getElementById('title-overlay').style.display = 'flex';
  document.getElementById('hud').style.display = 'none';
  addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && !state.started) {
      state.started = true;
      document.getElementById('title-overlay').style.display = 'none';
      document.getElementById('hud').style.display = 'block';
    }
    if (e.code === 'KeyF' && state.inCar) exitCar();
    if (e.code === 'Digit1') state.weapon = 'fists';
    if (e.code === 'Digit2') state.weapon = 'pistol';
    if (e.code === 'Digit3') state.weapon = 'smg';
  });
  const clock = new THREE.Clock();
  let rendered = false;
  let shootCooldown = 0;
  function loop() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    state.clock = (12 * 60 + t * 0.5) % (24 * 60);
    if (state.started) {
      if (state.inCar) {
        const sp = carCtl.update(dt, input);
        heroCar.userData.speed = sp;
        animateWheels(heroCar, dt, sp);
        rig.followCar(heroCar, dt);
      } else {
        footCtl.update(dt, input, hero.rotation.y);
        animateWalk(hero, t, footCtl.speed > 0 ? 1 : 0);
        rig.followFoot(hero, dt);
      }
      shootCooldown -= dt;
      if (input.shoot && shootCooldown <= 0 && state.weapon !== 'fists') {
        shootCooldown = 0.22;
        const from = new THREE.Vector3().copy(hero.position).add(new THREE.Vector3(0, 1.4, -0.5));
        if (state.inCar) from.copy(heroCar.position).add(new THREE.Vector3(0, 1.3, -2));
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(state.inCar ? heroCar.quaternion : hero.quaternion);
        const target = from.clone().addScaledVector(fwd, 18);
        shoot(weapons, from, target, { blood: false });
        if (state.ammo[state.weapon] > 0) state.ammo[state.weapon]--;
        if (state.wanted < 3) state.wanted = Math.min(3, state.wanted + 1);
      }
      spawnPolice(state.wanted);
      updatePolice(dt);
      for (const e of enemies) {
        e.rotation.y += dt * 0.4;
        if (Math.random() < dt * 0.2) e.position.x += (Math.random() - 0.5) * 2;
      }
      // HUD (live values)
      const dist = districtAt(state.inCar ? heroCar.position.x : hero.position.x, state.inCar ? heroCar.position.z : hero.position.z);
      const live = {
        mission: `M${state.mission} · ${['THE GETAWAY', 'THE BRUTAL SHOOTOUT', 'HIGH SPEED CHASE'][state.mission - 1]}`,
        objective: ['Lose the heli — reach the docks', 'Kill the Gang — clear the street', 'Drive-by — take out the patrol car'][state.mission - 1],
        stage: `STAGE ${state.mission}/3 · ${['STEAL THE CAR', 'CLEAR THE STREET', 'LOSE THE HEAT'][state.mission - 1]}`,
        next: ['NEXT Lose the heli', 'NEXT Vanish', 'NEXT Reach the docks'][state.mission - 1],
        progress: 0.1 + state.mission * 0.2,
        district: dist.name, street: dist.street, standing: dist.standing, standingVal: dist.standingVal,
        wanted: state.wanted, wantedText: ['', 'PATROL ALERTED', 'UNITS RESPONDING', 'AIR UNIT DEPLOYED'][state.wanted],
        money: state.money, clock: fmtClock(),
        weapon: state.weapon.toUpperCase(), ammo: state.weapon === 'fists' ? '∞' : `${state.ammo[state.weapon]}/${state.weapon === 'smg' ? 90 : 48}`,
        slot: state.weapon === 'fists' ? 1 : state.weapon === 'pistol' ? 2 : 3,
        speed: state.inCar ? Math.round(Math.abs(carCtl.speed) * 3.6) : 0,
        vehicle: state.inCar ? "RAKA'S SPORTS CAR" : '', damage: state.inCar ? 12 : 0,
      };
      const units = policeUnits();
      police.forEach((p, i) => {
        if (units[i]) { units[i].pos.copy(p.position); units[i].mesh = p; }
      });
      if (heli.visible && units[3]) { units[3].pos.copy(heli.position); units[3].mesh = heli; }
      hud.setScene(live, { units: police.length ? units.slice(0, Math.max(1, police.length)) : [], routeTarget: new THREE.Vector3(-88, 0, 40), heroPos: state.inCar ? heroCar.position : hero.position, mapMode: hud.mapMode, frozen: false });
      hud.tick();
    } else {
      // idle street-level dolly behind the title overlay
      rig.orbit(new THREE.Vector3(0, 0, 0), 42, 10, t * 0.05);
      updateCity(city, t, dt);
    }
    weapons.particles.update(dt);
    weapons.flash.update(dt);
    weapons.tracer.update(dt);
    updateCity(city, t, dt);
    renderer.render(scene, camera);
    if (!rendered) {
      rendered = true;
      window.__ready = true;
      document.title = 'SELAT BARA';
    }
    requestAnimationFrame(loop);
  }
  loop();
}
