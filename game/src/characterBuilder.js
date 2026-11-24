// characterBuilder.js — Selat Bara characters (realistic 1.8u proportions,
// head ~1/7 of body) + pickups. All Box/Cylinder geometry, Lambert, no textures.
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

// Roles: 'hero' (ember-red jacket + SMG), 'enemy' (rifle + orange band),
// 'police' (navy uniform + cap), 'pedestrian' (plain clothes).
export function buildCharacter(opts = {}) {
  const {
    skin = 0xc68e5e, shirt = 0xd21f2b, pants = 0x2c313a, shoes = 0x222222,
    hair = 0x1a1410, role = 'hero', gun = null,
  } = opts;
  const g = new THREE.Group();
  const skinMat = lam(skin), shirtMat = lam(shirt), pantsMat = lam(pants),
        shoeMat = lam(shoes), hairMat = lam(hair);

  // legs: 0.85 tall (feet at 0, hips at 0.85)
  const legL = part(0.17, 0.85, 0.2, pantsMat, -0.11, 0.425, 0);
  const legR = part(0.17, 0.85, 0.2, pantsMat, 0.11, 0.425, 0);
  legL.geometry.translate(0, -0.425, 0); legL.position.y = 0.85;
  legR.geometry.translate(0, -0.425, 0); legR.position.y = 0.85;
  const shoeL = part(0.18, 0.1, 0.3, shoeMat, -0.11, 0.05, 0.04);
  const shoeR = part(0.18, 0.1, 0.3, shoeMat, 0.11, 0.05, 0.04);
  // torso: 0.55 tall (0.85 -> 1.40)
  const torso = part(0.52, 0.55, 0.28, shirtMat, 0, 1.125, 0);
  // arms: 0.6 long, hang from shoulders (1.38)
  const armL = part(0.13, 0.6, 0.15, shirtMat, -0.33, 1.08, 0);
  const armR = part(0.13, 0.6, 0.15, shirtMat, 0.33, 1.08, 0);
  armL.geometry.translate(0, -0.3, 0); armL.position.y = 1.38;
  armR.geometry.translate(0, -0.3, 0); armR.position.y = 1.38;
  const handL = part(0.12, 0.1, 0.13, skinMat, -0.33, 0.76, 0);
  const handR = part(0.12, 0.1, 0.13, skinMat, 0.33, 0.76, 0);
  // head: 0.26 cube (1.40 -> 1.66) + hair cap; total height ~1.8 with hair
  const head = part(0.26, 0.26, 0.26, skinMat, 0, 1.53, 0);
  const hairTop = part(0.28, 0.09, 0.28, hairMat, 0, 1.69, 0);
  const hairBack = part(0.28, 0.16, 0.08, hairMat, 0, 1.58, -0.11);
  g.add(legL, legR, shoeL, shoeR, torso, armL, armR, handL, handR, head, hairTop, hairBack);
  g.userData.legL = legL; g.userData.legR = legR;
  g.userData.armL = armL; g.userData.armR = armR;
  g.userData.head = head;

  if (role === 'hero') {
    // ember-red jacket panels + open collar, dark jeans, SMG in right hand
    const jacket = part(0.54, 0.4, 0.3, lam(0xb01e24), 0, 1.2, 0);
    g.add(jacket);
    const collar = part(0.3, 0.08, 0.3, lam(0x7a1518), 0, 1.42, 0);
    g.add(collar);
    const smg = new THREE.Group();
    smg.add(part(0.07, 0.07, 0.62, lam(0x22262e), 0, 0, 0.18));
    smg.add(part(0.05, 0.16, 0.05, lam(0x22262e), 0, -0.09, 0.05));
    smg.add(part(0.05, 0.05, 0.16, lam(0x3a4048), 0, 0.02, 0.48));
    smg.position.set(0.33, 1.02, 0.28);
    g.add(smg);
    g.userData.gun = smg;
    g.userData.gunTip = new THREE.Object3D();
    g.userData.gunTip.position.set(0, 0.02, 0.56);
    smg.add(g.userData.gunTip);
    armR.rotation.x = -1.15; // gun arm raised forward
    armL.rotation.x = -0.7;
  }
  if (role === 'enemy') {
    // orange armband + rifle
    const band = part(0.15, 0.09, 0.17, lam(0xff7a1a, 0xff7a1a, 0.8), -0.33, 1.3, 0);
    g.add(band);
    const rifle = new THREE.Group();
    rifle.add(part(0.06, 0.06, 0.85, lam(0x2c313a), 0, 0, 0.2));
    rifle.add(part(0.05, 0.14, 0.05, lam(0x2c313a), 0, -0.08, 0.1));
    rifle.position.set(0.33, 1.05, 0.3);
    g.add(rifle);
    g.userData.gun = rifle;
    g.userData.gunTip = new THREE.Object3D();
    g.userData.gunTip.position.set(0, 0, 0.62);
    rifle.add(g.userData.gunTip);
    armR.rotation.x = -1.05;
    armL.rotation.x = -0.6;
  }
  if (role === 'police') {
    // navy uniform + peaked cap + badge dot
    const vest = part(0.54, 0.42, 0.3, lam(0x1d2a4a), 0, 1.18, 0);
    g.add(vest);
    const capTop = part(0.3, 0.07, 0.3, lam(0x14203a), 0, 1.7, 0);
    const capBrim = part(0.3, 0.04, 0.14, lam(0x0e1626), 0, 1.66, 0.16);
    const badge = part(0.07, 0.07, 0.02, lam(0xffc23a, 0xffc23a, 1.4), -0.14, 1.3, 0.16);
    g.add(capTop, capBrim, badge);
  }
  if (gun === 'smg') {
    const smg = new THREE.Group();
    smg.add(part(0.07, 0.07, 0.62, lam(0x22262e), 0, 0, 0.18));
    smg.position.set(0.33, 1.02, 0.28);
    g.add(smg);
    g.userData.gun = smg;
    g.userData.gunTip = new THREE.Object3D();
    g.userData.gunTip.position.set(0, 0.02, 0.56);
    smg.add(g.userData.gunTip);
    armR.rotation.x = -1.15;
  }
  return g;
}

