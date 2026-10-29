import { drawDistantPlanet, normalizeDistantPlanets, type DistantPlanetPair } from './distantPlanets';

export type CanvasDisplayThemeId =
  | 'classic'
  | 'void'
  | 'deep-space'
  | 'nebula'
  | 'aurora'
  | 'solar'
  | 'glass'
  | 'paper-dark'
  | 'focus';

export type CanvasAtmosphereId =
  | 'none'
  | 'stars'
  | 'dust'
  | 'nebula-haze'
  | 'orbital-grid'
  | 'deep-field'
  | 'distant-planets';

export type CanvasGlowLevel = 'low' | 'medium' | 'high';
export type CanvasSubdivisionGuideMode = 'off' | 'minimal' | 'subdivisions';
export type CanvasSubdivisionGuideCycleBars = 2 | 4 | 8 | 16;
export type CanvasInnerClockMode = 'off' | 'minimal' | 'full';

export interface CanvasSubdivisionGuideAutomation {
  enabled: boolean;
  cycleBars: CanvasSubdivisionGuideCycleBars;
  modes: CanvasSubdivisionGuideMode[];
}

export interface CanvasInnerClockAutomation {
  enabled: boolean;
  cycleBars: CanvasSubdivisionGuideCycleBars;
  modes: CanvasInnerClockMode[];
}

export interface CanvasDisplaySettings {
  theme: CanvasDisplayThemeId;
  atmosphere: CanvasAtmosphereId;
  distantPlanets?: DistantPlanetPair;
  glow: CanvasGlowLevel;
  squareGrid?: boolean;
  centerAxes?: boolean;
  subdivisionGuide?: CanvasSubdivisionGuideMode;
  subdivisionGuideAutomation?: CanvasSubdivisionGuideAutomation;
  innerClock?: CanvasInnerClockMode;
  innerClockAutomation?: CanvasInnerClockAutomation;
  subdivisionGrid?: boolean;
  showCellStrip?: boolean;
  showMeterNumbers?: boolean;
}

export function getEffectiveInnerClockMode(
  settings: CanvasDisplaySettings | undefined,
  absoluteReferenceStep: number,
  stepsPerBar: number,
): CanvasInnerClockMode {
  const manualMode = settings?.innerClock ?? 'full';
  const automation = settings?.innerClockAutomation;
  if (!automation?.enabled || automation.modes.length === 0) {
    return manualMode;
  }

  const bar = Math.floor(absoluteReferenceStep / Math.max(1, stepsPerBar));
  const cycleIndex =
    Math.floor(bar / Math.max(1, automation.cycleBars)) % automation.modes.length;
  return automation.modes[cycleIndex] ?? manualMode;
}

interface CanvasDisplayTheme {
  id: CanvasDisplayThemeId;
  label: string;
  shortLabel: string;
  summary: string;
  base: string;
  gradient: string[];
  swatch: string[];
  lineAlpha: number;
  inactiveAlpha: number;
  glowMultiplier: number;
  vignetteAlpha: number;
}

interface AtmosphereParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  hue: number;
}

export const DEFAULT_CANVAS_DISPLAY_SETTINGS: CanvasDisplaySettings = {
  theme: 'classic',
  atmosphere: 'none',
  glow: 'medium',
  squareGrid: true,
  centerAxes: true,
  subdivisionGuide: 'off',
  subdivisionGuideAutomation: {
    enabled: false,
    cycleBars: 8,
    modes: ['off', 'minimal'],
  },
  innerClock: 'full',
  innerClockAutomation: {
    enabled: false,
    cycleBars: 8,
    modes: ['off', 'full'],
  },
  subdivisionGrid: false,
  showCellStrip: true,
  showMeterNumbers: true,
};

