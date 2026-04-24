import type { RootNote, ScaleName } from './audioEngine';

const TAU = Math.PI * 2;

export type PolyrhythmSoundPalette =
  | 'study-pulse'
  | 'wood'
  | 'soft-synth'
  | 'bright-marker';
export type PolyrhythmPitchMode = 'free' | 'keyed';
export type PolyrhythmRegister = 'tight' | 'wide';
export type PolyrhythmDisplayStyle = 'shared' | 'nested';
export type PolyrhythmPresetGroup = 'one-layer' | 'two-layer' | 'advanced';
export const MAX_POLYRHYTHM_LAYERS = 6;

export interface PolyrhythmSoundSettings {
  palette: PolyrhythmSoundPalette;
  pitchMode: PolyrhythmPitchMode;
  rootNote: RootNote;
  scaleName: ScaleName;
  register: PolyrhythmRegister;
}

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
  displayStyle: PolyrhythmDisplayStyle;
  layers: PolyrhythmLayer[];
  playing: boolean;
  bpm: number;
  soundEnabled: boolean;
  showInactiveSteps: boolean;
  showStepLabels: boolean;
  soundSettings: PolyrhythmSoundSettings;
}

export interface PolyrhythmStudyPreset {
  id: string;
  name: string;
  description: string;
  group: PolyrhythmPresetGroup;
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

export const POLYRHYTHM_PRESET_GROUP_META: Record<
  PolyrhythmPresetGroup,
  { label: string; description: string }
> = {
  'one-layer': {
    label: '1 Layer',
    description: 'Start with one rhythm on one shared circle.',
  },
  'two-layer': {
    label: '2 Layers',
    description: 'Compare two pulse families on the same cycle.',
  },
  advanced: {
    label: 'Advanced',
    description: 'Denser stacks, wider ratios, and nested studies.',
  },
};

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
  return clamp(Math.round(beatCount || 0), 3, 64);
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

function chooseDifferent<T>(items: readonly T[], current: T): T {
  const filtered = items.filter((item) => item !== current);
  if (filtered.length === 0) {
    return current;
  }
  return randomChoice(filtered);
}

function normalizePolyrhythmSoundSettings(
  settings: Partial<PolyrhythmSoundSettings> | undefined,
): PolyrhythmSoundSettings {
  const rawPalette = settings?.palette as PolyrhythmSoundPalette | 'glass-tick' | undefined;
  const normalizedPalette =
    rawPalette === 'glass-tick'
      ? 'bright-marker'
      : rawPalette;
  return {
    palette:
      normalizedPalette && [
        'study-pulse',
        'wood',
        'soft-synth',
        'bright-marker',
      ].includes(normalizedPalette)
        ? normalizedPalette
        : 'study-pulse',
    pitchMode: settings?.pitchMode === 'keyed' ? 'keyed' : 'free',
    rootNote: settings?.rootNote ?? 'C',
    scaleName: settings?.scaleName ?? 'majorPentatonic',
    register: settings?.register === 'wide' ? 'wide' : 'tight',
  };
}

export function createPolyrhythmSoundSettings(
  overrides: Partial<PolyrhythmSoundSettings> = {},
): PolyrhythmSoundSettings {
  return normalizePolyrhythmSoundSettings(overrides);
}

function createRandomPolyrhythmSoundSettings(
  intensity: 'random' | 'remix' | 'plus',
  current?: PolyrhythmSoundSettings,
): PolyrhythmSoundSettings {
  const rootPool: RootNote[] = ['C', 'D', 'E', 'F', 'G', 'A'];
  const baseScales: ScaleName[] = ['majorPentatonic', 'dorian', 'lydian'];
  const plusScales: ScaleName[] = [...baseScales, 'wholeTone', 'diminished'];
  const palettePool =
    intensity === 'plus'
      ? (['study-pulse', 'wood', 'soft-synth', 'bright-marker'] as const)
      : intensity === 'remix'
        ? (['study-pulse', 'wood', 'soft-synth'] as const)
        : (['study-pulse', 'wood'] as const);
  const palette =
    current && intensity === 'remix' && Math.random() < 0.6
      ? current.palette
      : current
        ? chooseDifferent(palettePool, current.palette)
        : randomChoice(palettePool);
  const pitchMode =
    current && intensity === 'remix'
      ? Math.random() < 0.7
        ? current.pitchMode
        : current.pitchMode === 'free'
          ? 'keyed'
          : 'free'
      : intensity === 'plus'
        ? (Math.random() < 0.55 ? 'keyed' : 'free')
        : (Math.random() < 0.32 ? 'keyed' : 'free');
  return createPolyrhythmSoundSettings({
    palette,
    pitchMode,
    rootNote:
      current && intensity === 'remix' && Math.random() < 0.65
        ? current.rootNote
        : randomChoice(rootPool),
    scaleName:
      current && intensity === 'remix' && Math.random() < 0.65
        ? current.scaleName
        : randomChoice(intensity === 'plus' ? plusScales : baseScales),
    register:
      current && intensity === 'remix' && Math.random() < 0.75
        ? current.register
        : intensity === 'plus'
          ? randomChoice(['tight', 'wide'] as const)
          : randomChoice(['tight', 'tight', 'wide'] as const),
  });
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

function createExpressivePulseMask(
  beatCount: number,
  activeCount: number,
  moveCount = 1,
): boolean[] {
  const baseMask = createEvenPulseMask(beatCount, activeCount);
  const nextMask = [...baseMask];
  const activeIndices = shuffle(
    baseMask.flatMap((active, index) => (active ? [index] : [])),
  );

  let remainingMoves = clamp(moveCount, 0, 3);
  for (const sourceIndex of activeIndices) {
    if (remainingMoves <= 0) {
      break;
    }

    const delta = randomChoice([-2, -1, 1, 2] as const);
    const targetIndex = (sourceIndex + delta + beatCount) % beatCount;
    if (nextMask[targetIndex]) {
      continue;
    }

    nextMask[sourceIndex] = false;
    nextMask[targetIndex] = true;
    remainingMoves -= 1;
  }

  return nextMask;
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
    activeSteps: Array.from({ length: layer.beatCount }, (_, index) => !Boolean(layer.activeSteps[index])),
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
    soundSettings: { ...study.soundSettings },
    layers: study.layers.map((layer) => ({
      ...layer,
      id: generateStudyId(),
      activeSteps: [...layer.activeSteps],
    })),
  };
}

function getNestedLayerRadius(layerIndex: number, layerCount: number): number {
  const outer = 290;
  const inner = 118;
  if (layerCount <= 1) {
    return outer;
  }
  const ratio = layerIndex / Math.max(1, layerCount - 1);
  return outer - ratio * (outer - inner);
}

function getSharedLayerRadius(layerIndex: number, layerCount: number): number {
  void layerIndex;
  return layerCount <= 1 ? 272 : 278;
}

function getStudyLayerRadius(
  layerIndex: number,
  layerCount: number,
  displayStyle: PolyrhythmDisplayStyle,
): number {
  return displayStyle === 'nested'
    ? getNestedLayerRadius(layerIndex, layerCount)
    : getSharedLayerRadius(layerIndex, layerCount);
}

function createMaskFromIndices(beatCount: number, indices: number[]): boolean[] {
  const normalizedBeatCount = normalizeBeatCount(beatCount);
  const next = Array.from({ length: normalizedBeatCount }, () => false);
  indices.forEach((index) => {
    const wrappedIndex = ((index % normalizedBeatCount) + normalizedBeatCount) % normalizedBeatCount;
    next[wrappedIndex] = true;
  });
  return next;
}

function getLayerPitch(index: number, layerCount: number): number {
  const start = 188;
  const spread = layerCount <= 1 ? 0 : 180;
  return clamp(start + Math.round((index / Math.max(1, layerCount - 1)) * spread), 90, 1200);
}

function getLayerGain(index: number): number {
  return clamp(0.13 - index * 0.014, 0.06, 0.18);
}

function getStudyColors(layerCount: number, paletteOffset = 0): string[] {
  return Array.from({ length: layerCount }, (_, index) =>
    POLYRHYTHM_LAYER_COLORS[(paletteOffset + index) % POLYRHYTHM_LAYER_COLORS.length],
  );
}

function stepOffsetToDegrees(beatCount: number, stepOffset: number): number {
  return normalizeRotationOffset((stepOffset / Math.max(1, beatCount)) * 360);
}

function createSingleLayerStudy(options: {
  id: string;
  name: string;
  description: string;
  beatCount: number;
  activeIndices: number[];
  color: string;
  bpm: number;
  soundSettings?: Partial<PolyrhythmSoundSettings>;
  showStepLabels?: boolean;
}): PolyrhythmStudy {
  const beatCount = normalizeBeatCount(options.beatCount);
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    displayStyle: 'shared',
    layers: [
      createPolyrhythmLayer(beatCount, {
        radius: getStudyLayerRadius(0, 1, 'shared'),
        color: options.color,
        activeSteps: createMaskFromIndices(beatCount, options.activeIndices),
        pitchHz: 214,
        gain: 0.13,
      }),
    ],
    playing: true,
    bpm: options.bpm,
    soundEnabled: true,
    showInactiveSteps: true,
    showStepLabels: options.showStepLabels ?? beatCount <= 16,
    soundSettings: createPolyrhythmSoundSettings(options.soundSettings),
  };
}

