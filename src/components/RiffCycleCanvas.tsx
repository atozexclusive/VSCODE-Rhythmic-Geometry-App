import {
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  DEFAULT_RIFF_DISPLAY_SETTINGS,
  drawCanvasDisplayBackground,
  getCanvasGlowMultiplier,
  getCanvasInactiveAlpha,
  getCanvasLineAlpha,
  type CanvasDisplaySettings,
} from '../lib/canvasDisplayThemes';
import {
  findRiffCycleHit,
  getReferenceStepPoint,
  getRiffCycleCanvasMetrics,
} from '../lib/riffCycleLayout';
import {
  canEditRiffStep,
  getDisplayStepCount,
  getEffectiveRiffStepStateAtReferenceStep,
  getLandingStepCount,
  getLandingWindowLength,
  getLandingSlotAtReferenceStep,
  getPhraseProgressAtReferenceProgress,
  getReferenceStepsPerBar,
  getReferenceStepsPerBeat,
  getReferenceStepsPerSecond,
  getResetBarCount,
  getResetStepCount,
  getRiffSequenceStateAtReferenceStep,
  getRiffSequenceTimeline,
  getRiffStepIndexAtReferenceStep,
  getVisibleRiffPhraseAtReferenceStep,
  isBackbeatStep,
  isForcedResetAtReferenceStep,
  isPhraseRestartAtReferenceStep,
  isReferenceBeatStart,
  type RiffCycleStudy,
  type RiffCycleViewMode,
} from '../lib/riffCycleStudy';
import {
  addAudioToCanvasStream,
  CANVAS_RECORDING_FRAME_RATE,
  CANVAS_RECORDING_VIDEO_BITS_PER_SECOND,
  getCanvasRecordingFormat,
  prepareCanvasRecordingDownload,
  recordMediaRecorderForDuration,
  CANVAS_EXPORT_PREROLL_SECONDS,
  SHORTS_EXPORT_POINT_SCALE,
  VIDEO_EXPORT_SIZES,
  type VideoExportAspect,
  type VideoExportDuration,
} from '../lib/videoExport';
import {
  createRiffCycleExportAudioStream,
  triggerBarMarkerCue,
  triggerBackbeatAccent,
  triggerReferencePulse,
  triggerResetCue,
  triggerRiffPulse,
} from '../lib/riffCycleAudio';

const TAU = Math.PI * 2;
const BAR_MARKER_FLASH_DURATION = 520;
const REFERENCE_BEAT_FLASH_DURATION = 280;
const CARVE_VIEW_STEP_THRESHOLD = 33;

interface RiffCyclePlaybackState {
  referenceProgress: number;
  lastTimestamp: number | null;
  previousReferenceStep: number;
  wasPlaying: boolean;
}

interface RiffCycleCanvasProps {
  study: RiffCycleStudy;
  selectedStep: number | null;
  restartToken: number;
  viewModeOverride?: RiffCycleViewMode;
  landingReferenceOverlayMode?: 'auto' | 'always' | 'off';
  layoutTopInset?: number;
  layoutBottomInset?: number;
  laneWindowStartStep?: number;
  laneWindowStepCount?: number;
  endingCycleGuideBarCount?: number;
  displaySettings?: CanvasDisplaySettings;
  presentationMode?: boolean;
  playbackStateRef?: MutableRefObject<RiffCyclePlaybackState>;
  playbackDriver?: boolean;
  audioEnabled?: boolean;
  onReferenceStepChange?: (referenceStep: number) => void;
  externalCanvasRef?: MutableRefObject<HTMLCanvasElement | null>;
  onSelectStep: (stepIndex: number | null) => void;
  onSetStepActive: (stepIndex: number, active: boolean) => void;
  onToggleAccent: (stepIndex: number) => void;
  onSetLandingStepActive: (slotIndex: number, active: boolean) => void;
  onToggleLandingAccent: (slotIndex: number) => void;
  className?: string;
}

interface LandingReferenceOverlayPoint {
  phraseIndex: number;
  landingSlot: number | null;
  active: boolean;
  accented: boolean;
  overridden: boolean;
  point: {
    index: number;
    angle: number;
    active: boolean;
    accented: boolean;
    x: number;
    y: number;
  };
}

type RiffCanvasPoint = {
  index: number;
  angle: number;
  active: boolean;
  accented: boolean;
  x: number;
  y: number;
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawTriangleMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size, y - size * 1.45);
  ctx.lineTo(x + size, y - size * 1.45);
  ctx.closePath();
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