export const DEFAULT_RIFF_DISPLAY_SETTINGS: CanvasDisplaySettings = {
  ...DEFAULT_CANVAS_DISPLAY_SETTINGS,
  subdivisionGuide: 'off',
  subdivisionGrid: false,
  showCellStrip: true,
  showMeterNumbers: true,
};

export const CANVAS_DISPLAY_THEMES: Record<CanvasDisplayThemeId, CanvasDisplayTheme> = {
  classic: {
    id: 'classic',
    label: 'Classic',
    shortLabel: 'Classic',
    summary: 'original dark canvas',
    base: '#111116',
    gradient: ['rgba(255,255,255,0.018)', 'rgba(255,255,255,0.012)', 'rgba(0,0,0,0)'],
    swatch: ['#111116', '#24242d', '#f4f4ff'],
    lineAlpha: 1,
    inactiveAlpha: 1,
    glowMultiplier: 1,
    vignetteAlpha: 0.12,
  },
  void: {
    id: 'void',
    label: 'Void',
    shortLabel: 'Void',
    summary: 'black clarity',
    base: '#05060a',
    gradient: ['rgba(255,255,255,0.035)', 'rgba(86,116,255,0.055)', 'rgba(0,0,0,0)'],
    swatch: ['#05060a', '#11131d', '#f4f7ff'],
    lineAlpha: 0.92,
    inactiveAlpha: 0.82,
    glowMultiplier: 0.82,
    vignetteAlpha: 0.34,
  },
  'deep-space': {
    id: 'deep-space',
    label: 'Deep Space',
    shortLabel: 'Space',
    summary: 'stars + blue depth',
    base: '#060817',
    gradient: ['rgba(77,116,255,0.18)', 'rgba(91,255,218,0.08)', 'rgba(255,255,255,0.035)'],
    swatch: ['#060817', '#3149ff', '#72f1b8'],
    lineAlpha: 1,
    inactiveAlpha: 0.88,
    glowMultiplier: 1,
    vignetteAlpha: 0.38,
  },
  nebula: {
    id: 'nebula',
    label: 'Nebula',
    shortLabel: 'Nebula',
    summary: 'violet haze',
    base: '#080512',
    gradient: ['rgba(182,113,255,0.22)', 'rgba(62,218,255,0.13)', 'rgba(255,112,189,0.12)'],
    swatch: ['#080512', '#b671ff', '#3edaff'],
    lineAlpha: 1.04,
    inactiveAlpha: 0.86,
    glowMultiplier: 1.18,
    vignetteAlpha: 0.42,
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora',
    shortLabel: 'Aurora',
    summary: 'green cyan field',
    base: '#03100f',
    gradient: ['rgba(80,255,190,0.19)', 'rgba(96,165,255,0.12)', 'rgba(230,255,190,0.08)'],
    swatch: ['#03100f', '#50ffbe', '#60a5ff'],
    lineAlpha: 1,
    inactiveAlpha: 0.88,
    glowMultiplier: 1.08,
    vignetteAlpha: 0.36,
  },
  solar: {
    id: 'solar',
    label: 'Solar',
    shortLabel: 'Solar',
    summary: 'warm edge glow',
    base: '#120806',
    gradient: ['rgba(255,175,65,0.22)', 'rgba(255,70,106,0.13)', 'rgba(255,226,141,0.08)'],
    swatch: ['#120806', '#ffaf41', '#ff466a'],
    lineAlpha: 1.02,
    inactiveAlpha: 0.84,
    glowMultiplier: 1.12,
    vignetteAlpha: 0.4,
  },
  glass: {
    id: 'glass',
    label: 'Glass',
    shortLabel: 'Glass',
    summary: 'cool high-tech',
    base: '#071018',
    gradient: ['rgba(174,226,255,0.15)', 'rgba(105,130,180,0.1)', 'rgba(255,255,255,0.045)'],
    swatch: ['#071018', '#aee2ff', '#6982b4'],
    lineAlpha: 1.08,
    inactiveAlpha: 0.92,
    glowMultiplier: 0.96,
    vignetteAlpha: 0.32,
  },
  'paper-dark': {
    id: 'paper-dark',
    label: 'Paper Dark',
    shortLabel: 'Paper',
    summary: 'warm readable',
    base: '#12100d',
    gradient: ['rgba(255,220,160,0.09)', 'rgba(110,92,72,0.08)', 'rgba(255,255,255,0.02)'],
    swatch: ['#12100d', '#e2c086', '#5d5247'],
    lineAlpha: 1.16,
    inactiveAlpha: 1,
    glowMultiplier: 0.58,
    vignetteAlpha: 0.22,
  },
  focus: {
    id: 'focus',
    label: 'Focus',
    shortLabel: 'Focus',
    summary: 'maximum clarity',
    base: '#090a0e',
    gradient: ['rgba(255,255,255,0.05)', 'rgba(120,140,180,0.045)', 'rgba(0,0,0,0)'],
    swatch: ['#090a0e', '#dce6ff', '#576078'],
    lineAlpha: 1.22,
    inactiveAlpha: 1,
    glowMultiplier: 0.46,
    vignetteAlpha: 0.16,
  },
};

