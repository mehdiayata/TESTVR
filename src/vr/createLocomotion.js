import * as THREE from 'three';
import { createJumpMotion } from './createJumpMotion.js';
import { isInDunkZone } from './dunkZone.js';

const DEAD_ZONE = 0.18;
const PLAYER_EYE_HEIGHT = 1.78;
const WALK_ACCELERATION = 3.6;
const RUN_ACCELERATION = 2.8;
const BRAKING = 5.2;
const MIN_RIM_APPROACH_SPEED = 1.1;
const COURT_LIMITS = { minX: -7.5, maxX: 7.5, minZ: -14.2, maxZ: 1.5 };

export function createLocomotion(player, camera, renderer, settings) {
  const forward = new THREE.Vector3();
  const headPosition = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const horizontalVelocity = new THREE.Vector3();
  const leftHandPosition = new THREE.Vector3();
  const jump = createJumpMotion(player);
  const desktopPosition = camera.position.clone();
  const desktopRotation = camera.quaternion.clone();
  let ready = false;
  let heightAdjusted = false;
  let leftGripWasPressed = false;

  const onSessionStart = () => {
    ready = false;
    heightAdjusted = false;
    leftGripWasPressed = false;
    horizontalVelocity.set(0, 0, 0);
    jump.reset(0);
  };
  const onSessionEnd = () => {
    ready = false;
    heightAdjusted = false;
    leftGripWasPressed = false;
    horizontalVelocity.set(0, 0, 0);
    player.position.set(0, 0, 0);
    jump.reset(0);
    camera.position.copy(desktopPosition);
    camera.quaternion.copy(desktopRotation);
    player.updateMatrixWorld(true);
  };
  renderer.xr.addEventListener('sessionstart', onSessionStart);
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  function update(dt, menuOpen = false) {
    const session = renderer.xr.getSession();
    if (menuOpen) {
      horizontalVelocity.set(0, 0, 0);
      jump.state.running = false;
      jump.state.canRimJump = false;
      jump.state.hangStarted = false;
      jump.state.speed = 0;
      jump.state.speedFraction = 0;
      if (session) {
        const left = [...session.inputSources].find((source) => source.handedness === 'left');
        leftGripWasPressed = left?.gamepad?.buttons[1]?.pressed === true;
      }
      return jump.state;
    }
    if (!session) {
      const state = jump.update(dt);
      state.running = false;
      state.canRimJump = false;
      state.speed = 0;
      state.speedFraction = 0;
      player.updateMatrixWorld(true);
      return state;
    }
    if (!ready) {
      ready = true;
      return jump.state;
    }
    if (!heightAdjusted) {
      player.position.y = PLAYER_EYE_HEIGHT - camera.position.y;
      jump.reset(player.position.y);
      player.updateMatrixWorld(true);
      heightAdjusted = true;
    }

    let source = null;
    let leftIndex = -1;
    let leftGripPressed = false;
    let rightGripPressed = false;
    for (let index = 0; index < session.inputSources.length; index += 1) {
      const controller = session.inputSources[index];
      if (controller.hand || !controller.gamepad) continue;
      if (controller.handedness === 'right') rightGripPressed = controller.gamepad.buttons[1]?.pressed === true;
      if (controller.handedness === 'left') {
        leftIndex = index;
        leftGripPressed = controller.gamepad.buttons[1]?.pressed === true;
      }
      if (!source || controller.handedness === 'left') source = controller;
    }
    const axes = source?.gamepad.axes;
    const axisX = axes?.[2] ?? axes?.[0] ?? 0;
    const axisY = axes?.[3] ?? axes?.[1] ?? 0;
    const length = Math.hypot(axisX, axisY);
    const step = Math.min(Math.max(dt, 0), 0.05);
    const stickActive = length > DEAD_ZONE;
    const canMove = jump.state.phase === 'grounded' || jump.state.phase === 'normal';
    movement.set(0, 0, 0);
    if (stickActive && canMove) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() > 0.001) {
        forward.normalize();
        const strength = Math.min(1, (length - DEAD_ZONE) / (1 - DEAD_ZONE));
        movement.set(-forward.z * axisX - forward.x * axisY, 0,
          forward.x * axisX - forward.z * axisY);
        movement.multiplyScalar((rightGripPressed ? settings.runSpeed : settings.walkSpeed) * strength / length);
      }
    }
    // Cap the change in horizontal velocity so both starting and stopping feel gradual.
    const velocityChangeX = movement.x - horizontalVelocity.x;
    const velocityChangeZ = movement.z - horizontalVelocity.z;
    const velocityChange = Math.hypot(velocityChangeX, velocityChangeZ);
    const acceleration = stickActive && canMove
      ? (rightGripPressed ? RUN_ACCELERATION : WALK_ACCELERATION) : BRAKING;
    const maxChange = acceleration * step;
    if (velocityChange > maxChange && velocityChange > 0) {
      horizontalVelocity.x += velocityChangeX * maxChange / velocityChange;
      horizontalVelocity.z += velocityChangeZ * maxChange / velocityChange;
    } else {
      horizontalVelocity.copy(movement);
    }
    camera.getWorldPosition(headPosition);
    const nextX = THREE.MathUtils.clamp(headPosition.x + horizontalVelocity.x * step, COURT_LIMITS.minX, COURT_LIMITS.maxX);
    const nextZ = THREE.MathUtils.clamp(headPosition.z + horizontalVelocity.z * step, COURT_LIMITS.minZ, COURT_LIMITS.maxZ);
    const deltaX = nextX - headPosition.x;
    const deltaZ = nextZ - headPosition.z;
    player.position.x += deltaX;
    player.position.z += deltaZ;
    if (Math.abs(deltaX - horizontalVelocity.x * step) > 0.0001) horizontalVelocity.x = 0;
    if (Math.abs(deltaZ - horizontalVelocity.z * step) > 0.0001) horizontalVelocity.z = 0;
    const speed = step > 0 ? Math.hypot(deltaX, deltaZ) / step : 0;
    player.updateMatrixWorld(true);
    const running = rightGripPressed && stickActive && speed > 0.15;
    const canRimJump = running && speed >= MIN_RIM_APPROACH_SPEED && leftIndex >= 0 && jump.state.phase === 'grounded' &&
      isInDunkZone(renderer.xr.getController(leftIndex).getWorldPosition(leftHandPosition));
    if (leftGripPressed && !leftGripWasPressed && jump.state.phase === 'grounded') {
      if (canRimJump) {
        jump.startRimJump(leftHandPosition, speed);
        horizontalVelocity.set(0, 0, 0);
      } else {
        jump.startNormal(speed);
      }
    }
    leftGripWasPressed = leftGripPressed;
    const state = jump.update(dt, leftGripPressed);
    state.running = running;
    state.canRimJump = canRimJump && state.phase === 'grounded';
    state.speed = speed;
    state.speedFraction = running ? THREE.MathUtils.clamp(speed / settings.runSpeed, 0, 1) : 0;
    player.updateMatrixWorld(true);
    return state;
  }

  function startDesktopRimJump(handPosition) {
    if (renderer.xr.getSession()) return false;
    return jump.startRimJump(handPosition, settings.runSpeed);
  }

  function dispose() {
    renderer.xr.removeEventListener('sessionstart', onSessionStart);
    renderer.xr.removeEventListener('sessionend', onSessionEnd);
  }

  return { update, startDesktopRimJump, dispose };
}
