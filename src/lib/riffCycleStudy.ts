const TAU = Math.PI * 2;

export type RiffCycleSubdivision = 8 | 12 | 16 | 32;
export type RiffCycleViewMode = 'circular' | 'unwrapped';
export type RiffCycleEmphasisMode = 'groove' | 'analysis';
export type LandingOverrideState = 'inherit' | 'rest' | 'on' | 'accent';
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
  referenceSoundEnabled: boolean;
  backbeatSoundEnabled: boolean;
  tailEditEnabled: boolean;
  tailLength: number;
  landingEditEnabled: boolean;
  landingLength: number;
  landingOverrides: LandingOverrideState[];
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

function normalizeSteps(mask: boolean[], stepCount: number): boolean[] {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  return Array.from({ length: normalizedStepCount }, (_, index) => Boolean(mask[index]));
}

function normalizeAccents(mask: boolean[], stepCount: number): boolean[] {
  const normalizedStepCount = normalizeBeatCount(stepCount);
  return Array.from({ length: normalizedStepCount }, (_, index) => Boolean(mask[index]));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)] as T;
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
  const riff = createRiffPhrase(overrides.riff?.stepCount ?? 17, overrides.riff);
  return {
    id: overrides.id ?? generateId('riff-study'),
    name: overrides.name ?? 'Riff Cycle',
    description:
      overrides.description ??
      'A reference bar, a displaced phrase, and a controlled realignment.',
    reference: createReferenceMeter(overrides.reference),
    riff,
    playing: overrides.playing ?? false,
    soundEnabled: overrides.soundEnabled ?? true,
    referenceSoundEnabled: overrides.referenceSoundEnabled ?? true,
    backbeatSoundEnabled: overrides.backbeatSoundEnabled ?? true,
    tailEditEnabled: overrides.tailEditEnabled ?? false,
    tailLength: normalizeTailLength(overrides.tailLength ?? 4, riff.stepCount),
    landingEditEnabled: overrides.landingEditEnabled ?? false,
    landingLength: normalizeLandingLength(
      overrides.landingLength ?? Math.min(4, getReferenceStepsPerBeat(createReferenceMeter(overrides.reference)) * 2),
      getReferenceStepsPerBar(createReferenceMeter(overrides.reference)),
    ),
    landingOverrides: normalizeLandingOverrides(
      overrides.landingOverrides,
      normalizeLandingLength(
        overrides.landingLength ?? Math.min(4, getReferenceStepsPerBeat(createReferenceMeter(overrides.reference)) * 2),
        getReferenceStepsPerBar(createReferenceMeter(overrides.reference)),
      ),
    ),
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
    landingOverrides: [...study.landingOverrides],
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
    active: Boolean(study.riff.activeSteps[phraseIndex]),
    accented: Boolean(study.riff.accents[phraseIndex]),
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
  const subdivision = intensity === 'plus' ? randomChoice([16, 16, 32] as const) : randomChoice([16, 16, 16, 12] as const);
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
      ? randomChoice(['every-2-bars', 'every-4-bars', 'custom-cycle', 'free', 'per-bar'] as const)
      : randomChoice(['free', 'every-2-bars', 'every-4-bars', 'per-bar'] as const);
  return {
    resetMode,
    resetBars: resetMode === 'custom-cycle' ? randomInt(2, 6) : resetMode === 'every-2-bars' ? 2 : 4,
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
      color: randomChoice(RIFF_CYCLE_COLORS),
      pitchHz: intensity === 'plus' ? randomInt(88, 152) : randomInt(98, 142),
      gain: intensity === 'plus' ? 0.14 : 0.12,
      rotationOffset: 0,
    }),
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
      bpm: clamp(remapped.reference.bpm + randomInt(-6, 6), 45, 220),
    },
    riff: {
      ...remapped.riff,
      activeSteps: Math.random() < 0.75 ? mask.activeSteps : remapped.riff.activeSteps,
      accents: Math.random() < 0.75 ? mask.accents : remapped.riff.accents,
      resetMode: returnMode.resetMode,
      resetBars: returnMode.resetBars,
      rotationOffset: 0,
    },
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