function drawRiffCarves(
  ctx: CanvasRenderingContext2D,
  points: RiffCanvasPoint[],
  options: {
    centerX: number;
    centerY: number;
    radius: number;
    stepCount: number;
    color: string;
    glowMultiplier: number;
    pointScale: number;
    showLabels: boolean;
  },
): void {
  const activePoints = points.filter((point) => point.active).sort((a, b) => a.index - b.index);
  if (activePoints.length < 2) {
    return;
  }

  const labelCandidates: Array<{ x: number; y: number; label: string; span: number }> = [];

  activePoints.forEach((point, index) => {
    const nextPoint = activePoints[(index + 1) % activePoints.length];
    const stepSpan =
      nextPoint.index > point.index
        ? nextPoint.index - point.index
        : options.stepCount - point.index + nextPoint.index;
    if (stepSpan <= 0) {
      return;
    }

    const startAngle = point.angle;
    const endAngle = nextPoint.index > point.index ? nextPoint.angle : nextPoint.angle + TAU;
    const arcSpan = endAngle - startAngle;
    if (arcSpan <= 0.02) {
      return;
    }

    const midAngle = startAngle + arcSpan / 2;
    const carveDepth = Math.min(options.radius * 0.34, (16 + Math.min(34, stepSpan * 4.5)) * options.pointScale);
    const controlRadius = Math.max(options.radius * 0.5, options.radius - carveDepth);
    const controlX = options.centerX + Math.cos(midAngle) * controlRadius;
    const controlY = options.centerY + Math.sin(midAngle) * controlRadius;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(3,5,8,0.56)';
    ctx.lineWidth = 7.2 * options.pointScale;
    ctx.globalAlpha = 0.58;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.quadraticCurveTo(controlX, controlY, nextPoint.x, nextPoint.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1.75 * options.pointScale;
    ctx.globalAlpha = 0.76;
    ctx.shadowBlur = 11 * options.glowMultiplier * options.pointScale;
    ctx.shadowColor = `${options.color}99`;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.quadraticCurveTo(controlX, controlY, nextPoint.x, nextPoint.y);
    ctx.stroke();
    ctx.restore();

    if (options.showLabels && stepSpan > 1) {
      const labelRadius = Math.max(options.radius * 0.46, controlRadius - 11 * options.pointScale);
      labelCandidates.push({
        x: options.centerX + Math.cos(midAngle) * labelRadius,
        y: options.centerY + Math.sin(midAngle) * labelRadius,
        label: String(stepSpan),
        span: stepSpan,
      });
    }
  });

  if (!options.showLabels || labelCandidates.length === 0) {
    return;
  }

  const placedLabels: Array<{ x: number; y: number; radius: number }> = [];
  ctx.save();
  ctx.font = `${Math.max(8, 9.5 * options.pointScale)}px "SF Mono", "Fira Code", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  labelCandidates
    .sort((a, b) => b.span - a.span)
    .forEach((candidate) => {
      const textWidth = ctx.measureText(candidate.label).width;
      const candidateRadius = Math.max(7 * options.pointScale, textWidth / 2 + 4 * options.pointScale);
      const collides = placedLabels.some(
        (placed) =>
          Math.hypot(candidate.x - placed.x, candidate.y - placed.y) <
          candidateRadius + placed.radius + 2.5 * options.pointScale,
      );
      if (collides) {
        return;
      }
      placedLabels.push({ x: candidate.x, y: candidate.y, radius: candidateRadius });

      ctx.save();
      ctx.lineWidth = 4 * options.pointScale;
      ctx.strokeStyle = 'rgba(2,4,7,0.9)';
      ctx.strokeText(candidate.label, candidate.x, candidate.y);
      ctx.fillStyle = `${options.color}E6`;
      ctx.shadowBlur = 7 * options.glowMultiplier * options.pointScale;
      ctx.shadowColor = `${options.color}88`;
      ctx.fillText(candidate.label, candidate.x, candidate.y);
      ctx.restore();
    });
  ctx.restore();
}

function getBarMarkerIntervalBarCount(study: RiffCycleStudy): number | null {
  const markerInterval = study.barMarkerInterval ?? 'pattern';
  if (markerInterval === 'none') {
    return null;
  }
  if (markerInterval === 'pattern') {
    return null;
  }
  return markerInterval;
}

function isBarMarkerCueStep(study: RiffCycleStudy, referenceStep: number): boolean {
  if ((study.barMarkerInterval ?? 'pattern') === 'pattern') {
    const riffStepCount = Math.max(1, Math.round(study.riff.stepCount || 1));
    const resetStepCount = getResetStepCount(study);
    const stepWithinReturn =
      resetStepCount == null
        ? referenceStep
        : ((referenceStep % resetStepCount) + resetStepCount) % resetStepCount;
    return stepWithinReturn % riffStepCount === 0;
  }

  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  if (stepsPerBar <= 0 || referenceStep % stepsPerBar !== 0) {
    return false;
  }
  const interval = getBarMarkerIntervalBarCount(study);
  if (interval == null) {
    return false;
  }
  const barIndex = Math.floor(referenceStep / stepsPerBar);
  return barIndex % interval === 0;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function getFreeResolutionBarCount(study: RiffCycleStudy): number {
  const phraseSteps = Math.max(1, Math.round(study.riff.stepCount || 1));
  const stepsPerBar = Math.max(1, getReferenceStepsPerBar(study.reference));
  return Math.max(1, phraseSteps / gcd(phraseSteps, stepsPerBar));
}

function getFreeResolutionStepCount(study: RiffCycleStudy): number {
  return getFreeResolutionBarCount(study) * Math.max(1, getReferenceStepsPerBar(study.reference));
}

function isFreeResolutionAtReferenceStep(study: RiffCycleStudy, referenceStep: number): boolean {
  if (getResetStepCount(study) != null || referenceStep <= 0) {
    return false;
  }
  return referenceStep % getFreeResolutionStepCount(study) === 0;
}

function getVisibleBarNumber(study: RiffCycleStudy, barIndex: number): number {
  const resetBarCount = getResetBarCount(study.riff);
  if (resetBarCount == null) {
    const barCount = getFreeResolutionBarCount(study);
    const normalizedBarIndex = ((barIndex % barCount) + barCount) % barCount;
    return normalizedBarIndex + 1;
  }
  if (resetBarCount <= 0) {
    return barIndex + 1;
  }
  const normalizedBarIndex = ((barIndex % resetBarCount) + resetBarCount) % resetBarCount;
  return normalizedBarIndex + 1;
}

function isVisibleBarCycleStart(study: RiffCycleStudy, barIndex: number): boolean {
  const resetBarCount = getResetBarCount(study.riff);
  const barCount =
    resetBarCount == null
      ? getFreeResolutionBarCount(study)
      : Math.max(1, resetBarCount);
  return ((barIndex % barCount) + barCount) % barCount === 0;
}

function shouldUseAbsoluteLaneWindow(study: RiffCycleStudy): boolean {
  if (study.viewMode !== 'unwrapped') {
    return false;
  }
  const resetBarCount = getResetBarCount(study.riff);
  return resetBarCount == null || resetBarCount > Math.max(1, study.reference.barCountForDisplay);
}

function getEffectiveLaneWindowStartStep(
  study: RiffCycleStudy,
  currentAbsoluteReferenceStep: number,
  laneWindowStartStep?: number,
  laneWindowStepCount?: number,
): number | undefined {
  if (laneWindowStartStep != null) {
    return laneWindowStartStep;
  }

  const displayStepCount = getDisplayStepCount(study);
  const visibleStepCount = Math.max(
    1,
    Math.min(displayStepCount, Math.floor(laneWindowStepCount ?? displayStepCount)),
  );

  if (!shouldUseAbsoluteLaneWindow(study)) {
    if (visibleStepCount >= displayStepCount) {
      return undefined;
    }
    const currentDisplayReferenceStep =
      ((currentAbsoluteReferenceStep % displayStepCount) + displayStepCount) %
      displayStepCount;
    const maxStart = Math.max(0, displayStepCount - visibleStepCount);
    return Math.min(
      maxStart,
      Math.floor(currentDisplayReferenceStep / visibleStepCount) * visibleStepCount,
    );
  }

  return Math.floor(Math.max(0, currentAbsoluteReferenceStep) / visibleStepCount) * visibleStepCount;
}

export default function RiffCycleCanvas({
  study,
  selectedStep,
  restartToken,
  viewModeOverride,
  landingReferenceOverlayMode = 'auto',
  layoutTopInset = 0,
  layoutBottomInset = 0,
  laneWindowStartStep,
  laneWindowStepCount,
  endingCycleGuideBarCount,
  displaySettings = DEFAULT_RIFF_DISPLAY_SETTINGS,
  presentationMode = false,
  playbackStateRef,
  playbackDriver = true,
  audioEnabled = true,
  onReferenceStepChange,
  externalCanvasRef,
  onSelectStep,
  onSetStepActive,
  onToggleAccent,
  onSetLandingStepActive,
  onToggleLandingAccent,
  className,
}: RiffCycleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const studyRef = useRef(study);
  const selectedStepRef = useRef(selectedStep);
  const hoveredStepRef = useRef<number | null>(null);
  const localPlaybackStateRef = useRef<RiffCyclePlaybackState>({
    referenceProgress: 0,
    lastTimestamp: null,
    previousReferenceStep: 0,
    wasPlaying: study.playing,
  });
  const resetFlashUntilRef = useRef(0);
  const referenceBeatFlashUntilRef = useRef(0);
  const referenceBeatFlashStepRef = useRef<number | null>(null);
  const referenceBeatFlashBeatRef = useRef<number | null>(null);
  const barMarkerFlashUntilRef = useRef(0);
  const barMarkerFlashStepRef = useRef<number | null>(null);
  const riffAttackUntilRef = useRef<number[]>([]);
  const laneAttackUntilRef = useRef(0);
  const laneAttackReferenceStepRef = useRef<number | null>(null);
  const restartInitializedRef = useRef(false);
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  const layoutTopInsetRef = useRef(layoutTopInset);
  const layoutBottomInsetRef = useRef(layoutBottomInset);
  const laneWindowStartStepRef = useRef(laneWindowStartStep);
  const laneWindowStepCountRef = useRef(laneWindowStepCount);
  const endingCycleGuideBarCountRef = useRef(endingCycleGuideBarCount);
  const displaySettingsRef = useRef(displaySettings);
  const presentationModeRef = useRef(presentationMode);
  const playbackStateHandleRef = useRef(playbackStateRef ?? localPlaybackStateRef);
  const playbackDriverRef = useRef(playbackDriver);
  const audioEnabledRef = useRef(audioEnabled);
  const exportVideoSizeRef = useRef<{ width: number; height: number } | null>(null);
  const onReferenceStepChangeRef = useRef(onReferenceStepChange);
  const activePointerIdRef = useRef<number | null>(null);
  const paintActiveRef = useRef<boolean | null>(null);
  const paintedStepsRef = useRef<Set<number>>(new Set());
  const pendingLongPressRef = useRef<{
    pointerId: number;
    stepIndex: number;
    landingSlot: number | null;
    x: number;
    y: number;
    nextActive: boolean;
    longPressed: boolean;
  } | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const resolvedStudy =
    viewModeOverride == null ? study : { ...study, viewMode: viewModeOverride };

  studyRef.current = resolvedStudy;
  selectedStepRef.current = selectedStep;
  isMobileRef.current = isMobile;
  layoutTopInsetRef.current = layoutTopInset;
  layoutBottomInsetRef.current = layoutBottomInset;
  laneWindowStartStepRef.current = laneWindowStartStep;
  laneWindowStepCountRef.current = laneWindowStepCount;
  endingCycleGuideBarCountRef.current = endingCycleGuideBarCount;
  displaySettingsRef.current = displaySettings;
  presentationModeRef.current = presentationMode;
  playbackStateHandleRef.current = playbackStateRef ?? localPlaybackStateRef;
  playbackDriverRef.current = playbackDriver;
  audioEnabledRef.current = audioEnabled;
  onReferenceStepChangeRef.current = onReferenceStepChange;

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

    const rawDpr = window.devicePixelRatio || 1;
    const dpr = exportVideoSize ? 1 : Math.min(rawDpr, isMobileRef.current ? 1.75 : 2);
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
    const currentDisplaySettings = displaySettingsRef.current;
    const currentHoveredStep = isMobileRef.current ? null : hoveredStepRef.current;
    const exportLayoutMode = Boolean(exportVideoSize);
    const pointScale = exportLayoutMode ? SHORTS_EXPORT_POINT_SCALE * 1.16 : 1;
    const shellScale = exportLayoutMode ? 1.45 : 1;
    const exportLabelScale = exportLayoutMode ? 1.55 : 1;
    const exportSidePadding = exportLayoutMode ? 96 : undefined;
    const lineAlpha = getCanvasLineAlpha(currentDisplaySettings);
    const inactiveAlpha = getCanvasInactiveAlpha(currentDisplaySettings);
    const circularPhraseBoundsActive =
      currentStudy.showPhraseBounds && currentStudy.viewMode === 'circular';
    const glowMultiplier = getCanvasGlowMultiplier(
      currentDisplaySettings,
      presentationModeRef.current,
    );

    ctx.clearRect(0, 0, rect.width, rect.height);
    drawCanvasDisplayBackground(ctx, rect.width, rect.height, currentDisplaySettings, {
      presentationMode: presentationModeRef.current,
      seed: 47,
    });

    const totalDisplaySteps = getDisplayStepCount(currentStudy);
    const playbackState = playbackStateHandleRef.current.current;
    const referenceProgress = playbackState.referenceProgress;
    const currentAbsoluteReferenceStep = Math.floor(referenceProgress);
    const resetStepCount = getResetStepCount(currentStudy);
    const effectiveLaneWindowStartStep = getEffectiveLaneWindowStartStep(
      currentStudy,
      currentAbsoluteReferenceStep,
      laneWindowStartStepRef.current,
      laneWindowStepCountRef.current,
    );
    const metrics = getRiffCycleCanvasMetrics(
      currentStudy,
      rect.width,
      rect.height,
      isMobileRef.current || exportLayoutMode,
      layoutTopInsetRef.current,
      layoutBottomInsetRef.current,
      effectiveLaneWindowStartStep,
      laneWindowStepCountRef.current,
      { sidePadding: exportSidePadding },
    );
    const stepsPerBar = getReferenceStepsPerBar(currentStudy.reference);
    const stepsPerBeat = getReferenceStepsPerBeat(currentStudy.reference);
    const currentReferenceStep =
      ((currentAbsoluteReferenceStep % totalDisplaySteps) + totalDisplaySteps) % totalDisplaySteps;
    const currentLaneReferenceStep =
      shouldUseAbsoluteLaneWindow(currentStudy) ? currentAbsoluteReferenceStep : currentReferenceStep;
    const stepWithinBar = ((referenceProgress % stepsPerBar) + stepsPerBar) % stepsPerBar;
    const referenceCursorPoint = getReferenceStepPoint(currentStudy, metrics, stepWithinBar);
    const phraseProgress = getPhraseProgressAtReferenceProgress(currentStudy, referenceProgress);
    const visibleRiff = getVisibleRiffPhraseAtReferenceStep(
      currentStudy,
      currentAbsoluteReferenceStep,
    );
    const sequenceState = getRiffSequenceStateAtReferenceStep(
      currentStudy,
      currentAbsoluteReferenceStep,
    );
    const sequenceTimeline = currentStudy.riffSequenceEnabled
      ? getRiffSequenceTimeline(currentStudy)
      : null;
    const phraseAngle =
      -Math.PI / 2 +
      ((currentStudy.riff.rotationOffset % 360) / 360) * TAU +
      (phraseProgress / visibleRiff.stepCount) * TAU;
    const phraseCursorPoint = {
      x: metrics.circleCenterX + Math.cos(phraseAngle) * metrics.innerRadius,
      y: metrics.circleCenterY + Math.sin(phraseAngle) * metrics.innerRadius,
    };
    const riffPoints = visibleRiff.activeSteps.map((active, index) => {
      const angle =
        -Math.PI / 2 +
        ((currentStudy.riff.rotationOffset % 360) / 360) * TAU +
        (index / visibleRiff.stepCount) * TAU;

      return {
        index,
        angle,
        active,
        accented: visibleRiff.accents[index] ?? false,
        x: metrics.circleCenterX + Math.cos(angle) * metrics.innerRadius,
        y: metrics.circleCenterY + Math.sin(angle) * metrics.innerRadius,
      };
    });
    const activeRiffPoints = riffPoints.filter((point) => point.active);
    const carveViewActive =
      currentStudy.showStructureView &&
      currentStudy.viewMode === 'circular' &&
      visibleRiff.stepCount >= CARVE_VIEW_STEP_THRESHOLD;
    const currentRiffStep = getRiffStepIndexAtReferenceStep(
      currentStudy,
      currentAbsoluteReferenceStep,
    );
    const currentRiffStepState = getEffectiveRiffStepStateAtReferenceStep(
      currentStudy,
      currentAbsoluteReferenceStep,
    );
    const currentRiffPoint = riffPoints[currentRiffStep] ?? null;
    const isFreeRestartMode = getResetStepCount(currentStudy) == null;
    const landingWindowLength = getLandingWindowLength(currentStudy);
    const normalizedStepWithinLandingWindow =
      ((currentAbsoluteReferenceStep % landingWindowLength) + landingWindowLength) %
      landingWindowLength;
    const finalBarStartStep = Math.max(0, landingWindowLength - stepsPerBar);
    const landingReferenceOverlayVisible =
      currentStudy.landingEditEnabled &&
      !isFreeRestartMode &&
      (landingReferenceOverlayMode === 'always' ||
        (landingReferenceOverlayMode === 'auto' &&
          normalizedStepWithinLandingWindow >= finalBarStartStep));
    const landingReferenceStates: LandingReferenceOverlayPoint[] = landingReferenceOverlayVisible
      ? Array.from({ length: getLandingStepCount(currentStudy) }, (_, slotIndex) => {
          const referenceStep =
            landingWindowLength - getLandingStepCount(currentStudy) + slotIndex;
          const state = getEffectiveRiffStepStateAtReferenceStep(currentStudy, referenceStep);
          const point = riffPoints[state.phraseIndex];
          return point && state.active
            ? {
                ...state,
                point,
              }
            : null;
        }).filter((state): state is LandingReferenceOverlayPoint => state != null)
      : [];
    const flashActive =
      typeof performance !== 'undefined' && performance.now() < resetFlashUntilRef.current;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const selectedPoint =
      selectedStepRef.current == null ? null : riffPoints[selectedStepRef.current] ?? null;
    const phraseRestartSteps: number[] = [];
    for (let step = 0; step < metrics.totalDisplaySteps; step += 1) {
      if (isPhraseRestartAtReferenceStep(currentStudy, step)) {
        phraseRestartSteps.push(step);
      }
    }
    const latestLandingStep =
      [...phraseRestartSteps].reverse().find((step) => step <= currentReferenceStep) ??
      phraseRestartSteps[phraseRestartSteps.length - 1] ??
      0;
    const nextLandingStep =
      phraseRestartSteps.find((step) => step > currentReferenceStep) ?? phraseRestartSteps[0] ?? 0;

    riffAttackUntilRef.current.length = visibleRiff.stepCount;

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.035 * lineAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(metrics.circleCenterX, metrics.topPadding - 10);
    ctx.lineTo(metrics.circleCenterX, metrics.circleCenterY + metrics.outerRadius + 16);
    ctx.stroke();
    ctx.restore();

    if (sequenceState && sequenceTimeline && sequenceTimeline.entries.length > 0) {
      const visibleEntries = sequenceTimeline.entries.slice(0, 12);
      const chipWidth = exportLayoutMode ? 36 : 29;
      const chipHeight = exportLayoutMode ? 20 : 17;
      const gap = exportLayoutMode ? 5 : 4;
      const totalWidth = visibleEntries.length * chipWidth + (visibleEntries.length - 1) * gap;
      const startX = metrics.circleCenterX - totalWidth / 2;
      const stripY = Math.max(22, metrics.circleCenterY - metrics.outerRadius - (exportLayoutMode ? 92 : 72));

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${exportLayoutMode ? 9.5 : 8}px "SF Mono", "Fira Code", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 0;
      ctx.fillText(
        `CELL ${sequenceState.cell.label} · ${sequenceState.cell.stepCount}`,
        metrics.circleCenterX,
        stripY - (exportLayoutMode ? 10 : 8),
      );
      ctx.font = `${exportLayoutMode ? 11.5 : 9}px "SF Mono", "Fira Code", monospace`;
      visibleEntries.forEach((entry, index) => {
        const active = entry.sequenceIndex === sequenceState.sequenceIndex;
        const x = startX + index * (chipWidth + gap);
        drawRoundedRect(ctx, x, stripY, chipWidth, chipHeight, 7);
        ctx.fillStyle = active ? `${currentStudy.riff.color}2E` : 'rgba(255,255,255,0.055)';
        ctx.fill();
        ctx.strokeStyle = active ? `${currentStudy.riff.color}C4` : 'rgba(255,255,255,0.13)';
        ctx.lineWidth = active ? 1.45 : 0.9;
        ctx.stroke();
        ctx.fillStyle = active ? currentStudy.riff.color : 'rgba(255,255,255,0.48)';
        ctx.shadowBlur = active ? 9 * glowMultiplier : 0;
        ctx.shadowColor = active ? `${currentStudy.riff.color}88` : 'transparent';
        ctx.fillText(entry.cell.label, x + chipWidth / 2, stripY + chipHeight / 2);
      });
      if (sequenceTimeline.entries.length > visibleEntries.length) {
        ctx.fillStyle = 'rgba(255,255,255,0.34)';
        ctx.shadowBlur = 0;
        ctx.fillText('...', startX + totalWidth + 13, stripY + chipHeight / 2);
      }
      ctx.restore();
    }

    if (currentStudy.showReferenceRing) {
      ctx.save();
      ctx.beginPath();
      metrics.referenceVertices.forEach((vertex, index) => {
        if (index === 0) {
          ctx.moveTo(vertex.x, vertex.y);
        } else {
          ctx.lineTo(vertex.x, vertex.y);
        }
      });
      ctx.closePath();
      ctx.strokeStyle = flashActive
        ? 'rgba(255,209,102,0.56)'
        : `rgba(255,255,255,${0.16 * lineAlpha})`;
      ctx.lineWidth = (flashActive ? 2.3 : 1.45) * shellScale;
      if (flashActive || currentStudy.emphasisMode === 'groove') {
        ctx.fillStyle = flashActive ? 'rgba(255,209,102,0.055)' : 'rgba(255,255,255,0.022)';
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();

      metrics.referenceVertices.forEach((vertex, index) => {
        const backbeatBeats =
          currentStudy.reference.backbeatBeats?.length
            ? currentStudy.reference.backbeatBeats
            : currentStudy.reference.backbeatBeat != null
              ? [currentStudy.reference.backbeatBeat]
              : [];
        const isBackbeatVertex =
          currentStudy.reference.showBackbeat &&
          backbeatBeats.includes(index + 1);
        const beatFlashStrength =
          referenceBeatFlashBeatRef.current === index
            ? Math.max(0, (referenceBeatFlashUntilRef.current - now) / REFERENCE_BEAT_FLASH_DURATION)
            : 0;
        const vertexRadius =
          ((index === 0 ? 6.2 : isBackbeatVertex ? 5.8 : 5.1) +
            beatFlashStrength * (isBackbeatVertex ? 3.4 : 3)) *
          shellScale;

        ctx.save();
        ctx.strokeStyle =
          isBackbeatVertex
            ? 'rgba(255,136,194,0.24)'
            : 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1 * shellScale;
        ctx.beginPath();
        ctx.moveTo(metrics.circleCenterX, metrics.circleCenterY);
        ctx.lineTo(vertex.x, vertex.y);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = isBackbeatVertex
          ? 'rgba(255,136,194,0.9)'
          : index === 0
            ? 'rgba(255,255,255,0.9)'
            : 'rgba(255,255,255,0.52)';
        ctx.shadowBlur = (8 + beatFlashStrength * 18) * glowMultiplier * shellScale;
        ctx.shadowColor = isBackbeatVertex
          ? 'rgba(255,136,194,0.48)'
          : 'rgba(255,255,255,0.24)';
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, vertexRadius, 0, TAU);
        ctx.fill();
        ctx.restore();

        if (beatFlashStrength > 0) {
          ctx.save();
          ctx.strokeStyle = isBackbeatVertex ? 'rgba(255,136,194,0.86)' : 'rgba(255,255,255,0.72)';
          ctx.lineWidth = (isBackbeatVertex ? 2.25 : 1.55) * shellScale;
          ctx.globalAlpha = Math.min(1, beatFlashStrength + 0.15);
          ctx.shadowBlur = (9 + beatFlashStrength * 18) * glowMultiplier * shellScale;
          ctx.shadowColor = isBackbeatVertex ? 'rgba(255,136,194,0.6)' : 'rgba(255,255,255,0.42)';
          ctx.beginPath();
          ctx.arc(vertex.x, vertex.y, vertexRadius + (6 + beatFlashStrength * 4) * shellScale, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.fillStyle =
          isBackbeatVertex
            ? 'rgba(255,136,194,0.92)'
            : index === 0
              ? 'rgba(255,255,255,0.82)'
              : 'rgba(255,255,255,0.66)';
        ctx.font = `${11 * shellScale * exportLabelScale}px "SF Mono", "Fira Code", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}`, vertex.x, vertex.y - 19 * shellScale * exportLabelScale);
        ctx.restore();
      });

      metrics.referencePerimeterPoints.forEach((point, index) => {
        const isDownbeat = currentStudy.reference.showDownbeats && index === 0;
        const isBeat = isReferenceBeatStart(currentStudy, index);
        const isBackbeat = isBackbeatStep(currentStudy, index);
        const beatFlashStrength =
          referenceBeatFlashStepRef.current === index
            ? Math.max(0, (referenceBeatFlashUntilRef.current - now) / REFERENCE_BEAT_FLASH_DURATION)
            : 0;
        const pointRadius =
          ((isDownbeat ? 5.8 : isBackbeat ? 5.1 : isBeat ? 4.2 : 2.4) +
            beatFlashStrength * (isBackbeat ? 3.4 : isBeat ? 3 : 2.2)) *
          shellScale;

        ctx.save();
        ctx.fillStyle = isBackbeat
          ? 'rgba(255,136,194,0.9)'
          : isDownbeat
            ? 'rgba(255,255,255,0.88)'
            : isBeat
              ? 'rgba(255,255,255,0.56)'
              : 'rgba(255,255,255,0.16)';
        ctx.shadowBlur = (isBeat ? 6 + beatFlashStrength * 18 : 0) * glowMultiplier * shellScale;
        ctx.shadowColor = isBackbeat
          ? 'rgba(255,136,194,0.42)'
          : 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointRadius, 0, TAU);
        ctx.fill();
        ctx.restore();

        if (beatFlashStrength > 0) {
          ctx.save();
          ctx.strokeStyle = isBackbeat ? 'rgba(255,136,194,0.86)' : 'rgba(255,255,255,0.72)';
          ctx.lineWidth = (isBackbeat ? 2.25 : 1.55) * shellScale;
          ctx.globalAlpha = Math.min(1, beatFlashStrength + 0.15);
          ctx.shadowBlur = (9 + beatFlashStrength * 18) * glowMultiplier * shellScale;
          ctx.shadowColor = isBackbeat ? 'rgba(255,136,194,0.6)' : 'rgba(255,255,255,0.42)';
          ctx.beginPath();
          ctx.arc(point.x, point.y, pointRadius + (6 + beatFlashStrength * 4) * shellScale, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      });

      if (flashActive) {
        const highlightIndices = [
          metrics.referencePerimeterPoints.length - 2,
          metrics.referencePerimeterPoints.length - 1,
          0,
          1,
          2,
        ].filter(
          (value, index, array) =>
            value >= 0 && value < metrics.referencePerimeterPoints.length && array.indexOf(value) === index,
        );
        ctx.save();
        ctx.strokeStyle = 'rgba(255,209,102,0.82)';
        ctx.lineWidth = 3.2;
        ctx.shadowBlur = 14 * glowMultiplier;
        ctx.shadowColor = 'rgba(255,209,102,0.52)';
        ctx.beginPath();
        highlightIndices.forEach((pointIndex, index) => {
          const point = metrics.referencePerimeterPoints[pointIndex];
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        ctx.restore();
      }
    }

    if (currentStudy.showPhraseRing) {
      ctx.save();
      ctx.strokeStyle = flashActive
        ? `${currentStudy.riff.color}66`
        : `${currentStudy.riff.color}${Math.round(0x22 * lineAlpha).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(metrics.circleCenterX, metrics.circleCenterY, metrics.innerRadius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (currentStudy.showPhraseRing && !carveViewActive && activeRiffPoints.length >= 2) {
      ctx.save();
      ctx.fillStyle = currentStudy.riff.color;
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.moveTo(activeRiffPoints[0].x, activeRiffPoints[0].y);
      for (let index = 1; index < activeRiffPoints.length; index += 1) {
        ctx.lineTo(activeRiffPoints[index].x, activeRiffPoints[index].y);
      }
      if (activeRiffPoints.length >= 3) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = currentStudy.riff.color;
      ctx.lineWidth = 2.1;
      ctx.globalAlpha = 0.9;
      ctx.shadowBlur = 14 * glowMultiplier;
      ctx.shadowColor = currentStudy.riff.color;
      ctx.beginPath();
      ctx.moveTo(activeRiffPoints[0].x, activeRiffPoints[0].y);
      for (let index = 1; index < activeRiffPoints.length; index += 1) {
        ctx.lineTo(activeRiffPoints[index].x, activeRiffPoints[index].y);
      }
      if (activeRiffPoints.length >= 3) {
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    }

    if (currentStudy.showPhraseRing && carveViewActive) {
      drawRiffCarves(ctx, riffPoints, {
        centerX: metrics.circleCenterX,
        centerY: metrics.circleCenterY,
        radius: metrics.innerRadius,
        stepCount: visibleRiff.stepCount,
        color: currentStudy.riff.color,
        glowMultiplier,
        pointScale,
        showLabels: circularPhraseBoundsActive,
      });
    }

    if (!carveViewActive && circularPhraseBoundsActive && activeRiffPoints.length >= 2) {
      const activePoints = [...activeRiffPoints].sort((a, b) => a.index - b.index);
      const groupRadius = metrics.innerRadius;
      const labelRingRadius =
        groupRadius +
        (visibleRiff.stepCount > 24 ? 19 : 16) * pointScale +
        (exportLayoutMode ? 3 * pointScale : 0);
      const labelCandidates: Array<{
        x: number;
        y: number;
        label: string;
        span: number;
      }> = [];

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      activePoints.forEach((point, index) => {
        const nextPoint = activePoints[(index + 1) % activePoints.length];
        const stepSpan =
          nextPoint.index > point.index
            ? nextPoint.index - point.index
            : visibleRiff.stepCount - point.index + nextPoint.index;
        if (stepSpan <= 0) {
          return;
        }

        const startAngle = point.angle;
        const endAngle =
          nextPoint.index > point.index ? nextPoint.angle : nextPoint.angle + TAU;
        const arcSpan = endAngle - startAngle;
        if (arcSpan <= 0.035) {
          return;
        }

        const arcInset = Math.min(0.16, Math.max(0.075, arcSpan * 0.24));
        const arcStart = startAngle + arcInset;
        const arcEnd = endAngle - arcInset;
        const midAngle = startAngle + arcSpan / 2;
        const labelX = metrics.circleCenterX + Math.cos(midAngle) * labelRingRadius;
        const labelY = metrics.circleCenterY + Math.sin(midAngle) * labelRingRadius;

        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = currentStudy.riff.color;
        ctx.lineWidth = 1.45 * pointScale;
        ctx.shadowBlur = 10 * glowMultiplier * pointScale;
        ctx.shadowColor = `${currentStudy.riff.color}88`;
        ctx.beginPath();
        ctx.arc(metrics.circleCenterX, metrics.circleCenterY, groupRadius, arcStart, arcEnd);
        ctx.stroke();
        ctx.restore();

        if (stepSpan > 1) {
          labelCandidates.push({
            x: labelX,
            y: labelY,
            label: String(stepSpan),
            span: stepSpan,
          });
        }
      });

      const placedLabels: Array<{ x: number; y: number; radius: number }> = [];
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.max(8, 10 * pointScale)}px "SF Mono", "Fira Code", monospace`;
      labelCandidates
        .sort((a, b) => b.span - a.span)
        .forEach((candidate) => {
          const textWidth = ctx.measureText(candidate.label).width;
          const candidateRadius = Math.max(8 * pointScale, textWidth / 2 + 4 * pointScale);
          const collides = placedLabels.some(
            (placed) =>
              Math.hypot(candidate.x - placed.x, candidate.y - placed.y) <
              candidateRadius + placed.radius + 2.5 * pointScale,
          );
          if (collides) {
            return;
          }
          placedLabels.push({ x: candidate.x, y: candidate.y, radius: candidateRadius });

          ctx.save();
          ctx.lineWidth = 4 * pointScale;
          ctx.strokeStyle = 'rgba(8,9,13,0.88)';
          ctx.shadowBlur = 7 * glowMultiplier * pointScale;
          ctx.shadowColor = 'rgba(0,0,0,0.82)';
          ctx.strokeText(candidate.label, candidate.x, candidate.y);
          ctx.fillStyle = currentStudy.riff.color;
          ctx.globalAlpha = 0.9;
          ctx.shadowBlur = 6 * glowMultiplier * pointScale;
          ctx.shadowColor = `${currentStudy.riff.color}AA`;
          ctx.fillText(candidate.label, candidate.x, candidate.y);
          ctx.restore();
        });
      ctx.restore();

      ctx.restore();
    }

    riffPoints.forEach((point) => {
      const isSelected = selectedStepRef.current === point.index;
      const isHovered = !isSelected && currentHoveredStep === point.index;
      const isCurrent = currentRiffStep === point.index;
      const isPhraseRestart = point.index === 0;
      const effectiveActive = isCurrent ? currentRiffStepState.active : point.active;
      const effectiveAccented = isCurrent ? currentRiffStepState.accented : point.accented;
      const attackRemaining = Math.max(
        0,
        ((riffAttackUntilRef.current[point.index] ?? 0) - now) /
          (effectiveAccented ? 320 : 220),
      );
      const radius =
        ((isSelected
          ? 8.4
          : isHovered
            ? effectiveActive
              ? 7
              : 5.4
            : effectiveActive
              ? carveViewActive
                ? effectiveAccented || isPhraseRestart || isCurrent || isSelected || isHovered
                  ? 5.75
                  : 4.35
                : circularPhraseBoundsActive
                  ? 6.15
                  : 5.65
              : carveViewActive
                ? 1.75
                : circularPhraseBoundsActive
                  ? 3.8
                  : 3.35) +
          attackRemaining * (effectiveAccented ? 3 : 1.8)) *
        pointScale;

      if (isHovered) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.65 * pointScale;
        ctx.shadowBlur = 15 * glowMultiplier * pointScale;
        ctx.shadowColor = currentStudy.riff.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 5.6 * pointScale, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = currentStudy.riff.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 8.5 * pointScale, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.88)';
        ctx.lineWidth = 1.45 * pointScale;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 4.5 * pointScale, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = effectiveActive
        ? currentStudy.riff.color
        : carveViewActive
          ? 'rgba(255,255,255,0.18)'
        : circularPhraseBoundsActive
          ? 'rgba(255,255,255,0.38)'
          : 'rgba(255,255,255,0.24)';
      ctx.globalAlpha = effectiveActive
        ? carveViewActive
          ? Math.min(0.95, (isCurrent || isHovered ? 0.95 : 0.74) + attackRemaining * 0.24)
          : Math.min(1, (isCurrent || isHovered ? 1 : 0.88) + attackRemaining * 0.3)
        : carveViewActive
          ? (isHovered ? 0.38 : 0.13) * inactiveAlpha
        : circularPhraseBoundsActive
          ? isHovered
            ? 0.62
            : 0.48
          : (isHovered ? 0.52 : 0.34) * inactiveAlpha;
      ctx.shadowBlur = effectiveActive
        ? carveViewActive
          ? ((isCurrent || isHovered ? 12 : 5.5) + attackRemaining * 14) * glowMultiplier * pointScale
          : ((isCurrent || isHovered ? 16 : 9) + attackRemaining * 18) * glowMultiplier * pointScale
        : isHovered
          ? 10 * glowMultiplier * pointScale
          : carveViewActive
            ? 0.4 * glowMultiplier * pointScale
          : circularPhraseBoundsActive
            ? 3 * glowMultiplier * pointScale
            : 1.4 * glowMultiplier * pointScale;
      ctx.shadowColor =
        effectiveActive || isHovered
          ? currentStudy.riff.color
          : circularPhraseBoundsActive
            ? 'rgba(255,255,255,0.16)'
            : 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, TAU);
      ctx.fill();
      ctx.restore();

      if (circularPhraseBoundsActive && !effectiveActive) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.24)';
        ctx.lineWidth = 0.9 * pointScale;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 1.2 * pointScale, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      if (attackRemaining > 0 && effectiveActive) {
        ctx.save();
        ctx.strokeStyle = effectiveAccented
          ? 'rgba(255,209,102,0.95)'
          : `${currentStudy.riff.color}CC`;
        ctx.lineWidth = (effectiveAccented ? 2.25 : 1.55) * pointScale;
        ctx.globalAlpha = Math.min(1, attackRemaining + 0.15);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 6 * pointScale + attackRemaining * 4 * pointScale, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      if (effectiveAccented || isPhraseRestart) {
        ctx.save();
        ctx.strokeStyle = effectiveAccented
          ? 'rgba(255,209,102,0.88)'
          : 'rgba(255,255,255,0.46)';
        ctx.lineWidth = (effectiveAccented ? 1.9 : 1.2) * pointScale;
        ctx.beginPath();
        ctx.arc(
          point.x,
          point.y,
          radius + (effectiveAccented ? 3.6 : 2.8) * pointScale,
          0,
          TAU,
        );
        ctx.stroke();
        ctx.restore();
      }

      if (effectiveAccented && effectiveActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,209,102,0.96)';
        ctx.strokeStyle = 'rgba(17,17,22,0.72)';
        ctx.lineWidth = pointScale;
        drawDiamondMarker(
          ctx,
          point.x,
          point.y,
          Math.max(2.8 * pointScale, radius * 0.42),
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (isPhraseRestart) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        drawTriangleMarker(
          ctx,
          point.x,
          point.y - (isSelected ? 14 : 12),
          isSelected ? 4.2 : 3.5,
        );
        ctx.fill();
        ctx.restore();
      }

      if (currentStudy.showStepLabels && !carveViewActive && !circularPhraseBoundsActive) {
        const densityLabelScale =
          visibleRiff.stepCount > 28 ? 0.76 : visibleRiff.stepCount > 20 ? 0.86 : 1;
        const labelScale = densityLabelScale * exportLabelScale;
        ctx.save();
        ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.56)';
        ctx.font = `${Math.max(7.5, 10 * labelScale)}px "SF Mono", "Fira Code", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String(point.index + 1),
          metrics.circleCenterX +
            Math.cos(point.angle) *
              (metrics.innerRadius + 18 + (1 - densityLabelScale) * 10 + (exportLayoutMode ? 8 : 0)),
          metrics.circleCenterY +
            Math.sin(point.angle) *
              (metrics.innerRadius + 18 + (1 - densityLabelScale) * 10 + (exportLayoutMode ? 8 : 0)),
        );
        ctx.restore();
      }
    });

    landingReferenceStates.forEach((state) => {
      const markerRadius = state.accented ? 5.1 : 4.1;
      const markerX = state.point.x;
      const markerY = state.point.y;
      const markerColor = state.overridden ? '#7FD7FF' : 'rgba(127,215,255,0.72)';

      ctx.save();
      ctx.fillStyle = markerColor;
      ctx.globalAlpha = state.overridden ? 0.96 : 0.78;
      ctx.shadowBlur = (state.overridden ? 14 : 9) * glowMultiplier;
      ctx.shadowColor = `${markerColor}${state.overridden ? '55' : '38'}`;
      ctx.beginPath();
      ctx.arc(markerX, markerY, markerRadius, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.34)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(markerX, markerY, markerRadius + 2.4, 0, TAU);
      ctx.stroke();
      ctx.restore();

      if (state.accented) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.94)';
        ctx.strokeStyle = 'rgba(17,17,22,0.72)';
        ctx.lineWidth = 1;
        drawDiamondMarker(ctx, markerX, markerY, Math.max(2.2, markerRadius * 0.44));
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    });

    if (
      isFreeRestartMode &&
      currentStudy.landingEditEnabled &&
      currentRiffStepState.landingSlot != null &&
      currentRiffPoint
    ) {
      const landingPulseRemaining = Math.max(
        0,
        ((riffAttackUntilRef.current[currentRiffStep] ?? 0) - now) /
          (currentRiffStepState.accented ? 360 : 260),
      );
      const pulseStrength =
        landingPulseRemaining <= 0
          ? 0.45
          : landingPulseRemaining * landingPulseRemaining * (3 - 2 * landingPulseRemaining);
      const markerRadius = currentRiffStepState.accented ? 7.2 : 6.2;

      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.45 + pulseStrength * 0.55);
      ctx.fillStyle = '#7FD7FF';
      ctx.shadowBlur = (18 + pulseStrength * 22) * glowMultiplier;
      ctx.shadowColor = 'rgba(127,215,255,0.78)';
      ctx.beginPath();
      ctx.arc(currentRiffPoint.x, currentRiffPoint.y, markerRadius + pulseStrength * 3.2, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.5 + pulseStrength * 0.45);
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.arc(currentRiffPoint.x, currentRiffPoint.y, markerRadius + 4 + pulseStrength * 8, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (selectedPoint && !isMobileRef.current) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.font = '10px "SF Mono", "Fira Code", monospace';
      ctx.textAlign = selectedPoint.x >= metrics.circleCenterX ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `STEP ${selectedPoint.index + 1}`,
        selectedPoint.x + (selectedPoint.x >= metrics.circleCenterX ? 12 : -12),
        selectedPoint.y - 12,
      );
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = flashActive ? 'rgba(255,209,102,0.88)' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = flashActive ? 2.5 : 1.15;
    ctx.beginPath();
    ctx.moveTo(metrics.circleCenterX, metrics.circleCenterY);
    ctx.lineTo(referenceCursorPoint.x, referenceCursorPoint.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = flashActive ? 'rgba(255,209,102,0.95)' : 'rgba(255,255,255,0.88)';
    ctx.shadowBlur = (flashActive ? 14 : 8) * glowMultiplier;
    ctx.shadowColor = flashActive ? 'rgba(255,209,102,0.72)' : 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(referenceCursorPoint.x, referenceCursorPoint.y, flashActive ? 5.9 : 4.6, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `${currentStudy.riff.color}68`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(metrics.circleCenterX, metrics.circleCenterY);
    ctx.lineTo(phraseCursorPoint.x, phraseCursorPoint.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = currentStudy.riff.color;
    ctx.shadowBlur = 16 * glowMultiplier;
    ctx.shadowColor = currentStudy.riff.color;
    ctx.beginPath();
    ctx.arc(phraseCursorPoint.x, phraseCursorPoint.y, 4.8, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(phraseCursorPoint.x, phraseCursorPoint.y, 9.4, 0, TAU);
    ctx.stroke();
    ctx.restore();

    if (metrics.timelineRect) {
      const compactMobileTimeline = isMobileRef.current;
      const timeline = metrics.timelineRect;
      const {
        x,
        y,
        width,
        height,
        topLaneY,
        bottomLaneY,
        laneHeight,
        stepWidth,
        visibleStartStep,
        visibleStepCount,
      } = timeline;
      const visibleEndStep = visibleStartStep + visibleStepCount;
      const visibleBarStart = Math.floor(visibleStartStep / metrics.stepsPerBar);
      const visibleBarEnd = Math.ceil(visibleEndStep / metrics.stepsPerBar);
      const endingGuideBarCount =
        endingCycleGuideBarCountRef.current == null
          ? null
          : Math.max(1, Math.floor(endingCycleGuideBarCountRef.current));
      const currentAbsoluteBar = Math.floor(currentAbsoluteReferenceStep / metrics.stepsPerBar);
      const currentEndingGuideBar =
        endingGuideBarCount == null
          ? null
          : ((currentAbsoluteBar % endingGuideBarCount) + endingGuideBarCount) %
            endingGuideBarCount;
      const playheadVisible =
        currentLaneReferenceStep >= visibleStartStep && currentLaneReferenceStep < visibleEndStep;
      const playheadX = playheadVisible
        ? x + (currentLaneReferenceStep - visibleStartStep + (referenceProgress % 1)) * stepWidth
        : null;

      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${0.028 * lineAlpha})`;
      ctx.strokeStyle = `rgba(255,255,255,${0.08 * lineAlpha})`;
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, x, y, width, height, 18);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      for (let barIndex = visibleBarStart; barIndex < visibleBarEnd; barIndex += 1) {
        const barStartStep = Math.max(visibleStartStep, barIndex * metrics.stepsPerBar);
        const barEndStep = Math.min(visibleEndStep, (barIndex + 1) * metrics.stepsPerBar);
        const barX = x + (barStartStep - visibleStartStep) * stepWidth;
        const barWidth = Math.max(0, (barEndStep - barStartStep) * stepWidth);
        const endingGuideBar =
          endingGuideBarCount == null
            ? null
            : ((barIndex % endingGuideBarCount) + endingGuideBarCount) % endingGuideBarCount;
        const showEndingGuideBar =
          endingGuideBarCount != null && endingGuideBarCount > 1;
        const isEndingGuideBar =
          showEndingGuideBar && endingGuideBar === endingGuideBarCount - 1;
        const isCurrentEndingGuideBar =
          showEndingGuideBar && endingGuideBar === currentEndingGuideBar;
        ctx.save();
        ctx.fillStyle = isCurrentEndingGuideBar
          ? isEndingGuideBar
            ? 'rgba(127,215,255,0.2)'
            : `${currentStudy.riff.color}18`
          : isEndingGuideBar
            ? 'rgba(127,215,255,0.11)'
            : barIndex % 2 === 0
              ? 'rgba(255,255,255,0.012)'
              : 'rgba(255,255,255,0.028)';
        ctx.fillRect(barX, y + 10, barWidth, height - 20);
        if (endingGuideBarCount != null && barWidth > 18) {
          ctx.lineWidth = isCurrentEndingGuideBar ? 1.4 : 1;
          ctx.strokeStyle = isCurrentEndingGuideBar
            ? isEndingGuideBar
              ? 'rgba(127,215,255,0.62)'
              : `${currentStudy.riff.color}88`
            : isEndingGuideBar
              ? 'rgba(127,215,255,0.36)'
              : 'rgba(255,255,255,0.08)';
          ctx.strokeRect(barX + 1, y + 11, Math.max(0, barWidth - 2), height - 22);
          if (isCurrentEndingGuideBar || isEndingGuideBar) {
            ctx.font = `${compactMobileTimeline ? 7 : 8}px "SF Mono", "Fira Code", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isEndingGuideBar ? '#7FD7FF' : 'rgba(255,255,255,0.74)';
            ctx.shadowBlur = isCurrentEndingGuideBar ? 10 * glowMultiplier : 4 * glowMultiplier;
            ctx.shadowColor = isEndingGuideBar
              ? 'rgba(127,215,255,0.34)'
              : `${currentStudy.riff.color}55`;
            if (showEndingGuideBar || isCurrentEndingGuideBar) {
              ctx.fillText(
                isEndingGuideBar ? 'ENDING' : 'NOW',
                barX + barWidth / 2,
                y + height - (compactMobileTimeline ? 28 : 32),
              );
            }
          }
        }
        ctx.restore();
      }

      for (let step = visibleStartStep; step < visibleEndStep; step += 1) {
        const stepX = x + (step - visibleStartStep) * stepWidth;
        const phraseReferenceStep = step;
        const isDownbeat = step % metrics.stepsPerBar === 0;
        const isBeat = isReferenceBeatStart(currentStudy, step);
        const isBackbeat = isBackbeatStep(currentStudy, step);
        const phraseState = getEffectiveRiffStepStateAtReferenceStep(
          currentStudy,
          phraseReferenceStep,
        );
        const phraseIndex = phraseState.phraseIndex;
        const phraseActive = phraseState.active;
        const phraseAccent = phraseState.accented;
        const phraseRestart = isPhraseRestartAtReferenceStep(currentStudy, phraseReferenceStep);
        const forcedReset = isForcedResetAtReferenceStep(currentStudy, phraseReferenceStep);
        const freeResolution = isFreeResolutionAtReferenceStep(currentStudy, phraseReferenceStep);
        const isCurrentStep = step === currentLaneReferenceStep;
        const isSelectedOccurrence = selectedStepRef.current === phraseIndex;
        const isLandingStep = phraseState.landingSlot != null;
        const attackRemaining =
          laneAttackReferenceStepRef.current === phraseReferenceStep
            ? Math.max(
                0,
                (laneAttackUntilRef.current - now) / (phraseAccent ? 320 : 220),
              )
            : 0;
        const markerStepWithinDisplay =
          ((phraseReferenceStep % metrics.totalDisplaySteps) + metrics.totalDisplaySteps) %
          metrics.totalDisplaySteps;
        const markerFlashRemaining =
          barMarkerFlashStepRef.current === markerStepWithinDisplay
            ? Math.max(0, (barMarkerFlashUntilRef.current - now) / BAR_MARKER_FLASH_DURATION)
            : 0;
        const markerFlashStrength =
          markerFlashRemaining <= 0
            ? 0
            : markerFlashRemaining * markerFlashRemaining * (3 - 2 * markerFlashRemaining);

        ctx.save();
        ctx.fillStyle = isBackbeat
          ? 'rgba(255,136,194,0.24)'
          : isBeat
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.032)';
        ctx.fillRect(stepX, topLaneY, Math.max(1, stepWidth - 1), laneHeight);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = phraseActive
          ? `${currentStudy.riff.color}${phraseAccent ? 'F0' : 'B8'}`
          : currentStudy.landingEditEnabled && isLandingStep
            ? 'rgba(127,215,255,0.08)'
            : 'rgba(255,255,255,0.05)';
        ctx.globalAlpha = phraseActive ? Math.min(1, 0.86 + attackRemaining * 0.25) : 1;
        ctx.fillRect(stepX, bottomLaneY, Math.max(1, stepWidth - 1), laneHeight);
        if (phraseAccent && phraseActive) {
          ctx.fillStyle = 'rgba(255,209,102,0.92)';
          ctx.fillRect(stepX, bottomLaneY, Math.max(1, stepWidth - 1), 4);
          drawDiamondMarker(
            ctx,
            stepX + Math.max(1, stepWidth - 1) / 2,
            bottomLaneY + laneHeight * 0.5,
            Math.max(2.2, Math.min(4.2, stepWidth * 0.18)),
          );
          ctx.fill();
        }
        if (currentStudy.landingEditEnabled && isLandingStep) {
          ctx.fillStyle = phraseState.overridden
            ? 'rgba(127,215,255,0.88)'
            : 'rgba(127,215,255,0.32)';
          ctx.fillRect(stepX, bottomLaneY + laneHeight - 6, Math.max(1, stepWidth - 1), 3);
        }
        if (isSelectedOccurrence) {
          ctx.strokeStyle = 'rgba(255,255,255,0.88)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(
            stepX + 0.6,
            bottomLaneY + 0.6,
            Math.max(1, stepWidth - 2),
            laneHeight - 1.2,
          );
        }
        if (currentStudy.showAlignmentMarkers && (phraseRestart || forcedReset || freeResolution)) {
          ctx.strokeStyle = forcedReset || freeResolution
            ? 'rgba(255,209,102,0.94)'
            : `${currentStudy.riff.color}A8`;
          ctx.lineWidth = forcedReset || freeResolution ? 2.1 : 1.45;
          ctx.beginPath();
          ctx.moveTo(stepX + 0.5, topLaneY - 7);
          ctx.lineTo(stepX + 0.5, bottomLaneY + laneHeight + 8);
          ctx.stroke();
        }
        if (markerFlashRemaining > 0) {
          const markerX = stepX + stepWidth * 0.5;
          const pulseWidth =
            Math.max(10, stepWidth * (compactMobileTimeline ? 0.7 : 0.55)) +
            markerFlashStrength * Math.max(5, stepWidth * 0.28);
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = 0.14 + markerFlashStrength * 0.32;
          ctx.fillStyle = `${currentStudy.riff.color}24`;
          ctx.fillRect(markerX - pulseWidth, y + 8, pulseWidth * 2, height - 16);
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = 0.46 + markerFlashStrength * 0.36;
          ctx.shadowBlur = (16 + markerFlashStrength * 28) * glowMultiplier;
          ctx.shadowColor = `${currentStudy.riff.color}EE`;
          ctx.strokeStyle = `${currentStudy.riff.color}FF`;
          ctx.lineWidth = 1.8 + markerFlashStrength * 1.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(markerX, topLaneY - 7);
          ctx.lineTo(markerX, bottomLaneY + laneHeight + 8);
          ctx.stroke();
          drawDiamondMarker(
            ctx,
            markerX,
            bottomLaneY + laneHeight + 6,
            Math.max(3.5, stepWidth * 0.2) + markerFlashStrength * 1.2,
          );
          ctx.fillStyle = `${currentStudy.riff.color}F0`;
          ctx.fill();
          ctx.restore();
        }
        if (phraseRestart) {
          ctx.fillStyle = forcedReset || freeResolution
            ? 'rgba(255,209,102,0.92)'
            : 'rgba(255,255,255,0.52)';
          drawTriangleMarker(
            ctx,
            stepX + stepWidth / 2,
            bottomLaneY - 2,
            Math.max(2.6, stepWidth * 0.18),
          );
          ctx.fill();
        }
        if (isCurrentStep) {
          ctx.strokeStyle = flashActive ? 'rgba(255,209,102,0.96)' : 'rgba(255,255,255,0.88)';
          ctx.lineWidth = flashActive ? 2 : 1.4;
          ctx.strokeRect(
            stepX + 0.6,
            topLaneY + 0.6,
            Math.max(1, stepWidth - 2),
            laneHeight * 2 + 20 - 1.2,
          );
        }
        if (
          currentStudy.showStepLabels &&
          (stepWidth >= (compactMobileTimeline ? 15 : 10) || visibleStepCount <= 64)
        ) {
          const stepCenterX = stepX + Math.max(1, stepWidth - 1) / 2;
          const stepWithinBar = ((step % metrics.stepsPerBar) + metrics.stepsPerBar) % metrics.stepsPerBar;
          const stepsPerBeat = Math.max(1, Math.round(metrics.stepsPerBar / Math.max(1, currentStudy.reference.numerator)));
          const beatNumber = Math.min(
            currentStudy.reference.numerator,
            Math.floor(stepWithinBar / stepsPerBeat) + 1,
          );
          ctx.font = `${compactMobileTimeline ? 8 : 9}px "SF Mono", "Fira Code", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = phraseActive ? 'rgba(17,17,22,0.72)' : 'rgba(255,255,255,0.34)';
          ctx.fillText(
            String((phraseIndex % visibleRiff.stepCount) + 1),
            stepCenterX,
            bottomLaneY + laneHeight * 0.52,
          );
          if (isBeat || isDownbeat) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText(
              String(beatNumber),
              stepCenterX,
              topLaneY + laneHeight * 0.52,
            );
          }
        }
        ctx.restore();
      }

      if (currentStudy.showPhraseBounds) {
        const sortedRestartSteps =
          resetStepCount == null
            ? (() => {
                const riffStepCount = Math.max(1, currentStudy.riff.stepCount);
                const absoluteVisibleStart = visibleStartStep;
                const absoluteVisibleEnd = visibleEndStep;
                const firstRestart =
                  Math.floor(absoluteVisibleStart / riffStepCount) * riffStepCount;
                const steps: number[] = [];
                for (
                  let restartStep = firstRestart;
                  restartStep < absoluteVisibleEnd + riffStepCount;
                  restartStep += riffStepCount
                ) {
                  steps.push(restartStep);
                }
                return steps;
              })()
            : [...phraseRestartSteps].sort((a, b) => a - b);
        const previousRestartStep =
          [...sortedRestartSteps].reverse().find((step) => step <= visibleStartStep) ??
          (sortedRestartSteps[sortedRestartSteps.length - 1] ?? 0) -
            (resetStepCount == null ? currentStudy.riff.stepCount : metrics.totalDisplaySteps);
        const visibleRestartSteps = [
          previousRestartStep,
          ...sortedRestartSteps.filter(
            (step) => step > visibleStartStep && step < visibleEndStep,
          ),
        ];
        const nextRestartAfter = (step: number) =>
          sortedRestartSteps.find((candidate) => candidate > step) ??
          (sortedRestartSteps[0] ??
            (resetStepCount == null ? currentStudy.riff.stepCount : metrics.totalDisplaySteps)) +
            (resetStepCount == null ? currentStudy.riff.stepCount : metrics.totalDisplaySteps);

        ctx.save();
        const bracketCapDepth = 9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        visibleRestartSteps.forEach((restartStep) => {
          const nextRestartStep = nextRestartAfter(restartStep);
          const segmentStart = Math.max(visibleStartStep, restartStep);
          const segmentEnd = Math.min(visibleEndStep, nextRestartStep);
          if (segmentEnd - segmentStart <= 0.4) {
            return;
          }
          const segmentLastStep = Math.max(segmentStart, segmentEnd - 1);
          const bracketStartX =
            x + (segmentStart - visibleStartStep) * stepWidth + stepWidth * 0.5;
          const bracketEndX =
            x + (segmentLastStep - visibleStartStep) * stepWidth + stepWidth * 0.5;
          const bracketY = bottomLaneY - 11;
          if (bracketEndX - bracketStartX < 18) {
            return;
          }

          ctx.save();
          ctx.lineWidth = 1.35;
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.shadowBlur = 10 * glowMultiplier;
          ctx.shadowColor = 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          ctx.moveTo(bracketStartX, bracketY + bracketCapDepth);
          ctx.lineTo(bracketStartX, bracketY);
          ctx.lineTo(bracketEndX, bracketY);
          ctx.lineTo(bracketEndX, bracketY + bracketCapDepth);
          ctx.stroke();
          ctx.restore();

        });
        ctx.restore();
      }

      for (let barIndex = visibleBarStart; barIndex <= visibleBarEnd; barIndex += 1) {
        const boundaryStep = barIndex * metrics.stepsPerBar;
        const markerX = x + (boundaryStep - visibleStartStep) * stepWidth;
        if (markerX < x - 0.5 || markerX > x + width + 0.5) {
          continue;
        }
        const markerStepWithinDisplay =
          ((boundaryStep % metrics.totalDisplaySteps) + metrics.totalDisplaySteps) %
          metrics.totalDisplaySteps;
        const visibleBarNumber = getVisibleBarNumber(currentStudy, barIndex);
        const cycleStart = isVisibleBarCycleStart(currentStudy, barIndex);
        const markerCueEnabled =
          currentStudy.showAlignmentMarkers &&
          isBarMarkerCueStep(currentStudy, boundaryStep);
        const markerFlashRemaining =
          barMarkerFlashStepRef.current === markerStepWithinDisplay
            ? Math.max(0, (barMarkerFlashUntilRef.current - now) / BAR_MARKER_FLASH_DURATION)
            : 0;
        const markerFlashStrength =
          markerFlashRemaining <= 0
            ? 0
            : markerFlashRemaining * markerFlashRemaining * (3 - 2 * markerFlashRemaining);
        const drawX = Math.max(x + 0.75, Math.min(x + width - 0.75, markerX));
        ctx.save();
        ctx.strokeStyle =
          cycleStart ? 'rgba(255,255,255,0.66)' : 'rgba(255,255,255,0.42)';
        ctx.lineWidth =
          cycleStart ? 1.45 : 1.05;
        ctx.shadowBlur = (cycleStart ? 10 : 6) * glowMultiplier;
        ctx.shadowColor = cycleStart ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.moveTo(drawX, y + 8);
        ctx.lineTo(drawX, y + height - 8);
        ctx.stroke();
        if (markerFlashRemaining > 0) {
          const pulseWidth =
            Math.max(10, stepWidth * (compactMobileTimeline ? 0.5 : 0.4)) +
            markerFlashStrength * Math.max(5, stepWidth * 0.24);
          const pulseAlpha = 0.16 + markerFlashStrength * 0.34;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = pulseAlpha;
          ctx.fillStyle = `${currentStudy.riff.color}24`;
          ctx.fillRect(drawX - pulseWidth, y + 8, pulseWidth * 2, height - 16);
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = 0.42 + markerFlashStrength * 0.36;
          ctx.shadowBlur = (18 + markerFlashStrength * 28) * glowMultiplier;
          ctx.shadowColor = `${currentStudy.riff.color}EE`;
          ctx.strokeStyle = `${currentStudy.riff.color}FF`;
          ctx.lineWidth = 2 + markerFlashStrength * 1.7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(drawX, y + 8);
          ctx.lineTo(drawX, y + height - 8);
          ctx.stroke();

          ctx.fillStyle = `${currentStudy.riff.color}F0`;
          drawDiamondMarker(
            ctx,
            drawX,
            topLaneY - 5,
            Math.max(4, stepWidth * 0.22) + markerFlashStrength * 1.3,
          );
          ctx.fill();
          drawDiamondMarker(
            ctx,
            drawX,
            bottomLaneY + laneHeight + 5,
            Math.max(4, stepWidth * 0.22) + markerFlashStrength * 1.3,
          );
          ctx.fill();
          ctx.restore();
        }
        if (
          (markerCueEnabled || cycleStart) &&
          !compactMobileTimeline &&
          barIndex < visibleBarEnd &&
          drawX >= x + 72
        ) {
          ctx.fillStyle =
            markerFlashRemaining > 0
              ? `${currentStudy.riff.color}F0`
              : 'rgba(255,255,255,0.72)';
          ctx.font = '8px "SF Mono", "Fira Code", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.shadowBlur = 9 * glowMultiplier;
          ctx.shadowColor =
            markerFlashRemaining > 0
              ? `${currentStudy.riff.color}88`
              : 'rgba(255,255,255,0.24)';
          ctx.fillText(`BAR ${visibleBarNumber}`, drawX + 5, topLaneY - 14);
        }
        ctx.restore();
      }

      if (playheadX != null) {
        ctx.save();
        ctx.strokeStyle = `${currentStudy.riff.color}AA`;
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.moveTo(playheadX, topLaneY - 8);
        ctx.lineTo(playheadX, bottomLaneY + laneHeight + 10);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.font = `${compactMobileTimeline ? 9 : 10}px "SF Mono", "Fira Code", monospace`;
      ctx.textBaseline = 'top';
      ctx.shadowBlur = 8 * glowMultiplier;
      ctx.shadowColor = 'rgba(255,255,255,0.22)';
      ctx.fillStyle = 'rgba(255,255,255,0.76)';
      ctx.fillText(compactMobileTimeline ? 'BAR' : 'BAR GRID', x + 12, y + 6);
      ctx.shadowBlur = 9 * glowMultiplier;
      ctx.shadowColor = currentStudy.landingEditEnabled
        ? 'rgba(127,215,255,0.32)'
        : `${currentStudy.riff.color}44`;
      ctx.fillStyle = currentStudy.landingEditEnabled
        ? 'rgba(225,246,255,0.88)'
        : 'rgba(255,255,255,0.86)';
      const lowerLaneLabel = currentStudy.landingEditEnabled
        ? compactMobileTimeline
          ? 'TAIL'
          : 'ENDING TAIL'
        : currentStudy.showPhraseBounds
          ? ''
          : compactMobileTimeline
            ? 'RIFF'
            : 'RIFF';
      if (lowerLaneLabel) {
        ctx.fillText(lowerLaneLabel, x + 12, bottomLaneY - 16);
      }
      ctx.shadowBlur = 8 * glowMultiplier;
      ctx.shadowColor = 'rgba(255,255,255,0.18)';
      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.fillText(
        compactMobileTimeline ? 'TAP WRITE · HOLD ACCENT' : 'TAP TO WRITE · HOLD FOR ACCENT',
        x + 12,
        bottomLaneY + laneHeight + 10,
      );
      for (let barIndex = visibleBarStart; barIndex < visibleBarEnd; barIndex += 1) {
        const barStartStep = Math.max(visibleStartStep, barIndex * metrics.stepsPerBar);
        const visibleBarNumber = getVisibleBarNumber(currentStudy, barIndex);
        const barLabelX = x + (barStartStep - visibleStartStep) * stepWidth + 10;
        ctx.fillStyle = 'rgba(255,255,255,0.76)';
        ctx.shadowBlur = 8 * glowMultiplier;
        ctx.shadowColor = 'rgba(255,255,255,0.2)';
        ctx.fillText(
          compactMobileTimeline ? String(visibleBarNumber) : `BAR ${visibleBarNumber}`,
          barLabelX,
          y + height - 16,
        );
      }
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    let frame = 0;

    const render = (timestamp: number) => {
      const currentStudy = studyRef.current;
      const playbackState = playbackStateHandleRef.current.current;
      const stepsPerSecond = getReferenceStepsPerSecond(currentStudy.reference);
      const displaySteps = getDisplayStepCount(currentStudy);

      if (playbackDriverRef.current && currentStudy.playing) {
        if (playbackState.lastTimestamp == null) {
          playbackState.lastTimestamp = timestamp;
        } else {
          const deltaSeconds = Math.min(0.05, (timestamp - playbackState.lastTimestamp) / 1000);
          playbackState.referenceProgress += deltaSeconds * stepsPerSecond;
          playbackState.lastTimestamp = timestamp;
        }
      } else if (playbackDriverRef.current) {
        playbackState.lastTimestamp = timestamp;
      }

      if (playbackDriverRef.current && currentStudy.playing && !playbackState.wasPlaying) {
        playbackState.previousReferenceStep = -1;
        playbackState.lastTimestamp = timestamp;
      }
      playbackState.wasPlaying = currentStudy.playing;

      const currentAbsoluteReferenceStep = Math.floor(playbackState.referenceProgress);
      const currentDisplayReferenceStep =
        ((currentAbsoluteReferenceStep % displaySteps) + displaySteps) % displaySteps;
      if (
        playbackDriverRef.current &&
        currentAbsoluteReferenceStep !== playbackState.previousReferenceStep
      ) {
        onReferenceStepChangeRef.current?.(currentAbsoluteReferenceStep);
      }
      if (
        playbackDriverRef.current &&
        currentStudy.playing &&
        currentAbsoluteReferenceStep !== playbackState.previousReferenceStep
      ) {
        const referenceBeatStart = isReferenceBeatStart(currentStudy, currentAbsoluteReferenceStep);
        const backbeatStep = isBackbeatStep(currentStudy, currentAbsoluteReferenceStep);
        if (referenceBeatStart) {
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          const stepsPerBar = getReferenceStepsPerBar(currentStudy.reference);
          referenceBeatFlashStepRef.current =
            ((currentAbsoluteReferenceStep % stepsPerBar) + stepsPerBar) % stepsPerBar;
          referenceBeatFlashBeatRef.current = Math.floor(
            referenceBeatFlashStepRef.current / getReferenceStepsPerBeat(currentStudy.reference),
          );
          referenceBeatFlashUntilRef.current = now + REFERENCE_BEAT_FLASH_DURATION;
        }
        if (audioEnabledRef.current && currentStudy.soundEnabled && referenceBeatStart && currentStudy.referenceSoundEnabled) {
          triggerReferencePulse(currentStudy.soundSettings);
        }
        if (audioEnabledRef.current && currentStudy.soundEnabled && backbeatStep && currentStudy.backbeatSoundEnabled) {
          triggerBackbeatAccent(currentStudy.soundSettings);
        }
        if (
          currentStudy.showAlignmentMarkers &&
          isBarMarkerCueStep(currentStudy, currentAbsoluteReferenceStep)
        ) {
          resetFlashUntilRef.current =
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 260;
          barMarkerFlashStepRef.current = currentDisplayReferenceStep;
          barMarkerFlashUntilRef.current =
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) +
            BAR_MARKER_FLASH_DURATION;
          if (audioEnabledRef.current && currentStudy.soundEnabled) {
            triggerBarMarkerCue(currentStudy.soundSettings);
          }
        }

        const riffStepState = getEffectiveRiffStepStateAtReferenceStep(
          currentStudy,
          currentAbsoluteReferenceStep,
        );
        if (riffStepState.active) {
          const attackUntil =
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) +
            (riffStepState.accented ? 320 : 220);
          riffAttackUntilRef.current[riffStepState.phraseIndex] =
            attackUntil;
          laneAttackReferenceStepRef.current = currentAbsoluteReferenceStep;
          laneAttackUntilRef.current = attackUntil;
          if (audioEnabledRef.current && currentStudy.soundEnabled && currentStudy.riff.soundEnabled) {
            triggerRiffPulse({
              frequency: currentStudy.riff.pitchHz,
              gain: currentStudy.riff.gain,
              accented: riffStepState.accented,
              phraseIndex: riffStepState.phraseIndex,
              sound: currentStudy.soundSettings,
            });
          }
        }

        if (
          isForcedResetAtReferenceStep(currentStudy, currentAbsoluteReferenceStep) ||
          isFreeResolutionAtReferenceStep(currentStudy, currentAbsoluteReferenceStep)
        ) {
          resetFlashUntilRef.current =
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 360;
          if (audioEnabledRef.current && currentStudy.soundEnabled) {
            triggerResetCue(currentStudy.soundSettings);
          }
        }

        playbackState.previousReferenceStep = currentAbsoluteReferenceStep;
      }

      draw();
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [
    draw,
    study,
    viewModeOverride,
    layoutBottomInset,
    laneWindowStartStep,
    laneWindowStepCount,
    endingCycleGuideBarCount,
  ]);

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
      link.download = `riff-cycle-${aspect}-${scale}x-${timestamp}.png`;
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
        playbackState.referenceProgress = 0;
        playbackState.lastTimestamp = null;
        playbackState.previousReferenceStep = -1;
        playbackState.wasPlaying = false;
        resetFlashUntilRef.current = 0;
        referenceBeatFlashUntilRef.current = 0;
        referenceBeatFlashStepRef.current = null;
        referenceBeatFlashBeatRef.current = null;
        barMarkerFlashUntilRef.current = 0;
        barMarkerFlashStepRef.current = null;
        riffAttackUntilRef.current = [];
        laneAttackUntilRef.current = 0;
        laneAttackReferenceStepRef.current = null;
        studyRef.current = {
          ...studyRef.current,
          playing: false,
        };
        draw();
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const recordingFormat = getCanvasRecordingFormat();

        stream = addAudioToCanvasStream(
          canvas.captureStream(CANVAS_RECORDING_FRAME_RATE),
          createRiffCycleExportAudioStream(
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
          playbackState.previousReferenceStep = -1;
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
        link.download = `riff-cycle-${aspect}-${durationSeconds}s-${timestamp}.${download.extension}`;
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

  useEffect(() => {
    if (!restartInitializedRef.current) {
      restartInitializedRef.current = true;
      draw();
      return;
    }
    const playbackState = playbackStateHandleRef.current.current;
    playbackState.referenceProgress = 0;
    playbackState.previousReferenceStep = -1;
    playbackState.lastTimestamp = null;
    playbackState.wasPlaying = studyRef.current.playing;
    laneAttackReferenceStepRef.current = null;
    laneAttackUntilRef.current = 0;
    resetFlashUntilRef.current =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 260;
    draw();
  }, [draw, restartToken]);

  const applyStepPaint = useCallback(
    (stepIndex: number) => {
      const nextActive = paintActiveRef.current;
      if (nextActive == null) {
        return;
      }
      if (paintedStepsRef.current.has(stepIndex)) {
        return;
      }
      paintedStepsRef.current.add(stepIndex);
      onSelectStep(stepIndex);
      onSetStepActive(stepIndex, nextActive);
    },
    [onSelectStep, onSetStepActive],
  );

  const applyLandingPaint = useCallback(
    (slotIndex: number) => {
      const nextActive = paintActiveRef.current;
      if (nextActive == null) {
        return;
      }
      if (paintedStepsRef.current.has(slotIndex)) {
        return;
      }
      paintedStepsRef.current.add(slotIndex);
      onSetLandingStepActive(slotIndex, nextActive);
    },
    [onSetLandingStepActive],
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimeoutRef.current != null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const clearPointerPaint = useCallback((event?: ReactPointerEvent<HTMLCanvasElement>) => {
    clearLongPressTimer();
    pendingLongPressRef.current = null;
    if (event && canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    activePointerIdRef.current = null;
    paintActiveRef.current = null;
    paintedStepsRef.current.clear();
  }, [clearLongPressTimer]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const effectiveLaneWindowStartStep = getEffectiveLaneWindowStartStep(
        studyRef.current,
        Math.floor(playbackStateHandleRef.current.current.referenceProgress),
        laneWindowStartStepRef.current,
        laneWindowStepCountRef.current,
      );
      const hit = findRiffCycleHit(
        studyRef.current,
        getRiffCycleCanvasMetrics(
          studyRef.current,
          rect.width,
          rect.height,
          isMobileRef.current,
          layoutTopInsetRef.current,
          layoutBottomInsetRef.current,
          effectiveLaneWindowStartStep,
          laneWindowStepCountRef.current,
        ),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );

      if (!hit || hit.stepIndex == null) {
        onSelectStep(null);
        clearPointerPaint(event);
        return;
      }

      const landingSlot =
        studyRef.current.landingEditEnabled && hit.displayStep != null
          ? getLandingSlotAtReferenceStep(studyRef.current, hit.displayStep)
          : null;
      const editingLanding = landingSlot != null;
      const editablePhraseStep = canEditRiffStep(studyRef.current, hit.stepIndex);

      if (!editingLanding && !editablePhraseStep) {
        onSelectStep(hit.stepIndex);
        clearPointerPaint(event);
        return;
      }

      if (event.altKey || event.metaKey || event.shiftKey) {
        onSelectStep(hit.stepIndex);
        if (editingLanding) {
          onToggleLandingAccent(landingSlot);
        } else {
          onToggleAccent(hit.stepIndex);
        }
        clearPointerPaint(event);
        return;
      }

      const nextActive = editingLanding
        ? getEffectiveRiffStepStateAtReferenceStep(studyRef.current, hit.displayStep ?? hit.stepIndex).active
          ? false
          : true
        : !Boolean(studyRef.current.riff.activeSteps[hit.stepIndex]);
      activePointerIdRef.current = event.pointerId;
      paintActiveRef.current = nextActive;
      paintedStepsRef.current.clear();
      canvas.setPointerCapture(event.pointerId);

      const touchLike = isMobileRef.current && event.pointerType !== 'mouse';
      if (touchLike) {
        clearLongPressTimer();
        pendingLongPressRef.current = {
          pointerId: event.pointerId,
          stepIndex: hit.stepIndex,
          landingSlot,
          x: event.clientX,
          y: event.clientY,
          nextActive,
          longPressed: false,
        };
        longPressTimeoutRef.current = window.setTimeout(() => {
          const pending = pendingLongPressRef.current;
          if (!pending || pending.pointerId !== event.pointerId) {
            return;
          }
          pending.longPressed = true;
          onSelectStep(pending.stepIndex);
          if (editingLanding && pending.landingSlot != null) {
            onToggleLandingAccent(pending.landingSlot);
          } else {
            onToggleAccent(pending.stepIndex);
          }
          paintActiveRef.current = null;
        }, 320);
        return;
      }

      if (editingLanding && landingSlot != null) {
        applyLandingPaint(landingSlot);
      } else {
        applyStepPaint(hit.stepIndex);
      }
    },
    [
      applyLandingPaint,
      applyStepPaint,
      clearLongPressTimer,
      clearPointerPaint,
      onSelectStep,
      onToggleAccent,
      onToggleLandingAccent,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const activePointerId = activePointerIdRef.current;
      if (activePointerId != null && activePointerId !== event.pointerId) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const effectiveLaneWindowStartStep = getEffectiveLaneWindowStartStep(
        studyRef.current,
        Math.floor(playbackStateHandleRef.current.current.referenceProgress),
        laneWindowStartStepRef.current,
        laneWindowStepCountRef.current,
      );
      const hit = findRiffCycleHit(
        studyRef.current,
        getRiffCycleCanvasMetrics(
          studyRef.current,
          rect.width,
          rect.height,
          isMobileRef.current,
          layoutTopInsetRef.current,
          layoutBottomInsetRef.current,
          effectiveLaneWindowStartStep,
          laneWindowStepCountRef.current,
        ),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );

      if (activePointerId == null) {
        if (!isMobileRef.current) {
          hoveredStepRef.current = hit?.stepIndex ?? null;
          canvas.style.cursor = hit?.stepIndex != null ? 'pointer' : 'default';
        }
        return;
      }

      const pending = pendingLongPressRef.current;
      if (pending && pending.pointerId === event.pointerId && !pending.longPressed) {
        const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
        if (distance > 10) {
          clearLongPressTimer();
          pendingLongPressRef.current = null;
          if (pending.landingSlot != null && studyRef.current.landingEditEnabled) {
            applyLandingPaint(pending.landingSlot);
          } else {
            applyStepPaint(pending.stepIndex);
          }
        } else {
          return;
        }
      }

      if (hit?.stepIndex != null) {
        const landingSlot =
          studyRef.current.landingEditEnabled && hit.displayStep != null
            ? getLandingSlotAtReferenceStep(studyRef.current, hit.displayStep)
            : null;
        if (landingSlot != null) {
          applyLandingPaint(landingSlot);
        } else {
          applyStepPaint(hit.stepIndex);
        }
      }
    },
    [applyLandingPaint, applyStepPaint, clearLongPressTimer],
  );

  const handlePointerLeave = useCallback(() => {
    if (activePointerIdRef.current != null) {
      return;
    }

    hoveredStepRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const pending = pendingLongPressRef.current;
      if (pending && pending.pointerId === event.pointerId && !pending.longPressed) {
        clearLongPressTimer();
        pendingLongPressRef.current = null;
        onSelectStep(pending.stepIndex);
        if (pending.landingSlot != null && studyRef.current.landingEditEnabled) {
          onSetLandingStepActive(pending.landingSlot, pending.nextActive);
        } else {
          onSetStepActive(pending.stepIndex, pending.nextActive);
        }
      }
      clearPointerPaint(event);
    },
    [clearLongPressTimer, clearPointerPaint, onSelectStep, onSetLandingStepActive, onSetStepActive],
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const effectiveLaneWindowStartStep = getEffectiveLaneWindowStartStep(
        studyRef.current,
        Math.floor(playbackStateHandleRef.current.current.referenceProgress),
        laneWindowStartStepRef.current,
        laneWindowStepCountRef.current,
      );
      const hit = findRiffCycleHit(
        studyRef.current,
        getRiffCycleCanvasMetrics(
          studyRef.current,
          rect.width,
          rect.height,
          isMobileRef.current,
          layoutTopInsetRef.current,
          layoutBottomInsetRef.current,
          effectiveLaneWindowStartStep,
          laneWindowStepCountRef.current,
        ),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );

      if (hit?.stepIndex != null) {
        event.preventDefault();
        onSelectStep(hit.stepIndex);
        const landingSlot =
          studyRef.current.landingEditEnabled && hit.displayStep != null
            ? getLandingSlotAtReferenceStep(studyRef.current, hit.displayStep)
            : null;
        if (landingSlot != null) {
          onToggleLandingAccent(landingSlot);
        } else {
          onToggleAccent(hit.stepIndex);
        }
      }
    },
    [onSelectStep, onToggleAccent, onToggleLandingAccent],
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
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={handleContextMenu}
      className={className ?? 'absolute inset-0 h-full w-full'}
      style={{ touchAction: 'none' }}
    />
  );
}
