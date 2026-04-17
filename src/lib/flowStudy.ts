export type FlowEngineType = 'triangle' | 'pendulum' | 'orbit' | 'rain' | 'mandala' | 'wave';
export type FlowCycleRole = 'bass' | 'tone' | 'spark' | 'pad' | 'ghost';
export type FlowSoundId = 'glass' | 'deep' | 'rain' | 'shimmer' | 'warm';
export type FlowMotionLevel = 'calm' | 'balanced' | 'lively';

export interface FlowCycle {
  id: string;
  ratio: number;
  phase: number;
  amplitude: number;
  size: number;
  color: string;
  role: FlowCycleRole;
  note: number;
  octave: number;
  velocity: number;
  pan: number;
  impactEvery?: number;
}

export interface FlowSoundPreset {
  id: FlowSoundId;
  name: string;
  description: string;
  keyCenter: number;
  noteSet: number[];
  reverb: number;
  delay: number;
  filter: number;
  warmth: number;
  padMix: number;
}

export interface FlowScene {
  id: string;
  name: string;
  description: string;
  engine: FlowEngineType;
  tempo: number;
  cycleSeconds: number;
  cycles: FlowCycle[];
  palette: string[];
  soundId: FlowSoundId;
  trail: number;
  bloom: number;
  density: number;
  cameraDrift: number;
}

export interface FlowExperience extends FlowScene {
  playing: boolean;
  speed: number;
  soundEnabled: boolean;
  motionLevel: FlowMotionLevel;
}

export const DEFAULT_FLOW_SCENE_ID = 'prism-triangles';

export const FLOW_SOUND_PRESETS: FlowSoundPreset[] = [
  {
    id: 'glass',
    name: 'Glass',
    description: 'Clear bell tones with soft bass anchors.',
    keyCenter: 50,
    noteSet: [0, 3, 5, 7, 10, 12, 15],
    reverb: 0.66,
    delay: 0.34,
    filter: 3200,
    warmth: 0.48,
    padMix: 0.42,
  },
  {
    id: 'deep',
    name: 'Deep',
    description: 'Warm low pulses and rounded mallets.',
    keyCenter: 38,
    noteSet: [0, 2, 5, 7, 9, 12, 14],
    reverb: 0.48,
    delay: 0.22,
    filter: 1800,
    warmth: 0.76,
    padMix: 0.5,
  },
  {
    id: 'rain',
    name: 'Rain',
    description: 'Tiny droplets with long, quiet tails.',
    keyCenter: 57,
    noteSet: [0, 2, 4, 7, 9, 12, 16],
    reverb: 0.72,
    delay: 0.44,
    filter: 4200,
    warmth: 0.36,
    padMix: 0.36,
  },
  {
    id: 'shimmer',
    name: 'Dream',
    description: 'Wide sparkles and floating harmonic color.',
    keyCenter: 53,
    noteSet: [0, 5, 7, 11, 12, 16, 19],
    reverb: 0.82,
    delay: 0.48,
    filter: 5200,
    warmth: 0.42,
    padMix: 0.56,
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Soft wooden hits with gentle glow.',
    keyCenter: 45,
    noteSet: [0, 3, 5, 8, 10, 12, 15],
    reverb: 0.58,
    delay: 0.26,
    filter: 2400,
    warmth: 0.68,
    padMix: 0.48,
  },
];

function cycle(
  id: string,
  ratio: number,
  role: FlowCycleRole,
  note: number,
  color: string,
  options: Partial<FlowCycle> = {},
): FlowCycle {
  return {
    id,
    ratio,
    role,
    note,
    color,
    phase: options.phase ?? 0,
    amplitude: options.amplitude ?? 0.8,
    size: options.size ?? (role === 'bass' ? 15 : role === 'spark' ? 8 : 11),
    octave: options.octave ?? (role === 'bass' ? -1 : role === 'spark' ? 1 : 0),
    velocity: options.velocity ?? (role === 'bass' ? 0.72 : role === 'spark' ? 0.42 : 0.54),
    pan: options.pan ?? 0,
    impactEvery: options.impactEvery,
  };
}

