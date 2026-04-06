export type GeometryMode = 'standard-trace' | 'interference-trace' | 'sweep';

export interface InterferenceSettings {
  sourceOrbitAId: string | null;
  sourceOrbitBId: string | null;
  sourceOrbitCId: string | null;
  sourceOrbitDId: string | null;
  showConnectors: boolean;
}

export const DEFAULT_INTERFERENCE_SETTINGS: InterferenceSettings = {
  sourceOrbitAId: null,
  sourceOrbitBId: null,
  sourceOrbitCId: null,
  sourceOrbitDId: null,
  showConnectors: true,
};

export function normalizeInterferenceSettings(
  orbits: Array<{ id: string }>,
  settings?: Partial<InterferenceSettings> | null,
): InterferenceSettings {
  const normalized: InterferenceSettings = {
    sourceOrbitAId: settings?.sourceOrbitAId ?? null,
    sourceOrbitBId: settings?.sourceOrbitBId ?? null,
    sourceOrbitCId: settings?.sourceOrbitCId ?? null,
    sourceOrbitDId: settings?.sourceOrbitDId ?? null,
    showConnectors: settings?.showConnectors ?? true,
  };

  if (orbits.length === 0) {
    return normalized;
  }

  if (orbits.length === 1) {
    return {
      ...normalized,
      sourceOrbitAId: orbits[0].id,
      sourceOrbitBId: null,
      sourceOrbitCId: null,
      sourceOrbitDId: null,
    };
  }

  const orbitIds = new Set(orbits.map((orbit) => orbit.id));
  const fallbackA = orbits[0].id;
  const fallbackB = orbits[1].id;

  let sourceOrbitAId: string =
    normalized.sourceOrbitAId && orbitIds.has(normalized.sourceOrbitAId)
      ? normalized.sourceOrbitAId
      : fallbackA;

  let sourceOrbitBId: string | null =
    normalized.sourceOrbitBId && orbitIds.has(normalized.sourceOrbitBId)
      ? normalized.sourceOrbitBId
      : fallbackB;
  let sourceOrbitCId: string | null =
    normalized.sourceOrbitCId && orbitIds.has(normalized.sourceOrbitCId)
      ? normalized.sourceOrbitCId
      : null;
  let sourceOrbitDId: string | null =
    normalized.sourceOrbitDId && orbitIds.has(normalized.sourceOrbitDId)
      ? normalized.sourceOrbitDId
      : null;

  if (sourceOrbitAId === sourceOrbitBId) {
    const alternative = orbits.find((orbit) => orbit.id !== sourceOrbitAId);
    sourceOrbitBId = alternative?.id ?? null;
  }

  if (
    sourceOrbitCId &&
    (sourceOrbitCId === sourceOrbitAId || sourceOrbitCId === sourceOrbitBId)
  ) {
    sourceOrbitCId = null;
  }

  if (!sourceOrbitCId) {
    sourceOrbitDId = null;
  }

  if (
    sourceOrbitDId &&
    (sourceOrbitDId === sourceOrbitAId ||
      sourceOrbitDId === sourceOrbitBId ||
      sourceOrbitDId === sourceOrbitCId)
  ) {
    sourceOrbitDId = null;
  }

  return {
    sourceOrbitAId,
    sourceOrbitBId,
    sourceOrbitCId,
    sourceOrbitDId,
    showConnectors: normalized.showConnectors,
  };
}
