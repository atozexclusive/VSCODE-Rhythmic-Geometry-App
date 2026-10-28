import type { RootNote, ScaleName } from './audioEngine';

const TAU = Math.PI * 2;

export type PolyrhythmSoundPalette =
  | 'study-pulse'
  | 'wood'
  | 'soft-synth'
  | 'chorus-keys'
  | 'bright-marker'
  | 'chime'
  | 'warm-synth'
  | 'meditation-pad'
  | 'crystal-bell'
  | 'ambient-bloom';
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
  octaveShift: -1 | 0 | 1;
  reverbAmount: number;
}

export interface PolyrhythmLayer {
  id: string;
  beatCount: number;
  activeSteps: boolean[];
  accents: boolean[];
  radius: number;
  rotationOffset: number; // degrees
  color: string;
  soundEnabled: boolean;
  pitchHz: number;
  gain: number;
}

export interface PolyrhythmStudyCell {
  id: string;
  name: string;
  bars: number;
  layers: PolyrhythmLayer[];
}

export interface PolyrhythmStudyPhrase {
  id: string;
  cellId: string;
  bars: number;
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
  showInnerNumbers?: boolean;
  barMarkerSoundEnabled?: boolean;
  barMarkerVisualEnabled?: boolean;
  soundSettings: PolyrhythmSoundSettings;
  chainEnabled?: boolean;
  chainCells?: PolyrhythmStudyCell[];
  chainPhrases?: PolyrhythmStudyPhrase[];
}

export interface PolyrhythmStudyPreset {
  id: string;
  name: string;
  description: string;
  group: PolyrhythmPresetGroup;
  pro?: boolean;
  study: PolyrhythmStudy;
}

