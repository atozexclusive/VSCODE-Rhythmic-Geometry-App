// ============================================================
// Orbital Polymeter — High-Performance Canvas Visualizer
// 60fps rendering via requestAnimationFrame
// Clean, original visual style with bulletproof trigger detection
// ============================================================

import { useRef, useEffect, useCallback, useState, forwardRef } from 'react';
import {
  type Orbit,
  type EngineState,
  tick,
  resonancePosition,
  resonancePositionAtBeats,
} from '../lib/orbitalEngine';
import { playResonanceBeep, type HarmonySettings } from '../lib/audioEngine';
import {
  normalizeInterferenceSettings,
  type GeometryMode,
  type InterferenceSettings,
} from '../lib/geometry';
import { useIsMobile } from '../hooks/use-mobile';

const TAU = 2.0 * Math.PI;
const TRACE_SAMPLE_ARC_PX = 8;
const TRACE_SAMPLE_PHASE_RAD = 0.14;
const MAX_TRACE_SUBSTEPS = 12;
const TRACE_PLAYBACK_OPACITY = 0.15;
const TRACE_STEP_OPACITY = 0.3;
const INTERFERENCE_TRACE_COLOR = '#32CD32';
const INTERFERENCE_PLAYBACK_OPACITY = 0.78;
const INTERFERENCE_STEP_OPACITY = 1.05;
const SWEEP_TRACE_COLOR = '#32CD32';
const SWEEP_DURATION = 20 * Math.PI;
const SWEEP_STEPS = 3000;
const SWEEP_COMPLETION_BEATS = 48;
const SWEEP_INNER_RADIUS = 1;
const SWEEP_OUTER_RADIUS = 2;
const SWEEP_MAX_MODEL_RADIUS = SWEEP_INNER_RADIUS + SWEEP_OUTER_RADIUS;
const MAX_BLOOM_SPEED = 3;

interface Bloom {
  x: number;
  y: number;
  color: string;
  radius: number;
  birth: number;
  orbitRadius: number;
}

interface OrbitalCanvasProps {
  engineState: EngineState;
  traceMode: boolean;
  harmonySettings: HarmonySettings;
  geometryMode: GeometryMode;
  interferenceSettings: InterferenceSettings;
  onOrbitLongPress?: (orbitId: string, x: number, y: number) => void;
  className?: string;
}

