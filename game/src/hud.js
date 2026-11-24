// hud.js — SELAT BARA. GTA-like HUD (fix #11, top-1 grammar only,
// our own names/text): mission panel + stage/NEXT/progress (11c),
// police response panel with live distances (11a), district +
// standing above the minimap (11b), wanted status text (11d), weapon
// slots (11e), money + clock top-right (11f), gold minimap border +
// route + wanted circle (11g), speed + vehicle + damage (11h), hint
// hidden in frozen scenes (11i). Full-screen map mode (fix #13/#13a).
import { DISTRICTS, districtAt } from './city.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.minimap = $('minimap');
    this.mm = this.minimap.getContext('2d');
    this.bigmap = $('bigmap');
    this.bm = this.bigmap ? this.bigmap.getContext('2d') : null;
    this.data = null;
    this.units = [];
    this.routeTarget = null;
    this.heroPos = { x: 0, z: 0 };
    this.mapMode = false;
    this.frozen = false;
  }
  setScene(d, { units = [], routeTarget = null, heroPos = null, mapMode = false, frozen = true } = {}) {
    this.data = d;
    this.units = units;
    this.routeTarget = routeTarget;
    if (heroPos) this.heroPos = { x: heroPos.x, z: heroPos.z };
    this.mapMode = mapMode;
    this.frozen = frozen;
    $('mission-name').textContent = d.mission;
    $('mission-objective').textContent = d.objective;
    $('mission-stage').textContent = d.stage;
    $('mission-next').textContent = d.next;
    $('mission-progress').style.width = `${Math.round(d.progress * 100)}%`;
    $('district-name').textContent = d.district;
    $('district-street').textContent = d.street;
    $('standing-pill').textContent = `${d.standing} · ${d.standingVal}`;
    $('standing-pill').className = 'pill ' + d.standing.toLowerCase();
    $('standing-bar').style.width = `${d.standingVal}%`;
    $('clock').textContent = d.clock;
    $('money').textContent = `$ ${d.money.toLocaleString('en-US')}`;
    $('wanted-stars').textContent = '★'.repeat(d.wanted) + '☆'.repeat(5 - d.wanted);
    $('wanted-text').textContent = d.wantedText;
    $('wanted-box').style.display = d.wanted > 0 ? 'block' : 'none';
    $('ammo-text').textContent = `${d.weapon} ${d.ammo}`;
    const slots = document.querySelectorAll('#weapon-slots .slot');
    const ammoMap = { 1: '∞', 2: d.slot === 2 ? d.ammo : '—', 3: d.slot === 3 ? d.ammo : '—' };
    slots.forEach((s, i) => {
      const n = i + 1;
      s.classList.toggle('selected', n === d.slot);
      s.querySelector('.slot-ammo').textContent = ammoMap[n];
    });
    $('speed-value').textContent = d.speed > 0 ? `${d.speed} KM/H` : '';
    $('speed-vehicle').textContent = d.vehicle;
    $('speed-damage').textContent = d.damage > 0 ? `${d.damage}% DENTED` : '';
    $('speed-box').style.display = d.speed > 0 ? 'block' : 'none';
    $('hint-bar').style.display = frozen ? 'none' : 'block';
    $('bigmap-wrap').style.display = mapMode ? 'flex' : 'none';
    $('minimap-wrap').style.display = mapMode ? 'none' : 'block';
    this.renderStandingList();
    this.updatePdPanel();
  }
  updatePdPanel() {
    const d = this.data;
    if (!d) return;
    const panel = $('pd-panel');
    panel.style.display = d.wanted > 0 ? 'block' : 'none';
    $('pd-title').textContent = `SELAT BARA PD RESPONSE — ${this.units.length} UNITS`;
    const rows = $('pd-rows');
    rows.innerHTML = '';
    const shown = this.units.slice(0, 3);
    for (const u of shown) {
      const dist = Math.round(Math.hypot(u.pos.x - this.heroPos.x, u.pos.z - this.heroPos.z));
      const row = document.createElement('div');
      row.className = 'pd-row';
      row.innerHTML = `<span class="pd-name">${u.code} ${u.name}</span>` +
        `<span class="pd-role ${u.role === 'RAMMING' ? 'hot' : ''}">· ${u.role}</span>` +
        `<span class="pd-dist">${dist} m</span>`;
      rows.appendChild(row);
    }
    if (this.units.length > 3) {
      const more = document.createElement('div');
      more.className = 'pd-row pd-more';
      more.textContent = `+${this.units.length - 3} more`;
      rows.appendChild(more);
    }
    $('pd-status').textContent = `CONTROL: ${'★'.repeat(d.wanted)} — units responding`;
  }
  renderStandingList() {
    const list = $('standing-list');
    if (!list) return;
    list.innerHTML = '';
    for (const dist of DISTRICTS) {
      const row = document.createElement('div');
      row.className = 'stand-row' + (this.data && dist.name === this.data.district ? ' current' : '');
      row.innerHTML = `<span class="stand-name">${dist.name}</span>` +
        `<span class="stand-val ${dist.standing.toLowerCase()}">${dist.standing} · ${dist.standingVal}</span>`;
      list.appendChild(row);
    }
  }

  // --- minimap: 250x250, sea + sand + districts + roads, gold border,
  // gold route line (clamped inside the bounds), red wanted circle ---
  drawMinimap() {
    const c = this.mm;
    const S = 250, W = 240; // world window x -130..110, z -105..105
    const px = (x) => ((x + 130) / W) * S;
    const pz = (z) => ((z + 105) / 210) * S;
    const clamp = (v) => Math.max(2, Math.min(S - 2, v));
    c.clearRect(0, 0, S, S);
    c.fillStyle = '#20242a'; // dark base so district colours read true
    c.fillRect(0, 0, S, S);
    c.fillStyle = '#1e90d6'; // sea
    c.fillRect(0, 0, px(-96), S);
    c.fillStyle = '#f5e0a0'; // beach
    c.fillRect(px(-96), 0, px(-84) - px(-96), S);
    for (const d of DISTRICTS) { // district blocks
      c.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
      c.globalAlpha = 0.35;
      c.fillRect(px(d.rect[0]), pz(d.rect[2]), px(d.rect[1]) - px(d.rect[0]), pz(d.rect[3]) - pz(d.rect[2]));
      c.globalAlpha = 1;
    }
    c.fillStyle = '#3d3d3d'; // roads
    for (const v of [-84, -63, -42, -21, 0, 21, 42, 63, 84]) {
      const w = v === 0 ? 12 : 8;
      c.fillRect(px(-96), pz(v - w / 2), px(105) - px(-96), (w / 210) * S);
      c.fillRect(px(v - w / 2), 0, (w / W) * S, S);
    }
    // gold route player -> docks, clamped inside the bounds
    if (this.routeTarget) {
      c.strokeStyle = '#ffd34d';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(clamp(px(this.heroPos.x)), clamp(pz(this.heroPos.z)));
      c.lineTo(clamp(px(this.routeTarget.x)), clamp(pz(this.routeTarget.z)));
      c.stroke();
      c.fillStyle = '#ffd34d';
      c.beginPath();
      c.arc(clamp(px(this.routeTarget.x)), clamp(pz(this.routeTarget.z)), 5, 0, Math.PI * 2);
      c.fill();
    }
    // red wanted circle around the player when wanted >= 1
    if (this.data && this.data.wanted >= 1) {
      c.strokeStyle = '#ff2a22';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(clamp(px(this.heroPos.x)), clamp(pz(this.heroPos.z)), 18, 0, Math.PI * 2);
      c.stroke();
    }
    // police dots (clamped) + player arrow
    for (const u of this.units) {
      c.fillStyle = '#ff2a22';
      c.beginPath();
      c.arc(clamp(px(u.pos.x)), clamp(pz(u.pos.z)), 4, 0, Math.PI * 2);
      c.fill();
    }
    c.save();
    c.translate(clamp(px(this.heroPos.x)), clamp(pz(this.heroPos.z)));
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(-6, 6); c.closePath();
    c.fill();
    c.restore();
  }

  // --- big map (fix #13/#13a): 640x480, gold dashed district
  // boundaries, POI labels, route + distance, legend, standing list ---
  drawBigMap() {
    if (!this.bm) return;
    const c = this.bm;
    const W = 640, H = 480;
    const x0 = -130, x1 = 110, z0 = -90, z1 = 90;
    const px = (x) => ((x - x0) / (x1 - x0)) * W;
    const pz = (z) => ((z - z0) / (z1 - z0)) * H;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#1e90d6';
    c.fillRect(0, 0, px(-96), H);
    c.fillStyle = '#f5e0a0';
    c.fillRect(px(-96), 0, px(-84) - px(-96), H);
    for (const d of DISTRICTS) {
      c.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
      c.globalAlpha = 0.4;
      c.fillRect(px(d.rect[0]), pz(d.rect[2]), px(d.rect[1]) - px(d.rect[0]), pz(d.rect[3]) - pz(d.rect[2]));
      c.globalAlpha = 1;
      c.strokeStyle = '#ffd34d';
      c.lineWidth = 2;
      c.setLineDash([8, 5]);
      c.strokeRect(px(d.rect[0]), pz(d.rect[2]), px(d.rect[1]) - px(d.rect[0]), pz(d.rect[3]) - pz(d.rect[2]));
      c.setLineDash([]);
    }
    c.fillStyle = '#3d3d3d';
    for (const v of [-84, -63, -42, -21, 0, 21, 42, 63, 84]) {
      const w = v === 0 ? 12 : 8;
      c.fillRect(px(-96), pz(v - w / 2), px(105) - px(-96), ((w / 180) * H));
      c.fillRect(px(v - w / 2), 0, ((w / 240) * W), H);
      c.fillStyle = '#ffd34d';
      c.fillRect(px(-96), pz(v) - 1, px(105) - px(-96), 2);
      c.fillStyle = '#3d3d3d';
    }
    // District labels LAST (after the roads), so no road strip ever
    // paints over the text (round-11 render bug: "KOTA TUA" read as
    // "TA T" — the first fix only moved labels past the district
    // fills, not past the roads).
    for (const d of DISTRICTS) {
      c.fillStyle = (this.data && d.name === this.data.district) ? '#ffd34d' : '#ffffff';
      c.font = 'bold 15px sans-serif';
      c.textAlign = 'center';
      c.fillText(d.name, px(d.label[0]), pz(d.label[1]));
      c.font = '11px sans-serif';
      c.fillStyle = '#ffffff';
      c.fillText(d.street, px(d.label[0]), pz(d.label[1]) + 16);
    }
    // POI labels (Selat Bara's own names)
    c.font = 'bold 13px sans-serif';
    c.fillStyle = '#ffd34d';
    c.textAlign = 'left';
    c.fillText('◆ DERMAGA BARA', px(-88) + 6, pz(40));
    c.save();
    c.translate(px(-92), pz(0));
    c.rotate(-Math.PI / 2);
    c.fillStyle = '#ffffff';
    c.font = 'bold 12px sans-serif';
    c.fillText('PANTAI BARA', 0, 0);
    c.restore();
    c.fillStyle = '#ffffff';
    c.fillText('◆ SBPD OFFICE', px(63) + 6, pz(-42));
    // gold GPS route + distance label (same 3D math as the PD panel)
    if (this.routeTarget) {
      const dist = Math.round(Math.hypot(this.routeTarget.x - this.heroPos.x, this.routeTarget.z - this.heroPos.z));
      c.strokeStyle = '#ffd34d';
      c.lineWidth = 3;
      c.setLineDash([10, 6]);
      c.beginPath();
      c.moveTo(px(this.heroPos.x), pz(this.heroPos.z));
      c.lineTo(px(this.routeTarget.x), pz(this.routeTarget.z));
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#ffd34d';
      c.font = 'bold 13px sans-serif';
      c.fillText(`${dist} m`, (px(this.heroPos.x) + px(this.routeTarget.x)) / 2 + 8, (pz(this.heroPos.z) + pz(this.routeTarget.z)) / 2 - 8);
      c.beginPath();
      c.arc(px(this.routeTarget.x), pz(this.routeTarget.z), 7, 0, Math.PI * 2);
      c.fill();
    }
    // wanted circle + police dots + player arrow
    if (this.data && this.data.wanted >= 1) {
      c.strokeStyle = '#ff2a22';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(px(this.heroPos.x), pz(this.heroPos.z), 26, 0, Math.PI * 2);
      c.stroke();
    }
    c.font = 'bold 11px sans-serif';
    for (const u of this.units) {
      c.fillStyle = '#ff2a22';
      c.beginPath();
      c.arc(px(u.pos.x), pz(u.pos.z), 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.fillText(u.code, px(u.pos.x) + 9, pz(u.pos.z) + 4);
    }
    c.save();
    c.translate(px(this.heroPos.x), pz(this.heroPos.z));
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -11); c.lineTo(9, 8); c.lineTo(-9, 8); c.closePath();
    c.fill();
    c.restore();
    c.fillStyle = '#ffffff';
    c.font = 'bold 12px sans-serif';
    c.fillText('RAKA', px(this.heroPos.x) + 12, pz(this.heroPos.z) + 4);
    // compass
    c.fillStyle = '#ffffff';
    c.font = 'bold 14px sans-serif';
    c.fillText('N ↑', W - 34, 22);
  }

  tick() {
    this.updatePdPanel();
    if (this.mapMode) this.drawBigMap();
    else this.drawMinimap();
  }
  setMapMode(on) {
    this.mapMode = on;
    $('bigmap-wrap').style.display = on ? 'flex' : 'none';
    $('minimap-wrap').style.display = on ? 'none' : 'block';
  }
}
