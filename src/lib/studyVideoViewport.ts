/** Keep Study video artwork in live-canvas units while changing output resolution. */
export function getStudyVideoViewport(
  live: { width: number; height: number },
  output: { width: number; height: number },
) {
  const liveShortEdge = Math.max(1, Math.min(live.width, live.height));
  const scale = Math.min(output.width, output.height) / liveShortEdge;
  return { width: output.width / scale, height: output.height / scale, scale };
}
