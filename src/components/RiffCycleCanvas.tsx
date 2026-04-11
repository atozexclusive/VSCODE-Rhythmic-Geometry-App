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
  findRiffCycleHit,
  getReferenceStepPoint,
  getRiffCycleCanvasMetrics,
} from '../lib/riffCycleLayout';
import {
  canEditRiffStep,
  getDisplayStepCount,
  getEffectiveRiffStepStateAtReferenceStep,
  getLandingSlotAtReferenceStep,
  getPhraseProgressAtReferenceProgress,
  getReferenceStepsPerBar,
  getReferenceStepsPerBeat,
  getRiffStepIndexAtReferenceStep,
  isBackbeatStep,
  isForcedResetAtReferenceStep,
  isPhraseRestartAtReferenceStep,
  isReferenceBeatStart,
  type RiffCycleStudy,
  type RiffCycleViewMode,
} from '../lib/riffCycleStudy';
import {
  triggerBackbeatAccent,
  triggerReferencePulse,
  triggerResetCue,
  triggerRiffPulse,
} from '../lib/riffCycleAudio';

const TAU = Math.PI * 2;

interface RiffCycleCanvasProps {
  study: RiffCycleStudy;
  selectedStep: number | null;
  restartToken: number;
  viewModeOverride?: RiffCycleViewMode;
  layoutBottomInset?: number;
  laneWindowStartStep?: number;
  laneWindowStepCount?: number;
  onReferenceStepChange?: (referenceStep: number) => void;
  externalCanvasRef?: MutableRefObject<HTMLCanvasElement | null>;
  onSelectStep: (stepIndex: number | null) => void;
  onSetStepActive: (stepIndex: number, active: boolean) => void;
  onToggleAccent: (stepIndex: number) => void;
  onSetLandingStepActive: (slotIndex: number, active: boolean) => void;
  onToggleLandingAccent: (slotIndex: number) => void;
  className?: string;
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

export default function RiffCycleCanvas({
  study,
  selectedStep,
  restartToken,
  viewModeOverride,
  layoutBottomInset = 0,
  laneWindowStartStep,
  laneWindowStepCount,
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
  const referenceProgressRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const previousReferenceStepRef = useRef(0);
  const wasPlayingRef = useRef(study.playing);
  const resetFlashUntilRef = useRef(0);
  const riffAttackUntilRef = useRef<number[]>([]);
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  const layoutBottomInsetRef = useRef(layoutBottomInset);
  const laneWindowStartStepRef = useRef(laneWindowStartStep);
  const laneWindowStepCountRef = useRef(laneWindowStepCount);
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
  layoutBottomInsetRef.current = layoutBottomInset;
  laneWindowStartStepRef.current = laneWindowStartStep;
  laneWindowStepCountRef.current = laneWindowStepCount;
  onReferenceStepChangeRef.current = onReferenceStepChange;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const rawDpr = window.devicePixelRatio || 1;
    const dpr = Math.min(rawDpr, isMobileRef.current ? 1.75 : 2);
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
    const metrics = getRiffCycleCanvasMetrics(
      currentStudy,
      rect.width,
      rect.height,
      isMobileRef.current,
      layoutBottomInsetRef.current,
      laneWindowStartStepRef.current,
      laneWindowStepCountRef.current,
    );
    const totalDisplaySteps = getDisplayStepCount(currentStudy);
    const stepsPerBar = getReferenceStepsPerBar(currentStudy.reference);
    const stepsPerBeat = getReferenceStepsPerBeat(currentStudy.reference);
    const referenceProgress = referenceProgressRef.current;
    const currentReferenceStep = Math.floor(referenceProgress) % totalDisplaySteps;
    const stepWithinBar = ((referenceProgress % stepsPerBar) + stepsPerBar) % stepsPerBar;
    const beatProgress = stepWithinBar / stepsPerBeat;
    const referenceCursorPoint = getReferenceStepPoint(currentStudy, metrics, stepWithinBar);
    const phraseProgress = getPhraseProgressAtReferenceProgress(currentStudy, referenceProgress);
    const phraseAngle =
      -Math.PI / 2 +
      ((currentStudy.riff.rotationOffset % 360) / 360) * TAU +
      (phraseProgress / currentStudy.riff.stepCount) * TAU;
    const phraseCursorPoint = {
      x: metrics.circleCenterX + Math.cos(phraseAngle) * metrics.innerRadius,
      y: metrics.circleCenterY + Math.sin(phraseAngle) * metrics.innerRadius,
    };
    const riffPoints = currentStudy.riff.activeSteps.map((active, index) => {
      const angle =
        -Math.PI / 2 +
        ((currentStudy.riff.rotationOffset % 360) / 360) * TAU +
        (index / currentStudy.riff.stepCount) * TAU;

      return {
        index,
        angle,
        active,
        accented: currentStudy.riff.accents[index] ?? false,
        x: metrics.circleCenterX + Math.cos(angle) * metrics.innerRadius,
        y: metrics.circleCenterY + Math.sin(angle) * metrics.innerRadius,
      };
    });
    const activeRiffPoints = riffPoints.filter((point) => point.active);
    const currentRiffStep = getRiffStepIndexAtReferenceStep(currentStudy, currentReferenceStep);
    const currentRiffStepState = getEffectiveRiffStepStateAtReferenceStep(
      currentStudy,
      currentReferenceStep,
    );
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

    riffAttackUntilRef.current.length = currentStudy.riff.stepCount;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(metrics.circleCenterX, metrics.topPadding - 10);
    ctx.lineTo(metrics.circleCenterX, metrics.circleCenterY + metrics.outerRadius + 16);
    ctx.stroke();
    ctx.restore();

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
      ctx.strokeStyle = flashActive ? 'rgba(255,209,102,0.56)' : 'rgba(255,255,255,0.16)';
      ctx.lineWidth = flashActive ? 2.3 : 1.45;
      if (flashActive || currentStudy.emphasisMode === 'groove') {
        ctx.fillStyle = flashActive ? 'rgba(255,209,102,0.055)' : 'rgba(255,255,255,0.022)';
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();

      metrics.referenceVertices.forEach((vertex, index) => {
        const beatDistance = Math.min(
          Math.abs(beatProgress - index),
          currentStudy.reference.numerator - Math.abs(beatProgress - index),
        );
        const beatFocus = Math.max(0, 1 - beatDistance);
        const isBackbeatVertex =
          currentStudy.reference.showBackbeat &&
          currentStudy.reference.backbeatBeat === index + 1;
        const vertexRadius = (index === 0 ? 6.2 : isBackbeatVertex ? 5.8 : 5.1) + beatFocus * 1.9;

        ctx.save();
        ctx.strokeStyle =
          isBackbeatVertex
            ? 'rgba(255,136,194,0.24)'
            : 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
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
        ctx.shadowBlur = 8 + beatFocus * 10;
        ctx.shadowColor = isBackbeatVertex
          ? 'rgba(255,136,194,0.48)'
          : 'rgba(255,255,255,0.24)';
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, vertexRadius, 0, TAU);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle =
          isBackbeatVertex
            ? 'rgba(255,136,194,0.92)'
            : index === 0
              ? 'rgba(255,255,255,0.82)'
              : 'rgba(255,255,255,0.66)';
        ctx.font = '11px "SF Mono", "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}`, vertex.x, vertex.y - 18);
        ctx.restore();
      });

      metrics.referencePerimeterPoints.forEach((point, index) => {
        const isDownbeat = currentStudy.reference.showDownbeats && index === 0;
        const isBeat = isReferenceBeatStart(currentStudy, index);
        const isBackbeat = isBackbeatStep(currentStudy, index);
        const pointDistance = Math.min(
          Math.abs(stepWithinBar - index),
          stepsPerBar - Math.abs(stepWithinBar - index),
        );
        const pointFocus = Math.max(0, 1 - pointDistance);
        const pointRadius =
          (isDownbeat ? 5.8 : isBackbeat ? 5.1 : isBeat ? 4.2 : 2.4) +
          pointFocus * (isBeat ? 1.4 : 0.8);

        ctx.save();
        ctx.fillStyle = isBackbeat
          ? 'rgba(255,136,194,0.9)'
          : isDownbeat
            ? 'rgba(255,255,255,0.88)'
            : isBeat
              ? 'rgba(255,255,255,0.56)'
              : 'rgba(255,255,255,0.16)';
        ctx.shadowBlur = isBeat ? 6 + pointFocus * 8 : pointFocus * 5;
        ctx.shadowColor = isBackbeat
          ? 'rgba(255,136,194,0.42)'
          : 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointRadius, 0, TAU);
        ctx.fill();
        ctx.restore();
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
        ctx.shadowBlur = 14;
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
        : `${currentStudy.riff.color}22`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(metrics.circleCenterX, metrics.circleCenterY, metrics.innerRadius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (currentStudy.showPhraseRing && activeRiffPoints.length >= 2) {
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
      ctx.shadowBlur = 14;
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

    riffPoints.forEach((point) => {
      const isSelected = selectedStepRef.current === point.index;
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
        (isSelected ? 8.4 : effectiveActive ? 5.4 : 3) + attackRemaining * (effectiveAccented ? 3 : 1.8);

      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.88)';
        ctx.lineWidth = 1.45;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 4.5, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = effectiveActive
        ? currentStudy.riff.color
        : 'rgba(255,255,255,0.18)';
      ctx.globalAlpha = effectiveActive ? Math.min(1, (isCurrent ? 1 : 0.88) + attackRemaining * 0.3) : 0.26;
      ctx.shadowBlur = effectiveActive ? (isCurrent ? 16 : 9) + attackRemaining * 18 : 0;
      ctx.shadowColor = effectiveActive ? currentStudy.riff.color : 'transparent';
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, TAU);
      ctx.fill();
      ctx.restore();

      if (attackRemaining > 0 && effectiveActive) {
        ctx.save();
        ctx.strokeStyle = effectiveAccented
          ? 'rgba(255,209,102,0.95)'
          : `${currentStudy.riff.color}CC`;
        ctx.lineWidth = effectiveAccented ? 2.25 : 1.55;
        ctx.globalAlpha = Math.min(1, attackRemaining + 0.15);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 6 + attackRemaining * 4, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      if (effectiveAccented || isPhraseRestart) {
        ctx.save();
        ctx.strokeStyle = effectiveAccented
          ? 'rgba(255,209,102,0.88)'
          : 'rgba(255,255,255,0.46)';
        ctx.lineWidth = effectiveAccented ? 1.9 : 1.2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + (effectiveAccented ? 3.6 : 2.8), 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      if (effectiveAccented && effectiveActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,209,102,0.96)';
        ctx.strokeStyle = 'rgba(17,17,22,0.72)';
        ctx.lineWidth = 1;
        drawDiamondMarker(
          ctx,
          point.x,
          point.y,
          Math.max(2.8, radius * 0.42),
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

      if (currentStudy.showStepLabels && currentStudy.riff.stepCount <= 20) {
        ctx.save();
        ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.56)';
        ctx.font = '10px "SF Mono", "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String(point.index + 1),
          metrics.circleCenterX + Math.cos(point.angle) * (metrics.innerRadius + 18),
          metrics.circleCenterY + Math.sin(point.angle) * (metrics.innerRadius + 18),
        );
        ctx.restore();
      }
    });

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
    ctx.shadowBlur = flashActive ? 14 : 8;
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
    ctx.shadowBlur = 16;
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
      const playheadVisible =
        currentReferenceStep >= visibleStartStep && currentReferenceStep < visibleEndStep;
      const playheadX = playheadVisible
        ? x + (currentReferenceStep - visibleStartStep + (referenceProgress % 1)) * stepWidth
        : null;

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.028)';
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
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
        ctx.save();
        ctx.fillStyle =
          barIndex % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.028)';
        ctx.fillRect(barX, y + 10, barWidth, height - 20);
        ctx.restore();
      }

      for (let step = visibleStartStep; step < visibleEndStep; step += 1) {
        const stepX = x + (step - visibleStartStep) * stepWidth;
        const isDownbeat = step % metrics.stepsPerBar === 0;
        const isBeat = isReferenceBeatStart(currentStudy, step);
        const isBackbeat = isBackbeatStep(currentStudy, step);
        const phraseState = getEffectiveRiffStepStateAtReferenceStep(currentStudy, step);
        const phraseIndex = phraseState.phraseIndex;
        const phraseActive = phraseState.active;
        const phraseAccent = phraseState.accented;
        const phraseRestart = isPhraseRestartAtReferenceStep(currentStudy, step);
        const forcedReset = isForcedResetAtReferenceStep(currentStudy, step);
        const isCurrentStep = step === currentReferenceStep;
        const isSelectedOccurrence = selectedStepRef.current === phraseIndex;
        const isLandingStep = phraseState.landingSlot != null;
        const attackRemaining = Math.max(
          0,
          ((riffAttackUntilRef.current[phraseIndex] ?? 0) - now) /
            (phraseAccent ? 320 : 220),
        );

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
        if (currentStudy.showAlignmentMarkers && (phraseRestart || forcedReset)) {
          ctx.strokeStyle = forcedReset ? 'rgba(255,209,102,0.94)' : 'rgba(255,255,255,0.38)';
          ctx.lineWidth = forcedReset ? 2.1 : 1;
          ctx.beginPath();
          ctx.moveTo(stepX + 0.5, topLaneY - 7);
          ctx.lineTo(stepX + 0.5, bottomLaneY + laneHeight + 8);
          ctx.stroke();
        }
        if (phraseRestart) {
          ctx.fillStyle = forcedReset ? 'rgba(255,209,102,0.92)' : 'rgba(255,255,255,0.52)';
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
        ctx.restore();
      }

      for (let barIndex = visibleBarStart; barIndex <= visibleBarEnd; barIndex += 1) {
        const boundaryStep = barIndex * metrics.stepsPerBar;
        const markerX = x + (boundaryStep - visibleStartStep) * stepWidth;
        if (markerX < x - 0.5 || markerX > x + width + 0.5) {
          continue;
        }
        ctx.save();
        ctx.strokeStyle = barIndex === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.14)';
        ctx.lineWidth = barIndex === 0 ? 1.2 : 1;
        ctx.beginPath();
        ctx.moveTo(markerX, y + 8);
        ctx.lineTo(markerX, y + height - 8);
        ctx.stroke();
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
      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      ctx.font = `${compactMobileTimeline ? 9 : 10}px "SF Mono", "Fira Code", monospace`;
      ctx.textBaseline = 'top';
      ctx.fillText(compactMobileTimeline ? 'L1' : 'REFERENCE', x + 12, y + 6);
      ctx.fillText(compactMobileTimeline ? 'L2' : 'PHRASE', x + 12, bottomLaneY - 16);
      if (!currentStudy.landingEditEnabled) {
        ctx.fillStyle = `${currentStudy.riff.color}B8`;
        ctx.fillText(compactMobileTimeline ? 'WRITING' : 'WRITING PHRASE', x + (compactMobileTimeline ? 36 : 58), bottomLaneY - 16);
      }
      if (currentStudy.landingEditEnabled) {
        ctx.fillStyle = 'rgba(127,215,255,0.72)';
        ctx.fillText(compactMobileTimeline ? 'ENDING' : 'EDITING BAR RETURN', x + (compactMobileTimeline ? 40 : 90), bottomLaneY - 16);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.34)';
      ctx.fillText(
        compactMobileTimeline ? 'TAP HIT · HOLD ACCENT' : 'LOWER LANE · TAP HIT · HOLD ACCENT',
        x + 12,
        bottomLaneY + laneHeight + 10,
      );
      for (let barIndex = visibleBarStart; barIndex < visibleBarEnd; barIndex += 1) {
        const barStartStep = Math.max(visibleStartStep, barIndex * metrics.stepsPerBar);
        ctx.fillStyle = 'rgba(255,255,255,0.32)';
        ctx.fillText(
          compactMobileTimeline ? String(barIndex + 1) : `BAR ${barIndex + 1}`,
          x + (barStartStep - visibleStartStep) * stepWidth + 10,
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
      const stepsPerSecond =
        (currentStudy.reference.bpm / 60) *
        (currentStudy.reference.subdivision / currentStudy.reference.denominator);
      const displaySteps = getDisplayStepCount(currentStudy);

      if (currentStudy.playing) {
        if (lastTimestampRef.current == null) {
          lastTimestampRef.current = timestamp;
        } else {
          const deltaSeconds = Math.min(0.05, (timestamp - lastTimestampRef.current) / 1000);
          referenceProgressRef.current =
            (referenceProgressRef.current + deltaSeconds * stepsPerSecond) % displaySteps;
          lastTimestampRef.current = timestamp;
        }
      } else {
        lastTimestampRef.current = timestamp;
      }

      if (currentStudy.playing && !wasPlayingRef.current) {
        previousReferenceStepRef.current = -1;
        lastTimestampRef.current = timestamp;
      }
      wasPlayingRef.current = currentStudy.playing;

      const currentReferenceStep = Math.floor(referenceProgressRef.current) % displaySteps;
      if (currentReferenceStep !== previousReferenceStepRef.current) {
        onReferenceStepChangeRef.current?.(currentReferenceStep);
      }
      if (currentStudy.playing && currentReferenceStep !== previousReferenceStepRef.current) {
        const referenceBeatStart = isReferenceBeatStart(currentStudy, currentReferenceStep);
        const backbeatStep = isBackbeatStep(currentStudy, currentReferenceStep);
        if (currentStudy.soundEnabled && referenceBeatStart && currentStudy.referenceSoundEnabled) {
          triggerReferencePulse(currentStudy.soundSettings);
        }
        if (currentStudy.soundEnabled && backbeatStep && currentStudy.backbeatSoundEnabled) {
          triggerBackbeatAccent(currentStudy.soundSettings);
        }

        const riffStepState = getEffectiveRiffStepStateAtReferenceStep(
          currentStudy,
          currentReferenceStep,
        );
        if (riffStepState.active) {
          riffAttackUntilRef.current[riffStepState.phraseIndex] =
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) +
            (riffStepState.accented ? 320 : 220);
          if (currentStudy.soundEnabled && currentStudy.riff.soundEnabled) {
            triggerRiffPulse({
              frequency: currentStudy.riff.pitchHz,
              gain: currentStudy.riff.gain,
              accented: riffStepState.accented,
              phraseIndex: riffStepState.phraseIndex,
              sound: currentStudy.soundSettings,
            });
          }
        }

        if (isForcedResetAtReferenceStep(currentStudy, currentReferenceStep)) {
          resetFlashUntilRef.current =
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 360;
          if (currentStudy.soundEnabled) {
            triggerResetCue(currentStudy.soundSettings);
          }
        }

        previousReferenceStepRef.current = currentReferenceStep;
      }

      draw();
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw, study, viewModeOverride, layoutBottomInset, laneWindowStartStep, laneWindowStepCount]);

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

    return () => {
      delete (canvas as any).__exportPng;
    };
  }, []);

  useEffect(() => {
    referenceProgressRef.current = 0;
    previousReferenceStepRef.current = -1;
    lastTimestampRef.current = null;
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
      const hit = findRiffCycleHit(
        studyRef.current,
        getRiffCycleCanvasMetrics(
          studyRef.current,
          rect.width,
          rect.height,
          isMobileRef.current,
          layoutBottomInsetRef.current,
          laneWindowStartStepRef.current,
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
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const hit = findRiffCycleHit(
        studyRef.current,
        getRiffCycleCanvasMetrics(
          studyRef.current,
          rect.width,
          rect.height,
          isMobileRef.current,
          layoutBottomInsetRef.current,
          laneWindowStartStepRef.current,
          laneWindowStepCountRef.current,
        ),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );

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
      const hit = findRiffCycleHit(
        studyRef.current,
        getRiffCycleCanvasMetrics(
          studyRef.current,
          rect.width,
          rect.height,
          isMobileRef.current,
          layoutBottomInsetRef.current,
          laneWindowStartStepRef.current,
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
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={handleContextMenu}
      className={className ?? 'absolute inset-0 h-full w-full'}
      style={{ touchAction: 'none' }}
    />
  );
}
