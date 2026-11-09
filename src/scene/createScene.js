import * as THREE from 'three';
import { createCourt } from './createCourt.js';
import { createSurroundings } from './createSurroundings.js';
import { createBall } from './createBall.js';
import { createBallPhysics } from './createBallPhysics.js';
import { createAudio } from './createAudio.js';
import { createScoreboard } from './createScoreboard.js';
import { createDunkEffects } from './createDunkEffects.js';
import { createVrControllers } from '../vr/createVrControllers.js';
import { createBallInteraction } from '../vr/createBallInteraction.js';
import { createLocomotion } from '../vr/createLocomotion.js';
import { createSpeedLines } from '../vr/createSpeedLines.js';
import { createGameplaySettings } from '../vr/gameplaySettings.js';
import { createGameplayMenu } from '../vr/createGameplayMenu.js';
import { isInDunkZone } from '../vr/dunkZone.js';

export function createScene(canvas, onScore = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  const settings = createGameplaySettings();
  scene.background = new THREE.Color(0x9db2b9);
  scene.fog = new THREE.Fog(0x9db2b9, 28, 65);

  const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
  camera.position.set(0, 2.4, 3.5);
  camera.lookAt(0, 1.8, -10);
  const player = new THREE.Group();
  player.add(camera);
  scene.add(player);

  scene.add(new THREE.HemisphereLight(0xe6eff2, 0x4d555a, 2.1));

  const keyLight = new THREE.DirectionalLight(0xfff3dc, 2.6);
  keyLight.position.set(-7, 13, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -20;
  keyLight.shadow.camera.right = 20;
  keyLight.shadow.camera.top = 20;
  keyLight.shadow.camera.bottom = -20;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 45;
  scene.add(keyLight);

  const court = createCourt(scene);
  const scoreboard = createScoreboard(scene);
  const dunkEffects = createDunkEffects(scene);
  const disposeSurroundings = createSurroundings(scene);
  const basketball = createBall(scene);
  const audio = createAudio(camera, basketball.ball, scene);
  let points = 0;
  const physics = createBallPhysics(basketball.ball, basketball.radius, audio.playBounce, (velocity, kind) => {
    points += 1;
    scoreboard.setScore(points);
    court.onScore(basketball.ball.position, velocity);
    if (kind === 'dunk') dunkEffects.score();
    audio.playBuzzer();
    onScore(points);
  });
  renderer.xr.addEventListener('sessionend', audio.stop);
  renderer.xr.addEventListener('sessionend', dunkEffects.reset);
  const controllers = createVrControllers(player, renderer);
  const interaction = createBallInteraction(scene, player, renderer, basketball.ball, physics, settings.values);
  const locomotion = createLocomotion(player, camera, renderer, settings.values);
  const menu = createGameplayMenu(scene, renderer, settings);
  const speedLines = createSpeedLines(camera);
  const desktopDunkPosition = new THREE.Vector3();
  const desktopDunkHand = new THREE.Vector3();
  const desktopHandOffset = new THREE.Vector3();
  let desktopDunkActive = false;
  const onDesktopDunk = (event) => {
    if (event.code !== 'KeyK' || event.repeat || renderer.xr.getSession() || menu.isOpen()) return;
    camera.getWorldPosition(desktopDunkPosition);
    if (!isInDunkZone(desktopDunkPosition)) return;
    desktopDunkHand.set(desktopDunkPosition.x - 0.2, 1.5, desktopDunkPosition.z - 0.35);
    if (!locomotion.startDesktopRimJump(desktopDunkHand)) return;
    desktopHandOffset.copy(desktopDunkHand).sub(player.position);
    desktopDunkActive = true;
    physics.hold(desktopDunkHand, true);
    audio.unlock();
    audio.start();
  };
  window.addEventListener('keydown', onDesktopDunk);
  let previousTime = null;
  renderer.setAnimationLoop(render);

  function resize() {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }

  function render(time) {
    const dt = previousTime === null ? 1 / 72 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    menu.update();
    const menuOpen = menu.isOpen();
    const movement = locomotion.update(dt, menuOpen);
    speedLines.update(movement.phase === 'rising' || movement.phase === 'settling'
      ? 1 : movement.speedFraction, dt);
    if (desktopDunkActive && renderer.xr.getSession()) {
      desktopDunkActive = false;
      physics.release();
    }
    if (desktopDunkActive && !menuOpen) {
      desktopDunkHand.copy(player.position).add(desktopHandOffset);
      physics.hold(desktopDunkHand, true);
      if (movement.hangStarted) {
        physics.dunk();
        desktopDunkActive = false;
      }
    }
    interaction.update(dt, menuOpen, movement);
    if (!menuOpen) {
      physics.step(dt);
      court.update(dt);
      dunkEffects.update(dt, movement);
    }
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.setAnimationLoop(null);
    window.removeEventListener('keydown', onDesktopDunk);
    menu.dispose();
    locomotion.dispose();
    speedLines.dispose();
    interaction.dispose();
    controllers.dispose();
    renderer.xr.removeEventListener('sessionend', audio.stop);
    renderer.xr.removeEventListener('sessionend', dunkEffects.reset);
    audio.dispose();
    basketball.dispose();
    scoreboard.dispose();
    dunkEffects.dispose();
    court.dispose();
    disposeSurroundings();
    renderer.dispose();
  }

  resize();
  return { renderer, resize, unlockAudio: audio.unlock, startAudio: audio.start, dispose };
}