// Poses: 'idle' | 'walk' (legs swing) | 'fallen' (flat on back, rotation X 90deg).
export function setPose(ch, pose, phase = 0) {
  if (pose === 'fallen') {
    ch.rotation.x = -Math.PI / 2;
    ch.position.y = 0.16;
    return;
  }
  ch.rotation.x = 0;
  if (pose === 'walk') {
    const s = Math.sin(phase) * 0.4;
    ch.userData.legL.rotation.x = s;
    ch.userData.legR.rotation.x = -s;
    ch.userData.armL.rotation.x = -s * 0.7;
    ch.userData.armR.rotation.x = s * 0.7;
  } else {
    ch.userData.legL.rotation.x = 0;
    ch.userData.legR.rotation.x = 0;
    ch.userData.armL.rotation.x = 0;
    if (ch.userData.gun) ch.userData.armR.rotation.x = -1.15;
    else ch.userData.armR.rotation.x = 0;
  }
}

// --- Drops: cash (green bundle + big gold "$") / ammo (gold box + brass bullet).
// Box/cylinder geometry only — no textures, no canvas text. userData.bobPhase
// drives the bob; scenes billboard the drop to face the camera.
export function buildDrop(kind) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.05, 6, 24),
    lam(0xffc23a, 0xffc23a, 2.0),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.55;
  g.add(ring);
  if (kind === 'cash') {
    const bundle = part(0.62, 0.26, 0.4, lam(0x2a9e4f), 0, 0, 0);
    const strap = part(0.64, 0.28, 0.12, lam(0x1d7a38), 0, 0, 0);
    g.add(bundle, strap);
    // big gold "$": chunky box-built glyph, emissive, floats above the bundle
    const gold = lam(0xffc23a, 0xffc23a, 2.6);
    const dollar = new THREE.Group();
    dollar.add(part(0.62, 0.13, 0.06, gold, 0, 0.34, 0));       // top bar
    dollar.add(part(0.13, 0.2, 0.06, gold, -0.24, 0.22, 0));    // upper-left stem
    dollar.add(part(0.62, 0.13, 0.06, gold, 0, 0.1, 0));        // middle bar
    dollar.add(part(0.13, 0.2, 0.06, gold, 0.24, -0.02, 0));    // lower-right stem
    dollar.add(part(0.62, 0.13, 0.06, gold, 0, -0.14, 0));      // bottom bar
    dollar.add(part(0.16, 0.98, 0.07, gold, 0, 0.1, 0.01));     // spine, thick + sticking out top and bottom
    dollar.position.y = 0.85;
    g.add(dollar);
    g.userData.marker = dollar;
  } else {
    const crate = part(0.55, 0.4, 0.55, lam(0xd9a83c, 0xd9a83c, 0.7), 0, 0, 0);
    const lid = part(0.57, 0.08, 0.57, lam(0xb8892e), 0, 0.24, 0);
    g.add(crate, lid);
    // upright brass bullet: cylinder body + pale cone tip + rim
    const bullet = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 10), lam(0xd9a83c, 0xd9a83c, 1.2));
    body.position.y = 0.21;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 10), lam(0xf2e3c6, 0xf2e3c6, 0.9));
    tip.position.y = 0.55;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 10), lam(0x8a6a22));
    rim.position.y = 0.03;
    bullet.add(body, tip, rim);
    bullet.position.y = 0.28;
    g.add(bullet);
    g.userData.marker = bullet;
  }
  g.userData.bobPhase = Math.random() * 6;
  g.userData.baseY = 1.3;
  g.scale.setScalar(2.0);
  return g;
}
