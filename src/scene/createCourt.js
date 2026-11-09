import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const COURT_WIDTH = 15;
const COURT_LENGTH = 14;
const FAR_LINE = -13;
const NEAR_LINE = 1;
const HOOP_Z = -11.55;
export const BASKET = Object.freeze({ x: 0, y: 3.05, z: HOOP_Z, rimRadius: 0.34, boardFront: -12.06 });

export function createCourt(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const concrete = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x51585a, roughness: 1 }),
  );
  concrete.rotation.x = -Math.PI / 2;
  concrete.receiveShadow = true;
  group.add(concrete);

  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT_WIDTH, COURT_LENGTH),
    new THREE.MeshStandardMaterial({ map: createAsphaltTexture(), roughness: 0.96 }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(0, 0.012, -6);
  asphalt.receiveShadow = true;
  group.add(asphalt);

  const paintedKey = new THREE.Mesh(
    new THREE.PlaneGeometry(4.9, 5.8),
    new THREE.MeshStandardMaterial({ color: 0x735448, roughness: 0.96 }),
  );
  paintedKey.rotation.x = -Math.PI / 2;
  paintedKey.position.set(0, 0.022, -10.1);
  group.add(paintedKey);

  const paint = new THREE.MeshBasicMaterial({ color: 0xe7e4d6 });
  const lineY = 0.035;

  function stripe(x1, z1, x2, z2) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.003, length), paint);
    mesh.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    mesh.position.set((x1 + x2) / 2, lineY, (z1 + z2) / 2);
    group.add(mesh);
  }

  function arc(centerX, centerZ, radius, start, end, segments = 48) {
    const points = [];
    for (let i = 0; i <= segments; i += 1) {
      const angle = start + (end - start) * i / segments;
      points.push(new THREE.Vector3(
        centerX + Math.cos(angle) * radius,
        lineY,
        centerZ + Math.sin(angle) * radius,
      ));
    }
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, 0.025, 4, false),
      paint,
    );
    group.add(mesh);
  }

  stripe(-7.5, FAR_LINE, 7.5, FAR_LINE);
  stripe(-7.5, NEAR_LINE, 7.5, NEAR_LINE);
  stripe(-7.5, FAR_LINE, -7.5, NEAR_LINE);
  stripe(7.5, FAR_LINE, 7.5, NEAR_LINE);

  stripe(-2.45, FAR_LINE, -2.45, -7.2);
  stripe(2.45, FAR_LINE, 2.45, -7.2);
  stripe(-2.45, -7.2, 2.45, -7.2);
  arc(0, -7.2, 1.8, 0, Math.PI * 2, 64);
  arc(0, HOOP_Z, 1.25, 0, Math.PI, 32);

  // Arc à trois points et deux tronçons droits vers la ligne de fond.
  stripe(-6.65, FAR_LINE, -6.65, HOOP_Z);
  stripe(6.65, FAR_LINE, 6.65, HOOP_Z);
  arc(0, HOOP_Z, 6.65, 0, Math.PI, 72);

  const fallbackHoop = new THREE.Group();
  group.add(fallbackHoop);
  createHoop(fallbackHoop);

  let disposed = false;
  let netMesh = null;
  let netRest = null;
  const netOffset = new THREE.Vector3();
  const netVelocity = new THREE.Vector3();
  new GLTFLoader().load(
    `${import.meta.env.BASE_URL}assets/models/street-hoop.glb`,
    ({ scene: model }) => {
      if (disposed) {
        disposeGroup(model);
        return;
      }
      model.position.set(BASKET.x, BASKET.y, BASKET.z);
      model.traverse((object) => {
        if (object.isMesh && object.name !== 'BasketNet') object.castShadow = true;
      });
      group.add(model);
      group.remove(fallbackHoop);
      disposeGroup(fallbackHoop);
      netMesh = model.getObjectByName('BasketNet');
      if (netMesh?.isMesh) {
        const position = netMesh.geometry.getAttribute('position');
        position.setUsage(THREE.DynamicDrawUsage);
        netRest = new Float32Array(position.array);
      } else {
        console.warn('Le modèle du panier ne contient pas de filet animé.');
        netMesh = null;
      }
    },
    undefined,
    (error) => console.warn('Modèle Blender du panier indisponible ; panier simple conservé.', error),
  );

  function onScore(ballPosition, ballVelocity) {
    if (!netMesh) return;
    netVelocity.x += ballVelocity.x * 0.11 + (ballPosition.x - BASKET.x) * 0.7;
    netVelocity.y -= 1.2;
    netVelocity.z += ballVelocity.z * 0.11 + (ballPosition.z - BASKET.z) * 0.7;
  }

  function update(dt) {
    if (!netRest || netVelocity.lengthSq() + netOffset.lengthSq() < 0.000001) return;
    const step = Math.min(dt, 0.05);
    // The rim stays fixed while the lower knots follow a damped spring.
    netVelocity.addScaledVector(netOffset, -25 * step).multiplyScalar(Math.exp(-7 * step));
    netOffset.addScaledVector(netVelocity, step);
    const position = netMesh.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      const offset = index * 3;
      const weight = THREE.MathUtils.clamp(-netRest[offset + 1] / 0.48, 0, 1);
      position.array[offset] = netRest[offset] + netOffset.x * weight;
      position.array[offset + 1] = netRest[offset + 1] + netOffset.y * weight;
      position.array[offset + 2] = netRest[offset + 2] + netOffset.z * weight;
    }
    position.needsUpdate = true;
  }

  function dispose() {
    disposed = true;
    scene.remove(group);
    disposeGroup(group);
  }

  return { onScore, update, dispose };
}

