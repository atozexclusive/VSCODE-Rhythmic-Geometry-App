import {
  useCallback,
  useEffect,
  useRef,
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
  getDisplayStepCount,
  getDriftStepOffsets,
  getPhraseProgressAtReferenceProgress,
  getReferenceStepsPerBar,
  getRiffStepIndexAtReferenceStep,
  isBackbeatStep,
  isForcedResetAtReferenceStep,
  isPhraseRestartAtReferenceStep,
  isReferenceBeatStart,
  type RiffCycleStudy,
} from '../lib/riffCycleStudy';
import {
  triggerReferencePulse,
  triggerResetCue,
  triggerRiffPulse,
} from '../lib/riffCycleAudio';

const TAU = Math.PI * 2;

interface RiffCycleCanvasProps {
  study: RiffCycleStudy;
  selectedStep: number | null;
  restartToken: number;
  onSelectStep: (stepIndex: number | null) => void;
  onSetStepActive: (stepIndex: number, active: boolean) => void;
  onToggleAccent: (stepIndex: number) => void;
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

export default function RiffCycleCanvas({
  study,
  selectedStep,
  restartToken,
  onSelectStep,
  onSetStepActive,
  onToggleAccent,
  className,
}: RiffCycleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const studyRef = useRef(study);
  const selectedStepRef = useRef(selectedStep);
  const referenceProgressRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const previousReferenceStepRef = useRef(0);
  const resetFlashUntilRef = useRef(0);
  const riffAttackUntilRef = useRef<number[]>([]);
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  const activePointerIdRef = useRef<number | null>(null);
  const paintActiveRef = useRef<boolean | null>(null);
  const paintedStepsRef = useRef<Set<number>>(new Set());

  studyRef.current = study;
  selectedStepRef.current = selectedStep;
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
    const metrics = getRiffCycleCanvasMetrics(
      currentStudy,
      rect.width,
      rect.height,
      isMobileRef.current,
    );
    const totalDisplaySteps = getDisplayStepCount(currentStudy);
    const stepsPerBar = getReferenceStepsPerBar(currentStudy.reference);
    const referenceProgress = referenceProgressRef.current;
    const currentReferenceStep = Math.floor(referenceProgress) % totalDisplaySteps;
    const stepWithinBar = ((referenceProgress % stepsPerBar) + stepsPerBar) % stepsPerBar;
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
    const flashActive =
      typeof performance !== 'undefined' && performance.now() < resetFlashUntilRef.current;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const selectedPoint =
      selectedStepRef.current == null ? null : riffPoints[selectedStepRef.current] ?? null;

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
      ctx.fillStyle = flashActive ? 'rgba(255,209,102,0.055)' : 'rgba(255,255,255,0.022)';
      ctx.strokeStyle = flashActive ? 'rgba(255,209,102,0.56)' : 'rgba(255,255,255,0.16)';
      ctx.lineWidth = flashActive ? 2.3 : 1.45;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      metrics.referenceVertices.forEach((vertex, index) => {
        ctx.save();
        ctx.strokeStyle =
          currentStudy.reference.showBackbeat &&
          currentStudy.reference.backbeatBeat === index + 1
            ? 'rgba(255,136,194,0.24)'
            : 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(metrics.circleCenterX, metrics.circleCenterY);
        ctx.lineTo(vertex.x, vertex.y);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle =
          currentStudy.reference.showBackbeat &&
          currentStudy.reference.backbeatBeat === index + 1
            ? 'rgba(255,136,194,0.92)'
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
        const pointRadius = isDownbeat ? 5.4 : isBackbeat ? 4.7 : isBeat ? 3.7 : 2.1;

        ctx.save();
        ctx.fillStyle = isBackbeat
          ? 'rgba(255,136,194,0.9)'
          : isDownbeat
            ? 'rgba(255,255,255,0.88)'
            : isBeat
              ? 'rgba(255,255,255,0.42)'
              : 'rgba(255,255,255,0.14)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointRadius, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
    }

    if (currentStudy.showDriftTrail) {
      const driftOffsets = getDriftStepOffsets(currentStudy);
      driftOffsets.forEach((stepOffset, index) => {
        const driftAngle =
          -Math.PI / 2 +
          ((currentStudy.riff.rotationOffset % 360) / 360) * TAU +
          ((stepOffset % currentStudy.riff.stepCount) / currentStudy.riff.stepCount) * TAU;
        const trailRadius = metrics.innerRadius + 18 + index * 2;

        ctx.save();
        ctx.fillStyle = currentStudy.riff.color;
        ctx.globalAlpha = Math.max(0.14, 0.86 - index * 0.18);
        ctx.beginPath();
        ctx.arc(
          metrics.circleCenterX + Math.cos(driftAngle) * trailRadius,
          metrics.circleCenterY + Math.sin(driftAngle) * trailRadius,
          index === 0 ? 4.6 : 3.1,
          0,
          TAU,
        );
        ctx.fill();
        ctx.restore();
      });
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
      ctx.globalAlpha = currentStudy.emphasisMode === 'groove' ? 0.18 : 0.1;
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
      ctx.lineWidth = currentStudy.emphasisMode === 'groove' ? 2.4 : 1.8;
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
      const attackRemaining = Math.max(
        0,
        ((riffAttackUntilRef.current[point.index] ?? 0) - now) /
          (point.accented ? 320 : 220),
      );
      const radius =
        (isSelected ? 8.4 : point.active ? 5.4 : 3) + attackRemaining * (point.accented ? 3 : 1.8);

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
      ctx.fillStyle = point.active ? currentStudy.riff.color : 'rgba(255,255,255,0.18)';
      ctx.globalAlpha = point.active ? Math.min(1, (isCurrent ? 1 : 0.88) + attackRemaining * 0.3) : 0.26;
      ctx.shadowBlur = point.active ? (isCurrent ? 16 : 9) + attackRemaining * 18 : 0;
      ctx.shadowColor = point.active ? currentStudy.riff.color : 'transparent';
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, TAU);
      ctx.fill();
      ctx.restore();

      if (attackRemaining > 0 && point.active) {
        ctx.save();
        ctx.strokeStyle = point.accented
          ? 'rgba(255,209,102,0.95)'
          : `${currentStudy.riff.color}CC`;
        ctx.lineWidth = point.accented ? 2.25 : 1.55;
        ctx.globalAlpha = Math.min(1, attackRemaining + 0.15);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 6 + attackRemaining * 4, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      if (point.accented || isPhraseRestart) {
        ctx.save();
        ctx.strokeStyle = point.accented
          ? 'rgba(255,209,102,0.88)'
          : 'rgba(255,255,255,0.46)';
        ctx.lineWidth = point.accented ? 1.9 : 1.2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + (point.accented ? 3.6 : 2.8), 0, TAU);
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
      const timeline = metrics.timelineRect;
      const { x, y, width, height, topLaneY, bottomLaneY, laneHeight, stepWidth } = timeline;
      const playheadX =
        x + ((referenceProgress % metrics.totalDisplaySteps) / metrics.totalDisplaySteps) * width;

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.028)';
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, x, y, width, height, 18);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      for (let barIndex = 0; barIndex < currentStudy.reference.barCountForDisplay; barIndex += 1) {
        const barX = x + (barIndex / currentStudy.reference.barCountForDisplay) * width;
        const barWidth = width / currentStudy.reference.barCountForDisplay;
        ctx.save();
        ctx.fillStyle =
          barIndex % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.028)';
        ctx.fillRect(barX, y + 10, barWidth, height - 20);
        ctx.restore();
      }

