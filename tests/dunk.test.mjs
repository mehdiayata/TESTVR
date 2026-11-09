import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { BASKET } from '../src/scene/createCourt.js';
import { createBallPhysics } from '../src/scene/createBallPhysics.js';
import { isInDunkZone } from '../src/vr/dunkZone.js';

test('dunk zone is generous in front of the basket but excludes the backboard side', () => {
  assert.equal(isInDunkZone(new THREE.Vector3(1.2, 1.5, BASKET.z + 1.3)), true);
  assert.equal(isInDunkZone(new THREE.Vector3(2.5, 1.5, BASKET.z + 1)), false);
  assert.equal(isInDunkZone(new THREE.Vector3(0, 1.5, BASKET.z - 0.6)), false);
});

test('dunk lifts a held ball through the rim and awards exactly one point', () => {
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12));
  ball.position.set(0.5, 1.5, BASKET.z + 1.4);
  let points = 0;
  const physics = createBallPhysics(ball, 0.12, () => {}, () => { points += 1; });
  assert.equal(physics.dunk(), false, 'a loose ball cannot be dunked');
  physics.hold(ball.position, true);
  assert.equal(physics.dunk(), true);
  assert.equal(physics.dunk(), false, 'a dunk already in progress cannot restart');
  for (let frame = 0; frame < 120; frame += 1) physics.step(1 / 72);
  assert.equal(points, 1);
  assert.ok(ball.position.y < BASKET.y - 0.5, 'the ball continues falling after the score');
  ball.geometry.dispose();
});
