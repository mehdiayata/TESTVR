import * as THREE from 'three';

const BALL_RADIUS = 0.12;

export function createBall(scene) {
  const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 20);
  const texture = createBallTexture();
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.84,
    metalness: 0,
  });
  const ball = new THREE.Mesh(geometry, material);
  ball.position.set(0, BALL_RADIUS, -1.8);
  ball.castShadow = true;
  scene.add(ball);

  function dispose() {
    scene.remove(ball);
    geometry.dispose();
    texture.dispose();
    material.dispose();
  }

  return { ball, radius: BALL_RADIUS, dispose };
}

function createBallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#c7652e';
  context.fillRect(0, 0, 512, 256);

  let seed = 71;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 7500; i += 1) {
    context.fillStyle = random() < 0.5 ? 'rgba(65, 31, 17, 0.12)' : 'rgba(255, 187, 108, 0.13)';
    context.fillRect(random() * 512, random() * 256, 1.5, 1.5);
  }

  context.strokeStyle = '#30221b';
  context.lineWidth = 5;
  for (const x of [0, 128, 256, 384, 512]) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 256);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(0, 128);
  context.lineTo(512, 128);
  context.stroke();
  for (const sign of [-1, 1]) {
    context.beginPath();
    context.moveTo(0, 128 + sign * 67);
    context.bezierCurveTo(128, 128 - sign * 27, 384, 128 - sign * 27, 512, 128 + sign * 67);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