const OrbitalCanvas = forwardRef<HTMLCanvasElement, OrbitalCanvasProps>(
  ({ engineState, traceMode, harmonySettings, geometryMode, interferenceSettings, onOrbitLongPress, className }, ref) => {
    const isMobile = useIsMobile();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const bloomsRef = useRef<Bloom[]>([]);
    const traceCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const traceSegmentCountRef = useRef(0);
    const engineRef = useRef<EngineState>(engineState);
    const traceModeRef = useRef(traceMode);
    const harmonySettingsRef = useRef(harmonySettings);
    const geometryModeRef = useRef(geometryMode);
    const interferenceSettingsRef = useRef(interferenceSettings);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const pressHandledRef = useRef(false);
    const previousElapsedBeatsRef = useRef(engineState.elapsedBeats);
    const [, forceUpdate] = useState(0);

    // Keep refs in sync
    engineRef.current = engineState;
    traceModeRef.current = traceMode;
    harmonySettingsRef.current = harmonySettings;
    geometryModeRef.current = geometryMode;
    interferenceSettingsRef.current = interferenceSettings;

    // Clear traces externally
    const clearTraces = useCallback(() => {
      const traceCanvas = traceCanvasRef.current;
      const traceCtx = traceCanvas?.getContext('2d');
      if (traceCanvas && traceCtx) {
        traceCtx.setTransform(1, 0, 0, 1, 0, 0);
        traceCtx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
        const dpr = window.devicePixelRatio || 1;
        traceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      traceSegmentCountRef.current = 0;
    }, []);

    const getAdaptiveTraceSteps = useCallback(
      (orbits: Orbit[], deltaBeats: number) => {
        if (deltaBeats <= 0 || orbits.length < 2) {
          return 1;
        }

        let maxArcDistance = 0;
        let maxPhaseDelta = 0;

        for (const orbit of orbits) {
          const phaseDelta = Math.abs((deltaBeats / orbit.pulseCount) * TAU);
          maxPhaseDelta = Math.max(maxPhaseDelta, phaseDelta);
          maxArcDistance = Math.max(maxArcDistance, orbit.radius * phaseDelta);
        }

        const arcSteps = Math.ceil(maxArcDistance / TRACE_SAMPLE_ARC_PX);
        const phaseSteps = Math.ceil(maxPhaseDelta / TRACE_SAMPLE_PHASE_RAD);
        return Math.max(1, Math.min(MAX_TRACE_SUBSTEPS, Math.max(arcSteps, phaseSteps)));
      },
      [],
    );

    const getInterferencePoint = useCallback(
      (
        innerPoint: { x: number; y: number },
        outerPoint: { x: number; y: number },
        centerX: number,
        centerY: number,
      ) => ({
        x: centerX + (outerPoint.x - centerX) - (innerPoint.x - centerX),
        y: centerY + (outerPoint.y - centerY) - (innerPoint.y - centerY),
      }),
      [],
    );

    const getSweepScale = useCallback((width: number, height: number) => {
      const margin = 36;
      return Math.max(1, (Math.min(width, height) / 2 - margin) / SWEEP_MAX_MODEL_RADIUS);
    }, []);

    const getSweepPositions = useCallback(
      (
        innerOrbit: Orbit,
        outerOrbit: Orbit,
        t: number,
        centerX: number,
        centerY: number,
        scale: number,
      ) => {
        const innerAngle = innerOrbit.direction * innerOrbit.pulseCount * t - Math.PI / 2;
        const outerAngle = outerOrbit.direction * outerOrbit.pulseCount * t - Math.PI / 2;

        const innerPoint = {
          x: centerX + SWEEP_INNER_RADIUS * Math.cos(innerAngle) * scale,
          y: centerY + SWEEP_INNER_RADIUS * Math.sin(innerAngle) * scale,
        };
        const outerPoint = {
          x: centerX + SWEEP_OUTER_RADIUS * Math.cos(outerAngle) * scale,
          y: centerY + SWEEP_OUTER_RADIUS * Math.sin(outerAngle) * scale,
        };
        const sweepPoint = {
          x: centerX + (SWEEP_OUTER_RADIUS * Math.cos(outerAngle) - SWEEP_INNER_RADIUS * Math.cos(innerAngle)) * scale,
          y: centerY + (SWEEP_OUTER_RADIUS * Math.sin(outerAngle) - SWEEP_INNER_RADIUS * Math.sin(innerAngle)) * scale,
        };

        return { innerPoint, outerPoint, sweepPoint };
      },
      [],
    );

    // Expose clearTraces via canvas property
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        (canvas as any).__clearTraces = clearTraces;
        (canvas as any).__exportPng = () => {
          const link = document.createElement('a');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          link.href = canvas.toDataURL('image/png');
          link.download = `orbital-polymeter-${timestamp}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
      }
    }, [clearTraces]);

    // ---- Gesture handling: long-press ----
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const detectOrbitAtPoint = (canvasX: number, canvasY: number) => {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const cx = w / 2;
        const cy = h / 2;

        const state = engineRef.current;
        const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const pointHitRadius = isCoarsePointer ? 28 : 20;
        const ringHitRadius = isCoarsePointer ? 18 : 12;
        for (const orbit of state.orbits) {
          const pos = resonancePosition(orbit, cx, cy);
          const dist = Math.hypot(canvasX - pos.x, canvasY - pos.y);
          if (dist < pointHitRadius) {
            return orbit.id;
          }
          const distFromCenter = Math.hypot(canvasX - cx, canvasY - cy);
          const ringDist = Math.abs(distFromCenter - orbit.radius);
          if (ringDist < ringHitRadius) {
            return orbit.id;
          }
        }
        return null;
      };

      const handleMouseDown = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        mouseDownRef.current = { x: mx, y: my };
        pressHandledRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
          openOrbitMenu(mx, my);
        }, 600);
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (longPressTimerRef.current && (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3)) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        if (onOrbitLongPress && mouseDownRef.current) {
          const rect = canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const moved = Math.hypot(mx - mouseDownRef.current.x, my - mouseDownRef.current.y);
          if (moved <= 6 && !pressHandledRef.current) {
            openOrbitMenu(mouseDownRef.current.x, mouseDownRef.current.y);
          }
        }
        mouseDownRef.current = null;
        pressHandledRef.current = false;
      };

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const rect = canvas.getBoundingClientRect();
          const tx = touch.clientX - rect.left;
          const ty = touch.clientY - rect.top;
          touchStartRef.current = { x: tx, y: ty };
          pressHandledRef.current = false;
          longPressTimerRef.current = setTimeout(() => {
            openOrbitMenu(tx, ty);
          }, 450);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!longPressTimerRef.current || !touchStartRef.current || e.touches.length !== 1) {
          return;
        }

        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;
        const moved = Math.hypot(tx - touchStartRef.current.x, ty - touchStartRef.current.y);
        if (moved > 10) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      };

      const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        touchStartRef.current = null;
        pressHandledRef.current = false;
      };

      const openOrbitMenu = (canvasX: number, canvasY: number) => {
        if (!onOrbitLongPress) return;
        const orbitId = detectOrbitAtPoint(canvasX, canvasY);
        if (orbitId) {
          pressHandledRef.current = true;
          onOrbitLongPress(orbitId, canvasX, canvasY);
        }
      };

      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('touchcancel', handleTouchEnd);

      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      };
    }, [onOrbitLongPress]);

    // ---- Main render loop ----
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: false })!;
      const dpr = window.devicePixelRatio || 1;
      const traceCanvas = document.createElement('canvas');
      const traceCtx = traceCanvas.getContext('2d', { alpha: true })!;
      traceCanvasRef.current = traceCanvas;

      const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        traceCanvas.width = w * dpr;
        traceCanvas.height = h * dpr;
        traceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        clearTraces();
      };

      resize();
      window.addEventListener('resize', resize);

      const BLOOM_DURATION = 500;

      const renderFrame = (timestamp: number) => {
        const now = timestamp;
        const state = engineRef.current;
        const previousElapsedBeats = previousElapsedBeatsRef.current;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const cx = w / 2;
        const cy = h / 2;
        const normalizedInterferenceSettings = normalizeInterferenceSettings(state.orbits, interferenceSettingsRef.current);
        const isInterferenceMode = geometryModeRef.current === 'interference-trace';
        const isSweepMode = geometryModeRef.current === 'sweep';
        const selectedInterferenceOrbitIds = new Set(
          isInterferenceMode || isSweepMode
            ? [normalizedInterferenceSettings.sourceOrbitAId, normalizedInterferenceSettings.sourceOrbitBId].filter(
                (orbitId): orbitId is string => Boolean(orbitId),
              )
            : [],
        );

        const selectedInnerOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitAId);
        const selectedOuterOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitBId);

        // Physics tick — returns triggers for every 12 o'clock crossing
        const triggers = tick(state, timestamp, cx, cy);

        // Process triggers — every single one gets audio + bloom
        for (const trig of triggers) {
          const orbitIndex = state.orbits.findIndex((orbit) => orbit.id === trig.orbitId);
          const orbit = orbitIndex >= 0 ? state.orbits[orbitIndex] : null;
          const shouldRenderOrbitBloom =
            !isSweepMode &&
            ((!isInterferenceMode && !isSweepMode) || selectedInterferenceOrbitIds.has(trig.orbitId));
          if (shouldRenderOrbitBloom && state.speedMultiplier <= MAX_BLOOM_SPEED) {
            bloomsRef.current.push({
              x: trig.x,
              y: trig.y,
              color: trig.color,
              radius: 0,
              birth: timestamp,
              orbitRadius: trig.radius,
            });
          }
          const shouldPlayOrbitAudio =
            !isSweepMode &&
            ((!isInterferenceMode && !isSweepMode) || selectedInterferenceOrbitIds.has(trig.orbitId));
          if (orbit && shouldPlayOrbitAudio) {
            playResonanceBeep(
              {
                orbitIndex,
                pulseCount: orbit.pulseCount,
                radius: orbit.radius,
                color: orbit.color,
                harmonyDegree: orbit.harmonyDegree,
                harmonyRegister: orbit.harmonyRegister,
              },
              harmonySettingsRef.current,
              0.12,
              state.speedMultiplier,
            );
          }
        }

        if (
          isSweepMode &&
          selectedInnerOrbit &&
          selectedOuterOrbit &&
          selectedInnerOrbit.id !== selectedOuterOrbit.id
        ) {
          const previousProgress = Math.min(previousElapsedBeats / SWEEP_COMPLETION_BEATS, 1);
          const currentProgress = Math.min(state.elapsedBeats / SWEEP_COMPLETION_BEATS, 1);
          const previousT = previousProgress * SWEEP_DURATION;
          const currentT = currentProgress * SWEEP_DURATION;
          const sweepScale = getSweepScale(w, h);
          const selectedSweepOrbits = [selectedInnerOrbit, selectedOuterOrbit];

          for (const sweepOrbit of selectedSweepOrbits) {
            const previousRotationCount = Math.floor((Math.abs(sweepOrbit.pulseCount) * previousT) / TAU);
            const currentRotationCount = Math.floor((Math.abs(sweepOrbit.pulseCount) * currentT) / TAU);

            if (currentRotationCount > previousRotationCount) {
              const orbitIndex = state.orbits.findIndex((orbit) => orbit.id === sweepOrbit.id);

              for (let rotationIndex = previousRotationCount + 1; rotationIndex <= currentRotationCount; rotationIndex++) {
                const triggerT = (rotationIndex * TAU) / Math.abs(sweepOrbit.pulseCount);
                const sweepPositions = getSweepPositions(
                  selectedInnerOrbit,
                  selectedOuterOrbit,
                  triggerT,
                  cx,
                  cy,
                  sweepScale,
                );
                const triggerPoint =
                  sweepOrbit.id === selectedInnerOrbit.id
                    ? sweepPositions.innerPoint
                    : sweepPositions.outerPoint;

                if (orbitIndex >= 0) {
                  playResonanceBeep(
                    {
                      orbitIndex,
                      pulseCount: sweepOrbit.pulseCount,
                      radius:
                        sweepOrbit.id === selectedInnerOrbit.id
                          ? SWEEP_INNER_RADIUS * sweepScale
                          : SWEEP_OUTER_RADIUS * sweepScale,
                      color: sweepOrbit.color,
                      harmonyDegree: sweepOrbit.harmonyDegree,
                      harmonyRegister: sweepOrbit.harmonyRegister,
                    },
                    harmonySettingsRef.current,
                    0.12,
                    state.speedMultiplier,
                  );
                }
              }
            }
          }
        }

        // ---- Clear ----
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);

        // ---- Subtle grid ----
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        const gridSize = 60;
        for (let x = 0; x < w; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.restore();

        // ---- Crosshair ----
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();
        ctx.restore();

        // ---- 12 o'clock indicator ----
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // ---- Trace lines (the sweep geometry Mark loves) ----
        if (traceModeRef.current && state.orbits.length >= 2) {
          const deltaBeats = Math.max(0, state.elapsedBeats - previousElapsedBeats);
          if (deltaBeats > 0) {
            if (isSweepMode) {
              const innerOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitAId);
              const outerOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitBId);

              if (innerOrbit && outerOrbit && innerOrbit.id !== outerOrbit.id) {
                const previousProgress = Math.min(previousElapsedBeats / SWEEP_COMPLETION_BEATS, 1);
                const currentProgress = Math.min(state.elapsedBeats / SWEEP_COMPLETION_BEATS, 1);
                const previousIndex = Math.floor(previousProgress * SWEEP_STEPS);
                const currentIndex = Math.floor(currentProgress * SWEEP_STEPS);
                const sweepScale = getSweepScale(w, h);

                if (currentIndex > previousIndex) {
                  let previousSample = getSweepPositions(
                    innerOrbit,
                    outerOrbit,
                    (previousIndex / SWEEP_STEPS) * SWEEP_DURATION,
                    cx,
                    cy,
                    sweepScale,
                  ).sweepPoint;

                  for (let sampleIndex = previousIndex + 1; sampleIndex <= currentIndex; sampleIndex++) {
                    const t = (sampleIndex / SWEEP_STEPS) * SWEEP_DURATION;
                    const currentSample = getSweepPositions(innerOrbit, outerOrbit, t, cx, cy, sweepScale).sweepPoint;

                    traceCtx.save();
                    traceCtx.lineCap = 'round';
                    traceCtx.lineJoin = 'round';
                    traceCtx.globalAlpha = 0.72;
                    traceCtx.strokeStyle = SWEEP_TRACE_COLOR;
                    traceCtx.lineWidth = 1;
                    traceCtx.beginPath();
                    traceCtx.moveTo(previousSample.x, previousSample.y);
                    traceCtx.lineTo(currentSample.x, currentSample.y);
                    traceCtx.stroke();
                    traceCtx.restore();
                    traceSegmentCountRef.current += 1;
                    previousSample = currentSample;
                  }
                }
              }
            } else if (isInterferenceMode) {
              const normalized = normalizeInterferenceSettings(state.orbits, interferenceSettingsRef.current);
              const innerOrbit = state.orbits.find((orbit) => orbit.id === normalized.sourceOrbitAId);
              const outerOrbit = state.orbits.find((orbit) => orbit.id === normalized.sourceOrbitBId);

              if (innerOrbit && outerOrbit && innerOrbit.id !== outerOrbit.id) {
                const substeps = getAdaptiveTraceSteps([innerOrbit, outerOrbit], deltaBeats);
                const traceOpacityBudget = state.playing ? INTERFERENCE_PLAYBACK_OPACITY : INTERFERENCE_STEP_OPACITY;
                const previousInnerPoint = resonancePositionAtBeats(innerOrbit, previousElapsedBeats, cx, cy);
                const previousOuterPoint = resonancePositionAtBeats(outerOrbit, previousElapsedBeats, cx, cy);
                let previousPoint = getInterferencePoint(previousInnerPoint, previousOuterPoint, cx, cy);

                for (let step = 1; step <= substeps; step++) {
                  const t = step / substeps;
                  const sampleBeats = previousElapsedBeats + deltaBeats * t;
                  const innerPoint = resonancePositionAtBeats(innerOrbit, sampleBeats, cx, cy);
                  const outerPoint = resonancePositionAtBeats(outerOrbit, sampleBeats, cx, cy);
                  const interferencePoint = getInterferencePoint(innerPoint, outerPoint, cx, cy);

                  traceCtx.save();
                  traceCtx.lineCap = 'round';
                  traceCtx.lineJoin = 'round';
                  traceCtx.globalAlpha = traceOpacityBudget / substeps;
                  traceCtx.strokeStyle = INTERFERENCE_TRACE_COLOR;
                  traceCtx.lineWidth = 1;
                  traceCtx.beginPath();
                  traceCtx.moveTo(previousPoint.x, previousPoint.y);
                  traceCtx.lineTo(interferencePoint.x, interferencePoint.y);
                  traceCtx.stroke();
                  traceCtx.restore();
                  traceSegmentCountRef.current += 1;
                  previousPoint = interferencePoint;
                }
              }
            } else {
              const resPoints: { x: number; y: number; color: string }[] = [];
              for (const orbit of state.orbits) {
                const pos = resonancePosition(orbit, cx, cy);
                resPoints.push({ ...pos, color: orbit.color });
              }

              if (resPoints.length >= 2) {
                const substeps = getAdaptiveTraceSteps(state.orbits, deltaBeats);
                const traceOpacityBudget = state.playing ? TRACE_PLAYBACK_OPACITY : TRACE_STEP_OPACITY;

                for (let step = 1; step <= substeps; step++) {
                  const t = step / substeps;
                  const sampleBeats = previousElapsedBeats + deltaBeats * t;
                  const samplePoints = state.orbits.map((orbit) => {
                    const pos = resonancePositionAtBeats(orbit, sampleBeats, cx, cy);
                    return { ...pos, color: orbit.color };
                  });

                  for (let i = 0; i < samplePoints.length; i++) {
                    for (let j = i + 1; j < samplePoints.length; j++) {
                      traceCtx.save();
                      traceCtx.lineCap = 'round';
                      traceCtx.globalAlpha = traceOpacityBudget / substeps;
                      traceCtx.strokeStyle = samplePoints[i].color;
                      traceCtx.lineWidth = 0.6;
                      traceCtx.beginPath();
                      traceCtx.moveTo(samplePoints[i].x, samplePoints[i].y);
                      traceCtx.lineTo(samplePoints[j].x, samplePoints[j].y);
                      traceCtx.stroke();
                      traceCtx.restore();
                      traceSegmentCountRef.current += 1;
                    }
                  }
                }
              }
            }
          }

          // Render the accumulated trace layer in one pass so history persists.
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(traceCanvas, 0, 0);
          ctx.restore();
        }

        const currentInnerOrbit = selectedInnerOrbit;
        const currentOuterOrbit = selectedOuterOrbit;
        const sweepScale = getSweepScale(w, h);
        const sweepProgress = Math.min(state.elapsedBeats / SWEEP_COMPLETION_BEATS, 1);
        const sweepT = sweepProgress * SWEEP_DURATION;
        const sweepPositions =
          isSweepMode && currentInnerOrbit && currentOuterOrbit && currentInnerOrbit.id !== currentOuterOrbit.id
            ? getSweepPositions(currentInnerOrbit, currentOuterOrbit, sweepT, cx, cy, sweepScale)
            : null;
        const currentInnerPoint = currentInnerOrbit
          ? sweepPositions?.innerPoint ?? resonancePosition(currentInnerOrbit, cx, cy)
          : null;
        const currentOuterPoint = currentOuterOrbit
          ? sweepPositions?.outerPoint ?? resonancePosition(currentOuterOrbit, cx, cy)
          : null;
        const currentInterferencePoint = sweepPositions
          ? sweepPositions.sweepPoint
          : currentInnerPoint && currentOuterPoint
            ? getInterferencePoint(currentInnerPoint, currentOuterPoint, cx, cy)
            : null;

        const visibleOrbits =
          (isInterferenceMode || isSweepMode) && currentInnerOrbit && currentOuterOrbit
            ? state.orbits.filter(
                (orbit) => orbit.id === currentInnerOrbit.id || orbit.id === currentOuterOrbit.id,
              )
            : state.orbits;

        // ---- Orbit rings ----
        for (const orbit of visibleOrbits) {
          const isSweepInnerOrbit = isSweepMode && currentInnerOrbit?.id === orbit.id;
          const isSweepOuterOrbit = isSweepMode && currentOuterOrbit?.id === orbit.id;
          const r = isSweepInnerOrbit
            ? SWEEP_INNER_RADIUS * sweepScale
            : isSweepOuterOrbit
              ? SWEEP_OUTER_RADIUS * sweepScale
              : orbit.radius;

          // Ring
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, TAU);
          ctx.strokeStyle = orbit.color;
          ctx.globalAlpha = 0.18;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();

          // Pulse tick marks around the ring
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.strokeStyle = orbit.color;
          ctx.lineWidth = 0.5;
          for (let i = 0; i < orbit.pulseCount; i++) {
            const angle = (i / orbit.pulseCount) * TAU - Math.PI / 2;
            const innerR = r - 4;
            const outerR = r + 4;
            ctx.beginPath();
            ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
            ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
            ctx.stroke();
          }
          ctx.restore();

          // Resonance point position
          const pos =
            orbit.id === currentInnerOrbit?.id && currentInnerPoint
              ? currentInnerPoint
              : orbit.id === currentOuterOrbit?.id && currentOuterPoint
                ? currentOuterPoint
                : resonancePosition(orbit, cx, cy);

          // Soft glow around resonance point
          ctx.save();
          const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12);
          grad.addColorStop(0, orbit.color + 'AA');
          grad.addColorStop(0.5, orbit.color + '33');
          grad.addColorStop(1, orbit.color + '00');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 12, 0, TAU);
          ctx.fill();
          ctx.restore();

          // Core dot
          ctx.save();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 3, 0, TAU);
          ctx.fillStyle = orbit.color;
          ctx.globalAlpha = 1;
          ctx.fill();
          ctx.restore();

          // Connecting line from center to resonance point
          ctx.save();
          ctx.globalAlpha = 0.05;
          ctx.strokeStyle = orbit.color;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
          ctx.restore();

          // Pulse count label
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = orbit.color;
          ctx.font = '10px "SF Mono", "Fira Code", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            `${orbit.pulseCount}`,
            cx + (r + 18) * Math.cos(-Math.PI / 4),
            cy + (r + 18) * Math.sin(-Math.PI / 4),
          );
          ctx.restore();
        }

        if (
          (isInterferenceMode || isSweepMode) &&
          currentInnerPoint &&
          currentOuterPoint &&
          currentInterferencePoint &&
          normalizedInterferenceSettings.showConnectors
        ) {
          ctx.save();
          ctx.globalAlpha = 0.36;
          ctx.lineWidth = 0.9;
          ctx.strokeStyle = currentInnerOrbit?.color ?? '#ffffff';
          ctx.beginPath();
          ctx.moveTo(currentInnerPoint.x, currentInnerPoint.y);
          ctx.lineTo(currentInterferencePoint.x, currentInterferencePoint.y);
          ctx.stroke();
          ctx.strokeStyle = currentOuterOrbit?.color ?? '#ffffff';
          ctx.beginPath();
          ctx.moveTo(currentOuterPoint.x, currentOuterPoint.y);
          ctx.lineTo(currentInterferencePoint.x, currentInterferencePoint.y);
          ctx.stroke();
          ctx.restore();
        }

        if ((isInterferenceMode || isSweepMode) && currentInterferencePoint) {
          ctx.save();
          const grad = ctx.createRadialGradient(
            currentInterferencePoint.x,
            currentInterferencePoint.y,
            0,
            currentInterferencePoint.x,
            currentInterferencePoint.y,
            16,
          );
          grad.addColorStop(0, '#32CD32AA');
          grad.addColorStop(0.5, '#32CD3233');
          grad.addColorStop(1, '#32CD3200');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(currentInterferencePoint.x, currentInterferencePoint.y, 16, 0, TAU);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          ctx.arc(currentInterferencePoint.x, currentInterferencePoint.y, 3, 0, TAU);
          ctx.fillStyle = isSweepMode ? SWEEP_TRACE_COLOR : INTERFERENCE_TRACE_COLOR;
          ctx.fill();
          ctx.restore();
        }

        // ---- Radial blooms (on 12 o'clock trigger) ----
        bloomsRef.current = bloomsRef.current.filter((b) => now - b.birth < BLOOM_DURATION);

        for (const bloom of bloomsRef.current) {
          const age = (now - bloom.birth) / BLOOM_DURATION;
          const eased = 1 - Math.pow(1 - age, 3);
          const maxRadius = 50;
          const currentRadius = eased * maxRadius;
          const alpha = (1 - age) * 0.5;

          // Radial burst lines
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = bloom.color;
          ctx.lineWidth = 1.2 * (1 - age);
          const numRays = 12;
          for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * TAU;
            const innerR = currentRadius * 0.3;
            const outerR = currentRadius;
            ctx.beginPath();
            ctx.moveTo(
              bloom.x + innerR * Math.cos(angle),
              bloom.y + innerR * Math.sin(angle),
            );
            ctx.lineTo(
              bloom.x + outerR * Math.cos(angle),
              bloom.y + outerR * Math.sin(angle),
            );
            ctx.stroke();
          }
          ctx.restore();

          // Expanding ring
          ctx.save();
          ctx.globalAlpha = alpha * 0.4;
          ctx.strokeStyle = bloom.color;
          ctx.lineWidth = 1.5 * (1 - age);
          ctx.beginPath();
          ctx.arc(bloom.x, bloom.y, currentRadius, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }

        // ---- HUD ----
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "SF Mono", "Fira Code", monospace';
        ctx.textAlign = 'left';
        const bpm = (state.baseBPM * state.speedMultiplier).toFixed(1);
        ctx.fillText(`BPM ${bpm}`, 16, h - 60);
        ctx.fillText(`ORBITS ${state.orbits.length}`, 16, h - 46);
        ctx.fillText(`BEATS ${state.elapsedBeats.toFixed(2)}`, 16, h - 32);
        const modeLabel = isSweepMode
          ? 'MODE SWEEP'
          : isInterferenceMode
            ? 'MODE INTERFERENCE'
            : 'MODE STANDARD';
        ctx.fillText(modeLabel, 16, h - 18);
        if (traceModeRef.current) {
          ctx.fillStyle = '#00FFAA';
          ctx.fillText(`TRACE \u25cf  ${traceSegmentCountRef.current}`, 16, h - 4);
        }
        ctx.restore();

        previousElapsedBeatsRef.current = state.elapsedBeats;
        rafRef.current = requestAnimationFrame(renderFrame);
      };

      rafRef.current = requestAnimationFrame(renderFrame);

      return () => {
        cancelAnimationFrame(rafRef.current);
        window.removeEventListener('resize', resize);
        traceCanvasRef.current = null;
      };
    }, []);

    return (
      <canvas
        ref={(el) => {
          canvasRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        className={className ?? (isMobile ? 'absolute inset-x-0 top-0 w-full h-[68svh] min-h-[420px]' : 'fixed inset-0 w-full h-full')}
        style={{
          touchAction: isMobile ? 'pan-y' : 'none',
          cursor: 'crosshair',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />
    );
  },
);

OrbitalCanvas.displayName = 'OrbitalCanvas';

export default OrbitalCanvas;
