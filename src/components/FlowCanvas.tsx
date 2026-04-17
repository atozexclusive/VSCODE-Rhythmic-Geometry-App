import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type MutableRefObject,
} from 'react';
import {
  getFlowSoundPreset,
  type FlowCycle,
  type FlowEngineType,
  type FlowExperience,
} from '../lib/flowStudy';
import { resumeFlowAudio, triggerFlowImpact, updateFlowPad } from '../lib/flowAudio';

interface FlowCanvasProps {
  flow: FlowExperience;
  restartToken: number;
  className?: string;
  externalCanvasRef?: MutableRefObject<HTMLCanvasElement | null>;
  playbackDriver?: boolean;
}

interface FlowParticle {
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  driftX: number;
  driftY: number;
}

interface FlowPoint {
  x: number;
  y: number;
  anchorX?: number;
  anchorY?: number;
  scale: number;
  depth: number;
}

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function colorWithAlpha(color: string, alpha: number): string {
  return `${color}${Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, '0')}`;
}

function getMotionMultiplier(flow: FlowExperience): number {
  if (flow.motionLevel === 'calm') {
    return 0.62;
  }
  if (flow.motionLevel === 'lively') {
    return 1.12;
  }
  return 1;
}

function getCyclePhase(flow: FlowExperience, cycle: FlowCycle, elapsedSeconds: number): number {
  const tempoScale = flow.tempo / 72;
  return (
    (elapsedSeconds * flow.speed * getMotionMultiplier(flow) * tempoScale * cycle.ratio) /
      flow.cycleSeconds +
    cycle.phase
  ) % 1;
}

function getMidiForCycle(flow: FlowExperience, cycle: FlowCycle): number {
  const preset = getFlowSoundPreset(flow.soundId);
  return clamp(preset.keyCenter + cycle.note + cycle.octave * 12, 24, 92);
}

function setupCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const pixelWidth = Math.floor(width * dpr);
  const pixelHeight = Math.floor(height * dpr);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  flow: FlowExperience,
  fullClear: boolean,
) {
  const fadeAlpha = fullClear ? 1 : clamp(0.14 - flow.trail * 0.09, 0.026, 0.075);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(5,7,14,${fadeAlpha})`;
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    0,
    width * 0.5,
    height * 0.52,
    Math.max(width, height) * 0.74,
  );
  gradient.addColorStop(0, `rgba(42,58,94,${fullClear ? 0.52 : 0.045})`);
  gradient.addColorStop(0.48, `rgba(15,18,35,${fullClear ? 0.82 : 0.045})`);
  gradient.addColorStop(1, `rgba(4,5,12,${fullClear ? 1 : 0.04})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const auraColor = flow.palette[1] ?? flow.palette[0] ?? '#7FD7FF';
  addGlow(ctx, width * 0.5, height * 0.46, Math.min(width, height) * 0.56, auraColor, fullClear ? 0.04 : 0.012);
  for (let i = 0; i < 42; i += 1) {
    const x = ((i * 73) % 997) / 997 * width;
    const y = ((i * 191) % 991) / 991 * height;
    const twinkle = 0.32 + Math.sin(i * 2.1 + performance.now() * 0.00022) * 0.18;
    ctx.fillStyle = `rgba(255,255,255,${0.025 * twinkle})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + (i % 4) * 0.18, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function addGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, colorWithAlpha(color, alpha));
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

function strokeEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  color: string,
  alpha: number,
  lineWidth = 1,
) {
  ctx.strokeStyle = colorWithAlpha(color, alpha);
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, TAU);
  ctx.stroke();
}

function drawDepthStage(
  ctx: CanvasRenderingContext2D,
  flow: FlowExperience,
  width: number,
  height: number,
  elapsed: number,
) {
  const cx = width / 2;
  const minSide = Math.min(width, height);
  const horizonY = height * (flow.engine === 'rain' ? 0.34 : 0.42);
  const floorBottom = height * 0.94;
  const gridColor = flow.palette[0] ?? '#7FD7FF';
  const accentColor = flow.palette[1] ?? '#B6A0FF';
  const pulse = 0.5 + Math.sin(elapsed * 0.18) * 0.5;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const verticalGradient = ctx.createLinearGradient(cx, horizonY - minSide * 0.2, cx, floorBottom);
  verticalGradient.addColorStop(0, colorWithAlpha(gridColor, 0.2));
  verticalGradient.addColorStop(0.5, colorWithAlpha('#ffffff', 0.075));
  verticalGradient.addColorStop(1, colorWithAlpha(accentColor, 0.02));
  ctx.strokeStyle = verticalGradient;
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.moveTo(cx, horizonY - minSide * 0.26);
  ctx.lineTo(cx, floorBottom);
  ctx.stroke();

  addGlow(ctx, cx, horizonY - minSide * 0.13, minSide * 0.18, gridColor, 0.045 + pulse * 0.018);
  addGlow(ctx, cx, height * 0.58, minSide * 0.44, accentColor, 0.018);

  for (let i = -8; i <= 8; i += 1) {
    const bottomX = cx + (i / 8) * width * 0.62;
    const alpha = i === 0 ? 0.12 : 0.045;
    ctx.strokeStyle = colorWithAlpha(i === 0 ? '#ffffff' : gridColor, alpha);
    ctx.lineWidth = i === 0 ? 0.9 : 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, horizonY);
    ctx.lineTo(bottomX, floorBottom);
    ctx.stroke();
  }

  for (let band = 1; band <= 10; band += 1) {
    const t = band / 10;
    const y = horizonY + Math.pow(t, 1.55) * (floorBottom - horizonY);
    const rx = minSide * (0.08 + t * 0.78);
    const ry = minSide * (0.008 + t * 0.055);
    const alpha = 0.026 + (1 - t) * 0.035;
    strokeEllipse(ctx, cx, y, rx, ry, gridColor, alpha, 0.55);
  }

  if (flow.engine === 'pendulum' || flow.engine === 'wave' || flow.engine === 'triangle') {
    const topY = height * 0.16;
    const beam = ctx.createLinearGradient(cx, topY, cx, height * 0.72);
    beam.addColorStop(0, colorWithAlpha('#ffffff', 0.18));
    beam.addColorStop(0.6, colorWithAlpha(gridColor, 0.035));
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = beam;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx, height * 0.72);
    ctx.stroke();
  }

  if (flow.engine === 'mandala' || flow.engine === 'orbit') {
    for (let ring = 1; ring <= 5; ring += 1) {
      const radius = minSide * (0.14 + ring * 0.065);
      strokeEllipse(
        ctx,
        cx,
        horizonY + minSide * 0.14,
        radius,
        radius * 0.42,
        ring % 2 === 0 ? accentColor : gridColor,
        0.04,
        0.7,
      );
    }
  }

  if (flow.engine === 'triangle') {
    const apex = { x: cx, y: height * 0.18 };
    const left = { x: cx - minSide * 0.33, y: height * 0.68 };
    const right = { x: cx + minSide * 0.33, y: height * 0.62 };
    ctx.strokeStyle = colorWithAlpha('#ffffff', 0.06);
    ctx.lineWidth = 0.7;
    for (let t = 0.12; t <= 0.9; t += 0.08) {
      const lx = apex.x + (left.x - apex.x) * t;
      const ly = apex.y + (left.y - apex.y) * t;
      const rx = apex.x + (right.x - apex.x) * t;
      const ry = apex.y + (right.y - apex.y) * t;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, horizonY);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, horizonY);
      ctx.lineTo(rx, ry);
      ctx.stroke();
    }
    ctx.strokeStyle = colorWithAlpha(flow.palette[0] ?? '#BFC8FF', 0.12);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.font = `${Math.max(24, minSide * 0.06)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  ctx.fillText('FLOW', cx, height * 0.52);

  ctx.restore();
}

function getCyclePoint(
  engine: FlowEngineType,
  flow: FlowExperience,
  cycle: FlowCycle,
  index: number,
  phase: number,
  width: number,
  height: number,
): FlowPoint {
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);

  if (engine === 'triangle') {
    const apex = { x: cx, y: height * 0.18, scale: 0.58, depth: 0.12 };
    const right = { x: cx + minSide * 0.34, y: height * 0.62, scale: 1.08, depth: 0.78 };
    const left = { x: cx - minSide * 0.34, y: height * 0.68, scale: 1.18, depth: 0.9 };
    const vertices = [apex, right, left];
    const edgePosition = (phase * 3) % 3;
    const edgeIndex = Math.floor(edgePosition);
    const localT = edgePosition - edgeIndex;
    const easedT = localT * localT * (3 - 2 * localT);
    const a = vertices[edgeIndex];
    const b = vertices[(edgeIndex + 1) % vertices.length];
    const wobble = Math.sin(phase * TAU * 2 + index) * cycle.amplitude * minSide * 0.012;
    return {
      x: a.x + (b.x - a.x) * easedT + wobble,
      y: a.y + (b.y - a.y) * easedT - wobble * 0.38,
      scale: a.scale + (b.scale - a.scale) * easedT,
      depth: a.depth + (b.depth - a.depth) * easedT,
    };
  }

  if (engine === 'pendulum') {
    const count = Math.max(1, flow.cycles.length);
    const spacing = Math.min(94, width / (count + 1.6));
    const visualSlot = index === 0 ? 0 : index % 2 === 1 ? -Math.ceil(index / 2) : Math.ceil(index / 2);
    const anchorX = cx + visualSlot * spacing;
    const anchorY = height * 0.14 + Math.sin(index * 1.7) * 6;
    const length = minSide * (cycle.role === 'bass' ? 0.36 : 0.27 + index * 0.014);
    const angle = Math.sin(phase * TAU) * cycle.amplitude * (cycle.role === 'bass' ? 0.5 : 0.72);
    return {
      x: anchorX + Math.sin(angle) * length,
      y: anchorY + Math.cos(angle) * length,
      anchorX,
      anchorY,
      scale: cycle.role === 'bass' ? 1.1 : 0.82 + index * 0.04,
      depth: 0.55 + Math.cos(angle) * 0.25,
    };
  }

  if (engine === 'rain') {
    const count = Math.max(1, flow.cycles.length);
    const laneX = width * (0.18 + (index / Math.max(1, count - 1)) * 0.64);
    const y = ((phase + cycle.phase * 0.3) % 1) * (height + 180) - 90;
    return {
      x: laneX + Math.sin(phase * TAU + index) * 9,
      y,
      scale: clamp(0.62 + y / height * 0.55, 0.5, 1.22),
      depth: clamp(y / height, 0, 1),
    };
  }

  if (engine === 'mandala') {
    const radius = minSide * (0.18 + index * 0.03 + flow.density * 0.1);
    const angle = phase * TAU * 0.72 + index * (TAU / Math.max(3, flow.cycles.length));
    const depth = (Math.sin(angle) + 1) / 2;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius * 0.48 + depth * minSide * 0.035,
      scale: 0.58 + depth * 0.58,
      depth,
    };
  }

  if (engine === 'wave') {
    const count = Math.max(1, flow.cycles.length);
    const x = width * (0.13 + (index / Math.max(1, count - 1)) * 0.74);
    const baseline = height * (0.52 + Math.sin(index * 0.9) * 0.055);
    const y = baseline + Math.sin(phase * TAU) * minSide * (0.14 + flow.density * 0.055);
    return {
      x,
      y,
      scale: clamp(0.72 + y / height * 0.38, 0.64, 1.18),
      depth: clamp(y / height, 0, 1),
    };
  }

  const radius = minSide * (0.2 + index * 0.042 + flow.density * 0.1);
  const angle = phase * TAU + cycle.phase * TAU;
  const depth = (Math.sin(angle) + 1) / 2;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius * 0.46 + depth * minSide * 0.04,
    scale: 0.58 + depth * 0.64,
    depth,
  };
}

