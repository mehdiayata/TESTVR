import * as THREE from 'three';

const WALK_SPEED = 1.8;
const DEAD_ZONE = 0.18;
const PLAYER_EYE_HEIGHT = 1.78;
const COURT_LIMITS = { minX: -7.5, maxX: 7.5, minZ: -14.2, maxZ: 1.5 };

export function createLocomotion(player, camera, renderer) {
  const forward = new THREE.Vector3();
  const headPosition = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const desktopPosition = camera.position.clone();
  const desktopRotation = camera.quaternion.clone();
  let ready = false;
  let heightAdjusted = false;

  const onSessionStart = () => {
    ready = false;
    heightAdjusted = false;
  };
  const onSessionEnd = () => {
    ready = false;
    heightAdjusted = false;
    player.position.set(0, 0, 0);
    camera.position.copy(desktopPosition);
    camera.quaternion.copy(desktopRotation);
    player.updateMatrixWorld(true);
  };
  renderer.xr.addEventListener('sessionstart', onSessionStart);
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  function update(dt) {
    const session = renderer.xr.getSession();
    if (!session) return;
    if (!ready) {
      ready = true;
      return;
    }
    if (!heightAdjusted) {
      player.position.y = PLAYER_EYE_HEIGHT - camera.position.y;
      player.updateMatrixWorld(true);
      heightAdjusted = true;
    }

    let source = null;
    for (const controller of session.inputSources) {
      if (controller.hand || !controller.gamepad) continue;
      if (!source || controller.handedness === 'left') source = controller;
      if (controller.handedness === 'left') break;
    }
    const axes = source?.gamepad.axes;
    if (!axes) return;

    const axisX = axes[2] ?? axes[0] ?? 0;
    const axisY = axes[3] ?? axes[1] ?? 0;
    const length = Math.hypot(axisX, axisY);
    if (length <= DEAD_ZONE) return;

    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) return;
    forward.normalize();

    const strength = Math.min(1, (length - DEAD_ZONE) / (1 - DEAD_ZONE));
    const distance = WALK_SPEED * strength * Math.min(dt, 0.05);
    movement.set(-forward.z * axisX - forward.x * axisY, 0,
      forward.x * axisX - forward.z * axisY);
    movement.multiplyScalar(distance / length);

    camera.getWorldPosition(headPosition);
    const nextX = THREE.MathUtils.clamp(headPosition.x + movement.x, COURT_LIMITS.minX, COURT_LIMITS.maxX);
    const nextZ = THREE.MathUtils.clamp(headPosition.z + movement.z, COURT_LIMITS.minZ, COURT_LIMITS.maxZ);
    player.position.x += nextX - headPosition.x;
    player.position.z += nextZ - headPosition.z;
    player.updateMatrixWorld(true);
  }

  function dispose() {
    renderer.xr.removeEventListener('sessionstart', onSessionStart);
    renderer.xr.removeEventListener('sessionend', onSessionEnd);
  }

  return { update, dispose };
}
