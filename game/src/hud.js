// hud.js — Selat Bara HUD: mission panel, Selat Bara PD response panel,
// district + standing, weapon slots, money + clock, minimap (250x250) and
// the full city map (640x480) with legend + standing list. DOM + 2D canvas.
import { DISTRICTS, districtAt } from './city.js';

const WORLD = { x0: -130, x1: 110, z0: -90, z1: 90 }; // big-map window
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class HUD {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.minimap = this.el('minimap');
    this.mm = this.minimap.getContext('2d');
    this.bigmap = this.el('bigmap');
    this.bm = this.bigmap.getContext('2d');
    this.mapMode = false; // false = minimap visible, true = big map overlay
    this.player = { x: 0, z: 12 };
    this.police = []; // {name, short, role, x, z}
    this.enemies = [];
    this.routeTarget = null; // {x, z, label}
    this.wanted = 0;
    this.district = DISTRICTS[0];
    this.mission = null;
    this.renderStandingList();
  }

  // --- mission / wanted / district / weapons / money / speed ---
  setMission(m) {
    this.mission = m;
    this.el('mission-name').textContent = m.name;
    this.el('mission-objective').textContent = m.objective;
    this.el('mission-stage').textContent = m.stage;
    this.el('mission-next').textContent = m.next;
    this.el('mission-progress').style.width = `${Math.round(m.progress * 100)}%`;
  }
  setWanted(n) {
    this.wanted = n;
    const stars = this.el('stars');
    stars.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'star' + (i < n ? ' on' : '');
      s.textContent = '★';
      stars.appendChild(s);
    }
    const status = n >= 3 ? 'AIR UNIT DEPLOYED' : n === 2 ? 'UNITS RESPONDING' : n === 1 ? 'PATROL ALERTED' : '';
    const ws = this.el('wanted-status');
    ws.textContent = status;
    ws.style.display = status ? 'block' : 'none';
    this.el('wanted-box').style.display = n > 0 ? 'block' : 'none';
  }
  setDistrict(d) {
    this.district = d;
    this.el('district-name').textContent = d.name;
    this.el('district-street').textContent = d.street;
    const pill = this.el('district-standing');
    pill.textContent = `${d.standing} · ${d.standingVal}`;
    pill.className = 'standing-pill ' + (d.standing === 'WARY' ? 'wary' : 'neutral');
    this.el('standing-bar').style.width = `${d.standingVal}%`;
  }
  setHealth(h, a) {
    this.el('health-bar').style.width = `${clamp(h, 0, 100)}%`;
    this.el('health-num').textContent = Math.round(h);
    this.el('armour-bar').style.width = `${clamp(a, 0, 100)}%`;
    this.el('armour-num').textContent = Math.round(a);
  }
  setWeapon(slots, selected) {
    const wrap = this.el('weapon-slots');
    wrap.innerHTML = '';
    slots.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'slot' + (i === selected ? ' selected' : '') + (s.owned ? '' : ' locked');
      row.innerHTML = `<span class="slot-num">${i + 1}</span> <span class="slot-name">${s.name}</span> <span class="slot-ammo">${s.owned ? (s.ammo ?? '∞') : '—'}</span>`;
      wrap.appendChild(row);
    });
    const cur = slots[selected];
    this.el('weapon-name').textContent = cur.name;
    this.el('ammo').textContent = cur.owned ? (cur.ammo ?? '∞') : '—';
  }
  setMoney(n) { this.el('money').textContent = `$ ${n.toLocaleString('en-US')}`; }
  setClock(t) { this.el('clock').textContent = t; }
  setSpeed(kmh, vehicle, damage) {
    const sp = this.el('speed-box');
    if (kmh == null) { sp.style.display = 'none'; return; }
    sp.style.display = 'block';
    this.el('speed').textContent = `${Math.round(kmh)} KM/H`;
    this.el('speed-vehicle').textContent = vehicle || '';
    this.el('speed-damage').textContent = damage ? `${damage}% DENTED` : '';
  }
  showHint(show) { this.el('hint-bar').style.display = show ? 'block' : 'none'; }
  showHUD(show) { this.el('hud').style.display = show ? 'block' : 'none'; }
  showTitle(show) { this.el('title-overlay').style.display = show ? 'flex' : 'none'; }
  showBusted(show) { this.el('busted-overlay').style.display = show ? 'flex' : 'none'; }

  // --- Selat Bara PD response panel: named units + role + LIVE distance ---
  setPD(units) {
    this.police = units;
    const rows = this.el('pd-rows');
    rows.innerHTML = '';
    this.el('pd-title').textContent = `SELAT BARA PD RESPONSE — ${units.length} UNITS`;
    units.slice(0, 4).forEach((u) => {
      const d = Math.round(Math.hypot(u.x - this.player.x, u.z - this.player.z));
      const row = document.createElement('div');
      row.className = 'pd-row';
      row.innerHTML = `<span class="pd-name">${u.name}</span> <span class="pd-role ${u.role === 'RAMMING' ? 'hot' : ''}">${u.role}</span> <span class="pd-dist">${d} m</span>`;
      rows.appendChild(row);
    });
    if (units.length > 4) {
      const more = document.createElement('div');
      more.className = 'pd-row pd-more';
      more.textContent = `+${units.length - 4} more units`;
      rows.appendChild(more);
    }
    this.el('pd-status').textContent = this.wanted > 0
      ? `CONTROL: ${this.wanted}★ — units responding`
      : 'CONTROL: calm — no active pursuit';
  }

  // --- standing list (big map panel), built from the DISTRICTS table ---
  renderStandingList() {
    const list = this.el('standing-list');
    if (!list) return;
    list.innerHTML = '';
    for (const d of DISTRICTS) {
      const row = document.createElement('div');
      row.className = 'stand-row';
      const css = `#${d.color.toString(16).padStart(6, '0')}`;
      row.innerHTML = `<span class="stand-dot" style="background:${css}"></span>` +
        `<span class="stand-name">${d.name}</span>` +
        `<span class="stand-val ${d.standing === 'WARY' ? 'wary' : ''}">${d.standing} · ${d.standingVal}</span>` +
        `<span class="stand-bar"><span style="width:${d.standingVal}%"></span></span>`;
      list.appendChild(row);
    }
  }

  setMapMode(on) {
    this.mapMode = on;
    this.el('bigmap-wrap').style.display = on ? 'flex' : 'none';
    this.el('minimap-wrap').style.display = on ? 'none' : 'block';
  }

  // --- minimap: 250x250, gold border, gold route (CLAMPED inside), wanted circle ---
  drawMinimap() {
    const c = this.mm, S = 250;
    const px = (x) => ((x - WORLD.x0) / (WORLD.x1 - WORLD.x0)) * S;
    const pz = (z) => ((z - WORLD.z0) / (WORLD.z1 - WORLD.z0)) * S;
    c.clearRect(0, 0, S, S);
    // sea + sand
    c.fillStyle = '#2fa8d8'; c.fillRect(0, 0, px(-96), S);
    c.fillStyle = '#e8d8a8'; c.fillRect(px(-96), 0, px(-88) - px(-96), S);
    // district blocks
    for (const d of DISTRICTS) {
      c.fillStyle = `#${d.color.toString(16).padStart(6, '0')}`;
      c.globalAlpha = 0.55;
      c.fillRect(px(d.rect.x0), pz(d.rect.z0), px(d.rect.x1) - px(d.rect.x0), pz(d.rect.z1) - pz(d.rect.z0));
    }
    c.globalAlpha = 1;
    // roads
    c.strokeStyle = '#33363d'; c.lineWidth = 5;
    for (const p of [-63, -42, -21, 0, 21, 42, 63]) {
      c.beginPath(); c.moveTo(px(p), 0); c.lineTo(px(p), S); c.stroke();
      c.beginPath(); c.moveTo(0, pz(p)); c.lineTo(S, pz(p)); c.stroke();
    }
    // gold mission route, clamped inside the canvas
    if (this.routeTarget) {
      const ax = clamp(px(this.player.x), 4, S - 4), ay = clamp(pz(this.player.z), 4, S - 4);
      const bx = clamp(px(this.routeTarget.x), 4, S - 4), by = clamp(pz(this.routeTarget.z), 4, S - 4);
      c.strokeStyle = '#ffc23a'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      c.fillStyle = '#ffc23a';
      c.beginPath(); c.arc(bx, by, 4, 0, Math.PI * 2); c.fill();
    }
    // wanted radius circle around the player (clamped centre)
    if (this.wanted >= 1) {
      c.strokeStyle = 'rgba(255,42,42,0.85)'; c.lineWidth = 2;
      c.beginPath(); c.arc(clamp(px(this.player.x), 14, S - 14), clamp(pz(this.player.z), 14, S - 14), 13, 0, Math.PI * 2); c.stroke();
    }
    // police dots (clamped)
    for (const u of this.police) {
      c.fillStyle = '#ff2a2a';
      c.beginPath(); c.arc(clamp(px(u.x), 4, S - 4), clamp(pz(u.z), 4, S - 4), 3.5, 0, Math.PI * 2); c.fill();
    }
    for (const e of this.enemies) {
      c.fillStyle = '#ff7a1a';
      c.beginPath(); c.arc(clamp(px(e.x), 4, S - 4), clamp(pz(e.z), 4, S - 4), 3, 0, Math.PI * 2); c.fill();
    }
    // player arrow (clamped)
    const ax = clamp(px(this.player.x), 8, S - 8), ay = clamp(pz(this.player.z), 8, S - 8);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(ax, ay - 7); c.lineTo(ax + 5, ay + 5); c.lineTo(ax - 5, ay + 5); c.closePath(); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 1; c.stroke();
    // north marker
    c.fillStyle = '#ffffff'; c.font = 'bold 13px sans-serif'; c.textAlign = 'right';
    c.fillText('N', S - 8, S - 8);
  }

  // --- big map: 640x480, districts + gold dashed boundaries + labels + POIs ---
  drawBigMap() {
    const c = this.bm, W = 640, H = 480;
    const px = (x) => ((x - WORLD.x0) / (WORLD.x1 - WORLD.x0)) * W;
    const pz = (z) => ((z - WORLD.z0) / (WORLD.z1 - WORLD.z0)) * H;
    c.clearRect(0, 0, W, H);
    // sea + sand
    c.fillStyle = '#2fa8d8'; c.fillRect(0, 0, px(-96), H);
    c.fillStyle = '#e8d8a8'; c.fillRect(px(-96), 0, px(-88) - px(-96), H);
    // district blocks in identity colours
    for (const d of DISTRICTS) {
      c.fillStyle = `#${d.color.toString(16).padStart(6, '0')}`;
      c.globalAlpha = 0.5;
      c.fillRect(px(d.rect.x0), pz(d.rect.z0), px(d.rect.x1) - px(d.rect.x0), pz(d.rect.z1) - pz(d.rect.z0));
    }
    c.globalAlpha = 1;
    // gold dashed district boundaries
    c.strokeStyle = '#ffc23a'; c.lineWidth = 2; c.setLineDash([7, 5]);
    for (const d of DISTRICTS) {
      c.strokeRect(px(d.rect.x0) + 1, pz(d.rect.z0) + 1, px(d.rect.x1) - px(d.rect.x0) - 2, pz(d.rect.z1) - pz(d.rect.z0) - 2);
    }
    c.setLineDash([]);
    // roads at true width with yellow centre lines
    for (const p of [-63, -42, -21, 0, 21, 42, 63]) {
      const wv = (p === 0 ? 12 : 8) / (WORLD.x1 - WORLD.x0) * W;
      c.fillStyle = '#33363d';
      c.fillRect(px(p) - wv / 2, 0, wv, H);
      c.fillRect(0, pz(p) - wv / 2, W, wv);
      c.strokeStyle = '#d9b400'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(px(p), 0); c.lineTo(px(p), H); c.stroke();
      c.beginPath(); c.moveTo(0, pz(p)); c.lineTo(W, pz(p)); c.stroke();
    }
    // district labels anchored mid-block (clear of roads)
    c.textAlign = 'center';
    for (const d of DISTRICTS) {
      const current = d.key === this.district.key;
      c.font = `bold ${current ? 17 : 15}px sans-serif`;
      c.fillStyle = current ? '#ffc23a' : '#ffffff';
      c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 3;
      c.strokeText(d.name, px(d.label.x), pz(d.label.z));
      c.fillText(d.name, px(d.label.x), pz(d.label.z));
    }
    // POI labels (Selat Bara's own names)
    c.font = 'bold 13px sans-serif'; c.fillStyle = '#ffe14d';
    c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 3;
    const dockX = px(-86), dockZ = pz(40);
    c.textAlign = 'left';
    c.strokeText('◆ DERMAGA BARA', dockX + 6, dockZ);
    c.fillText('◆ DERMAGA BARA', dockX + 6, dockZ);
    // vertical beach label
    c.save();
    c.translate(px(-92), pz(0));
    c.rotate(-Math.PI / 2);
    c.font = 'bold 14px sans-serif'; c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.strokeText('PANTAI BARA', 0, 0);
    c.fillText('PANTAI BARA', 0, 0);
    c.restore();
    // gold route player -> docks + distance label
    if (this.routeTarget) {
      const ax = px(this.player.x), ay = pz(this.player.z);
      const bx = px(this.routeTarget.x), by = pz(this.routeTarget.z);
      c.strokeStyle = '#ffc23a'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      c.fillStyle = '#ffc23a';
      c.beginPath(); c.arc(bx, by, 6, 0, Math.PI * 2); c.fill();
      const dist = Math.round(Math.hypot(this.routeTarget.x - this.player.x, this.routeTarget.z - this.player.z));
      const mx = (ax + bx) / 2, my = (ay + by) / 2 - 10;
      c.font = 'bold 14px sans-serif';
      c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 3;
      c.strokeText(`${dist} m`, mx, my);
      c.fillStyle = '#ffe14d';
      c.fillText(`${dist} m`, mx, my);
    }
    // wanted radius circle
    if (this.wanted >= 1) {
      c.strokeStyle = 'rgba(255,42,42,0.9)'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(px(this.player.x), pz(this.player.z), 26, 0, Math.PI * 2); c.stroke();
    }
    // police dots + short labels
    c.font = 'bold 11px sans-serif';
    for (const u of this.police) {
      c.fillStyle = '#ff2a2a';
      c.beginPath(); c.arc(px(u.x), pz(u.z), 5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 3;
      c.strokeText(u.short, px(u.x) + 8, pz(u.z) + 4);
      c.fillText(u.short, px(u.x) + 8, pz(u.z) + 4);
    }
    // player arrow + name
    const ax = px(this.player.x), ay = pz(this.player.z);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(ax, ay - 10); c.lineTo(ax + 8, ay + 8); c.lineTo(ax - 8, ay + 8); c.closePath(); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 1.5; c.stroke();
    c.font = 'bold 13px sans-serif'; c.textAlign = 'left';
    c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 3;
    c.strokeText('RAKA', ax + 10, ay + 5);
    c.fillStyle = '#ffffff';
    c.fillText('RAKA', ax + 10, ay + 5);
    // compass
    c.font = 'bold 15px sans-serif'; c.textAlign = 'right';
    c.fillStyle = '#ffffff';
    c.fillText('N ↑', W - 10, 20);
  }

  tick() {
    if (this.mapMode) this.drawBigMap();
    else this.drawMinimap();
    if (this.police.length) this.setPD(this.police);
  }
}