function drawGhostPaths(
  ctx: CanvasRenderingContext2D,
  flow: FlowExperience,
  width: number,
  height: number,
  elapsed: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ghostCount =
    flow.engine === 'rain'
      ? 8
      : flow.engine === 'triangle'
        ? 24
        : flow.engine === 'pendulum'
        ? 11
        : flow.engine === 'wave'
          ? 10
          : 20;
  const timeStep = flow.engine === 'triangle' ? 0.04 : flow.engine === 'pendulum' ? 0.12 : flow.engine === 'rain' ? 0.08 : 0.055;

  flow.cycles.forEach((cycle, index) => {
    if (cycle.role === 'bass' && flow.engine !== 'orbit' && flow.engine !== 'triangle') {
      return;
    }

    for (let ghost = ghostCount; ghost >= 1; ghost -= 1) {
      const t = ghost / ghostCount;
      const ghostPhase = getCyclePhase(flow, cycle, elapsed - ghost * timeStep * flow.cycleSeconds);
      const point = getCyclePoint(flow.engine, flow, cycle, index, ghostPhase, width, height);
      const alpha = (1 - t) * (cycle.role === 'ghost' ? 0.055 : 0.13);
      const size = cycle.size * point.scale * (0.22 + (1 - t) * 0.44);
      ctx.fillStyle = colorWithAlpha(cycle.color, alpha);
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, TAU);
      ctx.fill();
    }
  });
  ctx.restore();
}

