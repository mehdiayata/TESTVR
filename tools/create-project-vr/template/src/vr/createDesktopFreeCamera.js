import * as THREE from 'three';

const MOVE_SPEED = 3;
const LOOK_SPEED = 0.002;
const MAX_PITCH = Math.PI / 2 - 0.05;
const CONTROL_KEYS = new Set(['z', 'w', 's', 'q', 'a', 'd', ' ', 'shift']);

export function createDesktopFreeCamera(camera, canvas, renderer) {
  const pressed = new Set();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const desktopPosition = new THREE.Vector3();
  const desktopQuaternion = new THREE.Quaternion();
  camera.rotation.order = 'YXZ';

  function onPointerDown(event) {
    if (event.button !== 0 || renderer.xr.isPresenting) return;
    canvas.requestPointerLock?.();
  }

  function onMouseMove(event) {
    if (document.pointerLockElement !== canvas || renderer.xr.isPresenting) return;
    camera.rotation.y -= event.movementX * LOOK_SPEED;
    camera.rotation.x = THREE.MathUtils.clamp(
      camera.rotation.x - event.movementY * LOOK_SPEED,
      -MAX_PITCH,
      MAX_PITCH,
    );
  }

  function onKeyDown(event) {
    if (renderer.xr.isPresenting || event.target?.closest?.('input, textarea, [contenteditable]')) return;
    const key = event.key.toLowerCase();
    if (!CONTROL_KEYS.has(key)) return;
    pressed.add(key);
    if (document.pointerLockElement === canvas) event.preventDefault();
  }

  function onKeyUp(event) {
    pressed.delete(event.key.toLowerCase());
  }

  function onSessionStart() {
    pressed.clear();
    desktopPosition.copy(camera.position);
    desktopQuaternion.copy(camera.quaternion);
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    // The headset supplies its own floor-relative pose in WebXR.
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
  }

  function onSessionEnd() {
    camera.position.copy(desktopPosition);
    camera.quaternion.copy(desktopQuaternion);
  }

  function update(dt) {
    if (renderer.xr.isPresenting || pressed.size === 0) return;
    const distance = MOVE_SPEED * Math.min(dt, 0.05);
    camera.getWorldDirection(forward);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);

    const forwardAxis = Number(pressed.has('z') || pressed.has('w')) - Number(pressed.has('s'));
    const rightAxis = Number(pressed.has('d')) - Number(pressed.has('q') || pressed.has('a'));
    const verticalAxis = Number(pressed.has(' ')) - Number(pressed.has('shift'));
    const length = Math.hypot(forwardAxis, rightAxis, verticalAxis);
    if (length === 0) return;

    const step = distance / length;
    camera.position.addScaledVector(forward, forwardAxis * step);
    camera.position.addScaledVector(right, rightAxis * step);
    camera.position.y += verticalAxis * step;
  }

  function dispose() {
    canvas.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    renderer.xr.removeEventListener('sessionstart', onSessionStart);
    renderer.xr.removeEventListener('sessionend', onSessionEnd);
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  renderer.xr.addEventListener('sessionstart', onSessionStart);
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  return { update, dispose };
}
