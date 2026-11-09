import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { createDesktopFreeCamera } from './vr/createDesktopFreeCamera.js';
import './style.css';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#status');
const statusHint = status.textContent;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17202b);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
camera.position.set(0, 1.65, 0);
const desktopCamera = createDesktopFreeCamera(camera, canvas, renderer);

const rayGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -1),
]);
const rayMaterial = new THREE.LineBasicMaterial({ color: 0x7ad5ed });
const controllers = [0, 1].map((index) => {
  const controller = renderer.xr.getController(index);
  controller.add(new THREE.Line(rayGeometry, rayMaterial));
  scene.add(controller);
  return controller;
});

const button = VRButton.createButton(renderer);
document.body.appendChild(button);

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();
let previousTime = null;
let lastStatusUpdate = 0;
renderer.setAnimationLoop((time) => {
  const dt = previousTime === null ? 0 : (time - previousTime) / 1000;
  previousTime = time;
  desktopCamera.update(dt);
  if (!renderer.xr.isPresenting && time - lastStatusUpdate > 250) {
    status.textContent = `${statusHint} · Position : ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)} m`;
    lastStatusUpdate = time;
  }
  renderer.render(scene, camera);
});

// Vite may replace this module during development.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    desktopCamera.dispose();
    button.remove();
    controllers.forEach((controller) => scene.remove(controller));
    rayGeometry.dispose();
    rayMaterial.dispose();
    renderer.dispose();
  });
}