function drawStructure(
  ctx: CanvasRenderingContext2D,
  flow: FlowExperience,
  width: number,
  height: number,
  elapsed: number,
) {
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawDepthStage(ctx, flow, width, height, elapsed);

  if (flow.engine === 'orbit' || flow.engine === 'mandala') {
    flow.cycles.forEach((cycle, index) => {
      const radius = flow.engine === 'mandala'
        ? minSide * (0.18 + index * 0.03 + flow.density * 0.1)
        : minSide * (0.2 + index * 0.042 + flow.density * 0.1);
      ctx.strokeStyle = colorWithAlpha(cycle.color, flow.engine === 'mandala' ? 0.08 : 0.065);
      ctx.lineWidth = cycle.role === 'bass' ? 1.1 : 0.72;
      ctx.beginPath();
      ctx.ellipse(cx, cy + minSide * 0.04, radius, radius * 0.46, 0, 0, TAU);
      ctx.stroke();
    });
  }

  if (flow.engine === 'pendulum') {
    const horizonY = height * 0.58;
    const gradient = ctx.createLinearGradient(width * 0.18, 0, width * 0.82, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.16, horizonY);
    ctx.lineTo(width * 0.84, horizonY);
    ctx.stroke();
  }

  if (flow.engine === 'rain') {
    [0.28, 0.5, 0.72].forEach((band, index) => {
      ctx.strokeStyle = colorWithAlpha(flow.palette[index % flow.palette.length] ?? '#7FD7FF', 0.09);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width * 0.1, height * band);
      ctx.bezierCurveTo(width * 0.32, height * (band - 0.05), width * 0.62, height * (band + 0.05), width * 0.9, height * band);
      ctx.stroke();
    });
  }

  const points = flow.cycles.map((cycle, index) => {
    const phase = getCyclePhase(flow, cycle, elapsed);
    return {
      cycle,
      phase,
      point: getCyclePoint(flow.engine, flow, cycle, index, phase, width, height),
    };
  });
  drawGhostPaths(ctx, flow, width, height, elapsed);

  if (flow.engine === 'triangle') {
    ctx.strokeStyle = colorWithAlpha('#ffffff', 0.14);
    ctx.lineWidth = 0.7 + flow.bloom * 0.35;
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        const alpha = 0.035 + (1 - Math.abs(points[a].point.depth - points[b].point.depth)) * 0.07;
        ctx.strokeStyle = colorWithAlpha(points[a].cycle.color, alpha);
        ctx.beginPath();
        ctx.moveTo(points[a].point.x, points[a].point.y);
        ctx.lineTo(points[b].point.x, points[b].point.y);
        ctx.stroke();
      }
    }
  }

  if (flow.engine === 'orbit' || flow.engine === 'mandala') {
    ctx.strokeStyle = flow.engine === 'mandala' ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.055)';
    ctx.lineWidth = 0.55 + flow.bloom * 0.45;
    ctx.beginPath();
    points.forEach(({ point }, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    if (points.length > 2) {
      ctx.closePath();
    }
    ctx.stroke();
  }

  points
    .slice()
    .sort((a, b) => a.point.depth - b.point.depth)
    .forEach(({ cycle, point, phase }, index) => {
    if (flow.engine === 'pendulum' && point.anchorX != null && point.anchorY != null) {
      ctx.strokeStyle = colorWithAlpha(cycle.color, cycle.role === 'bass' ? 0.24 : 0.14);
      ctx.lineWidth = cycle.role === 'bass' ? 1.5 : 0.85;
      ctx.beginPath();
      ctx.moveTo(point.anchorX, point.anchorY);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      addGlow(ctx, point.anchorX, point.anchorY, 8, cycle.color, 0.065);
    }

    if (flow.engine === 'wave') {
      ctx.strokeStyle = colorWithAlpha(cycle.color, 0.09);
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(point.x, height * 0.18);
      ctx.lineTo(point.x, height * 0.82);
      ctx.stroke();
    }

    if (flow.engine === 'mandala') {
      const spokes = 6;
      const dx = point.x - cx;
      const dy = point.y - cy;
      for (let spoke = 1; spoke < spokes; spoke += 1) {
        const angle = (TAU / spokes) * spoke;
        const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
        addGlow(ctx, cx + rx, cy + ry, cycle.size * (1.6 + flow.bloom), cycle.color, 0.028);
        ctx.fillStyle = colorWithAlpha(cycle.color, 0.18);
        ctx.beginPath();
        ctx.arc(cx + rx, cy + ry, cycle.size * 0.34, 0, TAU);
        ctx.fill();
      }
    }

    const pulse = 0.82 + Math.sin(phase * TAU) * 0.12;
    const roleAlpha = cycle.role === 'ghost' ? 0.12 : cycle.role === 'spark' ? 0.18 : cycle.role === 'bass' ? 0.27 : 0.22;
    const visualSize = cycle.size * point.scale;
    addGlow(ctx, point.x, point.y, visualSize * (3.4 + flow.bloom * 2.2), cycle.color, roleAlpha);
    ctx.fillStyle = colorWithAlpha(cycle.color, cycle.role === 'ghost' ? 0.64 : 0.92);
    ctx.beginPath();
    ctx.arc(point.x, point.y, visualSize * pulse, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = colorWithAlpha(cycle.color, cycle.role === 'ghost' ? 0.24 : 0.58);
    ctx.lineWidth = cycle.role === 'bass' ? 1.25 : 0.9;
    ctx.beginPath();
    ctx.arc(point.x, point.y, visualSize * (1.18 + flow.bloom * 0.28), 0, TAU);
    ctx.stroke();
  });

  const alignment = points.reduce((score, entry) => {
    const distance = Math.min(entry.phase, 1 - entry.phase);
    return score + Math.max(0, 1 - distance * 12);
  }, 0);
  if (alignment > Math.max(2.2, flow.cycles.length * 0.45)) {
    addGlow(ctx, cx, cy, minSide * (0.2 + alignment * 0.024), flow.palette[0] ?? '#72F1B8', 0.045 + alignment * 0.014);
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: FlowParticle[], deltaSeconds: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.life -= deltaSeconds;
    particle.x += particle.driftX * deltaSeconds;
    particle.y += particle.driftY * deltaSeconds;
    if (particle.life <= 0) {
      particles.splice(index, 1);
      continue;
    }

    const t = 1 - particle.life / particle.maxLife;
    const radius = particle.size * (1 + t * 7.2);
    ctx.strokeStyle = colorWithAlpha(particle.color, (1 - t) * 0.42);
    ctx.lineWidth = Math.max(0.5, particle.size * 0.08 * (1 - t));
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius, 0, TAU);
    ctx.stroke();
    addGlow(ctx, particle.x, particle.y, radius * 0.72, particle.color, (1 - t) * 0.045);
  }
  ctx.restore();
}

