import {
  getDisplayStepCount,
  getReferenceStepsPerBar,
  getReferenceStepsPerBeat,
  getRiffPhrasePoints,
  getRiffStepIndexAtReferenceStep,
  type RiffCycleStudy,
} from './riffCycleStudy';

export interface RiffCyclePoint {
  x: number;
  y: number;
}

export interface RiffCycleTimelineRect {
  x: number;
  y: number;
  width: number;
  height: number;
  topLaneY: number;
  bottomLaneY: number;
  laneHeight: number;
  stepWidth: number;
}

export interface RiffCycleCanvasMetrics {
  width: number;
  height: number;
  topPadding: number;
  bottomPadding: number;
  sidePadding: number;
  circleCenterX: number;
  circleCenterY: number;
  outerRadius: number;
  innerRadius: number;
  totalDisplaySteps: number;
  stepsPerBar: number;
  referenceVertices: RiffCyclePoint[];
  referencePerimeterPoints: RiffCyclePoint[];
  timelineRect: RiffCycleTimelineRect | null;
}

export interface RiffCycleHitResult {
  target: 'riff-step' | 'riff-ring';
  stepIndex: number | null;
  displayStep: number | null;
}

function lerpPoint(a: RiffCyclePoint, b: RiffCyclePoint, t: number): RiffCyclePoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function getReferencePolygonVertices(
  study: RiffCycleStudy,
  metrics: Pick<RiffCycleCanvasMetrics, 'circleCenterX' | 'circleCenterY' | 'outerRadius'>,
): RiffCyclePoint[] {
  const vertexCount = Math.max(3, study.reference.numerator);
  const startAngle = -Math.PI / 2;
  return Array.from({ length: vertexCount }, (_, index) => {
    const angle = startAngle + (index / vertexCount) * Math.PI * 2;
    return {
      x: metrics.circleCenterX + Math.cos(angle) * metrics.outerRadius,
      y: metrics.circleCenterY + Math.sin(angle) * metrics.outerRadius,
    };
  });
}

export function getReferenceStepPoint(
  study: RiffCycleStudy,
  metrics: Pick<RiffCycleCanvasMetrics, 'circleCenterX' | 'circleCenterY' | 'outerRadius'>,
  stepWithinBar: number,
): RiffCyclePoint {
  const vertices = getReferencePolygonVertices(study, metrics);
  const stepsPerBeat = getReferenceStepsPerBeat(study.reference);
  const normalizedStepWithinBar =
    ((stepWithinBar % getReferenceStepsPerBar(study.reference)) +
      getReferenceStepsPerBar(study.reference)) %
    getReferenceStepsPerBar(study.reference);
  const beatIndex = Math.floor(normalizedStepWithinBar / stepsPerBeat);
  const substepIndex = normalizedStepWithinBar % stepsPerBeat;
  const startVertex = vertices[beatIndex % vertices.length];
  const endVertex = vertices[(beatIndex + 1) % vertices.length];
  return lerpPoint(startVertex, endVertex, substepIndex / stepsPerBeat);
}

export function getReferencePerimeterPoints(
  study: RiffCycleStudy,
  metrics: Pick<RiffCycleCanvasMetrics, 'circleCenterX' | 'circleCenterY' | 'outerRadius'>,
): RiffCyclePoint[] {
  return Array.from({ length: getReferenceStepsPerBar(study.reference) }, (_, step) =>
    getReferenceStepPoint(study, metrics, step),
  );
}

export function getRiffCycleCanvasMetrics(
  study: RiffCycleStudy,
  width: number,
  height: number,
  isMobile: boolean,
): RiffCycleCanvasMetrics {
  const sidePadding = isMobile ? 22 : 44;
  const topPadding = isMobile ? 56 : 54;
  const bottomPadding = isMobile ? 136 : 120;
  const timelineHeight = study.viewMode === 'unwrapped' ? (isMobile ? 120 : 138) : 0;
  const verticalGap = study.viewMode === 'unwrapped' ? (isMobile ? 18 : 22) : 0;
  const safeWidth = Math.max(1, width - sidePadding * 2);
  const safeHeight = Math.max(1, height - topPadding - bottomPadding - timelineHeight - verticalGap);
  const circleCenterX = width / 2;
  const circleCenterY = topPadding + safeHeight / 2;
  const outerRadius = Math.max(84, Math.min(safeWidth / 2 - 10, safeHeight / 2 - 8));
  const innerRadius = outerRadius * (isMobile ? 0.54 : 0.57);
  const laneHeight = isMobile ? 28 : 30;
  const topLaneY = circleCenterY + outerRadius + verticalGap + 16;
  const bottomLaneY = topLaneY + laneHeight + (isMobile ? 18 : 20);
  const timelineRect =
    study.viewMode === 'unwrapped'
      ? {
          x: sidePadding,
          y: circleCenterY + outerRadius + verticalGap,
          width: safeWidth,
          height: timelineHeight,
          topLaneY,
          bottomLaneY,
          laneHeight,
          stepWidth: safeWidth / Math.max(1, getDisplayStepCount(study)),
        }
      : null;

  const baseMetrics = {
    circleCenterX,
    circleCenterY,
    outerRadius,
  };

  return {
    width,
    height,
    topPadding,
    bottomPadding,
    sidePadding,
    circleCenterX,
    circleCenterY,
    outerRadius,
    innerRadius,
    totalDisplaySteps: getDisplayStepCount(study),
    stepsPerBar: getReferenceStepsPerBar(study.reference),
    referenceVertices: getReferencePolygonVertices(study, baseMetrics),
    referencePerimeterPoints: getReferencePerimeterPoints(study, baseMetrics),
    timelineRect,
  };
}

export function getRiffLaneCellAt(
  study: RiffCycleStudy,
  metrics: RiffCycleCanvasMetrics,
  x: number,
  y: number,
): { displayStep: number; stepIndex: number } | null {
  const timeline = metrics.timelineRect;
  if (!timeline) {
    return null;
  }

  if (
    x < timeline.x ||
    x > timeline.x + timeline.width ||
    y < timeline.bottomLaneY ||
    y > timeline.bottomLaneY + timeline.laneHeight
  ) {
    return null;
  }

  const displayStep = Math.max(
    0,
    Math.min(
      metrics.totalDisplaySteps - 1,
      Math.floor((x - timeline.x) / timeline.stepWidth),
    ),
  );

  return {
    displayStep,
    stepIndex: getRiffStepIndexAtReferenceStep(study, displayStep),
  };
}

export function findRiffCycleHit(
  study: RiffCycleStudy,
  metrics: RiffCycleCanvasMetrics,
  x: number,
  y: number,
): RiffCycleHitResult | null {
  const laneHit = getRiffLaneCellAt(study, metrics, x, y);
  if (laneHit) {
    return {
      target: 'riff-step',
      stepIndex: laneHit.stepIndex,
      displayStep: laneHit.displayStep,
    };
  }

  const points = getRiffPhrasePoints(
    study,
    metrics.circleCenterX,
    metrics.circleCenterY,
    metrics.innerRadius,
  );

  for (const point of points) {
    const distance = Math.hypot(x - point.x, y - point.y);
    if (distance <= 20) {
      return {
        target: 'riff-step',
        stepIndex: point.index,
        displayStep: null,
      };
    }
  }

  const distanceToCenter = Math.hypot(x - metrics.circleCenterX, y - metrics.circleCenterY);
  if (Math.abs(distanceToCenter - metrics.innerRadius) <= 18) {
    return {
      target: 'riff-ring',
      stepIndex: null,
      displayStep: null,
    };
  }

  return null;
}
