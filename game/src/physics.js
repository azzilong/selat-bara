// physics.js — Selat Bara arcade physics: simple car + foot controllers,
// camera rig (low chase behind the car, over-shoulder on foot). No libraries.
import * as THREE from 'three';
import { CITY_MIN, CITY_MAX } from './city.js';

export class CarController {
  constructor(mesh) {
    this.mesh = mesh;
    this.heading = Math.PI; // facing -Z (north) by default
    this.speed = 0;
    this.pos = new THREE.Vector3(0, 0, 12);
    this.maxSpeed = 30;
    this.maxReverse = 10;
  }
  update(dt, input) {
    const accel = 14, brake = 26, drag = 6;
    if (input.forward) this.speed += accel * dt;
    if (input.back) this.speed -= (this.speed > 0.5 ? brake : accel * 0.7) * dt;
    if (!input.forward && !input.back) {
      const s = Math.sign(this.speed);
      this.speed -= s * drag * dt;
      if (Math.sign(this.speed) !== s) this.speed = 0;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxReverse, this.maxSpeed);
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const steerAuthority = THREE.MathUtils.clamp(Math.abs(this.speed) / 8, 0, 1);
    this.heading += steer * 1.9 * steerAuthority * dt * Math.sign(this.speed || 1);
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    // keep inside the city grid
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, CITY_MIN + 2, CITY_MAX - 2);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, CITY_MIN + 2, CITY_MAX - 2);
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
    return Math.abs(this.speed);
  }
}

export class FootController {
  constructor(mesh) {
    this.mesh = mesh;
    this.pos = new THREE.Vector3(0, 0, 14);
    this.heading = Math.PI;
    this.walkPhase = 0;
  }
  update(dt, input, camHeading) {
    let mx = 0, mz = 0;
    if (input.forward) mz -= 1;
    if (input.back) mz += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      const sin = Math.sin(camHeading), cos = Math.cos(camHeading);
      const wx = mx * cos - mz * sin;
      const wz = mx * sin + mz * cos;
      const speed = 6;
      this.pos.x += wx * speed * dt;
      this.pos.z += wz * speed * dt;
      this.heading = Math.atan2(wx, wz);
      this.walkPhase += dt * 9;
    }
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, CITY_MIN + 2, CITY_MAX - 2);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, CITY_MIN + 2, CITY_MAX - 2);
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
    return Math.abs(mx) + Math.abs(mz) > 0;
  }
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'foot'; // 'foot' | 'car' | 'fixed'
    this.cur = new THREE.Vector3(6, 4, 26);
    this.lookCur = new THREE.Vector3(0, 1.2, 0);
  }
  followCar(carPos, heading, speed, dt) {
    const back = 8.5 + speed * 0.08;
    const target = new THREE.Vector3(
      carPos.x - Math.sin(heading) * back,
      3.6 + speed * 0.02,
      carPos.z - Math.cos(heading) * back,
    );
    const look = new THREE.Vector3(carPos.x + Math.sin(heading) * 6, 1.4, carPos.z + Math.cos(heading) * 6);
    const k = 1 - Math.exp(-6 * dt);
    this.cur.lerp(target, k);
    this.lookCur.lerp(look, k);
    this.camera.position.copy(this.cur);
    this.camera.lookAt(this.lookCur);
    this.camera.fov = 62 + Math.min(10, speed * 0.25);
    this.camera.updateProjectionMatrix();
  }
  followFoot(footPos, heading, dt) {
    const target = new THREE.Vector3(
      footPos.x - Math.sin(heading) * 4.2,
      2.6,
      footPos.z - Math.cos(heading) * 4.2,
    );
    const look = new THREE.Vector3(footPos.x + Math.sin(heading) * 5, 1.5, footPos.z + Math.cos(heading) * 5);
    const k = 1 - Math.exp(-8 * dt);
    this.cur.lerp(target, k);
    this.lookCur.lerp(look, k);
    this.camera.position.copy(this.cur);
    this.camera.lookAt(this.lookCur);
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
  }
  snap(pos, look) {
    this.cur.copy(pos);
    this.lookCur.copy(look);
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
  }
}
