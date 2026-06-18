import type { RootNote, ScaleName } from './audioEngine';

const TAU = Math.PI * 2;
export const RIFF_REFERENCE_TEMPO_MIN_BPM = 45;
export const RIFF_REFERENCE_TEMPO_MAX_BPM = 320;
export const RIFF_MAX_STEP_COUNT = 96;
export const RIFF_MAX_RESET_BARS = 128;

export type RiffCycleSubdivision = 8 | 12 | 16 | 20 | 32;
export type RiffCycleViewMode = 'circular' | 'unwrapped';
export type RiffCycleEmphasisMode = 'groove' | 'analysis';
export type LandingOverrideState = 'inherit' | 'rest' | 'on' | 'accent';
export type RiffCycleSoundPalette =
  | 'architectural'
  | 'deep-architectural'
  | 'muted-djent'
  | 'dry-synth'
  | 'metal-tick'
  | 'low-pulse';
export type RiffCyclePitchMode = 'free' | 'keyed';
export type RiffCycleRegister = 'low' | 'mid-low' | 'wide';
export type RiffCycleAccentPush = 'soft' | 'strong';
export type RiffBarMarkerInterval = 'none' | 'pattern' | 1 | 2 | 4 | 8;
export type RiffBackbeatBarInterval = 1 | 2 | 4;
export type RiffPhraseResetMode =
  | 'free'
  | 'per-bar'
  | 'every-2-bars'
  | 'every-4-bars'
  | 'every-8-bars'
  | 'every-16-bars'
  | 'every-32-bars'
  | 'custom-cycle';
export type RiffSequenceCellLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
export type RiffSequenceBarsMode = 'global' | 'per-cell';
export type RiffSequenceEntryDurationMode = 'patterns' | 'bars';
export const RIFF_MAX_SEQUENCE_REPEATS = 64;

export interface RiffCycleSoundSettings {
  palette: RiffCycleSoundPalette;
  pitchMode: RiffCyclePitchMode;
  rootNote: RootNote;
  scaleName: ScaleName;
  register: RiffCycleRegister;
  accentPush: RiffCycleAccentPush;
}

export interface ReferenceMeter {
  numerator: number;
  denominator: number;
  subdivision: RiffCycleSubdivision;
  bpm: number;
  barCountForDisplay: number;
  showBackbeat: boolean;
  backbeatBeat: number | null;
  backbeatBeats: number[];
  backbeatBarInterval: RiffBackbeatBarInterval;
  showDownbeats: boolean;
}

export interface RiffPhrase {
  id: string;
  name: string;
  stepCount: number;
  activeSteps: boolean[];
  accents: boolean[];
  rotationOffset: number;
  resetMode: RiffPhraseResetMode;
  resetBars: number;
  color: string;
  soundEnabled: boolean;
  pitchHz: number;
  gain: number;
  visible: boolean;
}

export interface RiffSequenceCell {
  id: string;
  label: RiffSequenceCellLabel;
  color: string;
  numerator: number;
  denominator: ReferenceMeter['denominator'];
  subdivision: RiffCycleSubdivision;
  backbeatBeat: number | null;
  backbeatBeats: number[];
  backbeatBarInterval: RiffBackbeatBarInterval;
  groups: number[];
  stepCount: number;
  activeSteps: boolean[];
  accents: boolean[];
}

export interface RiffCycleStudy {
  id: string;
  name: string;
  description: string;
  reference: ReferenceMeter;
  riff: RiffPhrase;
  riffSequenceEnabled: boolean;
  riffCells: RiffSequenceCell[];
  riffSequence: RiffSequenceCellLabel[];
  riffSequenceBars: number;
  riffSequenceBarsMode: RiffSequenceBarsMode;
  riffSequenceEntryBars: number[];
  riffSequenceEntryRepeats: number[];
  riffSequenceEntryDurationModes: RiffSequenceEntryDurationMode[];
  playing: boolean;
  soundEnabled: boolean;
  referenceSoundEnabled: boolean;
  backbeatSoundEnabled: boolean;
  subdivisionSoundEnabled: boolean;
  referenceGain: number;
  subdivisionGain: number;
  tailEditEnabled: boolean;
  tailLength: number;
  landingEditEnabled: boolean;
  landingLength: number;
  landingOverrides: LandingOverrideState[];
  showReferenceRing: boolean;
  showPhraseRing: boolean;
  showPhraseFill: boolean;
  showStepLabels: boolean;
  showAlignmentMarkers: boolean;
  showPhraseBounds: boolean;
  showStructureView: boolean;
  pulseLayerEnabled: boolean;
  pulseLayerGroupSize: number;
  pulseLayerSteps: boolean[];
  barMarkerInterval: RiffBarMarkerInterval;
  showDriftTrail: boolean;
  viewMode: RiffCycleViewMode;
  emphasisMode: RiffCycleEmphasisMode;
  soundSettings: RiffCycleSoundSettings;
}

export interface RiffCyclePreset {
  id: string;
  name: string;
  description: string;
  pro?: boolean;
  study: RiffCycleStudy;
}

export interface RiffPhrasePoint {
  index: number;
  angle: number;
  active: boolean;
  accented: boolean;
  x: number;
  y: number;
}

export interface RiffSequenceTimelineEntry {
  cell: RiffSequenceCell;
  sequenceIndex: number;
  startStep: number;
  endStep: number;
  barCount: number | null;
  repeatCount: number;
  durationMode: RiffSequenceEntryDurationMode;
}

export interface RiffSequencePlaybackState extends RiffSequenceTimelineEntry {
  localStep: number;
  localProgress: number;
  sequenceStep: number;
}

export const RIFF_SEQUENCE_CELL_LABELS: RiffSequenceCellLabel[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const RIFF_SEQUENCE_CELL_DEFAULT_COLORS = ['#FFD166', '#7FD7FF', '#FF88C2', '#72F1B8', '#B6A0FF', '#FFB86B', '#9BE7FF', '#C9A7FF'];

export const RIFF_CYCLE_COLORS = [
  '#72F1B8',
  '#FFD166',
  '#FF88C2',
  '#7FD7FF',
  '#FF7A7A',
  '#B6A0FF',
  '#9BE7FF',
  '#FFB86B',
  '#8EF0D0',
  '#C9A7FF',
  '#7CE7D6',
  '#F6A36B',
  '#9FE870',
  '#6FA8FF',
] as const;

function generateId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeSubdivision(value: number): RiffCycleSubdivision {
  if (value === 8 || value === 12 || value === 16 || value === 20 || value === 32) {
    return value;
  }
  return 16;
}

function normalizeBeatCount(value: number): number {
  return clamp(Math.round(value || 0), 3, RIFF_MAX_STEP_COUNT);
}

function normalizeCellStepCount(value: number): number {
  return clamp(Math.round(value || 0), 3, RIFF_MAX_STEP_COUNT);
}

function normalizeRotationOffset(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function normalizeBpm(value: number): number {
  return clamp(
    Math.round(value || 0),
    RIFF_REFERENCE_TEMPO_MIN_BPM,
    RIFF_REFERENCE_TEMPO_MAX_BPM,
  );
}

function normalizeGain(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0.12, 0.02, 0.32);
}

function normalizeCueGain(value: number, fallback: number): number {
  return clamp(Number.isFinite(value) ? value : fallback, 0, 0.18);
}

function normalizePitch(value: number): number {
  return clamp(Math.round(value || 0), 80, 1600);
}

function normalizeBars(value: number): number {
  return clamp(Math.round(value || 0), 1, RIFF_MAX_RESET_BARS);
}

function normalizeBackbeatBarInterval(value: number | undefined): RiffBackbeatBarInterval {
  return value === 2 || value === 4 ? value : 1;
}

function normalizeBackbeatBeats(
  beats: number[] | undefined,
  numerator: number,
  fallbackBeat: number | null | undefined,
): number[] {
  const normalizedNumerator = clamp(Math.round(numerator || 0), 2, 32);
  const source = beats && beats.length > 0 ? beats : fallbackBeat != null ? [fallbackBeat] : [Math.min(3, normalizedNumerator)];
  return Array.from(
    new Set(
      source
        .map((beat) => clamp(Math.round(beat || 0), 1, normalizedNumerator))
        .filter((beat) => Number.isFinite(beat)),
    ),
  ).sort((a, b) => a - b);
}

function normalizeTailLength(value: number, stepCount: number): number {
  return clamp(Math.round(value || 0), 1, normalizeBeatCount(stepCount));
}

function normalizeLandingLength(value: number, stepCount: number): number {
  return clamp(Math.round(value || 0), 1, Math.max(1, stepCount));
}

function normalizeLandingOverrides(
  overrides: LandingOverrideState[] | undefined,
  length: number,
): LandingOverrideState[] {
  return Array.from({ length }, (_, index) => {
    const value = overrides?.[index];
    return value === 'rest' || value === 'on' || value === 'accent' ? value : 'inherit';
  });
}

function normalizeRiffCycleSoundSettings(
  settings: Partial<RiffCycleSoundSettings> | undefined,
): RiffCycleSoundSettings {
  return {
    palette:
      settings?.palette && [
        'architectural',
        'deep-architectural',
        'muted-djent',
        'dry-synth',
        'metal-tick',
        'low-pulse',
      ].includes(settings.palette)
        ? settings.palette
        : 'architectural',
    pitchMode: settings?.pitchMode === 'keyed' ? 'keyed' : 'free',
    rootNote: settings?.rootNote ?? 'E',
    scaleName: settings?.scaleName ?? 'minorPentatonic',
    register:
      settings?.register === 'mid-low' || settings?.register === 'wide'
        ? settings.register
        : 'low',
    accentPush: settings?.accentPush === 'strong' ? 'strong' : 'soft',
  };
}

export function createRiffCycleSoundSettings(
  overrides: Partial<RiffCycleSoundSettings> = {},
): RiffCycleSoundSettings {
  return normalizeRiffCycleSoundSettings(overrides);
}

function normalizeSteps(mask: boolean[], stepCount: number): boolean[] {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  return Array.from({ length: normalizedStepCount }, (_, index) => Boolean(mask[index]));
}

function normalizeAccents(mask: boolean[], stepCount: number): boolean[] {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  return Array.from({ length: normalizedStepCount }, (_, index) => Boolean(mask[index]));
}

function normalizeCellAccents(mask: boolean[] | undefined, stepCount: number): boolean[] {
  const normalizedStepCount = normalizeCellStepCount(stepCount);
  return Array.from({ length: normalizedStepCount }, (_, index) => Boolean(mask?.[index]));
}

function normalizeCellActiveSteps(mask: boolean[] | undefined, stepCount: number): boolean[] {
  const normalizedStepCount = normalizeCellStepCount(stepCount);
  return Array.from({ length: normalizedStepCount }, (_, index) => Boolean(mask?.[index]));
}

function normalizeRiffCellGroups(groups: number[] | undefined, fallback: number[]): number[] {
  const source = groups && groups.length > 0 ? groups : fallback;
  const next: number[] = [];
  let total = 0;
  source.forEach((value) => {
    if (next.length >= 12 || total >= RIFF_MAX_STEP_COUNT) {
      return;
    }
    const normalized = clamp(Math.round(value || 0), 1, 32);
    if (total + normalized > RIFF_MAX_STEP_COUNT) {
      return;
    }
    next.push(normalized);
    total += normalized;
  });
  return next.length > 0 ? next : [4, 3, 3, 3];
}

function deriveGroupsFromMask(activeSteps: boolean[], stepCount: number): number[] {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  const activeIndices = activeSteps
    .map((active, index) => (active ? index : -1))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  if (activeIndices.length < 2) {
    return [normalizedStepCount];
  }

  return activeIndices.map((index, activeIndex) => {
    const nextIndex = activeIndices[(activeIndex + 1) % activeIndices.length];
    return nextIndex > index ? nextIndex - index : normalizedStepCount - index + nextIndex;
  });
}

export function formatRiffCellGroups(groups: number[]): string {
  return groups.join('-');
}

export function parseRiffCellGroups(value: string): number[] | null {
  const parts = value
    .trim()
    .split(/[\s,;|+-]+/)
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 12) {
    return null;
  }
  const groups = parts.map((part) => Number.parseInt(part, 10));
  if (groups.some((group) => !Number.isFinite(group) || group < 1 || group > 32)) {
    return null;
  }
  const total = groups.reduce((sum, group) => sum + group, 0);
  if (total < 1 || total > RIFF_MAX_STEP_COUNT) {
    return null;
  }
  return groups;
}

