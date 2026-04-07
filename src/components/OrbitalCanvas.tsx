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
const SWEEP_THIRD_RADIUS = 3;
const SWEEP_FOURTH_RADIUS = 4;
const SWEEP_MAX_MODEL_RADIUS = SWEEP_INNER_RADIUS + SWEEP_OUTER_RADIUS;
const SWEEP_TRIAD_MAX_MODEL_RADIUS = SWEEP_INNER_RADIUS + SWEEP_OUTER_RADIUS + SWEEP_THIRD_RADIUS;
const SWEEP_QUAD_MAX_MODEL_RADIUS =
  SWEEP_INNER_RADIUS + SWEEP_OUTER_RADIUS + SWEEP_THIRD_RADIUS + SWEEP_FOURTH_RADIUS;
const MAX_BLOOM_SPEED = 3;
const INTERFERENCE_WEIGHTS = [-1, 1, 1, -1] as const;

function blendHexColors(colorA?: string, colorB?: string): string {
  const fallback = colorA ?? colorB ?? INTERFERENCE_TRACE_COLOR;
  if (!colorA || !colorB) {
    return fallback;
  }

  const parseHex = (value: string) => {
    const hex = value.replace('#', '');
    if (hex.length !== 6) {
      return null;
    }
    const parsed = Number.parseInt(hex, 16);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    };
  };

  const a = parseHex(colorA);
  const b = parseHex(colorB);
  if (!a || !b) {
    return fallback;
  }

  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
  return `#${toHex(Math.round((a.r + b.r) / 2))}${toHex(Math.round((a.g + b.g) / 2))}${toHex(
    Math.round((a.b + b.b) / 2),
  )}`;
}

function blendMultipleHexColors(...colors: Array<string | null | undefined>): string {
  const filtered = colors.filter((color): color is string => Boolean(color));
  if (filtered.length === 0) {
    return INTERFERENCE_TRACE_COLOR;
  }
  return filtered.slice(1).reduce((mixed, color) => blendHexColors(mixed, color), filtered[0]);
}

const EXPORT_ASPECTS = {
  landscape: { width: 1600, height: 900 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
} as const;

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
  showPlanets?: boolean;
  showHudStats?: boolean;
  onToggleHudStats?: () => void;
  harmonySettings: HarmonySettings;
  geometryMode: GeometryMode;
  interferenceSettings: InterferenceSettings;
  presentationMode?: boolean;
  onOrbitLongPress?: (orbitId: string, x: number, y: number) => void;
  className?: string;
}

