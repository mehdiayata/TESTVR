import * as THREE from 'three';

export function createVrControllers(player, renderer) {
  const grips = [];
  const handleGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.12, 10);
  const headGeometry = new THREE.BoxGeometry(0.075, 0.035, 0.06);
  const material = new THREE.MeshStandardMaterial({ color: 0x414c56, roughness: 0.7 });

  for (let index = 0; index < 2; index += 1) {
    const grip = renderer.xr.getControllerGrip(index);
    const proxy = new THREE.Group();
    proxy.visible = false;
    const handle = new THREE.Mesh(handleGeometry, material);
    handle.position.y = -0.04;
    const head = new THREE.Mesh(headGeometry, material);
    head.position.set(0, 0.025, -0.035);
    proxy.add(handle, head);
    grip.add(proxy);
    player.add(grip);
    const onConnected = () => { proxy.visible = true; };
    const onDisconnected = () => { proxy.visible = false; };
    grip.addEventListener('connected', onConnected);
    grip.addEventListener('disconnected', onDisconnected);
    grips.push({ grip, proxy, onConnected, onDisconnected });
  }

  function dispose() {
    for (const { grip, proxy, onConnected, onDisconnected } of grips) {
      grip.removeEventListener('connected', onConnected);
      grip.removeEventListener('disconnected', onDisconnected);
      grip.remove(proxy);
      player.remove(grip);
    }
    handleGeometry.dispose();
    headGeometry.dispose();
    material.dispose();
  }

  return { dispose };
}