function buildCellMaskFromGroups(groups: number[]): {
  stepCount: number;
  activeSteps: boolean[];
  accents: boolean[];
} {
  const normalizedGroups = normalizeRiffCellGroups(groups, [4, 3, 3, 3]);
  const stepCount = normalizeCellStepCount(
    normalizedGroups.reduce((sum, group) => sum + group, 0),
  );
  const activeSteps = Array.from({ length: stepCount }, () => false);
  const accents = Array.from({ length: stepCount }, () => false);
  let cursor = 0;
  normalizedGroups.forEach((_group, index) => {
    activeSteps[cursor] = true;
    accents[cursor] = index === 0;
    cursor += _group;
  });
  return { stepCount, activeSteps, accents };
}

export function getRiffSequenceCellDefaultColor(label: RiffSequenceCellLabel): string {
  const colorIndex = Math.max(0, RIFF_SEQUENCE_CELL_LABELS.indexOf(label)) % RIFF_SEQUENCE_CELL_DEFAULT_COLORS.length;
  return RIFF_SEQUENCE_CELL_DEFAULT_COLORS[colorIndex] ?? '#FFD166';
}

function normalizeRiffColor(color: string | undefined, fallback: string): string {
  const value = typeof color === 'string' ? color.trim() : '';
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export function createRiffSequenceCell(
  label: RiffSequenceCellLabel,
  groups: number[],
  overrides: Partial<Omit<RiffSequenceCell, 'id' | 'label' | 'groups' | 'stepCount' | 'activeSteps' | 'accents'>> & {
    id?: string;
    activeSteps?: boolean[];
    accents?: boolean[];
  } = {},
): RiffSequenceCell {
  const normalizedGroups = normalizeRiffCellGroups(groups, [4, 3, 3, 3]);
  const mask = buildCellMaskFromGroups(normalizedGroups);
  const activeSteps = normalizeCellActiveSteps(overrides.activeSteps ?? mask.activeSteps, mask.stepCount);
  const accents = normalizeCellAccents(overrides.accents ?? mask.accents, mask.stepCount);
  const numerator = clamp(Math.round(overrides.numerator ?? 4), 2, 32);
  const backbeatBeats = normalizeBackbeatBeats(
    overrides.backbeatBeats,
    numerator,
    overrides.backbeatBeat ?? Math.min(numerator, numerator >= 4 ? 3 : 2),
  );
  return {
    id: overrides.id ?? generateId(`riff-cell-${label.toLowerCase()}`),
    label,
    color: normalizeRiffColor(overrides.color, getRiffSequenceCellDefaultColor(label)),
    numerator,
    denominator: overrides.denominator === 8 ? 8 : 4,
    subdivision: normalizeSubdivision(overrides.subdivision ?? 16),
    backbeatBeat: backbeatBeats[0] ?? null,
    backbeatBeats,
    backbeatBarInterval: normalizeBackbeatBarInterval(overrides.backbeatBarInterval),
    groups: deriveGroupsFromMask(activeSteps, mask.stepCount),
    stepCount: mask.stepCount,
    activeSteps,
    accents,
  };
}

function createRiffSequenceCellFromState(
  label: RiffSequenceCellLabel,
  stepCount: number,
  activeSteps: boolean[] | undefined,
  accents: boolean[] | undefined,
  id?: string,
  color?: string,
  timing?: Partial<Pick<RiffSequenceCell, 'numerator' | 'denominator' | 'subdivision' | 'backbeatBeat' | 'backbeatBeats' | 'backbeatBarInterval'>>,
): RiffSequenceCell {
  const normalizedStepCount = normalizeCellStepCount(stepCount);
  const normalizedActiveSteps = normalizeCellActiveSteps(activeSteps, normalizedStepCount);
  const numerator = clamp(Math.round(timing?.numerator ?? 4), 2, 32);
  const backbeatBeats = normalizeBackbeatBeats(
    timing?.backbeatBeats,
    numerator,
    timing?.backbeatBeat ?? Math.min(numerator, numerator >= 4 ? 3 : 2),
  );
  return {
    id: id ?? generateId(`riff-cell-${label.toLowerCase()}`),
    label,
    color: normalizeRiffColor(color, getRiffSequenceCellDefaultColor(label)),
    numerator,
    denominator: timing?.denominator === 8 ? 8 : 4,
    subdivision: normalizeSubdivision(timing?.subdivision ?? 16),
    backbeatBeat: backbeatBeats[0] ?? null,
    backbeatBeats,
    backbeatBarInterval: normalizeBackbeatBarInterval(timing?.backbeatBarInterval),
    groups: deriveGroupsFromMask(normalizedActiveSteps, normalizedStepCount),
    stepCount: normalizedStepCount,
    activeSteps: normalizedActiveSteps,
    accents: normalizeCellAccents(accents, normalizedStepCount),
  };
}

function createDefaultRiffSequenceCells(riff: RiffPhrase): RiffSequenceCell[] {
  return [
    createRiffSequenceCellFromState('A', riff.stepCount, riff.activeSteps, riff.accents, undefined, riff.color),
  ];
}

function getRiffCellTiming(cell: RiffSequenceCell): Pick<RiffSequenceCell, 'numerator' | 'denominator' | 'subdivision' | 'backbeatBeat' | 'backbeatBeats' | 'backbeatBarInterval'> {
  return {
    numerator: cell.numerator,
    denominator: cell.denominator,
    subdivision: cell.subdivision,
    backbeatBeat: cell.backbeatBeat,
    backbeatBeats: cell.backbeatBeats,
    backbeatBarInterval: cell.backbeatBarInterval,
  };
}

function normalizeRiffSequenceCells(
  cells: RiffSequenceCell[] | undefined,
  riff: RiffPhrase,
): RiffSequenceCell[] {
  const fallbackCells = createDefaultRiffSequenceCells(riff);
  const source = cells && cells.length > 0 ? cells : fallbackCells;
  const usedLabels = new Set<RiffSequenceCellLabel>();
  const normalizedCells: RiffSequenceCell[] = [];

  source.forEach((sourceCell, index) => {
    if (normalizedCells.length >= RIFF_SEQUENCE_CELL_LABELS.length) {
      return;
    }
    const sourceLabel = RIFF_SEQUENCE_CELL_LABELS.includes(sourceCell?.label)
      ? sourceCell.label
      : undefined;
    const fallbackLabel = RIFF_SEQUENCE_CELL_LABELS.find((label) => !usedLabels.has(label));
    const label = sourceLabel && !usedLabels.has(sourceLabel) ? sourceLabel : fallbackLabel;
    if (!label) {
      return;
    }

    const fallbackCell = fallbackCells[0];
    const groupStepCount = normalizeRiffCellGroups(sourceCell?.groups, fallbackCell.groups).reduce(
      (sum, group) => sum + group,
      0,
    );
    const stepCount = normalizeCellStepCount(
      sourceCell?.stepCount ?? sourceCell?.activeSteps?.length ?? groupStepCount,
    );
    const cellFromGroups =
      sourceCell?.activeSteps && sourceCell.activeSteps.length > 0
        ? null
        : buildCellMaskFromGroups(normalizeRiffCellGroups(sourceCell?.groups, fallbackCell.groups));
    normalizedCells.push(
      createRiffSequenceCellFromState(
        label,
        cellFromGroups?.stepCount ?? stepCount,
        sourceCell?.activeSteps && sourceCell.activeSteps.length > 0
          ? sourceCell.activeSteps
          : cellFromGroups?.activeSteps ?? fallbackCell.activeSteps,
        sourceCell?.accents && sourceCell.accents.length > 0
          ? sourceCell.accents
          : cellFromGroups?.accents ?? fallbackCell.accents,
        sourceCell?.id,
        normalizeRiffColor(sourceCell?.color, getRiffSequenceCellDefaultColor(label)),
        {
          numerator: sourceCell?.numerator,
          denominator: sourceCell?.denominator,
          subdivision: sourceCell?.subdivision,
          backbeatBeat: sourceCell?.backbeatBeat,
          backbeatBeats: sourceCell?.backbeatBeats,
          backbeatBarInterval: sourceCell?.backbeatBarInterval,
        },
      ),
    );
    usedLabels.add(label);
  });

  return normalizedCells.length > 0 ? normalizedCells : fallbackCells;
}

function normalizeRiffSequenceOrder(
  sequence: RiffSequenceCellLabel[] | undefined,
  cells: RiffSequenceCell[],
): RiffSequenceCellLabel[] {
  const validLabels = new Set(cells.map((cell) => cell.label));
  const fallbackLabel = cells[0]?.label ?? 'A';
  const source = sequence && sequence.length > 0 ? sequence : [fallbackLabel];
  const next = source
    .map((label) => label.toUpperCase() as RiffSequenceCellLabel)
    .filter((label) => validLabels.has(label))
    .slice(0, 24);
  return next.length > 0 ? next : [fallbackLabel];
}

function normalizePulseLayerGroupSize(value: number | undefined): number {
  return Math.max(1, Math.min(64, Math.round(value ?? 5)));
}

function normalizePulseLayerSteps(
  steps: boolean[] | undefined,
  groupSize: number,
): boolean[] {
  return Array.from({ length: groupSize }, (_, index) => steps?.[index] ?? true);
}

function normalizeRiffSequenceBarsMode(mode: RiffSequenceBarsMode | undefined): RiffSequenceBarsMode {
  return mode === 'per-cell' ? 'per-cell' : 'global';
}

function normalizeRiffSequenceEntryBars(
  entryBars: number[] | undefined,
  sequence: RiffSequenceCellLabel[],
  fallbackBars: number,
): number[] {
  return sequence.map((_, index) => normalizeBars(entryBars?.[index] ?? fallbackBars));
}

function normalizeRiffSequenceEntryRepeats(
  entryRepeats: number[] | undefined,
  sequence: RiffSequenceCellLabel[],
): number[] {
  return sequence.map((_, index) => clamp(Math.round(entryRepeats?.[index] ?? 1), 1, RIFF_MAX_SEQUENCE_REPEATS));
}

function normalizeRiffSequenceEntryDurationModes(
  entryModes: RiffSequenceEntryDurationMode[] | undefined,
  sequence: RiffSequenceCellLabel[],
): RiffSequenceEntryDurationMode[] {
  return sequence.map((_, index) => (entryModes?.[index] === 'bars' ? 'bars' : 'patterns'));
}

export function parseRiffSequenceOrder(value: string): RiffSequenceCellLabel[] | null {
  const normalized = value.trim().toUpperCase();
  const tokens = /[\s,;|>-]/.test(normalized)
    ? normalized.split(/[\s,;|>-]+/).filter(Boolean)
    : normalized.split('');
  if (tokens.length === 0 || tokens.length > 24) {
    return null;
  }
  const labels = tokens.map((token) => token[0] as RiffSequenceCellLabel);
  if (labels.some((label) => !RIFF_SEQUENCE_CELL_LABELS.includes(label))) {
    return null;
  }
  return labels;
}

export function formatRiffSequenceOrder(sequence: RiffSequenceCellLabel[]): string {
  return sequence.join(' ');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)] as T;
}

