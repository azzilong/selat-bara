// SELAT BARA — main game (steps 1, 4-7 wired together).
// Re-written in-session under recording 8 (gta6-01, 2026-11-24).
// Bright midday open-world crime game: free-roam (walk, drive, shoot,
// 3 missions, wanted + police pursuit, busted / complete) plus the
// frozen "Mode Bioskop" scenes (?scene=action1/2/3/title) for the
// screenshots. All geometry procedural, MeshLambertMaterial, no
// textures, no network while playing.
// REBUILD: the staged scenes now get a Tracer (bullet beam) alongside
// the muzzle flash, and free-roam shots fire tracer + sparks too.
import * as THREE from 'three';
import { buildCity, districtAt } from './city.js';
import {
  buildSportsCar, buildPoliceCar, buildHelicopter,
  flashLightBar, animateHeli,
} from './vehicleBuilder.js';
import { buildHero, buildEnemy, layFallen } from './characterBuilder.js';
import { CarController, FootController, CameraRig } from './physics.js';
import { Particles, MuzzleFlash, Tracer, shoot } from './weapons.js';
import { stageScene, updateStaged } from './scenes.js';
import { HUD } from './hud.js';

window.addEventListener('error', (e) => { document.title = 'ERR: ' + e.message; });

// --- renderer + mandated bright lighting (step 1, unchanged) ---
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 60, 200);
scene.add(new THREE.HemisphereLight(0x87CEEB, 0xE0C090, 0.8));
const sun = new THREE.DirectionalLight(0xFFF8E7, 1.5);
sun.position.set(40, 80, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
sun.shadow.camera.far = 300;
scene.add(sun);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 9, 42);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- world: city + systems ---
const city = buildCity(scene);
const hud = new HUD();
const particles = new Particles(scene);
const flash = new MuzzleFlash(scene);
const tracer = new Tracer(scene);
const rig = new CameraRig(camera);

// --- hero + hero car (free-roam) ---
const hero = buildHero();
hero.position.set(2, 0, 20);
scene.add(hero);
const heroCar = buildSportsCar();
heroCar.position.set(0, 0, 14);
heroCar.rotation.y = Math.PI * 0.9;
scene.add(heroCar);
const carCtl = new CarController(heroCar);
const footCtl = new FootController(hero);

// --- input ---
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE') toggleCar();
  if (e.code === 'KeyR') reload();
  if (e.code === 'Enter' && sceneName === 'title') startFreeRoam();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
const input = () => ({
  up: !!(keys.KeyW || keys.ArrowUp),
  down: !!(keys.KeyS || keys.ArrowDown),
  left: !!(keys.KeyA || keys.ArrowLeft),
  right: !!(keys.KeyD || keys.ArrowRight),
});
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  rig.yaw -= (e.clientX - lastX) * 0.005;
  rig.pitch = Math.max(-0.1, Math.min(0.9, rig.pitch + (e.clientY - lastY) * 0.003));
  lastX = e.clientX; lastY = e.clientY;
});
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
canvas.addEventListener('click', (e) => {
  if (frozen || busted) return;
  mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  fireWeapon();
});

// --- game state ---
let driving = false;
let frozen = false;        // scene mode: staged frame, nothing moves
let busted = false;
let bustedTimer = 0;
let wanted = 0;
let money = 250;
let health = 100, armour = 60;
let mag = 30, reserve = 90;
let reloadLock = 0;
let mission = 0;           // 0 M1, 1 M2, 2 M3, 3 done
let gameMinutes = 0;       // clock ticks from 12:00 in free roam
let enemies = [];          // { mesh, hp, alive, shootT }
let police = [];           // pursuit cars { mesh, ctl, hp }
let marker = null;         // mission target beacon
let heli = null;
let m3Target = null;

const $ = (id) => document.getElementById(id);
function setMoney(v) { money = v; $('money').textContent = '$ ' + v.toLocaleString('en-US'); }
function setWanted(n) { wanted = n; hud.setWanted(n); }
function setHealth(h) { health = Math.max(0, h); hud.setHealth(health); }
function setArmour(a) { armour = Math.max(0, a); hud.setArmour(armour); }
function hurt(dmg) {
  const absorbed = Math.min(armour, dmg * 0.6);
  setArmour(armour - absorbed);
  setHealth(health - (dmg - absorbed));
  if (health <= 0) doBusted();
}
function doBusted() {
  busted = true;
  bustedTimer = 2.5;
  $('busted').style.display = 'flex';
  setWanted(0);
}
function respawn() {
  $('busted').style.display = 'none';
  busted = false;
  setHealth(100);
  setArmour(60);
  hero.position.set(2, 0, 20);
  footCtl.pos.copy(hero.position);
  heroCar.position.set(0, 0, 14);
  carCtl.pos.copy(heroCar.position);
  driving = false;
  hero.visible = true;
  for (const p of police) scene.remove(p.mesh);
  police = [];
  heli = null;
}

