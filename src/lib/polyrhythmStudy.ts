const TAU = Math.PI * 2;

export interface PolyrhythmLayer {
  id: string;
  beatCount: number;
  activeSteps: boolean[];
  radius: number;
  rotationOffset: number; // degrees
  color: string;
  soundEnabled: boolean;
  pitchHz: number;
  gain: number;
}

export interface PolyrhythmStudy {
  id: string;
  name: string;
  description: string;
  layers: PolyrhythmLayer[];
  playing: boolean;
  bpm: number;
  soundEnabled: boolean;
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
  '#C7B8FF',
  '#FFA97A',
  '#7CE7D6',
  '#F6C667',
  '#9FE870',
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

function normalizePitchHz(pitchHz: number): number {
  return clamp(Math.round(pitchHz || 0), 90, 1400);
}

function normalizeGain(gain: number): number {
  return clamp(Number.isFinite(gain) ? gain : 0.12, 0.02, 0.28);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)] as T;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
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
    soundEnabled: overrides.soundEnabled ?? true,
    pitchHz: normalizePitchHz(overrides.pitchHz ?? 220),
    gain: normalizeGain(overrides.gain ?? 0.12),
  };
}

export function getActiveStepIndices(layer: PolyrhythmLayer): number[] {
  return layer.activeSteps.flatMap((step, index) => (step ? [index] : []));
}

