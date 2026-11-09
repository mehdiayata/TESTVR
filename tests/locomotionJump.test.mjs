import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BASKET } from '../src/scene/createCourt.js';
import { createLocomotion } from '../src/vr/createLocomotion.js';
import { createJumpMotion } from '../src/vr/createJumpMotion.js';

function fixture() {
  const player = new THREE.Group();
  player.position.z = BASKET.z + 1.5;
  const camera = new THREE.PerspectiveCamera();
  camera.position.y = 1.78;
  player.add(camera);
  const hands = [new THREE.Group(), new THREE.Group()];
  hands[0].position.set(-0.18, 1.45, -0.5);
  hands.forEach((hand) => player.add(hand));
  player.updateMatrixWorld(true);

  const left = { handedness: 'left', gamepad: { axes: [0, 0, 0, -1], buttons: [{}, { pressed: false }] } };
  const right = { handedness: 'right', gamepad: { axes: [0, 0, 0, 0], buttons: [{}, { pressed: true }] } };
  const session = { inputSources: [left, right] };
  const xr = new THREE.EventDispatcher();
  xr.getSession = () => session;
  xr.getController = (index) => hands[index];
  const locomotion = createLocomotion(player, camera, { xr }, { walkSpeed: 1.8, runSpeed: 2.9 });
  locomotion.update(1 / 72);
  locomotion.update(1 / 72);
  return { player, hands, left, right, locomotion, update: () => locomotion.update(1 / 72) };
}

test('left squeeze during a run near the rim lifts the player, hangs, then lands', () => {
  const game = fixture();
  const earlySpeed = game.update().speed;
  let readyToDunk = false;
  for (let frame = 0; frame < 60; frame += 1) {
    if (game.update().canRimJump) {
      readyToDunk = true;
      break;
    }
  }
  assert.equal(readyToDunk, true);
  assert.ok(game.update().speed > earlySpeed);
  game.left.gamepad.buttons[1].pressed = true;
  let state = game.update();
  assert.equal(state.phase, 'rising');
  assert.ok(game.player.position.y > 0);

  let reachedRim = false;
  for (let frame = 0; frame < 80; frame += 1) {
    state = game.update();
    if (state.hangStarted) reachedRim = true;
    if (reachedRim) break;
  }
  assert.equal(reachedRim, true);
  assert.equal(state.phase, 'hanging');
  const handPosition = game.hands[0].getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(handPosition.y - BASKET.y) < 0.12);
  assert.ok(Math.abs(handPosition.z - (BASKET.z + 0.24)) < 0.1);

  game.left.gamepad.buttons[1].pressed = false;
  for (let frame = 0; frame < 180; frame += 1) state = game.update();
  assert.equal(state.phase, 'grounded');
  assert.ok(Math.abs(game.player.position.y) < 0.001);
  game.locomotion.dispose();
});

test('running speed builds gradually and gives normal and rim jumps a higher peak', () => {
  const game = fixture();
  const firstSpeed = game.update().speed;
  for (let frame = 0; frame < 35; frame += 1) game.update();
  const cruisingSpeed = game.update().speed;
  assert.ok(firstSpeed > 0 && cruisingSpeed > firstSpeed + 0.8);
  assert.ok(cruisingSpeed <= 2.9 + 0.001);
  game.locomotion.dispose();

  function jumpPeak(speed, rim = false) {
    const player = new THREE.Group();
    const jump = createJumpMotion(player);
    const hand = new THREE.Vector3(BASKET.x - 0.23, 1.45, BASKET.z + 0.24);
    if (rim) jump.startRimJump(hand, speed);
    else jump.startNormal(speed);
    let peak = player.position.y;
    for (let frame = 0; frame < 85; frame += 1) {
      jump.update(1 / 72, true);
      peak = Math.max(peak, player.position.y);
    }
    return peak;
  }
  assert.ok(jumpPeak(2.9) > jumpPeak(0) + 0.35);
  assert.ok(jumpPeak(2.9, true) > jumpPeak(1.2, true) + 0.2);
});

test('left squeeze without a running approach makes a normal jump', () => {
  const game = fixture();
  game.right.gamepad.buttons[1].pressed = false;
  game.left.gamepad.buttons[0].pressed = true;
  assert.equal(game.update().phase, 'grounded', 'the index trigger does not jump');
  game.left.gamepad.buttons[1].pressed = true;
  let state = game.update();
  assert.equal(state.phase, 'normal');
  let peak = game.player.position.y;
  for (let frame = 0; frame < 120; frame += 1) {
    state = game.update();
    peak = Math.max(peak, game.player.position.y);
  }
  assert.ok(peak > 0.5 && peak < 1.2);
  assert.equal(state.phase, 'grounded');
  game.locomotion.dispose();
});