export const CANVAS_DISPLAY_THEME_OPTIONS = Object.values(CANVAS_DISPLAY_THEMES);

export const CANVAS_ATMOSPHERE_OPTIONS: Array<{
  id: CanvasAtmosphereId;
  label: string;
  summary: string;
}> = [
  { id: 'none', label: 'Void', summary: 'clean black depth' },
  { id: 'stars', label: 'Stars', summary: 'sharp night points' },
  { id: 'deep-field', label: 'Deep Field', summary: 'distant arcs and glints' },
  { id: 'dust', label: 'Fine Dust', summary: 'warm suspended grain and softly blurred motes' },
  { id: 'nebula-haze', label: 'Nebula Veil', summary: 'distant gas clouds and dark dust wisps' },
  { id: 'distant-planets', label: 'Distant Planets', summary: 'quiet planets, stars, and a soft Milky Way' },
];

export const CANVAS_GLOW_OPTIONS: Array<{
  id: CanvasGlowLevel;
  label: string;
  multiplier: number;
}> = [
  { id: 'low', label: 'Low', multiplier: 0.72 },
  { id: 'medium', label: 'Med', multiplier: 1 },
  { id: 'high', label: 'High', multiplier: 1.34 },
];

const particleCache = new Map<string, AtmosphereParticle[]>();

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function getParticles(
  width: number,
  height: number,
  atmosphere: CanvasAtmosphereId,
  seed: number,
  count: number,
): AtmosphereParticle[] {
  const widthBucket = Math.max(1, Math.round(width / 96));
  const heightBucket = Math.max(1, Math.round(height / 96));
  const cacheKey = `${atmosphere}:${seed}:${widthBucket}:${heightBucket}:${count}`;
  const cached = particleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const random = createSeededRandom(seed + widthBucket * 1009 + heightBucket * 9176);
  const particles = Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    radius:
      atmosphere === 'dust'
        ? 0.5 + random() * 1.3
        : atmosphere === 'deep-field'
          ? 0.25 + random() * 1.35
          : 0.42 + random() * 0.95,
    alpha:
      atmosphere === 'dust'
        ? 0.18 + random() * 0.26
        : atmosphere === 'deep-field'
          ? 0.12 + random() * 0.42
          : 0.18 + random() * 0.58,
    hue: random(),
  }));

  if (particleCache.size > 48) {
    particleCache.clear();
  }
  particleCache.set(cacheKey, particles);
  return particles;
}

function clampDisplayTheme(value: unknown): CanvasDisplayThemeId {
  return typeof value === 'string' && value in CANVAS_DISPLAY_THEMES
    ? (value as CanvasDisplayThemeId)
    : DEFAULT_CANVAS_DISPLAY_SETTINGS.theme;
}

