// SELAT BARA — simple vehicle + on-foot physics (step 4).
// Re-written in-session under recording 8 (gta6-01, 2026-11-24).
// Arcade car model on purpose: forward / reverse / steer, speed-based
// steering, drag, and a hard clamp to the city bounds. No external
// physics library (brief forbids it). On-foot controller walks the hero
// at 4 units/s with the camera heading as forward.
import * as THREE from 'three';
import { animateWheels } from './vehicleBuilder.js';
import { animateWalk, animateIdle } from './characterBuilder.js';

const CITY_LIMIT = 108;

// --- arcade car controller ---------------------------------------------
export class CarController {
  constructor(mesh) {
    this.mesh = mesh;
    this.pos = mesh.position.clone();
    this.heading = 0;      // radians, 0 = facing -Z
    this.speed = 0;        // units/second, + forward
    this.steer = 0;        // -1 .. 1
    this.maxSpeed = 26;
    this.maxReverse = 9;
  }
  // input: { up, down, left, right } booleans
  update(dt, input) {
    const ACCEL = 16, BRAKE = 26, DRAG = 3.2, STEER_RATE = 2.4;
    if (input.up) this.speed += ACCEL * dt;
    if (input.down) this.speed -= (this.speed > 0.5 ? BRAKE : ACCEL * 0.6) * dt;
    if (!input.up && !input.down) {
      this.speed -= Math.sign(this.speed) * DRAG * dt;
      if (Math.abs(this.speed) < 0.2) this.speed = 0;
    }
    this.speed = Math.max(-this.maxReverse, Math.min(this.maxSpeed, this.speed));
    // steering only bites while moving; stronger at low speed
    const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const dir = this.speed >= 0 ? 1 : -1;
    this.heading += this.steer * STEER_RATE * dt * Math.min(1, Math.abs(this.speed) / 8) * dir;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    this.pos.x += fx * this.speed * dt;
    this.pos.z += fz * this.speed * dt;
    // stay inside the city
    this.pos.x = Math.max(-CITY_LIMIT, Math.min(CITY_LIMIT, this.pos.x));
    this.pos.z = Math.max(-CITY_LIMIT, Math.min(CITY_LIMIT, this.pos.z));
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    animateWheels(this.mesh, this.speed, dt);
    return this.speed;
  }
}

// --- on-foot controller --------------------------------------------------
export class FootController {
  constructor(mesh) {
    this.mesh = mesh;
    this.pos = mesh.position.clone();
    this.heading = 0; // facing -Z
    this.speed = 0;
    this.moving = false;
  }
  // input: { up, down, left, right }, camHeading: camera yaw
  update(dt, input, camHeading) {
    const WALK = 4.2;
    let mx = 0, mz = 0;
    if (input.up) mz -= 1;
    if (input.down) mz += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    this.moving = mx !== 0 || mz !== 0;
    if (this.moving) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      // rotate the input vector by the camera heading
      const sin = Math.sin(camHeading), cos = Math.cos(camHeading);
      const wx = mx * cos - mz * sin;
      const wz = mx * sin + mz * cos;
      this.pos.x += wx * WALK * dt;
      this.pos.z += wz * WALK * dt;
      this.pos.x = Math.max(-CITY_LIMIT, Math.min(CITY_LIMIT, this.pos.x));
      this.pos.z = Math.max(-CITY_LIMIT, Math.min(CITY_LIMIT, this.pos.z));
      this.heading = Math.atan2(-wx, -wz);
      this.mesh.position.copy(this.pos);
      // turn smoothly toward the walk direction
      let d = this.heading - this.mesh.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.mesh.rotation.y += d * Math.min(1, dt * 12);
      this.speed = WALK;
    } else {
      this.speed = 0;
    }
    return this.moving;
  }
  // pose the hero mesh for the current frame
  pose(t) {
    if (this.moving) animateWalk(this.mesh, t);
    else animateIdle(this.mesh, t);
  }
}

// --- third-person camera rig --------------------------------------------
// onFoot: over-the-shoulder close (hero fills 1/4-1/3 of frame).
// driving: low chase behind the car. Lerp for a steady feel.
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;   // orbit around the target
    this.pitch = 0.32;
  }
  // target: Object3D or Vector3; mode 'foot' | 'car'; speed for FOV kick
  follow(dt, target, mode, speed = 0) {
    const tp = target.isVector3 ? target : target.position;
    const dist = mode === 'car' ? 8.5 : 5.2;
    const height = mode === 'car' ? 3.4 : 3.0;
    const cx = tp.x + Math.sin(this.yaw) * dist;
    const cz = tp.z + Math.cos(this.yaw) * dist;
    const cy = tp.y + height + this.pitch * 4;
    const k = 1 - Math.exp(-dt * 7);
    this.camera.position.x += (cx - this.camera.position.x) * k;
    this.camera.position.y += (cy - this.camera.position.y) * k;
    this.camera.position.z += (cz - this.camera.position.z) * k;
    this.camera.lookAt(tp.x, tp.y + 1.6, tp.z);
    // slight FOV kick at speed while driving
    const wantFov = mode === 'car' ? 60 + Math.min(10, Math.abs(speed) * 0.35) : 60;
    if (Math.abs(this.camera.fov - wantFov) > 0.05) {
      this.camera.fov += (wantFov - this.camera.fov) * Math.min(1, dt * 4);
      this.camera.updateProjectionMatrix();
    }
  }
}
