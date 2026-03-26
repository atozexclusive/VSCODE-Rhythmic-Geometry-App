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

const TAU = 2.0 * Math.PI;
const TRACE_SAMPLE_ARC_PX = 8;
const TRACE_SAMPLE_PHASE_RAD = 0.14;
const MAX_TRACE_SUBSTEPS = 12;

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
  onOrbitLongPress?: (orbitId: string, x: number, y: number) => void;
}

const OrbitalCanvas = forwardRef<HTMLCanvasElement, OrbitalCanvasProps>(
  ({ engineState, traceMode, harmonySettings, onOrbitLongPress }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const bloomsRef = useRef<Bloom[]>([]);
    const traceCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const traceSegmentCountRef = useRef(0);
    const engineRef = useRef<EngineState>(engineState);
    const traceModeRef = useRef(traceMode);
    const harmonySettingsRef = useRef(harmonySettings);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previousElapsedBeatsRef = useRef(engineState.elapsedBeats);
    const [, forceUpdate] = useState(0);

    // Keep refs in sync
    engineRef.current = engineState;
    traceModeRef.current = traceMode;
    harmonySettingsRef.current = harmonySettings;

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

    // Expose clearTraces via canvas property
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        (canvas as any).__clearTraces = clearTraces;
      }
    }, [clearTraces]);

    // ---- Gesture handling: long-press ----
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleMouseDown = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        longPressTimerRef.current = setTimeout(() => {
          handleLongPress(mx, my);
        }, 600);
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (longPressTimerRef.current && (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3)) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      };

      const handleMouseUp = () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      };

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const rect = canvas.getBoundingClientRect();
          const tx = touch.clientX - rect.left;
          const ty = touch.clientY - rect.top;
          longPressTimerRef.current = setTimeout(() => {
            handleLongPress(tx, ty);
          }, 600);
        }
      };

      const handleTouchMove = () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      };

      const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      };

      const handleLongPress = (canvasX: number, canvasY: number) => {
        if (!onOrbitLongPress) return;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const cx = w / 2;
        const cy = h / 2;

        const state = engineRef.current;
        for (const orbit of state.orbits) {
          const pos = resonancePosition(orbit, cx, cy);
          const dist = Math.hypot(canvasX - pos.x, canvasY - pos.y);
          if (dist < 20) {
            onOrbitLongPress(orbit.id, canvasX, canvasY);
            return;
          }
          const distFromCenter = Math.hypot(canvasX - cx, canvasY - cy);
          const ringDist = Math.abs(distFromCenter - orbit.radius);
          if (ringDist < 12) {
            onOrbitLongPress(orbit.id, canvasX, canvasY);
            return;
          }
        }
      };

      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
      canvas.addEventListener('touchend', handleTouchEnd);

      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
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

        // Physics tick — returns triggers for every 12 o'clock crossing
        const triggers = tick(state, timestamp, cx, cy);

        // Process triggers — every single one gets audio + bloom
        for (const trig of triggers) {
          const orbitIndex = state.orbits.findIndex((orbit) => orbit.id === trig.orbitId);
          const orbit = orbitIndex >= 0 ? state.orbits[orbitIndex] : null;
          bloomsRef.current.push({
            x: trig.x,
            y: trig.y,
            color: trig.color,
            radius: 0,
            birth: timestamp,
            orbitRadius: trig.radius,
          });
          if (orbit) {
            playResonanceBeep(
              {
                orbitIndex,
                pulseCount: orbit.pulseCount,
                radius: orbit.radius,
                color: orbit.color,
              },
              harmonySettingsRef.current,
              0.12,
              state.speedMultiplier,
            );
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

        // ---- Center anchor ----
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, TAU);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.fill();
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
          const resPoints: { x: number; y: number; color: string }[] = [];
          for (const orbit of state.orbits) {
            const pos = resonancePosition(orbit, cx, cy);
            resPoints.push({ ...pos, color: orbit.color });
          }

          // Add new trace lines between all resonance point pairs
          if (state.playing && resPoints.length >= 2) {
            const deltaBeats = Math.max(0, state.elapsedBeats - previousElapsedBeats);
            const substeps = getAdaptiveTraceSteps(state.orbits, deltaBeats);

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
                  traceCtx.globalAlpha = 0.15 / substeps;
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

          // Render the accumulated trace layer in one pass so history persists.
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(traceCanvas, 0, 0);
          ctx.restore();
        }

        // ---- Orbit rings ----
        for (const orbit of state.orbits) {
          const r = orbit.radius;

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
          const pos = resonancePosition(orbit, cx, cy);

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
        if (traceModeRef.current) {
          ctx.fillStyle = '#00FFAA';
          ctx.fillText(`TRACE \u25cf  ${traceSegmentCountRef.current}`, 16, h - 18);
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
        className="fixed inset-0 w-full h-full"
        style={{
          touchAction: 'none',
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