function createSharedCycleStudy(options: {
  id: string;
  name: string;
  description: string;
  cycleSteps: number;
  activeCounts: number[];
  bpm: number;
  displayStyle?: PolyrhythmDisplayStyle;
  colors?: string[];
  rotationStepOffsets?: number[];
  soundSettings?: Partial<PolyrhythmSoundSettings>;
  showStepLabels?: boolean;
}): PolyrhythmStudy {
  const cycleSteps = normalizeBeatCount(options.cycleSteps);
  const rotationStepOffsets = options.rotationStepOffsets ?? [];
  const colors = options.colors ?? getStudyColors(options.activeCounts.length);
  const displayStyle = options.displayStyle ?? 'shared';
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    displayStyle,
    layers: options.activeCounts.map((activeCount, index) =>
      createPolyrhythmLayer(cycleSteps, {
        radius: getStudyLayerRadius(index, options.activeCounts.length, displayStyle),
        color: colors[index % colors.length],
        activeSteps: createEvenPulseMask(cycleSteps, activeCount),
        rotationOffset: stepOffsetToDegrees(cycleSteps, rotationStepOffsets[index] ?? 0),
        pitchHz: getLayerPitch(index, options.activeCounts.length),
        gain: getLayerGain(index),
      }),
    ),
    playing: true,
    bpm: options.bpm,
    soundEnabled: true,
    showInactiveSteps: true,
    showStepLabels: options.showStepLabels ?? (cycleSteps <= 16 && options.activeCounts.length <= 2),
    soundSettings: createPolyrhythmSoundSettings(options.soundSettings),
  };
}

