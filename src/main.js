import './style.css';
import { createScene } from './scene/createScene.js';
import { setupVr } from './vr/setupVr.js';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#status');
const score = document.querySelector('#score');
const enterVrButton = document.querySelector('#enter-vr');

const scene = createScene(canvas, (points) => {
  score.textContent = `Points : ${points}`;
});
setupVr({
  renderer: scene.renderer,
  button: enterVrButton,
  status,
  unlockAudio: scene.unlockAudio,
  startAudio: scene.startAudio,
});

window.addEventListener('resize', scene.resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', scene.resize);
  scene.dispose();
});