export const FLOW_SCENES: FlowScene[] = [
  {
    id: 'prism-triangles',
    name: 'Prism Triangles',
    description: 'Glowing vertices trace a slow 3D triangle lattice.',
    engine: 'triangle',
    tempo: 52,
    cycleSeconds: 18,
    soundId: 'shimmer',
    trail: 0.94,
    bloom: 0.98,
    density: 0.36,
    cameraDrift: 0.06,
    palette: ['#BFC8FF', '#FFF8B8', '#B6A0FF', '#7FD7FF', '#FFFFFF'],
    cycles: [
      cycle('prism-anchor', 1, 'bass', 0, '#B6A0FF', { size: 20, pan: 0, velocity: 0.5, amplitude: 0.44 }),
      cycle('prism-a', 3, 'tone', 7, '#BFC8FF', { phase: 0, pan: -0.36, velocity: 0.34, amplitude: 0.64 }),
      cycle('prism-b', 5, 'tone', 12, '#FFF8B8', { phase: 0.18, pan: 0.26, velocity: 0.32, amplitude: 0.6 }),
      cycle('prism-c', 7, 'spark', 17, '#7FD7FF', { phase: 0.34, pan: 0.48, velocity: 0.2, amplitude: 0.52 }),
      cycle('prism-d', 11, 'ghost', 22, '#FFFFFF', { phase: 0.56, pan: -0.54, velocity: 0.13, size: 5, amplitude: 0.48 }),
    ],
  },
  {
    id: 'glass-pendulum',
    name: 'Glass Pendulum',
    description: 'Slow swings, clear bell impacts, and one deep pulse.',
    engine: 'pendulum',
    tempo: 54,
    cycleSeconds: 14,
    soundId: 'glass',
    trail: 0.92,
    bloom: 0.88,
    density: 0.34,
    cameraDrift: 0.08,
    palette: ['#7FD7FF', '#B6A0FF', '#72F1B8', '#FFD68A', '#FFFFFF'],
    cycles: [
      cycle('bass-moon', 1, 'bass', 0, '#72F1B8', { size: 22, pan: 0, velocity: 0.7, impactEvery: 1, amplitude: 0.58 }),
      cycle('glass-a', 2, 'tone', 7, '#7FD7FF', { phase: 0.04, pan: -0.42, amplitude: 0.72, velocity: 0.44 }),
      cycle('glass-b', 3, 'tone', 12, '#B6A0FF', { phase: 0.14, pan: 0.35, amplitude: 0.78, velocity: 0.42 }),
      cycle('spark-a', 5, 'spark', 17, '#FFD68A', { phase: 0.28, pan: -0.18, velocity: 0.26, amplitude: 0.66 }),
      cycle('spark-b', 8, 'ghost', 22, '#FFFFFF', { phase: 0.46, pan: 0.52, velocity: 0.18, size: 5, amplitude: 0.54 }),
    ],
  },
  {
    id: 'deep-moons',
    name: 'Deep Moons',
    description: 'Orbiting bodies with bass-centered pulse alignments.',
    engine: 'orbit',
    tempo: 50,
    cycleSeconds: 18,
    soundId: 'deep',
    trail: 0.93,
    bloom: 0.78,
    density: 0.28,
    cameraDrift: 0.06,
    palette: ['#72F1B8', '#5AB8FF', '#FFAA66', '#D8F3FF'],
    cycles: [
      cycle('moon-bass', 1, 'bass', 0, '#72F1B8', { size: 22, velocity: 0.78 }),
      cycle('moon-low', 2, 'tone', 5, '#5AB8FF', { phase: 0.08, pan: -0.28, velocity: 0.42 }),
      cycle('moon-mid', 3, 'tone', 9, '#FFAA66', { phase: 0.24, pan: 0.22, velocity: 0.38 }),
      cycle('moon-high', 5, 'spark', 14, '#D8F3FF', { phase: 0.42, pan: 0.48, velocity: 0.24 }),
    ],
  },
  {
    id: 'rain-garden',
    name: 'Rain Garden',
    description: 'Droplets cross quiet bands and leave soft ripples.',
    engine: 'rain',
    tempo: 62,
    cycleSeconds: 13,
    soundId: 'rain',
    trail: 0.94,
    bloom: 0.68,
    density: 0.44,
    cameraDrift: 0.04,
    palette: ['#8FE9FF', '#B6A0FF', '#E8FFF7', '#72F1B8', '#FFD68A'],
    cycles: [
      cycle('rain-low', 2, 'tone', 0, '#72F1B8', { pan: -0.5, velocity: 0.3 }),
      cycle('rain-a', 3, 'spark', 7, '#8FE9FF', { phase: 0.16, pan: -0.2, velocity: 0.24 }),
      cycle('rain-b', 5, 'spark', 12, '#B6A0FF', { phase: 0.33, pan: 0.12, velocity: 0.22 }),
      cycle('rain-c', 8, 'spark', 16, '#E8FFF7', { phase: 0.5, pan: 0.45, velocity: 0.18 }),
      cycle('rain-d', 13, 'ghost', 19, '#FFD68A', { phase: 0.67, pan: 0.65, velocity: 0.12, size: 5 }),
    ],
  },
  {
    id: 'star-bloom',
    name: 'Star Bloom',
    description: 'Bright orbit pulses bloom when their paths line up.',
    engine: 'orbit',
    tempo: 58,
    cycleSeconds: 16,
    soundId: 'shimmer',
    trail: 0.9,
    bloom: 0.96,
    density: 0.46,
    cameraDrift: 0.12,
    palette: ['#FF88C2', '#B6A0FF', '#7FD7FF', '#72F1B8', '#FFF4A8'],
    cycles: [
      cycle('star-ground', 2, 'bass', 0, '#72F1B8', { size: 18, velocity: 0.48 }),
      cycle('star-a', 3, 'tone', 7, '#FF88C2', { phase: 0.08, pan: -0.38, velocity: 0.38 }),
      cycle('star-b', 5, 'tone', 11, '#B6A0FF', { phase: 0.24, pan: 0.28, velocity: 0.34 }),
      cycle('star-c', 8, 'spark', 16, '#7FD7FF', { phase: 0.4, pan: -0.12, velocity: 0.22 }),
      cycle('star-d', 13, 'ghost', 19, '#FFF4A8', { phase: 0.58, pan: 0.52, velocity: 0.15 }),
    ],
  },
  {
    id: 'mandala-bells',
    name: 'Mandala Bells',
    description: 'Radial pulses draw a symmetrical bell pattern.',
    engine: 'mandala',
    tempo: 52,
    cycleSeconds: 17,
    soundId: 'warm',
    trail: 0.9,
    bloom: 0.78,
    density: 0.4,
    cameraDrift: 0.1,
    palette: ['#72F1B8', '#B6A0FF', '#FFAA66', '#7FD7FF', '#FFFFFF'],
    cycles: [
      cycle('mandala-bass', 2, 'bass', 0, '#72F1B8', { size: 17, velocity: 0.46 }),
      cycle('mandala-a', 3, 'tone', 5, '#B6A0FF', { phase: 0.06, pan: -0.32, velocity: 0.38 }),
      cycle('mandala-b', 4, 'tone', 8, '#FFAA66', { phase: 0.22, pan: 0.2, velocity: 0.34 }),
      cycle('mandala-c', 6, 'spark', 12, '#7FD7FF', { phase: 0.4, pan: 0.42, velocity: 0.2 }),
      cycle('mandala-d', 8, 'ghost', 17, '#FFFFFF', { phase: 0.56, pan: -0.48, velocity: 0.12 }),
    ],
  },
  {
    id: 'hammer-tide',
    name: 'Hammer Tide',
    description: 'Soft hammers ride a slow wave and strike glowing bars.',
    engine: 'wave',
    tempo: 66,
    cycleSeconds: 12,
    soundId: 'deep',
    trail: 0.86,
    bloom: 0.78,
    density: 0.48,
    cameraDrift: 0.06,
    palette: ['#FFAA66', '#72F1B8', '#7FD7FF', '#FFD68A'],
    cycles: [
      cycle('tide-bass', 1, 'bass', 0, '#72F1B8', { size: 20, velocity: 0.72 }),
      cycle('tide-a', 2, 'tone', 7, '#FFAA66', { phase: 0.1, pan: -0.38, velocity: 0.42 }),
      cycle('tide-b', 3, 'tone', 10, '#7FD7FF', { phase: 0.3, pan: 0.26, velocity: 0.36 }),
      cycle('tide-c', 5, 'spark', 14, '#FFD68A', { phase: 0.48, pan: 0.48, velocity: 0.24 }),
    ],
  },
];

