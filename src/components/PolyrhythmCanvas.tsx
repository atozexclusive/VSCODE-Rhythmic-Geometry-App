import { drawStudySoundGlyph, prepareStudySoundGlyph } from './studySoundCanvasGlyph';
import { appendRhythmContourPath, drawRhythmContour } from '../lib/rhythmContour';
import StudySoundGlyph from './StudySoundGlyph';
import { createPortal } from 'react-dom';
import { getStudyVideoViewport, getStudyEnsembleExportFrame } from '../lib/studyVideoViewport';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  preparePolyrhythmAudioRecording,
  silencePolyrhythmAudio,
  triggerPolyrhythmBarMarker,
  triggerPolyrhythmPulse,
} from '../lib/polyrhythmAudio';
import {
  DEFAULT_CANVAS_DISPLAY_SETTINGS,
  drawCanvasDisplayBackground,
  getCanvasGlowMultiplier,
  getCanvasLineAlpha,
  type CanvasDisplaySettings,
} from '../lib/canvasDisplayThemes';
import {
  findPolyrhythmHit,
  getPolyrhythmEnsemblePanels,
  getPolyrhythmEnsembleMetrics,
  getPolyrhythmCanvasMetrics,
} from '../lib/polyrhythmLayout';
import {
  countActiveSteps,
  getActiveStepIndices,
  getLayerStepPoints,
  getPlaybackStepIndex,
  getSharedCycleStepCount,
  getSharedGridStepState,
  type PolyrhythmLayer,
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

function drawDiamondMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
}


const instrumentGroups = [
    { label: 'Synths', sounds: [['soft-synth', 'Soft Synth'], ['chorus-keys', 'Chorus Keys'], ['velvet-keys', 'Velvet Keys'], ['warm-synth', 'Warm Synth'], ['meditation-pad', 'Meditation Pad'], ['ambient-bloom', 'Ambient Bloom']] },
    { label: 'Tones', sounds: [['study-pulse', 'Study Pulse'], ['wood', 'Wood'], ['bright-marker', 'Bright Marker'], ['chime', 'Chime'], ['crystal-bell', 'Crystal Bell']] },
    { label: 'Drums', sounds: [['snare', 'Snare'], ['tom', 'Tom'], ['kick', 'Kick'], ['hi-hat', 'Hi-hat'], ['cymbal', 'Cymbal'], ['wood-block', 'Wood Block'], ['clave', 'Clave'], ['cascara', 'Cáscara'], ['cowbell', 'Cowbell'], ['shaker', 'Shaker']] },
  ];

interface PolyrhythmCanvasSelection {
  layerId: string;
  stepIndex: number;
}

