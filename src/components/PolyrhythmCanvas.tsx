import { useCallback, useEffect, useRef } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { triggerPolyrhythmPulse } from '../lib/polyrhythmAudio';
import {
  findPolyrhythmHit,
  getPolyrhythmCanvasMetrics,
} from '../lib/polyrhythmLayout';
import {
  countActiveSteps,
  getActiveStepIndices,
  getLayerStepPoints,
  getPlaybackStepIndex,
  type PolyrhythmStudy,
} from '../lib/polyrhythmStudy';

const TAU = Math.PI * 2;

interface PolyrhythmCanvasSelection {
  layerId: string;
  stepIndex: number;
}

interface PolyrhythmCanvasProps {
  study: PolyrhythmStudy;
  selectedLayerId: string | null;
  selectedStep: PolyrhythmCanvasSelection | null;
  onSelectLayer: (layerId: string) => void;
  onSelectStep: (selection: PolyrhythmCanvasSelection | null) => void;
  onToggleStep: (layerId: string, stepIndex: number) => void;
  onClearSelection: () => void;
  className?: string;
}

export default function PolyrhythmCanvas({
  study,
  selectedLayerId,
  selectedStep,
  onSelectLayer,
  onSelectStep,
  onToggleStep,
  onClearSelection,
  className,
}: PolyrhythmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const studyRef = useRef(study);
  const progressRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const previousPlaybackStepsRef = useRef<Map<string, number>>(new Map());
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  const selectedLayerIdRef = useRef(selectedLayerId);
  const selectedStepRef = useRef(selectedStep);

  studyRef.current = study;
  isMobileRef.current = isMobile;
  selectedLayerIdRef.current = selectedLayerId;
  selectedStepRef.current = selectedStep;

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
    const metrics = getPolyrhythmCanvasMetrics(
      currentStudy,
      rect.width,
      rect.height,
      isMobileRef.current,
    );
    const cursorAngle = -Math.PI / 2 + progressRef.current * TAU;
    const currentSelectedLayerId = selectedLayerIdRef.current;
    const currentSelectedStep = selectedStepRef.current;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(metrics.centerX, metrics.topPadding - 16);
    ctx.lineTo(metrics.centerX, metrics.height - metrics.bottomPadding + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(metrics.sidePadding - 12, metrics.centerY);
    ctx.lineTo(metrics.width - metrics.sidePadding + 12, metrics.centerY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(metrics.centerX, metrics.centerY, metrics.outerRadius, 0, TAU);
    ctx.stroke();
    ctx.restore();

    if (currentStudy.playing) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(metrics.centerX, metrics.centerY);
      ctx.lineTo(
        metrics.centerX + Math.cos(cursorAngle) * (metrics.outerRadius + 12),
        metrics.centerY + Math.sin(cursorAngle) * (metrics.outerRadius + 12),
      );
      ctx.stroke();
      ctx.restore();
    }

    currentStudy.layers
      .slice()
      .sort((layerA, layerB) => layerB.radius - layerA.radius)
      .forEach((layer) => {
        const points = getLayerStepPoints(
          layer,
          metrics.centerX,
          metrics.centerY,
          metrics.scale,
        );
        const activePoints = points.filter((point) => point.active);
        const playbackStepIndex = getPlaybackStepIndex(layer, progressRef.current);
        const isSelectedLayer = layer.id === currentSelectedLayerId;

        ctx.save();
        ctx.strokeStyle = isSelectedLayer ? `${layer.color}6A` : `${layer.color}24`;
        ctx.lineWidth = isSelectedLayer ? 1.7 : 1;
        ctx.beginPath();
        ctx.arc(metrics.centerX, metrics.centerY, layer.radius * metrics.scale, 0, TAU);
        ctx.stroke();
        ctx.restore();

        if (activePoints.length >= 2) {
          ctx.save();
          ctx.globalAlpha = isSelectedLayer ? 0.18 : 0.08;
          ctx.fillStyle = layer.color;
          ctx.beginPath();
          ctx.moveTo(activePoints[0].x, activePoints[0].y);
          for (let index = 1; index < activePoints.length; index += 1) {
            ctx.lineTo(activePoints[index].x, activePoints[index].y);
          }
          if (activePoints.length >= 3) {
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = isSelectedLayer ? 0.96 : 0.82;
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = activePoints.length >= 3 ? (isSelectedLayer ? 2.2 : 1.6) : 1.2;
          ctx.lineJoin = 'round';
          ctx.shadowBlur = isSelectedLayer ? 14 : 9;
          ctx.shadowColor = layer.color;
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
          const isActivePlaybackStep =
            point.active && isPlaybackStep && currentStudy.playing;
          const isSelectedStep =
            currentSelectedStep?.layerId === layer.id &&
            currentSelectedStep.stepIndex === point.index;
          const pointRadius = point.active
            ? isSelectedStep
              ? 8.2
              : isActivePlaybackStep
                ? 6
                : 4.5
            : isSelectedStep
              ? 6
              : isPlaybackStep && currentStudy.playing
                ? 3.8
                : 2.4;

          if (isSelectedStep) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.78)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 4, 0, TAU);
            ctx.stroke();
            ctx.restore();
          }

          ctx.save();
          if (point.active) {
            ctx.fillStyle = layer.color;
            ctx.globalAlpha = isSelectedStep ? 1 : isActivePlaybackStep ? 1 : 0.88;
            ctx.shadowBlur = isSelectedStep ? 16 : isActivePlaybackStep ? 14 : 8;
            ctx.shadowColor = layer.color;
          } else {
            ctx.fillStyle = isSelectedStep
              ? 'rgba(255,255,255,0.66)'
              : 'rgba(255,255,255,0.2)';
            ctx.globalAlpha = isPlaybackStep && currentStudy.playing ? 0.42 : 0.28;
          }
          ctx.beginPath();
          ctx.arc(point.x, point.y, pointRadius, 0, TAU);
          ctx.fill();
          ctx.restore();

          if (currentStudy.showStepLabels && layer.beatCount <= 20) {
            const labelRadius = layer.radius * metrics.scale + 14;
            ctx.save();
            ctx.fillStyle = isSelectedStep
              ? 'rgba(255,255,255,0.88)'
              : point.active
                ? 'rgba(255,255,255,0.72)'
                : 'rgba(255,255,255,0.28)';
            ctx.font = '10px "SF Mono", "Fira Code", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              String(point.index + 1),
              metrics.centerX + Math.cos(point.angle) * labelRadius,
              metrics.centerY + Math.sin(point.angle) * labelRadius,
            );
            ctx.restore();
          }
        });

        const activeIndices = getActiveStepIndices(layer);
        if (activeIndices.length > 0) {
          ctx.save();
          ctx.fillStyle = isSelectedLayer ? layer.color : 'rgba(255,255,255,0.52)';
          ctx.font = '11px "SF Mono", "Fira Code", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(
            `${countActiveSteps(layer)}/${layer.beatCount}`,
            metrics.centerX - layer.radius * metrics.scale,
            metrics.centerY - layer.radius * metrics.scale - 10,
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

        currentStudy.layers.forEach((layer) => {
          const currentStepIndex = getPlaybackStepIndex(layer, progressRef.current);
          const previousStepIndex = previousPlaybackStepsRef.current.get(layer.id);
          previousPlaybackStepsRef.current.set(layer.id, currentStepIndex);

          if (
            previousStepIndex !== undefined &&
            previousStepIndex !== currentStepIndex &&
            currentStudy.soundEnabled &&
            layer.soundEnabled &&
            layer.activeSteps[currentStepIndex]
          ) {
            triggerPolyrhythmPulse({
              frequency: layer.pitchHz,
              gain: layer.gain,
            });
          }
        });
      } else {
        lastTimestampRef.current = timestamp;
        currentStudy.layers.forEach((layer) => {
          previousPlaybackStepsRef.current.set(
            layer.id,
            getPlaybackStepIndex(layer, progressRef.current),
          );
        });
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
    previousPlaybackStepsRef.current.clear();
    draw();
  }, [draw, study]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = findPolyrhythmHit(
        studyRef.current,
        getPolyrhythmCanvasMetrics(
          studyRef.current,
          rect.width,
          rect.height,
          isMobileRef.current,
        ),
        x,
        y,
      );

      if (!hit) {
        onClearSelection();
        return;
      }

      onSelectLayer(hit.layerId);

      if (hit.stepIndex == null) {
        onSelectStep(null);
        return;
      }

      const isSameStep =
        selectedStepRef.current?.layerId === hit.layerId &&
        selectedStepRef.current.stepIndex === hit.stepIndex;

      if (isSameStep) {
        onToggleStep(hit.layerId, hit.stepIndex);
        return;
      }

      onSelectStep({
        layerId: hit.layerId,
        stepIndex: hit.stepIndex,
      });
    },
    [onClearSelection, onSelectLayer, onSelectStep, onToggleStep],
  );

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      className={className ?? 'absolute inset-0 h-full w-full'}
    />
  );
}
