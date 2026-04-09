import { getLayerStepPoints, type PolyrhythmStudy } from './polyrhythmStudy';

export interface PolyrhythmCanvasMetrics {
  width: number;
  height: number;
  sidePadding: number;
  topPadding: number;
  bottomPadding: number;
  safeWidth: number;
  safeHeight: number;
  centerX: number;
  centerY: number;
  scale: number;
  outerRadius: number;
}

export interface PolyrhythmHitResult {
  layerId: string;
  stepIndex: number | null;
}

export function getPolyrhythmCanvasMetrics(
  study: PolyrhythmStudy,
  width: number,
  height: number,
  isMobile: boolean,
): PolyrhythmCanvasMetrics {
  const sidePadding = isMobile ? 24 : 56;
  const topPadding = isMobile ? 42 : 48;
  const bottomPadding = isMobile ? 126 : 116;
  const safeWidth = Math.max(1, width - sidePadding * 2);
  const safeHeight = Math.max(1, height - topPadding - bottomPadding);
  const centerX = width / 2;
  const centerY = topPadding + safeHeight / 2;
  const maxRadius = Math.max(1, ...study.layers.map((layer) => layer.radius));
  const scale = Math.max(0.18, Math.min(safeWidth / 2, safeHeight / 2) / maxRadius);
  const outerRadius = maxRadius * scale + (isMobile ? 18 : 24);

  return {
    width,
    height,
    sidePadding,
    topPadding,
    bottomPadding,
    safeWidth,
    safeHeight,
    centerX,
    centerY,
    scale,
    outerRadius,
  };
}

export function findPolyrhythmHit(
  study: PolyrhythmStudy,
  metrics: PolyrhythmCanvasMetrics,
  x: number,
  y: number,
): PolyrhythmHitResult | null {
  const pointHitRadius = 18;
  const ringHitPadding = 14;

  for (const layer of [...study.layers].sort((a, b) => a.radius - b.radius)) {
    const points = getLayerStepPoints(
      layer,
      metrics.centerX,
      metrics.centerY,
      metrics.scale,
    );

    for (const point of points) {
      if (!study.showInactiveSteps && !point.active) {
        continue;
      }

      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance <= pointHitRadius) {
        return {
          layerId: layer.id,
          stepIndex: point.index,
        };
      }
    }
  }

  for (const layer of [...study.layers].sort((a, b) => a.radius - b.radius)) {
    const radius = layer.radius * metrics.scale;
    const distanceToCenter = Math.hypot(x - metrics.centerX, y - metrics.centerY);
    if (Math.abs(distanceToCenter - radius) <= ringHitPadding) {
      return {
        layerId: layer.id,
        stepIndex: null,
      };
    }
  }

  return null;
}
