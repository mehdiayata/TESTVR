import * as THREE from 'three';
import { BASKET } from './createCourt.js';

export function createAudio(camera, ball, scene) {
  const listener = new THREE.AudioListener();
  const music = new THREE.Audio(listener);
  const bounce = new THREE.PositionalAudio(listener);
  const buzzer = new THREE.PositionalAudio(listener);
  const loader = new THREE.AudioLoader();
  let enabled = false;
  let disposed = false;
  let lastBounce = 0;

  camera.add(listener, music);
  ball.add(bounce);
  scene.add(buzzer);
  buzzer.position.set(BASKET.x, BASKET.y, BASKET.z);
  music.setLoop(true);
  music.setVolume(0.13);
  bounce.setRefDistance(1.5);
  bounce.setMaxDistance(18);
  bounce.setRolloffFactor(1.2);
  buzzer.setRefDistance(3);
  buzzer.setMaxDistance(20);
  buzzer.setRolloffFactor(1.1);
  buzzer.setVolume(0.55);

  function playMusic() {
    if (enabled && music.buffer && !music.isPlaying) music.play();
  }

  loader.load(`${import.meta.env.BASE_URL}assets/audio/court-ambience.wav`, (buffer) => {
    if (disposed) return;
    music.setBuffer(buffer);
    playMusic();
  }, undefined, (error) => console.warn('Musique indisponible.', error));

  loader.load(`${import.meta.env.BASE_URL}assets/audio/basketball-bounce.wav`, (buffer) => {
    if (!disposed) bounce.setBuffer(buffer);
  }, undefined, (error) => console.warn('Son du ballon indisponible.', error));

  loader.load(`${import.meta.env.BASE_URL}assets/audio/basket-buzzer.wav`, (buffer) => {
    if (!disposed) buzzer.setBuffer(buffer);
  }, undefined, (error) => console.warn('Buzzer du panier indisponible.', error));

  function unlock() {
    listener.context.resume().catch((error) => console.warn('Audio indisponible.', error));
  }

  function start() {
    enabled = true;
    playMusic();
  }

  function playBounce(speed) {
    if (!enabled || !bounce.buffer || speed < 0.7) return;
    const now = performance.now();
    if (now - lastBounce < 90) return;
    lastBounce = now;
    if (bounce.isPlaying) bounce.stop();
    bounce.setVolume(THREE.MathUtils.clamp(speed / 9, 0.2, 0.65));
    bounce.setPlaybackRate(THREE.MathUtils.clamp(0.88 + speed * 0.025, 0.9, 1.12));
    bounce.play();
  }

  function playBuzzer() {
    if (!enabled || !buzzer.buffer) return;
    if (buzzer.isPlaying) buzzer.stop();
    buzzer.play();
  }

  function stop() {
    enabled = false;
    if (music.isPlaying) music.stop();
    if (bounce.isPlaying) bounce.stop();
    if (buzzer.isPlaying) buzzer.stop();
  }

  function dispose() {
    disposed = true;
    stop();
    music.disconnect();
    bounce.disconnect();
    buzzer.disconnect();
    camera.remove(listener, music);
    ball.remove(bounce);
    scene.remove(buzzer);
  }

  return { unlock, start, playBounce, playBuzzer, stop, dispose };
}
