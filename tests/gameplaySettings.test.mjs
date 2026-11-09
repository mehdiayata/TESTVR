import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createGameplaySettings } from '../src/vr/gameplaySettings.js';
import { computeAssistedShotVelocity, computeShotVelocity } from '../src/vr/shotGesture.js';

test('gameplay sliders clamp values and the default shot is stronger', () => {
  const settings = createGameplaySettings();
  assert.equal(settings.values.shotPower, 1.2);
  assert.equal(settings.set('runSpeed', 99), true);
  assert.equal(settings.values.runSpeed, 5.5);
  assert.equal(settings.set('shotArc', -1), true);
  assert.equal(settings.values.shotArc, 0.7);
  assert.equal(settings.set('unknown', 2), false);

  const position = new THREE.Vector3(0, 1.5, -3);
  const motion = new THREE.Vector3(0, 1.5, -1);
  const pointing = new THREE.Vector3(0, 0, -1);
  const neutral = computeAssistedShotVelocity(position, motion, pointing, 0.2, new THREE.Vector3());
  settings.set('shotArc', 1);
  const powered = computeAssistedShotVelocity(position, motion, pointing, 0.2, new THREE.Vector3(), settings.values);
  assert.ok(powered.length() > neutral.length());
  settings.set('shotArc', 1.4);
  const lob = computeAssistedShotVelocity(position, motion, pointing, 0.2, new THREE.Vector3(), settings.values);
  assert.ok(lob.y > powered.y);

  const ordinary = computeShotVelocity(position, motion, pointing, new THREE.Vector3());
  const strongerOrdinary = computeShotVelocity(position, motion, pointing, new THREE.Vector3(), settings.values);
  assert.ok(strongerOrdinary.length() > ordinary.length());
});