function createRandomRiffCellStepCount(reference: ReferenceMeter): number {
  const stepsPerBar = getReferenceStepsPerBar(reference);
  const roll = Math.random();
  if (roll < 0.75) {
    return randomInt(7, Math.min(20, RIFF_MAX_STEP_COUNT));
  }
  if (roll < 0.88) {
    return randomInt(3, 6);
  }
  const highAnchor = Math.max(21, Math.min(RIFF_MAX_STEP_COUNT, stepsPerBar + randomInt(-2, 6)));
  return randomChoice([
    randomInt(21, RIFF_MAX_STEP_COUNT),
    highAnchor,
  ]);
}

function chooseDifferent<T>(items: readonly T[], current: T): T {
  const filtered = items.filter((item) => item !== current);
  if (filtered.length === 0) {
    return current;
  }
  return randomChoice(filtered);
}

function createRandomRiffColor(current?: string, intensity: 'random' | 'remix' | 'plus' = 'random'): string {
  const families =
    intensity === 'plus'
      ? [...RIFF_CYCLE_COLORS]
      : RIFF_CYCLE_COLORS.filter((color) => color !== '#9FE870');
  if (!current) {
    return randomChoice(families);
  }
  return Math.random() < (intensity === 'remix' ? 0.45 : 0.2)
    ? current
    : chooseDifferent(families, current);
}

function createRandomRiffSoundSettings(
  intensity: 'random' | 'remix' | 'plus',
  current?: RiffCycleSoundSettings,
): RiffCycleSoundSettings {
  const rootPool: RootNote[] = ['E', 'F', 'F#', 'G', 'A', 'B', 'D'];
  const baseScales: ScaleName[] = ['minorPentatonic', 'aeolian', 'dorian'];
  const extendedScales: ScaleName[] = [...baseScales, 'diminished', 'wholeTone'];
  const palettePool =
    intensity === 'plus'
      ? (['deep-architectural', 'muted-djent', 'dry-synth', 'metal-tick', 'low-pulse'] as const)
      : intensity === 'remix'
        ? (['architectural', 'deep-architectural', 'muted-djent', 'dry-synth', 'metal-tick'] as const)
        : (['architectural', 'deep-architectural', 'muted-djent', 'dry-synth'] as const);
  const palette =
    current && intensity === 'remix' && Math.random() < 0.55
      ? current.palette
      : current
        ? chooseDifferent(palettePool, current.palette)
        : randomChoice(palettePool);
  const pitchMode =
    current && intensity === 'remix'
      ? Math.random() < 0.75
        ? current.pitchMode
        : current.pitchMode === 'free'
          ? 'keyed'
          : 'free'
      : intensity === 'plus'
        ? (Math.random() < 0.58 ? 'keyed' : 'free')
        : (Math.random() < 0.36 ? 'keyed' : 'free');
  const register =
    current && intensity === 'remix' && Math.random() < 0.7
      ? current.register
      : intensity === 'plus'
        ? randomChoice(['low', 'mid-low', 'wide'] as const)
        : randomChoice(['low', 'low', 'mid-low'] as const);
  const accentPush =
    intensity === 'plus'
      ? 'strong'
      : current && intensity === 'remix'
        ? (Math.random() < 0.7 ? current.accentPush : current.accentPush === 'soft' ? 'strong' : 'soft')
        : randomChoice(['soft', 'soft', 'strong'] as const);
  return createRiffCycleSoundSettings({
    palette,
    pitchMode,
    rootNote:
      current && intensity === 'remix' && Math.random() < 0.65
        ? current.rootNote
        : randomChoice(rootPool),
    scaleName:
      current && intensity === 'remix' && Math.random() < 0.65
        ? current.scaleName
        : randomChoice(intensity === 'plus' ? extendedScales : baseScales),
    register,
    accentPush,
  });
}

function createPhraseMask(stepCount: number, intensity: 'random' | 'remix' | 'plus'): {
  activeSteps: boolean[];
  accents: boolean[];
} {
  const grooveTemplates = [
    [0, 3, 6, 8, 11],
    [0, 4, 7, 10],
    [0, 3, 5, 8, 11],
    [0, 2, 5, 8, 10],
    [0, 4, 6, 9, 12],
    [0, 3, 7, 9, 12],
  ] as const;
  const template = randomChoice(grooveTemplates);
  const activeSteps = Array.from({ length: stepCount }, () => false);
  template.forEach((index) => {
    activeSteps[index % stepCount] = true;
  });
  const extraHits =
    intensity === 'plus' ? randomInt(1, Math.max(1, Math.floor(stepCount / 8))) : intensity === 'remix' ? randomInt(0, 2) : randomInt(0, 1);
  for (let hit = 0; hit < extraHits; hit += 1) {
    activeSteps[randomInt(0, stepCount - 1)] = true;
  }
  const accents = Array.from({ length: stepCount }, (_, index) => {
    if (!activeSteps[index]) {
      return false;
    }
    return index === 0 || index % 4 === 0 || (intensity === 'plus' && Math.random() < 0.12);
  });
  if (!accents.some(Boolean)) {
    const firstHit = activeSteps.findIndex(Boolean);
    if (firstHit >= 0) {
      accents[firstHit] = true;
    }
  }
  return { activeSteps, accents };
}

export function createEvenMask(stepCount: number, activeCount: number, offset = 0): boolean[] {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  const next = Array.from({ length: normalizedStepCount }, () => false);
  const normalizedActiveCount = clamp(Math.round(activeCount || 0), 0, normalizedStepCount);

  for (let index = 0; index < normalizedActiveCount; index += 1) {
    const stepIndex =
      (Math.floor((index * normalizedStepCount) / normalizedActiveCount) + offset) %
      normalizedStepCount;
    next[(stepIndex + normalizedStepCount) % normalizedStepCount] = true;
  }

  return next;
}

export function createReferenceMeter(
  overrides: Partial<ReferenceMeter> = {},
): ReferenceMeter {
  const numerator = clamp(Math.round(overrides.numerator ?? 4), 2, 32);
  const backbeatBeats = normalizeBackbeatBeats(
    overrides.backbeatBeats,
    numerator,
    overrides.backbeatBeat ?? 3,
  );
  return {
    numerator,
    denominator: overrides.denominator === 8 ? 8 : 4,
    subdivision: normalizeSubdivision(overrides.subdivision ?? 16),
    bpm: normalizeBpm(overrides.bpm ?? 112),
    barCountForDisplay: normalizeBars(overrides.barCountForDisplay ?? 4),
    showBackbeat: overrides.showBackbeat ?? true,
    backbeatBeat: backbeatBeats[0] ?? null,
    backbeatBeats,
    backbeatBarInterval: normalizeBackbeatBarInterval(overrides.backbeatBarInterval),
    showDownbeats: overrides.showDownbeats ?? true,
  };
}

export function createRiffPhrase(
  stepCount: number,
  overrides: Partial<Omit<RiffPhrase, 'id' | 'stepCount' | 'activeSteps' | 'accents'>> & {
    activeSteps?: boolean[];
    accents?: boolean[];
  } = {},
): RiffPhrase {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  return {
    id: generateId('riff'),
    name: overrides.name ?? `${normalizedStepCount}-step phrase`,
    stepCount: normalizedStepCount,
    activeSteps: normalizeSteps(
      overrides.activeSteps ?? createEvenMask(normalizedStepCount, Math.max(3, Math.floor(normalizedStepCount / 3))),
      normalizedStepCount,
    ),
    accents: normalizeAccents(overrides.accents ?? [], normalizedStepCount),
    rotationOffset: normalizeRotationOffset(overrides.rotationOffset ?? 0),
    resetMode: overrides.resetMode ?? 'every-4-bars',
    resetBars: normalizeBars(overrides.resetBars ?? 4),
    color: overrides.color ?? RIFF_CYCLE_COLORS[0],
    soundEnabled: overrides.soundEnabled ?? true,
    pitchHz: normalizePitch(overrides.pitchHz ?? 122),
    gain: normalizeGain(overrides.gain ?? 0.12),
    visible: overrides.visible ?? true,
  };
}

export function createRiffCycleStudy(
  overrides: Partial<RiffCycleStudy> = {},
): RiffCycleStudy {
  const riff = createRiffPhrase(overrides.riff?.stepCount ?? 17, overrides.riff);
  const reference = createReferenceMeter(overrides.reference);
  const riffCells = normalizeRiffSequenceCells(overrides.riffCells, riff);
  const riffSequence = normalizeRiffSequenceOrder(overrides.riffSequence, riffCells);
  const riffSequenceBars = normalizeBars(
    overrides.riffSequenceBars ?? getResetBarCount(riff) ?? reference.barCountForDisplay,
  );
  const pulseLayerGroupSize = normalizePulseLayerGroupSize(
    overrides.pulseLayerGroupSize ?? getReferenceStepsPerBar(reference),
  );
  const defaultLandingLength = normalizeLandingLength(
    overrides.landingLength ?? Math.min(4, getReferenceStepsPerBeat(reference) * 2),
    getReferenceStepsPerBar(reference),
  );
  return {
    id: overrides.id ?? generateId('riff-study'),
    name: overrides.name ?? 'Riff Cycle',
    description:
      overrides.description ??
      'A reference bar, a displaced phrase, and a controlled realignment.',
    reference,
    riff,
    riffSequenceEnabled: overrides.riffSequenceEnabled ?? false,
    riffCells,
    riffSequence,
    riffSequenceBars,
    riffSequenceBarsMode: normalizeRiffSequenceBarsMode(overrides.riffSequenceBarsMode),
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(
      overrides.riffSequenceEntryBars,
      riffSequence,
      riffSequenceBars,
    ),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(
      overrides.riffSequenceEntryRepeats,
      riffSequence,
    ),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(
      overrides.riffSequenceEntryDurationModes,
      riffSequence,
    ),
    playing: overrides.playing ?? false,
    soundEnabled: overrides.soundEnabled ?? true,
    referenceSoundEnabled: overrides.referenceSoundEnabled ?? true,
    backbeatSoundEnabled: overrides.backbeatSoundEnabled ?? true,
    subdivisionSoundEnabled: overrides.subdivisionSoundEnabled ?? false,
    referenceGain: normalizeCueGain(overrides.referenceGain ?? 0.055, 0.055),
    subdivisionGain: normalizeCueGain(overrides.subdivisionGain ?? 0.014, 0.014),
    tailEditEnabled: overrides.tailEditEnabled ?? false,
    tailLength: normalizeTailLength(overrides.tailLength ?? 4, riff.stepCount),
    landingEditEnabled: overrides.landingEditEnabled ?? false,
    landingLength: defaultLandingLength,
    landingOverrides: normalizeLandingOverrides(
      overrides.landingOverrides,
      defaultLandingLength,
    ),
    showReferenceRing: overrides.showReferenceRing ?? true,
    showPhraseRing: overrides.showPhraseRing ?? true,
    showPhraseFill: overrides.showPhraseFill ?? true,
    showStepLabels: overrides.showStepLabels ?? true,
    showAlignmentMarkers: overrides.showAlignmentMarkers ?? true,
    showPhraseBounds: overrides.showPhraseBounds ?? false,
    showStructureView: overrides.showStructureView ?? false,
    pulseLayerEnabled: overrides.pulseLayerEnabled ?? false,
    pulseLayerGroupSize,
    pulseLayerSteps: normalizePulseLayerSteps(overrides.pulseLayerSteps, pulseLayerGroupSize),
    barMarkerInterval:
      overrides.barMarkerInterval === 'none' ||
      overrides.barMarkerInterval === 'pattern' ||
      overrides.barMarkerInterval === 1 ||
      overrides.barMarkerInterval === 2 ||
      overrides.barMarkerInterval === 4 ||
      overrides.barMarkerInterval === 8
        ? overrides.barMarkerInterval
        : 'none',
    showDriftTrail: overrides.showDriftTrail ?? true,
    viewMode: overrides.viewMode ?? 'unwrapped',
    emphasisMode: overrides.emphasisMode ?? 'analysis',
    soundSettings: createRiffCycleSoundSettings(overrides.soundSettings),
  };
}