export function countActiveSteps(layer: PolyrhythmLayer): number {
  return layer.activeSteps.reduce((count, step) => count + (step ? 1 : 0), 0);
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

export function invertLayerSteps(layer: PolyrhythmLayer): PolyrhythmLayer {
  return {
    ...layer,
    activeSteps: layer.activeSteps.map((step) => !step),
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

function createLayerMask(beatCount: number, intensity: 'random' | 'remix' | 'plus'): boolean[] {
  const minimum = beatCount <= 8 ? 2 : 3;
  const maxActive =
    intensity === 'plus'
      ? Math.max(minimum + 1, Math.ceil(beatCount * 0.6))
      : intensity === 'remix'
        ? Math.max(minimum + 1, Math.ceil(beatCount * 0.5))
        : Math.max(minimum, Math.ceil(beatCount * 0.42));
  const activeCount = clamp(randomInt(minimum, maxActive), minimum, beatCount);
  const base = createEvenPulseMask(beatCount, activeCount, randomInt(0, beatCount - 1));
  const mutationCount =
    intensity === 'plus' ? randomInt(1, Math.max(1, Math.floor(beatCount / 5))) : randomInt(0, Math.max(1, Math.floor(beatCount / 7)));
  const indices = shuffle(Array.from({ length: beatCount }, (_, index) => index)).slice(0, mutationCount);
  const next = [...base];
  indices.forEach((index) => {
    next[index] = !next[index];
  });
  if (!next.some(Boolean)) {
    next[randomInt(0, beatCount - 1)] = true;
  }
  return next;
}

function getLayerRadius(layerIndex: number, layerCount: number): number {
  const outer = 290;
  const inner = 118;
  if (layerCount <= 1) {
    return outer;
  }
  const ratio = layerIndex / Math.max(1, layerCount - 1);
  return outer - ratio * (outer - inner);
}

function createStudyName(prefix: string, layerCount: number): string {
  return `${prefix} ${layerCount} Layer${layerCount === 1 ? '' : 's'}`;
}

export function createRandomPolyrhythmStudy(intensity: 'random' | 'plus' = 'random'): PolyrhythmStudy {
  const curatedFamilies =
    intensity === 'plus'
      ? [
          { base: 12, layers: [3, 4, 6, 12, 24] },
          { base: 15, layers: [3, 5, 6, 10, 15, 30] },
          { base: 16, layers: [4, 8, 16, 32] },
          { base: 20, layers: [4, 5, 10, 20] },
        ]
      : [
          { base: 12, layers: [3, 4, 6, 12] },
          { base: 15, layers: [3, 5, 15] },
          { base: 16, layers: [4, 8, 16] },
          { base: 20, layers: [4, 5, 10, 20] },
        ];
  const family = randomChoice(curatedFamilies);
  const layerCount = intensity === 'plus' ? randomInt(3, Math.min(6, family.layers.length)) : randomInt(2, Math.min(4, family.layers.length));
  const layerBeatCounts = family.layers.slice(0, layerCount);
  const colorOffset = randomInt(0, POLYRHYTHM_LAYER_COLORS.length - 1);
  const layers = Array.from({ length: layerCount }, (_, index) => {
    const beatCount = layerBeatCounts[index] ?? family.base;
    return createPolyrhythmLayer(beatCount, {
      radius: getLayerRadius(index, layerCount),
      color:
        POLYRHYTHM_LAYER_COLORS[
          (index + colorOffset) % POLYRHYTHM_LAYER_COLORS.length
        ],
      rotationOffset:
        index === 0 ? 0 : intensity === 'plus' ? randomChoice([0, 0, 0, 15, 30, 45] as const) : randomChoice([0, 0, 0, 15, 30] as const),
      activeSteps: createLayerMask(beatCount, intensity),
      pitchHz: clamp(180 + index * 72 + randomInt(-20, 24), 90, 1200),
      gain: clamp(0.13 - index * 0.012, 0.05, 0.18),
    });
  });

  return {
    id: generateStudyId(),
    name: createStudyName(intensity === 'plus' ? 'Random+ Study' : 'Random Study', layerCount),
    description:
      intensity === 'plus'
        ? 'A denser nested pulse study with broader ratios and stronger offsets.'
        : 'A fresh nested pulse study with readable masks and shared geometry.',
    layers,
    playing: true,
    bpm: intensity === 'plus' ? randomInt(82, 128) : randomInt(72, 112),
    soundEnabled: true,
    showInactiveSteps: true,
    showStepLabels: intensity === 'plus' ? layerCount <= 3 : false,
  };
}

export function remixPolyrhythmStudy(study: PolyrhythmStudy): PolyrhythmStudy {
  const next = cloneStudy(study);
  return {
    ...next,
    name: `${study.name} Remix`,
    description: 'A variation that keeps the layer stack but changes mask shape and offset.',
    bpm: clamp(study.bpm + randomInt(-8, 8), 48, 180),
    layers: next.layers.map((layer, index) => {
      let updated = layer;
      if (Math.random() < 0.55) {
        updated = rotateLayer(updated, randomChoice([-1, 0, 0, 1, 2] as const));
      }
      if (Math.random() < 0.5) {
        updated = {
          ...updated,
          activeSteps: createLayerMask(updated.beatCount, 'remix'),
        };
      }
      return {
        ...updated,
        radius: getLayerRadius(index, next.layers.length),
        color: POLYRHYTHM_LAYER_COLORS[index % POLYRHYTHM_LAYER_COLORS.length],
      };
    }),
  };
}

export function createRandomPlusPolyrhythmStudy(): PolyrhythmStudy {
  const next = createRandomPolyrhythmStudy('plus');
  return {
    ...next,
    bpm: clamp(next.bpm + randomInt(4, 14), 48, 180),
    layers: next.layers.map((layer, index) => ({
      ...layer,
      rotationOffset:
        index === 0 ? 0 : randomChoice([0, 15, 30, 45, 60, 75, 90] as const),
      activeSteps: createLayerMask(layer.beatCount, 'plus'),
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
      pitchHz: 196,
      gain: 0.12,
    }),
    createPolyrhythmLayer(15, {
      radius: 200,
      color: '#7FD7FF',
      activeSteps: createEvenPulseMask(15, 5),
      pitchHz: 294,
      gain: 0.1,
    }),
  ],
  playing: true,
  bpm: 92,
  soundEnabled: true,
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
      pitchHz: 196,
      gain: 0.12,
    }),
    createPolyrhythmLayer(15, {
      radius: 270,
      color: '#FF88C2',
      activeSteps: createEvenPulseMask(15, 5),
      pitchHz: 246,
      gain: 0.11,
    }),
    createPolyrhythmLayer(30, {
      radius: 215,
      color: '#7FD7FF',
      activeSteps: createEvenPulseMask(30, 6),
      pitchHz: 293,
      gain: 0.09,
    }),
    createPolyrhythmLayer(30, {
      radius: 188,
      color: '#FFD166',
      activeSteps: createEvenPulseMask(30, 10),
      pitchHz: 370,
      gain: 0.08,
    }),
    createPolyrhythmLayer(60, {
      radius: 138,
      color: '#B6A0FF',
      activeSteps: createEvenPulseMask(60, 12),
      pitchHz: 440,
      gain: 0.07,
    }),
    createPolyrhythmLayer(60, {
      radius: 112,
      color: '#8AD8FF',
      activeSteps: createEvenPulseMask(60, 20),
      pitchHz: 554,
      gain: 0.06,
    }),
  ],
  playing: true,
  bpm: 84,
  soundEnabled: true,
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
      pitchHz: 220,
      gain: 0.11,
    }),
    createPolyrhythmLayer(40, {
      radius: 195,
      color: '#72F1B8',
      activeSteps: createEvenPulseMask(40, 5),
      pitchHz: 330,
      gain: 0.1,
    }),
  ],
  playing: true,
  bpm: 96,
  soundEnabled: true,
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
      pitchHz: 196,
      gain: 0.12,
    }),
    createPolyrhythmLayer(10, {
      radius: 180,
      color: '#FF88C2',
      rotationOffset: 18,
      activeSteps: [true, false, false, true, false, true, false, false, true, false],
      pitchHz: 293,
      gain: 0.1,
    }),
  ],
  playing: true,
  bpm: 104,
  soundEnabled: true,
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
