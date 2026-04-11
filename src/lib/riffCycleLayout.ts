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
  visibleStartStep: number;
  visibleStepCount: number;
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
  bottomInset = 0,
  laneWindowStartStep?: number,
  laneWindowStepCount?: number,
): RiffCycleCanvasMetrics {
  const showingTimeline = study.viewMode === 'unwrapped';
  const sidePadding = isMobile ? (showingTimeline ? 18 : 12) : 44;
  const topPadding = isMobile ? (showingTimeline ? 22 : 26) : 54;
  const bottomPadding = (isMobile ? (showingTimeline ? 16 : 32) : 120) + bottomInset;
  const timelineHeight = showingTimeline ? (isMobile ? 126 : 138) : 0;
  const verticalGap = showingTimeline ? (isMobile ? 10 : 22) : 0;
  const safeWidth = Math.max(1, width - sidePadding * 2);
  const circleCenterX = width / 2;
  const laneHeight = isMobile ? 32 : 30;
  const totalDisplaySteps = getDisplayStepCount(study);
  const visibleStepCount = showingTimeline
    ? Math.max(1, Math.min(totalDisplaySteps, Math.floor(laneWindowStepCount ?? totalDisplaySteps)))
    : totalDisplaySteps;
  const maxVisibleStart = Math.max(0, totalDisplaySteps - visibleStepCount);
  const visibleStartStep = showingTimeline
    ? Math.max(0, Math.min(maxVisibleStart, Math.floor(laneWindowStartStep ?? 0)))
    : 0;

  let circleCenterY: number;
  let outerRadius: number;
  let topLaneY = 0;
  let bottomLaneY = 0;
  let timelineRect: RiffCycleTimelineRect | null = null;

  if (showingTimeline) {
    const timelineY = height - bottomPadding - timelineHeight;
    const availableTopHeight = Math.max(1, timelineY - topPadding - verticalGap);

    outerRadius = Math.max(
      isMobile ? 96 : 84,
      Math.min(safeWidth / 2 - (isMobile ? 6 : 10), availableTopHeight / 2 - (isMobile ? 8 : 8)),
    );
    circleCenterY = topPadding + availableTopHeight / 2;
    topLaneY = timelineY + (isMobile ? 10 : 16);
    bottomLaneY = topLaneY + laneHeight + (isMobile ? 14 : 20);

    timelineRect = {
      x: sidePadding,
      y: timelineY,
      width: safeWidth,
      height: timelineHeight,
      topLaneY,
      bottomLaneY,
      laneHeight,
      stepWidth: safeWidth / visibleStepCount,
      visibleStartStep,
      visibleStepCount,
    };
  } else {
    const safeHeight = Math.max(1, height - topPadding - bottomPadding);
    outerRadius = Math.max(
      isMobile ? 96 : 84,
      Math.min(safeWidth / 2 - (isMobile ? 6 : 10), safeHeight / 2 - (isMobile ? 4 : 8)),
    );
    circleCenterY = topPadding + safeHeight / 2;
  }

  const innerRadius = outerRadius * (isMobile ? (showingTimeline ? 0.52 : 0.56) : 0.57);

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
    totalDisplaySteps,
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
    timeline.visibleStartStep,
    Math.min(
      timeline.visibleStartStep + timeline.visibleStepCount - 1,
      timeline.visibleStartStep + Math.floor((x - timeline.x) / timeline.stepWidth),
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
