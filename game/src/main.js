// Selat Bara — bootstrap, bright midday lighting, free-roam loop
// (walk / drive / shoot, 3 missions, wanted + police pursuit + heli,
// busted / respawn) and frozen "Mode Bioskop" scene mode (?scene=...).
import * as THREE from 'three';
import { buildCity, districtAt } from './city.js';
import { buildSportsCar, buildPoliceCar, buildHelicopter, flashLightBar, animateHeli, animateWheels } from './vehicleBuilder.js';
import { buildHero, buildEnemy, buildDrop, poseFallen } from './characterBuilder.js';
import { CarController, FootController, CameraRig } from './physics.js';
import { Particles, MuzzleFlash, Tracer, shoot } from './weapons.js';
import { stageScene } from './scenes.js';
import { HUD } from './hud.js';

document.title = 'SELAT BARA';
const params = new URLSearchParams(location.search);
const sceneName = params.get('scene');
const SCENES = new Set(['action1', 'action2', 'action3', 'title', 'map']);

// --- renderer / scene / mandated bright lighting ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 60, 200);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);

scene.add(new THREE.HemisphereLight(0x87CEEB, 0xE0C090, 0.8));
const sun = new THREE.DirectionalLight(0xFFF8E7, 1.5);
sun.position.set(40, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
sun.shadow.camera.far = 220;
scene.add(sun);

const city = buildCity(scene);
const particles = new Particles(scene);
const flash = new MuzzleFlash(scene);
const tracer = new Tracer(scene);
const hud = new HUD();
const rig = new CameraRig(camera);

// --- player: hero on foot + his sports car ---
const hero = buildHero();
hero.position.set(2, 0, 18);
scene.add(hero);
const heroCar = buildSportsCar(0xd42a1e);
heroCar.position.set(0, 0, 20);
scene.add(heroCar);
const carCtl = new CarController(heroCar);
const footCtl = new FootController(hero);

// --- game state ---
const state = {
  started: false, inCar: false, busted: false, bustedTimer: 0,
  health: 100, armour: 60, money: 250, wanted: 0, clockMin: 12 * 60,
  mag: 30, reserve: 90, weapon: 'SMG', stage: 1, lastDamage: -99,
  missionTarget: new THREE.Vector3(-88, 0, 40),
};
const input = { forward: false, back: false, left: false, right: false };
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Enter' && !state.started && !sceneName) startGame();
  if (e.code === 'KeyE') toggleCar();
  if (e.code === 'KeyR') reload();
  if (e.code === 'Space') tryShoot();
  if (e.code === 'Digit1') selectWeapon(1);
  if (e.code === 'Digit3') selectWeapon(3);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('mousedown', () => { if (state.started) tryShoot(); });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function readInput() {
  input.forward = !!(keys.KeyW || keys.ArrowUp);
  input.back = !!(keys.KeyS || keys.ArrowDown);
  input.left = !!(keys.KeyA || keys.ArrowLeft);
  input.right = !!(keys.KeyD || keys.ArrowRight);
}

function startGame() {
  state.started = true;
  document.getElementById('title-overlay').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  hud.setHintVisible(true);
  setStage(1);
}

function toggleCar() {
  if (!state.started || state.busted) return;
  if (!state.inCar) {
    if (hero.position.distanceTo(heroCar.position) < 4) {
      state.inCar = true;
      hero.visible = false;
      if (state.stage === 1) setStage(2);
    }
  } else {
    state.inCar = false;
    hero.visible = true;
    hero.position.copy(heroCar.position).add(new THREE.Vector3(2.2, 0, 0));
    hero.rotation.y = heroCar.rotation.y;
  }
}

function reload() {
  if (state.weapon !== 'SMG' || state.mag === 30 || state.reserve === 0) return;
  const need = 30 - state.mag;
  const take = Math.min(need, state.reserve);
  state.mag += take; state.reserve -= take;
  hud.setAmmo('SMG', state.mag, state.reserve);
}

function selectWeapon(n) {
  if (n === 1) { state.weapon = 'FISTS'; hud.setAmmo('FISTS', '∞', ''); }
  if (n === 3) { state.weapon = 'SMG'; hud.setAmmo('SMG', state.mag, state.reserve); }
  hud.setWeaponSlots([
    { n: 1, name: 'FISTS', ammo: '∞', owned: true, selected: state.weapon === 'FISTS' },
    { n: 2, name: 'PISTOL', ammo: '—', owned: false, selected: false },
    { n: 3, name: 'SMG', ammo: state.mag + '/' + state.reserve, owned: true, selected: state.weapon === 'SMG' },
  ]);
}

// --- missions ---
const marker = new THREE.Mesh(
  new THREE.CylinderGeometry(1.4, 1.4, 30, 16, 1, true),
  new THREE.MeshLambertMaterial({ color: 0xffc81a, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
);
marker.position.copy(state.missionTarget);
scene.add(marker);

const enemies = [];
function spawnGang() {
  const spots = [[-6, -24], [-2, -26], [3, -24], [7, -27]];
  for (const [x, z] of spots) {
    const e = buildEnemy();
    e.position.set(x, 0, z);
    e.rotation.y = Math.PI;
    e.userData.hp = 100;
    e.userData.shootTimer = 1 + Math.random();
    scene.add(e);
    enemies.push(e);
  }
  hud.setMission('M2 · THE BRUTAL SHOOTOUT', 'STAGE 2/3 · CLEAR THE STREET', 'Kill the gang', 'Vanish', 0.5);
}

function setStage(n) {
  state.stage = n;
  if (n === 1) {
    hud.setMission('M1 · THE GETAWAY', 'STAGE 1/3 · STEAL THE CAR', 'Steal the sports car', 'Lose the heli', 0.1);
    state.missionTarget.set(0, 0, 20);
  } else if (n === 2) {
    hud.setMission('M1 · THE GETAWAY', 'STAGE 1/3 · STEAL THE CAR', 'Reach the docks', 'Lose the heli', 0.4);
    state.missionTarget.set(-88, 0, 40);
  } else if (n === 3) {
    spawnGang();
    state.missionTarget.set(0, 0, -25);
  }
  marker.position.copy(state.missionTarget);
  hud.routeTarget.copy(state.missionTarget);
}

// --- shooting ---
let shootCooldown = 0;
function tryShoot() {
  if (!state.started || state.busted || state.weapon !== 'SMG') return;
  if (shootCooldown > 0 || state.mag <= 0) { if (state.mag <= 0) reload(); return; }
  shootCooldown = 0.14;
  state.mag--;
  hud.setAmmo('SMG', state.mag, state.reserve);
  const origin = state.inCar
    ? heroCar.position.clone().add(new THREE.Vector3(0, 1.3, 0))
    : hero.position.clone().add(new THREE.Vector3(0, 1.35, 0));
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const targets = [...enemies, ...policeCars.map((p) => p.obj)];
  const hit = shoot(origin, dir, targets, 70);
  const muzzle = origin.clone().addScaledVector(dir, 0.8);
  flash.show(muzzle, dir);
  particles.sparks(muzzle);
  if (hit) {
    tracer.fire(muzzle, hit.point);
    if (hit.target && hit.target.userData.kind === 'enemy') {
      particles.blood(hit.point, true);
      hit.target.userData.hp -= 34;
      if (hit.target.userData.hp <= 0 && hit.target.userData.kind === 'enemy') {
        killEnemy(hit.target);
      }
    } else {
      raiseWanted(1);
    }
  } else {
    tracer.fire(muzzle, origin.clone().addScaledVector(dir, 50));
  }
}

function killEnemy(e) {
  poseFallen(e);
  e.userData.dead = true;
  particles.blood(e.position.clone().setY(0.5), true);
  const drop = buildDrop(Math.random() < 0.5 ? 'cash' : 'ammo');
  drop.position.set(e.position.x, 1.3, e.position.z);
  scene.add(drop);
  drops.push(drop);
  state.money += 50;
  hud.setMoney(state.money);
  if (enemies.every((x) => x.userData.dead)) {
    hud.setMission('M2 · THE BRUTAL SHOOTOUT', 'STAGE 2/3 · CLEAR THE STREET', 'Street cleared!', 'Vanish', 1);
    state.money += 500;
    hud.setMoney(state.money);
    document.getElementById('mission-done').style.display = 'block';
    setTimeout(() => { document.getElementById('mission-done').style.display = 'none'; }, 4000);
    setWanted(0);
  }
}

// --- wanted / police pursuit ---
const policeCars = [];
const drops = [];
let heli = null;
function raiseWanted(n) {
  setWanted(Math.min(5, state.wanted + n));
}
function setWanted(n) {
  state.wanted = n;
  hud.setWanted(n, n >= 3 ? 'AIR UNIT DEPLOYED' : n >= 2 ? 'UNITS RESPONDING' : n >= 1 ? 'PATROL ALERTED' : '');
  syncPolice();
}
function syncPolice() {
  const want = Math.min(state.wanted, 3);
  while (policeCars.length < want) {
    const p = buildPoliceCar();
    const a = Math.random() * Math.PI * 2;
    p.position.set(heroCar.position.x + Math.sin(a) * 40, 0, heroCar.position.z + Math.cos(a) * 40);
    scene.add(p);
    policeCars.push({ obj: p, speed: 14 + Math.random() * 4 });
  }
  while (policeCars.length > want) {
    const p = policeCars.pop();
    scene.remove(p.obj);
  }
  if (state.wanted >= 3 && !heli) {
    heli = buildHelicopter();
    heli.position.set(heroCar.position.x + 10, 14, heroCar.position.z + 10);
    scene.add(heli);
  } else if (state.wanted < 3 && heli) {
    scene.remove(heli);
    heli = null;
  }
  const names = ['SBPD-7 BARA', 'SBPD-12 TANJUNG', 'SBPD-19 KACA', 'SBPD-AIR ELANG'];
  const roles = ['IN PURSUIT', 'IN PURSUIT', 'RAMMING', 'AIR UNIT'];
  const units = policeCars.map((p, i) => ({ name: names[i % 3], role: roles[i % 3], obj: p.obj }));
  if (heli) units.push({ name: 'SBPD-AIR ELANG', role: 'AIR UNIT', obj: heli });
  hud.setPolice(units, state.wanted > 0 ? 'CONTROL: ' + state.wanted + '★ — units responding' : '');
}

function damagePlayer(amount) {
  const now = performance.now() / 1000;
  state.lastDamage = now;
  let left = amount;
  if (state.armour > 0) {
    const absorbed = Math.min(state.armour, left * 0.6);
    state.armour -= absorbed;
    left -= absorbed;
  }
  state.health -= left;
  hud.setHealth(Math.max(0, state.health));
  hud.setArmour(Math.max(0, state.armour));
  if (state.health <= 0 && !state.busted) {
    state.busted = true;
    state.bustedTimer = 0;
    document.getElementById('busted-overlay').style.display = 'flex';
    setWanted(0);
  }
}

function respawn() {
  state.busted = false;
  state.health = 100; state.armour = 60;
  hud.setHealth(100); hud.setArmour(60);
  document.getElementById('busted-overlay').style.display = 'none';
  hero.position.set(0, 0, 30);
  heroCar.position.set(2, 0, 32);
  carCtl.heading = 0; carCtl.speed = 0;
  state.inCar = false;
  hero.visible = true;
}

// --- scene mode (frozen Mode Bioskop) ---
let sceneUpdate = null;
let stagedPolice = [];
let stagedPlayerPos = new THREE.Vector3(0, 0, 12);
if (sceneName && SCENES.has(sceneName)) {
  document.getElementById('title-overlay').style.display = 'none';
  hero.visible = false;
  heroCar.visible = false;
  marker.visible = false;
  const staged = stageScene(sceneName, { scene, camera, rig, particles, flash, tracer });
  sceneUpdate = staged.update;
  stagedPolice = staged.police;
  stagedPlayerPos = staged.playerPos;
  if (staged.routeTarget) hud.routeTarget.copy(staged.routeTarget);
  hud.setMapMode(sceneName === 'map');
  state.started = true;
  if (sceneName === 'title') {
    document.getElementById('title-overlay').style.display = 'flex';
    hud.applyScene(staged.hud);
    document.getElementById('hud').style.display = 'none';
  } else {
    hud.applyScene(staged.hud);
    hud.setPolice(staged.police, staged.hud.control);
  }
} else {
  hud.applyScene({
    mission: 'M1 · THE GETAWAY', stage: 'STAGE 1/3 · STEAL THE CAR',
    objective: 'Steal the sports car', next: 'Lose the heli', progress: 0.1,
    wanted: 0, money: 250, clock: '12:00', weapon: 'SMG', mag: 30, reserve: 90,
    health: 100, armour: 60, speed: null,
    district: 'PELABUHAN BARA', street: 'Dermaga Bara', standing: 'NEUTRAL', standingVal: 58,
  });
  hud.setPolice([], '');
  hud.setHintVisible(false);
  document.getElementById('hud').style.display = 'none';
  selectWeapon(3);
}

// --- main loop ---
const clock = new THREE.Clock();
let firstFrame = true;
let enemyShootAcc = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  city.update(dt, t);
  particles.update(dt);
  flash.update(dt);
  tracer.update(dt);
  shootCooldown = Math.max(0, shootCooldown - dt);

  if (sceneUpdate) {
    sceneUpdate(dt, t);
    hud.tick(dt, stagedPlayerPos, []);
  } else if (state.started && !state.busted) {
    readInput();
    // clock advances 1 game-hour per 5 real minutes
    state.clockMin += dt * 0.2;
    const hh = Math.floor(state.clockMin / 60) % 24;
    const mm = Math.floor(state.clockMin % 60);
    hud.setClock(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'));
    if (state.inCar) {
      const sp = carCtl.update(dt, input);
      animateWheels(heroCar, sp, dt);
      rig.update(dt, heroCar, 'car', carCtl.kmh);
      hud.setSpeed(carCtl.kmh, "RAKA'S SPORTS CAR", '12% DENTED');
    } else {
      footCtl.update(dt, input, hero.rotation.y);
      rig.update(dt, hero, 'foot');
      hud.setSpeed(null);
    }
    const pp = state.inCar ? heroCar.position : hero.position;
    // district + standing under the minimap
    const d = districtAt(pp.x, pp.z);
    hud.setDistrict(d.name, d.street, 'NEUTRAL', 58);
    // mission triggers
    if (state.stage === 2 && pp.distanceTo(state.missionTarget) < 9) setStage(3);
    // police pursuit + ramming
    const target = state.inCar ? heroCar : hero;
    for (const p of policeCars) {
      flashLightBar(p.obj, t);
      const to = target.position.clone().sub(p.obj.position);
      const dist = to.length();
      const desired = Math.atan2(-to.x, -to.z);
      let dy = desired - p.obj.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      p.obj.rotation.y += THREE.MathUtils.clamp(dy, -1.6 * dt, 1.6 * dt);
      if (dist > 3) {
        p.obj.position.addScaledVector(to.normalize(), p.speed * dt);
        animateWheels(p.obj, p.speed, dt);
      } else if (Math.random() < dt * 0.5) {
        damagePlayer(6);
      }
    }
    if (heli) {
      animateHeli(heli, dt, t);
      const a = t * 0.25;
      heli.position.x = target.position.x + Math.sin(a) * 16;
      heli.position.z = target.position.z + Math.cos(a) * 16;
      heli.position.y = 14;
    }
    // gang return fire
    enemyShootAcc += dt;
    if (enemyShootAcc > 1.4) {
      enemyShootAcc = 0;
      for (const e of enemies) {
        if (e.userData.dead) continue;
        if (e.position.distanceTo(pp) < 45 && Math.random() < 0.35) {
          damagePlayer(6);
          const m = e.position.clone().setY(1.3);
          flash.show(m, pp.clone().setY(1.2).sub(m).normalize());
        }
      }
    }
    // health regen after 5s without damage
    if (performance.now() / 1000 - state.lastDamage > 5 && state.health > 0 && state.health < 100) {
      state.health = Math.min(100, state.health + 2 * dt);
      hud.setHealth(state.health);
    }
    // drops bob + billboard
    for (const d of drops) {
      d.position.y = d.userData.baseY + Math.sin(t * 2 + d.position.x) * 0.08;
      d.rotation.y = Math.atan2(camera.position.x - d.position.x, camera.position.z - d.position.z);
    }
    hud.tick(dt, pp, enemies.filter((e) => !e.userData.dead));
  } else if (state.busted) {
    state.bustedTimer += dt;
    if (state.bustedTimer > 3) respawn();
  } else {
    // title screen idle: slow street-level dolly down the avenue
    const a = t * 0.05;
    camera.position.set(Math.sin(a) * 8, 3.2, 32);
    camera.lookAt(0, 2.5, -10);
    hud.tick(dt, hero.position, []);
  }

  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    window.__ready = true;
    window.__game = { scene, camera, state, hud };
  }
}
animate();
