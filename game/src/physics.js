// Selat Bara — simple arcade physics: car controller, foot controller,
// camera rig (low chase cam in a car, over-the-shoulder on foot).
import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Arcade car: accelerate / brake / reverse / steer, drag, city clamp.
export class CarController {
  constructor(object3d) {
    this.obj = object3d;
    this.pos = object3d.position;
    this.heading = 0; // radians; 0 = facing -Z
    this.speed = 0;
    this.maxSpeed = 30;
    this.maxReverse = 10;
  }
  update(dt, input) {
    const accel = input.forward ? 16 : 0;
    const brake = input.back ? 22 : 0;
    if (input.forward) this.speed += accel * dt;
    if (input.back) this.speed -= (this.speed > 0.5 ? brake : 10) * dt;
    if (!input.forward && !input.back) this.speed -= Math.sign(this.speed) * 8 * dt;
    if (Math.abs(this.speed) < 0.05) this.speed = 0;
    this.speed = clamp(this.speed, -this.maxReverse, this.maxSpeed);
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const steerRate = 1.9 * clamp(Math.abs(this.speed) / 8, 0.25, 1);
    this.heading += steer * steerRate * dt * Math.sign(this.speed || 1);
    this.pos.x += -Math.sin(this.heading) * this.speed * dt;
    this.pos.z += -Math.cos(this.heading) * this.speed * dt;
    this.pos.x = clamp(this.pos.x, -94, 94);
    this.pos.z = clamp(this.pos.z, -94, 94);
    this.obj.rotation.y = this.heading;
    return this.speed;
  }
  get kmh() {
    return Math.abs(Math.round(this.speed * 3.6));
  }
}

// On-foot movement, camera-relative.
export class FootController {
  constructor(object3d) {
    this.obj = object3d;
    this.pos = object3d.position;
    this.speed = 5.2;
    this.walkPhase = 0;
  }
  update(dt, input, camYaw) {
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let mz = (input.back ? 1 : 0) - (input.forward ? 1 : 0);
    if (mx === 0 && mz === 0) return false;
    const len = Math.hypot(mx, mz);
    mx /= len; mz /= len;
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const wx = mx * cos - mz * sin;
    const wz = mx * sin + mz * cos;
    this.pos.x = clamp(this.pos.x + wx * this.speed * dt, -94, 94);
    this.pos.z = clamp(this.pos.z + wz * this.speed * dt, -94, 94);
    this.obj.rotation.y = Math.atan2(wx, wz);
    this.walkPhase += dt * 9;
    // simple walk swing
    const ud = this.obj.userData;
    if (ud.legL) {
      ud.legL.rotation.x = Math.sin(this.walkPhase) * 0.5;
      ud.legR.rotation.x = -Math.sin(this.walkPhase) * 0.5;
      ud.armL.rotation.x = -Math.sin(this.walkPhase) * 0.4;
    }
    return true;
  }
}

// Camera: low chase behind a car (with speed FOV kick), over-shoulder on foot.
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.12;
    this.smooth = new THREE.Vector3();
    this.first = true;
  }
  update(dt, target, mode, speedKmh = 0) {
    const cam = this.camera;
    let desired;
    if (mode === 'car') {
      const back = new THREE.Vector3(Math.sin(target.rotation.y), 0, Math.cos(target.rotation.y));
      desired = new THREE.Vector3(
        target.position.x + back.x * 8.5,
        target.position.y + 3.4,
        target.position.z + back.z * 8.5,
      );
      cam.lookAt(target.position.x, target.position.y + 1.2, target.position.z - 4);
      cam.fov = 62 + clamp(speedKmh / 120, 0, 1) * 10;
    } else {
      const yaw = target.rotation.y;
      desired = new THREE.Vector3(
        target.position.x + Math.sin(yaw) * 3.4,
        target.position.y + 2.6,
        target.position.z + Math.cos(yaw) * 3.4,
      );
      cam.lookAt(target.position.x, target.position.y + 1.5, target.position.z - 6);
      cam.fov = 60;
    }
    if (this.first) {
      this.smooth.copy(desired);
      this.first = false;
    } else {
      this.smooth.lerp(desired, 1 - Math.pow(0.0001, dt));
    }
    cam.position.copy(this.smooth);
    cam.updateProjectionMatrix();
  }
  // Snap to an exact cinematic pose (used by frozen scenes).
  snap(pos, lookAt, fov = 60) {
    this.camera.position.set(pos[0], pos[1], pos[2]);
    this.camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.smooth.copy(this.camera.position);
    this.first = false;
  }
}