export function getFlowSoundPreset(soundId: FlowSoundId): FlowSoundPreset {
  return FLOW_SOUND_PRESETS.find((preset) => preset.id === soundId) ?? FLOW_SOUND_PRESETS[0];
}

export function cloneFlowScene(scene: FlowScene): FlowScene {
  return {
    ...scene,
    palette: [...scene.palette],
    cycles: scene.cycles.map((entry) => ({ ...entry })),
  };
}

export function createFlowExperienceFromScene(
  scene: FlowScene,
  options: Partial<Pick<FlowExperience, 'playing' | 'speed' | 'soundEnabled' | 'motionLevel'>> = {},
): FlowExperience {
  return {
    ...cloneFlowScene(scene),
    playing: options.playing ?? false,
    speed: options.speed ?? 1,
    soundEnabled: options.soundEnabled ?? true,
    motionLevel: options.motionLevel ?? 'balanced',
  };
}

export function createDefaultFlowExperience(): FlowExperience {
  const scene =
    FLOW_SCENES.find((entry) => entry.id === DEFAULT_FLOW_SCENE_ID) ?? FLOW_SCENES[0];
  return createFlowExperienceFromScene(scene);
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createRandomCycles(
  ratios: number[],
  palette: string[],
  sound: FlowSoundPreset,
  adventurous: boolean,
): FlowCycle[] {
  return ratios.map((ratio, index) => {
    const role: FlowCycleRole =
      index === 0 ? 'bass' : index >= ratios.length - 2 && adventurous ? 'spark' : 'tone';
    const note = sound.noteSet[index % sound.noteSet.length] ?? 0;
    return cycle(`flow-random-${index + 1}`, ratio, role, note, palette[index % palette.length], {
      phase: adventurous ? randomBetween(0, 0.72) : randomBetween(0, 0.18),
      amplitude: randomBetween(0.48, adventurous ? 0.92 : 0.74),
      size: role === 'bass' ? randomBetween(16, 23) : randomBetween(6, 12),
      octave: role === 'bass' ? -1 : index > 3 ? 1 : 0,
      velocity: role === 'bass' ? randomBetween(0.48, 0.74) : randomBetween(0.16, 0.42),
      pan: ratios.length <= 1 ? 0 : -0.65 + (1.3 * index) / (ratios.length - 1),
    });
  });
}

export function createRandomFlowExperience(adventurous = false): FlowExperience {
  const safeRatioFamilies = [
    [1, 2, 3, 5],
    [1, 2, 3, 5, 8],
    [2, 3, 5],
    [3, 5, 8],
    [2, 3, 4, 6],
  ];
  const deepRatioFamilies = [
    [1, 2, 3, 5, 8, 13],
    [3, 5, 8, 13],
    [2, 3, 5, 7, 11],
    [3, 5, 7, 9, 13],
    [4, 5, 6, 8, 10],
    [2, 3, 5, 7, 11],
  ];
  const palettes = [
    ['#72F1B8', '#7FD7FF', '#B6A0FF', '#FFD68A', '#FFFFFF'],
    ['#FF88C2', '#B6A0FF', '#7FD7FF', '#72F1B8', '#FFF4A8'],
    ['#FFAA66', '#72F1B8', '#7FD7FF', '#D8F3FF', '#FFFFFF'],
    ['#8FE9FF', '#B6A0FF', '#E8FFF7', '#72F1B8', '#FFD68A'],
  ];
  const engine = adventurous
    ? pick<FlowEngineType>(['triangle', 'pendulum', 'orbit', 'rain', 'mandala', 'wave'])
    : pick<FlowEngineType>(['triangle', 'pendulum', 'orbit', 'rain']);
  const sound = pick(
    adventurous
      ? FLOW_SOUND_PRESETS
      : FLOW_SOUND_PRESETS.filter((preset) => preset.id !== 'shimmer'),
  );
  const ratios = [...pick(adventurous ? deepRatioFamilies : safeRatioFamilies)];
  const palette = pick(palettes);
  const scene: FlowScene = {
    id: adventurous ? 'random-flow-plus' : 'random-flow',
    name: adventurous ? 'Dream+ Flow' : 'Random Flow',
    description: adventurous
      ? 'A denser ambient rhythm field with wider relationships.'
      : 'A gentle generated scene built from safe pulse families.',
    engine,
    tempo: Math.round(randomBetween(adventurous ? 50 : 48, adventurous ? 86 : 72)),
    cycleSeconds: randomBetween(adventurous ? 10 : 12, adventurous ? 18 : 17),
    cycles: createRandomCycles(ratios, palette, sound, adventurous),
    palette,
    soundId: sound.id,
    trail: randomBetween(adventurous ? 0.84 : 0.88, adventurous ? 0.95 : 0.94),
    bloom: randomBetween(adventurous ? 0.68 : 0.62, adventurous ? 1 : 0.88),
    density: randomBetween(adventurous ? 0.42 : 0.28, adventurous ? 0.68 : 0.48),
    cameraDrift: randomBetween(0.02, adventurous ? 0.18 : 0.08),
  };
  return createFlowExperienceFromScene(scene, {
    playing: true,
    speed: adventurous ? randomBetween(0.82, 1.08) : randomBetween(0.72, 0.96),
    soundEnabled: true,
    motionLevel: adventurous ? 'lively' : 'balanced',
  });
}

export function remixFlowExperience(current: FlowExperience): FlowExperience {
  const remixed: FlowExperience = {
    ...cloneFlowScene(current),
    playing: current.playing,
    speed: current.speed,
    soundEnabled: current.soundEnabled,
    motionLevel: current.motionLevel,
    trail: Math.min(0.95, Math.max(0.72, current.trail + randomBetween(-0.04, 0.05))),
    bloom: Math.min(1, Math.max(0.48, current.bloom + randomBetween(-0.08, 0.08))),
    cameraDrift: Math.min(0.42, Math.max(0.04, current.cameraDrift + randomBetween(-0.04, 0.05))),
    cycles: current.cycles.map((entry, index) => ({
      ...entry,
      phase: (entry.phase + randomBetween(0.04, index % 2 === 0 ? 0.18 : 0.32)) % 1,
      velocity: Math.min(0.88, Math.max(0.18, entry.velocity + randomBetween(-0.05, 0.06))),
    })),
  };
  return remixed;
}