export function cloneRiffCycleStudy(study: RiffCycleStudy): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const riffSequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  const riffSequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  const pulseLayerGroupSize = normalizePulseLayerGroupSize(
    study.pulseLayerGroupSize ?? getReferenceStepsPerBar(study.reference),
  );
  return {
    ...study,
    reference: { ...study.reference },
    riff: {
      ...study.riff,
      activeSteps: [...study.riff.activeSteps],
      accents: [...study.riff.accents],
    },
    riffSequenceEnabled: Boolean(study.riffSequenceEnabled),
    riffCells: riffCells.map((cell) => ({
      ...cell,
      groups: [...cell.groups],
      activeSteps: [...cell.activeSteps],
      accents: [...cell.accents],
    })),
    riffSequence,
    riffSequenceBars,
    riffSequenceBarsMode: normalizeRiffSequenceBarsMode(study.riffSequenceBarsMode),
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(
      study.riffSequenceEntryBars,
      riffSequence,
      riffSequenceBars,
    ),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(
      study.riffSequenceEntryRepeats,
      riffSequence,
    ),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(
      study.riffSequenceEntryDurationModes,
      riffSequence,
    ),
    showPhraseFill: study.showPhraseFill ?? true,
    subdivisionSoundEnabled: Boolean(study.subdivisionSoundEnabled),
    referenceGain: normalizeCueGain(study.referenceGain ?? 0.055, 0.055),
    subdivisionGain: normalizeCueGain(study.subdivisionGain ?? 0.014, 0.014),
    pulseLayerEnabled: Boolean(study.pulseLayerEnabled),
    pulseLayerGroupSize,
    pulseLayerSteps: normalizePulseLayerSteps(study.pulseLayerSteps, pulseLayerGroupSize),
    soundSettings: { ...study.soundSettings },
    landingOverrides: [...study.landingOverrides],
  };
}

export function getReferenceStepsPerBeat(reference: ReferenceMeter): number {
  return Math.max(1, Math.round(reference.subdivision / reference.denominator));
}

export function getReferenceStepsPerSecond(reference: ReferenceMeter): number {
  const tempoDenominator = reference.denominator === 8 ? 4 : reference.denominator;
  return Math.max(0.01, (reference.bpm / 60) * (reference.subdivision / tempoDenominator));
}

export function getReferenceStepsPerBar(reference: ReferenceMeter): number {
  return reference.numerator * getReferenceStepsPerBeat(reference);
}

export function getDisplayStepCount(study: RiffCycleStudy): number {
  return getReferenceStepsPerBar(study.reference) * study.reference.barCountForDisplay;
}

export function getResetBarCount(riff: RiffPhrase): number | null {
  switch (riff.resetMode) {
    case 'free':
      return null;
    case 'per-bar':
      return 1;
    case 'every-2-bars':
      return 2;
    case 'every-4-bars':
      return 4;
    case 'every-8-bars':
      return 8;
    case 'every-16-bars':
      return 16;
    case 'every-32-bars':
      return 32;
    case 'custom-cycle':
      return normalizeBars(riff.resetBars);
    default:
      return 4;
  }
}

export function getEffectiveResetBarCount(study: RiffCycleStudy): number | null {
  if (study.riffSequenceEnabled) {
    const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
    const cells = normalizeRiffSequenceCells(study.riffCells, study.riff);
    const sequence = normalizeRiffSequenceOrder(study.riffSequence, cells);
    if (normalizeRiffSequenceBarsMode(study.riffSequenceBarsMode) === 'per-cell') {
      const totalSteps = getRiffSequenceTimeline(study).totalSteps;
      return totalSteps / Math.max(1, getReferenceStepsPerBar(study.reference));
    }
    return sequenceBars;
  }
  return getResetBarCount(study.riff);
}

export function getResetStepCount(study: RiffCycleStudy): number | null {
  if (study.riffSequenceEnabled && normalizeRiffSequenceBarsMode(study.riffSequenceBarsMode) === 'per-cell') {
    return Math.max(1, getRiffSequenceTimeline(study).totalSteps);
  }
  const resetBars = getEffectiveResetBarCount(study);
  if (resetBars == null) {
    return null;
  }
  return getReferenceStepsPerBar(study.reference) * resetBars;
}

export function getRiffSequenceTimeline(study: RiffCycleStudy): {
  entries: RiffSequenceTimelineEntry[];
  totalSteps: number;
} {
  const cells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, cells);
  const barsMode = normalizeRiffSequenceBarsMode(study.riffSequenceBarsMode);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  const entryBars = normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars);
  const entryRepeats = normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence);
  const entryDurationModes = normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence);
  const entries: RiffSequenceTimelineEntry[] = [];
  let cursor = 0;
  sequence.forEach((label, sequenceIndex) => {
    const cell = cells.find((candidate) => candidate.label === label);
    if (!cell) {
      return;
    }
    const startStep = cursor;
    const durationMode = barsMode === 'per-cell' ? entryDurationModes[sequenceIndex] ?? 'patterns' : 'patterns';
    const barCount = barsMode === 'per-cell' && durationMode === 'bars' ? entryBars[sequenceIndex] ?? sequenceBars : null;
    const repeatCount = barsMode === 'per-cell' ? entryRepeats[sequenceIndex] ?? 1 : 1;
    const cellStepsPerBar = getReferenceStepsPerBar(study.reference);
    const durationSteps =
      barsMode === 'per-cell' && durationMode === 'bars'
        ? Math.max(1, (barCount ?? sequenceBars) * cellStepsPerBar)
        : Math.max(1, cell.stepCount * repeatCount);
    const endStep = startStep + durationSteps;
    entries.push({ cell, sequenceIndex, startStep, endStep, barCount, repeatCount, durationMode });
    cursor = endStep;
  });
  return { entries, totalSteps: cursor };
}

export function getRiffSequenceStateAtReferenceProgress(
  study: RiffCycleStudy,
  referenceProgress: number,
): RiffSequencePlaybackState | null {
  if (!study.riffSequenceEnabled) {
    return null;
  }
  const { entries, totalSteps } = getRiffSequenceTimeline(study);
  if (entries.length === 0 || totalSteps <= 0) {
    return null;
  }
  const resetStepCount = getResetStepCount(study);
  const normalizedProgress = Math.max(0, referenceProgress);
  const progressWithinReset =
    resetStepCount == null ? normalizedProgress : normalizedProgress % resetStepCount;
  const sequenceProgress = ((progressWithinReset % totalSteps) + totalSteps) % totalSteps;
  const sequenceStep = Math.floor(sequenceProgress);
  const entry =
    entries.find((candidate) => sequenceProgress >= candidate.startStep && sequenceProgress < candidate.endStep) ??
    entries[entries.length - 1];
  const localProgress = sequenceProgress - entry.startStep;
  const cellStepCount = Math.max(1, entry.cell.stepCount);
  const localStep = ((Math.floor(localProgress) % cellStepCount) + cellStepCount) % cellStepCount;
  return {
    ...entry,
    localStep,
    localProgress,
    sequenceStep,
  };
}

export function getRiffSequenceStateAtReferenceStep(
  study: RiffCycleStudy,
  referenceStep: number,
): RiffSequencePlaybackState | null {
  return getRiffSequenceStateAtReferenceProgress(study, Math.max(0, Math.floor(referenceStep)));
}

export function getVisibleRiffPhraseAtReferenceStep(
  study: RiffCycleStudy,
  referenceStep: number,
): RiffPhrase {
  const sequenceState = getRiffSequenceStateAtReferenceStep(study, referenceStep);
  if (!sequenceState) {
    return study.riff;
  }
  return {
    ...study.riff,
    id: sequenceState.cell.id,
    name: `Cell ${sequenceState.cell.label}`,
    color: sequenceState.cell.color,
    stepCount: sequenceState.cell.stepCount,
    activeSteps: sequenceState.cell.activeSteps,
    accents: sequenceState.cell.accents,
  };
}

export function getVisibleRiffReferenceAtReferenceStep(
  study: RiffCycleStudy,
  _referenceStep: number,
): ReferenceMeter {
  return study.reference;
}

export function getRiffStepIndexAtReferenceStep(
  study: RiffCycleStudy,
  referenceStep: number,
): number {
  const sequenceState = getRiffSequenceStateAtReferenceStep(study, referenceStep);
  if (sequenceState) {
    return sequenceState.localStep;
  }
  const resetStepCount = getResetStepCount(study);
  const normalizedStep = Math.max(0, Math.floor(referenceStep));
  const stepWithinReset =
    resetStepCount == null
      ? normalizedStep
      : ((normalizedStep % resetStepCount) + resetStepCount) % resetStepCount;
  return stepWithinReset % study.riff.stepCount;
}

export function getPhraseProgressAtReferenceProgress(
  study: RiffCycleStudy,
  referenceProgress: number,
): number {
  const sequenceState = getRiffSequenceStateAtReferenceProgress(study, referenceProgress);
  if (sequenceState) {
    return sequenceState.localProgress;
  }
  const resetStepCount = getResetStepCount(study);
  const normalizedProgress = Math.max(0, referenceProgress);
  const progressWithinReset =
    resetStepCount == null ? normalizedProgress : normalizedProgress % resetStepCount;
  return progressWithinReset % study.riff.stepCount;
}

export function isPhraseRestartAtReferenceStep(
  study: RiffCycleStudy,
  referenceStep: number,
): boolean {
  return getRiffStepIndexAtReferenceStep(study, referenceStep) === 0;
}

export function isForcedResetAtReferenceStep(
  study: RiffCycleStudy,
  referenceStep: number,
): boolean {
  const resetStepCount = getResetStepCount(study);
  if (resetStepCount == null || referenceStep <= 0) {
    return false;
  }
  return referenceStep % resetStepCount === 0;
}

export function isReferenceBeatStart(
  study: RiffCycleStudy,
  referenceStep: number,
): boolean {
  return referenceStep % getReferenceStepsPerBeat(study.reference) === 0;
}

export function getBeatIndexWithinBar(
  study: RiffCycleStudy,
  referenceStep: number,
): number {
  const beatStep = getReferenceStepsPerBeat(study.reference);
  const stepWithinBar =
    ((referenceStep % getReferenceStepsPerBar(study.reference)) +
      getReferenceStepsPerBar(study.reference)) %
    getReferenceStepsPerBar(study.reference);
  return Math.floor(stepWithinBar / beatStep);
}

