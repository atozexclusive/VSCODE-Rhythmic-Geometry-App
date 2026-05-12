import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { createPolyrhythmExportAudioStream, triggerPolyrhythmPulse } from '../lib/polyrhythmAudio';
import {
  DEFAULT_CANVAS_DISPLAY_SETTINGS,
  drawCanvasDisplayBackground,
  getCanvasGlowMultiplier,
  getCanvasInactiveAlpha,
  getCanvasLineAlpha,
  type CanvasDisplaySettings,
} from '../lib/canvasDisplayThemes';
import {
  findPolyrhythmHit,
  getPolyrhythmCanvasMetrics,
} from '../lib/polyrhythmLayout';
import {
  countActiveSteps,
  getActiveStepIndices,
  getLayerStepPoints,
  getPlaybackStepIndex,
  getSharedCycleStepCount,
  type PolyrhythmStudy,
} from '../lib/polyrhythmStudy';
import {
  addAudioToCanvasStream,
  CANVAS_EXPORT_PREROLL_SECONDS,
  CANVAS_RECORDING_FRAME_RATE,
  CANVAS_RECORDING_VIDEO_BITS_PER_SECOND,
  getCanvasRecordingFormat,
  prepareCanvasRecordingDownload,
  recordMediaRecorderForDuration,
  SHORTS_EXPORT_POINT_SCALE,
  VIDEO_EXPORT_SIZES,
  type VideoExportAspect,
  type VideoExportDuration,
} from '../lib/videoExport';

const TAU = Math.PI * 2;
const HIT_PULSE_DURATION_MS = 360;

function getPolyrhythmLabelStride(beatCount: number): number {
  if (beatCount <= 20) {
    return 1;
  }
  if (beatCount <= 32) {
    return 2;
  }
  if (beatCount <= 48) {
    return 3;
  }
  return 4;
}

function clampCanvasValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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

interface PolyrhythmHitPulse {
  layerId: string;
  stepIndex: number;
  startedAt: number;
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
  showReferenceLayers?: boolean;
  displaySettings?: CanvasDisplaySettings;
  presentationMode?: boolean;
  audioEnabled?: boolean;
  onSelectLayer: (layerId: string) => void;
  onOpenLayerMenu?: (layerId: string) => void;
  onSelectStep: (selection: PolyrhythmCanvasSelection | null) => void;
  onToggleStep: (layerId: string, stepIndex: number) => void;
  onToggleStepAccent?: (layerId: string, stepIndex: number) => void;
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
  showReferenceLayers = false,
  displaySettings = DEFAULT_CANVAS_DISPLAY_SETTINGS,
  presentationMode = false,
  audioEnabled = true,
  onSelectLayer,
  onOpenLayerMenu,
  onSelectStep,
  onToggleStep,
  onToggleStepAccent,
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
  const hoveredLayerIdRef = useRef<string | null>(null);
  const hoveredStepRef = useRef<PolyrhythmCanvasSelection | null>(null);
  const displayLayerIdRef = useRef(displayLayerId);
  const soloLayerDisplayRef = useRef(soloLayerDisplay);
  const showReferenceLayersRef = useRef(showReferenceLayers);
  const displaySettingsRef = useRef(displaySettings);
  const audioEnabledRef = useRef(audioEnabled);
  const presentationModeRef = useRef(presentationMode);
  const playbackStateHandleRef = useRef(playbackStateRef ?? localPlaybackStateRef);
  const playbackDriverRef = useRef(playbackDriver);
  const exportVideoSizeRef = useRef<{ width: number; height: number } | null>(null);
  const hitPulsesRef = useRef<PolyrhythmHitPulse[]>([]);
  const animationTimestampRef = useRef(0);
  const pointerStepHitRef = useRef<{
    layerId: string;
    stepIndex: number;
    sameStep: boolean;
    shiftAccent: boolean;
  } | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  studyRef.current = study;
  isMobileRef.current = isMobile;
  selectedLayerIdRef.current = selectedLayerId;
  selectedStepRef.current = selectedStep;
  displayLayerIdRef.current = displayLayerId;
  soloLayerDisplayRef.current = soloLayerDisplay;
  showReferenceLayersRef.current = showReferenceLayers;
  displaySettingsRef.current = displaySettings;
  audioEnabledRef.current = audioEnabled;
  presentationModeRef.current = presentationMode;
  playbackStateHandleRef.current = playbackStateRef ?? localPlaybackStateRef;
  playbackDriverRef.current = playbackDriver;