// --- mission beacons -------------------------------------------------------
function makeMarker(x, z, color = 0xffd24a) {
  if (marker) scene.remove(marker);
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 1.2, 26, 12, 1, true),
    new THREE.MeshLambertMaterial({
      color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 13;
  g.add(beam);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.25, 20),
    new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.7 }));
  pad.position.y = 0.15;
  g.add(pad);
  g.position.set(x, 0, z);
  scene.add(g);
  marker = g;
  return g;
}

function setMission(i) {
  mission = i;
  if (i === 0) {
    hud.setMission('M1 · THE GETAWAY', 'Get in the sports car');
    makeMarker(0, 14, 0xffd24a);
  } else if (i === 1) {
    hud.setMission('M2 · THE BRUTAL SHOOTOUT', 'Kill the gang');
    spawnGang();
    makeMarker(-28, 28, 0xff2a1e);
    setWanted(3);
    spawnPursuit(2);
  } else if (i === 2) {
    hud.setMission('M3 · HIGH SPEED CHASE', 'Drive-by the patrol car');
    makeMarker(0, 0, 0x3b82f6);
    if (!m3Target) spawnPursuit(1, true);
  } else {
    hud.setMission('SELAT BARA', 'All missions complete — the docks are yours');
    if (marker) { scene.remove(marker); marker = null; }
    setMoney(money + 2500);
    $('complete').style.display = 'flex';
    setTimeout(() => { $('complete').style.display = 'none'; }, 5000);
    setWanted(0);
  }
}

function spawnGang() {
  const spots = [[-32, 24], [-24, 30], [-30, 34], [-22, 26]];
  for (const [x, z] of spots) {
    const e = buildEnemy();
    e.position.set(x, 0, z);
    e.rotation.y = Math.PI;
    scene.add(e);
    enemies.push({ mesh: e, hp: 3, alive: true, shootT: 1 + Math.random() * 2 });
  }
}

function spawnPursuit(n, isM3 = false) {
  for (let i = 0; i < n; i++) {
    const p = buildPoliceCar();
    const start = isM3 ? [10 + i * 6, -20] : [8 + i * 8, 40 + i * 6];
    p.position.set(start[0], 0, start[1]);
    scene.add(p);
    const ctl = new CarController(p);
    police.push({ mesh: p, ctl, hp: isM3 ? 3 : 99, isM3 });
    if (isM3) m3Target = police[police.length - 1];
  }
  if (!heli && wanted >= 3) {
    heli = buildHelicopter();
    heli.position.set(10, 26, -10);
    scene.add(heli);
  }
}

// --- enter / exit car --------------------------------------------------------
function toggleCar() {
  if (frozen || busted) return;
  if (!driving) {
    if (hero.position.distanceTo(heroCar.position) < 4.5) {
      driving = true;
      hero.visible = false;
      if (mission === 0) setMission(0), hud.setMission('M1 · THE GETAWAY', 'Reach Pelabuhan Bara'), makeMarker(-100, 0, 0xffd24a);
    }
  } else {
    driving = false;
    hero.visible = true;
    hero.position.set(heroCar.position.x + 2.2, 0, heroCar.position.z + 1);
    footCtl.pos.copy(hero.position);
    hero.rotation.y = heroCar.rotation.y;
  }
}

function reload() {
  if (reloadLock > 0 || mag === 30 || reserve <= 0) return;
  const need = 30 - mag;
  const take = Math.min(need, reserve);
  mag += take;
  reserve -= take;
  reloadLock = 0.8;
  hud.setAmmo('SMG', mag, reserve);
}