function createHoop(group) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x343e43, metalness: 0.7, roughness: 0.34 });
  const boardMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9eeec,
    metalness: 0.05,
    roughness: 0.35,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xd85a26, metalness: 0.7, roughness: 0.26 });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.8, 12), steel);
  pole.position.set(0, 1.9, -13.2);
  pole.castShadow = true;
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1.1), steel);
  arm.position.set(0, 3.66, -12.65);
  arm.castShadow = true;
  group.add(arm);

  const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.075), boardMaterial);
  board.position.set(0, 3.5, -12.1);
  board.castShadow = true;
  group.add(board);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.88, 1.13, 0.025), steel);
  frame.position.set(0, 3.5, -12.15);
  group.add(frame);

  const square = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.3, 4), rimMaterial);
  square.rotation.z = Math.PI / 4;
  square.scale.y = 0.75;
  square.position.set(0, 3.38, -12.052);
  group.add(square);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(BASKET.rimRadius, 0.026, 8, 40), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 3.05, HOOP_Z);
  rim.castShadow = true;
  group.add(rim);

  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.055, 0.52), steel);
  brace.position.set(0, 3.05, -11.82);
  group.add(brace);

  const netPositions = [];
  for (let i = 0; i < 12; i += 1) {
    const angle = i * Math.PI / 6;
    const next = (i + 1) * Math.PI / 6;
    const topX = Math.cos(angle) * BASKET.rimRadius;
    const topZ = HOOP_Z + Math.sin(angle) * BASKET.rimRadius;
    const midX = Math.cos(angle + Math.PI / 12) * 0.25;
    const midZ = HOOP_Z + Math.sin(angle + Math.PI / 12) * 0.25;
    const bottomX = Math.cos(next) * 0.17;
    const bottomZ = HOOP_Z + Math.sin(next) * 0.17;
    netPositions.push(topX, 3.03, topZ, midX, 2.82, midZ);
    netPositions.push(midX, 2.82, midZ, bottomX, 2.63, bottomZ);
  }
  const netGeometry = new THREE.BufferGeometry();
  netGeometry.setAttribute('position', new THREE.Float32BufferAttribute(netPositions, 3));
  group.add(new THREE.LineSegments(netGeometry, new THREE.LineBasicMaterial({ color: 0xf0ebe1 })));
}

function createAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#30383b';
  context.fillRect(0, 0, 512, 512);
  let seed = 17;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 8500; i += 1) {
    const shade = Math.floor(35 + random() * 45);
    context.fillStyle = `rgba(${shade}, ${shade + 3}, ${shade + 4}, 0.32)`;
    context.fillRect(random() * 512, random() * 512, random() * 2 + 0.5, random() * 2 + 0.5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 4;
  return texture;
}

function disposeGroup(group) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        if (material.map) textures.add(material.map);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}
