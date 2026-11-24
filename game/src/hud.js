// Selat Bara — HUD: mission panel, police response panel, district +
// standing, minimap canvas, health/armour, wanted, weapon slots, money +
// clock, speedometer. All DOM lives in index.html; this class drives it.
import * as THREE from 'three';
import { DISTRICTS, LINES, roadWidth } from './city.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.map = $('minimap');
    this.mctx = this.map.getContext('2d');
    this.big = $('bigmap');
    this.bctx = this.big ? this.big.getContext('2d') : null;
    this.mapMode = false;
    this.police = [];
    this.playerPos = new THREE.Vector3(0, 0, 0);
    this.wanted = 0;
    this.routeTarget = new THREE.Vector3(0, 0, -60);
    this.slots = [
      { n: 1, name: 'FISTS', ammo: '∞', owned: true, selected: false },
      { n: 2, name: 'PISTOL', ammo: '—', owned: false, selected: false },
      { n: 3, name: 'SMG', ammo: '30/90', owned: true, selected: true },
    ];
  }

  // ---- scene setup ----
  applyScene(cfg) {
    if (cfg.mission) {
      $('mission-panel').style.display = 'block';
      $('mission-title').textContent = cfg.mission;
      $('mission-stage').textContent = cfg.stage || '';
      $('mission-objective').textContent = cfg.objective || '';
      $('mission-next').textContent = cfg.next ? 'NEXT ' + cfg.next : '';
      $('mission-bar-fill').style.width = Math.round((cfg.progress || 0) * 100) + '%';
    } else {
      $('mission-panel').style.display = 'none';
    }
    this.setWanted(cfg.wanted || 0, cfg.wantedText || '');
    this.setMoney(cfg.money ?? 250);
    this.setClock(cfg.clock || '12:00');
    this.setHealth(cfg.health ?? 100);
    this.setArmour(cfg.armour ?? 60);
    this.setAmmo(cfg.weapon || 'SMG', cfg.mag ?? 30, cfg.reserve ?? 90);
    this.setDistrict(cfg.district, cfg.street, cfg.standing, cfg.standingVal);
    this.setSpeed(cfg.speed, cfg.vehicle, cfg.damage);
    this.setHintVisible(false);
  }

  setMission(title, stage, objective, next, progress) {
    $('mission-panel').style.display = 'block';
    $('mission-title').textContent = title;
    $('mission-stage').textContent = stage;
    $('mission-objective').textContent = objective;
    $('mission-next').textContent = next ? 'NEXT ' + next : '';
    $('mission-bar-fill').style.width = Math.round(progress * 100) + '%';
  }

  setDistrict(name, street, standing, value) {
    if (!name) return;
    $('district-name').textContent = name;
    $('district-street').textContent = street || '';
    $('standing-pill').textContent = (standing || 'NEUTRAL') + ' · ' + (value ?? 50);
    $('standing-bar-fill').style.width = (value ?? 50) + '%';
    $('district-block').style.display = 'block';
  }

  // ---- full city map (?scene=map): the minimap, enlarged, with legend,
  // district standings and POI labels. Only markers that really exist in
  // the game are drawn — no invented systems, no save slots (the game has
  // no save/load), no waypoint (there is none).
  setMapMode(on) {
    this.mapMode = on;
    $('minimap-wrap').style.display = on ? 'none' : 'block';
    $('bigmap-wrap').style.display = on ? 'block' : 'none';
    if (on) this.renderStandingList();
  }

  renderStandingList() {
    const box = $('standing-list');
    if (!box) return;
    box.innerHTML = '';
    for (const d of DISTRICTS) {
      const row = document.createElement('div');
      row.className = 'st-row';
      const wary = d.standing === 'WARY';
      row.innerHTML = '<span class="st-dot" style="background:' + d.css + '"></span>' +
        '<span class="st-name">' + d.name + '</span>' +
        '<span class="st-pill' + (wary ? ' wary' : '') + '">' + d.standing + ' · ' + d.standingVal + '</span>' +
        '<span class="st-bar"><span style="width:' + d.standingVal + '%;background:' + (wary ? '#ffc81a' : '#2aff66') + '"></span></span>';
      box.appendChild(row);
    }
  }

  drawBigMap() {
    if (!this.bctx) return;
    const c = this.bctx, W = 640, H = 480;
    // world window x -130..110, z -90..90 — uniform scale, sea included.
    const k = 640 / 240;
    const px = (x) => (x + 130) * k;
    const pz = (z) => (z + 90) * k;
    const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#1a2436';
    c.fillRect(0, 0, W, H);
    // sea (west) + sand strip
    c.fillStyle = '#1e9bd8';
    c.fillRect(0, 0, px(-96), H);
    c.fillStyle = '#e8d8a0';
    c.fillRect(px(-96), 0, px(-88) - px(-96), H);
    // district blocks (identity colours) + gold dashed boundaries
    for (const d of DISTRICTS) {
      const [x0, z0, x1, z1] = d.rect;
      c.fillStyle = d.css;
      c.fillRect(px(x0), pz(z0), px(x1) - px(x0), pz(z1) - pz(z0));
    }
    // roads: asphalt strips at true width, yellow centre line on mains.
    // Horizontal roads start at the shoreline (x -96) — they never cross
    // the sea or the beach.
    const shoreX = px(-96);
    for (const v of LINES) {
      const w = roadWidth(v) * k;
      c.fillStyle = '#2e3138';
      c.fillRect(px(v) - w / 2, 0, w, H);
      c.fillRect(shoreX, pz(v) - w / 2, W - shoreX, w);
      if (roadWidth(v) === 12) {
        c.strokeStyle = '#e8c81a';
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(px(v), 0); c.lineTo(px(v), H); c.stroke();
        c.beginPath(); c.moveTo(shoreX, pz(v)); c.lineTo(W, pz(v)); c.stroke();
      }
    }
    // gold dashed district boundaries
    c.strokeStyle = '#ffc81a';
    c.lineWidth = 2.5;
    c.setLineDash([8, 5]);
    for (const d of DISTRICTS) {
      const [x0, z0, x1, z1] = d.rect;
      c.strokeRect(px(x0), pz(z0), px(x1) - px(x0), pz(z1) - pz(z0));
    }
    c.setLineDash([]);
    // district name labels (current district gold, others white).
    // Anchors sit mid-block, between road lines — never on a road or a
    // district boundary. No street sub-labels here — the district-block
    // HUD already shows the street, and a second "Dermaga Bara" would
    // duplicate the POI.
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const d of DISTRICTS) {
      const [lx, lz] = d.label;
      const cx = cl(px(lx), 60, W - 60);
      const cy = cl(pz(lz), 24, H - 24);
      c.font = '800 15px Arial';
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillText(d.name, cx + 1, cy + 1);
      c.fillStyle = d.name === 'PELABUHAN BARA' ? '#ffc81a' : '#ffffff';
      c.fillText(d.name, cx, cy);
    }
    // POI labels (real places only): the docks + the beach
    const dockX = cl(px(-88), 70, W - 70), dockY = cl(pz(40), 20, H - 20);
    c.font = '800 12px Arial';
    c.fillStyle = '#ffc81a';
    c.fillText('◆ DERMAGA BARA', dockX, dockY - 20);
    c.save();
    c.translate(cl(px(-112), 20, W - 20), H / 2);
    c.rotate(-Math.PI / 2);
    c.font = '800 12px Arial';
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.textAlign = 'center';
    c.fillText('PANTAI BARA', 0, 0);
    c.restore();
    // gold mission route (clamped inside the map) + distance label
    const rx0 = cl(px(this.playerPos.x), 8, W - 8), ry0 = cl(pz(this.playerPos.z), 8, H - 8);
    const rx1 = cl(px(this.routeTarget.x), 8, W - 8), ry1 = cl(pz(this.routeTarget.z), 8, H - 8);
    c.strokeStyle = '#ffc81a';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(rx0, ry0); c.lineTo(rx1, ry1); c.stroke();
    c.fillStyle = '#ffc81a';
    c.beginPath(); c.arc(rx1, ry1, 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#7a5a00';
    c.lineWidth = 2;
    c.beginPath(); c.arc(rx1, ry1, 6, 0, Math.PI * 2); c.stroke();
    const distM = Math.round(this.playerPos.distanceTo(this.routeTarget));
    const mx = (rx0 + rx1) / 2, my = (ry0 + ry1) / 2;
    c.font = '800 13px Arial';
    const label = distM + ' m';
    const tw = c.measureText(label).width;
    c.fillStyle = 'rgba(10,16,28,0.85)';
    c.fillRect(mx - tw / 2 - 6, my - 22, tw + 12, 18);
    c.fillStyle = '#ffc81a';
    c.textAlign = 'center';
    c.fillText(label, mx, my - 13);
    // wanted radius circle around the player
    if (this.wanted >= 1) {
      c.strokeStyle = '#ff2a1a';
      c.lineWidth = 2.5;
      c.beginPath(); c.arc(rx0, ry0, 34, 0, Math.PI * 2); c.stroke();
    }
    // police dots + short unit labels (blue, live positions). Short
    // labels only — the full names + roles + distances live in the PD
    // response panel, and long labels collide with district names.
    c.font = '700 11px Arial';
    c.textAlign = 'left';
    for (const u of this.police) {
      if (!u.obj) continue;
      const ux = cl(px(u.obj.position.x), 8, W - 8), uy = cl(pz(u.obj.position.z), 8, H - 8);
      c.fillStyle = '#4a9aff';
      c.beginPath(); c.arc(ux, uy, 5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(ux, uy, 5, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#ffffff';
      c.fillText(u.name.split(' ')[0], ux + 9, uy + 4); // 'SBPD-7', 'SBPD-AIR' …
    }
    // player arrow (white) + name
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(rx0, ry0 - 10); c.lineTo(rx0 - 8, ry0 + 8); c.lineTo(rx0 + 8, ry0 + 8);
    c.closePath(); c.fill();
    c.strokeStyle = '#1a2436';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(rx0, ry0 - 10); c.lineTo(rx0 - 8, ry0 + 8); c.lineTo(rx0 + 8, ry0 + 8);
    c.closePath(); c.stroke();
    c.font = '800 12px Arial';
    c.fillStyle = '#ffffff';
    c.textAlign = 'left';
    c.fillText('RAKA', rx0 + 12, ry0 + 4);
    // compass
    c.font = '800 14px Arial';
    c.fillStyle = '#ffffff';
    c.textAlign = 'right';
    c.fillText('N ↑', W - 10, 20);
  }

  setWanted(n, text) {
    this.wanted = n;
    $('wanted-box').style.display = n > 0 ? 'block' : 'none';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < n ? '★' : '☆';
    $('wanted-stars').textContent = stars;
    $('wanted-text').textContent = text || '';
  }

  setMoney(m) { $('money').textContent = '$ ' + m.toLocaleString('en-US'); }
  setClock(t) { $('clock').textContent = t; }

  setHealth(h) {
    $('health-fill').style.width = h + '%';
    $('health-num').textContent = Math.round(h);
  }
  setArmour(a) {
    $('armour-fill').style.width = a + '%';
    $('armour-num').textContent = Math.round(a);
  }

  setAmmo(weapon, mag, reserve) {
    $('ammo-weapon').textContent = weapon;
    $('ammo-count').textContent = mag + '/' + reserve;
    const smg = this.slots[2];
    smg.ammo = mag + '/' + reserve;
    this.renderSlots();
  }

  setSpeed(kmh, vehicle, damage) {
    if (kmh == null) {
      $('speed-block').style.display = 'none';
      return;
    }
    $('speed-block').style.display = 'block';
    $('speed-num').textContent = kmh + ' KM/H';
    $('speed-vehicle').textContent = vehicle || '';
    $('speed-damage').textContent = damage || '';
  }

  setWeaponSlots(slots) {
    this.slots = slots;
    this.renderSlots();
  }

  renderSlots() {
    const box = $('weapon-slots');
    box.innerHTML = '';
    for (const s of this.slots) {
      const row = document.createElement('div');
      row.className = 'slot' + (s.selected ? ' sel' : '') + (s.owned ? '' : ' dim');
      row.innerHTML = '<span class="slot-n">' + s.n + '</span> ' + s.name +
        ' <span class="slot-ammo">' + s.ammo + '</span>';
      box.appendChild(row);
    }
  }

  // Police response panel: rows are NAME + ROLE + live distance in metres.
  setPolice(units, controlLine) {
    this.police = units;
    $('pd-title').textContent = 'SELAT BARA PD RESPONSE — ' + units.length + (units.length === 1 ? ' UNIT' : ' UNITS');
    $('pd-control').textContent = controlLine || '';
    $('pd-panel').style.display = units.length ? 'block' : 'none';
    this.renderPoliceRows();
  }

  renderPoliceRows() {
    const box = $('pd-rows');
    box.innerHTML = '';
    const shown = this.police.slice(0, 4);
    for (const u of shown) {
      const d = u.obj ? Math.round(u.obj.position.distanceTo(this.playerPos)) : (u.dist ?? 0);
      const row = document.createElement('div');
      row.className = 'pd-row';
      const roleCls = u.role === 'RAMMING' ? 'role-red' : (u.role === 'AIR UNIT' ? 'role-gold' : '');
      row.innerHTML = '<b>' + u.name + '</b> <span class="' + roleCls + '">' + u.role + '</span>' +
        ' <span class="pd-dist">' + d + ' m</span>';
      box.appendChild(row);
    }
    if (this.police.length > 4) {
      const more = document.createElement('div');
      more.className = 'pd-row dim';
      more.textContent = '+' + (this.police.length - 4) + ' more';
      box.appendChild(more);
    }
  }

  setHintVisible(v) {
    $('hint-bar').style.display = v ? 'block' : 'none';
  }

  // ---- minimap (2D canvas, 250x250) ----
  drawMinimap(enemies = []) {
    const c = this.mctx, S = 250;
    c.clearRect(0, 0, S, S);
    c.fillStyle = '#1a2436';
    c.fillRect(0, 0, S, S);
    // sea (west = left) + sand
    c.fillStyle = '#1e9bd8';
    c.fillRect(0, 0, 26, S);
    c.fillStyle = '#e8d8a0';
    c.fillRect(26, 0, 8, S);
    // district blocks (schematic, world ±96 -> map 34..250)
    const px = (x) => 34 + ((x + 96) / 192) * 212;
    const pz = (z) => ((z + 96) / 192) * S;
    const districts = [
      [-96, -96, -42, 96, '#2a4a6a'], [-42, -96, 42, -21, '#4a3a2a'],
      [-42, -21, 42, 96, '#3a5a3a'], [42, -96, 96, 0, '#5a5a6a'], [42, 0, 96, 96, '#6a5a2a'],
    ];
    for (const [x0, z0, x1, z1, col] of districts) {
      c.fillStyle = col;
      c.fillRect(px(x0), pz(z0), px(x1) - px(x0), pz(z1) - pz(z0));
    }
    // roads
    c.strokeStyle = '#8a8a82';
    c.lineWidth = 3;
    for (const v of [-84, -63, -42, -21, 0, 21, 42, 63, 84]) {
      c.beginPath(); c.moveTo(px(v), 0); c.lineTo(px(v), S); c.stroke();
      c.beginPath(); c.moveTo(0, pz(v)); c.lineTo(S, pz(v)); c.stroke();
    }
    // gold mission route line (player -> target), clamped inside the map
    // so it can never run off the top edge (FIX 13)
    const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const gx0 = cl(px(this.playerPos.x), 6, S - 6), gy0 = cl(pz(this.playerPos.z), 6, S - 6);
    const gx1 = cl(px(this.routeTarget.x), 6, S - 6), gy1 = cl(pz(this.routeTarget.z), 6, S - 6);
    c.strokeStyle = '#ffc81a';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(gx0, gy0);
    c.lineTo(gx1, gy1);
    c.stroke();
    c.fillStyle = '#ffc81a';
    c.beginPath();
    c.arc(gx1, gy1, 4, 0, Math.PI * 2);
    c.fill();
    // wanted radius circle around the player
    if (this.wanted >= 1) {
      c.strokeStyle = '#ff2a1a';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(gx0, gy0, 26, 0, Math.PI * 2);
      c.stroke();
    }
    // police dots (blue) + enemy dots (red), clamped inside the map
    for (const u of this.police) {
      if (!u.obj) continue;
      c.fillStyle = '#4a9aff';
      c.beginPath();
      c.arc(cl(px(u.obj.position.x), 6, S - 6), cl(pz(u.obj.position.z), 6, S - 6), 4, 0, Math.PI * 2);
      c.fill();
    }
    for (const e of enemies) {
      c.fillStyle = '#ff2a1a';
      c.beginPath();
      c.arc(cl(px(e.position.x), 6, S - 6), cl(pz(e.position.z), 6, S - 6), 4, 0, Math.PI * 2);
      c.fill();
    }
    // player arrow (centre-ish, white triangle)
    const x = cl(px(this.playerPos.x), 8, S - 8), y = cl(pz(this.playerPos.z), 8, S - 8);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x, y - 8); c.lineTo(x - 6, y + 6); c.lineTo(x + 6, y + 6);
    c.closePath();
    c.fill();
  }

  // Per-frame: refresh live distances + redraw the minimap (and the big
  // map when map mode is on).
  tick(dt, playerPos, enemies = []) {
    if (playerPos) this.playerPos.copy(playerPos);
    if (this.police.length) this.renderPoliceRows();
    this.drawMinimap(enemies);
    if (this.mapMode) this.drawBigMap();
  }
}
