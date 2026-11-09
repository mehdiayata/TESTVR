import * as THREE from 'three';
import { BASKET } from './createCourt.js';

const GRAVITY = 9.81;
const SPRING = 230;
const DAMPING = 29;
const MAX_SPEED = 18;
const REBOUND = 0.74;
const DUNK_RISE_SECONDS = 0.13;
const DUNK_DROP_SECONDS = 0.18;
const DUNK_TOP_ABOVE_RIM = 0.28;
const DUNK_DROP_DISTANCE = 0.86;

export function createBallPhysics(ball, radius, onBounce = () => {}, onScore = () => {}) {
  const velocity = new THREE.Vector3();
  const angularVelocity = new THREE.Vector3();
  const target = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const rimPoint = new THREE.Vector3();
  const dunkStart = new THREE.Vector3();
  let held = false;
  let aboveRim = false;
  let scoreEligible = true;
  let dunkTime = -1;
  let dunkScored = false;

  function hold(position, snap = false) {
    if (dunkTime >= 0) return;
    target.copy(position);
    held = true;
    aboveRim = false;
    if (snap) {
      // Both hands define one fixed ball centre; spring lag would move it off-axis.
      ball.position.copy(position);
      velocity.set(0, 0, 0);
      angularVelocity.set(0, 0, 0);
    }
  }

  function release(playerMomentum = null) {
    held = false;
    // Keep only the runner's horizontal momentum. The ball then moves freely.
    velocity.set(playerMomentum?.x ?? 0, 0, playerMomentum?.z ?? 0);
    angularVelocity.set(0, 0, 0);
  }

  function shoot(impulse) {
    dunkTime = -1;
    held = false;
    velocity.copy(impulse).clampLength(0, MAX_SPEED);
    angularVelocity.set(impulse.z * 0.4, impulse.x * 0.35, -impulse.x * 0.25);
    scoreEligible = true;
    aboveRim = false;
  }

  function dunk() {
    if (!held || dunkTime >= 0) return false;
    dunkStart.copy(ball.position);
    held = false;
    aboveRim = false;
    scoreEligible = false;
    dunkScored = false;
    dunkTime = 0;
    velocity.set(0, 0, 0);
    angularVelocity.set(0, 0, 0);
    return true;
  }

  function integrateDunk(dt) {
    dunkTime += dt;
    if (dunkTime <= DUNK_RISE_SECONDS) {
      const progress = dunkTime / DUNK_RISE_SECONDS;
      const eased = progress * progress * (3 - 2 * progress);
      ball.position.set(
        THREE.MathUtils.lerp(dunkStart.x, BASKET.x, eased),
        THREE.MathUtils.lerp(dunkStart.y, BASKET.y + DUNK_TOP_ABOVE_RIM, eased),
        THREE.MathUtils.lerp(dunkStart.z, BASKET.z, eased),
      );
      return;
    }

    const descent = Math.min(1, (dunkTime - DUNK_RISE_SECONDS) / DUNK_DROP_SECONDS);
    ball.position.set(BASKET.x, BASKET.y + DUNK_TOP_ABOVE_RIM - descent * DUNK_DROP_DISTANCE, BASKET.z);
    if (!dunkScored && ball.position.y <= BASKET.y) {
      dunkScored = true;
      velocity.set(0, -DUNK_DROP_DISTANCE / DUNK_DROP_SECONDS, 0);
      onScore(velocity, 'dunk');
    }
    if (descent === 1) {
      dunkTime = -1;
      velocity.set(0, -4, 0);
    }
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
        onScore(velocity);
        // The woven net takes a little energy out of a successful shot.
        velocity.x *= 0.82;
        velocity.y *= 0.8;
        velocity.z *= 0.82;
      }
    }

    if (ball.position.y < BASKET.y - radius * 2 || horizontal > BASKET.rimRadius + radius * 2) {
      aboveRim = false;
    }
  }

  function integrate(dt) {
    if (dunkTime >= 0) {
      integrateDunk(dt);
      return;
    }
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
      if (!held && impact > 0.7) {
        onBounce(impact);
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

  function cancelDunk() {
    if (dunkTime < 0) return;
    dunkTime = -1;
    held = false;
    velocity.set(0, 0, 0);
  }

  return { hold, release, shoot, dunk, cancelDunk, step };
}
