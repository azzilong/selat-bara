// physics.js — SELAT BARA. Simple arcade car physics (forward, reverse,
// steer, drag, city clamp), foot controller, and the camera rig
// (over-the-shoulder on foot, low chase behind the car, FOV kick).
import * as THREE from 'three';

export class CarController {
  constructor(mesh) {
    this.mesh = mesh;
    this.speed = 0;
    this.heading = Math.PI; // front faces -Z at heading 0; start facing +Z
    this.maxSpeed = 26;
    this.maxReverse = 10;
  }
  update(dt, input) {
    const accel = 16, brake = 26, drag = 4.5;
    if (input.forward) this.speed += accel * dt;
    if (input.back) this.speed -= brake * dt;
    if (!input.forward && !input.back) {
      const s = Math.sign(this.speed);
      this.speed -= s * drag * dt;
      if (Math.sign(this.speed) !== s) this.speed = 0;
    }
    this.speed = Math.max(-this.maxReverse, Math.min(this.maxSpeed, this.speed));
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    if (Math.abs(this.speed) > 0.1) {
      this.heading += steer * 1.9 * dt * Math.sign(this.speed);
    }
    const dx = Math.sin(this.heading) * this.speed * dt;
    const dz = Math.cos(this.heading) * this.speed * dt;
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x + dx, -100, 100);
    this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z + dz, -100, 100);
    this.mesh.rotation.y = this.heading;
    return this.speed;
  }
}

export class FootController {
  constructor(mesh) {
    this.mesh = mesh;
    this.speed = 0;
  }
  update(dt, input, camYaw) {
    let mx = 0, mz = 0;
    if (input.forward) mz -= 1;
    if (input.back) mz += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    const len = Math.hypot(mx, mz);
    this.speed = len > 0 ? 6 : 0;
    if (len > 0) {
      mx /= len; mz /= len;
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      const wx = mx * cos - mz * sin;
      const wz = mx * sin + mz * cos;
      this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x + wx * 6 * dt, -100, 100);
      this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z + wz * 6 * dt, -100, 100);
      this.mesh.rotation.y = Math.atan2(wx, wz);
    }
    return this.speed;
  }
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.12;
  }
  // Low chase cam behind the car (cinematic, close to the road).
  followCar(car, dt) {
    const back = new THREE.Vector3(
      car.position.x - Math.sin(car.rotation.y) * 9.5,
      3.4,
      car.position.z - Math.cos(car.rotation.y) * 9.5,
    );
    this.camera.position.lerp(back, 1 - Math.pow(0.001, dt));
    const look = new THREE.Vector3(car.position.x, 1.4, car.position.z - 4);
    this.camera.lookAt(look);
    const targetFov = 62 + Math.min(14, Math.abs(car.userData.speed || 0) * 0.5);
    this.camera.fov += (targetFov - this.camera.fov) * dt * 3;
    this.camera.updateProjectionMatrix();
  }
  // Over-the-shoulder when on foot.
  followFoot(person, dt) {
    const yaw = person.rotation.y;
    const back = new THREE.Vector3(
      person.position.x - Math.sin(yaw) * 3.2,
      person.position.y + 2.6,
      person.position.z - Math.cos(yaw) * 3.2,
    );
    this.camera.position.lerp(back, 1 - Math.pow(0.001, dt));
    this.camera.lookAt(person.position.x, person.position.y + 1.4, person.position.z - 2.5);
    this.camera.fov += (58 - this.camera.fov) * dt * 3;
    this.camera.updateProjectionMatrix();
  }
  // Free orbit for the idle/title dolly.
  orbit(center, radius, height, angle) {
    this.camera.position.set(
      center.x + Math.sin(angle) * radius,
      height,
      center.z + Math.cos(angle) * radius,
    );
    this.camera.lookAt(center.x, 2, center.z);
  }
}
