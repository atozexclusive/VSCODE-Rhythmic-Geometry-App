/** Render exports in the same visual units as the live canvas, then scale to output pixels. */
export function getCanvasExportViewport(
  live: { width: number; height: number },
  output: { width: number; height: number },
) {
  const liveShortEdge = Math.min(live.width, live.height);
  const outputShortEdge = Math.min(output.width, output.height);
  const scale = liveShortEdge > 0 ? outputShortEdge / liveShortEdge : 1;
  return { width: output.width / scale, height: output.height / scale, scale };
}