// --- shooting ---------------------------------------------------------------
// Every shot now shows the full chain: flash + tracer beam + sparks at
// the muzzle, blood where it lands (rebuild fixes #3 and #5).
function fireWeapon() {
  if (reloadLock > 0 || mag <= 0) { if (mag <= 0) reload(); return; }
  mag--;
  hud.setAmmo('SMG', mag, reserve);
  raycaster.setFromCamera(mouse, camera);
  if (!driving) {
    // on foot: gun tip -> aim point along the camera ray
    const tip = hero.position.clone();
    tip.y = 1.15;
    tip.add(new THREE.Vector3(-Math.sin(hero.rotation.y), 0, -Math.cos(hero.rotation.y)).multiplyScalar(0.6));
    const aimPoint = raycaster.ray.at(30, new THREE.Vector3());
    const dir = aimPoint.clone().sub(tip).normalize();
    flash.fire(tip, dir);
    tracer.fire(tip, aimPoint);
    particles.sparks(tip, dir, 14);
    const hittables = enemies.filter((e) => e.alive).map((e) => e.mesh);
    const hit = shoot(tip, aimPoint, hittables, 60);
    if (hit) {
      const en = enemies.find((e) => e.mesh === hit.object);
      if (en) {
        particles.bloodBig(hit.point, 20);
        en.hp--;
        if (en.hp <= 0) {
          en.alive = false;
          layFallen(en.mesh);
          setMoney(money + 25);
          if (enemies.every((e) => !e.alive) && mission === 1) setMission(2);
        }
      }
    }
  } else {
    // drive-by: auto-aim the nearest police car ahead of the car
    const from = heroCar.position.clone();
    from.y = 1.2;
    const fwd = new THREE.Vector3(-Math.sin(heroCar.rotation.y), 0, -Math.cos(heroCar.rotation.y));
    const tip = from.clone().addScaledVector(fwd, 1.5);
    const aimPoint = from.clone().addScaledVector(fwd, 30);
    flash.fire(tip, fwd);
    tracer.fire(tip, aimPoint);
    particles.sparks(tip, fwd, 14);
    let best = null, bestD = 45;
    for (const p of police) {
      const d = p.mesh.position.distanceTo(from);
      if (d < bestD) { best = p; bestD = d; }
    }
    if (best) {
      particles.glass(best.mesh.position.clone().setY(1.3), 16);
      particles.bloodBig(best.mesh.position.clone().setY(1.1), 12);
      best.hp--;
      if (best.hp <= 0 && best.isM3) {
        particles.smoke(best.mesh.position.clone().setY(1.1), 26);
        police = police.filter((p) => p !== best);
        m3Target = null;
        setMission(3);
      }
    }
  }
}

// --- enemy + police AI -------------------------------------------------------
function updateEnemies(dt) {
  for (const en of enemies) {
    if (!en.alive) continue;
    en.shootT -= dt;
    if (en.shootT <= 0) {
      en.shootT = 1.6 + Math.random() * 1.4;
      const d = en.mesh.position.distanceTo(hero.position);
      if (!driving && d < 34 && Math.random() < 0.35) {
        const tip = en.mesh.position.clone(); tip.y = 1.2;
        const aim = hero.position.clone(); aim.y = 1.2;
        flash.fire(tip, aim.clone().sub(tip).normalize());
        hurt(5 + Math.random() * 5);
      }
    }
  }
}

function updatePolice(dt) {
  const target = driving ? heroCar.position : hero.position;
  for (const p of police) {
    // simple pursuit: steer toward the hero, keep ~6u behind
    const dx = target.x - p.mesh.position.x;
    const dz = target.z - p.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    const wantHeading = Math.atan2(-dx, -dz);
    let dh = wantHeading - p.ctl.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, dh * 1.5));
    p.ctl.speed = Math.min(p.ctl.speed + 12 * dt, dist > 8 ? 22 : 12);
    p.ctl.heading += steer * 2.2 * dt * Math.min(1, Math.abs(p.ctl.speed) / 8);
    const fx = -Math.sin(p.ctl.heading), fz = -Math.cos(p.ctl.heading);
    p.ctl.pos.x += fx * p.ctl.speed * dt;
    p.ctl.pos.z += fz * p.ctl.speed * dt;
    p.ctl.pos.x = Math.max(-108, Math.min(108, p.ctl.pos.x));
    p.ctl.pos.z = Math.max(-108, Math.min(108, p.ctl.pos.z));
    p.mesh.position.copy(p.ctl.pos);
    p.mesh.rotation.y = p.ctl.heading;
    // wheels spin via the shared helper through a dummy speed
    p.mesh.userData.wheels?.forEach((w) => { w.rotation.x += (p.ctl.speed / 0.35) * dt; });
    flashLightBar(p.mesh, Math.floor(performance.now() / 250));
  }
  if (heli) {
    animateHeli(heli, dt);
    // heli shadows the hero from above
    const hx = target.x + 8, hz = target.z - 8;
    heli.position.x += (hx - heli.position.x) * Math.min(1, dt * 0.8);
    heli.position.z += (hz - heli.position.z) * Math.min(1, dt * 0.8);
    heli.position.y = 26 + Math.sin(performance.now() * 0.001) * 1.5;
  }
}