interface PolyrhythmRandomFamily {
  label: string;
  cycleSteps: number;
  activeCounts: number[];
  bpmRange: readonly [number, number];
  displayStyle?: PolyrhythmDisplayStyle;
  rotationChoices?: readonly number[];
}

const STANDARD_RANDOM_FAMILIES: PolyrhythmRandomFamily[] = [
  { label: '2:3', cycleSteps: 12, activeCounts: [2, 3], bpmRange: [70, 102] },
  { label: '3:4', cycleSteps: 12, activeCounts: [3, 4], bpmRange: [74, 106] },
  { label: '3:5', cycleSteps: 15, activeCounts: [3, 5], bpmRange: [76, 104] },
  { label: '4:5', cycleSteps: 20, activeCounts: [4, 5], bpmRange: [76, 108] },
  { label: '5:6', cycleSteps: 30, activeCounts: [5, 6], bpmRange: [82, 110] },
  { label: '5:8', cycleSteps: 40, activeCounts: [5, 8], bpmRange: [84, 112] },
  { label: '7:8', cycleSteps: 56, activeCounts: [7, 8], bpmRange: [88, 114] },
];

const CORE_TRIPLE_FAMILIES: PolyrhythmRandomFamily[] = [
  { label: '3·4·6', cycleSteps: 12, activeCounts: [3, 4, 6], bpmRange: [78, 108] },
  { label: '4·5·10', cycleSteps: 20, activeCounts: [4, 5, 10], bpmRange: [82, 112] },
  { label: '3·5·6', cycleSteps: 30, activeCounts: [3, 5, 6], bpmRange: [80, 110] },
];

