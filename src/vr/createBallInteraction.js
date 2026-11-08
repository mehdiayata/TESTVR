import * as THREE from 'three';
import { computeShotVelocity, isShotGesture } from './shotGesture.js';

const UP = new THREE.Vector3(0, 1, 0);

export function createBallInteraction(scene, player, renderer, ball, physics) {
  const beamGeometry = new THREE.CylinderGeometry(0.004, 0.004, 1, 6);
  const markerGeometry = new THREE.SphereGeometry(0.018, 8, 6);
  const controllers = [];
  const shotImpulse = new THREE.Vector3();
  let holder = null;
  let dribbleController = null;

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

  function release(startDribbling) {
    if (!holder) return;
    if (startDribbling) {
      dribbleController = holder;
      physics.startDribble(holder.origin);
    } else {
      physics.release();
    }
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
      computeShotVelocity(ball.position, controller.shotVelocity, controller.direction, shotImpulse);
      physics.shoot(shotImpulse);
      holder = null;
      dribbleController = null;
    } else {
      release(true);
    }
    controller.shotAge = Infinity;
  }

  const onSessionEnd = () => {
    release(false);
    dribbleController = null;
    physics.stopDribble();
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
    const color = holder === controller && controller.shotAge <= 0.18
      ? 0xffcc64
      : holder === controller || dribbleController === controller ? 0x8cf0a7 : 0x68d9f7;
    controller.beam.material.color.setHex(color);
    controller.marker.material.color.setHex(color);
    controller.beam.position.copy(controller.origin).addScaledVector(controller.temporary, distance * 0.5);
    controller.beam.quaternion.setFromUnitVectors(UP, controller.temporary);
    controller.beam.scale.y = distance;
    controller.beam.visible = true;
    controller.marker.position.copy(ball.position);
    controller.marker.visible = true;
  }

  function update(dt) {
    ball.material.emissive.setHex(0x000000);
    for (const controller of controllers) {
      if (!controller.connected || !controller.source.visible) {
        if (holder === controller) release(false);
        if (dribbleController === controller) {
          dribbleController = null;
          physics.stopDribble();
        }
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
      if (holder === controller && !controller.pressed) finishHold(controller);
      if (!holder && controller.pressed && !controller.wasPressed) {
        holder = controller;
        dribbleController = null;
        controller.motionVelocity.set(0, 0, 0);
        controller.shotAge = Infinity;
      }

      if (holder === controller) {
        if (isShotGesture(ball.position, controller.motionVelocity, controller.direction)) {
          controller.shotVelocity.copy(controller.motionVelocity);
          controller.shotAge = 0;
        } else {
          controller.shotAge += dt;
        }
        controller.temporary.copy(controller.origin).addScaledVector(controller.direction, 0.18);
        physics.hold(controller.temporary);
        ball.material.emissive.setHex(controller.shotAge <= 0.18 ? 0x70400d : 0x5d2c0c);
      }

      drawBeam(controller);
      controller.wasPressed = controller.pressed;
    }
    if (dribbleController) physics.guideDribble(dribbleController.origin);
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
