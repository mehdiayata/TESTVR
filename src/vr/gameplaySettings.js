export const GAMEPLAY_OPTIONS = Object.freeze([
  { key: 'shotArc', label: 'Tir en cloche', min: 0.7, max: 1.6, step: 0.05, initial: 1, unit: 'x' },
  { key: 'walkSpeed', label: 'Marche', min: 0.8, max: 3.5, step: 0.1, initial: 1.8, unit: ' m/s' },
  { key: 'runSpeed', label: 'Course', min: 1.8, max: 5.5, step: 0.1, initial: 2.9, unit: ' m/s' },
  { key: 'shotPower', label: 'Puissance de tir', min: 0.7, max: 1.7, step: 0.05, initial: 1.2, unit: 'x' },
]);

export function createGameplaySettings() {
  const values = Object.fromEntries(GAMEPLAY_OPTIONS.map(({ key, initial }) => [key, initial]));

  function set(key, value) {
    const option = GAMEPLAY_OPTIONS.find((item) => item.key === key);
    if (!option || !Number.isFinite(value)) return false;
    const clamped = Math.max(option.min, Math.min(option.max, value));
    values[key] = Number((Math.round(clamped / option.step) * option.step).toFixed(2));
    return true;
  }

  return { values, set };
}