const EXPLORATORY_RANDOM_FAMILIES: PolyrhythmRandomFamily[] = [
  {
    label: '3·4·6',
    cycleSteps: 12,
    activeCounts: [3, 4, 6],
    bpmRange: [84, 116],
    displayStyle: 'shared',
    rotationChoices: [0, 0, 1, 2],
  },
  {
    label: '3·5·15',
    cycleSteps: 15,
    activeCounts: [3, 5, 15],
    bpmRange: [84, 116],
    displayStyle: 'nested',
    rotationChoices: [0, 1, 2, 3],
  },
  {
    label: '4·5·10',
    cycleSteps: 20,
    activeCounts: [4, 5, 10],
    bpmRange: [86, 118],
    displayStyle: 'shared',
    rotationChoices: [0, 0, 1, 2],
  },
  {
    label: '5·8·10',
    cycleSteps: 40,
    activeCounts: [5, 8, 10],
    bpmRange: [88, 122],
    displayStyle: 'nested',
    rotationChoices: [0, 1, 2, 3],
  },
  {
    label: '4·5·10·20',
    cycleSteps: 20,
    activeCounts: [4, 5, 10, 20],
    bpmRange: [90, 122],
    displayStyle: 'nested',
    rotationChoices: [0, 1, 2, 3],
  },
  {
    label: '3·5·6·10·15',
    cycleSteps: 30,
    activeCounts: [3, 5, 6, 10, 15],
    bpmRange: [90, 124],
    displayStyle: 'nested',
    rotationChoices: [0, 1, 2, 3, 4],
  },
  {
    label: '4·5·8·10',
    cycleSteps: 40,
    activeCounts: [4, 5, 8, 10],
    bpmRange: [90, 122],
    displayStyle: 'shared',
    rotationChoices: [0, 0, 1, 2, 3],
  },
  {
    label: '3·4·6·8·12',
    cycleSteps: 24,
    activeCounts: [3, 4, 6, 8, 12],
    bpmRange: [88, 122],
    displayStyle: 'shared',
    rotationChoices: [0, 0, 1, 2, 3],
  },
  {
    label: '5·7',
    cycleSteps: 35,
    activeCounts: [5, 7],
    bpmRange: [88, 118],
    displayStyle: 'shared',
    rotationChoices: [0, 0, 1, 2],
  },
  {
    label: '7·10',
    cycleSteps: 70,
    activeCounts: [7, 10],
    bpmRange: [90, 124],
    displayStyle: 'shared',
    rotationChoices: [0, 1, 2, 3],
  },
  {
    label: '7·8',
    cycleSteps: 56,
    activeCounts: [7, 8],
    bpmRange: [90, 124],
    displayStyle: 'shared',
    rotationChoices: [0, 0, 1, 2],
  },
];

function buildRandomFamilyStudy(
  family: PolyrhythmRandomFamily,
  intensity: 'random' | 'plus',
): PolyrhythmStudy {
  const layerCount = family.activeCounts.length;
  const colorOffset = randomInt(0, POLYRHYTHM_LAYER_COLORS.length - 1);
  const colors = getStudyColors(layerCount, colorOffset);
  const soundSettings = createRandomPolyrhythmSoundSettings(intensity);
  const displayStyle =
    intensity === 'plus'
      ? (family.displayStyle ?? (layerCount >= 4 || Math.random() < 0.5 ? 'nested' : 'shared'))
      : (family.displayStyle ?? 'shared');
  const rotationOffsets =
    intensity === 'plus'
      ? family.activeCounts.map((_, index) =>
          index === 0 ? 0 : randomChoice((family.rotationChoices ?? [0, 0, 1, 2, 3]) as readonly number[]),
        )
      : family.activeCounts.map(() => 0);
  const nextStudy = createSharedCycleStudy({
    id: generateStudyId(),
    name: intensity === 'plus' ? `Random+ ${family.label}` : `Random ${family.label}`,
    description:
      intensity === 'plus'
        ? displayStyle === 'nested'
          ? `${family.label} with a denser nested stack and light offset drift.`
          : `${family.label} with a wider shared cycle and a more adventurous pulse map.`
        : `${family.label} on one shared cycle with a clear beginner-friendly pulse map.`,
    cycleSteps: family.cycleSteps,
    activeCounts: family.activeCounts,
    bpm: randomInt(family.bpmRange[0], family.bpmRange[1]),
    displayStyle,
    colors,
    rotationStepOffsets: rotationOffsets,
    soundSettings,
    showStepLabels: family.cycleSteps <= 16 && layerCount <= 2,
  });

  if (intensity === 'plus') {
    const layerOffset = randomInt(0, POLYRHYTHM_LAYER_COLORS.length - 1);
    nextStudy.layers = nextStudy.layers.map((layer, index) => {
      const activeCount = countActiveSteps(layer);
      const shouldHumanizeMask =
        index > 0 &&
        layer.beatCount >= 12 &&
        activeCount >= 3 &&
        Math.random() < (layerCount >= 4 ? 0.6 : 0.42);
      return {
        ...layer,
        color: POLYRHYTHM_LAYER_COLORS[(layerOffset + index) % POLYRHYTHM_LAYER_COLORS.length],
        activeSteps: shouldHumanizeMask
          ? createExpressivePulseMask(
              layer.beatCount,
              activeCount,
              layerCount >= 4 ? 2 : 1,
            )
          : layer.activeSteps,
      };
    });
  }

  return nextStudy;
}

