import * as THREE from 'three';
import { BASKET } from './createCourt.js';

const BURST_SECONDS = 0.9;
const SPARK_COUNT = 18;

export function createDunkEffects(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb34f, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false,
  });
  const glowGeometry = new THREE.TorusGeometry(BASKET.rimRadius + 0.055, 0.014, 8, 48);
  const rimGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  rimGlow.rotation.x = Math.PI / 2;
  rimGlow.position.set(BASKET.x, BASKET.y + 0.02, BASKET.z);
  rimGlow.visible = false;
  group.add(rimGlow);

  const handMaterial = new THREE.MeshStandardMaterial({
    color: 0xefa85c, emissive: 0x8e3911, emissiveIntensity: 0.38, roughness: 0.62,
  });
  const palmGeometry = new THREE.SphereGeometry(0.075, 12, 8);
  const wristGeometry = new THREE.CylinderGeometry(0.039, 0.052, 0.17, 8);
  const gripHands = new THREE.Group();
  gripHands.visible = false;
  for (const side of [-1, 1]) {
    const palm = new THREE.Mesh(palmGeometry, handMaterial);
    palm.scale.set(1.05, 0.7, 1.1);
    palm.position.set(BASKET.x + side * 0.23, BASKET.y + 0.035, BASKET.z + 0.24);
    const wrist = new THREE.Mesh(wristGeometry, handMaterial);
    wrist.position.set(BASKET.x + side * 0.23, BASKET.y - 0.09, BASKET.z + 0.28);
    wrist.rotation.x = -0.32;
    gripHands.add(palm, wrist);
  }
  group.add(gripHands);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 512, 192);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 132px system-ui';
  context.shadowColor = '#e96b1b';
  context.shadowBlur = 28;
  context.lineWidth = 16;
  context.strokeStyle = '#51210d';
  context.strokeText('DUNK !', 256, 100);
  context.fillStyle = '#ffe6a3';
  context.fillText('DUNK !', 256, 100);
  const bannerTexture = new THREE.CanvasTexture(canvas);
  bannerTexture.colorSpace = THREE.SRGBColorSpace;
  const bannerMaterial = new THREE.MeshBasicMaterial({
    map: bannerTexture, transparent: true, opacity: 0, depthTest: false,
    depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
  });
  const bannerGeometry = new THREE.PlaneGeometry(1.85, 0.69);
  const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
  banner.position.set(BASKET.x, BASKET.y + 0.93, BASKET.z + 0.4);
  banner.visible = false;
  banner.renderOrder = 40;
  group.add(banner);

  const sparkGeometry = new THREE.OctahedronGeometry(0.036, 0);
  const sparkMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdc84, transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
  });
  const sparks = [];
  for (let index = 0; index < SPARK_COUNT; index += 1) {
    const mesh = new THREE.Mesh(sparkGeometry, sparkMaterial);
    mesh.visible = false;
    group.add(mesh);
    sparks.push(mesh);
  }

  let burstTime = BURST_SECONDS;
  let pulseTime = 0;

  function score() {
    burstTime = 0;
    banner.visible = true;
    for (const spark of sparks) spark.visible = true;
  }

  function update(dt, movement) {
    const step = Math.min(dt, 0.05);
    pulseTime += step;
    const hanging = movement.hanging;
    const approaching = movement.canRimJump || movement.phase === 'rising' || movement.phase === 'settling';
    gripHands.visible = hanging;
    rimGlow.visible = approaching || hanging || burstTime < BURST_SECONDS;
    if (rimGlow.visible) {
      const pulse = approaching || hanging ? 1 + 0.045 * Math.sin(pulseTime * 11) : 1 + burstTime * 0.55;
      rimGlow.scale.setScalar(pulse);
      glowMaterial.color.setHex(approaching && !hanging ? 0x65dfff : 0xffb34f);
      glowMaterial.opacity = approaching || hanging ? 0.66 : 0.7 * (1 - burstTime / BURST_SECONDS);
    }
    if (burstTime >= BURST_SECONDS) return;
    burstTime = Math.min(BURST_SECONDS, burstTime + step);
    const progress = burstTime / BURST_SECONDS;
    bannerMaterial.opacity = (1 - progress) * Math.min(1, progress * 9);
    banner.position.y = BASKET.y + 0.93 + progress * 0.2;
    sparkMaterial.opacity = 0.9 * (1 - progress);
    for (let index = 0; index < SPARK_COUNT; index += 1) {
      const angle = index * Math.PI * 2 / SPARK_COUNT;
      const radius = 0.28 + progress * (0.7 + index % 3 * 0.13);
      const spark = sparks[index];
      spark.position.set(
        BASKET.x + Math.cos(angle) * radius,
        BASKET.y + 0.12 + Math.sin(progress * Math.PI) * (0.18 + index % 4 * 0.055),
        BASKET.z + Math.sin(angle) * radius,
      );
      spark.scale.setScalar(Math.max(0.01, 1 - progress));
    }
    if (burstTime === BURST_SECONDS) {
      banner.visible = false;
      for (const spark of sparks) spark.visible = false;
    }
  }

  function reset() {
    burstTime = BURST_SECONDS;
    gripHands.visible = false;
    rimGlow.visible = false;
    banner.visible = false;
    for (const spark of sparks) spark.visible = false;
  }

  function dispose() {
    scene.remove(group);
    glowGeometry.dispose();
    glowMaterial.dispose();
    palmGeometry.dispose();
    wristGeometry.dispose();
    handMaterial.dispose();
    bannerGeometry.dispose();
    bannerMaterial.dispose();
    bannerTexture.dispose();
    sparkGeometry.dispose();
    sparkMaterial.dispose();
  }

  return { score, update, reset, dispose };
}
