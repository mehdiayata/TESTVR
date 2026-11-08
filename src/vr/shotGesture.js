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

export function computeShotVelocity(position, motion, pointing, output) {
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
  output.set(
    aimX * distance / flightTime * power,
    upwardSpeed * power,
    aimZ * distance / flightTime * power,
  ).clampLength(0, 14);
  return output;
}