export function createRandomPolyrhythmStudy(intensity: 'random' | 'plus' = 'random'): PolyrhythmStudy {
  if (intensity === 'plus') {
    const denseFamilies = EXPLORATORY_RANDOM_FAMILIES.filter((family) => family.activeCounts.length >= 3);
    const family =
      Math.random() < 0.78
        ? randomChoice(denseFamilies)
        : randomChoice(EXPLORATORY_RANDOM_FAMILIES);
    return buildRandomFamilyStudy(family, 'plus');
  }

  const family =
    Math.random() < 0.82
      ? randomChoice(STANDARD_RANDOM_FAMILIES)
      : randomChoice(CORE_TRIPLE_FAMILIES);

  return buildRandomFamilyStudy(family, 'random');
}

export function remixPolyrhythmStudy(study: PolyrhythmStudy): PolyrhythmStudy {
  const next = cloneStudy(study);
  const colorOffset = randomInt(0, POLYRHYTHM_LAYER_COLORS.length - 1);
  const isBeginnerStudy =
    study.layers.length <= 3 &&
    study.displayStyle === 'shared' &&
    study.layers.every((layer) => Math.round(layer.rotationOffset) === 0);
  return {
    ...next,
    name: `${study.name} Remix`,
    description: isBeginnerStudy
      ? 'A gentle variation that keeps the same study family readable.'
      : study.displayStyle === 'nested'
        ? 'A variation that keeps the same family while refreshing the nested spacing.'
        : 'A variation that keeps the same family while refreshing color and pulse balance.',
    bpm: clamp(study.bpm + randomInt(-8, 8), 48, 180),
    soundSettings: createRandomPolyrhythmSoundSettings('remix', study.soundSettings),
    layers: next.layers.map((layer, index) => {
      return {
        ...layer,
        radius: getStudyLayerRadius(index, next.layers.length, study.displayStyle),
        color:
          POLYRHYTHM_LAYER_COLORS[
            (index + colorOffset) % POLYRHYTHM_LAYER_COLORS.length
          ],
        rotationOffset:
          !isBeginnerStudy && study.displayStyle === 'nested' && Math.random() < 0.45
            ? normalizeRotationOffset(
                layer.rotationOffset +
                  stepOffsetToDegrees(layer.beatCount, randomChoice([-1, 1, 2] as const)),
              )
            : layer.rotationOffset,
      };
    }),
  };
}

export function createRandomPlusPolyrhythmStudy(): PolyrhythmStudy {
  return createRandomPolyrhythmStudy('plus');
}

const BO_DIDDLEY_STUDY = createSingleLayerStudy({
  id: 'bo-diddley',
  name: 'Bo Diddley',
  description: 'A rock-side reading of the common 3-2 clave cell.',
  beatCount: 16,
  activeIndices: [0, 3, 6, 10, 12],
  color: '#FFD166',
  bpm: 104,
  soundSettings: {
    palette: 'bright-marker',
    pitchMode: 'free',
    register: 'tight',
  },
});

const CASCARA_STUDY = createSingleLayerStudy({
  id: 'cascara',
  name: 'Cascara',
  description: 'The common shell timeline used for a 3-2 cascara feel.',
  beatCount: 16,
  activeIndices: [0, 3, 6, 7, 10, 12, 14],
  color: '#7FD7FF',
  bpm: 106,
  soundSettings: {
    palette: 'wood',
    pitchMode: 'free',
    register: 'tight',
  },
});

const JAZZ_RIDE_STUDY = createSingleLayerStudy({
  id: 'jazz-ride',
  name: 'Jazz Ride',
  description: 'Quarter notes on 1 and 3 with the standard skip-note triplets.',
  beatCount: 12,
  activeIndices: [0, 3, 5, 6, 9, 11],
  color: '#72F1B8',
  bpm: 132,
  soundSettings: {
    palette: 'bright-marker',
    pitchMode: 'free',
    register: 'tight',
  },
});

const BEMBE_STUDY = createSingleLayerStudy({
  id: 'bembe',
  name: 'Bembe',
  description: 'The standard 12-pulse bell line on one shared frame.',
  beatCount: 12,
  activeIndices: [0, 2, 3, 5, 7, 8, 10],
  color: '#FF88C2',
  bpm: 112,
  soundSettings: {
    palette: 'wood',
    pitchMode: 'keyed',
    rootNote: 'E',
    scaleName: 'dorian',
    register: 'tight',
  },
});

