export function getRangeValueFromClientX(input: HTMLInputElement, clientX: number): number {
  const rect = input.getBoundingClientRect();
  const min = Number.parseFloat(input.min || '0');
  const max = Number.parseFloat(input.max || '100');
  const step = Number.parseFloat(input.step || '1');

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return Number.parseFloat(input.value || '0');
  }

  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(rect.width, 1)));
  const rawValue = min + ratio * (max - min);

  if (!Number.isFinite(step) || step <= 0) {
    return rawValue;
  }

  const steppedValue = min + Math.round((rawValue - min) / step) * step;
  const stepDecimals = Math.max(0, (input.step.split('.')[1] || '').length);
  return Number(steppedValue.toFixed(stepDecimals));
}
