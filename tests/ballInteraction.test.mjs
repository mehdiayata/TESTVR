import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createBallInteraction } from '../src/vr/createBallInteraction.js';

function createFixture() {
  const scene = new THREE.Scene();
  const player = new THREE.Group();
  const camera = new THREE.PerspectiveCamera();
  player.add(camera);
  scene.add(player);
  const sources = [new THREE.Group(), new THREE.Group()];
  sources[0].position.set(-0.18, 1.45, -0.5);
  sources[1].position.set(0.18, 1.45, -0.5);
  const xr = new THREE.EventDispatcher();
  xr.getController = (index) => sources[index];
  xr.getSession = () => ({});
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshStandardMaterial());
  ball.position.set(0, 1.4, -1);
  scene.add(ball);

  const shots = [];
  const holds = [];
  let dunks = 0;
  let releases = 0;
  const physics = {
    hold(position, snap) { holds.push({ position: position.clone(), snap }); },
    shoot(impulse) { shots.push(impulse.clone()); },
    dunk() { dunks += 1; return true; },
    release() { releases += 1; },
  };
  const interaction = createBallInteraction(scene, player, { xr }, ball, physics);
  sources.forEach((source, index) => source.dispatchEvent({
    type: 'connected', data: { handedness: index === 0 ? 'left' : 'right' },
  }));
  scene.updateMatrixWorld(true);

  function update(menuOpen = false, movement = {}) {
    scene.updateMatrixWorld(true);
    interaction.update(1 / 72, menuOpen, movement);
  }
  function startAim() {
    sources[0].dispatchEvent({ type: 'selectstart', data: {} });
    update();
    sources[1].dispatchEvent({ type: 'selectstart', data: {} });
    update();
  }
  function dispose() {
    interaction.dispose();
    ball.geometry.dispose();
    ball.material.dispose();
  }
  return { sources, ball, shots, holds, update, startAim, dispose,
    get releases() { return releases; }, get dunks() { return dunks; } };
}

test('the ball is dunked at the rim after the player jumps, not from running alone', () => {
  const fixture = createFixture();
  fixture.sources[0].dispatchEvent({ type: 'selectstart', data: {} });
  fixture.update(false, { running: true });
  assert.equal(fixture.dunks, 0);
  fixture.ball.position.copy(fixture.sources[0].position);
  fixture.update(false, { running: true });
  assert.equal(fixture.dunks, 0);
  fixture.update(false, { hangStarted: true, hanging: true });
  assert.equal(fixture.dunks, 1);
  fixture.update(false, { hanging: true });
  assert.equal(fixture.dunks, 1, 'one press cannot repeat the dunk');
  fixture.dispose();
});

test('reaching the rim without a held ball does not award a dunk', () => {
  const fixture = createFixture();
  fixture.update(false, { hangStarted: true, hanging: true });
  assert.equal(fixture.dunks, 0);
  fixture.dispose();
});

test('two-handed aim places the ball at the midpoint of both controllers', () => {
  const fixture = createFixture();
  fixture.startAim();
  const target = fixture.holds.at(-1);
  assert.equal(target.snap, true);
  assert.ok(target.position.distanceTo(new THREE.Vector3(0, 1.45, -0.5)) < 0.001);
  fixture.dispose();
});

test('opening the menu suspends ball interactions', () => {
  const fixture = createFixture();
  fixture.startAim();
  const before = fixture.holds.length;
  fixture.update(true);
  assert.equal(fixture.holds.length, before);
  assert.equal(fixture.releases, 1);
  fixture.update(true);
  assert.equal(fixture.releases, 1);
  fixture.dispose();
});

test('opening a hand without a throw keeps the ball in the other hand', () => {
  const fixture = createFixture();
  fixture.startAim();
  fixture.sources[1].dispatchEvent({ type: 'selectend', data: {} });
  fixture.update();
  assert.equal(fixture.shots.length, 0);
  assert.equal(fixture.releases, 0);

  fixture.sources[0].dispatchEvent({ type: 'selectend', data: {} });
  fixture.update();
  assert.equal(fixture.shots.length, 0);
  assert.equal(fixture.releases, 1);
  fixture.dispose();
});

test('a natural upward and forward arm motion launches one assisted shot', () => {
  const fixture = createFixture();
  fixture.startAim();
  for (const source of fixture.sources) {
    source.position.y += 0.05;
    source.position.z -= 0.05;
  }
  fixture.update();
  fixture.sources[1].dispatchEvent({ type: 'selectend', data: {} });
  fixture.update();
  assert.equal(fixture.shots.length, 1);
  assert.ok(fixture.shots[0].length() > 3);
  fixture.dispose();
});

test('two-handed aim still works after being held for more than five seconds', () => {
  const fixture = createFixture();
  fixture.startAim();
  for (let frame = 0; frame < 450; frame += 1) fixture.update();
  for (const source of fixture.sources) {
    source.position.y += 0.05;
    source.position.z -= 0.05;
  }
  fixture.update();
  fixture.sources[1].dispatchEvent({ type: 'selectend', data: {} });
  fixture.update();
  assert.equal(fixture.shots.length, 1);
  fixture.dispose();
});

test('losing the second controller cannot launch an assisted shot', () => {
  const fixture = createFixture();
  fixture.startAim();
  fixture.sources[1].dispatchEvent({ type: 'disconnected', data: {} });
  fixture.update();
  assert.equal(fixture.shots.length, 0);
  fixture.dispose();
});
