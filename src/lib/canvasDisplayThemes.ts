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
  | 'deep-field';

export type CanvasGlowLevel = 'low' | 'medium' | 'high';

export interface CanvasDisplaySettings {
  theme: CanvasDisplayThemeId;
  atmosphere: CanvasAtmosphereId;
  glow: CanvasGlowLevel;
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
};

export const DEFAULT_RIFF_DISPLAY_SETTINGS: CanvasDisplaySettings = DEFAULT_CANVAS_DISPLAY_SETTINGS;

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
  { id: 'none', label: 'None', summary: 'clean background' },
  { id: 'stars', label: 'Stars', summary: 'sparse starfield' },
  { id: 'dust', label: 'Dust', summary: 'soft floating specks' },
  { id: 'nebula-haze', label: 'Haze', summary: 'soft color clouds' },
  { id: 'orbital-grid', label: 'Grid', summary: 'faint depth rings' },
  { id: 'deep-field', label: 'Field', summary: 'stars and depth arcs' },
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
    radius: 0.45 + random() * (atmosphere === 'dust' ? 1.6 : 1.05),
    alpha: 0.16 + random() * (atmosphere === 'dust' ? 0.18 : 0.5),
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
  return CANVAS_ATMOSPHERE_OPTIONS.some((option) => option.id === value)
    ? (value as CanvasAtmosphereId)
    : DEFAULT_CANVAS_DISPLAY_SETTINGS.atmosphere;
}

function clampGlow(value: unknown): CanvasGlowLevel {
  return CANVAS_GLOW_OPTIONS.some((option) => option.id === value)
    ? (value as CanvasGlowLevel)
    : DEFAULT_CANVAS_DISPLAY_SETTINGS.glow;
}

export function normalizeCanvasDisplaySettings(
  value: Partial<CanvasDisplaySettings> | null | undefined,
  fallback: CanvasDisplaySettings = DEFAULT_CANVAS_DISPLAY_SETTINGS,
): CanvasDisplaySettings {
  return {
    theme: value?.theme ? clampDisplayTheme(value.theme) : fallback.theme,
    atmosphere: value?.atmosphere ? clampAtmosphere(value.atmosphere) : fallback.atmosphere,
    glow: value?.glow ? clampGlow(value.glow) : fallback.glow,
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

  if (atmosphere === 'nebula-haze' || atmosphere === 'deep-field') {
    const hazeA = ctx.createRadialGradient(width * 0.22, height * 0.78, 0, width * 0.22, height * 0.78, radius * 0.46);
    hazeA.addColorStop(0, theme.gradient[1]);
    hazeA.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = presentationMode ? 0.62 : 0.38;
    ctx.fillStyle = hazeA;
    ctx.fillRect(0, 0, width, height);

    const hazeB = ctx.createRadialGradient(width * 0.76, height * 0.7, 0, width * 0.76, height * 0.7, radius * 0.38);
    hazeB.addColorStop(0, theme.gradient[0]);
    hazeB.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = presentationMode ? 0.46 : 0.28;
    ctx.fillStyle = hazeB;
    ctx.fillRect(0, 0, width, height);
  }

  if (atmosphere === 'orbital-grid' || atmosphere === 'deep-field') {
    ctx.globalAlpha = presentationMode ? 0.42 : 0.28;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let index = 0; index < 7; index += 1) {
      const arcRadius = radius * (0.18 + index * 0.075);
      ctx.beginPath();
      ctx.arc(centerX, centerY, arcRadius, Math.PI * 0.12, Math.PI * 1.88);
      ctx.stroke();
    }
    ctx.globalAlpha = presentationMode ? 0.2 : 0.12;
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.stroke();
    }
  }

  if (atmosphere === 'stars' || atmosphere === 'dust' || atmosphere === 'deep-field') {
    const count =
      atmosphere === 'dust'
        ? 64
        : atmosphere === 'deep-field'
          ? 96
          : 72;
    const particles = getParticles(width, height, atmosphere, seed, presentationMode ? count + 18 : count);
    particles.forEach((particle) => {
      const alpha = particle.alpha * (presentationMode ? 1.08 : 0.76);
      ctx.globalAlpha = alpha;
      ctx.fillStyle =
        atmosphere === 'dust'
          ? 'rgba(255,255,255,0.42)'
          : particle.hue > 0.78
            ? theme.swatch[2]
            : 'rgba(255,255,255,0.72)';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const vignette = ctx.createRadialGradient(centerX, centerY, radius * 0.22, centerX, centerY, radius * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, `rgba(0,0,0,${Math.min(0.72, theme.vignetteAlpha * (presentationMode ? 1.16 : 1))})`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