export function isBackbeatStep(
  study: RiffCycleStudy,
  referenceStep: number,
): boolean {
  const backbeatBeats = normalizeBackbeatBeats(
    study.reference.backbeatBeats,
    study.reference.numerator,
    study.reference.backbeatBeat,
  );
  if (!study.reference.showBackbeat || backbeatBeats.length === 0) {
    return false;
  }
  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  const barIndex = Math.floor(Math.max(0, referenceStep) / stepsPerBar);
  const barInterval = normalizeBackbeatBarInterval(study.reference.backbeatBarInterval);
  if (barIndex % barInterval !== 0) {
    return false;
  }
  return (
    isReferenceBeatStart(study, referenceStep) &&
    backbeatBeats.includes(getBeatIndexWithinBar(study, referenceStep) + 1)
  );
}

export function getDownbeatSteps(study: RiffCycleStudy): number[] {
  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  return Array.from({ length: study.reference.barCountForDisplay }, (_, index) => index * stepsPerBar);
}

export function getDriftStepOffsets(study: RiffCycleStudy): number[] {
  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  const resetBars = getEffectiveResetBarCount(study) ?? study.reference.barCountForDisplay;
  const count = Math.min(study.reference.barCountForDisplay, resetBars);
  return Array.from({ length: count }, (_, index) => (index * stepsPerBar) % study.riff.stepCount);
}

export function getLandingStepCount(study: RiffCycleStudy): number {
  return Math.min(
    Math.max(1, getReferenceStepsPerBar(study.reference)),
    normalizeLandingLength(study.landingLength, getReferenceStepsPerBar(study.reference)),
  );
}

export function getLandingWindowLength(study: RiffCycleStudy): number {
  return getResetStepCount(study) ?? getReferenceStepsPerBar(study.reference);
}

export function getLandingSlotAtReferenceStep(
  study: RiffCycleStudy,
  referenceStep: number,
): number | null {
  const windowLength = getLandingWindowLength(study);
  const landingLength = getLandingStepCount(study);
  const normalizedStep = Math.max(0, Math.floor(referenceStep));
  const stepWithinWindow = ((normalizedStep % windowLength) + windowLength) % windowLength;
  const landingStart = windowLength - landingLength;
  if (stepWithinWindow < landingStart) {
    return null;
  }
  return stepWithinWindow - landingStart;
}

export function isLandingReferenceStep(
  study: RiffCycleStudy,
  referenceStep: number,
): boolean {
  return getLandingSlotAtReferenceStep(study, referenceStep) != null;
}

export function getEffectiveRiffStepStateAtReferenceStep(
  study: RiffCycleStudy,
  referenceStep: number,
): {
  phraseIndex: number;
  active: boolean;
  accented: boolean;
  landingSlot: number | null;
  overridden: boolean;
} {
  const sequenceState = getRiffSequenceStateAtReferenceStep(study, referenceStep);
  const phraseIndex = getRiffStepIndexAtReferenceStep(study, referenceStep);
  const landingSlot = study.landingEditEnabled
    ? getLandingSlotAtReferenceStep(study, referenceStep)
    : null;
  const landingOverride =
    landingSlot == null ? 'inherit' : study.landingOverrides[landingSlot] ?? 'inherit';

  if (landingOverride === 'rest') {
    return { phraseIndex, landingSlot, active: false, accented: false, overridden: true };
  }

  if (landingOverride === 'on') {
    return { phraseIndex, landingSlot, active: true, accented: false, overridden: true };
  }

  if (landingOverride === 'accent') {
    return { phraseIndex, landingSlot, active: true, accented: true, overridden: true };
  }

  return {
    phraseIndex,
    landingSlot,
    active: Boolean((sequenceState?.cell.activeSteps ?? study.riff.activeSteps)[phraseIndex]),
    accented: Boolean((sequenceState?.cell.accents ?? study.riff.accents)[phraseIndex]),
    overridden: false,
  };
}

export function getTailStepStartIndex(study: RiffCycleStudy): number {
  return Math.max(0, study.riff.stepCount - normalizeTailLength(study.tailLength, study.riff.stepCount));
}

export function getTailStepIndices(study: RiffCycleStudy): number[] {
  const startIndex = getTailStepStartIndex(study);
  return Array.from(
    { length: Math.max(0, study.riff.stepCount - startIndex) },
    (_, index) => startIndex + index,
  );
}

export function isTailStep(study: RiffCycleStudy, stepIndex: number): boolean {
  return stepIndex >= getTailStepStartIndex(study) && stepIndex < study.riff.stepCount;
}

export function canEditRiffStep(_study: RiffCycleStudy, _stepIndex: number): boolean {
  return true;
}

export function getRiffPhrasePoints(
  study: RiffCycleStudy,
  centerX: number,
  centerY: number,
  radius: number,
): RiffPhrasePoint[] {
  const stepCount = study.riff.stepCount;
  return Array.from({ length: stepCount }, (_, index) => {
    const angle =
      -Math.PI / 2 +
      (normalizeRotationOffset(study.riff.rotationOffset) / 360) * TAU +
      (index / stepCount) * TAU;
    return {
      index,
      angle,
      active: study.riff.activeSteps[index] ?? false,
      accented: study.riff.accents[index] ?? false,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });
}

export function toggleRiffStep(study: RiffCycleStudy, stepIndex: number): RiffCycleStudy {
  return {
    ...study,
    riff: {
      ...study.riff,
      activeSteps: study.riff.activeSteps.map((step, index) =>
        index === stepIndex ? !step : step,
      ),
      accents: study.riff.accents.map((accent, index) =>
        index === stepIndex ? (study.riff.activeSteps[index] ? false : accent) : accent,
      ),
    },
  };
}

export function setRiffStepActive(
  study: RiffCycleStudy,
  stepIndex: number,
  active: boolean,
): RiffCycleStudy {
  return {
    ...study,
    riff: {
      ...study.riff,
      activeSteps: study.riff.activeSteps.map((step, index) =>
        index === stepIndex ? active : step,
      ),
      accents: study.riff.accents.map((accent, index) =>
        index === stepIndex ? (active ? accent : false) : accent,
      ),
    },
  };
}

export function toggleRiffAccent(study: RiffCycleStudy, stepIndex: number): RiffCycleStudy {
  const nextAccented = !Boolean(study.riff.accents[stepIndex]);
  return {
    ...study,
    riff: {
      ...study.riff,
      activeSteps: study.riff.activeSteps.map((step, index) =>
        index === stepIndex ? (nextAccented ? true : step) : step,
      ),
      accents: study.riff.accents.map((accent, index) =>
        index === stepIndex ? nextAccented : accent,
      ),
    },
  };
}

export function rotateRiffSteps(study: RiffCycleStudy, stepOffset: number): RiffCycleStudy {
  const nextSteps = Array.from({ length: study.riff.stepCount }, () => false);
  const nextAccents = Array.from({ length: study.riff.stepCount }, () => false);

  study.riff.activeSteps.forEach((active, index) => {
    const nextIndex = (index + stepOffset + study.riff.stepCount) % study.riff.stepCount;
    nextSteps[nextIndex] = active;
  });
  study.riff.accents.forEach((accented, index) => {
    const nextIndex = (index + stepOffset + study.riff.stepCount) % study.riff.stepCount;
    nextAccents[nextIndex] = accented;
  });

  return {
    ...study,
    riff: {
      ...study.riff,
      activeSteps: nextSteps,
      accents: nextAccents,
    },
  };
}

export function invertRiffSteps(study: RiffCycleStudy): RiffCycleStudy {
  return {
    ...study,
    riff: {
      ...study.riff,
      activeSteps: study.riff.activeSteps.map((step) => !step),
    },
  };
}

export function clearRiffSteps(study: RiffCycleStudy): RiffCycleStudy {
  return {
    ...study,
    riff: {
      ...study.riff,
      activeSteps: study.riff.activeSteps.map(() => false),
      accents: study.riff.accents.map(() => false),
    },
  };
}

export function updateRiffStepCount(study: RiffCycleStudy, stepCount: number): RiffCycleStudy {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  const nextSteps = Array.from({ length: normalizedStepCount }, (_, index) =>
    Boolean(study.riff.activeSteps[index]),
  );
  const nextAccents = Array.from({ length: normalizedStepCount }, (_, index) =>
    Boolean(study.riff.accents[index]),
  );

  return {
    ...study,
    riff: {
      ...study.riff,
      stepCount: normalizedStepCount,
      name: `${normalizedStepCount}-step phrase`,
      activeSteps: nextSteps,
      accents: nextAccents,
    },
    tailLength: normalizeTailLength(study.tailLength, normalizedStepCount),
  };
}

export function setRiffSequenceEnabled(
  study: RiffCycleStudy,
  enabled: boolean,
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  return {
    ...study,
    riffSequenceEnabled: enabled,
    riffCells,
    riffSequence: sequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence),
  };
}

function updateRiffSequenceCell(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
  update: (cell: RiffSequenceCell) => RiffSequenceCell,
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  if (!riffCells.some((cell) => cell.label === label)) {
    return study;
  }
  const nextCells = riffCells.map((cell) =>
    cell.label === label ? update(cell) : cell,
  );
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, nextCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  return {
    ...study,
    riffCells: nextCells,
    riffSequence: sequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence),
  };
}

export function addRiffSequenceCell(
  study: RiffCycleStudy,
  referenceOverrides: Partial<ReferenceMeter> = {},
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const usedLabels = new Set(riffCells.map((cell) => cell.label));
  const nextLabel = RIFF_SEQUENCE_CELL_LABELS.find((label) => !usedLabels.has(label));
  if (!nextLabel) {
    return study;
  }

  const baseReference = createReferenceMeter({ ...study.reference, ...referenceOverrides });
  const newStepCount = createRandomRiffCellStepCount(baseReference);
  const mask = createPhraseMask(newStepCount, 'random');
  const nextCell = createRiffSequenceCellFromState(
    nextLabel,
    newStepCount,
    mask.activeSteps,
    mask.accents,
    undefined,
    randomChoice(RIFF_CYCLE_COLORS),
    {
      numerator: baseReference.numerator,
      denominator: baseReference.denominator,
      subdivision: baseReference.subdivision,
      backbeatBeat: baseReference.backbeatBeat,
      backbeatBeats: baseReference.backbeatBeats,
      backbeatBarInterval: baseReference.backbeatBarInterval,
    },
  );
  const nextCells = [...riffCells, nextCell];
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  const nextSequence = normalizeRiffSequenceOrder([...sequence, nextLabel], nextCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  const entryBars = normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars);
  const entryRepeats = normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence);
  const entryDurationModes = normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence);
  return {
    ...study,
    riffSequenceEnabled: true,
    riffCells: nextCells,
    riffSequence: nextSequence,
    riffSequenceEntryBars: [...entryBars, sequenceBars].slice(0, nextSequence.length),
    riffSequenceEntryRepeats: [...entryRepeats, 1].slice(0, nextSequence.length),
    riffSequenceEntryDurationModes: [...entryDurationModes, 'patterns' as RiffSequenceEntryDurationMode].slice(0, nextSequence.length),
  };
}