function drawStillHint(ctx: CanvasRenderingContext2D, width: number, height: number, flow: FlowExperience) {
  if (flow.playing) {
    return;
  }

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText('PRESS PLAY', width / 2, height - 42);
  ctx.restore();
}

const FlowCanvas = forwardRef<HTMLCanvasElement, FlowCanvasProps>(
  ({ flow, restartToken, className = '', externalCanvasRef, playbackDriver = true }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const flowRef = useRef(flow);
    const elapsedRef = useRef(0);
    const lastFrameRef = useRef<number | null>(null);
    const previousImpactIndexesRef = useRef<Map<string, number>>(new Map());
    const particlesRef = useRef<FlowParticle[]>([]);
    const fullClearRef = useRef(true);
    const playbackDriverRef = useRef(playbackDriver);

    flowRef.current = flow;
    playbackDriverRef.current = playbackDriver;

    useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);

    useEffect(() => {
      if (externalCanvasRef) {
        externalCanvasRef.current = canvasRef.current;
      }
      return () => {
        if (externalCanvasRef?.current === canvasRef.current) {
          externalCanvasRef.current = null;
        }
      };
    }, [externalCanvasRef]);

    useEffect(() => {
      elapsedRef.current = 0;
      lastFrameRef.current = null;
      previousImpactIndexesRef.current.clear();
      particlesRef.current = [];
      fullClearRef.current = true;
    }, [restartToken, flow.id]);

    useEffect(() => {
      let frameId = 0;
      let disposed = false;

      const tick = (timestamp: number) => {
        if (disposed) {
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          frameId = window.requestAnimationFrame(tick);
          return;
        }

        const setup = setupCanvas(canvas);
        if (!setup) {
          frameId = window.requestAnimationFrame(tick);
          return;
        }

        const { ctx, width, height } = setup;
        const currentFlow = flowRef.current;
        const lastTimestamp = lastFrameRef.current ?? timestamp;
        const deltaSeconds = clamp((timestamp - lastTimestamp) / 1000, 0, 0.05);
        lastFrameRef.current = timestamp;

        if (currentFlow.playing) {
          elapsedRef.current += deltaSeconds;
        }
        updateFlowPad({
          soundId: currentFlow.soundId,
          enabled: currentFlow.playing && currentFlow.soundEnabled && playbackDriverRef.current,
          intensity:
            currentFlow.motionLevel === 'calm'
              ? 0.72
              : currentFlow.motionLevel === 'lively'
                ? 1.08
                : 0.9,
        });

        drawBackground(ctx, width, height, currentFlow, fullClearRef.current);
        fullClearRef.current = false;
        drawStructure(ctx, currentFlow, width, height, elapsedRef.current);

        if (currentFlow.playing) {
          currentFlow.cycles.forEach((cycle, index) => {
            const impactMultiplier = cycle.impactEvery ?? (cycle.role === 'bass' ? 1 : 2);
            const tempoScale = currentFlow.tempo / 72;
            const cycleTime =
              (elapsedRef.current *
                currentFlow.speed *
                getMotionMultiplier(currentFlow) *
                tempoScale *
                cycle.ratio) /
                currentFlow.cycleSeconds +
              cycle.phase;
            const impactIndex = Math.floor(cycleTime * impactMultiplier);
            const previousImpact = previousImpactIndexesRef.current.get(cycle.id);
            if (previousImpact == null) {
              previousImpactIndexesRef.current.set(cycle.id, impactIndex);
              return;
            }
            if (impactIndex !== previousImpact) {
              previousImpactIndexesRef.current.set(cycle.id, impactIndex);
              const phase = getCyclePhase(currentFlow, cycle, elapsedRef.current);
              const point = getCyclePoint(
                currentFlow.engine,
                currentFlow,
                cycle,
                index,
                phase,
                width,
                height,
              );
              particlesRef.current.push({
                x: point.x,
                y: point.y,
                color: cycle.color,
                life: 1.45 + currentFlow.bloom * 0.86,
                maxLife: 1.45 + currentFlow.bloom * 0.86,
                size: cycle.size * (cycle.role === 'bass' ? 1.85 : cycle.role === 'ghost' ? 0.82 : 1.18),
                driftX: Math.sin(index * 1.7) * (cycle.role === 'bass' ? 2 : 7),
                driftY: cycle.role === 'bass' ? -1.5 : -5 - index,
              });
              if (particlesRef.current.length > 72) {
                particlesRef.current.splice(0, particlesRef.current.length - 72);
              }
              if (currentFlow.soundEnabled && playbackDriverRef.current) {
                resumeFlowAudio();
                triggerFlowImpact({
                  midi: getMidiForCycle(currentFlow, cycle),
                  velocity: cycle.velocity,
                  role: cycle.role,
                  soundId: currentFlow.soundId,
                  pan: cycle.pan,
                });
              }
            }
          });
        }

        drawParticles(ctx, particlesRef.current, deltaSeconds);
        drawStillHint(ctx, width, height, currentFlow);

        frameId = window.requestAnimationFrame(tick);
      };

      frameId = window.requestAnimationFrame(tick);
      return () => {
        disposed = true;
        updateFlowPad({
          soundId: flowRef.current.soundId,
          enabled: false,
          intensity: 0,
        });
        window.cancelAnimationFrame(frameId);
      };
    }, []);

    return <canvas ref={canvasRef} className={className} />;
  },
);

FlowCanvas.displayName = 'FlowCanvas';

export default FlowCanvas;
