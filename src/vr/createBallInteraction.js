import * as THREE from 'three';
import { computeAssistedShotVelocity, computeShotVelocity, isShotGesture } from './shotGesture.js';

const UP = new THREE.Vector3(0, 1, 0);
const DUNK_COOLDOWN_SECONDS = 0.75;

export function createBallInteraction(scene, player, renderer, ball, physics, settings) {
  const beamGeometry = new THREE.CylinderGeometry(0.004, 0.004, 1, 6);
  const markerGeometry = new THREE.SphereGeometry(0.018, 8, 6);
  const controllers = [];
  const shotImpulse = new THREE.Vector3();
  const aimMotion = new THREE.Vector3();
  const aimDirection = new THREE.Vector3();
  const aimShotMotion = new THREE.Vector3();
  const aimShotDirection = new THREE.Vector3();
  const playerDisplacement = new THREE.Vector3();
  const playerVelocity = new THREE.Vector3();
  const previousPlayerPosition = player.position.clone();
  let holder = null;
  let aimActive = false;
  let aimShotAge = Infinity;
  let aimStroke = 0;
  let aimShotStroke = 0;
  let dunkCooldown = 0;

  for (let index = 0; index < 2; index += 1) {
    const source = renderer.xr.getController(index);
    const beam = new THREE.Mesh(
      beamGeometry,
      new THREE.MeshBasicMaterial({ color: 0x68d9f7, depthTest: false }),
    );
    const marker = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshBasicMaterial({ color: 0x68d9f7, depthTest: false }),
    );
    beam.visible = false;
    beam.renderOrder = 10;
    marker.visible = false;
    marker.renderOrder = 11;
    scene.add(beam, marker);

    const controller = {
      source, beam, marker,
      origin: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      temporary: new THREE.Vector3(),
      lastLocalPosition: new THREE.Vector3(),
      motionSample: new THREE.Vector3(),
      motionVelocity: new THREE.Vector3(),
      shotVelocity: new THREE.Vector3(),
      motionReady: false,
      shotAge: Infinity,
      connected: false,
      pressed: false,
      wasPressed: false,
    };
    controller.onConnected = (event) => { controller.connected = !event.data?.hand; };
    controller.onDisconnected = () => {
      controller.connected = false;
      controller.pressed = false;
    };
    controller.onSelectStart = (event) => {
      if (!event.data?.hand) controller.pressed = true;
    };
    controller.onSelectEnd = () => { controller.pressed = false; };
    source.addEventListener('connected', controller.onConnected);
    source.addEventListener('disconnected', controller.onDisconnected);
    source.addEventListener('selectstart', controller.onSelectStart);
    source.addEventListener('selectend', controller.onSelectEnd);
    player.add(source);
    controllers.push(controller);
  }

  function release(carryPlayerMomentum = false) {
    if (!holder) return;
    physics.release(carryPlayerMomentum ? playerVelocity : null);
    holder = null;
  }

  function updateMotion(controller, dt) {
    const localPosition = controller.source.position;
    if (!controller.motionReady) {
      controller.lastLocalPosition.copy(localPosition);
      controller.motionVelocity.set(0, 0, 0);
      controller.motionReady = true;
      return;
    }
    controller.motionSample.copy(localPosition).sub(controller.lastLocalPosition)
      .divideScalar(Math.max(dt, 0.005)).clampLength(0, 5);
    controller.motionVelocity.lerp(controller.motionSample, 0.55);
    controller.lastLocalPosition.copy(localPosition);
  }

  function finishHold(controller) {
    if (isShotGesture(ball.position, controller.motionVelocity, controller.direction)) {
      controller.shotVelocity.copy(controller.motionVelocity);
      controller.shotAge = 0;
    }
    if (controller.shotAge <= 0.18) {
      ball.position.copy(controller.origin).addScaledVector(controller.direction, 0.18);
      computeShotVelocity(ball.position, controller.shotVelocity, controller.direction, shotImpulse, settings);
      physics.shoot(shotImpulse);
      holder = null;
    } else {
      release(true);
    }
    controller.shotAge = Infinity;
  }

  function finishAssistedShot() {
    computeAssistedShotVelocity(ball.position, aimShotMotion, aimShotDirection, aimShotStroke, shotImpulse, settings);
    physics.shoot(shotImpulse);
    holder = null;
    aimShotAge = Infinity;
  }

  function updateAimGesture(dt) {
    aimMotion.copy(controllers[0].motionVelocity).add(controllers[1].motionVelocity).multiplyScalar(0.5);
    aimDirection.copy(controllers[0].direction).add(controllers[1].direction).normalize();
    aimStroke = Math.min(0.7, aimStroke * Math.exp(-dt * 1.5) + Math.max(0, aimMotion.y) * dt);
    if (isShotGesture(ball.position, aimMotion, aimDirection)) {
      aimShotMotion.copy(aimMotion);
      aimShotDirection.copy(aimDirection);
      aimShotStroke = aimStroke;
      aimShotAge = 0;
    } else {
      aimShotAge += dt;
    }
  }

  const onSessionEnd = () => {
    release();
    physics.cancelDunk?.();
    aimActive = false;
    aimShotAge = Infinity;
    aimStroke = 0;
    dunkCooldown = 0;
    for (const controller of controllers) {
      controller.pressed = false;
      controller.wasPressed = false;
      controller.motionReady = false;
      controller.shotAge = Infinity;
      controller.beam.visible = false;
      controller.marker.visible = false;
    }
  };
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  function drawBeam(controller) {
    controller.temporary.copy(ball.position).sub(controller.origin);
    const distance = controller.temporary.length();
    if (distance < 0.001) {
      controller.beam.visible = false;
      controller.marker.visible = false;
      return;
    }
    controller.temporary.divideScalar(distance);
    const color = aimActive && controller.pressed ? 0xffd56b
      : holder === controller && controller.shotAge <= 0.18
      ? 0xffcc64
      : holder === controller ? 0x8cf0a7 : 0x68d9f7;
    controller.beam.material.color.setHex(color);
    controller.marker.material.color.setHex(color);
    controller.beam.position.copy(controller.origin).addScaledVector(controller.temporary, distance * 0.5);
    controller.beam.quaternion.setFromUnitVectors(UP, controller.temporary);
    controller.beam.scale.y = distance;
    controller.beam.visible = true;
    controller.marker.position.copy(ball.position);
    controller.marker.visible = true;
  }

  function update(dt, menuOpen = false, movement = {}) {
    if (menuOpen) {
      release();
      aimActive = false;
      aimShotAge = Infinity;
      previousPlayerPosition.copy(player.position);
      for (const controller of controllers) {
        controller.wasPressed = controller.pressed;
        controller.motionReady = false;
        controller.beam.visible = false;
        controller.marker.visible = false;
      }
      return;
    }
    // Locomotion moves the player before this update. Carry only a held ball with it;
    // a released ball keeps its own world position and falls or bounces freely.
    playerDisplacement.copy(player.position).sub(previousPlayerPosition);
    if (holder) {
      ball.position.add(playerDisplacement);
      playerVelocity.copy(playerDisplacement).divideScalar(Math.max(dt, 0.005)).clampLength(0, 3);
    } else {
      playerVelocity.set(0, 0, 0);
    }
    previousPlayerPosition.copy(player.position);
    dunkCooldown = Math.max(0, dunkCooldown - dt);
    ball.material.emissive.setHex(0x000000);

    // First refresh both tracked poses. The assist must see the two triggers in
    // the same frame, including the frame when either trigger is released.
    for (const controller of controllers) {
      if (!controller.connected || !controller.source.visible) {
        if (holder === controller) release();
        controller.wasPressed = false;
        controller.motionReady = false;
        controller.shotAge = Infinity;
        controller.beam.visible = false;
        controller.marker.visible = false;
        continue;
      }

      controller.source.getWorldPosition(controller.origin);
      controller.direction.set(0, 0, -1).transformDirection(controller.source.matrixWorld);
      updateMotion(controller, dt);
    }

    const wasAiming = aimActive;
    const bothTracked = controllers.every((controller) => controller.connected && controller.source.visible);
    const bothPressed = holder !== null && bothTracked && controllers.every((controller) => controller.pressed);
    aimActive = bothPressed;
    if (aimActive && !wasAiming) {
      aimShotAge = Infinity;
      aimStroke = 0;
    }
    if ((aimActive || wasAiming) && bothTracked) {
      updateAimGesture(dt);
    }
    if (holder && wasAiming && !bothPressed) {
      if (bothTracked && aimShotAge <= 0.18) {
        finishAssistedShot();
      } else {
        const remaining = controllers.find((controller) => controller.connected && controller.pressed);
        if (remaining) {
          holder = remaining;
          holder.shotAge = Infinity;
        } else {
          release(true);
        }
      }
      aimShotAge = Infinity;
    }

    for (const controller of controllers) {
      if (!controller.connected || !controller.source.visible) continue;
      if (holder === controller && !controller.pressed) finishHold(controller);
      if (!holder && dunkCooldown === 0 && controller.pressed && !controller.wasPressed) {
        holder = controller;
        controller.motionVelocity.set(0, 0, 0);
        controller.shotAge = Infinity;
      }

      if (holder === controller) {
        if (bothPressed) {
          controller.shotAge = Infinity;
        } else if (isShotGesture(ball.position, controller.motionVelocity, controller.direction)) {
          controller.shotVelocity.copy(controller.motionVelocity);
          controller.shotAge = 0;
        } else {
          controller.shotAge += dt;
        }
        if (aimActive) {
          const other = controllers[0] === controller ? controllers[1] : controllers[0];
          controller.temporary.copy(controller.origin).add(other.origin).multiplyScalar(0.5);
        } else {
          controller.temporary.copy(controller.origin).addScaledVector(controller.direction, 0.18);
        }
        physics.hold(controller.temporary, aimActive);
        ball.material.emissive.setHex(aimActive ? 0x70500d
          : controller.shotAge <= 0.18 ? 0x70400d : 0x5d2c0c);
      }

      drawBeam(controller);
      controller.wasPressed = controller.pressed;
    }

    // The left squeeze starts the leap. The ball is slammed only after the
    // player's hand has actually reached the rim and the ball is still held.
    if (movement.hangStarted && holder && ball.position.distanceTo(holder.origin) < 1.3 &&
      physics.dunk()) {
      holder = null;
      aimActive = false;
      aimShotAge = Infinity;
      dunkCooldown = DUNK_COOLDOWN_SECONDS;
    }
  }

  function dispose() {
    renderer.xr.removeEventListener('sessionend', onSessionEnd);
    for (const controller of controllers) {
      controller.source.removeEventListener('connected', controller.onConnected);
      controller.source.removeEventListener('disconnected', controller.onDisconnected);
      controller.source.removeEventListener('selectstart', controller.onSelectStart);
      controller.source.removeEventListener('selectend', controller.onSelectEnd);
      player.remove(controller.source);
      scene.remove(controller.beam, controller.marker);
      controller.beam.material.dispose();
      controller.marker.material.dispose();
    }
    beamGeometry.dispose();
    markerGeometry.dispose();
  }

  return { update, dispose };
}
