import * as THREE from 'three';

export function createScoreboard(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const geometry = new THREE.PlaneGeometry(1.7, 0.64);
  const board = new THREE.Mesh(geometry, material);
  board.position.set(0, 4.48, -12.02);
  scene.add(board);

  function setScore(points) {
    context.fillStyle = '#101820';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#e8b866';
    context.lineWidth = 8;
    context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    context.textAlign = 'center';
    context.fillStyle = '#f4c873';
    context.font = 'bold 42px sans-serif';
    context.fillText('POINTS', 256, 51);
    context.fillStyle = '#ffffff';
    context.font = 'bold 112px monospace';
    context.fillText(String(points).padStart(2, '0'), 256, 160);
    texture.needsUpdate = true;
  }

  function dispose() {
    scene.remove(board);
    geometry.dispose();
    material.dispose();
    texture.dispose();
  }

  setScore(0);
  return { setScore, dispose };
}
