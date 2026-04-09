const TAU = Math.PI * 2;

export interface PolyrhythmLayer {
  id: string;
  beatCount: number;
  activeSteps: boolean[];
  radius: number;
  rotationOffset: number; // degrees
  color: string;
}

export interface PolyrhythmStudy {
  id: string;
  name: string;
  description: string;
  layers: PolyrhythmLayer[];
  playing: boolean;
  bpm: number;
  showInactiveSteps: boolean;
  showStepLabels: boolean;
}

export interface PolyrhythmStudyPreset {
  id: string;
  name: string;
  description: string;
  study: PolyrhythmStudy;
}

export interface PolyrhythmStepPoint {
  index: number;
  active: boolean;
  angle: number;
  x: number;
  y: number;
}

export const POLYRHYTHM_LAYER_COLORS = [
  '#72F1B8',
  '#7FD7FF',
  '#FF88C2',
  '#FFD166',
  '#B6A0FF',
  '#8AD8FF',
  '#FF7A7A',
  '#9BE7FF',
] as const;

function generateStudyId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `study-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeBeatCount(beatCount: number): number {
  return clamp(Math.round(beatCount || 0), 3, 32);
}

function normalizeRotationOffset(rotationOffset: number): number {
  const normalized = rotationOffset % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function createEvenPulseMask(
  beatCount: number,
  activeCount: number,
  offset = 0,
): boolean[] {
  const normalizedBeatCount = normalizeBeatCount(beatCount);
  const normalizedActiveCount = clamp(Math.round(activeCount || 0), 0, normalizedBeatCount);
  const mask = Array.from({ length: normalizedBeatCount }, () => false);

  if (normalizedActiveCount === 0) {
    return mask;
  }

  for (let index = 0; index < normalizedActiveCount; index += 1) {
    const stepIndex =
      (Math.floor((index * normalizedBeatCount) / normalizedActiveCount) + offset) %
      normalizedBeatCount;
    mask[(stepIndex + normalizedBeatCount) % normalizedBeatCount] = true;
  }

  return mask;
}

function normalizeActiveSteps(activeSteps: boolean[], beatCount: number): boolean[] {
  const normalizedBeatCount = normalizeBeatCount(beatCount);
  return Array.from({ length: normalizedBeatCount }, (_, index) => Boolean(activeSteps[index]));
}

function remapActiveSteps(activeSteps: boolean[], nextBeatCount: number): boolean[] {
  const currentBeatCount = Math.max(1, activeSteps.length);
  const currentActive = activeSteps.reduce((count, step) => count + (step ? 1 : 0), 0);

  if (currentActive === 0) {
    return Array.from({ length: nextBeatCount }, () => false);
  }

  const next = Array.from({ length: nextBeatCount }, () => false);

  activeSteps.forEach((step, index) => {
    if (!step) {
      return;
    }
    const mapped = Math.round((index / currentBeatCount) * nextBeatCount) % nextBeatCount;
    next[mapped] = true;
  });

  return next;
}

export function createPolyrhythmLayer(
  beatCount: number,
  overrides: Partial<Omit<PolyrhythmLayer, 'id' | 'beatCount' | 'activeSteps'>> & {
    activeSteps?: boolean[];
  } = {},
): PolyrhythmLayer {
  const normalizedBeatCount = normalizeBeatCount(beatCount);
  return {
    id: generateStudyId(),
    beatCount: normalizedBeatCount,
    activeSteps: normalizeActiveSteps(
      overrides.activeSteps ?? createEvenPulseMask(normalizedBeatCount, Math.max(2, Math.round(normalizedBeatCount / 3))),
      normalizedBeatCount,
    ),
    radius: overrides.radius ?? 220,
    rotationOffset: normalizeRotationOffset(overrides.rotationOffset ?? 0),
    color: overrides.color ?? POLYRHYTHM_LAYER_COLORS[0],
  };
}

export function getActiveStepIndices(layer: PolyrhythmLayer): number[] {
  return layer.activeSteps.flatMap((step, index) => (step ? [index] : []));
}

export function toggleLayerStep(layer: PolyrhythmLayer, index: number): PolyrhythmLayer {
  return {
    ...layer,
    activeSteps: layer.activeSteps.map((step, stepIndex) =>
      stepIndex === index ? !step : step,
    ),
  };
}

export function updateLayerBeatCount(
  layer: PolyrhythmLayer,
  beatCount: number,
): PolyrhythmLayer {
  const normalizedBeatCount = normalizeBeatCount(beatCount);
  return {
    ...layer,
    beatCount: normalizedBeatCount,
    activeSteps: remapActiveSteps(layer.activeSteps, normalizedBeatCount),
  };
}

export function rotateLayer(
  layer: PolyrhythmLayer,
  stepOffset: number,
): PolyrhythmLayer {
  const nextActiveSteps = Array.from({ length: layer.beatCount }, () => false);

  layer.activeSteps.forEach((active, index) => {
    if (!active) {
      return;
    }
    const nextIndex = (index + stepOffset + layer.beatCount) % layer.beatCount;
    nextActiveSteps[nextIndex] = true;
  });

  return {
    ...layer,
    activeSteps: nextActiveSteps,
  };
}

export function getLayerStepPoints(
  layer: PolyrhythmLayer,
  centerX: number,
  centerY: number,
  scale = 1,
): PolyrhythmStepPoint[] {
  return Array.from({ length: layer.beatCount }, (_, index) => {
    const angle =
      -Math.PI / 2 +
      (normalizeRotationOffset(layer.rotationOffset) / 360) * TAU +
      (index / layer.beatCount) * TAU;
    return {
      index,
      active: layer.activeSteps[index] ?? false,
      angle,
      x: centerX + Math.cos(angle) * layer.radius * scale,
      y: centerY + Math.sin(angle) * layer.radius * scale,
    };
  });
}

export function getPlaybackStepIndex(
  layer: PolyrhythmLayer,
  progress: number,
): number {
  const normalizedProgress = ((progress % 1) + 1) % 1;
  const offset = normalizeRotationOffset(layer.rotationOffset) / 360;
  return Math.floor((((normalizedProgress - offset) % 1) + 1) % 1 * layer.beatCount) % layer.beatCount;
}

export function cloneStudy(study: PolyrhythmStudy): PolyrhythmStudy {
  return {
    ...study,
    id: generateStudyId(),
    layers: study.layers.map((layer) => ({
      ...layer,
      id: generateStudyId(),
      activeSteps: [...layer.activeSteps],
    })),
  };
}

const THREE_FIVE_BASIC_STUDY: PolyrhythmStudy = {
  id: 'three-five-basic',
  name: '3:5 Basic',
  description: 'Three and five share a single 15-step cycle.',
  layers: [
    createPolyrhythmLayer(15, {
      radius: 260,
      color: '#72F1B8',
      activeSteps: createEvenPulseMask(15, 3),
    }),
    createPolyrhythmLayer(15, {
      radius: 200,
      color: '#7FD7FF',
      activeSteps: createEvenPulseMask(15, 5),
    }),
  ],
  playing: true,
  bpm: 92,
  showInactiveSteps: true,
  showStepLabels: false,
};

const THREE_FIVE_NESTED_STUDY: PolyrhythmStudy = {
  id: 'three-five-nested',
  name: '3:5 Nested',
  description: 'The same 3:5 proportion folds inward through denser step fields.',
  layers: [
    createPolyrhythmLayer(15, {
      radius: 300,
      color: '#72F1B8',
      activeSteps: createEvenPulseMask(15, 3),
    }),
    createPolyrhythmLayer(15, {
      radius: 270,
      color: '#FF88C2',
      activeSteps: createEvenPulseMask(15, 5),
    }),
    createPolyrhythmLayer(30, {
      radius: 215,
      color: '#7FD7FF',
      activeSteps: createEvenPulseMask(30, 6),
    }),
    createPolyrhythmLayer(30, {
      radius: 188,
      color: '#FFD166',
      activeSteps: createEvenPulseMask(30, 10),
    }),
    createPolyrhythmLayer(60, {
      radius: 138,
      color: '#B6A0FF',
      activeSteps: createEvenPulseMask(60, 12),
    }),
    createPolyrhythmLayer(60, {
      radius: 112,
      color: '#8AD8FF',
      activeSteps: createEvenPulseMask(60, 20),
    }),
  ],
  playing: true,
  bpm: 84,
  showInactiveSteps: true,
  showStepLabels: false,
};

const FIVE_OVER_EIGHT_STUDY: PolyrhythmStudy = {
  id: 'five-over-eight',
  name: '5 over 8',
  description: 'Two evenly spaced pulse families carve different faces from the same wheel.',
  layers: [
    createPolyrhythmLayer(40, {
      radius: 260,
      color: '#7FD7FF',
      activeSteps: createEvenPulseMask(40, 8),
    }),
    createPolyrhythmLayer(40, {
      radius: 195,
      color: '#72F1B8',
      activeSteps: createEvenPulseMask(40, 5),
    }),
  ],
  playing: true,
  bpm: 96,
  showInactiveSteps: true,
  showStepLabels: false,
};

const TEN_STEP_SYNCOPATION_STUDY: PolyrhythmStudy = {
  id: 'ten-step-syncopation',
  name: '10 Step Syncopation',
  description: 'A syncopated ten-point ring with a counterline tucked inside it.',
  layers: [
    createPolyrhythmLayer(10, {
      radius: 245,
      color: '#FFD166',
      activeSteps: [true, false, true, false, true, false, true, false, true, false],
    }),
    createPolyrhythmLayer(10, {
      radius: 180,
      color: '#FF88C2',
      rotationOffset: 18,
      activeSteps: [true, false, false, true, false, true, false, false, true, false],
    }),
  ],
  playing: true,
  bpm: 104,
  showInactiveSteps: true,
  showStepLabels: true,
};

export const POLYRHYTHM_PRESETS: PolyrhythmStudyPreset[] = [
  {
    id: 'three-five-basic',
    name: '3:5 Basic',
    description: 'Three against five on a shared 15-step ring.',
    study: THREE_FIVE_BASIC_STUDY,
  },
  {
    id: 'three-five-nested',
    name: '3:5 Nested',
    description: 'Three against five repeated through nested subdivisions.',
    study: THREE_FIVE_NESTED_STUDY,
  },
  {
    id: 'five-over-eight',
    name: '5 over 8',
    description: 'Two pulse families sharing one longer cycle.',
    study: FIVE_OVER_EIGHT_STUDY,
  },
  {
    id: 'ten-step-syncopation',
    name: '10 Step Syncopation',
    description: 'A simple syncopated ring for masking and polygon study.',
    study: TEN_STEP_SYNCOPATION_STUDY,
  },
];

export function createDefaultPolyrhythmStudy(): PolyrhythmStudy {
  return cloneStudy(THREE_FIVE_NESTED_STUDY);
}
