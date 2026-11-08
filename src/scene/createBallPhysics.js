import * as THREE from 'three';
import { BASKET } from './createCourt.js';

const GRAVITY = 9.81;
const SPRING = 230;
const DAMPING = 29;
const MAX_SPEED = 18;
const REBOUND = 0.74;
const DRIBBLE_FOLLOW = 8;
const DRIBBLE_SPEED = 3.5;

export function createBallPhysics(ball, radius, onBounce = () => {}, onScore = () => {}) {
  const velocity = new THREE.Vector3();
  const angularVelocity = new THREE.Vector3();
  const target = new THREE.Vector3();
  const dribbleTarget = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const rimPoint = new THREE.Vector3();
  let held = false;
  let dribbling = false;
  let aboveRim = false;
  let scoreEligible = true;

  function hold(position) {
    target.copy(position);
    held = true;
    dribbling = false;
    aboveRim = false;
  }

  function release() {
    held = false;
    dribbling = false;
    velocity.set(0, 0, 0);
    angularVelocity.set(0, 0, 0);
  }

  function shoot(impulse) {
    held = false;
    dribbling = false;
    velocity.copy(impulse).clampLength(0, MAX_SPEED);
    angularVelocity.set(impulse.z * 0.4, impulse.x * 0.35, -impulse.x * 0.25);
    scoreEligible = true;
    aboveRim = false;
  }

  function startDribble(position) {
    release();
    dribbling = true;
    dribbleTarget.copy(position);
    velocity.y = -2.6;
  }

  function guideDribble(position) {
    dribbleTarget.copy(position);
  }

  function stopDribble() {
    dribbling = false;
  }

  function bounceOnPlane(height) {
    ball.position.y = height + radius;
    if (velocity.y < 0) velocity.y *= -REBOUND;
    if (Math.abs(velocity.y) < 0.12) velocity.y = 0;
    velocity.x *= 0.96;
    velocity.z *= 0.96;
    angularVelocity.multiplyScalar(0.9);
  }

  function collideWithRim() {
    const dx = ball.position.x - BASKET.x;
    const dz = ball.position.z - BASKET.z;
    const horizontal = Math.hypot(dx, dz);
    if (horizontal > 0.001) {
      rimPoint.set(
        BASKET.x + dx / horizontal * BASKET.rimRadius,
        BASKET.y,
        BASKET.z + dz / horizontal * BASKET.rimRadius,
      );
    } else {
      rimPoint.set(BASKET.rimRadius, BASKET.y, BASKET.z);
    }

    normal.copy(ball.position).sub(rimPoint);
    const distance = normal.length();
    const contact = radius + 0.026;
    if (distance >= contact) return;
    if (distance < 0.001) normal.set(1, 0, 0);
    else normal.divideScalar(distance);
    ball.position.addScaledVector(normal, contact - distance);
    const approach = velocity.dot(normal);
    if (approach < 0) {
      velocity.addScaledVector(normal, -(1 + REBOUND) * approach);
      if (!held) onBounce(-approach);
    }
  }

  function checkBasket(previousX, previousY, previousZ) {
    if (held || !scoreEligible) return;
    const dx = ball.position.x - BASKET.x;
    const dz = ball.position.z - BASKET.z;
    const horizontal = Math.hypot(dx, dz);
    if (ball.position.y > BASKET.y + radius * 0.5 && horizontal < BASKET.rimRadius + radius) {
      aboveRim = true;
    }

    if (aboveRim && previousY > BASKET.y && ball.position.y <= BASKET.y && velocity.y < 0) {
      const fraction = (previousY - BASKET.y) / (previousY - ball.position.y);
      const x = previousX + (ball.position.x - previousX) * fraction - BASKET.x;
      const z = previousZ + (ball.position.z - previousZ) * fraction - BASKET.z;
      const clearRadius = BASKET.rimRadius - radius - 0.02;
      if (x * x + z * z < clearRadius * clearRadius) {
        scoreEligible = false;
        aboveRim = false;
        onScore();
      }
    }

    if (ball.position.y < BASKET.y - radius * 2 || horizontal > BASKET.rimRadius + radius * 2) {
      aboveRim = false;
    }
  }

  function integrate(dt) {
    const previousX = ball.position.x;
    const previousY = ball.position.y;
    const previousZ = ball.position.z;

    if (held) {
      velocity.addScaledVector(target, SPRING * dt);
      velocity.addScaledVector(ball.position, -SPRING * dt);
      velocity.addScaledVector(velocity, -DAMPING * dt);
    } else {
      velocity.y -= GRAVITY * dt;
      velocity.multiplyScalar(1 - 0.05 * dt);
      if (dribbling) {
        const follow = Math.min(1, DRIBBLE_FOLLOW * dt);
        const desiredX = THREE.MathUtils.clamp((dribbleTarget.x - ball.position.x) * 7, -DRIBBLE_SPEED, DRIBBLE_SPEED);
        const desiredZ = THREE.MathUtils.clamp((dribbleTarget.z - ball.position.z) * 7, -DRIBBLE_SPEED, DRIBBLE_SPEED);
        velocity.x += (desiredX - velocity.x) * follow;
        velocity.z += (desiredZ - velocity.z) * follow;
      }
    }

    velocity.clampLength(0, MAX_SPEED);
    ball.position.addScaledVector(velocity, dt);
    ball.rotation.x += angularVelocity.x * dt;
    ball.rotation.y += angularVelocity.y * dt;
    ball.rotation.z += angularVelocity.z * dt;
    angularVelocity.multiplyScalar(1 - (held ? 8 : 0.5) * dt);

    if (ball.position.y < radius) {
      const impact = -velocity.y;
      bounceOnPlane(0);
      if (!held && impact > 0.7) onBounce(impact);
      if (dribbling) {
        const peakHeight = THREE.MathUtils.clamp(dribbleTarget.y - 0.12, 0.65, 1.3);
        velocity.y = Math.sqrt(2 * GRAVITY * (peakHeight - radius));
      }
    }

    // La face avant du panneau renvoie la balle vers le terrain.
    if (previousZ - radius >= BASKET.boardFront && ball.position.z - radius < BASKET.boardFront &&
      Math.abs(ball.position.x) < 0.9 + radius && ball.position.y > 2.975 - radius &&
      ball.position.y < 4.025 + radius) {
      ball.position.z = BASKET.boardFront + radius;
      if (!held) onBounce(-velocity.z);
      velocity.z = Math.abs(velocity.z) * REBOUND;
    }

    collideWithRim();
    checkBasket(previousX, previousY, previousZ);

    for (const axis of ['x', 'z']) {
      const low = axis === 'x' ? -8.1 : -14.8;
      const high = axis === 'x' ? 8.1 : 2.1;
      if (ball.position[axis] < low + radius) {
        ball.position[axis] = low + radius;
        velocity[axis] = Math.abs(velocity[axis]) * REBOUND;
      } else if (ball.position[axis] > high - radius) {
        ball.position[axis] = high - radius;
        velocity[axis] = -Math.abs(velocity[axis]) * REBOUND;
      }
    }
  }

  function step(deltaSeconds) {
    let remaining = Math.min(Math.max(deltaSeconds, 0), 0.05);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120);
      integrate(dt);
      remaining -= dt;
    }
  }

  return { hold, release, shoot, startDribble, guideDribble, stopDribble, step };
}