export function removeRiffSequenceCell(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  if (riffCells.length <= 1 || !riffCells.some((cell) => cell.label === label)) {
    return study;
  }
  const nextCells = riffCells.filter((cell) => cell.label !== label);
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  const entryBars = normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars);
  const entryRepeats = normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence);
  const entryDurationModes = normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence);
  const filteredEntries = sequence
    .map((entryLabel, index) => ({
      label: entryLabel,
      bars: entryBars[index] ?? sequenceBars,
      repeats: entryRepeats[index] ?? 1,
      durationMode: entryDurationModes[index] ?? 'patterns',
    }))
    .filter((entry) => entry.label !== label);
  const nextSequence = normalizeRiffSequenceOrder(
    filteredEntries.length > 0
      ? filteredEntries.map((entry) => entry.label)
      : [nextCells[0]?.label ?? 'A'],
    nextCells,
  );
  const nextEntryBars = filteredEntries.map((entry) => entry.bars);
  const nextEntryRepeats = filteredEntries.map((entry) => entry.repeats);
  const nextEntryDurationModes = filteredEntries.map((entry) => entry.durationMode);
  return {
    ...study,
    riffCells: nextCells,
    riffSequence: nextSequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(nextEntryBars, nextSequence, sequenceBars),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(nextEntryRepeats, nextSequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(nextEntryDurationModes, nextSequence),
  };
}

export function updateRiffSequenceCellReference(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
  updates: Partial<ReferenceMeter>,
): RiffCycleStudy {
  return updateRiffSequenceCell(study, label, (cell) => {
    const nextNumerator =
      updates.numerator == null
        ? cell.numerator
        : clamp(Math.round(updates.numerator || 0), 2, 32);
    const nextBackbeatBeats = normalizeBackbeatBeats(
      updates.backbeatBeats ?? (updates.backbeatBeat != null ? [updates.backbeatBeat] : cell.backbeatBeats),
      nextNumerator,
      updates.backbeatBeat ?? cell.backbeatBeat,
    );
    return {
      ...cell,
      numerator: nextNumerator,
      denominator: updates.denominator == null ? cell.denominator : updates.denominator === 8 ? 8 : 4,
      subdivision: updates.subdivision == null ? cell.subdivision : normalizeSubdivision(updates.subdivision),
      backbeatBeat: nextBackbeatBeats[0] ?? null,
      backbeatBeats: nextBackbeatBeats,
      backbeatBarInterval:
        updates.backbeatBarInterval === 2 || updates.backbeatBarInterval === 4
          ? updates.backbeatBarInterval
          : updates.backbeatBarInterval === 1
            ? 1
            : cell.backbeatBarInterval,
    };
  });
}

function createRandomRiffSequenceCellForReference(
  label: RiffSequenceCellLabel,
  reference: ReferenceMeter,
): RiffSequenceCell {
  const stepCount = createRandomRiffCellStepCount(reference);
  const mask = createPhraseMask(stepCount, 'random');
  return createRiffSequenceCellFromState(
    label,
    stepCount,
    mask.activeSteps,
    mask.accents,
    undefined,
    createRandomRiffColor(undefined, 'random'),
    {
      numerator: reference.numerator,
      denominator: reference.denominator,
      subdivision: reference.subdivision,
      backbeatBeat: reference.backbeatBeat,
      backbeatBeats: reference.backbeatBeats,
      backbeatBarInterval: reference.backbeatBarInterval,
    },
  );
}

export function randomizeRiffSequenceCells(
  study: RiffCycleStudy,
  referenceOverrides: Partial<ReferenceMeter> = {},
): RiffCycleStudy {
  const baseReference = createReferenceMeter({ ...study.reference, ...referenceOverrides });
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const nextCells = riffCells.map((cell) => ({
    ...createRandomRiffSequenceCellForReference(cell.label, baseReference),
    id: cell.id,
  }));
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, nextCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  return {
    ...study,
    riffSequenceEnabled: true,
    riffCells: nextCells,
    riffSequence: sequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence),
  };
}

export function setRiffCellGroups(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
  groups: number[],
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff).map((cell) =>
    cell.label === label ? createRiffSequenceCell(label, groups, { id: cell.id, color: cell.color, ...getRiffCellTiming(cell) }) : cell,
  );
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  return {
    ...study,
    riffCells,
    riffSequence: sequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence),
  };
}

export function updateRiffSequenceCellStepCount(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
  stepCount: number,
): RiffCycleStudy {
  const normalizedStepCount = normalizeCellStepCount(stepCount);
  return updateRiffSequenceCell(study, label, (cell) =>
    createRiffSequenceCellFromState(
      label,
      normalizedStepCount,
      normalizeCellActiveSteps(cell.activeSteps, normalizedStepCount),
      normalizeCellAccents(cell.accents, normalizedStepCount),
      cell.id,
      cell.color,
      getRiffCellTiming(cell),
    ),
  );
}

export function updateRiffSequenceCellColor(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
  color: string,
): RiffCycleStudy {
  return updateRiffSequenceCell(study, label, (cell) => ({
    ...cell,
    color: normalizeRiffColor(color, cell.color),
  }));
}

export function toggleRiffSequenceCellStep(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
  stepIndex: number,
): RiffCycleStudy {
  return updateRiffSequenceCell(study, label, (cell) => {
    if (stepIndex < 0 || stepIndex >= cell.stepCount) {
      return cell;
    }
    const nextActiveSteps = cell.activeSteps.map((active, index) =>
      index === stepIndex ? !active : active,
    );
    const nextAccents = cell.accents.map((accent, index) =>
      index === stepIndex ? (cell.activeSteps[index] ? false : accent) : accent,
    );
    return createRiffSequenceCellFromState(label, cell.stepCount, nextActiveSteps, nextAccents, cell.id, cell.color, getRiffCellTiming(cell));
  });
}

export function setRiffSequenceCellStepActive(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
  stepIndex: number,
  active: boolean,
): RiffCycleStudy {
  return updateRiffSequenceCell(study, label, (cell) => {
    if (stepIndex < 0 || stepIndex >= cell.stepCount) {
      return cell;
    }
    const nextActiveSteps = cell.activeSteps.map((currentActive, index) =>
      index === stepIndex ? active : currentActive,
    );
    const nextAccents = cell.accents.map((accent, index) =>
      index === stepIndex ? (active ? accent : false) : accent,
    );
    return createRiffSequenceCellFromState(label, cell.stepCount, nextActiveSteps, nextAccents, cell.id, cell.color, getRiffCellTiming(cell));
  });
}

export function toggleRiffSequenceCellAccent(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
  stepIndex: number,
): RiffCycleStudy {
  return updateRiffSequenceCell(study, label, (cell) => {
    if (stepIndex < 0 || stepIndex >= cell.stepCount) {
      return cell;
    }
    const nextAccented = !Boolean(cell.accents[stepIndex]);
    const nextActiveSteps = cell.activeSteps.map((active, index) =>
      index === stepIndex ? (nextAccented ? true : active) : active,
    );
    const nextAccents = cell.accents.map((accent, index) =>
      index === stepIndex ? nextAccented : accent,
    );
    return createRiffSequenceCellFromState(label, cell.stepCount, nextActiveSteps, nextAccents, cell.id, cell.color, getRiffCellTiming(cell));
  });
}

export function rotateRiffSequenceCellSteps(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
  stepOffset: number,
): RiffCycleStudy {
  return updateRiffSequenceCell(study, label, (cell) => {
    const nextSteps = Array.from({ length: cell.stepCount }, () => false);
    const nextAccents = Array.from({ length: cell.stepCount }, () => false);
    cell.activeSteps.forEach((active, index) => {
      const nextIndex = (index + stepOffset + cell.stepCount) % cell.stepCount;
      nextSteps[nextIndex] = active;
    });
    cell.accents.forEach((accented, index) => {
      const nextIndex = (index + stepOffset + cell.stepCount) % cell.stepCount;
      nextAccents[nextIndex] = accented;
    });
    return createRiffSequenceCellFromState(label, cell.stepCount, nextSteps, nextAccents, cell.id, cell.color, getRiffCellTiming(cell));
  });
}

export function invertRiffSequenceCellSteps(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
): RiffCycleStudy {
  return updateRiffSequenceCell(study, label, (cell) =>
    createRiffSequenceCellFromState(
      label,
      cell.stepCount,
      cell.activeSteps.map((active) => !active),
      cell.accents,
      cell.id,
      cell.color,
      getRiffCellTiming(cell),
    ),
  );
}

export function clearRiffSequenceCellSteps(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
): RiffCycleStudy {
  return updateRiffSequenceCell(study, label, (cell) =>
    createRiffSequenceCellFromState(
      label,
      cell.stepCount,
      cell.activeSteps.map(() => false),
      cell.accents.map(() => false),
      cell.id,
      cell.color,
      getRiffCellTiming(cell),
    ),
  );
}

export function setRiffSequenceOrder(
  study: RiffCycleStudy,
  sequence: RiffSequenceCellLabel[],
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const nextSequence = normalizeRiffSequenceOrder(sequence, riffCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  return {
    ...study,
    riffCells,
    riffSequence: nextSequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(
      study.riffSequenceEntryBars,
      nextSequence,
      sequenceBars,
    ),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, nextSequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, nextSequence),
  };
}

export function setRiffSequenceBars(study: RiffCycleStudy, bars: number): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  const nextBars = normalizeBars(bars);
  return {
    ...study,
    riffSequenceBars: nextBars,
    riffCells,
    riffSequence: sequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, nextBars),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence),
  };
}

export function setRiffSequenceBarsMode(
  study: RiffCycleStudy,
  mode: RiffSequenceBarsMode,
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  return {
    ...study,
    riffCells,
    riffSequence: sequence,
    riffSequenceBarsMode: normalizeRiffSequenceBarsMode(mode),
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence),
  };
}

export function setRiffSequenceEntryBars(
  study: RiffCycleStudy,
  sequenceIndex: number,
  bars: number,
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  if (sequenceIndex < 0 || sequenceIndex >= sequence.length) {
    return study;
  }
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  const entryBars = normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars);
  entryBars[sequenceIndex] = normalizeBars(bars);
  return {
    ...study,
    riffCells,
    riffSequence: sequence,
    riffSequenceEntryBars: entryBars,
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence),
  };
}

export function setRiffSequenceEntryRepeats(
  study: RiffCycleStudy,
  sequenceIndex: number,
  repeats: number,
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  if (sequenceIndex < 0 || sequenceIndex >= sequence.length) {
    return study;
  }
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  const entryRepeats = normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence);
  entryRepeats[sequenceIndex] = clamp(Math.round(repeats || 0), 1, RIFF_MAX_SEQUENCE_REPEATS);
  return {
    ...study,
    riffCells,
    riffSequence: sequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars),
    riffSequenceEntryRepeats: entryRepeats,
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence),
  };
}

export function setRiffSequenceEntryDurationMode(
  study: RiffCycleStudy,
  sequenceIndex: number,
  mode: RiffSequenceEntryDurationMode,
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  if (sequenceIndex < 0 || sequenceIndex >= sequence.length) {
    return study;
  }
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  const entryDurationModes = normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence);
  entryDurationModes[sequenceIndex] = mode === 'bars' ? 'bars' : 'patterns';
  return {
    ...study,
    riffCells,
    riffSequence: sequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence),
    riffSequenceEntryDurationModes: entryDurationModes,
  };
}

