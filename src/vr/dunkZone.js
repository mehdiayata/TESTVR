import { BASKET } from '../scene/createCourt.js';

// The player can trigger an assisted rim jump from a generous area on the court side.
const SIDE_REACH = 2.1;
const COURT_REACH = 2.6;
const BEHIND_RIM_ALLOWANCE = 0.25;

export function isInDunkZone(position) {
  const depth = position.z - BASKET.z;
  if (depth < -BEHIND_RIM_ALLOWANCE) return false;
  const forward = Math.max(0, depth);
  const side = (position.x - BASKET.x) / SIDE_REACH;
  return side * side + (forward / COURT_REACH) ** 2 <= 1;
}