  const clearLongPress = useCallback(() => {
    if (longPressTimeoutRef.current != null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const exportVideoSize = exportVideoSizeRef.current;
    const rect = exportVideoSize ?? canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const dpr = exportVideoSize ? 1 : window.devicePixelRatio || 1;
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
    const currentStudy = studyRef.current;
    const pointScale = exportVideoSizeRef.current ? SHORTS_EXPORT_POINT_SCALE : 1;
    const currentDisplaySettings = displaySettingsRef.current;
    const lineAlpha = getCanvasLineAlpha(currentDisplaySettings);
    const inactiveAlpha = getCanvasInactiveAlpha(currentDisplaySettings);
    const glowMultiplier = getCanvasGlowMultiplier(
      currentDisplaySettings,
      presentationModeRef.current,
    );

    ctx.clearRect(0, 0, rect.width, rect.height);
    drawCanvasDisplayBackground(ctx, rect.width, rect.height, currentDisplaySettings, {
      presentationMode: presentationModeRef.current || soloLayerDisplayRef.current,
      seed: 31,
    });

    const focusedLayerStudy =
      soloLayerDisplayRef.current && displayLayerIdRef.current
        ? {
            ...currentStudy,
            layers: currentStudy.layers.filter((layer) => layer.id === displayLayerIdRef.current),
          }
        : currentStudy;
    const displayStudy =
      soloLayerDisplayRef.current &&
      displayLayerIdRef.current &&
      showReferenceLayersRef.current
        ? currentStudy
        : focusedLayerStudy;
    const metrics = getPolyrhythmCanvasMetrics(
      focusedLayerStudy,
      rect.width,
      rect.height,
      isMobileRef.current,
    );
    const playbackState = playbackStateHandleRef.current.current;
    const animationTimestamp = animationTimestampRef.current;
    const cursorAngle = -Math.PI / 2 + playbackState.progress * TAU;
    const currentSelectedLayerId = selectedLayerIdRef.current;
    const currentSelectedStep = selectedStepRef.current;
    const currentHoveredLayerId = isMobileRef.current ? null : hoveredLayerIdRef.current;
    const currentHoveredStep = isMobileRef.current ? null : hoveredStepRef.current;
    const sharedDisplay = displayStudy.displayStyle === 'shared' && !soloLayerDisplayRef.current;
    const sharedCycleRadius =
      Math.max(1, ...displayStudy.layers.map((layer) => layer.radius)) * metrics.scale;
    const sharedCycleStepCount = getSharedCycleStepCount(displayStudy.layers);
    const orderedLayers = displayStudy.layers
      .slice()
      .sort((layerA, layerB) => {
        if (layerA.id === currentSelectedLayerId) {
          return 1;
        }
        if (layerB.id === currentSelectedLayerId) {
          return -1;
        }
        if (layerA.id === currentHoveredLayerId) {
          return 1;
        }
        if (layerB.id === currentHoveredLayerId) {
          return -1;
        }
        return layerB.radius - layerA.radius;
      });

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.04 * lineAlpha})`;
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
    ctx.strokeStyle = sharedDisplay
      ? `rgba(255,255,255,${0.16 * lineAlpha})`
      : `rgba(255,255,255,${0.08 * lineAlpha})`;
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

    if (
      sharedDisplay &&
      displayStudy.layers.length > 1 &&
      sharedCycleStepCount <= 192 &&
      sharedCycleStepCount > Math.max(1, ...displayStudy.layers.map((layer) => layer.beatCount)) &&
      (currentStudy.showInactiveSteps || currentStudy.showStepLabels)
    ) {
      const gridRadius = sharedCycleRadius + (isMobileRef.current ? 13 : 18);
      ctx.save();
      for (let index = 0; index < sharedCycleStepCount; index += 1) {
        const angle = -Math.PI / 2 + (index / sharedCycleStepCount) * TAU;
        const x = metrics.centerX + Math.cos(angle) * gridRadius;
        const y = metrics.centerY + Math.sin(angle) * gridRadius;
        const onLayerBoundary = displayStudy.layers.some(
          (layer) => index % Math.max(1, sharedCycleStepCount / layer.beatCount) === 0,
        );
        const pointRadius = onLayerBoundary ? 2.05 : 1.35;
        ctx.globalAlpha = (onLayerBoundary ? 0.34 : 0.18) * inactiveAlpha;
        ctx.fillStyle = onLayerBoundary ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.72)';
        ctx.beginPath();
        ctx.arc(x, y, pointRadius, 0, TAU);
        ctx.fill();

        if (currentStudy.showStepLabels) {
          const denseGrid = sharedCycleStepCount > 48;
          const labelRadius = gridRadius + (denseGrid ? 9 : 13);
          const labelX = metrics.centerX + Math.cos(angle) * labelRadius;
          const labelY = metrics.centerY + Math.sin(angle) * labelRadius;
          ctx.globalAlpha = onLayerBoundary ? 0.42 : 0.24;
          ctx.font = `${denseGrid ? 7 : 9}px "SF Mono", "Fira Code", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            String(index + 1),
            clampCanvasValue(labelX, 10, metrics.width - 10),
            clampCanvasValue(labelY, 10, metrics.height - 10),
          );
        }
      }
      ctx.restore();
    }

    if (currentStudy.playing) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${0.14 * lineAlpha})`;
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
        const smoothLayerAngle = -Math.PI / 2 + playbackState.progress * TAU;
        const smoothLayerX =
          metrics.centerX + Math.cos(smoothLayerAngle) * layer.radius * metrics.scale;
        const smoothLayerY =
          metrics.centerY + Math.sin(smoothLayerAngle) * layer.radius * metrics.scale;
        const isSelectedLayer = layer.id === currentSelectedLayerId;
        const isHoveredLayer = !isSelectedLayer && layer.id === currentHoveredLayerId;
        const isReferenceLayer =
          soloLayerDisplayRef.current &&
          showReferenceLayersRef.current &&
          displayLayerIdRef.current != null &&
          layer.id !== displayLayerIdRef.current;
        const showLayerRing = !sharedDisplay || isSelectedLayer;

        if (showLayerRing) {
          ctx.save();
          ctx.strokeStyle = isReferenceLayer
            ? `${layer.color}20`
            : isSelectedLayer
              ? `${layer.color}78`
              : isHoveredLayer
                ? `${layer.color}56`
              : sharedDisplay
                ? `${layer.color}14`
                : `${layer.color}18`;
          ctx.lineWidth = isReferenceLayer
            ? 0.95
            : isSelectedLayer
              ? 2.1
              : isHoveredLayer
                ? 1.75
                : sharedDisplay
                  ? 0.95
                  : 1.05;
          if ((isSelectedLayer || isHoveredLayer) && !isReferenceLayer) {
            ctx.shadowBlur = (isSelectedLayer ? (soloLayerDisplayRef.current ? 18 : 10) : 12) * glowMultiplier;
            ctx.shadowColor = layer.color;
          }
          ctx.beginPath();
          ctx.arc(metrics.centerX, metrics.centerY, layer.radius * metrics.scale, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }

        if (activePoints.length >= 2) {
          if (!isReferenceLayer) {
            ctx.save();
            ctx.globalAlpha = (isSelectedLayer ? 0.16 : sharedDisplay ? 0.09 : 0.05) * lineAlpha;
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
          }

          ctx.save();
          ctx.globalAlpha = isReferenceLayer
            ? 0.22
            : isSelectedLayer
              ? 0.98
              : isHoveredLayer
                ? 0.92
                : sharedDisplay
                  ? 0.84
                  : 0.72;
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = isReferenceLayer
            ? 1
            : activePoints.length >= 3
              ? isSelectedLayer
                ? 2.3
                : isHoveredLayer
                  ? 1.9
                  : 1.35
              : isHoveredLayer
                ? 1.45
                : 1.2;
          ctx.lineJoin = 'round';
          ctx.shadowBlur = isReferenceLayer
            ? 0
            : (isSelectedLayer ? 16 : isHoveredLayer ? 12 : sharedDisplay ? 9 : 7) * glowMultiplier;
          ctx.shadowColor = isReferenceLayer ? 'transparent' : layer.color;
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
          if (isReferenceLayer && !point.active) {
            return;
          }
          const showSharedGhostStepsForLayer =
            !sharedDisplay || soloLayerDisplayRef.current || isSelectedLayer;
          if (
            !point.active &&
            (!currentStudy.showInactiveSteps || !showSharedGhostStepsForLayer)
          ) {
            return;
          }

          const accented = point.accented;
          const isSelectedStep =
            currentSelectedStep?.layerId === layer.id &&
            currentSelectedStep.stepIndex === point.index;
          const isHoveredStep =
            !isSelectedStep &&
            currentHoveredStep?.layerId === layer.id &&
            currentHoveredStep.stepIndex === point.index;
          const pulse = hitPulsesRef.current.find(
            (hitPulse) => hitPulse.layerId === layer.id && hitPulse.stepIndex === point.index,
          );
          const pulseProgress =
            pulse && animationTimestamp > 0
              ? Math.min(1, Math.max(0, (animationTimestamp - pulse.startedAt) / HIT_PULSE_DURATION_MS))
              : 1;
          const pulseStrength = pulse ? 1 - pulseProgress : 0;
          const denseLayer = layer.beatCount > 24;
          const hitRadiusBoost = point.active && !isReferenceLayer ? pulseStrength * 2.15 * pointScale : 0;
          const hitGlowBoost = point.active && !isReferenceLayer ? pulseStrength * 12 * pointScale : 0;
          const pointRadius = (isReferenceLayer
            ? 2.6
            : point.active
            ? isSelectedStep
              ? soloLayerDisplayRef.current ? (accented ? 10.1 : 9.2) : (accented ? 9 : 8.2)
              : isHoveredStep
                ? soloLayerDisplayRef.current ? (accented ? 8.8 : 8) : (accented ? 7.6 : 6.9)
              : isHoveredLayer
                ? soloLayerDisplayRef.current ? (accented ? 6.8 : 6.1) : (accented ? 6.1 : 5.4)
                : soloLayerDisplayRef.current ? (accented ? 5.9 : 5.2) : (accented ? 5.1 : 4.5)
            : isSelectedStep
              ? soloLayerDisplayRef.current ? 6.8 : 6
              : isHoveredStep
                ? soloLayerDisplayRef.current ? 6 : 5.4
              : isHoveredLayer
                ? soloLayerDisplayRef.current ? 4.1 : 3.6
                : denseLayer
                  ? soloLayerDisplayRef.current ? 3.6 : 3.2
                  : soloLayerDisplayRef.current ? 2.8 : 2.4) * pointScale;

          if (isHoveredStep && !isReferenceLayer) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1.7 * pointScale;
            ctx.shadowBlur = 14 * glowMultiplier * pointScale;
            ctx.shadowColor = layer.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 5.4 * pointScale, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = layer.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 8.5 * pointScale, 0, TAU);
            ctx.fill();
            ctx.restore();
          }

          if (isSelectedStep) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.78)';
            ctx.lineWidth = 1.6 * pointScale;
            ctx.shadowBlur = 10 * glowMultiplier * pointScale;
            ctx.shadowColor = layer.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 4 * pointScale, 0, TAU);
            ctx.stroke();
            ctx.restore();
          }

          if (point.active && pulseStrength > 0 && !isReferenceLayer) {
            const easedPulse = pulseStrength * pulseStrength;
            ctx.save();
            ctx.globalAlpha = (0.18 * easedPulse) * lineAlpha;
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = (0.9 + 0.9 * easedPulse) * pointScale;
            ctx.shadowBlur = (8 + 6 * easedPulse) * glowMultiplier * pointScale;
            ctx.shadowColor = layer.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 3 * pointScale + (1 - easedPulse) * 8 * pointScale + hitRadiusBoost, 0, TAU);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 0.07 * easedPulse;
            ctx.fillStyle = layer.color;
            ctx.shadowBlur = (8 * pointScale + hitGlowBoost) * glowMultiplier;
            ctx.shadowColor = layer.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 5 * pointScale + (1 - easedPulse) * 4 * pointScale + hitRadiusBoost, 0, TAU);
            ctx.fill();
            ctx.restore();
          }

          ctx.save();
          if (point.active) {
            ctx.fillStyle = layer.color;
            ctx.globalAlpha = isReferenceLayer
              ? 0.18
              : isSelectedStep
                ? 1
                : isHoveredStep
                  ? 1
                : isHoveredLayer
                    ? 0.98
                    : sharedDisplay
                      ? 0.94
                    : 0.88;
            ctx.shadowBlur = isReferenceLayer
              ? 0
              : (isSelectedStep ? 16 : isHoveredStep ? 16 : isHoveredLayer ? 12 : sharedDisplay ? 10 : 8) * glowMultiplier * pointScale + hitGlowBoost;
            ctx.shadowColor = isReferenceLayer ? 'transparent' : layer.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + hitRadiusBoost, 0, TAU);
            ctx.fill();
            if (accented && !isReferenceLayer) {
              ctx.strokeStyle = 'rgba(255,209,102,0.92)';
              ctx.lineWidth = (isSelectedStep ? 2 : 1.45) * pointScale;
              ctx.shadowBlur = (isSelectedStep ? 18 : 11) * glowMultiplier * pointScale;
              ctx.shadowColor = 'rgba(255,209,102,0.7)';
              ctx.beginPath();
              ctx.arc(point.x, point.y, pointRadius + 2.1 * pointScale, 0, TAU);
              ctx.stroke();
              ctx.fillStyle = 'rgba(255,209,102,0.96)';
              ctx.shadowBlur = 8 * glowMultiplier * pointScale;
              ctx.beginPath();
              ctx.arc(point.x, point.y, Math.max(1.5 * pointScale, pointRadius * 0.28), 0, TAU);
              ctx.fill();
            }
          } else {
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            const ghostFillAlpha = (
              isSelectedLayer
                ? denseLayer
                  ? 0.34
                  : 0.4
                : isHoveredStep
                  ? 0.36
                  : isHoveredLayer
                    ? 0.28
                  : denseLayer
                    ? 0.2
                    : 0.24
            ) * inactiveAlpha;
            const ghostStrokeAlpha = (
              isSelectedLayer
                ? denseLayer
                  ? 0.5
                  : 0.58
                : isHoveredStep
                  ? 0.62
                  : isHoveredLayer
                    ? 0.42
                  : denseLayer
                    ? 0.3
                    : 0.34
            ) * inactiveAlpha;
            ctx.fillStyle = isSelectedStep
              ? 'rgba(255,255,255,0.22)'
              : 'rgba(18,22,28,0.9)';
            ctx.globalAlpha = ghostFillAlpha;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 0.15, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = ghostStrokeAlpha;
            ctx.strokeStyle = isSelectedStep
              ? 'rgba(255,255,255,0.92)'
              : 'rgba(255,255,255,0.72)';
            ctx.lineWidth = denseLayer ? 1 : 1.15;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 0.15, 0, TAU);
            ctx.stroke();
          }
          ctx.restore();

          const labelStride = getPolyrhythmLabelStride(layer.beatCount);
          const shouldDrawLabel =
            point.index % labelStride === 0 || point.index === layer.beatCount - 1;
          if (
            currentStudy.showStepLabels &&
            !isReferenceLayer &&
            (!sharedDisplay || soloLayerDisplayRef.current || displayStudy.layers.length === 1) &&
            shouldDrawLabel &&
            (soloLayerDisplayRef.current || displayStudy.layers.length === 1 || isSelectedLayer)
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

        if (currentStudy.playing && !isReferenceLayer) {
          const cursorRadius =
            (soloLayerDisplayRef.current ? 3.8 : sharedDisplay ? 2.8 : 3.2) *
            glowMultiplier;
          ctx.save();
          ctx.globalAlpha = isSelectedLayer ? 0.62 : sharedDisplay ? 0.34 : 0.44;
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = 0.9;
          ctx.shadowBlur = (isSelectedLayer ? 8 : 5) * glowMultiplier;
          ctx.shadowColor = layer.color;
          ctx.beginPath();
          ctx.arc(smoothLayerX, smoothLayerY, cursorRadius + 2.5, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = isSelectedLayer ? 0.78 : 0.58;
          ctx.fillStyle = layer.color;
          ctx.beginPath();
          ctx.arc(smoothLayerX, smoothLayerY, cursorRadius, 0, TAU);
          ctx.fill();
          ctx.restore();
        }

        const activeIndices = getActiveStepIndices(layer);
        if (
          currentStudy.showStepLabels &&
          soloLayerDisplayRef.current &&
          !isReferenceLayer &&
          isSelectedLayer &&
          activeIndices.length > 0
        ) {
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
      animationTimestampRef.current = timestamp;
      hitPulsesRef.current = hitPulsesRef.current.filter(
        (pulse) => timestamp - pulse.startedAt < HIT_PULSE_DURATION_MS,
      );

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
          const activeStepHit =
            previousStepIndex !== currentStepIndex && layer.activeSteps[currentStepIndex];

          if (activeStepHit) {
            hitPulsesRef.current.push({
              layerId: layer.id,
              stepIndex: currentStepIndex,
              startedAt: timestamp,
            });
          }

          if (audioEnabledRef.current && activeStepHit && currentStudy.soundEnabled && layer.soundEnabled) {
            triggerPolyrhythmPulse({
              frequency: layer.pitchHz,
              gain: layer.gain,
              sound: currentStudy.soundSettings,
              layerIndex,
              beatCount: layer.beatCount,
              accented: Boolean(layer.accents?.[currentStepIndex]),
            });
          }
        });
      } else if (playbackDriverRef.current) {
        playbackState.lastTimestamp = timestamp;
        hitPulsesRef.current = [];
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
    hitPulsesRef.current = [];
    draw();
  }, [draw, study]);

  useEffect(() => {
    const playbackState = playbackStateHandleRef.current.current;
    playbackState.progress = 0;
    playbackState.previousPlaybackSteps.clear();
    playbackState.lastTimestamp = null;
    playbackState.wasPlaying = studyRef.current.playing;
    hitPulsesRef.current = [];
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

    (canvas as any).__exportVideo = async ({
      durationSeconds = 8,
      aspect = 'canvas',
    }: {
      durationSeconds?: VideoExportDuration;
      aspect?: VideoExportAspect;
    } = {}) => {
      if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
        throw new Error('Video export is not supported in this browser.');
      }

      exportVideoSizeRef.current = VIDEO_EXPORT_SIZES[aspect];
      let stream: MediaStream | null = null;
      try {
        const playbackState = playbackStateHandleRef.current.current;
        playbackState.progress = 0;
        playbackState.lastTimestamp = null;
        playbackState.previousPlaybackSteps.clear();
        playbackState.wasPlaying = false;
        hitPulsesRef.current = [];
        studyRef.current = {
          ...studyRef.current,
          playing: false,
        };
        draw();
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const recordingFormat = getCanvasRecordingFormat();

        stream = addAudioToCanvasStream(
          canvas.captureStream(CANVAS_RECORDING_FRAME_RATE),
          createPolyrhythmExportAudioStream(
            studyRef.current,
            durationSeconds,
            CANVAS_EXPORT_PREROLL_SECONDS,
          ),
        );
        const recorder = new MediaRecorder(stream, {
          mimeType: recordingFormat.mimeType,
          videoBitsPerSecond: CANVAS_RECORDING_VIDEO_BITS_PER_SECOND,
        });
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        const recordingPromise = recordMediaRecorderForDuration(recorder, durationSeconds);
        window.setTimeout(() => {
          playbackState.lastTimestamp = null;
          playbackState.previousPlaybackSteps.clear();
          playbackState.wasPlaying = false;
          studyRef.current = {
            ...studyRef.current,
            playing: true,
          };
        }, CANVAS_EXPORT_PREROLL_SECONDS * 1000);
        await recordingPromise;

        const blob = new Blob(chunks, { type: recordingFormat.mimeType });
        const download = await prepareCanvasRecordingDownload(blob, recordingFormat);
        const url = URL.createObjectURL(download.blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const link = document.createElement('a');
        link.href = url;
        link.download = `polyrhythm-study-${aspect}-${durationSeconds}s-${timestamp}.${download.extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } finally {
        stream?.getTracks().forEach((track) => track.stop());
        exportVideoSizeRef.current = null;
        draw();
      }
    };

    return () => {
      delete (canvas as any).__exportPng;
      delete (canvas as any).__exportVideo;
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
        clearLongPress();
        pointerStepHitRef.current = null;
        onClearSelection();
        return;
      }

      event.currentTarget.setPointerCapture?.(event.pointerId);
      onSelectLayer(hit.layerId);

      if (hit.stepIndex == null) {
        clearLongPress();
        pointerStepHitRef.current = null;
        onSelectStep(null);
        onOpenLayerMenu?.(hit.layerId);
        return;
      }

      const isSameStep =
        selectedStepRef.current?.layerId === hit.layerId &&
        selectedStepRef.current.stepIndex === hit.stepIndex;

      onSelectStep({
        layerId: hit.layerId,
        stepIndex: hit.stepIndex,
      });

      if (event.shiftKey && onToggleStepAccent) {
        clearLongPress();
        pointerStepHitRef.current = {
          layerId: hit.layerId,
          stepIndex: hit.stepIndex,
          sameStep: isSameStep,
          shiftAccent: true,
        };
        onToggleStepAccent(hit.layerId, hit.stepIndex);
        return;
      }

      clearLongPress();
      longPressFiredRef.current = false;
      pointerStepHitRef.current = {
        layerId: hit.layerId,
        stepIndex: hit.stepIndex,
        sameStep: isSameStep,
        shiftAccent: false,
      };
      if (onToggleStepAccent) {
        longPressTimeoutRef.current = window.setTimeout(() => {
          const pendingHit = pointerStepHitRef.current;
          if (!pendingHit) {
            return;
          }
          longPressFiredRef.current = true;
          onToggleStepAccent(pendingHit.layerId, pendingHit.stepIndex);
        }, 390);
      }
    },
    [clearLongPress, onClearSelection, onOpenLayerMenu, onSelectLayer, onSelectStep, onToggleStepAccent],
  );

  const handlePointerUp = useCallback(() => {
    const pendingHit = pointerStepHitRef.current;
    clearLongPress();
    pointerStepHitRef.current = null;

    if (!pendingHit || pendingHit.shiftAccent) {
      longPressFiredRef.current = false;
      return;
    }

    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }

    if (pendingHit.sameStep) {
      onToggleStep(pendingHit.layerId, pendingHit.stepIndex);
    }
  }, [clearLongPress, onToggleStep]);

  const handlePointerCancel = useCallback(() => {
    clearLongPress();
    pointerStepHitRef.current = null;
    longPressFiredRef.current = false;
  }, [clearLongPress]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isMobileRef.current) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const currentStudy =
      soloLayerDisplayRef.current && displayLayerIdRef.current
        ? {
            ...studyRef.current,
            layers: studyRef.current.layers.filter((layer) => layer.id === displayLayerIdRef.current),
          }
        : studyRef.current;
    const hit = findPolyrhythmHit(
      currentStudy,
      getPolyrhythmCanvasMetrics(currentStudy, rect.width, rect.height, isMobileRef.current),
      x,
      y,
      selectedLayerIdRef.current,
    );

    hoveredLayerIdRef.current = hit?.layerId ?? null;
    hoveredStepRef.current =
      hit?.stepIndex != null
        ? {
            layerId: hit.layerId,
            stepIndex: hit.stepIndex,
          }
        : null;
    canvas.style.cursor = hit ? 'pointer' : 'default';
  }, []);

  const handlePointerLeave = useCallback(() => {
    clearLongPress();
    pointerStepHitRef.current = null;
    longPressFiredRef.current = false;
    hoveredLayerIdRef.current = null;
    hoveredStepRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, [clearLongPress]);

  return (
    <canvas
      ref={(node) => {
        canvasRef.current = node;
        if (externalCanvasRef) {
          externalCanvasRef.current = node;
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className ?? 'absolute inset-0 h-full w-full'}
    />
  );
}