export function appendRiffSequenceOrderCell(
  study: RiffCycleStudy,
  label: RiffSequenceCellLabel,
): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  if (!riffCells.some((cell) => cell.label === label)) {
    return study;
  }
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  const nextSequence = normalizeRiffSequenceOrder([...sequence, label], riffCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  const entryBars = normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars);
  const entryRepeats = normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence);
  const entryDurationModes = normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence);
  return {
    ...study,
    riffCells,
    riffSequence: nextSequence,
    riffSequenceEntryBars: [...entryBars, sequenceBars].slice(0, nextSequence.length),
    riffSequenceEntryRepeats: [...entryRepeats, 1].slice(0, nextSequence.length),
    riffSequenceEntryDurationModes: [...entryDurationModes, 'patterns' as RiffSequenceEntryDurationMode].slice(0, nextSequence.length),
  };
}

export function removeLastRiffSequenceOrderCell(study: RiffCycleStudy): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const sequence = normalizeRiffSequenceOrder(study.riffSequence, riffCells);
  const nextSequence = normalizeRiffSequenceOrder(sequence.slice(0, -1), riffCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  return {
    ...study,
    riffCells,
    riffSequence: nextSequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(
      study.riffSequenceEntryBars,
      nextSequence,
      sequenceBars,
    ),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, nextSequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, nextSequence),
  };
}

export function resetRiffSequenceOrder(study: RiffCycleStudy): RiffCycleStudy {
  const riffCells = normalizeRiffSequenceCells(study.riffCells, study.riff);
  const sequence = normalizeRiffSequenceOrder([riffCells[0]?.label ?? 'A'], riffCells);
  const sequenceBars = normalizeBars(study.riffSequenceBars ?? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay);
  return {
    ...study,
    riffCells,
    riffSequence: sequence,
    riffSequenceEntryBars: normalizeRiffSequenceEntryBars(study.riffSequenceEntryBars, sequence, sequenceBars),
    riffSequenceEntryRepeats: normalizeRiffSequenceEntryRepeats(study.riffSequenceEntryRepeats, sequence),
    riffSequenceEntryDurationModes: normalizeRiffSequenceEntryDurationModes(study.riffSequenceEntryDurationModes, sequence),
  };
}

export function setTailLength(study: RiffCycleStudy, tailLength: number): RiffCycleStudy {
  return {
    ...study,
    tailLength: normalizeTailLength(tailLength, study.riff.stepCount),
  };
}

export function setLandingLength(study: RiffCycleStudy, landingLength: number): RiffCycleStudy {
  const nextLandingLength = normalizeLandingLength(
    landingLength,
    getReferenceStepsPerBar(study.reference),
  );
  return {
    ...study,
    landingLength: nextLandingLength,
    landingOverrides: normalizeLandingOverrides(study.landingOverrides, nextLandingLength),
  };
}

export function setLandingOverride(
  study: RiffCycleStudy,
  slotIndex: number,
  nextState: LandingOverrideState,
): RiffCycleStudy {
  return {
    ...study,
    landingOverrides: study.landingOverrides.map((state, index) =>
      index === slotIndex ? nextState : state,
    ),
  };
}

export function clearLandingOverrides(study: RiffCycleStudy): RiffCycleStudy {
  return {
    ...study,
    landingOverrides: study.landingOverrides.map(() => 'inherit'),
  };
}

export function applyLandingStateToLastSlots(
  study: RiffCycleStudy,
  count: number,
  nextState: Exclude<LandingOverrideState, 'inherit'>,
): RiffCycleStudy {
  const landingLength = getLandingStepCount(study);
  const clampedCount = clamp(Math.round(count || 0), 1, landingLength);
  const startIndex = Math.max(0, landingLength - clampedCount);
  return {
    ...study,
    landingOverrides: study.landingOverrides.map((state, index) =>
      index >= startIndex ? nextState : state,
    ),
  };
}

export function clearRiffTail(study: RiffCycleStudy): RiffCycleStudy {
  const tailStart = getTailStepStartIndex(study);
  return {
    ...study,
    riff: {
      ...study.riff,
      activeSteps: study.riff.activeSteps.map((step, index) =>
        index >= tailStart ? false : step,
      ),
      accents: study.riff.accents.map((accent, index) =>
        index >= tailStart ? false : accent,
      ),
    },
  };
}

export function accentRiffTail(study: RiffCycleStudy): RiffCycleStudy {
  const tailStart = getTailStepStartIndex(study);
  return {
    ...study,
    riff: {
      ...study.riff,
      activeSteps: study.riff.activeSteps.map((step, index) =>
        index >= tailStart ? true : step,
      ),
      accents: study.riff.accents.map((accent, index) =>
        index >= tailStart ? true : accent,
      ),
    },
  };
}

function createRandomReference(intensity: 'random' | 'plus'): ReferenceMeter {
  const numerator =
    intensity === 'plus'
      ? randomChoice([4, 5, 5, 6, 6, 7] as const)
      : randomChoice([3, 4, 4, 4, 3] as const);
  const denominator = 4;
  const subdivision =
    intensity === 'plus'
      ? randomChoice([16, 20, 20, 32] as const)
      : randomChoice([12, 16, 16, 16] as const);
  return createReferenceMeter({
    numerator,
    denominator,
    subdivision,
    bpm: intensity === 'plus' ? randomInt(86, 132) : randomInt(88, 120),
    barCountForDisplay: numerator >= 5 ? 3 : 4,
    backbeatBeat: Math.min(numerator, numerator >= 4 ? 3 : 2),
  });
}

function createReturnMode(intensity: 'random' | 'remix' | 'plus', current?: RiffPhraseResetMode): {
  resetMode: RiffPhraseResetMode;
  resetBars: number;
} {
  if (intensity === 'remix' && current && Math.random() < 0.7) {
    return {
      resetMode: current,
      resetBars: current === 'custom-cycle' ? randomInt(2, 6) : 4,
    };
  }
  const resetMode =
    intensity === 'plus'
      ? randomChoice(['every-2-bars', 'every-4-bars', 'every-8-bars', 'custom-cycle', 'free', 'per-bar'] as const)
      : randomChoice(['free', 'every-2-bars', 'every-4-bars', 'per-bar'] as const);
  return {
    resetMode,
    resetBars:
      resetMode === 'custom-cycle'
        ? randomInt(2, 8)
        : resetMode === 'every-2-bars'
          ? 2
          : resetMode === 'every-8-bars'
            ? 8
            : 4,
  };
}

export function createRandomRiffCycleStudy(intensity: 'random' | 'plus' = 'random'): RiffCycleStudy {
  const reference = createRandomReference(intensity);
  const stepCount =
    intensity === 'plus'
      ? randomChoice([11, 13, 15, 17, 19, 21, 23] as const)
      : randomChoice([9, 11, 13, 15, 17] as const);
  const mask = createPhraseMask(stepCount, intensity);
  const returnMode = createReturnMode(intensity);
  const soundSettings = createRandomRiffSoundSettings(intensity);
  const riffColor = createRandomRiffColor(undefined, intensity);
  return createRiffCycleStudy({
    name: intensity === 'plus' ? 'Random+ Riff Cycle' : 'Random Riff Cycle',
    description:
      intensity === 'plus'
        ? 'A bolder phrase-against-bar study with stronger drift and return tension.'
        : 'A fresh phrase-against-bar study with readable displacement and return.',
    reference,
    riff: createRiffPhrase(stepCount, {
      ...mask,
      resetMode: returnMode.resetMode,
      resetBars: returnMode.resetBars,
      color: riffColor,
      pitchHz:
        soundSettings.palette === 'metal-tick'
          ? randomInt(132, 188)
          : soundSettings.palette === 'dry-synth'
            ? randomInt(108, 164)
            : soundSettings.palette === 'low-pulse'
              ? randomInt(82, 118)
              : soundSettings.palette === 'muted-djent'
                ? randomInt(84, 126)
                : intensity === 'plus'
                  ? randomInt(88, 152)
                  : randomInt(94, 138),
      gain:
        soundSettings.palette === 'low-pulse' || soundSettings.palette === 'deep-architectural'
          ? 0.15
          : intensity === 'plus'
            ? 0.14
            : 0.12,
      rotationOffset: 0,
    }),
    soundSettings,
    landingEditEnabled: false,
    landingLength: Math.min(getReferenceStepsPerBar(reference), intensity === 'plus' ? randomInt(3, 6) : randomInt(2, 4)),
    landingOverrides: [],
    showDriftTrail: true,
    viewMode: 'unwrapped',
    emphasisMode: intensity === 'plus' ? 'groove' : 'analysis',
  });
}

export function remixRiffCycleStudy(study: RiffCycleStudy): RiffCycleStudy {
  const next = cloneRiffCycleStudy(study);
  const stepDelta = randomChoice([-1, 0, 0, 1] as const);
  const nextStepCount = clamp(next.riff.stepCount + stepDelta, 5, 32);
  const remapped = updateRiffStepCount(next, nextStepCount);
  const mask = createPhraseMask(remapped.riff.stepCount, 'remix');
  const returnMode = createReturnMode('remix', remapped.riff.resetMode);
  let result = {
    ...remapped,
    name: `${study.name} Remix`,
    description: 'A variation that keeps the bar relationship while changing phrase shape and return.',
    reference: {
      ...remapped.reference,
      bpm: normalizeBpm(remapped.reference.bpm + randomInt(-6, 6)),
    },
    riff: {
      ...remapped.riff,
      activeSteps: Math.random() < 0.75 ? mask.activeSteps : remapped.riff.activeSteps,
      accents: Math.random() < 0.75 ? mask.accents : remapped.riff.accents,
      resetMode: returnMode.resetMode,
      resetBars: returnMode.resetBars,
      rotationOffset: 0,
      color: createRandomRiffColor(remapped.riff.color, 'remix'),
    },
    soundSettings: createRandomRiffSoundSettings('remix', remapped.soundSettings),
  };
  if (Math.random() < 0.6) {
    result = setLandingLength(result, clamp(result.landingLength + randomChoice([-1, 1] as const), 1, getReferenceStepsPerBar(result.reference)));
  }
  if (result.landingEditEnabled && Math.random() < 0.55) {
    result = applyLandingStateToLastSlots(result, Math.min(2, result.landingOverrides.length || 1), Math.random() < 0.5 ? 'rest' : 'accent');
  }
  return result;
}

export function createRandomPlusRiffCycleStudy(): RiffCycleStudy {
  const next = createRandomRiffCycleStudy('plus');
  const landingLength = Math.min(getReferenceStepsPerBar(next.reference), randomInt(3, 7));
  const overrideCount = randomInt(1, Math.min(4, landingLength));
  return {
    ...setLandingLength(next, landingLength),
    landingEditEnabled: true,
    emphasisMode: 'groove',
    soundSettings: createRandomRiffSoundSettings('plus', next.soundSettings),
    landingOverrides: normalizeLandingOverrides(
      Array.from({ length: landingLength }, (_, index) =>
        index >= landingLength - overrideCount
          ? randomChoice(['rest', 'accent', 'on'] as const)
          : Math.random() < 0.15
            ? 'on'
            : 'inherit',
      ),
      landingLength,
    ),
  };
}

function withPhraseMask(
  id: string,
  name: string,
  description: string,
  reference: Partial<ReferenceMeter>,
  riff: Partial<RiffPhrase> & { stepCount: number; activeSteps: boolean[] },
  overrides: Partial<RiffCycleStudy> = {},
  presetOptions: Pick<RiffCyclePreset, 'pro'> = {},
): RiffCyclePreset {
  return {
    id,
    name,
    description,
    ...presetOptions,
    study: createRiffCycleStudy({
      ...overrides,
      name,
      description,
      reference: createReferenceMeter(reference),
      riff: createRiffPhrase(riff.stepCount, riff),
    }),
  };
}

