import * as THREE from 'three';
import { GAMEPLAY_OPTIONS } from './gameplaySettings.js';

const WIDTH = 0.78;
const HEIGHT = 0.62;
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 812;
const BAR_LEFT = 420;
const BAR_RIGHT = 875;
const ROW_Y = [245, 375, 505, 635];

export function createGameplayMenu(scene, renderer, settings) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const panel = new THREE.Mesh(geometry, material);
  panel.renderOrder = 50;
  panel.visible = false;
  scene.add(panel);

  const cursor = new THREE.Mesh(
    new THREE.RingGeometry(0.007, 0.011, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd56b, depthTest: false, toneMapped: false }),
  );
  cursor.position.z = 0.003;
  cursor.renderOrder = 51;
  cursor.visible = false;
  panel.add(cursor);

  const desktop = document.createElement('div');
  desktop.style.cssText = 'display:none;position:fixed;z-index:1000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,90vw);padding:24px;border:1px solid #80b5c7;border-radius:14px;background:#17252ded;color:#f3f7f8;font:16px system-ui;box-shadow:0 12px 40px #0008';
  desktop.innerHTML = '<strong style="font-size:20px">Réglages du jeu</strong><p>Y : fermer le menu</p>';
  const desktopControls = new Map();
  for (const option of GAMEPLAY_OPTIONS) {
    const label = document.createElement('label');
    label.style.cssText = 'display:block;margin:14px 0';
    const title = document.createElement('span');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = option.min;
    input.max = option.max;
    input.step = option.step;
    input.style.cssText = 'display:block;width:100%;margin-top:8px;accent-color:#e9ad55';
    input.addEventListener('input', () => {
      settings.set(option.key, Number(input.value));
      syncControls();
    });
    label.append(title, input);
    desktop.append(label);
    desktopControls.set(option.key, { title, input });
  }
  document.body.append(desktop);

  const raycaster = new THREE.Raycaster();
  const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
  const direction = new THREE.Vector3();
  const headPosition = new THREE.Vector3();
  const headRotation = new THREE.Quaternion();
  const yButtons = new WeakMap();
  let open = false;

  function format(option) {
    return `${settings.values[option.key].toFixed(option.step < 0.1 ? 2 : 1)}${option.unit}`;
  }

  function draw() {
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = '#14252eea';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.strokeStyle = '#8bb7c5';
    context.lineWidth = 5;
    context.strokeRect(13, 13, CANVAS_WIDTH - 26, CANVAS_HEIGHT - 26);
    context.fillStyle = '#f5f5ed';
    context.font = 'bold 49px system-ui';
    context.fillText('RÉGLAGES DU JEU', 65, 95);
    context.font = '29px system-ui';
    context.fillStyle = '#bcd0d7';
    context.fillText('Pointez une jauge et appuyez sur la gâchette. Y : fermer.', 65, 150);
    GAMEPLAY_OPTIONS.forEach((option, index) => {
      const y = ROW_Y[index];
      const fraction = (settings.values[option.key] - option.min) / (option.max - option.min);
      context.fillStyle = '#f5f5ed';
      context.font = '31px system-ui';
      context.fillText(option.label, 65, y + 9);
      context.fillStyle = '#375462';
      context.fillRect(BAR_LEFT, y - 13, BAR_RIGHT - BAR_LEFT, 25);
      context.fillStyle = '#edb45f';
      context.fillRect(BAR_LEFT, y - 13, (BAR_RIGHT - BAR_LEFT) * fraction, 25);
      context.beginPath();
      context.arc(BAR_LEFT + (BAR_RIGHT - BAR_LEFT) * fraction, y, 18, 0, Math.PI * 2);
      context.fillStyle = '#fff3d7';
      context.fill();
      context.fillStyle = '#d9e5e7';
      context.font = '25px system-ui';
      context.fillText(format(option), BAR_LEFT, y + 58);
    });
    texture.needsUpdate = true;
  }

  function syncControls() {
    for (const option of GAMEPLAY_OPTIONS) {
      const control = desktopControls.get(option.key);
      control.input.value = settings.values[option.key];
      control.title.textContent = `${option.label} : ${format(option)}`;
    }
    draw();
  }

  function setOpen(value) {
    open = value;
    const inVr = Boolean(renderer.xr.getSession());
    panel.visible = open && inVr;
    desktop.style.display = open && !inVr ? 'block' : 'none';
    cursor.visible = false;
    if (open) syncControls();
  }

  function hit(controller) {
    controller.updateWorldMatrix(true, false);
    panel.updateWorldMatrix(true, false);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    direction.set(0, 0, -1).transformDirection(controller.matrixWorld);
    raycaster.ray.direction.copy(direction);
    return raycaster.intersectObject(panel, false)[0];
  }

  function placeInFrontOfHead() {
    const head = renderer.xr.getCamera();
    head.getWorldPosition(headPosition);
    head.getWorldQuaternion(headRotation);
    panel.position.copy(headPosition).add(direction.set(0, 0, -1.15).applyQuaternion(headRotation));
    panel.quaternion.copy(headRotation);
    panel.updateWorldMatrix(false, false);
  }

  function onSelectStart(event) {
    if (!open || !renderer.xr.getSession() || event.data?.hand) return;
    const intersection = hit(event.target);
    if (!intersection?.uv) return;
    const x = intersection.uv.x * CANVAS_WIDTH;
    const y = (1 - intersection.uv.y) * CANVAS_HEIGHT;
    const index = ROW_Y.findIndex((row) => Math.abs(y - row) < 54);
    if (index < 0 || x < BAR_LEFT - 25 || x > BAR_RIGHT + 25) return;
    const option = GAMEPLAY_OPTIONS[index];
    const fraction = THREE.MathUtils.clamp((x - BAR_LEFT) / (BAR_RIGHT - BAR_LEFT), 0, 1);
    settings.set(option.key, option.min + (option.max - option.min) * fraction);
    syncControls();
  }

  const onKeyDown = (event) => {
    if (event.code === 'KeyY' && !event.repeat && !renderer.xr.getSession()) setOpen(!open);
  };
  const onSessionEnd = () => setOpen(false);
  window.addEventListener('keydown', onKeyDown);
  renderer.xr.addEventListener('sessionend', onSessionEnd);
  controllers.forEach((controller) => controller.addEventListener('selectstart', onSelectStart));

  function update() {
    const session = renderer.xr.getSession();
    if (!session) return;
    for (const source of session.inputSources) {
      if (source.handedness !== 'left' || !source.gamepad) continue;
      // Meta Quest Y is the fifth face button in the left XR gamepad mapping.
      const pressed = source.gamepad.buttons[5]?.pressed === true;
      const previous = yButtons.get(source) ?? false;
      if (pressed && !previous) setOpen(!open);
      yButtons.set(source, pressed);
    }
    if (!open) return;
    placeInFrontOfHead();
    cursor.visible = false;
    for (const controller of controllers) {
      const intersection = hit(controller);
      if (!intersection?.uv) continue;
      cursor.position.set((intersection.uv.x - 0.5) * WIDTH, (intersection.uv.y - 0.5) * HEIGHT, 0.003);
      cursor.visible = true;
      break;
    }
  }

  function dispose() {
    window.removeEventListener('keydown', onKeyDown);
    renderer.xr.removeEventListener('sessionend', onSessionEnd);
    controllers.forEach((controller) => controller.removeEventListener('selectstart', onSelectStart));
    desktop.remove();
    scene.remove(panel);
    cursor.geometry.dispose();
    cursor.material.dispose();
    geometry.dispose();
    material.dispose();
    texture.dispose();
  }

  syncControls();
  return { update, dispose, isOpen: () => open };
}
