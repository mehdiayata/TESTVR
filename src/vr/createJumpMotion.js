import * as THREE from 'three';
import { BASKET } from '../scene/createCourt.js';

const GRAVITY = 9.81;
const BASE_JUMP_SPEED = 3.8;
const JUMP_SPEED_GAIN = 0.37;
const MAX_JUMP_SPEED = 6;
const RIM_ASCENT_SECONDS = 0.62;
const RIM_SETTLE_SECONDS = 0.16;
const MIN_HANG_SECONDS = 0.45;
const MAX_HANG_SECONDS = 1.35;
const RIM_HAND_X = -0.23;
const RIM_HAND_Z = 0.24;

export function createJumpMotion(player) {
  const start = new THREE.Vector3();
  const target = new THREE.Vector3();
  const peak = new THREE.Vector3();
  const state = { phase: 'grounded', running: false, canRimJump: false,
    hangStarted: false, hanging: false, leaping: false, speed: 0, speedFraction: 0 };
  let groundY = player.position.y;
  let verticalSpeed = 0;
  let elapsed = 0;

  function reset(value = 0) {
    groundY = value;
    player.position.y = groundY;
    verticalSpeed = 0;
    elapsed = 0;
    state.phase = 'grounded';
    state.running = false;
    state.canRimJump = false;
    state.hangStarted = false;
    state.hanging = false;
    state.leaping = false;
    state.speed = 0;
    state.speedFraction = 0;
  }

  function startNormal(horizontalSpeed = 0) {
    if (state.phase !== 'grounded') return false;
    // The current approach speed affects the jump even before full sprint speed is reached.
    verticalSpeed = Math.min(MAX_JUMP_SPEED, BASE_JUMP_SPEED + JUMP_SPEED_GAIN * horizontalSpeed);
    state.phase = 'normal';
    return true;
  }

  function startRimJump(handPosition, horizontalSpeed = 0) {
    if (state.phase !== 'grounded') return false;
    start.copy(player.position);
    // Align the virtual left hand with the front lip of the rim at the apex.
    target.set(
      player.position.x + BASKET.x + RIM_HAND_X - handPosition.x,
      groundY + THREE.MathUtils.clamp(BASKET.y + 0.04 - handPosition.y, 0.9, 1.7),
      player.position.z + BASKET.z + RIM_HAND_Z - handPosition.z,
    );
    // Faster approaches overshoot the rim vertically, then ease back into a handhold.
    peak.copy(target);
    peak.y += THREE.MathUtils.clamp((horizontalSpeed - 1.1) * 0.18, 0, 0.75);
    elapsed = 0;
    state.phase = 'rising';
    return true;
  }

  function update(dt, leftGripPressed = false) {
    const step = Math.min(Math.max(dt, 0), 0.05);
    state.hangStarted = false;

    if (state.phase === 'normal') {
      verticalSpeed -= GRAVITY * step;
      player.position.y += verticalSpeed * step;
      if (player.position.y <= groundY) {
        player.position.y = groundY;
        verticalSpeed = 0;
        state.phase = 'grounded';
      }
    } else if (state.phase === 'rising') {
      elapsed = Math.min(RIM_ASCENT_SECONDS, elapsed + step);
      const progress = elapsed / RIM_ASCENT_SECONDS;
      const eased = 1 - (1 - progress) ** 3;
      player.position.copy(start).lerp(peak, eased);
      if (progress >= 1) {
        player.position.copy(peak);
        state.phase = 'settling';
        elapsed = 0;
      }
    } else if (state.phase === 'settling') {
      elapsed = Math.min(RIM_SETTLE_SECONDS, elapsed + step);
      const progress = elapsed / RIM_SETTLE_SECONDS;
      const eased = progress * progress * (3 - 2 * progress);
      player.position.copy(peak).lerp(target, eased);
      if (progress >= 1) {
        player.position.copy(target);
        state.phase = 'hanging';
        state.hangStarted = true;
        elapsed = 0;
      }
    } else if (state.phase === 'hanging') {
      player.position.copy(target);
      elapsed += step;
      if (elapsed >= MAX_HANG_SECONDS || (!leftGripPressed && elapsed >= MIN_HANG_SECONDS)) {
        state.phase = 'falling';
        verticalSpeed = 0;
      }
    } else if (state.phase === 'falling') {
      verticalSpeed -= GRAVITY * step;
      player.position.y = Math.max(groundY, player.position.y + verticalSpeed * step);
      if (player.position.y === groundY) {
        verticalSpeed = 0;
        state.phase = 'grounded';
      }
    }

    state.hanging = state.phase === 'hanging';
    state.leaping = state.phase === 'rising' || state.phase === 'settling' || state.phase === 'normal';
    return state;
  }

  return { state, reset, startNormal, startRimJump, update };
}