// --- scene mode ---------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
const sceneName = params.get('scene');
let staged = null;
if (sceneName) {
  $('hint').style.display = 'none';
  // hide the free-roam hero + hero car: in scene mode the staged
  // hero/car are separate objects, and the free-roam car at (0,0,14)
  // would otherwise sit right in front of the action2 camera as a
  // black slab (the old build shipped with that slab in the shot).
  hero.visible = false;
  heroCar.visible = false;
  const ctx = {
    scene, camera, hud, particles, flash, tracer,
    frozen: false, policeCars: null, heli: null, heroCar: null, hero: null,
    drops: null,
  };
  staged = stageScene(sceneName, ctx);
  frozen = ctx.frozen;
  window.__staged = ctx;
  window.__scene = sceneName;
  if (ctx.policeCars) police = ctx.policeCars.map((m) => ({ mesh: m, ctl: null, hp: 99, isM3: false }));
  if (ctx.heli) heli = ctx.heli;
  // minimap markers for the staged frame
  hud.player = ctx.heroCar
    ? { x: ctx.heroCar.position.x, z: ctx.heroCar.position.z, heading: ctx.heroCar.rotation.y }
    : { x: 0, z: 8, heading: 0 };
  hud.police = (ctx.policeCars || []).map((m) => ({ x: m.position.x, z: m.position.z }));
  hud.enemies = [];
  hud.drawMinimap();
} else {
  setMission(0);
  setWanted(0);
  setHealth(100);
  setArmour(60);
  hud.setAmmo('SMG', mag, reserve);
  hud.setSpeed(0);
  hud.setClock('12:00');
}

function startFreeRoam() {
  window.location.search = '';
}

// --- main loop ---------------------------------------------------------------
const clock = new THREE.Clock();
let frames = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  if (frozen) {
    if (staged) updateStaged(window.__staged, dt, t);
    // frozen frame: particles stay where they are, nothing moves
  } else {
    if (busted) {
      bustedTimer -= dt;
      if (bustedTimer <= 0) respawn();
    } else {
      if (reloadLock > 0) reloadLock -= dt;
      if (driving) {
        const speed = carCtl.update(dt, input());
        hud.setSpeed(Math.abs(speed) * 3.6);
        rig.yaw += (carCtl.heading + Math.PI - rig.yaw) * 0; // keep drag orbit
        rig.follow(dt, heroCar, 'car', speed);
        // M1: reached the docks?
        if (mission === 0 && heroCar.position.distanceTo(new THREE.Vector3(-100, 0, 0)) < 9) {
          setMission(1);
        }
      } else {
        const moved = footCtl.update(dt, input(), rig.yaw);
        footCtl.pose(t);
        rig.follow(dt, hero, 'foot');
        hud.setSpeed(null);
      }
      // drag-orbit yaw: default behind the current heading
      if (!dragging) {
        const targetYaw = driving ? carCtl.heading + Math.PI : footCtl.mesh.rotation.y + Math.PI;
        let dy = targetYaw - rig.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        rig.yaw += dy * Math.min(1, dt * 1.2);
      }
      updateEnemies(dt);
      updatePolice(dt);
      particles.update(dt);
      flash.update(dt);
      tracer.update(dt);
      // clock: 1 game minute per 4 real seconds
      gameMinutes += dt / 4;
      const total = 12 * 60 + Math.floor(gameMinutes);
      hud.setClock(String(Math.floor(total / 60) % 24).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0'));
      // minimap
      const tp = driving ? heroCar.position : hero.position;
      hud.player = { x: tp.x, z: tp.z, heading: driving ? carCtl.heading : hero.rotation.y };
      hud.police = police.map((p) => ({ x: p.mesh.position.x, z: p.mesh.position.z }));
      hud.enemies = enemies.filter((e) => e.alive).map((e) => ({ x: e.mesh.position.x, z: e.mesh.position.z }));
      hud.drawMinimap();
    }
    city.update(dt, t);
    // district label in the mission panel subtitle? keep HUD clean.
  }
  renderer.render(scene, camera);
  frames++;
  if (frames === 3) window.__ready = true;
}
frame();
