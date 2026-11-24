// main.js — Selat Bara bootstrap: renderer + mandated bright lighting,
// city, free-roam (walk / drive / shoot, 3 missions, wanted + pursuit),
// and the frozen ?scene= staging mode. No network while playing.
import * as THREE from 'three';
import { buildCity, districtAt, CITY_MIN, CITY_MAX } from './city.js';
import { buildCharacter, setPose } from './characterBuilder.js';
import { buildCar, buildHeli, flashLightBar, animateHeli, spinWheels } from './vehicleBuilder.js';
import { CarController, FootController, CameraRig } from './physics.js';
import { ParticlePool, MuzzleFlash, Tracer, shoot } from './weapons.js';
import { HUD } from './hud.js';
import { stageScene, SCENE_HUD } from './scenes.js';

const params = new URLSearchParams(location.search);
const SCENE = params.get('scene') || '';
const SCENES = ['action1', 'action2', 'action3', 'title', 'map'];
const sceneMode = SCENES.includes(SCENE) ? SCENE : null;

// --- renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app').appendChild(renderer.domElement);

// --- scene + mandated bright midday lighting ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 60, 200);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 400);
camera.position.set(6, 4, 26);
const hemi = new THREE.HemisphereLight(0x87ceeb, 0xe0c090, 0.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff8e7, 1.5);
sun.castShadow = true;
sun.position.set(40, 60, 20);
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
sun.shadow.camera.far = 200;
scene.add(sun);

// --- world ---
const city = buildCity(scene);
const pool = new ParticlePool(scene);
const hud = new HUD();

// --- hero + hero car (free-roam) ---
const hero = buildCharacter({ role: 'hero' });
hero.position.set(0, 0, 14);
scene.add(hero);
const heroCar = buildCar({ kind: 'sports', color: 0xd21f2b });
heroCar.position.set(0, 0, 10);
scene.add(heroCar);
const carCtl = new CarController(heroCar);
const footCtl = new FootController(hero);
const rig = new CameraRig(camera);

// --- game state ---
const state = {
  started: false,
  driving: false,
  money: 250,
  health: 100,
  armour: 100,
  wanted: 0,
  mission: 1,
  ammo: { pistol: [12, 36], smg: [30, 90] },
  weapon: 2, // 0 fists, 1 pistol, 2 smg
  clockMin: 12 * 60,
  enemies: [],
  police: [],
  heli: null,
  busted: false,
  missionMarker: null,
};
const MISSION_TARGETS = [
  { name: 'M1 · THE GETAWAY', stage: 'STAGE 1/3 · STEAL THE CAR', objective: 'Reach the docks', next: 'NEXT Lose the heli', progress: 0.3, target: { x: -88, z: 40 } },
  { name: 'M2 · THE BRUTAL SHOOTOUT', stage: 'STAGE 2/3 · CLEAR THE STREET', objective: 'Kill the Gang', next: 'NEXT Vanish', progress: 0.55, target: { x: 0, z: 4 } },
  { name: 'M3 · HIGH SPEED CHASE', stage: 'STAGE 3/3 · LOSE THE HEAT', objective: 'Reach the docks', next: 'NEXT Reach the docks', progress: 0.8, target: { x: -88, z: 40 } },
];
function missionBeam(target) {
  if (state.missionMarker) scene.remove(state.missionMarker);
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 40, 10, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffc23a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(geo, mat);
  beam.position.set(target.x, 20, target.z);
  scene.add(beam);
  state.missionMarker = beam;
}
function applyMission(i) {
  const m = MISSION_TARGETS[i];
  state.mission = i + 1;
  hud.setMission(m);
  hud.routeTarget = { x: m.target.x, z: m.target.z, label: 'Dermaga Bara' };
  missionBeam(m.target);
}
function spawnEnemies(n) {
  for (const e of state.enemies) scene.remove(e);
  state.enemies = [];
  for (let k = 0; k < n; k++) {
    const e = buildCharacter({ role: 'enemy', shirt: 0x3a3f4a, pants: 0x2c313a });
    e.position.set(-6 + k * 4, 0, 2 + (k % 2) * 3);
    e.rotation.y = 0;
    scene.add(e);
    state.enemies.push(e);
  }
}
function spawnPolice(n) {
  for (const p of state.police) scene.remove(p.mesh);
  state.police = [];
  const names = [['SBPD-7 BARA', 'SBPD-7', 'IN PURSUIT'], ['SBPD-12 TANJUNG', 'SBPD-12', 'RAMMING'], ['SBPD-19 KACA', 'SBPD-19', 'IN PURSUIT']];
  for (let k = 0; k < n; k++) {
    const mesh = buildCar({ kind: 'police' });
    mesh.position.set(10 + k * 8, 0, 30 + k * 4);
    scene.add(mesh);
    state.police.push({ mesh, name: names[k % 3][0], short: names[k % 3][1], role: names[k % 3][2], x: mesh.position.x, z: mesh.position.z });
  }
  if (n >= 3 && !state.heli) {
    state.heli = buildHeli();
    state.heli.position.set(0, 26, -10);
    scene.add(state.heli);
    state.police.push({ mesh: state.heli, name: 'SBPD-AIR ELANG', short: 'SBPD-AIR', role: 'AIR UNIT', x: 0, z: -10 });
  }
}
function raiseWanted(n) {
  state.wanted = Math.max(state.wanted, n);
  hud.setWanted(state.wanted);
  spawnPolice(state.wanted >= 3 ? 3 : state.wanted);
  hud.setPD(state.police);
}