const BOSSA_STUDY = createSingleLayerStudy({
  id: 'bossa',
  name: 'Bossa',
  description: 'A common five-stroke bossa clave with the last side delayed.',
  beatCount: 16,
  activeIndices: [0, 3, 6, 10, 13],
  color: '#8AD8FF',
  bpm: 118,
  soundSettings: {
    palette: 'soft-synth',
    pitchMode: 'free',
    register: 'tight',
  },
});

const SON_CLAVE_STUDY = createSingleLayerStudy({
  id: 'son-clave',
  name: 'Son Clave',
  description: 'The common 3-2 son clave on a two-bar loop.',
  beatCount: 16,
  activeIndices: [0, 3, 6, 10, 12],
  color: '#72F1B8',
  bpm: 104,
  soundSettings: {
    palette: 'study-pulse',
    pitchMode: 'free',
    register: 'tight',
  },
});

const RUMBA_CLAVE_STUDY = createSingleLayerStudy({
  id: 'rumba-clave',
  name: 'Rumba Clave',
  description: 'The 3-2 rumba variation, with the third stroke pushed later.',
  beatCount: 16,
  activeIndices: [0, 3, 7, 10, 12],
  color: '#FF7A7A',
  bpm: 102,
  soundSettings: {
    palette: 'bright-marker',
    pitchMode: 'free',
    register: 'tight',
  },
});

const TWO_THREE_STUDY = createSharedCycleStudy({
  id: 'two-three',
  name: '2:3',
  description: 'Two against three on one shared 12-step cycle.',
  cycleSteps: 12,
  activeCounts: [2, 3],
  bpm: 88,
  colors: ['#FFD166', '#72F1B8'],
  soundSettings: {
    palette: 'study-pulse',
    pitchMode: 'free',
    register: 'tight',
  },
});

const THREE_FOUR_STUDY = createSharedCycleStudy({
  id: 'three-four',
  name: '3:4',
  description: 'Three against four on one shared 12-step frame.',
  cycleSteps: 12,
  activeCounts: [3, 4],
  bpm: 92,
  colors: ['#72F1B8', '#7FD7FF'],
  soundSettings: {
    palette: 'bright-marker',
    pitchMode: 'free',
    register: 'tight',
  },
});

const THREE_FIVE_STUDY = createSharedCycleStudy({
  id: 'three-five',
  name: '3:5',
  description: 'Three against five on one shared 15-step cycle.',
  cycleSteps: 15,
  activeCounts: [3, 5],
  bpm: 90,
  colors: ['#72F1B8', '#7FD7FF'],
  soundSettings: {
    palette: 'study-pulse',
    pitchMode: 'free',
    register: 'tight',
  },
});

const FOUR_FIVE_STUDY = createSharedCycleStudy({
  id: 'four-five',
  name: '4:5',
  description: 'Four against five on one shared 20-step frame.',
  cycleSteps: 20,
  activeCounts: [4, 5],
  bpm: 94,
  colors: ['#72F1B8', '#FF88C2'],
  soundSettings: {
    palette: 'bright-marker',
    pitchMode: 'free',
    register: 'wide',
  },
});

const FIVE_SIX_STUDY = createSharedCycleStudy({
  id: 'five-six',
  name: '5:6',
  description: 'Five and six sharing the same 30-step cycle.',
  cycleSteps: 30,
  activeCounts: [5, 6],
  bpm: 98,
  colors: ['#72F1B8', '#FFD166'],
  soundSettings: {
    palette: 'wood',
    pitchMode: 'keyed',
    rootNote: 'G',
    scaleName: 'majorPentatonic',
    register: 'wide',
  },
});

const FIVE_EIGHT_STUDY = createSharedCycleStudy({
  id: 'five-eight',
  name: '5:8',
  description: 'Five against eight on one wider 40-step cycle.',
  cycleSteps: 40,
  activeCounts: [5, 8],
  bpm: 96,
  colors: ['#7FD7FF', '#72F1B8'],
  soundSettings: {
    palette: 'wood',
    pitchMode: 'keyed',
    rootNote: 'A',
    scaleName: 'dorian',
    register: 'wide',
  },
});

const SEVEN_EIGHT_STUDY = createSharedCycleStudy({
  id: 'seven-eight',
  name: '7:8',
  description: 'Seven against eight on a wider shared cycle.',
  cycleSteps: 56,
  activeCounts: [7, 8],
  bpm: 92,
  colors: ['#72F1B8', '#B6A0FF'],
  soundSettings: {
    palette: 'soft-synth',
    pitchMode: 'keyed',
    rootNote: 'D',
    scaleName: 'lydian',
    register: 'wide',
  },
});

