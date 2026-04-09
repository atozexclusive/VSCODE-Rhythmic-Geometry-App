import { useCallback, useEffect, useRef } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  type PolyrhythmStudy,
  getActiveStepIndices,
  getLayerStepPoints,
  getPlaybackStepIndex,
} from '../lib/polyrhythmStudy';

const TAU = Math.PI * 2;

interface PolyrhythmCanvasProps {
  study: PolyrhythmStudy;
  className?: string;
}

export default function PolyrhythmCanvas({
  study,
  className,
}: PolyrhythmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const studyRef = useRef(study);
  const progressRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);

  studyRef.current = study;
  isMobileRef.current = isMobile;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const nextWidth = Math.round(rect.width * dpr);
    const nextHeight = Math.round(rect.height * dpr);

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const currentStudy = studyRef.current;
    const w = rect.width;
    const h = rect.height;
    const sidePadding = isMobileRef.current ? 24 : 56;
    const topPadding = isMobileRef.current ? 42 : 48;
    const bottomPadding = isMobileRef.current ? 126 : 116;
    const safeWidth = Math.max(1, w - sidePadding * 2);
    const safeHeight = Math.max(1, h - topPadding - bottomPadding);
    const cx = w / 2;
    const cy = topPadding + safeHeight / 2;
    const maxRadius = Math.max(
      1,
      ...currentStudy.layers.map((layer) => layer.radius),
    );
    const scale = Math.max(
      0.18,
      Math.min(safeWidth / 2, safeHeight / 2) / maxRadius,
    );
    const cursorAngle = -Math.PI / 2 + progressRef.current * TAU;
    const outerRadius = maxRadius * scale + (isMobileRef.current ? 18 : 24);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, topPadding - 16);
    ctx.lineTo(cx, h - bottomPadding + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sidePadding - 12, cy);
    ctx.lineTo(w - sidePadding + 12, cy);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, TAU);
    ctx.stroke();
    ctx.restore();

    if (currentStudy.playing) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(cursorAngle) * (outerRadius + 12),
        cy + Math.sin(cursorAngle) * (outerRadius + 12),
      );
      ctx.stroke();
      ctx.restore();
    }

    currentStudy.layers
      .slice()
      .sort((layerA, layerB) => layerB.radius - layerA.radius)
      .forEach((layer) => {
        const points = getLayerStepPoints(layer, cx, cy, scale);
        const activePoints = points.filter((point) => point.active);
        const playbackStepIndex = getPlaybackStepIndex(layer, progressRef.current);

        ctx.save();
        ctx.strokeStyle = `${layer.color}30`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, layer.radius * scale, 0, TAU);
        ctx.stroke();
        ctx.restore();

        if (activePoints.length >= 2) {
          ctx.save();
          ctx.globalAlpha = activePoints.length >= 3 ? 0.88 : 0.74;
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = activePoints.length >= 3 ? 1.5 : 1.15;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(activePoints[0].x, activePoints[0].y);
          for (let index = 1; index < activePoints.length; index += 1) {
            ctx.lineTo(activePoints[index].x, activePoints[index].y);
          }
          if (activePoints.length >= 3) {
            ctx.closePath();
          }
          ctx.stroke();
          ctx.restore();
        }

        points.forEach((point) => {
          if (!currentStudy.showInactiveSteps && !point.active) {
            return;
          }

          const isPlaybackStep = point.index === playbackStepIndex;
          const isActivePlaybackStep = point.active && isPlaybackStep && currentStudy.playing;
          const pointRadius = point.active
            ? isActivePlaybackStep
              ? 6
              : 4.4
            : isPlaybackStep && currentStudy.playing
              ? 3.6
              : 2.3;

          ctx.save();
          if (point.active) {
            ctx.fillStyle = layer.color;
            ctx.globalAlpha = isActivePlaybackStep ? 1 : 0.9;
            ctx.shadowBlur = isActivePlaybackStep ? 14 : 8;
            ctx.shadowColor = layer.color;
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.globalAlpha = isPlaybackStep && currentStudy.playing ? 0.42 : 0.26;
          }
          ctx.beginPath();
          ctx.arc(point.x, point.y, pointRadius, 0, TAU);
          ctx.fill();
          ctx.restore();

          if (currentStudy.showStepLabels && layer.beatCount <= 20) {
            const labelRadius = layer.radius * scale + 14;
            ctx.save();
            ctx.fillStyle = point.active ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.28)';
            ctx.font = '10px "SF Mono", "Fira Code", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              String(point.index + 1),
              cx + Math.cos(point.angle) * labelRadius,
              cy + Math.sin(point.angle) * labelRadius,
            );
            ctx.restore();
          }
        });

        const activeIndices = getActiveStepIndices(layer);
        if (activeIndices.length > 0) {
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.58)';
          ctx.font = '11px "SF Mono", "Fira Code", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(
            `${activeIndices.length}/${layer.beatCount}`,
            cx - layer.radius * scale,
            cy - layer.radius * scale - 10,
          );
          ctx.restore();
        }
      });
  }, []);

  useEffect(() => {
    let frame = 0;

    const render = (timestamp: number) => {
      const currentStudy = studyRef.current;

      if (currentStudy.playing) {
        if (lastTimestampRef.current == null) {
          lastTimestampRef.current = timestamp;
        } else {
          const deltaSeconds = Math.min(
            0.05,
            (timestamp - lastTimestampRef.current) / 1000,
          );
          const cyclesPerSecond = currentStudy.bpm / 60 / 4;
          progressRef.current =
            (progressRef.current + deltaSeconds * cyclesPerSecond) % 1;
          lastTimestampRef.current = timestamp;
        }
      } else {
        lastTimestampRef.current = timestamp;
      }

      draw();
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw, study]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'absolute inset-0 h-full w-full'}
    />
  );
}
