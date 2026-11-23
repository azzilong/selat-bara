// SELAT BARA — GTA-like HUD + minimap (step 7).
// Re-written in-session under recording 8 (gta6-01, 2026-11-24).
// DOM HUD (ids live in index.html): mission top-left, wanted stars +
// clock top-right, minimap 250x250 + health (green) + armour (blue)
// bottom-left, weapon + ammo + speedometer bottom-right.
// Minimap is a separate 2D canvas: sea, sand, roads, district blocks,
// player arrow, police (blue) and enemy (red) dots.
import { DISTRICTS } from './city.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      mission: $('mission'), missionName: $('mission-name'), missionObj: $('mission-obj'),
      wanted: $('wanted'), stars: $('wanted-stars'), clock: $('clock'),
      healthFill: $('health-fill'), armourFill: $('armour-fill'),
      healthNum: $('health-num'), armourNum: $('armour-num'),
      weapon: $('weapon'), ammo: $('ammo'), speed: $('speed'),
      minimap: $('minimap'), title: $('title'), hud: $('hud'),
    };
    this.mapCtx = this.el.minimap.getContext('2d');
    this.wanted = 0;
    this.player = null;   // { x, z, heading }
    this.police = [];     // [{ x, z }]
    this.enemies = [];    // [{ x, z }]
    this.speedKmh = null;
  }
  setMission(name, obj) {
    this.el.missionName.textContent = name;
    this.el.missionObj.textContent = obj;
    this.el.mission.style.display = name ? 'block' : 'none';
  }
  setWanted(n) {
    this.wanted = n;
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < n ? '★' : '☆';
    this.el.stars.textContent = stars;
    this.el.wanted.style.display = n > 0 ? 'block' : 'none';
    this.el.stars.style.color = n >= 3 ? '#ffcf3d' : '#ffffff';
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
  setSpeed(kmh) {
    this.speedKmh = kmh;
    this.el.speed.style.display = kmh == null ? 'none' : 'block';
    if (kmh != null) this.el.speed.textContent = Math.round(kmh) + ' KM/H';
  }
  setClock(t) { this.el.clock.textContent = t; }
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
