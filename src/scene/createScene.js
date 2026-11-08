import * as THREE from 'three';
import { createCourt } from './createCourt.js';
import { createSurroundings } from './createSurroundings.js';
import { createBall } from './createBall.js';
import { createBallPhysics } from './createBallPhysics.js';
import { createAudio } from './createAudio.js';
import { createScoreboard } from './createScoreboard.js';
import { createVrControllers } from '../vr/createVrControllers.js';
import { createBallInteraction } from '../vr/createBallInteraction.js';
import { createLocomotion } from '../vr/createLocomotion.js';

export function createScene(canvas, onScore = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
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

  const disposeCourt = createCourt(scene);
  const scoreboard = createScoreboard(scene);
  const disposeSurroundings = createSurroundings(scene);
  const basketball = createBall(scene);
  const audio = createAudio(camera, basketball.ball);
  let points = 0;
  const physics = createBallPhysics(basketball.ball, basketball.radius, audio.playBounce, () => {
    points += 1;
    scoreboard.setScore(points);
    onScore(points);
  });
  renderer.xr.addEventListener('sessionend', audio.stop);
  const controllers = createVrControllers(player, renderer);
  const interaction = createBallInteraction(scene, player, renderer, basketball.ball, physics);
  const locomotion = createLocomotion(player, camera, renderer);
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
    locomotion.update(dt);
    interaction.update(dt);
    physics.step(dt);
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.setAnimationLoop(null);
    locomotion.dispose();
    interaction.dispose();
    controllers.dispose();
    renderer.xr.removeEventListener('sessionend', audio.stop);
    audio.dispose();
    basketball.dispose();
    scoreboard.dispose();
    disposeCourt();
    disposeSurroundings();
    renderer.dispose();
  }

  resize();
  return { renderer, resize, unlockAudio: audio.unlock, startAudio: audio.start, dispose };
}
