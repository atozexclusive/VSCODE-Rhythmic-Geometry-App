/** Fit the artwork to the video frame, including room for labels and glow. */
export function getOrbitVideoFraming(width: number, height: number, visualRadius: number) {
  const padding = height > width ? 44 : 56;
  const targetRadius = Math.max(1, Math.min(width, height) / 2 - padding);
  const effectiveVisualRadius = Math.max(1, visualRadius + 12);
  return {
    targetRadius,
    effectiveVisualRadius,
    orbitScale: targetRadius / effectiveVisualRadius,
  };
}