export const RIFF_CYCLE_PRESETS: RiffCyclePreset[] = [
  withPhraseMask(
    'default-riff',
    'First Return',
    'A clear 7-step starter riff with a readable four-bar return.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 90, barCountForDisplay: 4 },
    {
      stepCount: 7,
      activeSteps: [true, false, true, false, true, true, false],
      accents: [true, false, false, false, false, false, false],
      resetMode: 'every-4-bars',
      resetBars: 4,
      color: RIFF_CYCLE_COLORS[1],
      pitchHz: 104,
      gain: 0.14,
    },
    {
      soundSettings: {
        palette: 'deep-architectural',
        pitchMode: 'free',
        rootNote: 'E',
        scaleName: 'minorPentatonic',
        register: 'low',
        accentPush: 'soft',
      },
      emphasisMode: 'analysis',
    },
  ),
  withPhraseMask(
    'rational-gaze',
    'Rational Gaze',
    'A 25-step intro riff shape rotating across an eight-bar 4/4 frame.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 133, barCountForDisplay: 8, backbeatBeat: 3 },
    {
      stepCount: 25,
      activeSteps: [
        true,
        true,
        false,
        false,
        false,
        false,
        true,
        true,
        false,
        false,
        true,
        true,
        false,
        true,
        false,
        false,
        true,
        true,
        false,
        false,
        true,
        true,
        false,
        false,
        false,
      ],
      accents: [
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        true,
        false,
        true,
        false,
        false,
        true,
        false,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
      ],
      resetMode: 'every-8-bars',
      resetBars: 8,
      color: RIFF_CYCLE_COLORS[1],
      pitchHz: 104,
      gain: 0.14,
    },
    {
      soundSettings: {
        palette: 'deep-architectural',
        pitchMode: 'free',
        rootNote: 'E',
        scaleName: 'minorPentatonic',
        register: 'low',
        accentPush: 'soft',
      },
      emphasisMode: 'analysis',
    },
  ),
  withPhraseMask(
    'seventeen-reset-four',
    'Four-Bar Return',
    'A 17-step pattern that returns every four bars.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 112, barCountForDisplay: 4 },
    {
      stepCount: 17,
      activeSteps: [
        true,
        false,
        false,
        true,
        false,
        true,
        false,
        false,
        true,
        false,
        true,
        false,
        false,
        true,
        false,
        true,
        false,
      ],
      accents: [
        true,
        false,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
      ],
      resetMode: 'every-4-bars',
      resetBars: 4,
      color: RIFF_CYCLE_COLORS[1],
      pitchHz: 104,
      gain: 0.14,
    },
    {
      soundSettings: {
        palette: 'deep-architectural',
        pitchMode: 'free',
        rootNote: 'E',
        scaleName: 'minorPentatonic',
        register: 'low',
        accentPush: 'soft',
      },
      emphasisMode: 'analysis',
    },
  ),
  withPhraseMask(
    'seventeen-reset-two',
    'Short Fuse',
    'A tight 13-step pattern with a quick return.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 118, barCountForDisplay: 4 },
    {
      stepCount: 13,
      activeSteps: [true, false, true, false, false, true, false, true, false, false, true, false, true],
      accents: [true, false, false, false, false, true, false, false, false, false, true, false, false],
      resetMode: 'every-2-bars',
      resetBars: 2,
      color: RIFF_CYCLE_COLORS[2],
      pitchHz: 122,
      gain: 0.13,
    },
    {
      soundSettings: {
        palette: 'muted-djent',
        pitchMode: 'free',
        rootNote: 'E',
        scaleName: 'minorPentatonic',
        register: 'low',
        accentPush: 'strong',
      },
      emphasisMode: 'groove',
    },
  ),
  withPhraseMask(
    'five-four-twelve',
    'Wide Gate',
    'A compact phrase inside a wider 5/4 frame.',
    { numerator: 5, denominator: 4, subdivision: 16, bpm: 108, barCountForDisplay: 3, backbeatBeat: 3 },
    {
      stepCount: 12,
      activeSteps: [true, false, true, false, true, false, false, true, false, true, false, false],
      accents: [true, false, false, false, true, false, false, false, false, true, false, false],
      resetMode: 'free',
      color: RIFF_CYCLE_COLORS[3],
      pitchHz: 146,
      gain: 0.12,
    },
    {
      soundSettings: {
        palette: 'dry-synth',
        pitchMode: 'keyed',
        rootNote: 'D',
        scaleName: 'dorian',
        register: 'mid-low',
        accentPush: 'soft',
      },
      emphasisMode: 'groove',
    },
  ),
  withPhraseMask(
    'sparse-kick',
    'Pulse Engine',
    'A fast grid with clustered hits and heavy accents.',
    { numerator: 4, denominator: 4, subdivision: 20, bpm: 104, barCountForDisplay: 4 },
    {
      stepCount: 19,
      activeSteps: [true, false, true, true, false, false, true, false, true, true, false, false, true, false, true, true, false, false, true],
      accents: [true, false, false, true, false, false, false, false, false, true, false, false, false, false, false, true, false, false, false],
      resetMode: 'every-4-bars',
      resetBars: 4,
      color: RIFF_CYCLE_COLORS[4],
      pitchHz: 88,
      gain: 0.16,
    },
    {
      soundSettings: {
        palette: 'muted-djent',
        pitchMode: 'free',
        rootNote: 'F#',
        scaleName: 'aeolian',
        register: 'low',
        accentPush: 'strong',
      },
      emphasisMode: 'groove',
    },
  ),
  withPhraseMask(
    'snare-on-three',
    'Anchor Loop',
    'A clear backbeat with a moving 15-step phrase.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 114, barCountForDisplay: 4, backbeatBeat: 3 },
    {
      stepCount: 15,
      activeSteps: [true, false, true, false, false, true, false, false, true, false, true, false, false, true, false],
      accents: [true, false, false, false, false, true, false, false, false, false, true, false, false, false, false],
      resetMode: 'every-4-bars',
      resetBars: 4,
      color: RIFF_CYCLE_COLORS[0],
      pitchHz: 128,
      gain: 0.13,
    },
    {
      soundSettings: {
        palette: 'architectural',
        pitchMode: 'keyed',
        rootNote: 'E',
        scaleName: 'minorPentatonic',
        register: 'low',
        accentPush: 'soft',
      },
      emphasisMode: 'analysis',
    },
  ),
  withPhraseMask(
    'eleven-switchback',
    'Eleven Switchback',
    'An 11-step phrase that keeps turning across a two-bar return.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 116, barCountForDisplay: 4, backbeatBeat: 3 },
    {
      stepCount: 11,
      activeSteps: [true, false, true, false, true, false, false, true, false, true, false],
      accents: [true, false, false, false, true, false, false, false, false, true, false],
      resetMode: 'every-2-bars',
      resetBars: 2,
      color: RIFF_CYCLE_COLORS[5],
      pitchHz: 138,
      gain: 0.13,
    },
    {
      landingEditEnabled: true,
      landingLength: 4,
      landingOverrides: ['inherit', 'rest', 'accent', 'on'],
      soundSettings: {
        palette: 'dry-synth',
        pitchMode: 'keyed',
        rootNote: 'A',
        scaleName: 'dorian',
        register: 'mid-low',
        accentPush: 'strong',
      },
      emphasisMode: 'groove',
    },
    { pro: true },
  ),
  withPhraseMask(
    'twenty-three-return',
    'Twenty-Three Return',
    'A long 23-step phrase forced back into a four-bar frame.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 108, barCountForDisplay: 4, backbeatBeat: 3 },
    {
      stepCount: 23,
      activeSteps: [true, false, false, true, false, true, false, false, true, false, false, true, false, true, false, false, true, false, true, false, false, true, false],
      accents: [true, false, false, false, false, true, false, false, false, false, false, true, false, false, false, false, true, false, false, false, false, true, false],
      resetMode: 'every-4-bars',
      resetBars: 4,
      color: RIFF_CYCLE_COLORS[7],
      pitchHz: 96,
      gain: 0.15,
    },
    {
      landingEditEnabled: true,
      landingLength: 5,
      landingOverrides: ['inherit', 'rest', 'inherit', 'accent', 'rest'],
      barMarkerInterval: 'pattern',
      soundSettings: {
        palette: 'muted-djent',
        pitchMode: 'free',
        rootNote: 'F#',
        scaleName: 'aeolian',
        register: 'low',
        accentPush: 'strong',
      },
      emphasisMode: 'analysis',
    },
    { pro: true },
  ),
  withPhraseMask(
    'nine-five-slip',
    'Nine-Five Slip',
    'A compact 9-step phrase inside a 5/4 bar with a clean landing cue.',
    { numerator: 5, denominator: 4, subdivision: 16, bpm: 102, barCountForDisplay: 4, backbeatBeat: 3 },
    {
      stepCount: 9,
      activeSteps: [true, false, true, false, false, true, false, true, false],
      accents: [true, false, false, false, false, true, false, false, false],
      resetMode: 'every-4-bars',
      resetBars: 4,
      color: RIFF_CYCLE_COLORS[6],
      pitchHz: 116,
      gain: 0.13,
    },
    {
      landingEditEnabled: true,
      landingLength: 3,
      landingOverrides: ['rest', 'accent', 'on'],
      barMarkerInterval: 1,
      soundSettings: {
        palette: 'architectural',
        pitchMode: 'keyed',
        rootNote: 'D',
        scaleName: 'minorPentatonic',
        register: 'wide',
        accentPush: 'soft',
      },
      emphasisMode: 'groove',
    },
    { pro: true },
  ),
  withPhraseMask(
    'thirty-one-drift',
    'Thirty-One Drift',
    'A sparse 31-step drift that takes longer to feel settled.',
    { numerator: 4, denominator: 4, subdivision: 20, bpm: 96, barCountForDisplay: 4, backbeatBeat: 3 },
    {
      stepCount: 31,
      activeSteps: [true, false, false, false, true, false, true, false, false, true, false, false, false, true, false, true, false, false, false, true, false, false, true, false, false, false, true, false, true, false, false],
      accents: [true, false, false, false, false, false, true, false, false, false, false, false, false, true, false, false, false, false, false, true, false, false, false, false, false, false, true, false, false, false, false],
      resetMode: 'free',
      resetBars: 8,
      color: RIFF_CYCLE_COLORS[9],
      pitchHz: 84,
      gain: 0.14,
    },
    {
      landingEditEnabled: true,
      landingLength: 6,
      landingOverrides: ['inherit', 'rest', 'inherit', 'accent', 'rest', 'on'],
      showPhraseBounds: true,
      barMarkerInterval: 'pattern',
      soundSettings: {
        palette: 'low-pulse',
        pitchMode: 'keyed',
        rootNote: 'E',
        scaleName: 'aeolian',
        register: 'low',
        accentPush: 'strong',
      },
      emphasisMode: 'analysis',
    },
    { pro: true },
  ),
];

export const DEFAULT_RIFF_CYCLE_PRESET_ID = 'default-riff';

export function createDefaultRiffCycleStudy(): RiffCycleStudy {
  const preset =
    RIFF_CYCLE_PRESETS.find((entry) => entry.id === DEFAULT_RIFF_CYCLE_PRESET_ID) ??
    RIFF_CYCLE_PRESETS[0];
  return cloneRiffCycleStudy(preset.study);
}