function clampAtmosphere(value: unknown): CanvasAtmosphereId {
  if (value === 'light-ribbons') return 'distant-planets';
  return CANVAS_ATMOSPHERE_OPTIONS.some((option) => option.id === value)
    ? (value as CanvasAtmosphereId)
    : DEFAULT_CANVAS_DISPLAY_SETTINGS.atmosphere;
}

function clampGlow(value: unknown): CanvasGlowLevel {
  return CANVAS_GLOW_OPTIONS.some((option) => option.id === value)
    ? (value as CanvasGlowLevel)
    : DEFAULT_CANVAS_DISPLAY_SETTINGS.glow;
}

function clampSubdivisionGuide(
  value: unknown,
  legacyGridValue: unknown,
  fallback: CanvasSubdivisionGuideMode | undefined,
): CanvasSubdivisionGuideMode {
  if (value === 'off' || value === 'minimal' || value === 'subdivisions') {
    return value;
  }
  if (typeof legacyGridValue === 'boolean') {
    return legacyGridValue ? 'subdivisions' : 'off';
  }
  return fallback ?? DEFAULT_CANVAS_DISPLAY_SETTINGS.subdivisionGuide ?? 'off';
}

function clampSubdivisionGuideCycleBars(value: unknown): CanvasSubdivisionGuideCycleBars {
  return value === 2 || value === 4 || value === 8 || value === 16 ? value : 8;
}

function clampInnerClockMode(value: unknown, fallback: CanvasInnerClockMode | undefined): CanvasInnerClockMode {
  if (value === 'off' || value === 'minimal' || value === 'full') {
    return value;
  }
  return fallback ?? DEFAULT_CANVAS_DISPLAY_SETTINGS.innerClock ?? 'full';
}

function normalizeSubdivisionGuideAutomation(
  value: Partial<CanvasSubdivisionGuideAutomation> | null | undefined,
  fallback: CanvasSubdivisionGuideAutomation | undefined,
): CanvasSubdivisionGuideAutomation {
  const fallbackAutomation =
    fallback ??
    DEFAULT_CANVAS_DISPLAY_SETTINGS.subdivisionGuideAutomation ?? {
      enabled: false,
      cycleBars: 8,
      modes: ['off', 'minimal'],
    };
  const sourceModes = Array.isArray(value?.modes) ? value.modes : fallbackAutomation.modes;
  const normalizedModes = sourceModes
    .slice(0, 8)
    .map((mode, index) =>
      clampSubdivisionGuide(
        mode,
        undefined,
        fallbackAutomation.modes[index] ?? fallbackAutomation.modes[0] ?? 'off',
      ),
    );
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : fallbackAutomation.enabled,
    cycleBars: clampSubdivisionGuideCycleBars(value?.cycleBars ?? fallbackAutomation.cycleBars),
    modes: normalizedModes.length > 0 ? normalizedModes : ['off', 'minimal'],
  };
}

function normalizeInnerClockAutomation(
  value: Partial<CanvasInnerClockAutomation> | null | undefined,
  fallback: CanvasInnerClockAutomation | undefined,
): CanvasInnerClockAutomation {
  const fallbackAutomation =
    fallback ??
    DEFAULT_CANVAS_DISPLAY_SETTINGS.innerClockAutomation ?? {
      enabled: false,
      cycleBars: 8,
      modes: ['off', 'full'],
    };
  const sourceModes = Array.isArray(value?.modes) ? value.modes : fallbackAutomation.modes;
  const normalizedModes = sourceModes
    .slice(0, 8)
    .map((mode, index) =>
      clampInnerClockMode(mode, fallbackAutomation.modes[index] ?? fallbackAutomation.modes[0] ?? 'full'),
    );
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : fallbackAutomation.enabled,
    cycleBars: clampSubdivisionGuideCycleBars(value?.cycleBars ?? fallbackAutomation.cycleBars),
    modes: normalizedModes.length > 0 ? normalizedModes : ['off', 'full'],
  };
}

