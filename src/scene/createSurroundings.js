import * as THREE from 'three';

export function createSurroundings(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const fenceTexture = createFenceTexture();
  const fenceMaterials = [];
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x717b7d, metalness: 0.8, roughness: 0.45 });
  const postGeometry = new THREE.CylinderGeometry(0.045, 0.045, 4.1, 8);

  function fence(width, x, z, rotation, repeatX) {
    const texture = fenceTexture.clone();
    texture.repeat.set(repeatX, 3);
    texture.needsUpdate = true;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      opacity: 0.62,
    });
    fenceMaterials.push(material);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, 3.8), material);
    panel.position.set(x, 2, z);
    panel.rotation.y = rotation;
    group.add(panel);
  }

  fence(17, -8.3, -6.5, Math.PI / 2, 12);
  fence(17, 8.3, -6.5, Math.PI / 2, 12);
  fence(16.6, 0, -15, 0, 12);

  for (const side of [-8.3, 8.3]) {
    for (let z = 2; z >= -15; z -= 3.4) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(side, 2.05, z);
      group.add(post);
    }
  }
  for (let x = -8.3; x <= 8.3; x += 2.77) {
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.set(x, 2.05, -15);
    group.add(post);
  }

  const brickTexture = createBrickTexture();
  const brickMaterial = new THREE.MeshStandardMaterial({ map: brickTexture, roughness: 0.98 });
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x202d36 });
  const buildings = [
    { x: -12, z: -24, width: 10, height: 9, depth: 4 },
    { x: 0, z: -25, width: 13, height: 11, depth: 4 },
    { x: 13, z: -24, width: 10, height: 8, depth: 4 },
  ];
  for (const building of buildings) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(building.width, building.height, building.depth),
      brickMaterial,
    );
    block.position.set(building.x, building.height / 2, building.z);
    block.receiveShadow = true;
    group.add(block);

    const front = building.z + building.depth / 2 + 0.013;
    for (let floor = 1; floor < building.height / 2.3; floor += 1) {
      for (let column = -1; column <= 1; column += 1) {
        const window = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.2), windowMaterial);
        window.position.set(building.x + column * building.width * 0.24, floor * 2.25 + 0.55, front);
        group.add(window);
      }
    }
  }

  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 2.2),
    new THREE.MeshBasicMaterial({ map: createMuralTexture(), transparent: true, depthWrite: false }),
  );
  mural.position.set(0, 5.7, -22.98);
  group.add(mural);

  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffdfab });
  const lampHousing = new THREE.MeshStandardMaterial({ color: 0x30383d, metalness: 0.7, roughness: 0.4 });
  for (const x of [-9.5, 9.5]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.4, 8), postMaterial);
    pole.position.set(x, 2.7, -7);
    group.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.08), lampHousing);
    arm.position.set(x + (x < 0 ? 0.45 : -0.45), 5.32, -7);
    group.add(arm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.4), lampMaterial);
    lamp.position.set(x + (x < 0 ? 0.9 : -0.9), 5.26, -7);
    group.add(lamp);
  }

  return () => {
    scene.remove(group);
    const geometries = new Set();
    const materials = new Set([postMaterial, brickMaterial, windowMaterial, lampMaterial, lampHousing]);
    const textures = new Set([fenceTexture, brickTexture]);
    group.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    for (const material of fenceMaterials) textures.add(material.map);
    textures.add(mural.material.map);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
  };
}

function createFenceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.strokeStyle = 'rgba(190, 201, 205, 0.82)';
  context.lineWidth = 2;
  for (let x = -128; x < 256; x += 22) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 128, 128);
    context.moveTo(x, 128);
    context.lineTo(x + 128, 0);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createBrickTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#585a59';
  context.fillRect(0, 0, 256, 256);
  context.strokeStyle = 'rgba(27, 34, 37, 0.6)';
  context.lineWidth = 3;
  for (let row = 0; row < 8; row += 1) {
    const y = row * 32;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(256, y);
    context.stroke();
    for (let x = (row % 2) * 32; x < 256; x += 64) {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + 32);
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function createMuralTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  context.font = 'italic 900 120px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 16;
  context.strokeStyle = '#1d2c35';
  context.strokeText('STREET COURT', 512, 170);
  context.fillStyle = '#d98654';
  context.fillText('STREET COURT', 512, 170);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