const TRIPLE_GRID_STUDY = createSharedCycleStudy({
  id: 'triple-grid',
  name: '3·4·6 Grid',
  description: 'Three pulse families sharing one 12-step cycle.',
  cycleSteps: 12,
  activeCounts: [3, 4, 6],
  bpm: 88,
  displayStyle: 'shared',
  colors: ['#72F1B8', '#7FD7FF', '#FFD166'],
  soundSettings: {
    palette: 'bright-marker',
    pitchMode: 'free',
    register: 'tight',
  },
  showStepLabels: false,
});

const THREE_FIVE_SIX_STUDY = createSharedCycleStudy({
  id: 'three-five-six',
  name: '3·5·6 Cycle',
  description: 'Three overlapping layers on one readable 30-step frame.',
  cycleSteps: 30,
  activeCounts: [3, 5, 6],
  bpm: 90,
  displayStyle: 'shared',
  colors: ['#72F1B8', '#7FD7FF', '#FFD166'],
  soundSettings: {
    palette: 'bright-marker',
    pitchMode: 'keyed',
    rootNote: 'D',
    scaleName: 'majorPentatonic',
    register: 'wide',
  },
  showStepLabels: false,
});

const FOUR_FIVE_TEN_STUDY = createSharedCycleStudy({
  id: 'four-five-ten',
  name: '4·5·10 Mesh',
  description: 'Four, five, and ten stacked on one shared 20-step cycle.',
  cycleSteps: 20,
  activeCounts: [4, 5, 10],
  bpm: 94,
  displayStyle: 'shared',
  colors: ['#72F1B8', '#FF88C2', '#FFD166'],
  soundSettings: {
    palette: 'wood',
    pitchMode: 'keyed',
    rootNote: 'G',
    scaleName: 'dorian',
    register: 'wide',
  },
  showStepLabels: false,
});

const NESTED_THREE_FIVE_STUDY: PolyrhythmStudy = createSharedCycleStudy({
  id: 'nested-three-five',
  name: 'Nested 3:5',
  description: 'The same 3:5 family repeated through denser nested layers.',
  cycleSteps: 30,
  activeCounts: [3, 5, 6, 10],
  bpm: 88,
  displayStyle: 'nested',
  colors: ['#72F1B8', '#7FD7FF', '#FF88C2', '#FFD166'],
  soundSettings: {
    palette: 'bright-marker',
    pitchMode: 'free',
    register: 'wide',
  },
  showStepLabels: false,
});

const COUNTER_MESH_STUDY = createSharedCycleStudy({
  id: 'counter-mesh',
  name: '5·8·10 Mesh',
  description: 'Three related layers on a wider 40-step frame.',
  cycleSteps: 40,
  activeCounts: [5, 8, 10],
  bpm: 92,
  displayStyle: 'nested',
  colors: ['#72F1B8', '#7FD7FF', '#FF88C2'],
  soundSettings: {
    palette: 'soft-synth',
    pitchMode: 'keyed',
    rootNote: 'A',
    scaleName: 'dorian',
    register: 'wide',
  },
  showStepLabels: false,
});

const ROTATING_WEAVE_STUDY: PolyrhythmStudy = {
  id: 'rotating-weave',
  name: 'Rotating Weave',
  description: 'Three layers with light offsets for a more advanced study.',
  displayStyle: 'nested',
  layers: [
    createPolyrhythmLayer(12, {
      radius: getStudyLayerRadius(0, 3, 'nested'),
      color: '#72F1B8',
      activeSteps: createEvenPulseMask(12, 3),
      pitchHz: 188,
      gain: 0.12,
    }),
    createPolyrhythmLayer(16, {
      radius: getStudyLayerRadius(1, 3, 'nested'),
      color: '#7FD7FF',
      rotationOffset: 22.5,
      activeSteps: createEvenPulseMask(16, 4, 1),
      pitchHz: 272,
      gain: 0.1,
    }),
    createPolyrhythmLayer(20, {
      radius: getStudyLayerRadius(2, 3, 'nested'),
      color: '#FF88C2',
      rotationOffset: 18,
      activeSteps: createEvenPulseMask(20, 5, 2),
      pitchHz: 356,
      gain: 0.09,
    }),
  ],
  playing: true,
  bpm: 90,
  soundEnabled: true,
  showInactiveSteps: true,
  showStepLabels: false,
  soundSettings: createPolyrhythmSoundSettings({
    palette: 'soft-synth',
    pitchMode: 'keyed',
    rootNote: 'D',
    scaleName: 'dorian',
    register: 'wide',
  }),
};