export function normalizeCanvasDisplaySettings(
  value: Partial<CanvasDisplaySettings> | null | undefined,
  fallback: CanvasDisplaySettings = DEFAULT_CANVAS_DISPLAY_SETTINGS,
): CanvasDisplaySettings {
  const subdivisionGuide = clampSubdivisionGuide(
    value?.subdivisionGuide,
    value?.subdivisionGrid,
    fallback.subdivisionGuide,
  );
  return {
    theme: value?.theme ? clampDisplayTheme(value.theme) : fallback.theme,
    atmosphere: value?.atmosphere ? clampAtmosphere(value.atmosphere) : fallback.atmosphere,
    glow: value?.glow ? clampGlow(value.glow) : fallback.glow,
    distantPlanets: normalizeDistantPlanets(value?.distantPlanets, fallback.distantPlanets),
    squareGrid: typeof value?.squareGrid === 'boolean' ? value.squareGrid : fallback.squareGrid,
    centerAxes: typeof value?.centerAxes === 'boolean' ? value.centerAxes : fallback.centerAxes,
    subdivisionGuide,
    subdivisionGuideAutomation: normalizeSubdivisionGuideAutomation(
      value?.subdivisionGuideAutomation,
      fallback.subdivisionGuideAutomation,
    ),
    innerClock: clampInnerClockMode(value?.innerClock, fallback.innerClock),
    innerClockAutomation: normalizeInnerClockAutomation(
      value?.innerClockAutomation,
      fallback.innerClockAutomation,
    ),
    subdivisionGrid: subdivisionGuide === 'subdivisions',
    showCellStrip: typeof value?.showCellStrip === 'boolean' ? value.showCellStrip : fallback.showCellStrip,
    showMeterNumbers: typeof value?.showMeterNumbers === 'boolean' ? value.showMeterNumbers : fallback.showMeterNumbers,
  };
}

export function getCanvasDisplayTheme(themeId: CanvasDisplayThemeId): CanvasDisplayTheme {
  return CANVAS_DISPLAY_THEMES[themeId] ?? CANVAS_DISPLAY_THEMES[DEFAULT_CANVAS_DISPLAY_SETTINGS.theme];
}

export function getCanvasGlowMultiplier(
  settings: CanvasDisplaySettings,
  presentationMode = false,
): number {
  const theme = getCanvasDisplayTheme(settings.theme);
  const glow = CANVAS_GLOW_OPTIONS.find((option) => option.id === settings.glow)?.multiplier ?? 1;
  return theme.glowMultiplier * glow * (presentationMode ? 1.16 : 1);
}

export function getCanvasLineAlpha(settings: CanvasDisplaySettings): number {
  return getCanvasDisplayTheme(settings.theme).lineAlpha;
}

export function getCanvasInactiveAlpha(settings: CanvasDisplaySettings): number {
  return getCanvasDisplayTheme(settings.theme).inactiveAlpha;
}