export interface PolyrhythmStepPoint {
  index: number;
  active: boolean;
  accented: boolean;
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
  return clamp(Math.round(beatCount || 0), 2, 64);
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
  const rawPalette = settings?.palette as PolyrhythmSoundPalette | 'glass-tick' | 'soft-piano' | undefined;
  const normalizedPalette =
    rawPalette === 'glass-tick'
      ? 'bright-marker'
      : rawPalette === 'soft-piano'
        ? 'meditation-pad'
      : rawPalette;
  return {
    palette:
      normalizedPalette && [
        'study-pulse',
        'wood',
        'soft-synth',
        'chorus-keys',
        'bright-marker',
        'chime',
        'warm-synth',
        'meditation-pad',
        'crystal-bell',
        'ambient-bloom',
      ].includes(normalizedPalette)
        ? normalizedPalette
        : 'study-pulse',
    pitchMode: settings?.pitchMode === 'keyed' ? 'keyed' : 'free',
    rootNote: settings?.rootNote ?? 'C',
    scaleName: settings?.scaleName ?? 'majorPentatonic',
    register: settings?.register === 'wide' ? 'wide' : 'tight',
    octaveShift: settings?.octaveShift === -1 || settings?.octaveShift === 1
      ? settings.octaveShift
      : 0,
    reverbAmount: Math.max(0, Math.min(1, settings?.reverbAmount ?? 0)),
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
      ? (['study-pulse', 'wood', 'soft-synth', 'bright-marker', 'chime', 'warm-synth', 'crystal-bell'] as const)
      : intensity === 'remix'
        ? (['study-pulse', 'wood', 'soft-synth'] as const)
        : (['study-pulse', 'wood', 'soft-synth', 'chime', 'warm-synth'] as const);
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
    octaveShift: current?.octaveShift ?? 0,
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

function normalizeAccents(accents: boolean[] | undefined, activeSteps: boolean[], beatCount: number): boolean[] {
  const normalizedBeatCount = normalizeBeatCount(beatCount);
  return Array.from(
    { length: normalizedBeatCount },
    (_, index) => Boolean(accents?.[index]) && Boolean(activeSteps[index]),
  );
}

function resizeActiveSteps(activeSteps: boolean[], nextBeatCount: number): boolean[] {
  return Array.from({ length: nextBeatCount }, (_, index) =>
    index < activeSteps.length ? Boolean(activeSteps[index]) : true,
  );
}

function resizeAccents(accents: boolean[] | undefined, activeSteps: boolean[], nextBeatCount: number): boolean[] {
  return Array.from(
    { length: nextBeatCount },
    (_, index) => index < (accents?.length ?? 0) && Boolean(accents?.[index]) && Boolean(activeSteps[index]),
  );
}

export function createPolyrhythmLayer(
  beatCount: number,
  overrides: Partial<Omit<PolyrhythmLayer, 'id' | 'beatCount' | 'activeSteps' | 'accents'>> & {
    activeSteps?: boolean[];
    accents?: boolean[];
  } = {},
): PolyrhythmLayer {
  const normalizedBeatCount = normalizeBeatCount(beatCount);
  const activeSteps = normalizeActiveSteps(
    overrides.activeSteps ?? createEvenPulseMask(normalizedBeatCount, Math.max(2, Math.round(normalizedBeatCount / 3))),
    normalizedBeatCount,
  );
  return {
    id: generateStudyId(),
    beatCount: normalizedBeatCount,
    activeSteps,
    accents: normalizeAccents(overrides.accents, activeSteps, normalizedBeatCount),
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

function lcm(a: number, b: number): number {
  const x = Math.max(1, Math.abs(Math.round(a)));
  const y = Math.max(1, Math.abs(Math.round(b)));
  return Math.min(10000, Math.floor((x / gcd(x, y)) * y));
}

export function getSharedCycleStepCount(layers: readonly Pick<PolyrhythmLayer, 'beatCount'>[]): number {
  const counts = layers
    .map((layer) => normalizeBeatCount(layer.beatCount))
    .filter((count) => count > 0);

  if (counts.length === 0) {
    return 1;
  }

  return counts.reduce((sharedCount, count) => lcm(sharedCount, count), counts[0] ?? 1);
}

export function toggleLayerStep(layer: PolyrhythmLayer, index: number): PolyrhythmLayer {
  const nextActiveSteps = layer.activeSteps.map((step, stepIndex) =>
    stepIndex === index ? !step : step,
  );
  return {
    ...layer,
    activeSteps: nextActiveSteps,
    accents: Array.from({ length: layer.beatCount }, (_, stepIndex) =>
      Boolean(nextActiveSteps[stepIndex]) && Boolean(layer.accents?.[stepIndex]),
    ),
  };
}

export function toggleLayerStepAccent(layer: PolyrhythmLayer, index: number): PolyrhythmLayer {
  const nextActiveSteps = Array.from(
    { length: layer.beatCount },
    (_, stepIndex) => Boolean(layer.activeSteps[stepIndex]) || stepIndex === index,
  );
  return {
    ...layer,
    activeSteps: nextActiveSteps,
    accents: Array.from({ length: layer.beatCount }, (_, stepIndex) =>
      stepIndex === index
        ? !Boolean(layer.accents?.[stepIndex])
        : Boolean(nextActiveSteps[stepIndex]) && Boolean(layer.accents?.[stepIndex]),
    ),
  };
}

export function updateLayerBeatCount(
  layer: PolyrhythmLayer,
  beatCount: number,
): PolyrhythmLayer {
  const normalizedBeatCount = normalizeBeatCount(beatCount);
  const activeSteps = resizeActiveSteps(layer.activeSteps, normalizedBeatCount);
  return {
    ...layer,
    beatCount: normalizedBeatCount,
    activeSteps,
    accents: resizeAccents(layer.accents, activeSteps, normalizedBeatCount),
  };
}

export function rotateLayer(
  layer: PolyrhythmLayer,
  stepOffset: number,
): PolyrhythmLayer {
  const nextActiveSteps = Array.from({ length: layer.beatCount }, () => false);
  const nextAccents = Array.from({ length: layer.beatCount }, () => false);

  layer.activeSteps.forEach((active, index) => {
    if (!active) {
      return;
    }
    const nextIndex = (index + stepOffset + layer.beatCount) % layer.beatCount;
    nextActiveSteps[nextIndex] = true;
    nextAccents[nextIndex] = Boolean(layer.accents?.[index]);
  });

  return {
    ...layer,
    activeSteps: nextActiveSteps,
    accents: nextAccents,
  };
}

export function invertLayerSteps(layer: PolyrhythmLayer): PolyrhythmLayer {
  const activeSteps = Array.from({ length: layer.beatCount }, (_, index) => !Boolean(layer.activeSteps[index]));
  return {
    ...layer,
    activeSteps,
    accents: Array.from({ length: layer.beatCount }, () => false),
  };
}

export function mirrorLayerSteps(layer: PolyrhythmLayer): PolyrhythmLayer {
  return {
    ...layer,
    activeSteps: [...layer.activeSteps].reverse(),
    accents: [...layer.accents].reverse(),
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
      accented: Boolean(layer.accents?.[index]) && Boolean(layer.activeSteps[index]),
      angle,
      x: centerX + Math.cos(angle) * layer.radius * scale,
      y: centerY + Math.sin(angle) * layer.radius * scale,
    };
  });
}

export function getSharedGridStepState(
  layers: readonly PolyrhythmLayer[],
  gridIndex: number,
  sharedStepCount: number,
  selectedLayerId?: string | null,
): { editable: boolean; active: boolean; color?: string } {
  const matches = layers.flatMap((layer) => {
    const position = (gridIndex / Math.max(1, sharedStepCount) - normalizeRotationOffset(layer.rotationOffset) / 360) * layer.beatCount;
    const nearest = Math.round(position);
    if (Math.abs(position - nearest) > 0.000001) return [];
    const stepIndex = ((nearest % layer.beatCount) + layer.beatCount) % layer.beatCount;
    return [{ layer, active: Boolean(layer.activeSteps[stepIndex]) }];
  });
  const active = matches.filter((match) => match.active);
  const emphasized = active.find((match) => match.layer.id === selectedLayerId)
    ?? active[0] ?? matches.find((match) => match.layer.id === selectedLayerId) ?? matches[0];
  return { editable: matches.length > 0, active: active.length > 0, color: emphasized?.layer.color };
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
  const cellIdMap = new Map<string, string>();
  const chainCells = study.chainCells?.map((cell) => {
    const nextId = generateStudyId();
    cellIdMap.set(cell.id, nextId);
    return {
      ...cell,
      id: nextId,
      bars: clamp(Math.round(cell.bars || 1), 1, 64),
      layers: cell.layers.map((layer) => ({
        ...layer,
        id: generateStudyId(),
        activeSteps: [...layer.activeSteps],
        accents: normalizeAccents(layer.accents, layer.activeSteps, layer.beatCount),
      })),
    };
  });
  return {
    ...study,
    id: generateStudyId(),
    soundSettings: { ...study.soundSettings },
    layers: study.layers.map((layer) => ({
      ...layer,
      id: generateStudyId(),
      activeSteps: [...layer.activeSteps],
      accents: normalizeAccents(layer.accents, layer.activeSteps, layer.beatCount),
    })),
    chainCells,
    chainPhrases: study.chainPhrases?.map((phrase) => ({
      ...phrase,
      id: generateStudyId(),
      cellId: cellIdMap.get(phrase.cellId) ?? phrase.cellId,
      bars: clamp(Math.round(phrase.bars || 1), 1, 64),
    })),
  };
}

export function clonePolyrhythmLayers(
  layers: readonly PolyrhythmLayer[],
  regenerateIds = false,
): PolyrhythmLayer[] {
  return layers.map((layer) => ({
    ...layer,
    id: regenerateIds ? generateStudyId() : layer.id,
    activeSteps: [...layer.activeSteps],
    accents: normalizeAccents(layer.accents, layer.activeSteps, layer.beatCount),
  }));
}

export function createPolyrhythmStudyCell(
  layers: readonly PolyrhythmLayer[],
  name: string,
  bars = 1,
): PolyrhythmStudyCell {
  return {
    id: generateStudyId(),
    name,
    bars: clamp(Math.round(bars || 1), 1, 64),
    layers: clonePolyrhythmLayers(layers, true),
  };
}

export function createPolyrhythmStudyPhrase(
  cellId: string,
  bars = 1,
): PolyrhythmStudyPhrase {
  return {
    id: generateStudyId(),
    cellId,
    bars: clamp(Math.round(bars || 1), 1, 64),
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
  accentIndices?: number[];
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
        accents: createMaskFromIndices(beatCount, options.accentIndices ?? []),
        pitchHz: 214,
        gain: 0.13,
      }),
    ],
    playing: true,
    bpm: options.bpm,
    soundEnabled: true,
    showInactiveSteps: true,
    showStepLabels: options.showStepLabels ?? false,
    barMarkerSoundEnabled: false,
    barMarkerVisualEnabled: false,
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
  const layerCounts = options.activeCounts.map((count) => normalizeBeatCount(count));
  const rotationStepOffsets = options.rotationStepOffsets ?? [];
  const colors = options.colors ?? getStudyColors(layerCounts.length);
  const displayStyle = options.displayStyle ?? 'shared';
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    displayStyle,
    layers: layerCounts.map((layerCount, index) =>
      createPolyrhythmLayer(layerCount, {
        radius: getStudyLayerRadius(index, layerCounts.length, displayStyle),
        color: colors[index % colors.length],
        activeSteps: createEvenPulseMask(layerCount, layerCount),
        rotationOffset: stepOffsetToDegrees(layerCount, rotationStepOffsets[index] ?? 0),
        pitchHz: getLayerPitch(index, layerCounts.length),
        gain: getLayerGain(index),
      }),
    ),
    playing: true,
    bpm: options.bpm,
    soundEnabled: true,
    showInactiveSteps: true,
    showStepLabels: options.showStepLabels ?? false,
    barMarkerSoundEnabled: false,
    barMarkerVisualEnabled: false,
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

type StudyRandomApproach = 'full' | 'grid' | 'structured' | 'adventurous' | 'chaos';

function chooseStudyRandomApproach(plus: boolean): StudyRandomApproach {
  const roll = Math.random();
  if (roll < (plus ? 0.25 : 0.35)) return 'full';
  if (roll < (plus ? 0.45 : 0.6)) return 'grid';
  if (roll < (plus ? 0.7 : 0.87)) return 'structured';
  if (roll < (plus ? 0.93 : 0.98)) return 'adventurous';
  return 'chaos';
}

function getStudyRandomLimits(plus: boolean, approach: StudyRandomApproach) {
  return {
    maxCount: approach === 'chaos' ? (plus ? 20 : 12) : plus ? 14 : 10,
    maxCycle: approach === 'grid' ? (plus ? 36 : 24) : approach === 'chaos' ? (plus ? 168 : 96) : plus ? 120 : 72,
    maxLayers: approach === 'chaos' ? (plus ? 5 : 3) : plus ? 4 : 3,
  };
}

function createProceduralRandomFamily(intensity: 'random' | 'plus', approach: StudyRandomApproach): PolyrhythmRandomFamily {
  const plus = intensity === 'plus';
  const limits = getStudyRandomLimits(plus, approach);
  const layerCount = approach === 'grid' ? 2
    : approach === 'chaos' ? (plus ? randomChoice([3, 4, 4, 5]) : 3)
    : plus ? randomChoice([2, 2, 3, 3, 3, 4]) : randomChoice([2, 2, 2, 3]);
  const grids = Array.from({ length: limits.maxCycle - 5 }, (_, index) => index + 6)
    .map((cycleSteps) => ({
      counts: Array.from({ length: limits.maxCount - 1 }, (_, index) => index + 2)
        .filter((count) => cycleSteps % count === 0),
    }))
    .filter((grid) => grid.counts.length >= layerCount);
  const activeCounts = shuffle(randomChoice(grids).counts).slice(0, layerCount).sort((a, b) => a - b);
  return {
    label: activeCounts.join(':'),
    cycleSteps: getSharedCycleStepCount(activeCounts.map((beatCount) => ({ beatCount }))),
    activeCounts,
    bpmRange: approach === 'grid' ? [58, 88] : approach === 'chaos' ? [64, 96] : plus ? [64, 108] : [66, 106],
  };
}

function buildRandomFamilyStudy(
  family: PolyrhythmRandomFamily,
  intensity: 'random' | 'plus',
  approach: StudyRandomApproach,
): PolyrhythmStudy {
  const plus = intensity === 'plus';
  const layerCount = family.activeCounts.length;
  const colors = shuffle([...POLYRHYTHM_LAYER_COLORS]).slice(0, layerCount);
  const displayStyle = plus && approach !== 'grid' && Math.random() < (approach === 'chaos' ? 0.45 : 0.2) ? 'nested' : 'shared';
  const descriptions: Record<StudyRandomApproach, string> = {
    full: 'A complete polyrhythm with every layer playing its full count.',
    grid: 'A complete polyrhythm with a quiet layer marking its shared cycle.',
    structured: 'An anchored study with balanced, evenly spaced patterns.',
    adventurous: 'A fresh variation with a little syncopation and a gentle phase shift.',
    chaos: 'An occasional adventurous stack with irregular patterns and shifting accents.',
  };
  const nextStudy = createSharedCycleStudy({
    id: generateStudyId(),
    name: `${plus ? 'Random+' : 'Random'} ${family.label}`,
    description: descriptions[approach],
    cycleSteps: family.cycleSteps,
    activeCounts: family.activeCounts,
    bpm: randomInt(family.bpmRange[0], family.bpmRange[1]),
    displayStyle,
    colors,
    soundSettings: createRandomPolyrhythmSoundSettings(intensity),
    showStepLabels: false,
  });
  const sharedCount = getSharedCycleStepCount(nextStudy.layers);
  const fullPattern = approach === 'full' || approach === 'grid';
  nextStudy.layers = nextStudy.layers.map((layer, index) => {
    const varyPattern = !fullPattern && layer.beatCount > 2
      && Math.random() < (approach === 'chaos' ? 0.9 : approach === 'adventurous' ? 0.7 : 0.5);
    const activeCount = varyPattern
      ? randomInt(Math.max(2, Math.ceil(layer.beatCount * (approach === 'chaos' ? 0.45 : 0.65))), layer.beatCount - 1)
      : layer.beatCount;
    const activeSteps = varyPattern
      ? approach === 'chaos' || (approach === 'adventurous' && Math.random() < 0.5)
        ? createExpressivePulseMask(layer.beatCount, activeCount, approach === 'chaos' ? 2 : 1)
        : createEvenPulseMask(layer.beatCount, activeCount)
      : layer.activeSteps;
    activeSteps[0] = true;
    const canShift = approach === 'chaos' ? index > 0 : approach === 'adventurous' && index === layerCount - 1;
    const phaseSteps = canShift && Math.random() < (plus ? 0.45 : 0.2)
      ? randomInt(1, approach === 'chaos' ? 2 : 1) : 0;
    const gridReference = approach === 'grid' && layer.beatCount === sharedCount;
    return {
      ...layer,
      activeSteps,
      accents: activeSteps.map((active, step) => active && (fullPattern ? step === 0 : Math.random() < (approach === 'chaos' ? 0.2 : 0.12))),
      rotationOffset: normalizeRotationOffset(phaseSteps / sharedCount * 360),
      gain: gridReference ? layer.gain * 0.35 : layer.gain,
    };
  });
  return nextStudy;
}

const recentRandomStudyFamilies: Record<'random' | 'plus', string[]> = { random: [], plus: [] };

export function createRandomPolyrhythmStudy(intensity: 'random' | 'plus' = 'random'): PolyrhythmStudy {
  const plus = intensity === 'plus';
  const approach = chooseStudyRandomApproach(plus);
  const limits = getStudyRandomLimits(plus, approach);
  const familiarFamilies = [...STANDARD_RANDOM_FAMILIES, ...CORE_TRIPLE_FAMILIES, ...(plus ? EXPLORATORY_RANDOM_FAMILIES : [])]
    .filter((family) => family.activeCounts.length <= (approach === 'grid' ? 2 : limits.maxLayers)
      && family.activeCounts.every((count) => count <= limits.maxCount)
      && getSharedCycleStepCount(family.activeCounts.map((beatCount) => ({ beatCount }))) <= limits.maxCycle);
  const recent = recentRandomStudyFamilies[intensity];
  let family: PolyrhythmRandomFamily;
  let signature: string;
  let attempts = 0;
  do {
    const picked = Math.random() < 0.55
      ? createProceduralRandomFamily(intensity, approach)
      : randomChoice(familiarFamilies);
    family = { ...picked, activeCounts: [...picked.activeCounts] };
    family.cycleSteps = getSharedCycleStepCount(family.activeCounts.map((beatCount) => ({ beatCount })));
    family.bpmRange = [family.bpmRange[0], Math.min(family.bpmRange[1], approach === 'chaos' ? 96 : plus ? 110 : 108)];
    if (approach === 'grid') {
      if (!family.activeCounts.includes(family.cycleSteps)) family.activeCounts.push(family.cycleSteps);
      family.bpmRange = [58, 88];
    }
    family.activeCounts.sort((a, b) => a - b);
    family.label = family.activeCounts.join(':');
    signature = family.label;
    attempts += 1;
  } while (recent.includes(signature) && attempts < 12);
  recent.push(signature);
  if (recent.length > 6) recent.shift();
  return buildRandomFamilyStudy(family, intensity, approach);
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
  activeIndices: [0, 2, 3, 5, 7, 8, 10, 12, 13, 15],
  accentIndices: [0, 3, 5, 8, 10, 13],
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
  activeIndices: [0, 2, 4, 5, 7, 9, 11],
  accentIndices: [0, 2, 4, 5, 7, 9, 11],
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
  description: 'Two nodes against three nodes.',
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
  description: 'Three nodes against four nodes.',
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

const THREE_FIVE_STUDY: PolyrhythmStudy = {
  id: 'three-five',
  name: '3:5',
  description: 'Three nodes against five nodes.',
  displayStyle: 'shared',
  layers: [
    createPolyrhythmLayer(3, {
      radius: getStudyLayerRadius(0, 2, 'shared'),
      color: '#72F1B8',
      activeSteps: createEvenPulseMask(3, 3),
      pitchHz: getLayerPitch(0, 2),
      gain: getLayerGain(0),
    }),
    createPolyrhythmLayer(5, {
      radius: getStudyLayerRadius(1, 2, 'shared'),
      color: '#7FD7FF',
      activeSteps: createEvenPulseMask(5, 5),
      pitchHz: getLayerPitch(1, 2),
      gain: getLayerGain(1),
    }),
  ],
  playing: true,
  bpm: 90,
  soundEnabled: true,
  showInactiveSteps: false,
  showStepLabels: false,
  soundSettings: createPolyrhythmSoundSettings({
    palette: 'study-pulse',
    pitchMode: 'free',
    register: 'tight',
  }),
};

const FOUR_FIVE_STUDY = createSharedCycleStudy({
  id: 'four-five',
  name: '4:5',
  description: 'Four nodes against five nodes.',
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
  description: 'Five nodes against six nodes.',
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
  description: 'Five nodes against eight nodes.',
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
  description: 'Seven nodes against eight nodes.',
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
  description: 'Three, four, and six nodes on the same shared grid.',
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
  description: 'Three, five, and six nodes resolving together.',
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
  description: 'Four, five, and ten nodes resolving together.',
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
  description: 'Five, eight, and ten nodes resolving together.',
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

const PRIME_MESH_STUDY = createSharedCycleStudy({
  id: 'prime-mesh',
  name: '5·7·11 Prime',
  description: 'Three prime layers that resolve after a long shared cycle.',
  cycleSteps: 385,
  activeCounts: [5, 7, 11],
  bpm: 86,
  displayStyle: 'shared',
  colors: ['#72F1B8', '#7FD7FF', '#FF88C2'],
  soundSettings: {
    palette: 'soft-synth',
    pitchMode: 'keyed',
    rootNote: 'F',
    scaleName: 'lydian',
    register: 'wide',
  },
  showStepLabels: false,
});

const EVEN_STACK_STUDY = createSharedCycleStudy({
  id: 'even-stack',
  name: '4·6·9·12 Stack',
  description: 'Four related layers with shared anchors and visible cross-locks.',
  cycleSteps: 36,
  activeCounts: [4, 6, 9, 12],
  bpm: 92,
  displayStyle: 'nested',
  colors: ['#72F1B8', '#7FD7FF', '#FFD166', '#FF88C2'],
  soundSettings: {
    palette: 'bright-marker',
    pitchMode: 'keyed',
    rootNote: 'C',
    scaleName: 'majorPentatonic',
    register: 'wide',
  },
  showStepLabels: false,
});

const SEVEN_NINE_TWELVE_STUDY = createSharedCycleStudy({
  id: 'seven-nine-twelve',
  name: '7·9·12 Field',
  description: 'A wider three-layer field where one odd layer keeps pulling the grid forward.',
  cycleSteps: 252,
  activeCounts: [7, 9, 12],
  bpm: 88,
  displayStyle: 'shared',
  colors: ['#B6A0FF', '#72F1B8', '#FFD166'],
  soundSettings: {
    palette: 'wood',
    pitchMode: 'keyed',
    rootNote: 'D',
    scaleName: 'dorian',
    register: 'wide',
  },
  showStepLabels: false,
});

const PRIME_TETRA_STUDY = createSharedCycleStudy({
  id: 'prime-tetra',
  name: '3·5·7·11 Tetra',
  description: 'Four prime layers for a dense long-resolution study.',
  cycleSteps: 1155,
  activeCounts: [3, 5, 7, 11],
  bpm: 84,
  displayStyle: 'nested',
  colors: ['#72F1B8', '#7FD7FF', '#FF88C2', '#FFD166'],
  soundSettings: {
    palette: 'soft-synth',
    pitchMode: 'keyed',
    rootNote: 'A',
    scaleName: 'aeolian',
    register: 'wide',
  },
  showStepLabels: false,
});

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
    id: 'rumba-clave',
    name: 'Rumba Clave',
    description: 'The 3-2 rumba clave with the delayed third stroke.',
    group: 'one-layer',
    study: RUMBA_CLAVE_STUDY,
  },
  {
    id: 'two-three',
    name: '2:3',
    description: 'Two nodes against three nodes.',
    group: 'two-layer',
    study: TWO_THREE_STUDY,
  },
  {
    id: 'three-four',
    name: '3:4',
    description: 'Three nodes against four nodes.',
    group: 'two-layer',
    study: THREE_FOUR_STUDY,
  },
  {
    id: 'three-five',
    name: '3:5',
    description: 'Three nodes against five nodes.',
    group: 'two-layer',
    study: THREE_FIVE_STUDY,
  },
  {
    id: 'four-five',
    name: '4:5',
    description: 'Four nodes against five nodes.',
    group: 'two-layer',
    study: FOUR_FIVE_STUDY,
  },
  {
    id: 'five-six',
    name: '5:6',
    description: 'Five nodes against six nodes.',
    group: 'two-layer',
    study: FIVE_SIX_STUDY,
  },
  {
    id: 'five-eight',
    name: '5:8',
    description: 'Five nodes against eight nodes.',
    group: 'two-layer',
    study: FIVE_EIGHT_STUDY,
  },
  {
    id: 'seven-eight',
    name: '7:8',
    description: 'Seven nodes against eight nodes.',
    group: 'two-layer',
    study: SEVEN_EIGHT_STUDY,
  },
  {
    id: 'triple-grid',
    name: '3·4·6 Grid',
    description: 'Three, four, and six nodes on one grid.',
    group: 'advanced',
    study: TRIPLE_GRID_STUDY,
  },
  {
    id: 'three-five-six',
    name: '3·5·6 Cycle',
    description: 'Three, five, and six nodes resolving together.',
    group: 'advanced',
    pro: true,
    study: THREE_FIVE_SIX_STUDY,
  },
  {
    id: 'four-five-ten',
    name: '4·5·10 Mesh',
    description: 'Four, five, and ten nodes resolving together.',
    group: 'advanced',
    pro: true,
    study: FOUR_FIVE_TEN_STUDY,
  },
  {
    id: 'nested-three-five',
    name: 'Nested 3:5',
    description: 'The same 3:5 family repeated through denser inner rings.',
    group: 'advanced',
    pro: true,
    study: NESTED_THREE_FIVE_STUDY,
  },
  {
    id: 'counter-mesh',
    name: '5·8·10 Mesh',
    description: 'Five, eight, and ten nodes resolving together.',
    group: 'advanced',
    pro: true,
    study: COUNTER_MESH_STUDY,
  },
  {
    id: 'rotating-weave',
    name: 'Rotating Weave',
    description: 'Three masks with light offsets for a more advanced layered study.',
    group: 'advanced',
    pro: true,
    study: ROTATING_WEAVE_STUDY,
  },
  {
    id: 'prime-mesh',
    name: '5·7·11 Prime',
    description: 'Three prime layers with a long shared resolution.',
    group: 'advanced',
    pro: true,
    study: PRIME_MESH_STUDY,
  },
  {
    id: 'even-stack',
    name: '4·6·9·12 Stack',
    description: 'Four related layers with shared anchors and cross-locks.',
    group: 'advanced',
    pro: true,
    study: EVEN_STACK_STUDY,
  },
  {
    id: 'seven-nine-twelve',
    name: '7·9·12 Field',
    description: 'A wider three-layer field with a long odd-cycle pull.',
    group: 'advanced',
    pro: true,
    study: SEVEN_NINE_TWELVE_STUDY,
  },
  {
    id: 'prime-tetra',
    name: '3·5·7·11 Tetra',
    description: 'Four prime layers for a dense long-resolution study.',
    group: 'advanced',
    pro: true,
    study: PRIME_TETRA_STUDY,
  },
];

export function createDefaultPolyrhythmStudy(): PolyrhythmStudy {
  return cloneStudy(THREE_FIVE_STUDY);
}