export const POLYRHYTHM_PRESETS: PolyrhythmStudyPreset[] = [
  {
    id: 'bo-diddley',
    name: 'Bo Diddley',
    description: 'A five-stroke cell built from the common 3-2 clave shape.',
    group: 'one-layer',
    study: BO_DIDDLEY_STUDY,
  },
  {
    id: 'cascara',
    name: 'Cascara',
    description: 'A shell-timbale timeline on one two-bar loop.',
    group: 'one-layer',
    study: CASCARA_STUDY,
  },
  {
    id: 'jazz-ride',
    name: 'Jazz Ride',
    description: 'The standard swing ride pattern on a 12-pulse frame.',
    group: 'one-layer',
    study: JAZZ_RIDE_STUDY,
  },
  {
    id: 'bembe',
    name: 'Bembe',
    description: 'A 12-pulse bell pattern with seven evenly recognizable hits.',
    group: 'one-layer',
    study: BEMBE_STUDY,
  },
  {
    id: 'bossa',
    name: 'Bossa',
    description: 'A five-stroke bossa line on one shared 16-step loop.',
    group: 'one-layer',
    study: BOSSA_STUDY,
  },
  {
    id: 'son-clave',
    name: 'Son Clave',
    description: 'The common 3-2 son clave on a two-bar frame.',
    group: 'one-layer',
    study: SON_CLAVE_STUDY,
  },
  {
    id: 'rumba-clave',
    name: 'Rumba Clave',
    description: 'The 3-2 rumba clave with the delayed third stroke.',
    group: 'one-layer',
    study: RUMBA_CLAVE_STUDY,
  },
  {
    id: 'two-three',
    name: '2:3',
    description: 'Two against three on one shared 12-step cycle.',
    group: 'two-layer',
    study: TWO_THREE_STUDY,
  },
  {
    id: 'three-four',
    name: '3:4',
    description: 'Three against four on one shared cycle.',
    group: 'two-layer',
    study: THREE_FOUR_STUDY,
  },
  {
    id: 'three-five',
    name: '3:5',
    description: 'Three against five on one shared 15-step cycle.',
    group: 'two-layer',
    study: THREE_FIVE_STUDY,
  },
  {
    id: 'four-five',
    name: '4:5',
    description: 'Four against five on one shared 20-step frame.',
    group: 'two-layer',
    study: FOUR_FIVE_STUDY,
  },
  {
    id: 'five-six',
    name: '5:6',
    description: 'Five and six sharing the same 30-step cycle.',
    group: 'two-layer',
    study: FIVE_SIX_STUDY,
  },
  {
    id: 'five-eight',
    name: '5:8',
    description: 'Five against eight on one wider shared cycle.',
    group: 'two-layer',
    study: FIVE_EIGHT_STUDY,
  },
  {
    id: 'seven-eight',
    name: '7:8',
    description: 'Seven against eight on a wider shared cycle.',
    group: 'two-layer',
    study: SEVEN_EIGHT_STUDY,
  },
  {
    id: 'triple-grid',
    name: '3·4·6 Grid',
    description: 'Three pulse families sharing one 12-step cycle.',
    group: 'advanced',
    study: TRIPLE_GRID_STUDY,
  },
  {
    id: 'three-five-six',
    name: '3·5·6 Cycle',
    description: 'Three overlapping layers on one readable 30-step frame.',
    group: 'advanced',
    study: THREE_FIVE_SIX_STUDY,
  },
  {
    id: 'four-five-ten',
    name: '4·5·10 Mesh',
    description: 'Four, five, and ten sharing one 20-step frame.',
    group: 'advanced',
    study: FOUR_FIVE_TEN_STUDY,
  },
  {
    id: 'nested-three-five',
    name: 'Nested 3:5',
    description: 'The same 3:5 family repeated through denser inner rings.',
    group: 'advanced',
    study: NESTED_THREE_FIVE_STUDY,
  },
  {
    id: 'counter-mesh',
    name: '5·8·10 Mesh',
    description: 'Three related layers on a wider 40-step frame.',
    group: 'advanced',
    study: COUNTER_MESH_STUDY,
  },
  {
    id: 'rotating-weave',
    name: 'Rotating Weave',
    description: 'Three masks with light offsets for a more advanced layered study.',
    group: 'advanced',
    study: ROTATING_WEAVE_STUDY,
  },
];

export function createDefaultPolyrhythmStudy(): PolyrhythmStudy {
  return cloneStudy(THREE_FIVE_STUDY);
}