export function drawCanvasDisplayBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: CanvasDisplaySettings,
  options: {
    presentationMode?: boolean;
    seed?: number;
    hideBackdropBloom?: boolean;
  } = {},
): void {
  const theme = getCanvasDisplayTheme(settings.theme);
  const presentationMode = Boolean(options.presentationMode);
  const seed = options.seed ?? 17;
  const atmosphere = settings.atmosphere;
  const intensity = presentationMode ? 1.25 : 0.82;
  const centerX = width * 0.5;
  const centerY = height * 0.47;
  const radius = Math.max(width, height);

  ctx.save();
  ctx.fillStyle = theme.base;
  ctx.fillRect(0, 0, width, height);

  if (!options.hideBackdropBloom) {
    const mainGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.05, centerX, centerY, radius * 0.72);
    mainGradient.addColorStop(0, theme.gradient[0]);
    mainGradient.addColorStop(0.42, theme.gradient[1]);
    mainGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mainGradient;
    ctx.globalAlpha = intensity;
    ctx.fillRect(0, 0, width, height);

    const sideGradient = ctx.createRadialGradient(width * 0.82, height * 0.16, 0, width * 0.82, height * 0.16, radius * 0.52);
    sideGradient.addColorStop(0, theme.gradient[2]);
    sideGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = presentationMode ? 0.86 : 0.56;
    ctx.fillStyle = sideGradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (!options.hideBackdropBloom && atmosphere === 'deep-field') {
    const hazeA = ctx.createRadialGradient(width * 0.22, height * 0.78, 0, width * 0.22, height * 0.78, radius * 0.46);
    hazeA.addColorStop(0, theme.gradient[1]);
    hazeA.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = presentationMode ? 0.44 : 0.24;
    ctx.fillStyle = hazeA;
    ctx.fillRect(0, 0, width, height);

    const hazeB = ctx.createRadialGradient(width * 0.76, height * 0.7, 0, width * 0.76, height * 0.7, radius * 0.38);
    hazeB.addColorStop(0, theme.gradient[0]);
    hazeB.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = presentationMode ? 0.32 : 0.16;
    ctx.fillStyle = hazeB;
    ctx.fillRect(0, 0, width, height);
  }

  if (atmosphere === 'nebula-haze') {
    const unit = Math.min(width, height);
    const random = createSeededRandom(seed + 8041);
    const cloudColors = ['#716a8a', '#586e8c', '#846c80'];
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    // Uneven overlapping gas clouds, concentrated off-center. Every edge fades
    // to transparent, avoiding the solid ellipses of the old veil.
    for (let index = 0; index < 32; index += 1) {
      const rightCluster = index % 2 === 0;
      const x = width * ((rightCluster ? 0.78 : 0.16) + (random() - 0.5) * 0.36);
      const y = height * ((rightCluster ? 0.27 : 0.74) + (random() - 0.5) * 0.3);
      const cloudRadius = unit * (0.07 + random() * 0.16);
      const cloud = ctx.createRadialGradient(x, y, 0, x, y, cloudRadius);
      cloud.addColorStop(0, cloudColors[index % cloudColors.length]);
      cloud.addColorStop(0.35, cloudColors[(index + 1) % cloudColors.length]);
      cloud.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = (presentationMode ? 0.065 : 0.05) * (0.5 + random() * 0.5);
      ctx.fillStyle = cloud;
      ctx.fillRect(x - cloudRadius, y - cloudRadius, cloudRadius * 2, cloudRadius * 2);
    }

    // Soft dark pockets break up the gas into irregular wisps and dust lanes.
    ctx.globalCompositeOperation = 'source-over';
    for (let index = 0; index < 14; index += 1) {
      const rightCluster = index % 2 === 0;
      const x = width * ((rightCluster ? 0.78 : 0.16) + (random() - 0.5) * 0.28);
      const y = height * ((rightCluster ? 0.27 : 0.74) + (random() - 0.5) * 0.24);
      const dustRadius = unit * (0.025 + random() * 0.075);
      const dust = ctx.createRadialGradient(x, y, 0, x, y, dustRadius);
      dust.addColorStop(0, 'rgba(5,7,14,0.28)');
      dust.addColorStop(1, 'rgba(5,7,14,0)');
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = dust;
      ctx.fillRect(x - dustRadius, y - dustRadius, dustRadius * 2, dustRadius * 2);
    }

    const embeddedStars = getParticles(width, height, atmosphere, seed + 29, 36);
    ctx.globalCompositeOperation = 'screen';
    embeddedStars.forEach((star) => {
      ctx.globalAlpha = star.alpha * (presentationMode ? 0.32 : 0.24);
      ctx.fillStyle = '#c6ccdc';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  if (atmosphere === 'distant-planets') {
    const unit = Math.min(width, height);
    const skyStars = getParticles(width, height, atmosphere, seed, 90);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    skyStars.forEach((star) => {
      ctx.globalAlpha = star.alpha * (presentationMode ? 0.58 : 0.42);
      ctx.fillStyle = star.hue > 0.75 ? '#aabed7' : '#dce2eb';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // A feathered, irregular band with tiny clustered stars, not a hard stripe.
    const span = Math.hypot(width, height);
    ctx.translate(width * 0.5, height * 0.46);
    ctx.rotate(-0.62);
    const galaxy = ctx.createLinearGradient(0, -unit * 0.19, 0, unit * 0.19);
    galaxy.addColorStop(0, 'rgba(143,154,192,0)');
    galaxy.addColorStop(0.28, 'rgba(143,154,192,0.025)');
    galaxy.addColorStop(0.47, 'rgba(196,192,211,0.085)');
    galaxy.addColorStop(0.6, 'rgba(149,173,194,0.045)');
    galaxy.addColorStop(1, 'rgba(143,154,192,0)');
    ctx.globalAlpha = presentationMode ? 0.9 : 0.7;
    ctx.fillStyle = galaxy;
    ctx.fillRect(-span * 0.5, -unit * 0.19, span, unit * 0.38);

    const galaxyStars = getParticles(width, height, atmosphere, seed + 181, 180);
    galaxyStars.forEach((star) => {
      const x = (star.x / width - 0.5) * span;
      const spread = star.y / height - 0.5;
      const y = Math.sign(spread) * spread * spread * unit * 0.45
        + Math.sin(x / unit * 7) * unit * 0.018;
      ctx.globalAlpha = star.alpha * (presentationMode ? 0.32 : 0.24);
      ctx.fillStyle = star.hue > 0.5 ? '#b3bfd7' : '#d5c9bf';
      ctx.beginPath();
      ctx.arc(x, y, star.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = presentationMode ? 0.19 : 0.15;

    // Slot positions, sizes and atmosphere opacity stay fixed when a world changes.
    const planets = normalizeDistantPlanets(settings.distantPlanets);
    drawDistantPlanet(ctx, planets[0], width * 0.15, height * 0.24, unit * 0.047);
    drawDistantPlanet(ctx, planets[1], width * 0.87, height * 0.74, unit * 0.038);
    ctx.restore();
  }

  if (atmosphere === 'dust') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const dustGlow = ctx.createRadialGradient(width * 0.3, height * 0.28, 0, width * 0.3, height * 0.28, radius * 0.62);
    dustGlow.addColorStop(0, 'rgba(218,189,139,0.1)');
    dustGlow.addColorStop(0.48, 'rgba(173,151,117,0.045)');
    dustGlow.addColorStop(1, 'rgba(173,151,117,0)');
    ctx.globalAlpha = presentationMode ? 0.85 : 0.7;
    ctx.fillStyle = dustGlow;
    ctx.fillRect(0, 0, width, height);

    const grains = getParticles(width, height, atmosphere, seed, 440);
    grains.forEach((grain, index) => {
      // Patchy density gives the grain depth instead of an even star field.
      const density = 0.35 + 0.65 * Math.pow(
        Math.sin(grain.x / width * 8 + grain.y / height * 5), 2,
      );
      ctx.globalAlpha = grain.alpha * density * (presentationMode ? 1 : 0.85);
      ctx.fillStyle = grain.hue > 0.55 ? '#c9b58f' : '#9f9686';
      ctx.beginPath();
      ctx.ellipse(grain.x, grain.y, grain.radius * 0.65, grain.radius * 0.28,
        grain.hue * Math.PI, 0, Math.PI * 2);
      ctx.fill();

      // Occasional out-of-focus motes have no bright core or sparkle.
      if (index % 19 === 0) {
        const moteRadius = 3 + grain.radius * 4;
        const mote = ctx.createRadialGradient(grain.x, grain.y, 0, grain.x, grain.y, moteRadius);
        mote.addColorStop(0, 'rgba(206,182,139,0.2)');
        mote.addColorStop(0.4, 'rgba(206,182,139,0.13)');
        mote.addColorStop(1, 'rgba(206,182,139,0)');
        ctx.globalAlpha = density * (presentationMode ? 0.6 : 0.45);
        ctx.fillStyle = mote;
        ctx.fillRect(grain.x - moteRadius, grain.y - moteRadius, moteRadius * 2, moteRadius * 2);
      }
    });
    ctx.restore();
  }

  if (!options.hideBackdropBloom && (atmosphere === 'orbital-grid' || atmosphere === 'deep-field')) {
    ctx.globalAlpha =
      atmosphere === 'orbital-grid'
        ? presentationMode ? 0.5 : 0.34
        : presentationMode ? 0.22 : 0.14;
    ctx.strokeStyle =
      atmosphere === 'orbital-grid'
        ? 'rgba(180,220,255,0.12)'
        : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let index = 0; index < 7; index += 1) {
      const arcRadius = radius * (0.18 + index * 0.075);
      ctx.beginPath();
      ctx.arc(centerX, centerY, arcRadius, Math.PI * 0.12, Math.PI * 1.88);
      ctx.stroke();
    }
    ctx.globalAlpha =
      atmosphere === 'orbital-grid'
        ? presentationMode ? 0.24 : 0.16
        : presentationMode ? 0.14 : 0.08;
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.stroke();
    }
  }

  if (!options.hideBackdropBloom && atmosphere === 'deep-field') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 1;
    for (let index = 0; index < 9; index += 1) {
      const arcRadius = radius * (0.16 + index * 0.062);
      const start = Math.PI * (0.08 + index * 0.11);
      const end = start + Math.PI * (0.24 + (index % 3) * 0.08);
      ctx.globalAlpha = presentationMode ? 0.18 : 0.11;
      ctx.strokeStyle = index % 2 === 0 ? theme.swatch[1] : theme.swatch[2];
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.48, arcRadius, start, end);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (atmosphere === 'stars' || atmosphere === 'deep-field') {
    const count = atmosphere === 'deep-field' ? 70 : 56;
    const particles = getParticles(width, height, atmosphere, seed, presentationMode ? count + 18 : count);
    particles.forEach((particle) => {
      const alpha = particle.alpha * (presentationMode ? 1.08 : 0.74);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.hue > 0.78 ? theme.swatch[2] : 'rgba(255,255,255,0.72)';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      if (atmosphere === 'stars' && particle.hue > 0.9) {
        ctx.globalAlpha = alpha * 0.46;
        ctx.strokeStyle = theme.swatch[2];
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(particle.x - particle.radius * 2.2, particle.y);
        ctx.lineTo(particle.x + particle.radius * 2.2, particle.y);
        ctx.moveTo(particle.x, particle.y - particle.radius * 2.2);
        ctx.lineTo(particle.x, particle.y + particle.radius * 2.2);
        ctx.stroke();
      }
      if (atmosphere === 'deep-field' && particle.hue > 0.86) {
        ctx.globalAlpha = alpha * 0.34;
        ctx.strokeStyle = theme.swatch[1];
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(particle.x - particle.radius * 3.2, particle.y + particle.radius * 1.4);
        ctx.lineTo(particle.x + particle.radius * 3.2, particle.y - particle.radius * 1.4);
        ctx.stroke();
      }
    });
  }

  if (!options.hideBackdropBloom) {
    const vignette = ctx.createRadialGradient(centerX, centerY, radius * 0.22, centerX, centerY, radius * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(0,0,0,${Math.min(0.72, theme.vignetteAlpha * (presentationMode ? 1.16 : 1))})`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}
