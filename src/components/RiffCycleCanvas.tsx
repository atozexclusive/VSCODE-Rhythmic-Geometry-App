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
  getEffectiveBackbeatStepPositionsAtReferenceStep,
  getEffectiveResetBarCount,
  getLandingStepCount,
  getLandingWindowLength,
  getLandingSlotAtReferenceStep,
  getPhraseProgressAtReferenceProgress,
  getReferenceStepsPerBar,
  getReferenceStepsPerBeat,
  getReferenceStepsPerSecond,
  getResetStepCount,
  getRiffSequencePhrases,
  getRiffSequenceStateAtReferenceStep,
  getRiffSequenceTimeline,
  getRiffStepIndexAtReferenceStep,
  getVisibleRiffPhraseAtReferenceStep,
  getVisibleRiffReferenceAtReferenceStep,
  isBackbeatStep,
  isForcedResetAtReferenceStep,
  isPhraseRestartAtReferenceStep,
  isReferenceBeatStart,
  isRiffSequenceBarBoundaryAtReferenceStep,
  type RiffCycleStudy,
  type RiffCycleViewMode,
  type RiffSequenceCellLabel,
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
  triggerSubdivisionPulse,
} from '../lib/riffCycleAudio';

const TAU = Math.PI * 2;
const BAR_MARKER_FLASH_DURATION = 520;
const REFERENCE_BEAT_FLASH_DURATION = 280;

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
  onToggleMeterBeat?: (beat: number) => void;
  onTogglePulseLayerStep?: (stepIndex: number) => void;
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

type RiffCellStripPhraseEntry = {
  label: RiffSequenceCellLabel;
  color: string;
  suffix: string | null;
  sequenceIndex: number;
};

type RiffCellStripPhrase = {
  id: string;
  repeatCount: number;
  entries: RiffCellStripPhraseEntry[];
};

function getRiffCellStripPhrases(study: RiffCycleStudy): RiffCellStripPhrase[] {
  const cells = study.riffCells ?? [];
  const validLabels = new Set(cells.map((cell) => cell.label));
  const fallbackLabel = cells[0]?.label ?? 'A';
  const sequenceSource = study.riffSequence && study.riffSequence.length > 0
    ? study.riffSequence
    : [fallbackLabel];
  const sequence = sequenceSource
    .map((label) => label.toUpperCase() as RiffSequenceCellLabel)
    .filter((label) => validLabels.has(label))
    .slice(0, 24);
  const normalizedSequence = sequence.length > 0 ? sequence : [fallbackLabel];
  const phrases = getRiffSequencePhrases(study);
  const sequenceBarsMode = study.riffSequenceBarsMode === 'per-cell' ? 'per-cell' : 'global';
  let cursor = 0;

  return phrases
    .map((phrase, phraseIndex) => {
      const startIndex = cursor;
      const endIndex = Math.min(normalizedSequence.length, startIndex + phrase.entryCount);
      const entries = normalizedSequence.slice(startIndex, endIndex).map((label, indexOffset) => {
        const sequenceIndex = startIndex + indexOffset;
        const cell = cells.find((candidate) => candidate.label === label);
        const durationMode =
          study.riffSequenceEntryDurationModes?.[sequenceIndex] === 'bars' ? 'bars' : 'patterns';
        const rawValue =
          durationMode === 'bars'
            ? study.riffSequenceEntryBars?.[sequenceIndex] ?? study.riffSequenceBars ?? 1
            : study.riffSequenceEntryRepeats?.[sequenceIndex] ?? 1;
        const value = Math.max(1, Math.round(rawValue));
        const suffix =
          sequenceBarsMode === 'per-cell' ? (durationMode === 'bars' ? `${value}B` : `x${value}`) : null;

        return {
          label,
          color: cell?.color ?? study.riff.color,
          suffix,
          sequenceIndex,
        };
      });
      cursor = endIndex;
      return {
        id: phrase.id || `phrase-${phraseIndex + 1}`,
        repeatCount: Math.max(1, Math.round(phrase.repeatCount || 1)),
        entries,
      };
    })
    .filter((phrase) => phrase.entries.length > 0);
}

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

function getPulseLayerPoint(
  centerX: number,
  centerY: number,
  radius: number,
  stepIndex: number,
  stepCount: number,
): { x: number; y: number; angle: number } {
  const angle = -Math.PI / 2 + (stepIndex / Math.max(1, stepCount)) * TAU;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
    angle,
  };
}

