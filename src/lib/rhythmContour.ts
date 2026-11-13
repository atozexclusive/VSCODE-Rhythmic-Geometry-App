const TAU = Math.PI * 2;
export interface RhythmContourPoint { index: number; active: boolean; x: number; y: number; angle: number; }

export interface ContourGeometry {
  centerX: number; centerY: number; radius: number; stepCount: number; intensity: number; pointScale: number;
}
function contourSegments(points: RhythmContourPoint[], options: ContourGeometry) {
  const activePoints = points.filter((point) => point.active).sort((a, b) => a.index - b.index);
  if (activePoints.length < 2) {
    return [];
  }

  return activePoints
    .map((point, index) => {
      const nextPoint = activePoints[(index + 1) % activePoints.length];
      const stepSpan =
        nextPoint.index > point.index
          ? nextPoint.index - point.index
          : options.stepCount - point.index + nextPoint.index;
      const startAngle = point.angle;
      const endAngle = nextPoint.index > point.index ? nextPoint.angle : nextPoint.angle + TAU;
      const arcSpan = endAngle - startAngle;
      if (stepSpan <= 0 || arcSpan <= 0.02) {
        return null;
      }

      const midAngle = startAngle + arcSpan / 2;
      const carveDepth = Math.min(
        options.radius * (0.16 + options.intensity * 0.18),
        (8 + options.intensity * 8 + Math.min(34, stepSpan * 4.5) * options.intensity) * options.pointScale,
      );
      const controlRadius = Math.max(options.radius * 0.5, options.radius - carveDepth);

      return {
        point,
        nextPoint,
        stepSpan,
        midAngle,
        controlX: options.centerX + Math.cos(midAngle) * controlRadius,
        controlY: options.centerY + Math.sin(midAngle) * controlRadius,
      };
    })
    .filter((segment): segment is NonNullable<typeof segment> => segment != null);

}
/** Append the exact filled outline without resetting an existing clipping path. */
export function appendRhythmContourPath(ctx: CanvasRenderingContext2D, points: RhythmContourPoint[], options: ContourGeometry): boolean {
  const segments = contourSegments(points, options);
  if (segments.length < 2) return false;
  ctx.moveTo(segments[0].point.x, segments[0].point.y);
  segments.forEach(segment => ctx.quadraticCurveTo(segment.controlX, segment.controlY, segment.nextPoint.x, segment.nextPoint.y));
  ctx.closePath();
  return true;
}

export function drawRhythmContour(
  ctx: CanvasRenderingContext2D,
  points: RhythmContourPoint[],
  options: {
    centerX: number;
    centerY: number;
    radius: number;
    stepCount: number;
    color: string;
    glowMultiplier: number;
    pointScale: number;
    showLabels: boolean;
    intensity: number;
    fill: boolean;
  },
): void {
  const segments = contourSegments(points, options);
  if (segments.length === 0) {
    return;
  }

  const labelCandidates: Array<{ angle: number; label: string; span: number }> = [];

  if (options.fill && segments.length >= 2) {
    ctx.save();
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.moveTo(segments[0].point.x, segments[0].point.y);
    segments.forEach((segment) => {
      ctx.quadraticCurveTo(segment.controlX, segment.controlY, segment.nextPoint.x, segment.nextPoint.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // One glow operation for the complete contour instead of a separate blur per segment.
  const strokeSegments = () => {
    ctx.beginPath();
    segments.forEach(({ point, nextPoint, controlX, controlY }) => {
      ctx.moveTo(point.x, point.y);
      ctx.quadraticCurveTo(controlX, controlY, nextPoint.x, nextPoint.y);
    });
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(3,5,8,0.56)';
  ctx.lineWidth = (3.2 + options.intensity * 4) * options.pointScale;
  ctx.globalAlpha = 0.28 + options.intensity * 0.3;
  strokeSegments();
  ctx.strokeStyle = options.color;
  ctx.lineWidth = (0.9 + options.intensity * 0.85) * options.pointScale;
  ctx.globalAlpha = 0.48 + options.intensity * 0.28;
  ctx.shadowBlur = (4 + options.intensity * 7) * options.glowMultiplier * options.pointScale;
  ctx.shadowColor = `${options.color}99`;
  strokeSegments();
  ctx.restore();

  if (options.showLabels) {
    segments.forEach(({ stepSpan, midAngle }) => {
      if (stepSpan > 1) labelCandidates.push({ angle: midAngle, label: String(stepSpan), span: stepSpan });
    });
  }

  if (!options.showLabels || labelCandidates.length === 0) {
    return;
  }

  const placedLabels: Array<{ x: number; y: number; radius: number }> = [];
  ctx.save();
  const labelRadius = options.radius * 0.66;
  ctx.font = `${Math.max(8, 9.75 * options.pointScale)}px "SF Mono", "Fira Code", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  labelCandidates
    .sort((a, b) => a.angle - b.angle)
    .forEach((candidate) => {
      const labelX = options.centerX + Math.cos(candidate.angle) * labelRadius;
      const labelY = options.centerY + Math.sin(candidate.angle) * labelRadius;
      const textWidth = ctx.measureText(candidate.label).width;
      const candidateRadius = Math.max(6.5 * options.pointScale, textWidth / 2 + 3.25 * options.pointScale);
      const collides = placedLabels.some(
        (placed) =>
          Math.hypot(labelX - placed.x, labelY - placed.y) <
          candidateRadius + placed.radius + 1.5 * options.pointScale,
      );
      if (collides) {
        return;
      }
      placedLabels.push({ x: labelX, y: labelY, radius: candidateRadius });

      ctx.save();
      ctx.lineWidth = 4 * options.pointScale;
      ctx.strokeStyle = 'rgba(2,4,7,0.9)';
      ctx.strokeText(candidate.label, labelX, labelY);
      ctx.fillStyle = `${options.color}E6`;
      ctx.shadowBlur = 7 * options.glowMultiplier * options.pointScale;
      ctx.shadowColor = `${options.color}88`;
      ctx.fillText(candidate.label, labelX, labelY);
      ctx.restore();
    });
  ctx.restore();
}

