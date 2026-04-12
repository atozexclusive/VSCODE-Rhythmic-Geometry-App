import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
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

interface PolyrhythmPlaybackState {
  progress: number;
  lastTimestamp: number | null;
  previousPlaybackSteps: Map<string, number>;
  wasPlaying: boolean;
}

interface PolyrhythmCanvasProps {
  study: PolyrhythmStudy;
  restartToken?: number;
  selectedLayerId: string | null;
  selectedStep: PolyrhythmCanvasSelection | null;
  externalCanvasRef?: MutableRefObject<HTMLCanvasElement | null>;
  playbackStateRef?: MutableRefObject<PolyrhythmPlaybackState>;
  playbackDriver?: boolean;
  displayLayerId?: string | null;
  soloLayerDisplay?: boolean;
  onSelectLayer: (layerId: string) => void;
  onSelectStep: (selection: PolyrhythmCanvasSelection | null) => void;
  onToggleStep: (layerId: string, stepIndex: number) => void;
  onClearSelection: () => void;
  className?: string;
}

export default function PolyrhythmCanvas({
  study,
  restartToken = 0,
  selectedLayerId,
  selectedStep,
  externalCanvasRef,
  playbackStateRef,
  playbackDriver = true,
  displayLayerId = null,
  soloLayerDisplay = false,
  onSelectLayer,
  onSelectStep,
  onToggleStep,
  onClearSelection,
  className,
}: PolyrhythmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const studyRef = useRef(study);
  const localPlaybackStateRef = useRef<PolyrhythmPlaybackState>({
    progress: 0,
    lastTimestamp: null,
    previousPlaybackSteps: new Map(),
    wasPlaying: study.playing,
  });
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  const selectedLayerIdRef = useRef(selectedLayerId);
  const selectedStepRef = useRef(selectedStep);
  const displayLayerIdRef = useRef(displayLayerId);
  const soloLayerDisplayRef = useRef(soloLayerDisplay);
  const playbackStateHandleRef = useRef(playbackStateRef ?? localPlaybackStateRef);
  const playbackDriverRef = useRef(playbackDriver);

  studyRef.current = study;
  isMobileRef.current = isMobile;
  selectedLayerIdRef.current = selectedLayerId;
  selectedStepRef.current = selectedStep;
  displayLayerIdRef.current = displayLayerId;
  soloLayerDisplayRef.current = soloLayerDisplay;
  playbackStateHandleRef.current = playbackStateRef ?? localPlaybackStateRef;
  playbackDriverRef.current = playbackDriver;

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
    const displayStudy =
      soloLayerDisplayRef.current && displayLayerIdRef.current
        ? {
            ...currentStudy,
            layers: currentStudy.layers.filter((layer) => layer.id === displayLayerIdRef.current),
          }
        : currentStudy;
    const metrics = getPolyrhythmCanvasMetrics(
      displayStudy,
      rect.width,
      rect.height,
      isMobileRef.current,
    );
    const playbackState = playbackStateHandleRef.current.current;
    const cursorAngle = -Math.PI / 2 + playbackState.progress * TAU;
    const currentSelectedLayerId = selectedLayerIdRef.current;
    const currentSelectedStep = selectedStepRef.current;
    const sharedDisplay = displayStudy.displayStyle === 'shared' && !soloLayerDisplayRef.current;
    const sharedCycleRadius =
      Math.max(1, ...displayStudy.layers.map((layer) => layer.radius)) * metrics.scale;
    const orderedLayers = displayStudy.layers
      .slice()
      .sort((layerA, layerB) => {
        if (layerA.id === currentSelectedLayerId) {
          return 1;
        }
        if (layerB.id === currentSelectedLayerId) {
          return -1;
        }
        return layerB.radius - layerA.radius;
      });

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
    ctx.strokeStyle = sharedDisplay ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = sharedDisplay ? 1.3 : 1;
    ctx.beginPath();
    ctx.arc(
      metrics.centerX,
      metrics.centerY,
      sharedDisplay ? sharedCycleRadius : metrics.outerRadius,
      0,
      TAU,
    );
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

    orderedLayers.forEach((layer) => {
        const points = getLayerStepPoints(
          layer,
          metrics.centerX,
          metrics.centerY,
          metrics.scale,
        );
        const activePoints = points.filter((point) => point.active);
        const playbackStepIndex = getPlaybackStepIndex(layer, playbackState.progress);
        const isSelectedLayer = layer.id === currentSelectedLayerId;
        const showLayerRing = !sharedDisplay || isSelectedLayer;

        if (showLayerRing) {
          ctx.save();
          ctx.strokeStyle = isSelectedLayer
            ? `${layer.color}78`
            : sharedDisplay
              ? `${layer.color}14`
              : `${layer.color}18`;
          ctx.lineWidth = isSelectedLayer ? 2.1 : sharedDisplay ? 0.95 : 1.05;
          if (isSelectedLayer) {
            ctx.shadowBlur = soloLayerDisplayRef.current ? 18 : 10;
            ctx.shadowColor = layer.color;
          }
          ctx.beginPath();
          ctx.arc(metrics.centerX, metrics.centerY, layer.radius * metrics.scale, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }

        if (activePoints.length >= 2) {
          ctx.save();
          ctx.globalAlpha = isSelectedLayer ? 0.16 : sharedDisplay ? 0.09 : 0.05;
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
          ctx.globalAlpha = isSelectedLayer ? 0.98 : sharedDisplay ? 0.84 : 0.72;
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = activePoints.length >= 3 ? (isSelectedLayer ? 2.3 : 1.35) : 1.2;
          ctx.lineJoin = 'round';
          ctx.shadowBlur = isSelectedLayer ? 16 : sharedDisplay ? 9 : 7;
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
              ? soloLayerDisplayRef.current ? 9.2 : 8.2
              : isActivePlaybackStep
                ? soloLayerDisplayRef.current ? 6.8 : 6
                : soloLayerDisplayRef.current ? 5.2 : 4.5
            : isSelectedStep
              ? soloLayerDisplayRef.current ? 6.8 : 6
              : isPlaybackStep && currentStudy.playing
                ? soloLayerDisplayRef.current ? 4.4 : 3.8
                : soloLayerDisplayRef.current ? 2.8 : 2.4;

          if (isSelectedStep) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.78)';
            ctx.lineWidth = 1.6;
            ctx.shadowBlur = 10;
            ctx.shadowColor = layer.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 4, 0, TAU);
            ctx.stroke();
            ctx.restore();
          }

          ctx.save();
          if (point.active) {
            ctx.fillStyle = layer.color;
            ctx.globalAlpha = isSelectedStep ? 1 : isActivePlaybackStep ? 1 : sharedDisplay ? 0.94 : 0.88;
            ctx.shadowBlur = isSelectedStep ? 16 : isActivePlaybackStep ? 14 : sharedDisplay ? 10 : 8;
            ctx.shadowColor = layer.color;
          } else {
            ctx.fillStyle = isSelectedStep
              ? 'rgba(255,255,255,0.66)'
              : 'rgba(255,255,255,0.2)';
            ctx.globalAlpha = isPlaybackStep && currentStudy.playing ? 0.36 : 0.18;
          }
          ctx.beginPath();
          ctx.arc(point.x, point.y, pointRadius, 0, TAU);
          ctx.fill();
          ctx.restore();

          if (
            currentStudy.showStepLabels &&
            layer.beatCount <= 20 &&
            (soloLayerDisplayRef.current || displayStudy.layers.length === 1)
          ) {
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
        if (soloLayerDisplayRef.current && isSelectedLayer && activeIndices.length > 0) {
          ctx.save();
          ctx.fillStyle = isSelectedLayer ? layer.color : 'rgba(255,255,255,0.42)';
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
      const playbackState = playbackStateHandleRef.current.current;

      if (playbackDriverRef.current && currentStudy.playing) {
        if (playbackState.lastTimestamp == null) {
          playbackState.lastTimestamp = timestamp;
        } else {
          const deltaSeconds = Math.min(
            0.05,
            (timestamp - playbackState.lastTimestamp) / 1000,
          );
          const cyclesPerSecond = currentStudy.bpm / 60 / 4;
          playbackState.progress =
            (playbackState.progress + deltaSeconds * cyclesPerSecond) % 1;
          playbackState.lastTimestamp = timestamp;
        }

        currentStudy.layers.forEach((layer, layerIndex) => {
          const currentStepIndex = getPlaybackStepIndex(layer, playbackState.progress);
          const previousStepIndex = playbackState.previousPlaybackSteps.get(layer.id);
          playbackState.previousPlaybackSteps.set(layer.id, currentStepIndex);

          if (
            previousStepIndex !== currentStepIndex &&
            currentStudy.soundEnabled &&
            layer.soundEnabled &&
            layer.activeSteps[currentStepIndex]
          ) {
            triggerPolyrhythmPulse({
              frequency: layer.pitchHz,
              gain: layer.gain,
              sound: currentStudy.soundSettings,
              layerIndex,
              beatCount: layer.beatCount,
            });
          }
        });
      } else if (playbackDriverRef.current) {
        playbackState.lastTimestamp = timestamp;
        currentStudy.layers.forEach((layer) => {
          playbackState.previousPlaybackSteps.set(
            layer.id,
            getPlaybackStepIndex(layer, playbackState.progress),
          );
        });
      }

      if (playbackDriverRef.current && currentStudy.playing && !playbackState.wasPlaying) {
        playbackState.previousPlaybackSteps.clear();
        playbackState.lastTimestamp = timestamp;
      }
      playbackState.wasPlaying = currentStudy.playing;

      draw();
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [draw]);

  useEffect(() => {
    playbackStateHandleRef.current.current.previousPlaybackSteps.clear();
    draw();
  }, [draw, study]);

  useEffect(() => {
    const playbackState = playbackStateHandleRef.current.current;
    playbackState.progress = 0;
    playbackState.previousPlaybackSteps.clear();
    playbackState.lastTimestamp = null;
    playbackState.wasPlaying = studyRef.current.playing;
    draw();
  }, [draw, restartToken]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    (canvas as any).__exportPng = async ({
      aspect = 'landscape',
      scale = 2,
    }: {
      aspect?: 'landscape' | 'square' | 'portrait' | 'story';
      scale?: 1 | 2 | 4;
    } = {}) => {
      const exportAspects = {
        landscape: { width: 1920, height: 1080 },
        square: { width: 1080, height: 1080 },
        portrait: { width: 1080, height: 1350 },
        story: { width: 1080, height: 1920 },
      } as const;
      const exportSpec = exportAspects[aspect];
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportSpec.width * scale;
      exportCanvas.height = exportSpec.height * scale;
      const exportCtx = exportCanvas.getContext('2d');

      if (!exportCtx) {
        return;
      }

      exportCtx.fillStyle = '#111116';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      const sourceWidth = canvas.width;
      const sourceHeight = canvas.height;
      const containScale = Math.min(
        exportCanvas.width / sourceWidth,
        exportCanvas.height / sourceHeight,
      );
      const drawWidth = sourceWidth * containScale;
      const drawHeight = sourceHeight * containScale;
      const offsetX = (exportCanvas.width - drawWidth) / 2;
      const offsetY = (exportCanvas.height - drawHeight) / 2;

      exportCtx.imageSmoothingEnabled = true;
      exportCtx.imageSmoothingQuality = 'high';
      exportCtx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const link = document.createElement('a');
      link.href = exportCanvas.toDataURL('image/png');
      link.download = `polyrhythm-study-${aspect}-${scale}x-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return () => {
      delete (canvas as any).__exportPng;
    };
  }, []);

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
        soloLayerDisplayRef.current && displayLayerIdRef.current
          ? {
              ...studyRef.current,
              layers: studyRef.current.layers.filter((layer) => layer.id === displayLayerIdRef.current),
            }
          : studyRef.current,
        getPolyrhythmCanvasMetrics(
          soloLayerDisplayRef.current && displayLayerIdRef.current
            ? {
                ...studyRef.current,
                layers: studyRef.current.layers.filter((layer) => layer.id === displayLayerIdRef.current),
              }
            : studyRef.current,
          rect.width,
          rect.height,
          isMobileRef.current,
        ),
        x,
        y,
        selectedLayerIdRef.current,
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
      ref={(node) => {
        canvasRef.current = node;
        if (externalCanvasRef) {
          externalCanvasRef.current = node;
        }
      }}
      onPointerDown={handlePointerDown}
      className={className ?? 'absolute inset-0 h-full w-full'}
    />
  );
}