// --- input ---
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Enter' && !state.started && !sceneMode) startGame();
  if (e.key.toLowerCase() === 'e' && state.started && !sceneMode) toggleCar();
  if (e.key.toLowerCase() === 'r' && state.started) reload();
  if (['1', '2', '3'].includes(e.key)) selectWeapon(Number(e.key) - 1);
  if (e.key === ' ') { e.preventDefault(); if (state.started) fireWeapon(); }
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
addEventListener('mousedown', () => { if (state.started && !sceneMode) fireWeapon(); });

function readInput() {
  return {
    forward: !!(keys['w'] || keys['arrowup']),
    back: !!(keys['s'] || keys['arrowdown']),
    left: !!(keys['a'] || keys['arrowleft']),
    right: !!(keys['d'] || keys['arrowright']),
  };
}
function toggleCar() {
  state.driving = !state.driving;
  hero.visible = !state.driving;
  if (state.driving) {
    carCtl.pos.copy(hero.position);
    carCtl.heading = footCtl.heading;
  } else {
    footCtl.pos.copy(carCtl.pos);
    footCtl.pos.z += 3;
  }
}
function selectWeapon(i) {
  state.weapon = i;
  syncWeaponHUD();
}
function reload() {
  const w = state.weapon === 1 ? 'pistol' : state.weapon === 2 ? 'smg' : null;
  if (!w) return;
  const [mag, reserve] = state.ammo[w];
  const need = (w === 'smg' ? 30 : 12) - mag;
  const take = Math.min(need, reserve);
  state.ammo[w] = [mag + take, reserve - take];
  syncWeaponHUD();
}
function syncWeaponHUD() {
  const slots = [
    { name: 'FISTS', owned: true, ammo: '∞' },
    { name: 'PISTOL', owned: true, ammo: `${state.ammo.pistol[0]}/${state.ammo.pistol[1]}` },
    { name: 'SMG', owned: true, ammo: `${state.ammo.smg[0]}/${state.ammo.smg[1]}` },
  ];
  hud.setWeapon(slots, state.weapon);
}
function fireWeapon() {
  if (state.weapon === 0) return;
  const w = state.weapon === 1 ? 'pistol' : 'smg';
  if (state.ammo[w][0] <= 0) { reload(); return; }
  state.ammo[w][0]--;
  syncWeaponHUD();
  raiseWanted(1);
  shoot(scene, camera, pool, freeFlash, freeTracer, state.enemies, () => {
    raiseWanted(2);
  });
}
function startGame() {
  state.started = true;
  hud.showTitle(false);
  hud.showHUD(true);
  hud.showHint(true);
  applyMission(0);
  hud.setMoney(state.money);
  hud.setHealth(state.health, state.armour);
  hud.setClock('12:00');
  syncWeaponHUD();
  hud.setDistrict(districtAt(hero.position.x, hero.position.z));
}
function bust() {
  state.busted = true;
  state.health = 100; state.armour = 0; state.wanted = 0;
  state.money = Math.max(0, state.money - 100);
  hud.showBusted(true);
  setTimeout(() => {
    hud.showBusted(false);
    hero.position.set(0, 0, 14);
    footCtl.pos.set(0, 0, 14);
    state.busted = false;
    state.wanted = 0;
    hud.setWanted(0);
    hud.setHealth(100, 0);
    hud.setMoney(state.money);
  }, 2500);
}

