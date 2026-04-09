const TAU = Math.PI * 2;

export type RiffCycleSubdivision = 8 | 12 | 16 | 32;
export type RiffCycleViewMode = 'circular' | 'unwrapped';
export type RiffCycleEmphasisMode = 'groove' | 'analysis';
export type RiffPhraseResetMode =
  | 'free'
  | 'per-bar'
  | 'every-2-bars'
  | 'every-4-bars'
  | 'custom-cycle';

export interface ReferenceMeter {
  numerator: number;
  denominator: number;
  subdivision: RiffCycleSubdivision;
  bpm: number;
  barCountForDisplay: number;
  showBackbeat: boolean;
  backbeatBeat: number | null;
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

export interface RiffCycleStudy {
  id: string;
  name: string;
  description: string;
  reference: ReferenceMeter;
  riff: RiffPhrase;
  playing: boolean;
  soundEnabled: boolean;
  showReferenceRing: boolean;
  showPhraseRing: boolean;
  showStepLabels: boolean;
  showAlignmentMarkers: boolean;
  showDriftTrail: boolean;
  viewMode: RiffCycleViewMode;
  emphasisMode: RiffCycleEmphasisMode;
}

export interface RiffCyclePreset {
  id: string;
  name: string;
  description: string;
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

export const RIFF_CYCLE_COLORS = [
  '#72F1B8',
  '#FFD166',
  '#FF88C2',
  '#7FD7FF',
  '#FF7A7A',
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
  if (value === 8 || value === 12 || value === 16 || value === 32) {
    return value;
  }
  return 16;
}

function normalizeBeatCount(value: number): number {
  return clamp(Math.round(value || 0), 3, 64);
}

function normalizeRotationOffset(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function normalizeBpm(value: number): number {
  return clamp(Math.round(value || 0), 45, 220);
}

function normalizeGain(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0.12, 0.02, 0.32);
}

function normalizePitch(value: number): number {
  return clamp(Math.round(value || 0), 80, 1600);
}

function normalizeBars(value: number): number {
  return clamp(Math.round(value || 0), 1, 8);
}

function normalizeSteps(mask: boolean[], stepCount: number): boolean[] {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  return Array.from({ length: normalizedStepCount }, (_, index) => Boolean(mask[index]));
}

function normalizeAccents(mask: boolean[], stepCount: number): boolean[] {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  return Array.from({ length: normalizedStepCount }, (_, index) => Boolean(mask[index]));
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
  return {
    numerator: clamp(Math.round(overrides.numerator ?? 4), 2, 11),
    denominator: overrides.denominator === 8 ? 8 : 4,
    subdivision: normalizeSubdivision(overrides.subdivision ?? 16),
    bpm: normalizeBpm(overrides.bpm ?? 112),
    barCountForDisplay: normalizeBars(overrides.barCountForDisplay ?? 4),
    showBackbeat: overrides.showBackbeat ?? true,
    backbeatBeat: overrides.backbeatBeat ?? 3,
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
  return {
    id: overrides.id ?? generateId('riff-study'),
    name: overrides.name ?? 'Riff Cycle',
    description:
      overrides.description ??
      'A reference bar, a displaced phrase, and a controlled realignment.',
    reference: createReferenceMeter(overrides.reference),
    riff: createRiffPhrase(overrides.riff?.stepCount ?? 17, overrides.riff),
    playing: overrides.playing ?? false,
    soundEnabled: overrides.soundEnabled ?? true,
    showReferenceRing: overrides.showReferenceRing ?? true,
    showPhraseRing: overrides.showPhraseRing ?? true,
    showStepLabels: overrides.showStepLabels ?? false,
    showAlignmentMarkers: overrides.showAlignmentMarkers ?? true,
    showDriftTrail: overrides.showDriftTrail ?? true,
    viewMode: overrides.viewMode ?? 'unwrapped',
    emphasisMode: overrides.emphasisMode ?? 'analysis',
  };
}

export function cloneRiffCycleStudy(study: RiffCycleStudy): RiffCycleStudy {
  return {
    ...study,
    reference: { ...study.reference },
    riff: {
      ...study.riff,
      activeSteps: [...study.riff.activeSteps],
      accents: [...study.riff.accents],
    },
  };
}

export function getReferenceStepsPerBeat(reference: ReferenceMeter): number {
  return Math.max(1, Math.round(reference.subdivision / reference.denominator));
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
    case 'custom-cycle':
      return normalizeBars(riff.resetBars);
    default:
      return 4;
  }
}

export function getResetStepCount(study: RiffCycleStudy): number | null {
  const resetBars = getResetBarCount(study.riff);
  if (resetBars == null) {
    return null;
  }
  return getReferenceStepsPerBar(study.reference) * resetBars;
}

export function getRiffStepIndexAtReferenceStep(
  study: RiffCycleStudy,
  referenceStep: number,
): number {
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
  if (!study.reference.showBackbeat || !study.reference.backbeatBeat) {
    return false;
  }
  return (
    isReferenceBeatStart(study, referenceStep) &&
    getBeatIndexWithinBar(study, referenceStep) === study.reference.backbeatBeat - 1
  );
}

export function getDownbeatSteps(study: RiffCycleStudy): number[] {
  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  return Array.from({ length: study.reference.barCountForDisplay }, (_, index) => index * stepsPerBar);
}

export function getDriftStepOffsets(study: RiffCycleStudy): number[] {
  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  const resetBars = getResetBarCount(study.riff) ?? study.reference.barCountForDisplay;
  const count = Math.min(study.reference.barCountForDisplay, resetBars);
  return Array.from({ length: count }, (_, index) => (index * stepsPerBar) % study.riff.stepCount);
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
  };
}

function withPhraseMask(
  id: string,
  name: string,
  description: string,
  reference: Partial<ReferenceMeter>,
  riff: Partial<RiffPhrase> & { stepCount: number; activeSteps: boolean[] },
): RiffCyclePreset {
  return {
    id,
    name,
    description,
    study: createRiffCycleStudy({
      name,
      description,
      reference: createReferenceMeter(reference),
      riff: createRiffPhrase(riff.stepCount, riff),
    }),
  };
}

export const RIFF_CYCLE_PRESETS: RiffCyclePreset[] = [
  withPhraseMask(
    'seventeen-free',
    '4/4 + 17-Step Phrase',
    'A steady 4/4 frame with an odd-length phrase drifting across it.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 112, barCountForDisplay: 4 },
    {
      stepCount: 17,
      activeSteps: [true, false, false, true, false, true, false, false, true, false, true, false, false, true, false, true, false],
      accents: [true, false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      resetMode: 'free',
      color: RIFF_CYCLE_COLORS[0],
      pitchHz: 118,
      gain: 0.13,
    },
  ),
  withPhraseMask(
    'seventeen-reset-four',
    '4/4 Reset Every 4 Bars',
    'The same odd phrase is forced back to the downbeat every four bars.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 112, barCountForDisplay: 4 },
    {
      stepCount: 17,
      activeSteps: [true, false, false, true, false, true, false, false, true, false, true, false, false, true, false, true, false],
      accents: [true, false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      resetMode: 'every-4-bars',
      resetBars: 4,
      color: RIFF_CYCLE_COLORS[1],
      pitchHz: 104,
      gain: 0.14,
    },
  ),
  withPhraseMask(
    'seventeen-reset-two',
    '4/4 Reset Every 2 Bars',
    'A shorter structural leash: displacement, then a faster forced return.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 118, barCountForDisplay: 4 },
    {
      stepCount: 17,
      activeSteps: [true, false, true, false, false, true, false, true, false, false, true, false, true, false, false, true, false],
      accents: [true, false, false, false, false, true, false, false, false, false, true, false, false, false, false, true, false],
      resetMode: 'every-2-bars',
      resetBars: 2,
      color: RIFF_CYCLE_COLORS[2],
      pitchHz: 136,
      gain: 0.13,
    },
  ),
  withPhraseMask(
    'five-four-twelve',
    '5/4 Against 12-Step Phrase',
    'A wider bar with a compact phrase crossing its internal landmarks.',
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
  ),
  withPhraseMask(
    'sparse-kick',
    'Sparse Kick Riff',
    'A restrained phrase that makes displacement and reset easy to hear.',
    { numerator: 4, denominator: 4, subdivision: 16, bpm: 100, barCountForDisplay: 4 },
    {
      stepCount: 19,
      activeSteps: [true, false, false, false, true, false, false, true, false, false, false, true, false, false, true, false, false, false, true],
      accents: [true, false, false, false, false, false, false, true, false, false, false, false, false, false, true, false, false, false, false],
      resetMode: 'every-4-bars',
      resetBars: 4,
      color: RIFF_CYCLE_COLORS[4],
      pitchHz: 92,
      gain: 0.16,
    },
  ),
  withPhraseMask(
    'snare-on-three',
    'Snare-On-3 Study',
    'A simple phrase against a clear 4/4 backbeat anchor.',
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
  ),
];

export const DEFAULT_RIFF_CYCLE_PRESET_ID = 'seventeen-reset-four';

export function createDefaultRiffCycleStudy(): RiffCycleStudy {
  const preset =
    RIFF_CYCLE_PRESETS.find((entry) => entry.id === DEFAULT_RIFF_CYCLE_PRESET_ID) ??
    RIFF_CYCLE_PRESETS[0];
  return cloneRiffCycleStudy(preset.study);
}
