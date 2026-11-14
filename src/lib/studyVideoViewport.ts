/** Keep Study video artwork in live-canvas units while changing output resolution. */
export function getStudyVideoViewport(
  live: { width: number; height: number },
  output: { width: number; height: number },
) {
  const liveShortEdge = Math.max(1, Math.min(live.width, live.height));
  const scale = Math.min(output.width, output.height) / liveShortEdge;
  return { width: output.width / scale, height: output.height / scale, scale };
}

/** Leave breathing room for portrait social-player chrome around a six-part ensemble.
 * Insets are a conservative composition choice, not a platform safe-area guarantee.
 * Individual panels are laid out again inside this space, preserving circular geometry
 * and the original label size rather than shrinking a screenshot of the whole canvas.
 */
export function getStudyEnsembleExportFrame(width: number, height: number, layers: number) {
  if (layers !== 6 || height <= width) return { x: 0, y: 0, width, height };
  return { x: width * 0.04, y: height * 0.10, width: width * 0.84, height: height * 0.72 };
}
