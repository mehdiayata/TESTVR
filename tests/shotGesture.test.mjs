import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { computeAssistedShotVelocity } from '../src/vr/shotGesture.js';
import { createBallPhysics } from '../src/scene/createBallPhysics.js';

test('two-handed shot power grows with arm speed and stroke amplitude', () => {
  const position = new THREE.Vector3(0, 1.5, -3);
  const pointing = new THREE.Vector3(0, 0, -1);
  const weak = computeAssistedShotVelocity(
    position, new THREE.Vector3(0, 0.7, -0.5), pointing, 0.15, new THREE.Vector3(),
  );
  const strong = computeAssistedShotVelocity(
    position, new THREE.Vector3(0, 2.5, -2), pointing, 0.15, new THREE.Vector3(),
  );
  const longStroke = computeAssistedShotVelocity(
    position, new THREE.Vector3(0, 2.5, -2), pointing, 0.5, new THREE.Vector3(),
  );
  const arcShot = computeAssistedShotVelocity(
    position, new THREE.Vector3(0, 2.5, -1.5), pointing, 0.3, new THREE.Vector3(),
  );
  assert.ok(strong.length() > weak.length() + 2);
  assert.ok(longStroke.length() > strong.length());
  assert.ok(Math.atan2(arcShot.y, Math.hypot(arcShot.x, arcShot.z)) > Math.PI * 55 / 180);
});

test('strong gestures can score from near and far while a weak gesture falls short', () => {
  for (const [startZ, forward, up, stroke, expected] of [
    [-3, 1.5, 2.5, 0.3, 1],
    [0, 1.5, 2.5, 0.45, 1],
    [0, 0.5, 0.7, 0.3, 0],
  ]) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12));
    ball.position.set(0, 1.5, startZ);
    let points = 0;
    const physics = createBallPhysics(ball, 0.12, () => {}, () => { points += 1; });
    const velocity = computeAssistedShotVelocity(
      ball.position, new THREE.Vector3(0, up, -forward), new THREE.Vector3(0, 0, -1), stroke,
      new THREE.Vector3(),
    );
    physics.shoot(velocity);
    for (let frame = 0; frame < 180; frame += 1) physics.step(1 / 72);
    assert.equal(points, expected);
    ball.geometry.dispose();
  }
});