const OrbitalCanvas = forwardRef<HTMLCanvasElement, OrbitalCanvasProps>(
  ({ engineState, traceMode, showPlanets = true, showHudStats = true, onToggleHudStats, harmonySettings, geometryMode, interferenceSettings, presentationMode = false, onOrbitLongPress, className }, ref) => {
    const isMobile = useIsMobile();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const bloomsRef = useRef<Bloom[]>([]);
    const traceCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const traceSegmentCountRef = useRef(0);
    const engineRef = useRef<EngineState>(engineState);
    const traceModeRef = useRef(traceMode);
    const showPlanetsRef = useRef(showPlanets);
    const harmonySettingsRef = useRef(harmonySettings);
    const geometryModeRef = useRef(geometryMode);
    const interferenceSettingsRef = useRef(interferenceSettings);
    const presentationModeRef = useRef(presentationMode);
    const isMobileRef = useRef(isMobile);
    const hudVisibleRef = useRef(showHudStats);
    const hoverOrbitIdRef = useRef<string | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const pressHandledRef = useRef(false);
    const previousElapsedBeatsRef = useRef(engineState.elapsedBeats);
    const lastMobileLayoutRef = useRef<{
      width: number;
      height: number;
      cx: number;
      cy: number;
      orbitScale: number;
    } | null>(null);
    const [, forceUpdate] = useState(0);

    // Keep refs in sync
    engineRef.current = engineState;
    traceModeRef.current = traceMode;
    showPlanetsRef.current = showPlanets;
    hudVisibleRef.current = showHudStats;
    harmonySettingsRef.current = harmonySettings;
    geometryModeRef.current = geometryMode;
    interferenceSettingsRef.current = interferenceSettings;
    presentationModeRef.current = presentationMode;
    isMobileRef.current = isMobile;

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
        points: Array<{ x: number; y: number }>,
        centerX: number,
        centerY: number,
      ) => ({
        x:
          centerX +
          points.reduce(
            (sum, point, index) => sum + (point.x - centerX) * (INTERFERENCE_WEIGHTS[index] ?? 1),
            0,
          ),
        y:
          centerY +
          points.reduce(
            (sum, point, index) => sum + (point.y - centerY) * (INTERFERENCE_WEIGHTS[index] ?? 1),
            0,
          ),
      }),
      [],
    );

    const getSweepScale = useCallback((width: number, height: number, modelRadius: number = SWEEP_MAX_MODEL_RADIUS) => {
      const margin = 36;
      return Math.max(1, (Math.min(width, height) / 2 - margin) / modelRadius);
    }, []);

    const getStandardLayoutMetrics = useCallback(
      (orbits: Orbit[], width: number, height: number) => {
        const cx = width / 2;
        const sortedRadii = orbits.map((orbit) => orbit.radius).sort((a, b) => b - a);
        const maxRadius = sortedRadii[0] ?? 0;
        const normalizedInterference = normalizeInterferenceSettings(orbits, interferenceSettingsRef.current);
        const selectedInterferenceOrbits = [
          normalizedInterference.sourceOrbitAId,
          normalizedInterference.sourceOrbitBId,
          normalizedInterference.sourceOrbitCId,
          normalizedInterference.sourceOrbitDId,
        ]
          .map((orbitId) => orbits.find((orbit) => orbit.id === orbitId))
          .filter((orbit): orbit is Orbit => Boolean(orbit));
        const uniqueSelectedInterferenceOrbits = selectedInterferenceOrbits.filter(
          (orbit, index, collection) => collection.findIndex((candidate) => candidate.id === orbit.id) === index,
        );
        const interferenceRadiusBudget =
          uniqueSelectedInterferenceOrbits.length >= 2
            ? uniqueSelectedInterferenceOrbits.reduce((sum, orbit) => sum + orbit.radius, 0)
            : sortedRadii.length >= 2
              ? sortedRadii[0] + sortedRadii[1]
              : maxRadius;
        if (!isMobileRef.current || orbits.length === 0) {
          return {
            cx,
            cy: height / 2,
            orbitScale: 1,
            targetRadius: Math.min(width, height) / 2,
            maxRadius,
            effectiveVisualRadius: maxRadius,
          };
        }

        const smallPhone = width <= 390;
        const mediumPhone = width <= 430;
        const sidePadding = smallPhone ? 20 : mediumPhone ? 18 : 16;
        const visualAllowance = smallPhone ? 18 : mediumPhone ? 16 : 14;
        const targetRadius = Math.max(1, Math.min(width, height) / 2 - sidePadding - visualAllowance);
        const cy = height / 2;
        const baseVisualRadius =
          geometryModeRef.current === 'interference-trace'
            ? Math.max(maxRadius, interferenceRadiusBudget)
            : geometryModeRef.current === 'sweep'
              ? (() => {
                  const normalizedSweep = normalizeInterferenceSettings(engineRef.current.orbits, interferenceSettingsRef.current);
                  return normalizedSweep.sourceOrbitDId
                    ? SWEEP_QUAD_MAX_MODEL_RADIUS
                    : normalizedSweep.sourceOrbitCId
                      ? SWEEP_TRIAD_MAX_MODEL_RADIUS
                      : SWEEP_MAX_MODEL_RADIUS;
                })()
              : maxRadius;
        const effectiveVisualRadius = baseVisualRadius + 16;
        const orbitScale = Math.min(1, targetRadius / effectiveVisualRadius);

        return { cx, cy, orbitScale, targetRadius, maxRadius, effectiveVisualRadius };
      },
      [],
    );

    const scalePointFromCenter = useCallback(
      (
        point: { x: number; y: number },
        centerX: number,
        centerY: number,
        scale: number,
      ) => ({
        x: centerX + (point.x - centerX) * scale,
        y: centerY + (point.y - centerY) * scale,
      }),
      [],
    );

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

    const getSweepTriadPositions = useCallback(
      (
        firstOrbit: Orbit,
        secondOrbit: Orbit,
        thirdOrbit: Orbit,
        t: number,
        centerX: number,
        centerY: number,
        scale: number,
      ) => {
        const firstAngle = firstOrbit.direction * firstOrbit.pulseCount * t - Math.PI / 2;
        const secondAngle = secondOrbit.direction * secondOrbit.pulseCount * t - Math.PI / 2;
        const thirdAngle = thirdOrbit.direction * thirdOrbit.pulseCount * t - Math.PI / 2;

        const firstPoint = {
          x: centerX + SWEEP_INNER_RADIUS * Math.cos(firstAngle) * scale,
          y: centerY + SWEEP_INNER_RADIUS * Math.sin(firstAngle) * scale,
        };
        const secondPoint = {
          x: centerX + SWEEP_OUTER_RADIUS * Math.cos(secondAngle) * scale,
          y: centerY + SWEEP_OUTER_RADIUS * Math.sin(secondAngle) * scale,
        };
        const thirdPoint = {
          x: centerX + SWEEP_THIRD_RADIUS * Math.cos(thirdAngle) * scale,
          y: centerY + SWEEP_THIRD_RADIUS * Math.sin(thirdAngle) * scale,
        };
        const sweepPoint = {
          x:
            centerX +
            (SWEEP_INNER_RADIUS * Math.cos(firstAngle) -
              SWEEP_OUTER_RADIUS * Math.cos(secondAngle) +
              SWEEP_THIRD_RADIUS * Math.cos(thirdAngle)) *
              scale,
          y:
            centerY +
            (SWEEP_INNER_RADIUS * Math.sin(firstAngle) -
              SWEEP_OUTER_RADIUS * Math.sin(secondAngle) +
              SWEEP_THIRD_RADIUS * Math.sin(thirdAngle)) *
              scale,
        };

        return { firstPoint, secondPoint, thirdPoint, sweepPoint };
      },
      [],
    );

    const getSweepQuadPositions = useCallback(
      (
        firstOrbit: Orbit,
        secondOrbit: Orbit,
        thirdOrbit: Orbit,
        fourthOrbit: Orbit,
        t: number,
        centerX: number,
        centerY: number,
        scale: number,
      ) => {
        const firstAngle = firstOrbit.direction * firstOrbit.pulseCount * t - Math.PI / 2;
        const secondAngle = secondOrbit.direction * secondOrbit.pulseCount * t - Math.PI / 2;
        const thirdAngle = thirdOrbit.direction * thirdOrbit.pulseCount * t - Math.PI / 2;
        const fourthAngle = fourthOrbit.direction * fourthOrbit.pulseCount * t - Math.PI / 2;

        const firstPoint = {
          x: centerX + SWEEP_INNER_RADIUS * Math.cos(firstAngle) * scale,
          y: centerY + SWEEP_INNER_RADIUS * Math.sin(firstAngle) * scale,
        };
        const secondPoint = {
          x: centerX + SWEEP_OUTER_RADIUS * Math.cos(secondAngle) * scale,
          y: centerY + SWEEP_OUTER_RADIUS * Math.sin(secondAngle) * scale,
        };
        const thirdPoint = {
          x: centerX + SWEEP_THIRD_RADIUS * Math.cos(thirdAngle) * scale,
          y: centerY + SWEEP_THIRD_RADIUS * Math.sin(thirdAngle) * scale,
        };
        const fourthPoint = {
          x: centerX + SWEEP_FOURTH_RADIUS * Math.cos(fourthAngle) * scale,
          y: centerY + SWEEP_FOURTH_RADIUS * Math.sin(fourthAngle) * scale,
        };
        const sweepPoint = {
          x:
            centerX +
            (SWEEP_INNER_RADIUS * Math.cos(firstAngle) -
              SWEEP_OUTER_RADIUS * Math.cos(secondAngle) +
              SWEEP_THIRD_RADIUS * Math.cos(thirdAngle) -
              SWEEP_FOURTH_RADIUS * Math.cos(fourthAngle)) *
              scale,
          y:
            centerY +
            (SWEEP_INNER_RADIUS * Math.sin(firstAngle) -
              SWEEP_OUTER_RADIUS * Math.sin(secondAngle) +
              SWEEP_THIRD_RADIUS * Math.sin(thirdAngle) -
              SWEEP_FOURTH_RADIUS * Math.sin(fourthAngle)) *
              scale,
        };

        return { firstPoint, secondPoint, thirdPoint, fourthPoint, sweepPoint };
      },
      [],
    );

    // Expose clearTraces via canvas property
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        (canvas as any).__clearTraces = clearTraces;
        (canvas as any).__exportPng = async ({
          aspect = 'landscape',
          scale = 2,
        }: {
          aspect?: keyof typeof EXPORT_ASPECTS;
          scale?: 1 | 2 | 4;
        } = {}) => {
          const traceCanvas = traceCanvasRef.current;
          if (!traceCanvas) return;

          const waitForFrame = () =>
            new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

          const previousHudVisible = hudVisibleRef.current;
          hudVisibleRef.current = false;
          forceUpdate((value) => value + 1);
          await waitForFrame();
          await waitForFrame();

          const exportSpec = EXPORT_ASPECTS[aspect];
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = exportSpec.width * scale;
          exportCanvas.height = exportSpec.height * scale;
          const exportCtx = exportCanvas.getContext('2d');

          if (!exportCtx) {
            hudVisibleRef.current = previousHudVisible;
            return;
          }

          exportCtx.fillStyle = '#0a0a0f';
          exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

          const sourceWidth = canvas.width;
          const sourceHeight = canvas.height;
          const containScale = Math.min(exportCanvas.width / sourceWidth, exportCanvas.height / sourceHeight);
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
          link.download = `orbital-polymeter-${aspect}-${scale}x-${timestamp}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          hudVisibleRef.current = previousHudVisible;
          forceUpdate((value) => value + 1);
        };

        (canvas as any).__captureThumbnail = async () => {
          const waitForFrame = () =>
            new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

          const previousHudVisible = hudVisibleRef.current;
          hudVisibleRef.current = false;
          forceUpdate((value) => value + 1);
          await waitForFrame();
          await waitForFrame();

          const thumbnailCanvas = document.createElement('canvas');
          const size = 160;
          thumbnailCanvas.width = size;
          thumbnailCanvas.height = size;
          const thumbnailCtx = thumbnailCanvas.getContext('2d');

          if (!thumbnailCtx) {
            hudVisibleRef.current = previousHudVisible;
            forceUpdate((value) => value + 1);
            return undefined;
          }

          const sourceSize = Math.min(canvas.width, canvas.height);
          const sourceX = (canvas.width - sourceSize) / 2;
          const sourceY = (canvas.height - sourceSize) / 2;
          thumbnailCtx.imageSmoothingEnabled = true;
          thumbnailCtx.imageSmoothingQuality = 'high';
          thumbnailCtx.drawImage(canvas, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

          hudVisibleRef.current = previousHudVisible;
          forceUpdate((value) => value + 1);
          return thumbnailCanvas.toDataURL('image/jpeg', 0.72);
        };

        (canvas as any).__exportVideo = async ({
          durationSeconds = 8,
        }: {
          durationSeconds?: 8 | 12;
        } = {}) => {
          if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
            throw new Error('Video export is not supported in this browser.');
          }

          const mimeType =
            MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
              ? 'video/webm;codecs=vp9'
              : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                ? 'video/webm;codecs=vp8'
                : 'video/webm';

          const waitForFrame = () =>
            new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

          const previousHudVisible = hudVisibleRef.current;
          hudVisibleRef.current = false;
          forceUpdate((value) => value + 1);
          try {
            await waitForFrame();

            const stream = canvas.captureStream(60);
            const recorder = new MediaRecorder(stream, {
              mimeType,
              videoBitsPerSecond: 12_000_000,
            });
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunks.push(event.data);
              }
            };

            await new Promise<void>((resolve, reject) => {
              recorder.onerror = () => reject(new Error('Recording failed.'));
              recorder.onstop = () => resolve();
              recorder.start();
              window.setTimeout(() => recorder.stop(), durationSeconds * 1000);
            });

            stream.getTracks().forEach((track) => track.stop());

            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const link = document.createElement('a');
            link.href = url;
            link.download = `orbital-polymeter-${durationSeconds}s-${timestamp}.webm`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } finally {
            hudVisibleRef.current = previousHudVisible;
            forceUpdate((value) => value + 1);
          }
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
        const state = engineRef.current;
        const {
          cx,
          cy,
          orbitScale,
          targetRadius,
          maxRadius,
          effectiveVisualRadius,
        } = getStandardLayoutMetrics(state.orbits, w, h);
        const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const pointHitRadius = isCoarsePointer ? 28 : 20;
        const ringHitRadius = isCoarsePointer ? 18 : 12;
        let bestMatch: { orbitId: string; score: number } | null = null;
        for (const orbit of state.orbits) {
          const pos = scalePointFromCenter(resonancePosition(orbit, cx, cy), cx, cy, orbitScale);
          const dist = Math.hypot(canvasX - pos.x, canvasY - pos.y);
          if (dist < pointHitRadius) {
            if (!bestMatch || dist < bestMatch.score) {
              bestMatch = { orbitId: orbit.id, score: dist };
            }
          }
          const distFromCenter = Math.hypot(canvasX - cx, canvasY - cy);
          const ringDist = Math.abs(distFromCenter - orbit.radius * orbitScale);
          if (ringDist < ringHitRadius) {
            const score = ringDist + 6;
            if (!bestMatch || score < bestMatch.score) {
              bestMatch = { orbitId: orbit.id, score };
            }
          }
        }
        return bestMatch?.orbitId ?? null;
      };

      const isHudToggleHit = (canvasX: number, canvasY: number) => {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        if (presentationModeRef.current) {
          return false;
        }

        if (hudVisibleRef.current) {
          return canvasX >= 8 && canvasX <= Math.min(160, w * 0.45) && canvasY >= h - 76 && canvasY <= h - 2;
        }

        return canvasX >= 8 && canvasX <= 54 && canvasY >= h - 28 && canvasY <= h - 6;
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
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        hoverOrbitIdRef.current = detectOrbitAtPoint(mx, my);
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
        if (mouseDownRef.current) {
          const rect = canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const moved = Math.hypot(mx - mouseDownRef.current.x, my - mouseDownRef.current.y);
          if (moved <= 6 && !pressHandledRef.current) {
            if (isHudToggleHit(mouseDownRef.current.x, mouseDownRef.current.y)) {
              onToggleHudStats?.();
              mouseDownRef.current = null;
              return;
            }
            openOrbitMenu(mouseDownRef.current.x, mouseDownRef.current.y);
          }
        }
        mouseDownRef.current = null;
        pressHandledRef.current = false;
      };

      const handleMouseLeave = () => {
        hoverOrbitIdRef.current = null;
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
        if (touchStartRef.current && !pressHandledRef.current && isHudToggleHit(touchStartRef.current.x, touchStartRef.current.y)) {
          onToggleHudStats?.();
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
      canvas.addEventListener('mouseleave', handleMouseLeave);
      canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('touchcancel', handleTouchEnd);

      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      };
    }, [onOrbitLongPress, onToggleHudStats]);

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
        const bounds = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(bounds.width || window.innerWidth));
        const h = Math.max(1, Math.round(bounds.height || window.innerHeight));
        const nextCanvasWidth = w * dpr;
        const nextCanvasHeight = h * dpr;

        if (
          canvas.width === nextCanvasWidth &&
          canvas.height === nextCanvasHeight &&
          traceCanvas.width === nextCanvasWidth &&
          traceCanvas.height === nextCanvasHeight
        ) {
          return;
        }

        canvas.width = nextCanvasWidth;
        canvas.height = nextCanvasHeight;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        traceCanvas.width = nextCanvasWidth;
        traceCanvas.height = nextCanvasHeight;
        traceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        clearTraces();
      };

      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      window.addEventListener('resize', resize);

      const BLOOM_DURATION = 500;

      const renderFrame = (timestamp: number) => {
        const now = timestamp;
        const state = engineRef.current;
        const previousElapsedBeats = previousElapsedBeatsRef.current;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const {
          cx,
          cy,
          orbitScale,
          targetRadius,
          maxRadius,
          effectiveVisualRadius,
        } = getStandardLayoutMetrics(state.orbits, w, h);
        if (isMobileRef.current) {
          const previousLayout = lastMobileLayoutRef.current;
          if (
            previousLayout &&
            (Math.abs(previousLayout.width - w) > 0.5 ||
              Math.abs(previousLayout.height - h) > 0.5 ||
              Math.abs(previousLayout.cx - cx) > 0.5 ||
              Math.abs(previousLayout.cy - cy) > 0.5 ||
              Math.abs(previousLayout.orbitScale - orbitScale) > 0.001)
          ) {
            clearTraces();
            bloomsRef.current = [];
          }
          lastMobileLayoutRef.current = { width: w, height: h, cx, cy, orbitScale };
        } else {
          lastMobileLayoutRef.current = null;
        }
        const normalizedInterferenceSettings = normalizeInterferenceSettings(state.orbits, interferenceSettingsRef.current);
        const isInterferenceMode = geometryModeRef.current === 'interference-trace';
        const isSweepMode = geometryModeRef.current === 'sweep';
        const selectedInterferenceOrbitIds = new Set(
          isInterferenceMode || isSweepMode
            ? [
                normalizedInterferenceSettings.sourceOrbitAId,
                normalizedInterferenceSettings.sourceOrbitBId,
                normalizedInterferenceSettings.sourceOrbitCId,
                normalizedInterferenceSettings.sourceOrbitDId,
              ].filter(
                (orbitId): orbitId is string => Boolean(orbitId),
              )
            : [],
        );

        const selectedInnerOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitAId);
        const selectedOuterOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitBId);
        const selectedThirdOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitCId);
        const selectedFourthOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitDId);
        const isSweepTriad = Boolean(
          isSweepMode &&
            selectedInnerOrbit &&
            selectedOuterOrbit &&
            selectedThirdOrbit &&
            new Set([selectedInnerOrbit.id, selectedOuterOrbit.id, selectedThirdOrbit.id]).size === 3,
        );
        const isSweepQuad = Boolean(
          isSweepMode &&
            selectedInnerOrbit &&
            selectedOuterOrbit &&
            selectedThirdOrbit &&
            selectedFourthOrbit &&
            new Set([
              selectedInnerOrbit.id,
              selectedOuterOrbit.id,
              selectedThirdOrbit.id,
              selectedFourthOrbit.id,
            ]).size === 4,
        );
        const isInterferenceTriad = Boolean(
          isInterferenceMode &&
            selectedInnerOrbit &&
            selectedOuterOrbit &&
            selectedThirdOrbit &&
            new Set([selectedInnerOrbit.id, selectedOuterOrbit.id, selectedThirdOrbit.id]).size === 3,
        );
        const isInterferenceQuad = Boolean(
          isInterferenceMode &&
            selectedInnerOrbit &&
            selectedOuterOrbit &&
            selectedThirdOrbit &&
            selectedFourthOrbit &&
            new Set([
              selectedInnerOrbit.id,
              selectedOuterOrbit.id,
              selectedThirdOrbit.id,
              selectedFourthOrbit.id,
            ]).size === 4,
        );

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
            const scaledTriggerPoint = isSweepMode
              ? { x: trig.x, y: trig.y }
              : scalePointFromCenter({ x: trig.x, y: trig.y }, cx, cy, orbitScale);
            bloomsRef.current.push({
              x: scaledTriggerPoint.x,
              y: scaledTriggerPoint.y,
              color: trig.color,
              radius: 0,
              birth: timestamp,
              orbitRadius: isSweepMode ? trig.radius : trig.radius * orbitScale,
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
          const previousT = (previousElapsedBeats / SWEEP_COMPLETION_BEATS) * SWEEP_DURATION;
          const currentT = (state.elapsedBeats / SWEEP_COMPLETION_BEATS) * SWEEP_DURATION;
          const sweepScale = getSweepScale(
            w,
            h,
            isSweepQuad
              ? SWEEP_QUAD_MAX_MODEL_RADIUS
              : isSweepTriad
                ? SWEEP_TRIAD_MAX_MODEL_RADIUS
                : SWEEP_MAX_MODEL_RADIUS,
          );
          const selectedSweepOrbits =
            isSweepQuad && selectedThirdOrbit && selectedFourthOrbit
              ? [selectedInnerOrbit, selectedOuterOrbit, selectedThirdOrbit, selectedFourthOrbit]
              : isSweepTriad && selectedThirdOrbit
                ? [selectedInnerOrbit, selectedOuterOrbit, selectedThirdOrbit]
                : [selectedInnerOrbit, selectedOuterOrbit];

          for (const sweepOrbit of selectedSweepOrbits) {
            const previousRotationCount = Math.floor((Math.abs(sweepOrbit.pulseCount) * previousT) / TAU);
            const currentRotationCount = Math.floor((Math.abs(sweepOrbit.pulseCount) * currentT) / TAU);

            if (currentRotationCount > previousRotationCount) {
              const orbitIndex = state.orbits.findIndex((orbit) => orbit.id === sweepOrbit.id);

              for (let rotationIndex = previousRotationCount + 1; rotationIndex <= currentRotationCount; rotationIndex++) {
                const triggerT = (rotationIndex * TAU) / Math.abs(sweepOrbit.pulseCount);
                const triggerPoint =
                  isSweepQuad && selectedThirdOrbit && selectedFourthOrbit
                    ? (() => {
                        const quadPositions = getSweepQuadPositions(
                          selectedInnerOrbit,
                          selectedOuterOrbit,
                          selectedThirdOrbit,
                          selectedFourthOrbit,
                          triggerT,
                          cx,
                          cy,
                          sweepScale,
                        );
                        return sweepOrbit.id === selectedInnerOrbit.id
                          ? quadPositions.firstPoint
                          : sweepOrbit.id === selectedOuterOrbit.id
                            ? quadPositions.secondPoint
                            : sweepOrbit.id === selectedThirdOrbit.id
                              ? quadPositions.thirdPoint
                              : quadPositions.fourthPoint;
                      })()
                    : isSweepTriad && selectedThirdOrbit
                    ? (() => {
                        const triadPositions = getSweepTriadPositions(
                          selectedInnerOrbit,
                          selectedOuterOrbit,
                          selectedThirdOrbit,
                          triggerT,
                          cx,
                          cy,
                          sweepScale,
                        );
                        return sweepOrbit.id === selectedInnerOrbit.id
                          ? triadPositions.firstPoint
                          : sweepOrbit.id === selectedOuterOrbit.id
                            ? triadPositions.secondPoint
                            : triadPositions.thirdPoint;
                      })()
                    : (() => {
                        const pairPositions = getSweepPositions(
                          selectedInnerOrbit,
                          selectedOuterOrbit,
                          triggerT,
                          cx,
                          cy,
                          sweepScale,
                        );
                        return sweepOrbit.id === selectedInnerOrbit.id ? pairPositions.innerPoint : pairPositions.outerPoint;
                      })();

                if (orbitIndex >= 0) {
                  playResonanceBeep(
                    {
                      orbitIndex,
                      pulseCount: sweepOrbit.pulseCount,
                      radius:
                        sweepOrbit.id === selectedInnerOrbit.id
                          ? SWEEP_INNER_RADIUS * sweepScale
                          : sweepOrbit.id === selectedOuterOrbit.id
                            ? SWEEP_OUTER_RADIUS * sweepScale
                            : sweepOrbit.id === selectedThirdOrbit?.id
                              ? SWEEP_THIRD_RADIUS * sweepScale
                              : SWEEP_FOURTH_RADIUS * sweepScale,
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
              const thirdOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitCId);
              const fourthOrbit = state.orbits.find((orbit) => orbit.id === normalizedInterferenceSettings.sourceOrbitDId);
              const hasSweepTriad = Boolean(
                innerOrbit &&
                  outerOrbit &&
                  thirdOrbit &&
                  new Set([innerOrbit.id, outerOrbit.id, thirdOrbit.id]).size === 3,
              );
              const hasSweepQuad = Boolean(
                innerOrbit &&
                  outerOrbit &&
                  thirdOrbit &&
                  fourthOrbit &&
                  new Set([innerOrbit.id, outerOrbit.id, thirdOrbit.id, fourthOrbit.id]).size === 4,
              );

              if (innerOrbit && outerOrbit && innerOrbit.id !== outerOrbit.id) {
                const derivedSweepColor = hasSweepQuad && thirdOrbit && fourthOrbit
                  ? blendMultipleHexColors(innerOrbit.color, outerOrbit.color, thirdOrbit.color, fourthOrbit.color)
                  : hasSweepTriad && thirdOrbit
                    ? blendMultipleHexColors(innerOrbit.color, outerOrbit.color, thirdOrbit.color)
                  : blendHexColors(innerOrbit.color, outerOrbit.color);
                const previousProgress = Math.min(previousElapsedBeats / SWEEP_COMPLETION_BEATS, 1);
                const currentProgress = Math.min(state.elapsedBeats / SWEEP_COMPLETION_BEATS, 1);
                const previousIndex = Math.floor(previousProgress * SWEEP_STEPS);
                const currentIndex = Math.floor(currentProgress * SWEEP_STEPS);
                const sweepScale = getSweepScale(
                  w,
                  h,
                  hasSweepQuad ? SWEEP_QUAD_MAX_MODEL_RADIUS : hasSweepTriad ? SWEEP_TRIAD_MAX_MODEL_RADIUS : SWEEP_MAX_MODEL_RADIUS,
                );

                if (currentIndex > previousIndex) {
                  let previousSample = hasSweepQuad && thirdOrbit && fourthOrbit
                    ? getSweepQuadPositions(
                        innerOrbit,
                        outerOrbit,
                        thirdOrbit,
                        fourthOrbit,
                        (previousIndex / SWEEP_STEPS) * SWEEP_DURATION,
                        cx,
                        cy,
                        sweepScale,
                      ).sweepPoint
                    : hasSweepTriad && thirdOrbit
                    ? getSweepTriadPositions(
                        innerOrbit,
                        outerOrbit,
                        thirdOrbit,
                        (previousIndex / SWEEP_STEPS) * SWEEP_DURATION,
                        cx,
                        cy,
                        sweepScale,
                      ).sweepPoint
                    : getSweepPositions(
                        innerOrbit,
                        outerOrbit,
                        (previousIndex / SWEEP_STEPS) * SWEEP_DURATION,
                        cx,
                        cy,
                        sweepScale,
                      ).sweepPoint;

                  for (let sampleIndex = previousIndex + 1; sampleIndex <= currentIndex; sampleIndex++) {
                    const t = (sampleIndex / SWEEP_STEPS) * SWEEP_DURATION;
                    const currentSample = hasSweepQuad && thirdOrbit && fourthOrbit
                      ? getSweepQuadPositions(innerOrbit, outerOrbit, thirdOrbit, fourthOrbit, t, cx, cy, sweepScale).sweepPoint
                      : hasSweepTriad && thirdOrbit
                        ? getSweepTriadPositions(innerOrbit, outerOrbit, thirdOrbit, t, cx, cy, sweepScale).sweepPoint
                        : getSweepPositions(innerOrbit, outerOrbit, t, cx, cy, sweepScale).sweepPoint;

                    traceCtx.save();
                    traceCtx.lineCap = 'round';
                    traceCtx.lineJoin = 'round';
                    traceCtx.globalAlpha = 0.72;
                    traceCtx.strokeStyle = derivedSweepColor;
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
              const activeInterferenceOrbits = [
                normalized.sourceOrbitAId,
                normalized.sourceOrbitBId,
                normalized.sourceOrbitCId,
                normalized.sourceOrbitDId,
              ]
                .map((orbitId) => state.orbits.find((orbit) => orbit.id === orbitId))
                .filter((orbit): orbit is Orbit => Boolean(orbit))
                .filter((orbit, index, collection) => collection.findIndex((candidate) => candidate.id === orbit.id) === index);

              if (activeInterferenceOrbits.length >= 2) {
                const derivedInterferenceColor = blendMultipleHexColors(
                  ...activeInterferenceOrbits.map((orbit) => orbit.color),
                );
                const substeps = getAdaptiveTraceSteps(activeInterferenceOrbits, deltaBeats);
                const traceOpacityBudget = state.playing ? INTERFERENCE_PLAYBACK_OPACITY : INTERFERENCE_STEP_OPACITY;
                const previousOrbitPoints = activeInterferenceOrbits.map((orbit) =>
                  scalePointFromCenter(
                    resonancePositionAtBeats(orbit, previousElapsedBeats, cx, cy),
                    cx,
                    cy,
                    orbitScale,
                  ),
                );
                let previousPoint = getInterferencePoint(
                  previousOrbitPoints,
                  cx,
                  cy,
                );

                for (let step = 1; step <= substeps; step++) {
                  const t = step / substeps;
                  const sampleBeats = previousElapsedBeats + deltaBeats * t;
                  const sampledOrbitPoints = activeInterferenceOrbits.map((orbit) =>
                    scalePointFromCenter(
                      resonancePositionAtBeats(orbit, sampleBeats, cx, cy),
                      cx,
                      cy,
                      orbitScale,
                    ),
                  );
                  const interferencePoint = getInterferencePoint(sampledOrbitPoints, cx, cy);

                  traceCtx.save();
                  traceCtx.lineCap = 'round';
                  traceCtx.lineJoin = 'round';
                  traceCtx.globalAlpha = traceOpacityBudget / substeps;
                  traceCtx.strokeStyle = derivedInterferenceColor;
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
                    const pos = scalePointFromCenter(
                      resonancePositionAtBeats(orbit, sampleBeats, cx, cy),
                      cx,
                      cy,
                      orbitScale,
                    );
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
        const currentThirdOrbit = selectedThirdOrbit;
        const currentFourthOrbit = selectedFourthOrbit;
        const sweepScale = getSweepScale(
          w,
          h,
          isSweepQuad
            ? SWEEP_QUAD_MAX_MODEL_RADIUS
            : isSweepTriad
              ? SWEEP_TRIAD_MAX_MODEL_RADIUS
              : SWEEP_MAX_MODEL_RADIUS,
        );
        const sweepT = (state.elapsedBeats / SWEEP_COMPLETION_BEATS) * SWEEP_DURATION;
        const pairSweepPositions =
          isSweepMode && currentInnerOrbit && currentOuterOrbit && currentInnerOrbit.id !== currentOuterOrbit.id
            ? getSweepPositions(currentInnerOrbit, currentOuterOrbit, sweepT, cx, cy, sweepScale)
            : null;
        const triadSweepPositions =
          isSweepTriad && currentInnerOrbit && currentOuterOrbit && currentThirdOrbit
            ? getSweepTriadPositions(currentInnerOrbit, currentOuterOrbit, currentThirdOrbit, sweepT, cx, cy, sweepScale)
            : null;
        const quadSweepPositions =
          isSweepQuad && currentInnerOrbit && currentOuterOrbit && currentThirdOrbit && currentFourthOrbit
            ? getSweepQuadPositions(
                currentInnerOrbit,
                currentOuterOrbit,
                currentThirdOrbit,
                currentFourthOrbit,
                sweepT,
                cx,
                cy,
                sweepScale,
              )
            : null;
        const sweepPositions = quadSweepPositions ?? triadSweepPositions ?? pairSweepPositions;
        const currentInnerPoint = currentInnerOrbit
          ? (quadSweepPositions?.firstPoint ?? triadSweepPositions?.firstPoint ?? pairSweepPositions?.innerPoint) ??
            scalePointFromCenter(resonancePosition(currentInnerOrbit, cx, cy), cx, cy, orbitScale)
          : null;
        const currentOuterPoint = currentOuterOrbit
          ? (quadSweepPositions?.secondPoint ?? triadSweepPositions?.secondPoint ?? pairSweepPositions?.outerPoint) ??
            scalePointFromCenter(resonancePosition(currentOuterOrbit, cx, cy), cx, cy, orbitScale)
          : null;
        const currentThirdPoint = currentThirdOrbit
          ? (quadSweepPositions?.thirdPoint ?? triadSweepPositions?.thirdPoint ?? null) ??
            scalePointFromCenter(resonancePosition(currentThirdOrbit, cx, cy), cx, cy, orbitScale)
          : null;
        const currentFourthPoint = currentFourthOrbit
          ? (quadSweepPositions?.fourthPoint ?? null) ??
            scalePointFromCenter(resonancePosition(currentFourthOrbit, cx, cy), cx, cy, orbitScale)
          : null;
        const currentInterferencePoint = sweepPositions
          ? sweepPositions.sweepPoint
          : currentInnerPoint && currentOuterPoint
            ? getInterferencePoint(
                [
                  currentInnerPoint,
                  currentOuterPoint,
                  ...(isInterferenceTriad || isInterferenceQuad ? currentThirdPoint ? [currentThirdPoint] : [] : []),
                  ...(isInterferenceQuad ? currentFourthPoint ? [currentFourthPoint] : [] : []),
                ],
                cx,
                cy,
              )
            : null;
        const derivedPairColor = isSweepQuad || isInterferenceQuad
          ? blendMultipleHexColors(
              currentInnerOrbit?.color,
              currentOuterOrbit?.color,
              currentThirdOrbit?.color,
              currentFourthOrbit?.color,
            )
          : isSweepTriad || isInterferenceTriad
            ? blendMultipleHexColors(currentInnerOrbit?.color, currentOuterOrbit?.color, currentThirdOrbit?.color)
            : blendHexColors(currentInnerOrbit?.color, currentOuterOrbit?.color);

        const visibleOrbits =
          (isInterferenceMode || isSweepMode) && currentInnerOrbit && currentOuterOrbit
            ? state.orbits.filter(
                (orbit) =>
                  orbit.id === currentInnerOrbit.id ||
                  orbit.id === currentOuterOrbit.id ||
                  ((isSweepTriad || isSweepQuad || isInterferenceTriad || isInterferenceQuad) &&
                    orbit.id === currentThirdOrbit?.id) ||
                  ((isSweepQuad || isInterferenceQuad) && orbit.id === currentFourthOrbit?.id),
              )
            : state.orbits;
        const hoveredOrbitId = !isMobileRef.current && !presentationModeRef.current ? hoverOrbitIdRef.current : null;

        // ---- Orbit rings ----
        for (const orbit of visibleOrbits) {
          const isSweepInnerOrbit = isSweepMode && currentInnerOrbit?.id === orbit.id;
          const isSweepOuterOrbit = isSweepMode && currentOuterOrbit?.id === orbit.id;
          const r = isSweepInnerOrbit
            ? SWEEP_INNER_RADIUS * sweepScale
            : isSweepOuterOrbit
              ? SWEEP_OUTER_RADIUS * sweepScale
                : isSweepMode && currentThirdOrbit?.id === orbit.id
                  ? SWEEP_THIRD_RADIUS * sweepScale
                : isSweepMode && currentFourthOrbit?.id === orbit.id
                  ? SWEEP_FOURTH_RADIUS * sweepScale
              : orbit.radius * orbitScale;
          const isHoveredOrbit = hoveredOrbitId === orbit.id;

          // Ring
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, TAU);
          ctx.strokeStyle = orbit.color;
          ctx.globalAlpha = 0.18;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();

          if (isHoveredOrbit) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, TAU);
            ctx.strokeStyle = orbit.color;
            ctx.globalAlpha = 0.34;
            ctx.lineWidth = 2.2;
            ctx.stroke();
            ctx.restore();
          }

          if (showPlanetsRef.current) {
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
          }

          // Resonance point position
          const pos =
            orbit.id === currentInnerOrbit?.id && currentInnerPoint
              ? currentInnerPoint
              : orbit.id === currentOuterOrbit?.id && currentOuterPoint
                ? currentOuterPoint
                : orbit.id === currentThirdOrbit?.id && currentThirdPoint
                  ? currentThirdPoint
                  : orbit.id === currentFourthOrbit?.id && currentFourthPoint
                    ? currentFourthPoint
                : scalePointFromCenter(resonancePosition(orbit, cx, cy), cx, cy, orbitScale);

          if (isHoveredOrbit) {
            ctx.save();
            const hoverGlow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 18);
            hoverGlow.addColorStop(0, orbit.color + 'CC');
            hoverGlow.addColorStop(0.4, orbit.color + '44');
            hoverGlow.addColorStop(1, orbit.color + '00');
            ctx.fillStyle = hoverGlow;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 18, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, TAU);
            ctx.fillStyle = orbit.color;
            ctx.globalAlpha = 0.95;
            ctx.fill();
            ctx.restore();
          }

          if (showPlanetsRef.current) {
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
          }

          if (showPlanetsRef.current && !isMobileRef.current) {
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
        }

        if (
          (isInterferenceMode || isSweepMode) &&
          currentInnerPoint &&
          currentOuterPoint &&
          currentInterferencePoint &&
          showPlanetsRef.current &&
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
          if ((isSweepTriad || isInterferenceTriad || isSweepQuad || isInterferenceQuad) && currentThirdPoint) {
            ctx.strokeStyle = currentThirdOrbit?.color ?? '#ffffff';
            ctx.beginPath();
            ctx.moveTo(currentThirdPoint.x, currentThirdPoint.y);
            ctx.lineTo(currentInterferencePoint.x, currentInterferencePoint.y);
            ctx.stroke();
          }
          if ((isSweepQuad || isInterferenceQuad) && currentFourthPoint) {
            ctx.strokeStyle = currentFourthOrbit?.color ?? '#ffffff';
            ctx.beginPath();
            ctx.moveTo(currentFourthPoint.x, currentFourthPoint.y);
            ctx.lineTo(currentInterferencePoint.x, currentInterferencePoint.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        if ((isInterferenceMode || isSweepMode) && currentInterferencePoint && showPlanetsRef.current) {
          ctx.save();
          const grad = ctx.createRadialGradient(
            currentInterferencePoint.x,
            currentInterferencePoint.y,
            0,
            currentInterferencePoint.x,
            currentInterferencePoint.y,
            16,
          );
          grad.addColorStop(0, `${derivedPairColor}AA`);
          grad.addColorStop(0.5, `${derivedPairColor}33`);
          grad.addColorStop(1, `${derivedPairColor}00`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(currentInterferencePoint.x, currentInterferencePoint.y, 16, 0, TAU);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          ctx.arc(currentInterferencePoint.x, currentInterferencePoint.y, 3, 0, TAU);
          ctx.fillStyle = derivedPairColor;
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
        if (hudVisibleRef.current && !presentationModeRef.current) {
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
        } else if (!presentationModeRef.current) {
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px "SF Mono", "Fira Code", monospace';
          ctx.textAlign = 'left';
          ctx.fillText('STATS', 16, h - 10);
          ctx.restore();
        }

        previousElapsedBeatsRef.current = state.elapsedBeats;
        rafRef.current = requestAnimationFrame(renderFrame);
      };

      rafRef.current = requestAnimationFrame(renderFrame);

      return () => {
        cancelAnimationFrame(rafRef.current);
        resizeObserver.disconnect();
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
