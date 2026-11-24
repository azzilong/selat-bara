// SELAT BARA — GTA-like HUD + minimap (step 7).
// Re-written in-session under recording 9 (gta6-01, 2026-11-24).
// DOM HUD (ids live in index.html): mission top-left (name + stage +
// objective + NEXT + progress bar), wanted + clock + money top-right,
// police response panel left-middle, weapon slots right-middle,
// district + standing + minimap 250x250 + health (green) + armour
// (blue) bottom-left, weapon + ammo + speedometer + vehicle bottom-right.
// REBUILD #3 FIX #11 (HUD upgrade, top-1 grammar only): the HUD now
// carries three layers at once — mission + police + progression —
// like the best entries: named police units with live distances,
// district name + standing, stage/NEXT/progress, wanted status text,
// weapon slots, money with the clock, gold minimap border + route
// line + wanted radius circle, vehicle name + damage.
// Minimap is a separate 2D canvas: sea, sand, roads, district blocks,
// player arrow, police (blue) and enemy (red) dots, gold mission route.
import { DISTRICTS } from './city.js';

const $ = (id) => document.getElementById(id);

const WANTED_STATUS = ['', 'PATROL ALERTED', 'UNITS RESPONDING', 'AIR UNIT DEPLOYED'];

export class HUD {
  constructor() {
    this.el = {
      mission: $('mission'), missionName: $('mission-name'), missionObj: $('mission-obj'),
      missionStage: $('mission-stage'), missionNext: $('mission-next'),
      missionProg: $('mission-progress'), missionProgFill: $('mission-progress-fill'),
      wanted: $('wanted'), stars: $('wanted-stars'), clock: $('clock'),
      money: $('money'), wantedStatus: $('wanted-status'),
      response: $('response'), responseTitle: $('response-title'),
      responseRows: $('response-rows'), responseStatus: $('response-status'),
      slots: $('slots'),
      district: $('district'), districtName: $('district-name'),
      districtStreet: $('district-street'), standingPill: $('standing-pill'),
      standingFill: $('standing-fill'),
      healthFill: $('health-fill'), armourFill: $('armour-fill'),
      healthNum: $('health-num'), armourNum: $('armour-num'),
      weapon: $('weapon'), ammo: $('ammo'), speed: $('speed'),
      vehicleName: $('vehicle-name'), vehicleDmg: $('vehicle-dmg'),
      minimap: $('minimap'), title: $('title'), hud: $('hud'), hint: $('hint'),
    };
    this.mapCtx = this.el.minimap.getContext('2d');
    this.wanted = 0;
    this.player = null;   // { x, z, heading }
    this.police = [];     // [{ x, z }]
    this.enemies = [];    // [{ x, z }]
    this.route = null;    // [{ x, z }] gold mission route on the minimap
    this.speedKmh = null;
  }
  // mission: name + objective + optional stage / NEXT step / progress 0..1
  setMission(name, obj, stage = '', next = '', progress = null) {
    this.el.missionName.textContent = name;
    this.el.missionObj.textContent = obj;
    this.el.missionStage.textContent = stage;
    this.el.missionStage.style.display = stage ? 'block' : 'none';
    this.el.missionNext.textContent = next ? 'NEXT ' + next : '';
    this.el.missionNext.style.display = next ? 'block' : 'none';
    if (progress == null) {
      this.el.missionProg.style.display = 'none';
    } else {
      this.el.missionProg.style.display = 'block';
      this.el.missionProgFill.style.width = Math.round(progress * 100) + '%';
    }
    this.el.mission.style.display = name ? 'block' : 'none';
  }
  setWanted(n) {
    this.wanted = n;
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < n ? '★' : '☆';
    this.el.stars.textContent = stars;
    this.el.wanted.style.display = n > 0 ? 'block' : 'none';
    this.el.stars.style.color = n >= 3 ? '#ffcf3d' : '#ffffff';
    const st = WANTED_STATUS[Math.min(n, 3)] || '';
    this.el.wantedStatus.textContent = st;
    this.el.wantedStatus.style.display = st ? 'block' : 'none';
  }
  setMoney(v) {
    this.el.money.textContent = '$ ' + v.toLocaleString('en-US');
  }
  setHealth(v) {
    this.el.healthFill.style.width = Math.max(0, Math.min(100, v)) + '%';
    this.el.healthNum.textContent = Math.round(v);
  }
  setArmour(v) {
    this.el.armourFill.style.width = Math.max(0, Math.min(100, v)) + '%';
    this.el.armourNum.textContent = Math.round(v);
  }
  setAmmo(weapon, mag, reserve) {
    this.el.weapon.textContent = weapon;
    this.el.ammo.textContent = mag + '/' + reserve;
  }
  // weapon slots: 1 FISTS ∞ · 2 PISTOL · 3 SMG; selected gets gold.
  // slots: [{ num, label, ammo, owned }], selected = slot num or 0.
  setSlots(slots, selected = 0) {
    if (!slots || !slots.length) { this.el.slots.style.display = 'none'; return; }
    this.el.slots.style.display = 'block';
    this.el.slots.innerHTML = '';
    for (const s of slots) {
      const row = document.createElement('div');
      row.className = 'slot' + (s.num === selected ? ' sel' : '') + (s.owned ? '' : ' locked');
      row.innerHTML = '<span class="slot-num">' + s.num + '</span>' +
        '<span class="slot-name">' + s.label + '</span>' +
        '<span class="slot-ammo">' + (s.owned ? s.ammo : '—') + '</span>';
      this.el.slots.appendChild(row);
    }
  }
  // police response panel: named units with role + live distance (m).
  // units: [{ name, role, dist }]; status: bottom line or ''.
  setResponse(units, status = '') {
    if (!units || !units.length) { this.el.response.style.display = 'none'; return; }
    this.el.response.style.display = 'block';
    this.el.responseTitle.textContent = 'SELAT BARA PD RESPONSE — ' + units.length + ' UNIT' + (units.length > 1 ? 'S' : '');
    this.el.responseRows.innerHTML = '';
    const shown = units.slice(0, 4);
    for (const u of shown) {
      const row = document.createElement('div');
      row.className = 'resp-row';
      row.innerHTML = '<span class="resp-name">' + u.name + '</span>' +
        '<span class="resp-role' + (u.role === 'RAMMING' ? ' hot' : '') + '">' + u.role + '</span>' +
        '<span class="resp-dist">' + Math.round(u.dist) + ' m</span>';
      this.el.responseRows.appendChild(row);
    }
    if (units.length > 4) {
      const more = document.createElement('div');
      more.className = 'resp-more';
      more.textContent = '+' + (units.length - 4) + ' more';
      this.el.responseRows.appendChild(more);
    }
    this.el.responseStatus.textContent = status;
    this.el.responseStatus.style.display = status ? 'block' : 'none';
  }
  // district + standing above the minimap.
  setDistrict(name, street, label, value) {
    if (!name) { this.el.district.style.display = 'none'; return; }
    this.el.district.style.display = 'block';
    this.el.districtName.textContent = name.toUpperCase();
    this.el.districtStreet.textContent = street || '';
    this.el.standingPill.textContent = (label || 'NEUTRAL') + ' · ' + value;
    this.el.standingFill.style.width = Math.max(0, Math.min(100, value)) + '%';
  }
  // vehicle name + damage under the speedometer (driving only).
  setVehicle(name, damage) {
    if (!name) {
      this.el.vehicleName.style.display = 'none';
      this.el.vehicleDmg.style.display = 'none';
      return;
    }
    this.el.vehicleName.style.display = 'block';
    this.el.vehicleName.textContent = name;
    this.el.vehicleDmg.style.display = 'block';
    this.el.vehicleDmg.textContent = Math.round(damage) + '% DENTED';
    this.el.vehicleDmg.style.color = damage >= 50 ? '#ff6b5e' : '#ffd24a';
  }
  setSpeed(kmh) {
    this.speedKmh = kmh;
    this.el.speed.style.display = kmh == null ? 'none' : 'block';
    if (kmh != null) this.el.speed.textContent = Math.round(kmh) + ' KM/H';
    if (kmh == null) this.setVehicle(null, 0);
  }
  setClock(t) { this.el.clock.textContent = t; }
  setRoute(points) { this.route = points && points.length > 1 ? points : null; }
  showHint(on) { this.el.hint.style.display = on ? 'block' : 'none'; }
  showTitle(on) {
    this.el.title.style.display = on ? 'flex' : 'none';
    this.el.hud.style.display = on ? 'none' : 'block';
    if (on) this.el.clock.style.display = 'block';
  }
  // --- minimap ------------------------------------------------------------
  drawMinimap() {
    const c = this.mapCtx;
    const S = 250;
    // world -150 .. +130 maps to 0 .. 250 (sea sits west)
    const X = (x) => ((x + 150) / 280) * S;
    const Z = (z) => ((z + 140) / 280) * S;
    c.clearRect(0, 0, S, S);
    c.fillStyle = '#1d2733';
    c.fillRect(0, 0, S, S);
    // sea + sand (west edge)
    c.fillStyle = '#2fa8d8';
    c.fillRect(0, 0, X(-146), S);
    c.fillStyle = '#eed9a4';
    c.fillRect(X(-146), 0, X(-112) - X(-146), S);
    // district blocks
    for (const d of DISTRICTS) {
      c.fillStyle = '#3a4a5a';
      c.fillRect(X(d.x0), Z(d.z0), X(d.x1) - X(d.x0), Z(d.z1) - Z(d.z0));
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      c.strokeRect(X(d.x0), Z(d.z0), X(d.x1) - X(d.x0), Z(d.z1) - Z(d.z0));
    }
    // roads (main avenues thicker, amber)
    const lines = [-112, -84, -56, -28, 0, 28, 56, 84, 112];
    for (const v of lines) {
      const main = v === 0;
      c.strokeStyle = main ? '#ffd24a' : '#8a929c';
      c.lineWidth = main ? 3 : 1.5;
      c.beginPath(); c.moveTo(X(-112), Z(v)); c.lineTo(X(112), Z(v)); c.stroke();
      c.beginPath(); c.moveTo(X(v), Z(-112)); c.lineTo(X(v), Z(112)); c.stroke();
    }
    // gold mission route line
    if (this.route) {
      c.strokeStyle = '#ffd24a';
      c.lineWidth = 2.5;
      c.beginPath();
      this.route.forEach((p, i) => {
        if (i === 0) c.moveTo(X(p.x), Z(p.z));
        else c.lineTo(X(p.x), Z(p.z));
      });
      c.stroke();
      // route target marker (gold diamond)
      const last = this.route[this.route.length - 1];
      c.fillStyle = '#ffd24a';
      c.save();
      c.translate(X(last.x), Z(last.z));
      c.rotate(Math.PI / 4);
      c.fillRect(-4, -4, 8, 8);
      c.restore();
    }
    // police dots (blue)
    for (const p of this.police) {
      c.fillStyle = '#3b82f6';
      c.beginPath(); c.arc(X(p.x), Z(p.z), 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
    }
    // enemy dots (red)
    for (const e of this.enemies) {
      c.fillStyle = '#ef4444';
      c.beginPath(); c.arc(X(e.x), Z(e.z), 3.5, 0, Math.PI * 2); c.fill();
    }
    // red wanted-radius circle around the player
    if (this.player && this.wanted >= 1) {
      c.strokeStyle = 'rgba(255,42,30,0.75)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(X(this.player.x), Z(this.player.z), 26, 0, Math.PI * 2);
      c.stroke();
    }
    // player arrow (white, rotated by heading)
    if (this.player) {
      c.save();
      c.translate(X(this.player.x), Z(this.player.z));
      c.rotate(-this.player.heading);
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#111';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath();
      c.fill(); c.stroke();
      c.restore();
    }
    // north tick
    c.fillStyle = '#fff';
    c.font = 'bold 11px Verdana';
    c.fillText('N', S - 16, 14);
  }
}
