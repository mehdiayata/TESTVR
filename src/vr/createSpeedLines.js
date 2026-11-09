import * as THREE from 'three';

const LINE_COUNT = 16;

export function createSpeedLines(camera) {
  const positions = new Float32Array(LINE_COUNT * 2 * 3);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', attribute);
  const material = new THREE.LineBasicMaterial({
    color: 0xd9f2ff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = 20;
  lines.visible = false;
  camera.add(lines);

  let intensity = 0;
  let elapsed = 0;

  function update(speedFraction, dt) {
    const step = Math.min(dt, 0.05);
    intensity += (THREE.MathUtils.clamp(speedFraction, 0, 1) - intensity) * (1 - Math.exp(-step * 8));
    lines.visible = intensity > 0.02;
    if (!lines.visible) return;

    material.opacity = 0.42 * intensity;
    elapsed += step;
    for (let index = 0; index < LINE_COUNT; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const row = Math.floor(index / 2);
      const phase = (elapsed * 2.6 + row / 8) % 1;
      const centerX = side * (0.54 + phase * 0.5);
      const y = ((row % 4) - 1.5) * 0.19 + (row < 4 ? -0.06 : 0.06);
      const length = 0.07 + phase * 0.13;
      const start = index * 6;
      // Short lines slide toward the edges of the view, away from the central play area.
      positions[start] = centerX - side * length * 0.5;
      positions[start + 1] = y;
      positions[start + 2] = -1.25;
      positions[start + 3] = centerX + side * length * 0.5;
      positions[start + 4] = y;
      positions[start + 5] = -1.25;
    }
    attribute.needsUpdate = true;
  }

  function dispose() {
    camera.remove(lines);
    geometry.dispose();
    material.dispose();
  }

  return { update, dispose };
}