// shared flash + tracer for free-roam shooting
const freeFlash = new MuzzleFlash(scene);
const freeTracer = new Tracer(scene);

// --- staged scene mode ---
let staged = null;
if (sceneMode) {
  hud.showHUD(true);
  hud.showTitle(false);
  hero.visible = false;
  heroCar.visible = false;
  staged = stageScene(sceneMode, scene, hud, pool, camera);
  // hide the free-roam hero + car so no stray slab blocks the frame
  hero.position.set(0, -50, 0);
  heroCar.position.set(0, -50, 0);
} else {
  hud.showHUD(false);
  hud.showTitle(true);
  hud.setClock('12:00');
  hud.setMoney(state.money);
}

// --- main loop ---
const clock = new THREE.Clock();
let frames = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  frames++;
  city.update(dt);
  if (sceneMode) {
    if (staged) staged.update(dt);
    hud.tick();
  } else if (state.started && !state.busted) {
    const input = readInput();
    let speed = 0;
    if (state.driving) {
      speed = carCtl.update(dt, input);
      spinWheels(heroCar, carCtl.speed, dt);
      rig.followCar(carCtl.pos, carCtl.heading, speed, dt);
      hud.setSpeed(Math.abs(carCtl.speed) * 3.6, 'SPORTS CAR', 12);
    } else {
      const walking = footCtl.update(dt, input, rig.camera.rotation.y);
      setPose(hero, walking ? 'walk' : 'idle', footCtl.walkPhase);
      rig.followFoot(footCtl.pos, footCtl.heading, dt);
      hud.setSpeed(null);
    }
    // clock advances slowly in free roam (stays midday)
    state.clockMin += dt * 0.2;
    const hh = Math.floor(state.clockMin / 60) % 24;
    const mm = Math.floor(state.clockMin % 60);
    hud.setClock(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    // district + standing follows the player
    const d = districtAt(state.driving ? carCtl.pos.x : footCtl.pos.x, state.driving ? carCtl.pos.z : footCtl.pos.z);
    if (d.key !== hud.district.key) hud.setDistrict(d);
    hud.player = state.driving ? { x: carCtl.pos.x, z: carCtl.pos.z } : { x: footCtl.pos.x, z: footCtl.pos.z };
    // police pursuit: chase the player, flash bars, heli follows
    for (const p of state.police) {
      if (p.mesh === state.heli) continue;
      const dx = hud.player.x - p.mesh.position.x;
      const dz = hud.player.z - p.mesh.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const sp = 11 * dt;
      p.mesh.position.x += (dx / dist) * sp;
      p.mesh.position.z += (dz / dist) * sp;
      p.mesh.rotation.y = Math.atan2(dx, dz);
      p.x = p.mesh.position.x; p.z = p.mesh.position.z;
      flashLightBar(p.mesh, dt);
    }
    if (state.heli) {
      animateHeli(state.heli, dt);
      state.heli.position.x += (hud.player.x - state.heli.position.x) * 0.3 * dt;
      state.heli.position.z += (hud.player.z - state.heli.position.z) * 0.3 * dt;
      state.heli.position.y = 26 + Math.sin(frames * 0.02) * 1.5;
    }
    // mission progress: reaching the target advances the mission
    const m = MISSION_TARGETS[state.mission - 1];
    if (m && Math.hypot(hud.player.x - m.target.x, hud.player.z - m.target.z) < 6) {
      if (state.mission === 1) { spawnEnemies(4); applyMission(1); raiseWanted(2); }
      else if (state.mission === 2 && state.enemies.length === 0) { applyMission(2); raiseWanted(3); }
      else if (state.mission === 3) { state.money += 500; hud.setMoney(state.money); applyMission(0); }
    }
    // enemies shoot back a little when close
    for (const e of state.enemies) {
      const dist = Math.hypot(e.position.x - hud.player.x, e.position.z - hud.player.z);
      if (dist < 25 && Math.random() < dt * 0.3) {
        state.health -= 2;
        hud.setHealth(state.health, state.armour);
        if (state.health <= 0) bust();
      }
    }
    hud.tick();
    pool.update(dt);
  } else {
    // title screen: slow street-level dolly past the hero car
    const t = frames * 0.0016;
    camera.position.set(Math.sin(t) * 8 + 4, 3.2, 26 + Math.cos(t * 0.7) * 3);
    camera.lookAt(0, 1.4, 4);
  }
  renderer.render(scene, camera);
  if (frames === 3) window.__ready = true;
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
loop();