interface PolyrhythmPlaybackState {
  progress: number;
  lastTimestamp: number | null;
  previousPlaybackSteps: Map<string, number>;
  noteOrderHits?: Map<string, number>;
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
  onSetLayerInstrument?: (layerId: string, instrument: string) => void;
  onToggleLayerSound?: (layerId: string) => void;
  onSoloLayer?: (layerId: string) => void;
  onSelectLayer: (layerId: string) => void;
  onOpenLayerMenu?: (layerId: string) => void;
  onSelectStep: (selection: PolyrhythmCanvasSelection | null) => void;
  onToggleStep: (layerId: string, stepIndex: number) => void;
  onToggleStepAccent?: (layerId: string, stepIndex: number) => void;
  onClearSelection: () => void;
  onBarBoundary?: () => readonly PolyrhythmLayer[] | null | void;
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
  onSetLayerInstrument,
  onToggleLayerSound,
  onSoloLayer,
  onOpenLayerMenu,
  onSelectStep,
  onToggleStep,
  onToggleStepAccent,
  onClearSelection,
  onBarBoundary,
  className,
}: PolyrhythmCanvasProps) {
  const [instrumentPicker, setInstrumentPicker] = useState<{ layerId: string; x: number; y: number } | null>(null);
  const [instrumentCategory, setInstrumentCategory] = useState(0);
  const instrumentPickerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!instrumentPicker) return;
    const close = (event: PointerEvent) => {
      if (!instrumentPickerRef.current?.contains(event.target as Node) && !(event.target as Element).closest?.('[data-study-instrument-trigger]')) setInstrumentPicker(null);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setInstrumentPicker(null); };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', key);
    const resize = () => setInstrumentPicker(null);
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', key); window.removeEventListener('resize', resize); };
  }, [instrumentPicker]);
  const [ensembleFocus, setEnsembleFocus] = useState<string | null>(null);
  const ensembleFocusRef = useRef<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const effectiveEnsembleFocus = study.ensembleView && study.layers.some((layer) => layer.id === ensembleFocus) ? ensembleFocus : null;
  ensembleFocusRef.current = effectiveEnsembleFocus;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
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
  useEffect(() => {
    const layers = [...study.layers, ...(study.chainCells ?? []).flatMap(cell => cell.layers)];
    layers.forEach(layer => prepareStudySoundGlyph(
      layer.voice && layer.voice !== 'standard' ? layer.voice : layer.soundSettings?.palette ?? study.soundSettings.palette,
      layer.color,
    ));
  }, [study.layers, study.chainCells, study.soundSettings.palette]);

  const selectedLayerIdRef = useRef(selectedLayerId);
  const selectedStepRef = useRef(selectedStep);
  const hoveredLayerIdRef = useRef<string | null>(null);
  const hoveredStepRef = useRef<PolyrhythmCanvasSelection | null>(null);
  const displayLayerIdRef = useRef(displayLayerId);
  const soloLayerDisplayRef = useRef(soloLayerDisplay);
  const showReferenceLayersRef = useRef(showReferenceLayers);
  const displaySettingsRef = useRef(displaySettings);
  const audioEnabledRef = useRef(audioEnabled);
  const onBarBoundaryRef = useRef(onBarBoundary);
  const presentationModeRef = useRef(presentationMode);
  const playbackStateHandleRef = useRef(playbackStateRef ?? localPlaybackStateRef);
  const playbackDriverRef = useRef(playbackDriver);
  const exportVideoSizeRef = useRef<{ width: number; height: number } | null>(null);
  const exportPlaybackActiveRef = useRef(false);
  const hitPulsesRef = useRef<PolyrhythmHitPulse[]>([]);
  const barMarkerFlashStartedAtRef = useRef<number | null>(null);
  const animationTimestampRef = useRef(0);
  const pointerLayerHitRef = useRef<string | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStepHitRef = useRef<{
    layerId: string;
    stepIndex: number;
    sameStep: boolean;
    shiftAccent: boolean;
  } | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  studyRef.current = exportPlaybackActiveRef.current
    ? { ...study, playing: true }
    : study;
  isMobileRef.current = isMobile;
  selectedLayerIdRef.current = selectedLayerId;
  selectedStepRef.current = selectedStep;
  displayLayerIdRef.current = displayLayerId;
  soloLayerDisplayRef.current = soloLayerDisplay;
  showReferenceLayersRef.current = showReferenceLayers;
  displaySettingsRef.current = displaySettings;
  audioEnabledRef.current = audioEnabled;
  onBarBoundaryRef.current = onBarBoundary;
  presentationModeRef.current = presentationMode;
  playbackStateHandleRef.current = playbackStateRef ?? localPlaybackStateRef;
  playbackDriverRef.current = playbackDriver;

  const clearLongPress = useCallback(() => {
    if (longPressTimeoutRef.current != null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const draw = useCallback((cleanExport = false) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const exportVideoSize = exportVideoSizeRef.current;
    const liveRect = canvas.getBoundingClientRect();
    const exportViewport = exportVideoSize ? getStudyVideoViewport(liveRect, exportVideoSize) : null;
    const rect = exportViewport ?? liveRect;
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const liveDpr = window.devicePixelRatio || 1;
    const dpr = exportViewport?.scale ?? liveDpr;
    const shadowScale = exportViewport ? dpr / liveDpr : 1;
    const nextWidth = exportVideoSize?.width ?? Math.round(rect.width * dpr);
    const nextHeight = exportVideoSize?.height ?? Math.round(rect.height * dpr);

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
    // Keep the live canvas's proportions instead of enlarging export-only markers.
    const renderAsMobile = isMobileRef.current;
    const pointScale = 1;
    const exportLabelScale = 1;
    const currentDisplaySettings = displaySettingsRef.current;
    const lineAlpha = getCanvasLineAlpha(currentDisplaySettings);
    const glowMultiplier = getCanvasGlowMultiplier(
      currentDisplaySettings,
      presentationModeRef.current,
    );

    ctx.clearRect(0, 0, rect.width, rect.height);
    drawCanvasDisplayBackground(ctx, rect.width, rect.height, currentDisplaySettings, {
      presentationMode: presentationModeRef.current || soloLayerDisplayRef.current,
      seed: 31,
    });

    const drawStudy = (currentStudy: PolyrhythmStudy, rect: { width: number; height: number }, ensemblePanel = false) => {
    const focusedLayerStudy =
      soloLayerDisplayRef.current && displayLayerIdRef.current
        ? {
            ...currentStudy,
            layers: currentStudy.layers.filter((layer) => layer.id === displayLayerIdRef.current),
          }
        : currentStudy;
    const sourceDisplayStudy =
      soloLayerDisplayRef.current &&
      displayLayerIdRef.current &&
      showReferenceLayersRef.current
        ? currentStudy
        : focusedLayerStudy;
    // Keep layout metrics based on the full ensemble so entrances never resize
    // the existing shapes; hide only the inactive stacked artwork.
    const hideInactiveLayers = currentStudy.chainEnabled && !studyRef.current.ensembleView && !soloLayerDisplayRef.current;
    const displayStudy = hideInactiveLayers
      ? { ...sourceDisplayStudy, layers: sourceDisplayStudy.layers.filter(layer => layer.soundEnabled) }
      : sourceDisplayStudy;
    const metrics = ensemblePanel
      ? getPolyrhythmEnsembleMetrics(focusedLayerStudy, rect.width, rect.height, renderAsMobile, Boolean(exportVideoSize))
      : getPolyrhythmCanvasMetrics(focusedLayerStudy, rect.width, rect.height, renderAsMobile);
    if (hideInactiveLayers && displayStudy.layers.length === 0) return;
    // Give portrait videos room for social-player overlays and edge labels.
    // Scale the complete artwork together, keeping the background full bleed.
    if (!ensemblePanel && exportVideoSize && exportVideoSize.height > exportVideoSize.width) {
      const artworkScale = 0.9;
      ctx.translate(metrics.centerX, metrics.centerY);
      ctx.scale(artworkScale, artworkScale);
      ctx.translate(-metrics.centerX, -metrics.centerY);
    }
    const playbackState = playbackStateHandleRef.current.current;
    const animationTimestamp = animationTimestampRef.current;
    const cursorAngle = -Math.PI / 2 + playbackState.progress * TAU;
    const clockVisible = currentStudy.playing || Boolean(exportVideoSize);
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

    if (!ensemblePanel && (exportVideoSize || cleanExport)) {
      // Remove radial bloom only beneath filled shapes, retaining the same
      // stars and atmosphere. Guides and overlapping layers are drawn later.
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      let hasFilledShape = false;
      for (const layer of orderedLayers) {
        const isReferenceLayer = soloLayerDisplayRef.current && showReferenceLayersRef.current &&
          displayLayerIdRef.current != null && layer.id !== displayLayerIdRef.current;
        if (isReferenceLayer) continue;
        const activePoints = getLayerStepPoints(layer, metrics.centerX, metrics.centerY, metrics.scale)
          .filter((point) => point.active);
        if (currentStudy.showContour) {
          hasFilledShape = appendRhythmContourPath(ctx, activePoints, {
            centerX: metrics.centerX, centerY: metrics.centerY, radius: layer.radius * metrics.scale,
            stepCount: layer.beatCount, pointScale,
            intensity: layer.beatCount >= 33 ? 1 : layer.beatCount >= 16 ? 0.72 : 0.54,
          }) || hasFilledShape;
          continue;
        }
        if (activePoints.length < 3) continue;
        hasFilledShape = true;
        ctx.moveTo(activePoints[0].x, activePoints[0].y);
        for (let index = 1; index < activePoints.length; index += 1) {
          ctx.lineTo(activePoints[index].x, activePoints[index].y);
        }
        ctx.closePath();
      }
      if (hasFilledShape) {
        ctx.clip();
        // The clip follows the export's artwork scale; atmosphere stays in
        // canvas coordinates so stars match across the polygon boundary.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawCanvasDisplayBackground(ctx, rect.width, rect.height, currentDisplaySettings, {
          presentationMode: presentationModeRef.current || soloLayerDisplayRef.current,
          seed: 31,
          hideBackdropBloom: true,
        });
      }
      ctx.restore();
    }

    if (currentStudy.barMarkerVisualEnabled && barMarkerFlashStartedAtRef.current != null) {
      const elapsed = Math.max(0, animationTimestamp - barMarkerFlashStartedAtRef.current);
      const duration = 560;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const alpha = Math.pow(1 - progress, 2);
        const radius = metrics.outerRadius + (6 + progress * 18) * exportLabelScale;
        ctx.save();
        ctx.strokeStyle = `rgba(136,204,255,${0.68 * alpha})`;
        ctx.lineWidth = Math.max(1, 2.4 * exportLabelScale * (1 - progress * 0.35));
        ctx.shadowColor = `rgba(136,204,255,${0.55 * alpha})`;
        ctx.shadowBlur = (14 * exportLabelScale) * shadowScale;
        ctx.beginPath();
        ctx.arc(metrics.centerX, metrics.centerY, radius, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = `rgba(210,239,255,${0.9 * alpha})`;
        ctx.beginPath();
        ctx.arc(metrics.centerX, metrics.centerY - radius, 3.5 * exportLabelScale, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else {
        barMarkerFlashStartedAtRef.current = null;
      }
    }

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
      currentStudy.showStepLabels
    ) {
      const gridRadius = sharedCycleRadius + (renderAsMobile ? 13 : 18) * exportLabelScale;
      ctx.save();
      for (let index = 0; index < sharedCycleStepCount; index += 1) {
        const angle = -Math.PI / 2 + (index / sharedCycleStepCount) * TAU;
        const gridStep = getSharedGridStepState(displayStudy.layers, index, sharedCycleStepCount, currentSelectedLayerId);
        const onLayerBoundary = gridStep.editable;
        if (currentStudy.showStepLabels) {
          const denseGrid = sharedCycleStepCount > 48;
          const labelRadius = gridRadius + (denseGrid ? 9 : 13) * exportLabelScale;
          const labelX = metrics.centerX + Math.cos(angle) * labelRadius;
          const labelY = metrics.centerY + Math.sin(angle) * labelRadius;
          ctx.shadowBlur = 0;
          ctx.globalAlpha = gridStep.active ? 0.82 : onLayerBoundary ? 0.68 : 0.58;
          ctx.fillStyle = gridStep.color ?? 'rgba(255,255,255,0.82)';
          const labelSize = denseGrid ? (onLayerBoundary ? 8 : 7.5) : (gridStep.active ? 11 : 10);
          ctx.font = `${gridStep.active ? 500 : 400} ${labelSize * exportLabelScale}px "SF Mono", "Fira Code", monospace`;
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

    if (clockVisible) {
      const handRadius = Math.max(1, ...displayStudy.layers.map((layer) => layer.radius)) * metrics.scale;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${0.14 * lineAlpha})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(metrics.centerX, metrics.centerY);
      ctx.lineTo(
        metrics.centerX + Math.cos(cursorAngle) * handRadius,
        metrics.centerY + Math.sin(cursorAngle) * handRadius,
      );
      ctx.stroke();
      ctx.restore();
    }

    // A rest on one shared layer must not hollow out another layer's hit.
    const sharedActivePositions = new Set<string>();
    const nodePositionKey = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;
    if (sharedDisplay) {
      for (const layer of orderedLayers) {
        for (const point of getLayerStepPoints(layer, metrics.centerX, metrics.centerY, metrics.scale)) {
          if (point.active) sharedActivePositions.add(nodePositionKey(point.x, point.y));
        }
      }
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
        const showLayerRing = ensemblePanel || !sharedDisplay || isSelectedLayer;

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
            ctx.shadowBlur = ((isSelectedLayer ? (soloLayerDisplayRef.current ? 18 : 10) : 12) * glowMultiplier) * shadowScale;
            ctx.shadowColor = layer.color;
          }
          ctx.beginPath();
          ctx.arc(metrics.centerX, metrics.centerY, layer.radius * metrics.scale, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }

        if (currentStudy.showContour && activePoints.length >= 2) {
          drawRhythmContour(ctx, points, {
            centerX: metrics.centerX, centerY: metrics.centerY,
            radius: layer.radius * metrics.scale, stepCount: layer.beatCount,
            color: layer.color, glowMultiplier: glowMultiplier * shadowScale, pointScale,
            showLabels: false, intensity: layer.beatCount >= 33 ? 1 : layer.beatCount >= 16 ? 0.72 : 0.54,
            fill: !isReferenceLayer,
          });
        }
        if (!currentStudy.showContour && activePoints.length >= 2) {
          if (!isReferenceLayer) {
            ctx.save();
            // Keep unselected fills visible against the bloom-free export backdrop.
            const fillAlpha = isSelectedLayer ? 0.16 : sharedDisplay ? 0.09 : 0.05;
            ctx.globalAlpha = (exportVideoSize || cleanExport ? Math.max(0.16, fillAlpha) : fillAlpha) * lineAlpha;
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
          ctx.shadowBlur = (isReferenceLayer
            ? 0
            : (isSelectedLayer ? 16 : isHoveredLayer ? 12 : sharedDisplay ? 9 : 7) * glowMultiplier) * shadowScale;
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
          const isSelectedStep =
            currentSelectedStep?.layerId === layer.id &&
            currentSelectedStep.stepIndex === point.index;
          const labelStride = getPolyrhythmLabelStride(layer.beatCount);
          const shouldDrawLabel =
            point.index % labelStride === 0 || point.index === layer.beatCount - 1;
          const drawInnerNumbers = Boolean(currentStudy.showInnerNumbers) && (ensemblePanel || isSelectedLayer) && !isReferenceLayer;
          if (
            !isReferenceLayer && shouldDrawLabel &&
            (drawInnerNumbers || (
              currentStudy.showStepLabels &&
              (!sharedDisplay || soloLayerDisplayRef.current || displayStudy.layers.length === 1) &&
              (soloLayerDisplayRef.current || displayStudy.layers.length === 1 || isSelectedLayer)
            ))
          ) {
            const labelRadius = Math.max(0, layer.radius * metrics.scale + (drawInnerNumbers ? -22 : 14) * exportLabelScale);
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = point.active || isSelectedStep ? 0.86 : 0.65;
            ctx.fillStyle = drawInnerNumbers ? layer.color : 'rgba(255,255,255,0.88)';
            ctx.font = `${drawInnerNumbers ? 600 : 400} ${10 * exportLabelScale}px "SF Mono", "Fira Code", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              String(point.index + 1),
              metrics.centerX + Math.cos(point.angle) * labelRadius,
              metrics.centerY + Math.sin(point.angle) * labelRadius,
            );
            ctx.restore();
          }

          // Actual layer positions, including rests on a shared grid, remain editable.

          const accented = point.accented;
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
                ? soloLayerDisplayRef.current ? 6.4 : 5.9
              : isHoveredLayer
                ? soloLayerDisplayRef.current ? 5.8 : 5.1
                : denseLayer
                  ? soloLayerDisplayRef.current ? 5.4 : 4.8
                  : soloLayerDisplayRef.current ? 5.6 : 5) * pointScale;

          if (isHoveredStep && !isReferenceLayer) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1.7 * pointScale;
            ctx.shadowBlur = (14 * glowMultiplier * pointScale) * shadowScale;
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
            ctx.shadowBlur = (10 * glowMultiplier * pointScale) * shadowScale;
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
            ctx.shadowBlur = ((8 + 6 * easedPulse) * glowMultiplier * pointScale) * shadowScale;
            ctx.shadowColor = layer.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + 3 * pointScale + (1 - easedPulse) * 8 * pointScale + hitRadiusBoost, 0, TAU);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 0.07 * easedPulse;
            ctx.fillStyle = layer.color;
            ctx.shadowBlur = ((8 * pointScale + hitGlowBoost) * glowMultiplier) * shadowScale;
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
            ctx.shadowBlur = (isReferenceLayer
              ? 0
              : (isSelectedStep ? 16 : isHoveredStep ? 16 : isHoveredLayer ? 12 : sharedDisplay ? 10 : 8) * glowMultiplier * pointScale + hitGlowBoost) * shadowScale;
            ctx.shadowColor = isReferenceLayer ? 'transparent' : layer.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius + hitRadiusBoost + (sharedDisplay && !isReferenceLayer ? 0.8 * pointScale : 0), 0, TAU);
            ctx.fill();
            if (sharedDisplay && !isReferenceLayer) {
              ctx.strokeStyle = 'rgba(255,255,255,0.4)';
              ctx.lineWidth = 0.8 * pointScale;
              ctx.stroke();
            }
            if (accented && !isReferenceLayer) {
              const nodeRadius = pointRadius + hitRadiusBoost + (sharedDisplay ? 0.8 * pointScale : 0);
              ctx.globalAlpha = 1;
              ctx.shadowBlur = 0;
              ctx.strokeStyle = 'rgba(255,209,102,0.88)';
              ctx.lineWidth = 1.9 * pointScale;
              ctx.beginPath();
              ctx.arc(point.x, point.y, nodeRadius + 3.6 * pointScale, 0, TAU);
              ctx.stroke();
              ctx.fillStyle = 'rgba(255,209,102,0.96)';
              ctx.strokeStyle = 'rgba(17,17,22,0.72)';
              ctx.lineWidth = pointScale;
              drawDiamondMarker(ctx, point.x, point.y, Math.max(2.8 * pointScale, nodeRadius * 0.42));
              ctx.fill();
              ctx.stroke();
            }
          } else if (!sharedDisplay || !sharedActivePositions.has(nodePositionKey(point.x, point.y))) {
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = '#101923';
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = isSelectedStep || isHoveredStep ? 1 : isSelectedLayer ? 0.92 : 0.76;
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = (isSelectedLayer ? 1.9 : 1.5) * pointScale;
            ctx.stroke();
          }
          ctx.restore();


        });

        if (clockVisible && !isReferenceLayer) {
          const cursorRadius =
            (soloLayerDisplayRef.current ? 3.8 : sharedDisplay ? 2.8 : 3.2) *
            glowMultiplier;
          ctx.save();
          ctx.globalAlpha = isSelectedLayer ? 0.62 : sharedDisplay ? 0.34 : 0.44;
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = 0.9;
          ctx.shadowBlur = ((isSelectedLayer ? 8 : 5) * glowMultiplier) * shadowScale;
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
          ctx.font = `${11 * exportLabelScale}px "SF Mono", "Fira Code", monospace`;
          ctx.textAlign = 'left';
          ctx.fillText(
            `${countActiveSteps(layer)}/${layer.beatCount}`,
            metrics.centerX - layer.radius * metrics.scale,
            metrics.centerY - layer.radius * metrics.scale - 10,
          );
          ctx.restore();
        }
      });
    };
    const focusedEnsembleLayer = !exportVideoSize && !cleanExport
      ? currentStudy.layers.find((layer) => layer.id === ensembleFocusRef.current) : undefined;
    if (focusedEnsembleLayer && !soloLayerDisplayRef.current) {
      drawStudy({ ...currentStudy, ensembleView: false, layers: [focusedEnsembleLayer] }, rect);
    } else if (currentStudy.ensembleView && currentStudy.layers.length > 1 && !soloLayerDisplayRef.current) {
      const frame = exportVideoSize
        ? getStudyEnsembleExportFrame(rect.width, rect.height, currentStudy.layers.length)
        : { x: 0, y: 0, width: rect.width, height: rect.height };
      getPolyrhythmEnsemblePanels(currentStudy, frame.width, frame.height).forEach((panel, index) => {
        ctx.save();
        ctx.translate(frame.x + panel.x, frame.y + panel.y);
        ctx.beginPath();
        ctx.rect(0, 0, panel.width, panel.height);
        ctx.clip();
        ctx.fillStyle = panel.layer.id === selectedLayerIdRef.current ? `${panel.layer.color}09` : 'rgba(255,255,255,0.015)';
        ctx.fillRect(0, 0, panel.width, panel.height);
        ctx.strokeStyle = panel.layer.id === selectedLayerIdRef.current ? `${panel.layer.color}44` : 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, panel.width - 1, panel.height - 1);
        ctx.fillStyle = panel.layer.color;
        ctx.font = '11px "SF Mono", monospace';
        ctx.textAlign = 'left';
        if (exportVideoSize || cleanExport) {
          const instrument = panel.layer.voice && panel.layer.voice !== 'standard'
            ? panel.layer.voice : panel.layer.soundSettings?.palette ?? currentStudy.soundSettings.palette;
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.font = '600 12px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = panel.layer.color;
          ctx.fillText(`L${index + 1}`, 12, 20);
          drawStudySoundGlyph(ctx, instrument, panel.layer.color, 42, 11, 18);
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(231,239,246,0.65)';
          ctx.font = '400 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(`${panel.layer.beatCount} steps`, panel.width - 12, 20);
          ctx.restore();
        }
        // Artwork applies its own export scale. Restore panel coordinates before
        // fading so the fade also covers the unscaled header and outer border.
        ctx.save();
        drawStudy({ ...currentStudy, ensembleView: false, layers: [panel.layer] }, panel, true);
        ctx.restore();
        if (!panel.layer.soundEnabled) {
          ctx.save();
          ctx.globalAlpha = 0.48;
          ctx.fillStyle = '#080d14';
          ctx.fillRect(0, 0, panel.width, panel.height);
          ctx.restore();
        }
        ctx.restore();
      });
    } else {
      drawStudy(currentStudy, rect);
    }
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

      const playbackJustStarted =
        playbackDriverRef.current && currentStudy.playing && !playbackState.wasPlaying;
      if (playbackJustStarted) {
        // Reset before evaluating the current step. Resetting after the first
        // hit makes the following animation frame fire beat 1 a second time.
        playbackState.previousPlaybackSteps.clear();
        playbackState.lastTimestamp = timestamp;
        if (currentStudy.barMarkerVisualEnabled) {
          barMarkerFlashStartedAtRef.current = timestamp;
        }
        if (
          !exportPlaybackActiveRef.current &&
          audioEnabledRef.current &&
          currentStudy.soundEnabled &&
          currentStudy.barMarkerSoundEnabled
        ) {
          triggerPolyrhythmBarMarker();
        }
      }

      if (playbackDriverRef.current && currentStudy.playing) {
        const previousProgress = playbackState.progress;
        if (playbackState.lastTimestamp == null) {
          playbackState.lastTimestamp = timestamp;
        } else {
          const deltaSeconds = Math.min(
            0.05,
            (timestamp - playbackState.lastTimestamp) / 1000,
          );
          const cyclesPerSecond = currentStudy.bpm / 60 / (currentStudy.cycleBeats ?? 4);
          playbackState.progress =
            (playbackState.progress + deltaSeconds * cyclesPerSecond) % 1;
          playbackState.lastTimestamp = timestamp;
        }

        let incomingCellLayers: readonly PolyrhythmLayer[] | null = null;
        const barsPerCycle = (currentStudy.cycleBeats ?? 4) / 4;
        if (playbackState.progress < previousProgress ||
          Math.floor(playbackState.progress * barsPerCycle) !== Math.floor(previousProgress * barsPerCycle)) {
          if (currentStudy.barMarkerVisualEnabled) {
            barMarkerFlashStartedAtRef.current = timestamp;
          }
          if (audioEnabledRef.current && currentStudy.soundEnabled && currentStudy.barMarkerSoundEnabled) {
            triggerPolyrhythmBarMarker();
          }
          incomingCellLayers = onBarBoundaryRef.current?.() ?? null;
        }

        const playbackLayers = incomingCellLayers?.length
          ? incomingCellLayers
          : currentStudy.layers;
        const layerProgress = playbackState.progress;
        playbackLayers.forEach((layer, layerIndex) => {
          const currentStepIndex = getPlaybackStepIndex(layer, layerProgress);
          const previousStepIndex = incomingCellLayers?.length
            ? undefined
            : playbackState.previousPlaybackSteps.get(layer.id);
          playbackState.previousPlaybackSteps.set(layer.id, currentStepIndex);
          const activeStepHit =
            previousStepIndex !== currentStepIndex && layer.activeSteps[currentStepIndex];

          const noteOrderHits = playbackState.noteOrderHits ??= new Map();
          const hitIndex = noteOrderHits.get(layer.id) ?? 0;
          if (activeStepHit && layer.soundEnabled) noteOrderHits.set(layer.id, hitIndex + 1);
          if (activeStepHit && layer.soundEnabled) {
            hitPulsesRef.current.push({
              layerId: layer.id,
              stepIndex: currentStepIndex,
              startedAt: timestamp,
            });
          }

          if (audioEnabledRef.current && activeStepHit && currentStudy.soundEnabled && layer.soundEnabled) {
            triggerPolyrhythmPulse({
              voice: layer.voice,
              noteSequence: layer.noteSequence,
              layerSound: layer.soundSettings,
              drumTune: layer.drumTune,
              frequency: layer.pitchHz,
              gain: layer.gain,
              sound: currentStudy.soundSettings,
              layerIndex,
              beatCount: layer.beatCount,
              hitIndex,
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
    const playbackState = playbackStateHandleRef.current.current;
    playbackState.previousPlaybackSteps.clear();
    study.layers.forEach((layer) => {
      playbackState.previousPlaybackSteps.set(
        layer.id,
        getPlaybackStepIndex(layer, playbackState.progress),
      );
    });
    barMarkerFlashStartedAtRef.current = null;
    draw();
  }, [draw, study]);

  useEffect(() => {
    const playbackState = playbackStateHandleRef.current.current;
    playbackState.progress = 0;
    playbackState.noteOrderHits?.clear();
    playbackState.previousPlaybackSteps.clear();
    playbackState.lastTimestamp = null;
    playbackState.wasPlaying = studyRef.current.playing;
    hitPulsesRef.current = [];
    barMarkerFlashStartedAtRef.current = null;
    draw();
  }, [draw, restartToken]);

  useEffect(() => {
    playbackStateHandleRef.current.current.noteOrderHits?.clear();
  }, [study.soundSettings.noteOrder]);

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

      draw(true);
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
      try {
        exportCtx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);
      } finally {
        draw();
      }

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
      aspect = 'landscape',
    }: {
      durationSeconds?: VideoExportDuration;
      aspect?: VideoExportAspect;
    } = {}) => {
      if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
        throw new Error('Video export is not supported in this browser.');
      }

      exportVideoSizeRef.current = VIDEO_EXPORT_SIZES[aspect];
      let stream: MediaStream | null = null;
      let playbackStartTimer: number | null = null;
      try {
        const playbackState = playbackStateHandleRef.current.current;
        silencePolyrhythmAudio();
        playbackState.progress = 0;
        playbackState.noteOrderHits?.clear();
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
          await preparePolyrhythmAudioRecording(studyRef.current),
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
        playbackStartTimer = window.setTimeout(() => {
          exportPlaybackActiveRef.current = true;
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
        if (playbackStartTimer != null) {
          window.clearTimeout(playbackStartTimer);
        }
        exportPlaybackActiveRef.current = false;
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

  const getInteractiveStudy = () => {
    const current = studyRef.current;
    const focusId = soloLayerDisplayRef.current ? displayLayerIdRef.current : ensembleFocusRef.current;
    return focusId ? { ...current, ensembleView: false, layers: current.layers.filter((layer) => layer.id === focusId) } : current;
  };

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      pointerStartRef.current = { x: event.clientX, y: event.clientY };
      pointerLayerHitRef.current = null;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const interactiveStudy = getInteractiveStudy();
      const hit = findPolyrhythmHit(
        interactiveStudy,
        getPolyrhythmCanvasMetrics(interactiveStudy, rect.width, rect.height, isMobileRef.current),
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
        pointerLayerHitRef.current = hit.layerId;
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
    [clearLongPress, onClearSelection, onSelectLayer, onSelectStep, onToggleStepAccent],
  );

  const handlePointerUp = useCallback(() => {
    const pendingLayer = pointerLayerHitRef.current;
    pointerLayerHitRef.current = null;
    pointerStartRef.current = null;
    if (pendingLayer) onOpenLayerMenu?.(pendingLayer);
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
  }, [clearLongPress, onOpenLayerMenu, onToggleStep]);

  const handlePointerCancel = useCallback(() => {
    pointerLayerHitRef.current = null;
    pointerStartRef.current = null;
    clearLongPress();
    pointerStepHitRef.current = null;
    longPressFiredRef.current = false;
  }, [clearLongPress]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const start = pointerStartRef.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
      clearLongPress();
      pointerLayerHitRef.current = null;
      pointerStepHitRef.current = null;
      pointerStartRef.current = null;
    }
    const canvas = canvasRef.current;
    if (!canvas || isMobileRef.current) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const currentStudy = getInteractiveStudy();
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
  }, [clearLongPress]);

  const handlePointerLeave = useCallback(() => {
    pointerLayerHitRef.current = null;
    pointerStartRef.current = null;
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

  const ensemblePanels = study.ensembleView && study.layers.length > 1 && !soloLayerDisplay
    ? getPolyrhythmEnsemblePanels(study, canvasSize.width, canvasSize.height) : [];
  return (
    <div className={`relative ${className ?? 'absolute inset-0 h-full w-full'}`}>
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
      className="absolute inset-0 h-full w-full"
    />
    {ensemblePanels.length > 0 && canvasSize.width > 0 ? (
      effectiveEnsembleFocus ? (
        <button type="button" className="absolute left-4 top-3 rounded-lg border border-white/15 bg-[#111820]/90 px-3 py-2 text-[11px] text-white/75"
          onClick={() => setEnsembleFocus(null)}>← Split View</button>
      ) : ensemblePanels.map((panel, index) => {
        const instrument = panel.layer.voice && panel.layer.voice !== 'standard'
          ? panel.layer.voice : panel.layer.soundSettings?.palette ?? study.soundSettings.palette;
        const soloed = study.layers.every((layer) => layer.soundEnabled === (layer.id === panel.layer.id));
        return (
          <div key={panel.layer.id} className="study-ensemble-header"
            style={{ left: panel.x + 4, top: panel.y + 3, width: panel.width - 8, color: panel.layer.color, opacity: panel.layer.soundEnabled ? 1 : 0.52 }}>
            <button type="button" className="study-ensemble-focus" aria-label={`Focus layer ${index + 1}`}
              onClick={() => { onSelectLayer(panel.layer.id); setEnsembleFocus(panel.layer.id); }}>
              <span>L{index + 1}</span>
              <small>{panel.layer.label ?? `${panel.layer.beatCount} steps`}</small>
            </button>
            {onSetLayerInstrument ? (
              <button type="button" data-study-instrument-trigger
                className="study-ensemble-switch study-ensemble-instrument"
                aria-label={`Change layer ${index + 1} instrument: ${instrument.replace(/-/g, ' ')}`}
                aria-expanded={instrumentPicker?.layerId === panel.layer.id}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setInstrumentCategory(Math.max(0, instrumentGroups.findIndex((group) => group.sounds.some(([id]) => id === instrument))));
                  setInstrumentPicker((current) => current?.layerId === panel.layer.id ? null : {
                    layerId: panel.layer.id,
                    x: Math.max(8, Math.min(window.innerWidth - 248, rect.left)),
                    y: Math.max(8, Math.min(window.innerHeight - 310, rect.bottom + 5)),
                  });
                }}><StudySoundGlyph instrument={instrument} /></button>
            ) : <span className="study-instrument-icon"><StudySoundGlyph instrument={instrument} /></span>}
            {onSoloLayer ? <button type="button" aria-label={`Solo layer ${index + 1}`} aria-pressed={soloed}
              className="study-ensemble-switch" onClick={() => onSoloLayer(panel.layer.id)}>S</button> : null}
            {onToggleLayerSound ? <button type="button" aria-label={`Mute layer ${index + 1}`} aria-pressed={!panel.layer.soundEnabled}
              className="study-ensemble-switch" onClick={() => onToggleLayerSound(panel.layer.id)}>M</button> : null}
          </div>
        );
      })
    ) : null}
    {instrumentPicker && onSetLayerInstrument ? createPortal(
      <div ref={instrumentPickerRef} className="study-ensemble-instruments" role="dialog" aria-label="Choose layer instrument"
        style={{ left: instrumentPicker.x, top: instrumentPicker.y }}>
        <div className="flex items-center justify-between px-1 pb-1 text-[10px] text-white/60">
          <span>Layer {study.layers.findIndex((layer) => layer.id === instrumentPicker.layerId) + 1} · Sound</span>
          <button type="button" aria-label="Close instruments" onClick={() => setInstrumentPicker(null)}>×</button>
        </div>
        <div className="flex gap-1 border-b border-white/10 pb-2" role="tablist" aria-label="Instrument groups">
          {instrumentGroups.map((group, index) => (
            <button key={group.label} type="button" role="tab" aria-selected={instrumentCategory === index}
              style={{ justifyContent: 'center', background: instrumentCategory === index ? 'rgba(127,215,255,0.12)' : 'transparent', color: instrumentCategory === index ? '#bceaff' : undefined }}
              className="flex-1" onClick={() => setInstrumentCategory(index)}>{group.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {instrumentGroups[instrumentCategory].sounds.map(([id, label]) => (
              <button key={id} type="button" onClick={() => {
                onSetLayerInstrument(instrumentPicker.layerId, id);
                setInstrumentPicker(null);
              }}><span className="study-instrument-icon"><StudySoundGlyph instrument={id} /></span>{label}</button>
            ))}
        </div>
      </div>, document.body) : null}
    </div>
  );
}
