import * as THREE from 'three';
import { BASKET } from '../scene/createCourt.js';

export function isShotGesture(position, velocity, pointing) {
  const dx = BASKET.x - position.x;
  const dz = BASKET.z - position.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.5 || velocity.y < 0.5) return false;

  const towardSpeed = (velocity.x * dx + velocity.z * dz) / distance;
  const pointingLength = Math.hypot(pointing.x, pointing.z);
  const pointingToward = pointingLength > 0.01
    ? (pointing.x * dx + pointing.z * dz) / (pointingLength * distance)
    : 0;
  return towardSpeed > 0.35 || (velocity.y > 1 && pointingToward > 0.65);
}

export function computeShotVelocity(position, motion, pointing, output, settings = {}) {
  const dx = BASKET.x - position.x;
  const dz = BASKET.z - position.z;
  const distance = Math.max(0.5, Math.hypot(dx, dz));
  const targetX = dx / distance;
  const targetZ = dz / distance;

  const pointingLength = Math.hypot(pointing.x, pointing.z);
  const motionLength = Math.hypot(motion.x, motion.z);
  let aimX = pointingLength > 0.1 ? pointing.x / pointingLength : targetX;
  let aimZ = pointingLength > 0.1 ? pointing.z / pointingLength : targetZ;
  if (motionLength > 0.2) {
    aimX = aimX * 0.55 + motion.x / motionLength * 0.45;
    aimZ = aimZ * 0.55 + motion.z / motionLength * 0.45;
  }
  const aimLength = Math.hypot(aimX, aimZ) || 1;
  aimX /= aimLength;
  aimZ /= aimLength;

  // Une petite correction aide les gestes qui pointent déjà près du panier.
  const accuracy = aimX * targetX + aimZ * targetZ;
  if (accuracy > 0.82) {
    aimX = aimX * 0.65 + targetX * 0.35;
    aimZ = aimZ * 0.65 + targetZ * 0.35;
    const correctedLength = Math.hypot(aimX, aimZ);
    aimX /= correctedLength;
    aimZ /= correctedLength;
  }

  const towardSpeed = Math.max(0, motion.x * targetX + motion.z * targetZ);
  const effort = motion.y + towardSpeed * 0.65;
  const power = THREE.MathUtils.clamp(0.74 + effort * 0.15, 0.82, 1.16);
  const flightTime = THREE.MathUtils.clamp(0.6 + distance * 0.13, 0.7, 1.65);
  const upwardSpeed = (BASKET.y + 0.12 - position.y + 4.905 * flightTime * flightTime) / flightTime;
  const shotPower = settings.shotPower ?? 1;
  output.set(
    aimX * distance / flightTime * power * shotPower,
    upwardSpeed * power * shotPower,
    aimZ * distance / flightTime * power * shotPower,
  ).clampLength(0, 18);
  return output;
}

export function computeAssistedShotVelocity(position, motion, pointing, stroke, output, settings = {}) {
  const dx = BASKET.x - position.x;
  const dz = BASKET.z - position.z;
  const distance = Math.max(0.01, Math.hypot(dx, dz));
  const towardX = dx / distance;
  const towardZ = dz / distance;
  const pointingLength = Math.hypot(pointing.x, pointing.z);
  const pointX = pointingLength > 0.05 ? pointing.x / pointingLength : towardX;
  const pointZ = pointingLength > 0.05 ? pointing.z / pointingLength : towardZ;
  const upwardMotion = Math.max(0, motion.y);
  const strokeFactor = THREE.MathUtils.clamp(0.8 + stroke, 0.8, 1.35);

  // The arm speed and stroke set most of the power. Assistance steers a gesture
  // toward the hoop and supplies only part of the ideal launch velocity.
  let horizontalX = (motion.x * 2.6 + pointX * upwardMotion * 0.55) * strokeFactor;
  let horizontalZ = (motion.z * 2.6 + pointZ * upwardMotion * 0.55) * strokeFactor;
  const horizontalSpeed = Math.hypot(horizontalX, horizontalZ);
  if (horizontalSpeed > 0.01) {
    const alignment = (horizontalX * towardX + horizontalZ * towardZ) / horizontalSpeed;
    if (alignment > 0.55) {
      horizontalX = horizontalX * 0.75 + towardX * horizontalSpeed * 0.25;
      horizontalZ = horizontalZ * 0.75 + towardZ * horizontalSpeed * 0.25;
    }
  }

  const rawY = (upwardMotion * 2.75 + 1.35) * strokeFactor;
  const flightTime = THREE.MathUtils.clamp(0.82 + distance * 0.075, 0.9, 1.75);
  const arcHeight = BASKET.y + 0.2 + distance * 0.04 + Math.abs(dx) * 0.012;
  const idealY = (arcHeight - position.y + 4.905 * flightTime * flightTime) / flightTime;
  const correction = 0.35;
  output.set(
    horizontalX * (1 - correction) + dx / flightTime * correction,
    rawY * (1 - correction) + idealY * correction,
    horizontalZ * (1 - correction) + dz / flightTime * correction,
  );
  const shotPower = settings.shotPower ?? 1;
  const shotArc = settings.shotArc ?? 1;
  output.x *= shotPower;
  output.z *= shotPower;
  output.y *= shotPower * shotArc;
  output.clampLength(0, 18);
  return output;
}