      for (let step = 0; step < metrics.totalDisplaySteps; step += 1) {
        const stepX = x + step * stepWidth;
        const isDownbeat = step % metrics.stepsPerBar === 0;
        const isBeat = isReferenceBeatStart(currentStudy, step);
        const isBackbeat = isBackbeatStep(currentStudy, step);
        const phraseIndex = getRiffStepIndexAtReferenceStep(currentStudy, step);
        const phraseActive = currentStudy.riff.activeSteps[phraseIndex];
        const phraseAccent = currentStudy.riff.accents[phraseIndex];
        const phraseRestart = isPhraseRestartAtReferenceStep(currentStudy, step);
        const forcedReset = isForcedResetAtReferenceStep(currentStudy, step);
        const isCurrentStep = step === currentReferenceStep;
        const isSelectedOccurrence = selectedStepRef.current === phraseIndex;
        const attackRemaining = Math.max(
          0,
          ((riffAttackUntilRef.current[phraseIndex] ?? 0) - now) /
            (phraseAccent ? 320 : 220),
        );

        ctx.save();
        ctx.fillStyle = isDownbeat
          ? 'rgba(255,255,255,0.16)'
          : isBackbeat
            ? 'rgba(255,136,194,0.24)'
            : isBeat
              ? 'rgba(255,255,255,0.085)'
              : 'rgba(255,255,255,0.032)';
        ctx.fillRect(stepX, topLaneY, Math.max(1, stepWidth - 1), laneHeight);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = phraseActive
          ? `${currentStudy.riff.color}${phraseAccent ? 'F0' : 'B8'}`
          : 'rgba(255,255,255,0.05)';
        ctx.globalAlpha = phraseActive ? Math.min(1, 0.86 + attackRemaining * 0.25) : 1;
        ctx.fillRect(stepX, bottomLaneY, Math.max(1, stepWidth - 1), laneHeight);
        if (phraseAccent && phraseActive) {
          ctx.fillStyle = 'rgba(255,209,102,0.92)';
          ctx.fillRect(stepX, bottomLaneY, Math.max(1, stepWidth - 1), 4);
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

      for (let barIndex = 0; barIndex <= currentStudy.reference.barCountForDisplay; barIndex += 1) {
        const markerX = x + (barIndex / currentStudy.reference.barCountForDisplay) * width;
        ctx.save();
        ctx.strokeStyle = barIndex === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.14)';
        ctx.lineWidth = barIndex === 0 ? 1.2 : 1;
        ctx.beginPath();
        ctx.moveTo(markerX, y + 8);
        ctx.lineTo(markerX, y + height - 8);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = `${currentStudy.riff.color}AA`;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(playheadX, topLaneY - 8);
      ctx.lineTo(playheadX, bottomLaneY + laneHeight + 10);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      ctx.font = '10px "SF Mono", "Fira Code", monospace';
      ctx.textBaseline = 'top';
      ctx.fillText('REFERENCE', x + 12, y + 6);
      ctx.fillText('PHRASE', x + 12, bottomLaneY - 16);
      for (let barIndex = 0; barIndex < currentStudy.reference.barCountForDisplay; barIndex += 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.32)';
        ctx.fillText(
          `BAR ${barIndex + 1}`,
          x + barIndex * (width / currentStudy.reference.barCountForDisplay) + 10,
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

      const currentReferenceStep = Math.floor(referenceProgressRef.current) % displaySteps;
      if (currentReferenceStep !== previousReferenceStepRef.current) {
        if (currentStudy.soundEnabled && isReferenceBeatStart(currentStudy, currentReferenceStep)) {
          triggerReferencePulse(isBackbeatStep(currentStudy, currentReferenceStep));
        }

        const riffStepIndex = getRiffStepIndexAtReferenceStep(currentStudy, currentReferenceStep);
        if (currentStudy.riff.activeSteps[riffStepIndex]) {
          riffAttackUntilRef.current[riffStepIndex] =
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) +
            (currentStudy.riff.accents[riffStepIndex] ? 320 : 220);
          if (currentStudy.soundEnabled && currentStudy.riff.soundEnabled) {
            triggerRiffPulse({
              frequency: currentStudy.riff.pitchHz,
              gain: currentStudy.riff.gain,
              accented: Boolean(currentStudy.riff.accents[riffStepIndex]),
            });
          }
        }

        if (isForcedResetAtReferenceStep(currentStudy, currentReferenceStep)) {
          resetFlashUntilRef.current =
            (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 360;
          if (currentStudy.soundEnabled) {
            triggerResetCue();
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
    previousReferenceStepRef.current = 0;
    draw();
  }, [draw, study]);

  useEffect(() => {
    referenceProgressRef.current = 0;
    previousReferenceStepRef.current = 0;
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

  const clearPointerPaint = useCallback((event?: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event && canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    activePointerIdRef.current = null;
    paintActiveRef.current = null;
    paintedStepsRef.current.clear();
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const hit = findRiffCycleHit(
        studyRef.current,
        getRiffCycleCanvasMetrics(studyRef.current, rect.width, rect.height, isMobileRef.current),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );

      if (!hit || hit.stepIndex == null) {
        onSelectStep(null);
        clearPointerPaint(event);
        return;
      }

      if (event.altKey || event.metaKey || event.shiftKey) {
        onSelectStep(hit.stepIndex);
        onToggleAccent(hit.stepIndex);
        clearPointerPaint(event);
        return;
      }

      const nextActive = !Boolean(studyRef.current.riff.activeSteps[hit.stepIndex]);
      activePointerIdRef.current = event.pointerId;
      paintActiveRef.current = nextActive;
      paintedStepsRef.current.clear();
      canvas.setPointerCapture(event.pointerId);
      applyStepPaint(hit.stepIndex);
    },
    [applyStepPaint, clearPointerPaint, onSelectStep, onToggleAccent],
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
        getRiffCycleCanvasMetrics(studyRef.current, rect.width, rect.height, isMobileRef.current),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );

      if (hit?.stepIndex != null) {
        applyStepPaint(hit.stepIndex);
      }
    },
    [applyStepPaint],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      clearPointerPaint(event);
    },
    [clearPointerPaint],
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
        getRiffCycleCanvasMetrics(studyRef.current, rect.width, rect.height, isMobileRef.current),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );

      if (hit?.stepIndex != null) {
        event.preventDefault();
        onSelectStep(hit.stepIndex);
        onToggleAccent(hit.stepIndex);
      }
    },
    [onSelectStep, onToggleAccent],
  );

  return (
    <canvas
      ref={canvasRef}
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