function formatSubdivisionCountLabel(stepIndex: number, stepsPerBeat: number): string {
  const normalizedStepsPerBeat = Math.max(1, Math.round(stepsPerBeat || 1));
  const beat = Math.floor(stepIndex / normalizedStepsPerBeat) + 1;
  const subdivisionIndex = ((stepIndex % normalizedStepsPerBeat) + normalizedStepsPerBeat) % normalizedStepsPerBeat;

  if (normalizedStepsPerBeat === 2) {
    return subdivisionIndex === 0 ? String(beat) : '&';
  }
  if (normalizedStepsPerBeat === 3) {
    return subdivisionIndex === 0 ? String(beat) : subdivisionIndex === 1 ? '&' : 'a';
  }
  if (normalizedStepsPerBeat === 4) {
    const labels = ['', 'e', '&', 'a'];
    return subdivisionIndex === 0 ? String(beat) : labels[subdivisionIndex] ?? String(subdivisionIndex + 1);
  }
  if (normalizedStepsPerBeat === 5) {
    return subdivisionIndex === 0 ? String(beat) : String(subdivisionIndex + 1);
  }
  if (normalizedStepsPerBeat === 8) {
    const labels = ['', 'e', '&', 'a', '+', '+e', '+&', '+a'];
    return subdivisionIndex === 0 ? String(beat) : labels[subdivisionIndex] ?? String(subdivisionIndex + 1);
  }

  return subdivisionIndex === 0 ? String(beat) : String(subdivisionIndex + 1);
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
    intensity: number;
    fill: boolean;
  },
): void {
  const activePoints = points.filter((point) => point.active).sort((a, b) => a.index - b.index);
  if (activePoints.length < 2) {
    return;
  }

  const segments = activePoints
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

  if (segments.length === 0) {
    return;
  }

  const labelCandidates: Array<{ angle: number; label: string; span: number }> = [];

  if (options.fill && segments.length >= 3) {
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

  segments.forEach(({ point, nextPoint, stepSpan, midAngle, controlX, controlY }) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(3,5,8,0.56)';
    ctx.lineWidth = (3.2 + options.intensity * 4) * options.pointScale;
    ctx.globalAlpha = 0.28 + options.intensity * 0.3;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.quadraticCurveTo(controlX, controlY, nextPoint.x, nextPoint.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = options.color;
    ctx.lineWidth = (0.9 + options.intensity * 0.85) * options.pointScale;
    ctx.globalAlpha = 0.48 + options.intensity * 0.28;
    ctx.shadowBlur = (4 + options.intensity * 7) * options.glowMultiplier * options.pointScale;
    ctx.shadowColor = `${options.color}99`;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.quadraticCurveTo(controlX, controlY, nextPoint.x, nextPoint.y);
    ctx.stroke();
    ctx.restore();

    if (options.showLabels && stepSpan > 1) {
      labelCandidates.push({
        angle: midAngle,
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

function getBarMarkerIntervalBarCount(study: RiffCycleStudy): number | null {
  const markerInterval = study.barMarkerInterval ?? 'none';
  if (markerInterval === 'none') {
    return null;
  }
  if (markerInterval === 'pattern') {
    return null;
  }
  return markerInterval;
}

function isBarMarkerCueStep(study: RiffCycleStudy, referenceStep: number): boolean {
  if ((study.barMarkerInterval ?? 'none') === 'pattern') {
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
  const resetBarCount = getEffectiveResetBarCount(study);
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
  const resetBarCount = getEffectiveResetBarCount(study);
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
  const resetBarCount = getEffectiveResetBarCount(study);
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
  onToggleMeterBeat,
  onTogglePulseLayerStep,
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
  const exportRecordingActiveRef = useRef(false);
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
    const exportRecordingMode = exportRecordingActiveRef.current;
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

    const playbackState = playbackStateHandleRef.current.current;
    const referenceProgress = playbackState.referenceProgress;
    const currentAbsoluteReferenceStep = Math.floor(referenceProgress);
    const visibleReference = getVisibleRiffReferenceAtReferenceStep(
      currentStudy,
      currentAbsoluteReferenceStep,
    );
    const renderStudy =
      visibleReference === currentStudy.reference
        ? currentStudy
        : {
            ...currentStudy,
            reference: visibleReference,
          };
    const totalDisplaySteps = getDisplayStepCount(renderStudy);
    const resetStepCount = getResetStepCount(currentStudy);
    const effectiveLaneWindowStartStep = getEffectiveLaneWindowStartStep(
      currentStudy,
      currentAbsoluteReferenceStep,
      laneWindowStartStepRef.current,
      laneWindowStepCountRef.current,
    );
    const metrics = getRiffCycleCanvasMetrics(
      renderStudy,
      rect.width,
      rect.height,
      isMobileRef.current || exportLayoutMode,
      layoutTopInsetRef.current,
      layoutBottomInsetRef.current,
      effectiveLaneWindowStartStep,
      laneWindowStepCountRef.current,
      { sidePadding: exportSidePadding },
    );
    const stepsPerBar = getReferenceStepsPerBar(renderStudy.reference);
    const stepsPerBeat = getReferenceStepsPerBeat(renderStudy.reference);
    const manualSubdivisionGuideMode =
      currentDisplaySettings.subdivisionGuide ??
      (currentDisplaySettings.subdivisionGrid ? 'subdivisions' : 'off');
    const subdivisionGuideAutomation = currentDisplaySettings.subdivisionGuideAutomation;
    const currentSubdivisionGuideBar = Math.floor(currentAbsoluteReferenceStep / Math.max(1, stepsPerBar));
    const subdivisionGuideMode =
      subdivisionGuideAutomation?.enabled
        ? subdivisionGuideAutomation.modes[
            Math.floor(currentSubdivisionGuideBar / Math.max(1, subdivisionGuideAutomation.cycleBars)) %
              subdivisionGuideAutomation.modes.length
          ] ?? manualSubdivisionGuideMode
        : manualSubdivisionGuideMode;
    const subdivisionGuideVisible = subdivisionGuideMode !== 'off';
    const denseReferenceMeter = renderStudy.reference.numerator > 32;
    const meterSubdivisionMarksVisible =
      subdivisionGuideVisible && !currentStudy.pulseLayerEnabled && !denseReferenceMeter;
    const subdivisionSpokesVisible = subdivisionGuideMode === 'subdivisions';
    const manualInnerClockMode = currentDisplaySettings.innerClock ?? 'full';
    const innerClockAutomation = currentDisplaySettings.innerClockAutomation;
    const innerClockMode =
      innerClockAutomation?.enabled
        ? innerClockAutomation.modes[
            Math.floor(currentSubdivisionGuideBar / Math.max(1, innerClockAutomation.cycleBars)) %
              innerClockAutomation.modes.length
          ] ?? manualInnerClockMode
        : manualInnerClockMode;
    const innerClockVisible = innerClockMode !== 'off';
    const innerClockMotionVisible = innerClockMode === 'full';
    const currentReferenceStep =
      ((currentAbsoluteReferenceStep % totalDisplaySteps) + totalDisplaySteps) % totalDisplaySteps;
    const currentLaneReferenceStep =
      shouldUseAbsoluteLaneWindow(currentStudy) ? currentAbsoluteReferenceStep : currentReferenceStep;
    const stepWithinBar = ((referenceProgress % stepsPerBar) + stepsPerBar) % stepsPerBar;
    const referenceCursorPoint = getReferenceStepPoint(renderStudy, metrics, stepWithinBar);
    const phraseProgress = getPhraseProgressAtReferenceProgress(currentStudy, referenceProgress);
    const visibleRiff = getVisibleRiffPhraseAtReferenceStep(
      currentStudy,
      currentAbsoluteReferenceStep,
    );
    const activeRiffColor = visibleRiff.color;
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
    const carveViewActive = currentStudy.showStructureView;
    const contourIntensity =
      visibleRiff.stepCount >= 33
        ? 1
        : visibleRiff.stepCount >= 16
          ? 0.72
          : 0.54;
    const currentRiffStep = getRiffStepIndexAtReferenceStep(
      currentStudy,
      currentAbsoluteReferenceStep,
    );
    const currentRiffStepState = getEffectiveRiffStepStateAtReferenceStep(
      currentStudy,
      currentAbsoluteReferenceStep,
    );
    const currentRiffPoint = riffPoints[currentRiffStep] ?? null;
    const currentStepWithinBar =
      ((currentAbsoluteReferenceStep % stepsPerBar) + stepsPerBar) % stepsPerBar;
    const currentBarStartStep = currentAbsoluteReferenceStep - currentStepWithinBar;
    const activeBackbeatStepPositions = getEffectiveBackbeatStepPositionsAtReferenceStep(
      renderStudy,
      currentAbsoluteReferenceStep,
    );
    const outerReferenceHitHighlights = meterSubdivisionMarksVisible
      ? metrics.referencePerimeterPoints
          .map((point, index) => {
            const state = getEffectiveRiffStepStateAtReferenceStep(
              currentStudy,
              currentBarStartStep + index,
            );
            return state.active
              ? {
                  point,
                  index,
                  accented: state.accented,
                  current: index === currentStepWithinBar,
                }
              : null;
          })
          .filter(
            (
              entry,
            ): entry is {
              point: { x: number; y: number };
              index: number;
              accented: boolean;
              current: boolean;
            } => entry != null,
          )
      : [];
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

    if (
      currentDisplaySettings.showCellStrip !== false &&
      sequenceState &&
      sequenceTimeline &&
      sequenceTimeline.entries.length > 0
    ) {
      const stripPhrases = getRiffCellStripPhrases(currentStudy);
      const expandedBaseSequenceIndices = stripPhrases.flatMap((phrase) =>
        Array.from({ length: phrase.repeatCount }, () =>
          phrase.entries.map((entry) => entry.sequenceIndex),
        ).flat(),
      );
      const activeBaseSequenceIndex =
        expandedBaseSequenceIndices[sequenceState.sequenceIndex] ?? sequenceState.sequenceIndex;
      const chipHeight = exportLayoutMode ? 32 : 18;
      const chipRadius = exportLayoutMode ? 12 : 7;
      const chipGap = exportLayoutMode ? 7 : 4;
      const phrasePaddingX = exportLayoutMode ? 10 : 5;
      const phraseGap = exportLayoutMode ? 14 : 8;
      const plusWidth = exportLayoutMode ? 20 : 10;
      const maxStripWidth = Math.min(rect.width - 32, exportLayoutMode ? 760 : 390);
      const referenceShapeBottomY = Math.max(
        metrics.circleCenterY + metrics.innerRadius,
        ...metrics.referenceVertices.map((point) => point.y),
        ...metrics.referencePerimeterPoints.map((point) => point.y),
      );
      const bottomStripY = exportRecordingMode
        ? referenceShapeBottomY + (exportLayoutMode ? 70 : 52)
        : metrics.timelineRect
          ? Math.max(metrics.circleCenterY + metrics.outerRadius + 58, metrics.timelineRect.y - 20)
          : metrics.circleCenterY + metrics.outerRadius + 72;
      const stripY = Math.min(
        rect.height - metrics.bottomPadding - chipHeight - (exportLayoutMode ? 14 : 10),
        Math.max(metrics.topPadding + 8, bottomStripY),
      );

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${exportLayoutMode ? 17 : 8}px "SF Mono", "Fira Code", monospace`;
      ctx.fillStyle = exportLayoutMode ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 0;
      ctx.fillText(
        `CELL ${sequenceState.cell.label} · ${sequenceState.cell.stepCount}`,
        metrics.circleCenterX,
        stripY - (exportLayoutMode ? 18 : 8),
      );

      ctx.font = `${exportLayoutMode ? 17 : 8.5}px "SF Mono", "Fira Code", monospace`;
      const entryPaddingX = exportLayoutMode ? 13 : 7;
      const repeatPaddingX = exportLayoutMode ? 10 : 6;
      const displayedPhrases: RiffCellStripPhrase[] = [];
      const phraseWidths: number[] = [];
      let stripWidth = 0;
      let hiddenPhraseCount = 0;

      const getEntryText = (entry: RiffCellStripPhraseEntry) =>
        entry.suffix ? `${entry.label} ${entry.suffix}` : entry.label;

      const measureEntryWidth = (entry: RiffCellStripPhraseEntry) =>
        Math.max(exportLayoutMode ? 46 : 24, ctx.measureText(getEntryText(entry)).width + entryPaddingX * 2);

      const measurePhraseWidth = (phrase: RiffCellStripPhrase, phraseIndex: number) => {
        const singleTail = phraseIndex > 0 && phrase.entries.length === 1 && phrase.repeatCount === 1;
        const entryWidths = phrase.entries.map(measureEntryWidth);
        if (singleTail) {
          return entryWidths[0] ?? 0;
        }
        const entriesWidth =
          entryWidths.reduce((sum, width) => sum + width, 0) +
          Math.max(0, entryWidths.length - 1) * chipGap;
        const bracketWidth = exportLayoutMode ? 20 : 10;
        const repeatText = phrase.repeatCount > 1 ? `x${phrase.repeatCount}` : '';
        const repeatWidth = repeatText
          ? ctx.measureText(repeatText).width + repeatPaddingX * 2
          : 0;
        return phrasePaddingX * 2 + bracketWidth * 2 + entriesWidth + repeatWidth;
      };

      stripPhrases.forEach((phrase, phraseIndex) => {
        const phraseWidth = measurePhraseWidth(phrase, phraseIndex);
        const separatorWidth = displayedPhrases.length > 0 ? plusWidth + phraseGap : 0;
        const nextWidth = stripWidth + separatorWidth + phraseWidth;
        if (nextWidth <= maxStripWidth || displayedPhrases.length === 0) {
          displayedPhrases.push(phrase);
          phraseWidths.push(phraseWidth);
          stripWidth = nextWidth;
        } else {
          hiddenPhraseCount += 1;
        }
      });

      const ellipsisWidth = hiddenPhraseCount > 0 ? (exportLayoutMode ? 34 : 18) : 0;
      const totalWidth = Math.min(maxStripWidth, stripWidth + ellipsisWidth);
      let drawX = metrics.circleCenterX - totalWidth / 2;

      displayedPhrases.forEach((phrase, phraseIndex) => {
        if (phraseIndex > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.34)';
          ctx.shadowBlur = 0;
          ctx.fillText('+', drawX + plusWidth / 2, stripY + chipHeight / 2);
          drawX += plusWidth + phraseGap;
        }

        const phraseWidth = phraseWidths[phraseIndex] ?? measurePhraseWidth(phrase, phraseIndex);
        const singleTail = phraseIndex > 0 && phrase.entries.length === 1 && phrase.repeatCount === 1;

        if (!singleTail) {
          drawRoundedRect(ctx, drawX, stripY - 2, phraseWidth, chipHeight + 4, chipRadius + 3);
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = exportLayoutMode ? 1.1 : 0.75;
          ctx.stroke();

          ctx.fillStyle = 'rgba(255,255,255,0.44)';
          ctx.shadowBlur = 0;
          ctx.fillText('[', drawX + phrasePaddingX + (exportLayoutMode ? 5 : 3), stripY + chipHeight / 2);
          drawX += phrasePaddingX + (exportLayoutMode ? 14 : 8);
        }

        phrase.entries.forEach((entry, entryIndex) => {
          const active = entry.sequenceIndex === activeBaseSequenceIndex;
          const chipColor = entry.color;
          const chipWidth = measureEntryWidth(entry);
          drawRoundedRect(ctx, drawX, stripY, chipWidth, chipHeight, chipRadius);
          ctx.fillStyle = active
            ? `${chipColor}${exportLayoutMode ? '44' : '30'}`
            : `${chipColor}${exportLayoutMode ? '1B' : '12'}`;
          ctx.fill();
          ctx.strokeStyle = active ? `${chipColor}C8` : `${chipColor}30`;
          ctx.lineWidth = active ? (exportLayoutMode ? 2.25 : 1.35) : (exportLayoutMode ? 1.1 : 0.85);
          ctx.stroke();
          ctx.fillStyle = active ? chipColor : `${chipColor}C0`;
          ctx.shadowBlur = active ? (exportLayoutMode ? 13 : 7) * glowMultiplier : 0;
          ctx.shadowColor = active ? `${chipColor}88` : 'transparent';
          ctx.fillText(getEntryText(entry), drawX + chipWidth / 2, stripY + chipHeight / 2);
          drawX += chipWidth + (entryIndex < phrase.entries.length - 1 ? chipGap : 0);
        });

        if (!singleTail) {
          ctx.fillStyle = 'rgba(255,255,255,0.44)';
          ctx.shadowBlur = 0;
          ctx.fillText(']', drawX + (exportLayoutMode ? 7 : 4), stripY + chipHeight / 2);
          drawX += (exportLayoutMode ? 18 : 10);

          if (phrase.repeatCount > 1) {
            const repeatText = `x${phrase.repeatCount}`;
            const repeatWidth = ctx.measureText(repeatText).width + repeatPaddingX * 2;
            drawRoundedRect(ctx, drawX, stripY, repeatWidth, chipHeight, chipRadius);
            ctx.fillStyle = exportLayoutMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.055)';
            ctx.fill();
            ctx.strokeStyle = exportLayoutMode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.16)';
            ctx.lineWidth = exportLayoutMode ? 1.1 : 0.75;
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.72)';
            ctx.fillText(repeatText, drawX + repeatWidth / 2, stripY + chipHeight / 2);
            drawX += repeatWidth;
          }
        }
      });

      if (hiddenPhraseCount > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.34)';
        ctx.shadowBlur = 0;
        ctx.fillText('...', drawX + (exportLayoutMode ? 18 : 10), stripY + chipHeight / 2);
      }
      ctx.restore();
    }

    if (currentStudy.pulseLayerEnabled) {
      const pulseStepCount = Math.max(1, stepsPerBar);
      const pulseSteps = Array.from(
        { length: pulseStepCount },
        (_, index) => currentStudy.pulseLayerSteps?.[index] ?? true,
      );
      const pulseRadius = metrics.outerRadius;
      const currentPulsePosition =
        ((referenceProgress % pulseStepCount) + pulseStepCount) % pulseStepCount;
      const currentPulseIndex = Math.floor(currentPulsePosition) % pulseStepCount;
      const pulseLayerColor = '#7FD7FF';

      ctx.save();
      ctx.beginPath();
      ctx.arc(metrics.circleCenterX, metrics.circleCenterY, pulseRadius, 0, TAU);
      ctx.strokeStyle = 'rgba(127, 215, 255, 0.28)';
      ctx.lineWidth = (exportLayoutMode ? 1.9 : 1.25) * shellScale;
      ctx.stroke();

      for (let index = 0; index < pulseStepCount; index += 1) {
        const active = pulseSteps[index];
        const current = index === currentPulseIndex;
        const point = getPulseLayerPoint(
          metrics.circleCenterX,
          metrics.circleCenterY,
          pulseRadius,
          index,
          pulseStepCount,
        );
        const nodeRadius =
          (active ? (current ? 4.7 : 3.15) : 1.85) * pointScale;

        ctx.beginPath();
        ctx.arc(point.x, point.y, nodeRadius, 0, TAU);
        ctx.fillStyle = active
          ? current
            ? 'rgba(190, 238, 255, 0.78)'
            : 'rgba(127, 215, 255, 0.28)'
          : 'rgba(255,255,255,0.075)';
        ctx.shadowBlur = active ? (current ? 7 : 1.5) * glowMultiplier * pointScale : 0;
        ctx.shadowColor = active ? `${pulseLayerColor}88` : 'transparent';
        ctx.fill();
        ctx.lineWidth = active ? 1 * shellScale : 0.7 * shellScale;
        ctx.strokeStyle = active ? 'rgba(174, 227, 255, 0.5)' : 'rgba(255,255,255,0.13)';
        ctx.stroke();
      }

      const cursorPoint = getPulseLayerPoint(
        metrics.circleCenterX,
        metrics.circleCenterY,
        pulseRadius,
        currentPulsePosition,
        pulseStepCount,
      );
      ctx.beginPath();
      ctx.arc(cursorPoint.x, cursorPoint.y, 6.6 * pointScale, 0, TAU);
      ctx.strokeStyle = 'rgba(255,255,255,0.34)';
      ctx.lineWidth = 0.95 * shellScale;
      ctx.shadowBlur = 5 * glowMultiplier * pointScale;
      ctx.shadowColor = 'rgba(255,255,255,0.2)';
      ctx.stroke();
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
        const meterCount = metrics.referenceVertices.length;
        const labelDensityFade = Math.max(0, Math.min(1, (meterCount - 12) / 40));
        const labelAlpha = currentDisplaySettings.showMeterNumbers === false
          ? 0
          : Math.max(0.48, 0.86 - labelDensityFade * 0.2);
        const labelScale = Math.max(0.74, 1 - Math.max(0, meterCount - 32) * 0.012);
        const isBackbeatVertex =
          activeBackbeatStepPositions.includes(index * stepsPerBeat + 1);
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

        if (labelAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = labelAlpha;
          ctx.font = `${Math.max(7.2, 11 * labelScale * shellScale * exportLabelScale)}px "SF Mono", "Fira Code", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const labelY = vertex.y - (17 + Math.max(0, 1 - labelScale) * 7) * shellScale * exportLabelScale;
          ctx.lineWidth = 2.4 * shellScale;
          ctx.strokeStyle = 'rgba(5,6,10,0.74)';
          ctx.strokeText(`${index + 1}`, vertex.x, labelY);
          ctx.fillStyle =
            isBackbeatVertex
              ? 'rgba(255,136,194,0.96)'
              : index === 0
                ? 'rgba(255,255,255,0.96)'
                : 'rgba(255,255,255,0.84)';
          ctx.fillText(`${index + 1}`, vertex.x, labelY);
          ctx.restore();
        }
      });

      if (meterSubdivisionMarksVisible) {
        metrics.referencePerimeterPoints.forEach((point, index) => {
          const isBeat = isReferenceBeatStart(currentStudy, index);
          if (isBeat) {
            return;
          }
          const subdivisionFlashStrength =
            currentReferenceStep % metrics.stepsPerBar === index
              ? Math.max(0, 1 - Math.abs((referenceProgress % 1) - 0.18) / 0.82)
              : 0;
          const vectorX = point.x - metrics.circleCenterX;
          const vectorY = point.y - metrics.circleCenterY;
          const vectorLength = Math.max(1, Math.hypot(vectorX, vectorY));
          const unitX = vectorX / vectorLength;
          const unitY = vectorY / vectorLength;
          const tickLength = (11 + subdivisionFlashStrength * 5) * shellScale;
          const innerX = point.x - unitX * tickLength;
          const innerY = point.y - unitY * tickLength;
          const outerX = point.x + unitX * (3.5 * shellScale);
          const outerY = point.y + unitY * (3.5 * shellScale);

          ctx.save();
          ctx.strokeStyle = `rgba(127,215,255,${0.18 + subdivisionFlashStrength * 0.24})`;
          ctx.lineWidth = (1.05 + subdivisionFlashStrength * 0.65) * shellScale;
          ctx.shadowBlur = (2 + subdivisionFlashStrength * 9) * glowMultiplier * shellScale;
          ctx.shadowColor = 'rgba(127,215,255,0.34)';
          ctx.beginPath();
          ctx.moveTo(innerX, innerY);
          ctx.lineTo(outerX, outerY);
          ctx.stroke();
          ctx.restore();

          if (subdivisionSpokesVisible) {
            ctx.save();
            ctx.strokeStyle = `rgba(127,215,255,${0.055 + subdivisionFlashStrength * 0.06})`;
            ctx.lineWidth = 0.75 * shellScale;
            ctx.beginPath();
            ctx.moveTo(metrics.circleCenterX, metrics.circleCenterY);
            ctx.lineTo(
              metrics.circleCenterX + unitX * (metrics.outerRadius - 18 * shellScale),
              metrics.circleCenterY + unitY * (metrics.outerRadius - 18 * shellScale),
            );
            ctx.stroke();
            ctx.restore();
          }
        });
      }

      metrics.referencePerimeterPoints.forEach((point, index) => {
        const isDownbeat = renderStudy.reference.showDownbeats && index === 0;
        const isBeat = isReferenceBeatStart(renderStudy, index);
        const isBackbeat = activeBackbeatStepPositions.includes(index + 1);
        if (denseReferenceMeter && !isBeat && !isDownbeat && !isBackbeat) {
          return;
        }
        if (currentStudy.pulseLayerEnabled && !isBeat && !isDownbeat && !isBackbeat) {
          return;
        }
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
              : meterSubdivisionMarksVisible
                ? 'rgba(127,215,255,0.34)'
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

      if (outerReferenceHitHighlights.length > 0) {
        outerReferenceHitHighlights.forEach((entry) => {
          const hitPulseStrength = entry.current
            ? Math.max(0, 1 - Math.abs((referenceProgress % 1) - 0.22) / 0.78)
            : 0;
          const hitRadius =
            ((entry.accented ? 3.7 : 3) + hitPulseStrength * (entry.accented ? 1.5 : 1.1)) *
            shellScale;

          ctx.save();
          ctx.globalAlpha = entry.current ? 0.42 : entry.accented ? 0.3 : 0.22;
          ctx.fillStyle = activeRiffColor;
          ctx.shadowBlur =
            (entry.current ? 5 + hitPulseStrength * 5 : entry.accented ? 4 : 2.5) *
            glowMultiplier *
            shellScale;
          ctx.shadowColor = `${activeRiffColor}${entry.current ? '55' : entry.accented ? '42' : '30'}`;
          ctx.beginPath();
          ctx.arc(entry.point.x, entry.point.y, hitRadius, 0, TAU);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = entry.current ? 0.34 : 0.22;
          ctx.strokeStyle = entry.accented ? 'rgba(255,255,255,0.38)' : `${activeRiffColor}66`;
          ctx.lineWidth = (entry.current ? 0.9 : 0.7) * shellScale;
          ctx.beginPath();
          ctx.arc(
            entry.point.x,
            entry.point.y,
            hitRadius + (entry.current ? 3.6 : 2.6) * shellScale,
            0,
            TAU,
          );
          ctx.stroke();
          ctx.restore();

          if (entry.accented) {
            ctx.save();
            ctx.globalAlpha = entry.current ? 0.46 : 0.3;
            ctx.fillStyle = 'rgba(255,255,255,0.58)';
            ctx.strokeStyle = 'rgba(17,17,22,0.36)';
            ctx.lineWidth = 0.65 * shellScale;
            drawDiamondMarker(ctx, entry.point.x, entry.point.y, 2 * shellScale);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        });
      }

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

    if (innerClockVisible && currentStudy.showPhraseRing) {
      ctx.save();
      ctx.strokeStyle = flashActive
        ? `${activeRiffColor}66`
        : `${activeRiffColor}${Math.round(0x22 * lineAlpha).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(metrics.circleCenterX, metrics.circleCenterY, metrics.innerRadius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (innerClockVisible && currentStudy.showPhraseRing && activeRiffPoints.length >= 2) {
      if (!carveViewActive && currentStudy.showPhraseFill) {
        ctx.save();
        ctx.fillStyle = activeRiffColor;
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
      }

      if (!carveViewActive) {
        ctx.save();
        ctx.strokeStyle = activeRiffColor;
        ctx.lineWidth = 2.1;
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 14 * glowMultiplier;
        ctx.shadowColor = activeRiffColor;
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
    }

    if (innerClockVisible && currentStudy.showPhraseRing && carveViewActive) {
      drawRiffCarves(ctx, riffPoints, {
        centerX: metrics.circleCenterX,
        centerY: metrics.circleCenterY,
        radius: metrics.innerRadius,
        stepCount: visibleRiff.stepCount,
        color: activeRiffColor,
        glowMultiplier,
        pointScale,
        showLabels: circularPhraseBoundsActive,
        intensity: contourIntensity,
        fill: currentStudy.showPhraseFill,
      });
    }

    if (innerClockVisible && !carveViewActive && circularPhraseBoundsActive && activeRiffPoints.length >= 2) {
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
        ctx.strokeStyle = activeRiffColor;
        ctx.lineWidth = 1.45 * pointScale;
        ctx.shadowBlur = 10 * glowMultiplier * pointScale;
        ctx.shadowColor = `${activeRiffColor}88`;
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
          ctx.fillStyle = activeRiffColor;
          ctx.globalAlpha = 0.9;
          ctx.shadowBlur = 6 * glowMultiplier * pointScale;
          ctx.shadowColor = `${activeRiffColor}AA`;
          ctx.fillText(candidate.label, candidate.x, candidate.y);
          ctx.restore();
        });
      ctx.restore();

      ctx.restore();
    }

    if (innerClockVisible) {
    riffPoints.forEach((point) => {
      const isSelected = selectedStepRef.current === point.index;
      const isHovered = !isSelected && currentHoveredStep === point.index;
      const isCurrent = innerClockMotionVisible && currentRiffStep === point.index;
      const isPhraseRestart = point.index === 0;
      const effectiveActive = isCurrent ? currentRiffStepState.active : point.active;
      const effectiveAccented = isCurrent ? currentRiffStepState.accented : point.accented;
      const attackRemaining = innerClockMotionVisible
        ? Math.max(
            0,
            ((riffAttackUntilRef.current[point.index] ?? 0) - now) /
              (effectiveAccented ? 320 : 220),
          )
        : 0;
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
        ctx.shadowColor = activeRiffColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 5.6 * pointScale, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = activeRiffColor;
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
        ? activeRiffColor
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
          ? activeRiffColor
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
          : `${activeRiffColor}CC`;
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

      if (currentStudy.showStepLabels && (!circularPhraseBoundsActive || carveViewActive)) {
        const stepLabel = currentStudy.showCountLabels
          ? formatSubdivisionCountLabel(point.index, getReferenceStepsPerBeat(renderStudy.reference))
          : String(point.index + 1);
        const densityLabelScale =
          carveViewActive
            ? visibleRiff.stepCount > 56
              ? 0.62
              : visibleRiff.stepCount > 40
                ? 0.68
                : 0.76
            : visibleRiff.stepCount > 28
              ? 0.76
              : visibleRiff.stepCount > 20
                ? 0.86
                : 1;
        const labelScale = densityLabelScale * exportLabelScale;
        const labelRadius =
          metrics.innerRadius +
          (carveViewActive
            ? (circularPhraseBoundsActive ? 23 : 20) +
              (1 - densityLabelScale) * 14 +
              (exportLayoutMode ? 8 : 0)
            : 18 + (1 - densityLabelScale) * 10 + (exportLayoutMode ? 8 : 0));
        ctx.save();
        ctx.fillStyle = isSelected
          ? 'rgba(255,255,255,0.92)'
          : carveViewActive
            ? effectiveActive
              ? 'rgba(255,255,255,0.62)'
              : 'rgba(255,255,255,0.38)'
            : 'rgba(255,255,255,0.56)';
        ctx.font = `${Math.max(7.5, 10 * labelScale)}px "SF Mono", "Fira Code", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          stepLabel,
          metrics.circleCenterX + Math.cos(point.angle) * labelRadius,
          metrics.circleCenterY + Math.sin(point.angle) * labelRadius,
        );
        ctx.restore();
      }
    });
    }

    if (innerClockVisible) {
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
    }

    if (
      innerClockVisible &&
      innerClockMotionVisible &&
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

    if (innerClockVisible && selectedPoint && !isMobileRef.current) {
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

    if (innerClockMotionVisible) {
      ctx.save();
      ctx.strokeStyle = `${activeRiffColor}68`;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(metrics.circleCenterX, metrics.circleCenterY);
      ctx.lineTo(phraseCursorPoint.x, phraseCursorPoint.y);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = activeRiffColor;
      ctx.shadowBlur = 16 * glowMultiplier;
      ctx.shadowColor = activeRiffColor;
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
    }

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
            : `${activeRiffColor}18`
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
              : `${activeRiffColor}88`
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
              : `${activeRiffColor}55`;
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
        const isBeat = isReferenceBeatStart(renderStudy, step);
        const isBackbeat = isBackbeatStep(renderStudy, step);
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
            : subdivisionGuideVisible
              ? 'rgba(127,215,255,0.075)'
              : 'rgba(255,255,255,0.032)';
        ctx.fillRect(stepX, topLaneY, Math.max(1, stepWidth - 1), laneHeight);
        ctx.restore();

        if (subdivisionGuideVisible && !isBeat && !isBackbeat) {
          ctx.save();
          const subdivisionPulse = isCurrentStep ? 0.16 + 0.12 * (1 - Math.abs((referenceProgress % 1) - 0.5) * 2) : 0;
          ctx.fillStyle = `rgba(127,215,255,${0.14 + subdivisionPulse})`;
          ctx.fillRect(
            stepX + Math.max(0.5, stepWidth * 0.5 - 0.75),
            topLaneY + 4,
            1.5,
            Math.max(6, laneHeight - 8),
          );
          ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = phraseActive
          ? `${activeRiffColor}${phraseAccent ? 'F0' : 'B8'}`
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
            : `${activeRiffColor}A8`;
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
          ctx.fillStyle = `${activeRiffColor}24`;
          ctx.fillRect(markerX - pulseWidth, y + 8, pulseWidth * 2, height - 16);
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = 0.46 + markerFlashStrength * 0.36;
          ctx.shadowBlur = (16 + markerFlashStrength * 28) * glowMultiplier;
          ctx.shadowColor = `${activeRiffColor}EE`;
          ctx.strokeStyle = `${activeRiffColor}FF`;
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
          ctx.fillStyle = `${activeRiffColor}F0`;
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
          const stepsPerBeat = Math.max(1, Math.round(metrics.stepsPerBar / Math.max(1, renderStudy.reference.numerator)));
          const beatNumber = Math.min(
            renderStudy.reference.numerator,
            Math.floor(stepWithinBar / stepsPerBeat) + 1,
          );
          ctx.font = `${compactMobileTimeline ? 8 : 9}px "SF Mono", "Fira Code", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = phraseActive ? 'rgba(17,17,22,0.72)' : 'rgba(255,255,255,0.34)';
          ctx.fillText(
            currentStudy.showCountLabels
              ? formatSubdivisionCountLabel(phraseIndex % visibleRiff.stepCount, stepsPerBeat)
              : String((phraseIndex % visibleRiff.stepCount) + 1),
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
          ctx.fillStyle = `${activeRiffColor}24`;
          ctx.fillRect(drawX - pulseWidth, y + 8, pulseWidth * 2, height - 16);
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = 0.42 + markerFlashStrength * 0.36;
          ctx.shadowBlur = (18 + markerFlashStrength * 28) * glowMultiplier;
          ctx.shadowColor = `${activeRiffColor}EE`;
          ctx.strokeStyle = `${activeRiffColor}FF`;
          ctx.lineWidth = 2 + markerFlashStrength * 1.7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(drawX, y + 8);
          ctx.lineTo(drawX, y + height - 8);
          ctx.stroke();

          ctx.fillStyle = `${activeRiffColor}F0`;
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
              ? `${activeRiffColor}F0`
              : 'rgba(255,255,255,0.72)';
          ctx.font = '8px "SF Mono", "Fira Code", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.shadowBlur = 9 * glowMultiplier;
          ctx.shadowColor =
            markerFlashRemaining > 0
              ? `${activeRiffColor}88`
              : 'rgba(255,255,255,0.24)';
          ctx.fillText(`BAR ${visibleBarNumber}`, drawX + 5, topLaneY - 14);
        }
        ctx.restore();
      }

      if (playheadX != null) {
        ctx.save();
        ctx.strokeStyle = `${activeRiffColor}AA`;
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
        : `${activeRiffColor}44`;
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
        if (audioEnabledRef.current && currentStudy.soundEnabled && referenceBeatStart && currentStudy.referenceSoundEnabled && currentStudy.referenceGain > 0) {
          triggerReferencePulse(currentStudy.soundSettings, currentStudy.referenceGain);
        }
        if (audioEnabledRef.current && currentStudy.soundEnabled && backbeatStep && currentStudy.backbeatSoundEnabled && currentStudy.referenceGain > 0) {
          triggerBackbeatAccent(currentStudy.soundSettings, currentStudy.referenceGain * 2);
        }
        if (
          audioEnabledRef.current &&
          currentStudy.soundEnabled &&
          currentStudy.subdivisionSoundEnabled &&
          currentStudy.subdivisionGain > 0 &&
          currentStudy.pulseLayerEnabled
        ) {
          const stepsPerBar = getReferenceStepsPerBar(currentStudy.reference);
          const subdivisionStep =
            ((currentAbsoluteReferenceStep % stepsPerBar) + stepsPerBar) % stepsPerBar;
          if (currentStudy.pulseLayerSteps?.[subdivisionStep] ?? true) {
            triggerSubdivisionPulse(currentStudy.soundSettings, currentStudy.subdivisionGain);
          }
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
        } else if (isRiffSequenceBarBoundaryAtReferenceStep(currentStudy, currentAbsoluteReferenceStep)) {
          resetFlashUntilRef.current =
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 360;
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
      exportRecordingActiveRef.current = true;
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
        exportRecordingActiveRef.current = false;
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

  const findPulseLayerHit = useCallback(
    (
      metrics: ReturnType<typeof getRiffCycleCanvasMetrics>,
      x: number,
      y: number,
    ): number | null => {
      const currentStudy = studyRef.current;
      if (!currentStudy.pulseLayerEnabled) {
        return null;
      }

      const pulseStepCount = Math.max(1, getReferenceStepsPerBar(currentStudy.reference));
      const pulseRadius = metrics.outerRadius;
      for (let index = 0; index < pulseStepCount; index += 1) {
        const point = getPulseLayerPoint(
          metrics.circleCenterX,
          metrics.circleCenterY,
          pulseRadius,
          index,
          pulseStepCount,
        );
        if (Math.hypot(x - point.x, y - point.y) <= (isMobileRef.current ? 18 : 14)) {
          return index;
        }
      }
      return null;
    },
    [],
  );

  const findMeterBeatHit = useCallback(
    (
      metrics: ReturnType<typeof getRiffCycleCanvasMetrics>,
      x: number,
      y: number,
    ): number | null => {
      const currentStudy = studyRef.current;
      if (!currentStudy.showReferenceRing) {
        return null;
      }

      if (currentStudy.riffSequenceEnabled) {
        const hitRadius = isMobileRef.current ? 24 : 16;
        for (let index = 0; index < metrics.referencePerimeterPoints.length; index += 1) {
          const point = metrics.referencePerimeterPoints[index];
          if (Math.hypot(x - point.x, y - point.y) <= hitRadius) {
            return index + 1;
          }
        }
      }

      for (let index = 0; index < metrics.referenceVertices.length; index += 1) {
        const vertex = metrics.referenceVertices[index];
        if (Math.hypot(x - vertex.x, y - vertex.y) <= (isMobileRef.current ? 26 : 18)) {
          return currentStudy.riffSequenceEnabled
            ? index * getReferenceStepsPerBeat(currentStudy.reference) + 1
            : index + 1;
        }
      }
      return null;
    },
    [],
  );

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
      const metrics = getRiffCycleCanvasMetrics(
        studyRef.current,
        rect.width,
        rect.height,
        isMobileRef.current,
        layoutTopInsetRef.current,
        layoutBottomInsetRef.current,
        effectiveLaneWindowStartStep,
        laneWindowStepCountRef.current,
      );
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const meterBeatHit = findMeterBeatHit(metrics, localX, localY);
      if (meterBeatHit != null && onToggleMeterBeat) {
        onToggleMeterBeat(meterBeatHit);
        onSelectStep(null);
        clearPointerPaint(event);
        return;
      }
      const pulseHit = findPulseLayerHit(metrics, localX, localY);
      if (pulseHit != null && onTogglePulseLayerStep) {
        onTogglePulseLayerStep(pulseHit);
        onSelectStep(null);
        clearPointerPaint(event);
        return;
      }
      const hit = findRiffCycleHit(
        studyRef.current,
        metrics,
        localX,
        localY,
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
      onToggleMeterBeat,
      onTogglePulseLayerStep,
      findMeterBeatHit,
      findPulseLayerHit,
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
      const metrics = getRiffCycleCanvasMetrics(
        studyRef.current,
        rect.width,
        rect.height,
        isMobileRef.current,
        layoutTopInsetRef.current,
        layoutBottomInsetRef.current,
        effectiveLaneWindowStartStep,
        laneWindowStepCountRef.current,
      );
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const hit = findRiffCycleHit(
        studyRef.current,
        metrics,
        localX,
        localY,
      );
      const pulseHit = findPulseLayerHit(metrics, localX, localY);
      const meterBeatHit = findMeterBeatHit(metrics, localX, localY);

      if (activePointerId == null) {
        if (!isMobileRef.current) {
          hoveredStepRef.current = hit?.stepIndex ?? null;
          canvas.style.cursor =
            hit?.stepIndex != null || pulseHit != null || meterBeatHit != null ? 'pointer' : 'default';
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
    [applyLandingPaint, applyStepPaint, clearLongPressTimer, findMeterBeatHit, findPulseLayerHit],
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
