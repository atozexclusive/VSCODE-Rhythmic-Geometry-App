// ============================================================
// Orbital Polymeter — Main Application Route
// Orchestrates engine state, canvas, sidebar, transport bar
// ============================================================

import { Link, createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, CircleHelp, Maximize2, Menu, Minus, Pause, Play, Plus, RotateCcw, Shuffle, Trash2, Volume2, VolumeX } from 'lucide-react';
import OrbitalCanvas from '../components/OrbitalCanvas';
import OrbitSidebar from '../components/OrbitSidebar';
import TransportBar from '../components/TransportBar';
import RadialMenu from '../components/RadialMenu';
import { useIsMobile } from '../hooks/use-mobile';
import {
  DEFAULT_HARMONY_SETTINGS,
  NOTE_NAMES,
  SCALE_PRESETS,
  type HarmonySettings,
  type RootNote,
  type ScaleName,
  getAudioMuted,
  resumeAudio,
  stopAllAudio,
  toggleAudioMute,
} from '../lib/audioEngine';
import {
  type Orbit,
  type EngineState,
  createEngineState,
  createOrbit,
  resetEngine,
  resonancePositionAtBeats,
  stepEngineByBeats,
  DEFAULT_ORBITS,
  PRESET_RATIOS,
} from '../lib/orbitalEngine';
import {
  DEFAULT_INTERFERENCE_SETTINGS,
  normalizeInterferenceSettings,
  type GeometryMode,
  type InterferenceSettings,
} from '../lib/geometry';

const SCENES_STORAGE_KEY = 'orbital-polymeter-scenes';
const TOP_STATUS_VISIBLE_STORAGE_KEY = 'orbital-polymeter-top-status-visible';
const CANVAS_HUD_VISIBLE_STORAGE_KEY = 'orbital-polymeter-canvas-hud-visible';
const MANUAL_STEP_BEATS = 0.25;
const DEFAULT_SCENE_SPEED = 3;
interface StartGuideStep {
  target: string;
  title: string;
  text: string;
}

const MOBILE_START_GUIDE: StartGuideStep[] = [
  {
    target: 'mobile-scenes',
    title: 'Start Here',
    text: 'Pick a built-in scene to load a strong starting pattern, then press play.',
  },
  {
    target: 'mobile-playback',
    title: 'Playback',
    text: 'This is the main motion row: play starts, reset clears, audio mutes, random refreshes, and speed shapes the pace.',
  },
  {
    target: 'mobile-speed',
    title: 'Speed',
    text: 'Slow speeds reveal structure. Faster speeds turn the form into a denser field.',
  },
  {
    target: 'mobile-present',
    title: 'Present',
    text: 'Use Present for a cleaner viewing mode when you want to show, record, or focus on the form.',
  },
  {
    target: 'mobile-customize',
    title: 'Customize Pattern',
    text: 'Open this to change the geometry mode, trace, markers, and the main layer relationships.',
  },
  {
    target: 'mobile-layers',
    title: 'Layers',
    text: 'Change pulse counts here. Small number shifts can produce very different forms.',
  },
  {
    target: 'mobile-direction',
    title: 'Direction',
    text: 'Layers can move clockwise or counterclockwise. Reverse, All CW, and Alternate quickly reshape the pattern.',
  },
  {
    target: 'mobile-trail',
    title: 'Trace',
    text: 'Trace keeps motion history visible so the form can accumulate into a dense structure.',
  },
  {
    target: 'mobile-markers',
    title: 'Markers',
    text: 'Markers show or hide the moving dots. Turn them off when you want a cleaner finished view.',
  },
  {
    target: 'mobile-sound',
    title: 'Sound',
    text: 'Switch between Original Tones and Keyed Harmony, then shape the key and scale.',
  },
  {
    target: 'mobile-audio',
    title: 'Audio',
    text: 'Audio can be toggled without changing the geometry, so you can explore visually in silence if you want.',
  },
  {
    target: 'mobile-colors',
    title: 'Colors',
    text: 'Long-press an orbit to change color and musical role. Color can also influence tone mapping in some modes.',
  },
  {
    target: 'mobile-menu',
    title: 'Menu',
    text: 'Use Menu for scenes, export, and deeper editing once you know what you want.',
  },
];

const DESKTOP_START_GUIDE: StartGuideStep[] = [
  {
    target: 'desktop-playback',
    title: 'Start Here',
    text: 'This main row controls motion: play starts, reset clears, audio mutes, random refreshes, and speed shapes the pace.',
  },
  {
    target: 'desktop-speed',
    title: 'Speed',
    text: 'Use speed to move between slow structural study and dense flowing trace.',
  },
  {
    target: 'desktop-geometry',
    title: 'Geometry',
    text: 'Standard, Interference, and Sweep each reveal a different relationship in the same system.',
  },
  {
    target: 'desktop-direction',
    title: 'Direction',
    text: 'Reverse, All CW, and Alternate quickly change how the orbits move and how the geometry grows.',
  },
  {
    target: 'desktop-trace',
    title: 'Trace',
    text: 'Trace keeps path history visible so the structure can build into a denser field over time.',
  },
  {
    target: 'desktop-markers',
    title: 'Markers',
    text: 'Markers show or hide the orbit dots and guides when you want a cleaner final image.',
  },
  {
    target: 'desktop-sound',
    title: 'Sound',
    text: 'Choose whether the system uses Original Tones or Keyed Harmony.',
  },
  {
    target: 'desktop-audio',
    title: 'Audio',
    text: 'Mute audio at any time without affecting the geometry or motion.',
  },
  {
    target: 'desktop-present',
    title: 'Present',
    text: 'Present hides most UI so you can focus on the form, show it, or record it cleanly.',
  },
  {
    target: 'desktop-colors',
    title: 'Colors',
    text: 'Tap an orbit to edit color and quick musical roles. Color is expressive and can shape tone mapping too.',
  },
  {
    target: 'desktop-menu',
    title: 'Menu',
    text: 'Open the menu for Scenes, export, and deeper orbit editing.',
  },
];

type SceneOrbitSnapshot = Omit<Orbit, 'id' | 'phase' | 'lastTriggerBeat'>;

interface SceneInterferenceSettings {
  sourceOrbitAIndex: number | null;
  sourceOrbitBIndex: number | null;
  showConnectors: boolean;
}

export interface SceneSnapshot {
  orbits: SceneOrbitSnapshot[];
  speedMultiplier: number;
  traceMode: boolean;
  harmonySettings: HarmonySettings;
  geometryMode: GeometryMode;
  interferenceSettings: SceneInterferenceSettings;
}

interface SavedScene {
  id: string;
  name: string;
  updatedAt: string;
  snapshot: SceneSnapshot;
  thumbnailDataUrl?: string;
}

interface ImportedSceneFile {
  version: 1;
  exportedAt: string;
  scene: SavedScene;
}

export interface BuiltInScene {
  id: string;
  name: string;
  description: string;
  snapshot: SceneSnapshot;
  thumbnailDataUrl: string;
}

const BUILT_IN_SCENE_ASSET_MAP: Partial<Record<string, string>> = {
  glass_cathedral: '/scene-captures/glass_cathedral.jpg',
  blue_mandala: '/scene-captures/blue_mandala.jpg',
  dorian_bloom: '/scene-captures/dorian_bloom.jpg',
  silent_cosmology: '/scene-captures/silent_cosmology.jpg',
  aeolian_tide: '/scene-captures/aeolian_tide.jpg',
};

const RANDOM_COLOR_FAMILIES: readonly (readonly string[])[] = [
  ['#00FFAA', '#FF3366', '#3388FF', '#FFAA00', '#AA44FF'],
  ['#8AD8FF', '#5FA8FF', '#6A7BFF', '#B8E6FF', '#9FD2FF'],
  ['#44FF88', '#88CCFF', '#FF4488', '#FFCC00', '#00CCFF'],
  ['#A7F3D0', '#C4B5FD', '#7DD3FC', '#F9A8D4', '#FDE68A'],
  ['#7FD7FF', '#9F8CFF', '#6BF5D0', '#FF88C2', '#FFD166'],
  ['#7CE7FF', '#4F8CFF', '#9B7BFF', '#FF6AA2', '#FFD86B'],
  ['#72F1B8', '#6CC8FF', '#FF7A7A', '#FFC857', '#C084FC'],
  ['#B8E1FF', '#8EC5FF', '#7EF9C6', '#FFD1A1', '#F7A8FF'],
  ['#9BE7FF', '#6BE2FF', '#4FB4FF', '#FF8FB8', '#FFD36E'],
  ['#89F0C8', '#6AB8FF', '#7D89FF', '#FF7C8F', '#FFC96C'],
  ['#A2FFE3', '#7AD7FF', '#A58BFF', '#FFA3CF', '#FFE29D'],
  ['#6AF0FF', '#53C7FF', '#7D9CFF', '#FF9B7A', '#FFE17A'],
] as const;

const RANDOM_PLUS_COLOR_FAMILIES: readonly (readonly string[])[] = [
  ['#8AD8FF', '#5FA8FF', '#6A7BFF', '#B8E6FF', '#9FD2FF'],
  ['#7FD7FF', '#9F8CFF', '#6BF5D0', '#FF88C2', '#FFD166'],
  ['#A7F3D0', '#C4B5FD', '#7DD3FC', '#F9A8D4', '#FDE68A'],
  ['#88CCFF', '#3388FF', '#00FFAA', '#FFCC66', '#FF6699'],
  ['#D0F4FF', '#7AB6FF', '#5CF2D6', '#FF9CCC', '#FFE28A'],
  ['#9AD1FF', '#6F8DFF', '#9DFFEA', '#FFB0B0', '#FFD37A'],
  ['#C7F3FF', '#7FC0FF', '#6A86FF', '#90FFE6', '#FFD78F'],
  ['#A3EDFF', '#66B5FF', '#7E70FF', '#FF9FD9', '#FFE08A'],
  ['#8EF2FF', '#5B9DFF', '#72FFE1', '#FFB2B2', '#FFD56A'],
] as const;

const RANDOM_PULSE_GROUPS: readonly (readonly number[])[] = [
  [2, 3, 5, 8, 13],
  [3, 4, 5, 7, 11],
  [4, 6, 9, 12, 15],
  [2, 5, 7, 9, 14],
  [3, 5, 8, 11, 13],
  [4, 7, 10, 13, 16],
  [2, 4, 7, 11, 17],
  [3, 6, 8, 13, 17],
  [2, 6, 10, 15, 21],
  [5, 7, 9, 14, 18],
] as const;

const RANDOM_PLUS_PULSE_GROUPS: readonly (readonly number[])[] = [
  [7, 11, 18, 27, 45],
  [9, 14, 21, 34, 55],
  [8, 13, 21, 34, 55],
  [10, 16, 25, 40, 64],
  [12, 19, 30, 48, 72],
  [15, 24, 36, 54, 81],
  [11, 18, 29, 47, 76],
  [13, 21, 34, 55, 89],
  [17, 26, 41, 63, 95],
  [14, 23, 37, 58, 91],
  [18, 28, 44, 67, 99],
] as const;

const RANDOM_DIRECTION_SCHEMES = [
  [1, -1, 1, -1, 1],
  [1, 1, 1, -1, -1],
  [-1, -1, 1, 1, 1],
  [1, 1, -1, 1, 1],
  [1, -1, -1, 1, -1],
  [1, 1, 1, 1, 1],
  [-1, -1, -1, -1, -1],
  [1, -1, -1, -1, 1],
  [-1, 1, 1, 1, -1],
  [1, 1, -1, -1, 1],
  [-1, -1, 1, 1, -1],
  [1, -1, 1, 1, -1],
  [-1, 1, -1, -1, 1],
] as const;

const RANDOM_MAPPING_MODES: HarmonySettings['mappingMode'][] = [
  'color-hue',
  'orbit-index',
  'pulse-count',
  'radius',
];

interface RandomHistoryEntry {
  pulses: number[];
  directions: (1 | -1)[];
  colors: string[];
  speedBucket: number;
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function mutatePulse(value: number, cap: number, spread: number): number {
  return Math.max(1, Math.min(cap, value + randomInt(-spread, spread)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sortAndSeparate(values: number[], minGap: number, cap: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.map((value, index, list) => {
    if (index === 0) {
      return value;
    }
    const previous = list[index - 1]!;
    return value - previous < minGap ? Math.min(cap, previous + minGap) : value;
  });
}

function mutatePair(
  pair: readonly [number, number],
  options: { cap: number; jitterA: number; jitterB: number; preserveContrast?: boolean },
): [number, number] {
  const a = mutatePulse(pair[0], options.cap, options.jitterA);
  const b = mutatePulse(pair[1], options.cap, options.jitterB);
  const [low, high] = a <= b ? [a, b] : [b, a];
  if (options.preserveContrast && high - low < 12) {
    return [Math.max(1, low - randomInt(0, 2)), Math.min(options.cap, high + randomInt(10, 18))];
  }
  return [low, high];
}

function pulseSignature(values: number[]): string {
  return [...values].sort((a, b) => a - b).join(':');
}

function directionSignature(values: (1 | -1)[]): string {
  return values.join(':');
}

function colorSignature(values: string[]): string {
  return values.join(':');
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function maxGap(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  let best = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    best = Math.max(best, sorted[index]! - sorted[index - 1]!);
  }
  return best;
}

function pulseDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.reduce((sum, value, index) => sum + Math.abs(value - sortedB[index]!), 0);
}

function isNearPulseRepeat(candidate: number[], previous: number[]): boolean {
  const distance = pulseDistance(candidate, previous);
  const candidateMax = Math.max(...candidate);
  const previousMax = Math.max(...previous);
  if (distance === 0) {
    return true;
  }
  if (candidate.length === previous.length && distance <= candidate.length * 2) {
    return true;
  }
  return candidateMax >= 90 && previousMax >= 90 && Math.abs(candidateMax - previousMax) <= 3 && distance <= 8;
}

function pickSpacedRandomValues(
  count: number,
  options: { min: number; max: number; minGap: number; bias?: 'low' | 'mid' | 'high' | 'mixed' },
): number[] {
  const values: number[] = [];
  let guard = 0;
  while (values.length < count && guard < 300) {
    guard += 1;
    let candidate = randomInt(options.min, options.max);
    if (options.bias === 'low') {
      candidate = randomInt(options.min, clamp(options.min + Math.floor((options.max - options.min) * 0.45), options.min, options.max));
    } else if (options.bias === 'high') {
      candidate = randomInt(clamp(options.max - Math.floor((options.max - options.min) * 0.4), options.min, options.max), options.max);
    } else if (options.bias === 'mid') {
      const mid = Math.floor((options.min + options.max) / 2);
      candidate = randomInt(clamp(mid - Math.floor((options.max - options.min) * 0.2), options.min, options.max), clamp(mid + Math.floor((options.max - options.min) * 0.2), options.min, options.max));
    }
    if (values.every((value) => Math.abs(value - candidate) >= options.minGap)) {
      values.push(candidate);
    }
  }
  if (values.length < count) {
    while (values.length < count) {
      const fallback = clamp(options.min + values.length * options.minGap, options.min, options.max);
      if (!values.includes(fallback)) {
        values.push(fallback);
      } else {
        values.push(clamp(fallback + values.length, options.min, options.max));
      }
    }
  }
  return sortAndSeparate(uniqueNumbers(values).slice(0, count), options.minGap, options.max);
}

function buildBroadRandomPulseCounts(
  count: number,
  options?: { extended?: boolean },
): number[] {
  const cap = options?.extended ? 100 : 10;
  const minGap = options?.extended ? 4 : 1;
  const style = randomInt(0, 5);
  const seededGroup = shuffleArray([...(options?.extended ? randomItem(RANDOM_PLUS_PULSE_GROUPS) : randomItem(RANDOM_PULSE_GROUPS))]);

  if (style === 0) {
    const base = seededGroup
      .slice(0, count)
      .map((pulse, index) => mutatePulse(pulse + index, cap, options?.extended ? 6 : 2));
    return sortAndSeparate(base, minGap, cap);
  }
  if (style === 1) {
    const lowCluster = pickSpacedRandomValues(Math.max(2, count - 1), {
      min: 2,
      max: options?.extended ? 36 : 7,
      minGap: options?.extended ? 3 : 1,
      bias: 'low',
    });
    const accent = randomInt(options?.extended ? 42 : 7, cap);
    return sortAndSeparate([...lowCluster.slice(0, count - 1), accent], minGap, cap);
  }
  if (style === 2) {
    const base = randomInt(2, options?.extended ? 24 : 6);
    const values = Array.from({ length: count }, (_, index) =>
      clamp(base + index * randomInt(options?.extended ? 5 : 1, options?.extended ? 18 : 3) + randomInt(-(options?.extended ? 2 : 1), options?.extended ? 3 : 1), 2, cap),
    );
    return sortAndSeparate(uniqueNumbers(values), minGap, cap).slice(0, count);
  }
  if (style === 3) {
    const anchorA = randomInt(2, options?.extended ? 16 : 5);
    const anchorB = randomInt(options?.extended ? 20 : 5, cap);
    const values = [anchorA, anchorB];
    while (values.length < count) {
      values.push(clamp(randomInt(anchorA + 1, Math.max(anchorA + 2, anchorB - 1)), 2, cap));
    }
    return sortAndSeparate(uniqueNumbers(values), minGap, cap).slice(0, count);
  }

  return pickSpacedRandomValues(count, {
    min: 2,
    max: cap,
    minGap,
    bias: style === 4 ? 'high' : 'mid',
  });
}

function buildRandomColors(
  count: number,
  options?: { extended?: boolean },
): string[] {
  const families = options?.extended ? RANDOM_PLUS_COLOR_FAMILIES : RANDOM_COLOR_FAMILIES;
  const primary = shuffleArray([...randomItem(families)]);
  const useSecondary = Math.random() > (options?.extended ? 0.35 : 0.55);
  const secondary = useSecondary ? shuffleArray([...randomItem(families)]) : [];
  const colorPool = shuffleArray([...new Set([...primary, ...secondary])]);
  const chosen = colorPool.slice(0, Math.max(count, Math.min(colorPool.length, count + 2)));
  const rotated = Array.from({ length: count }, (_, index) => chosen[(index + randomInt(0, Math.max(0, chosen.length - 1))) % chosen.length]!);
  return shuffleArray(rotated);
}

function buildModeAwareDirections(
  mode: GeometryMode,
  count: number,
  options?: { extended?: boolean },
): (1 | -1)[] {
  if (mode === 'sweep') {
    const schemes: Array<(1 | -1)[]> = options?.extended
      ? [[1, 1], [1, 1], [1, 1], [1, -1]]
      : [[1, 1], [1, 1], [1, -1], [-1, 1]];
    const chosen = randomItem(schemes);
    return Array.from({ length: count }, (_, index) => chosen[index % chosen.length]!);
  }

  if (mode === 'interference-trace') {
    const schemes: Array<(1 | -1)[]> = options?.extended
      ? [[1, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]]
      : [[1, -1], [1, 1], [-1, 1], [-1, -1]];
    const chosen = randomItem(schemes);
    return Array.from({ length: count }, (_, index) => chosen[index % chosen.length]!);
  }

  const scheme = randomItem(RANDOM_DIRECTION_SCHEMES);
  const inverted = Math.random() > 0.5;
  return Array.from({ length: count }, (_, index) => {
    const base = index < scheme.length ? scheme[index]! : (index % 2 === 0 ? scheme[scheme.length - 1]! : (scheme[scheme.length - 1] === 1 ? -1 : 1));
    return inverted ? (base === 1 ? -1 : 1) : base;
  });
}

function buildModeAwarePulses(
  mode: GeometryMode,
  count: number,
  options?: { extended?: boolean },
): number[] {
  const cap = options?.extended ? 100 : 10;

  if (mode === 'sweep') {
    const strategy = randomInt(0, 4);
    if (strategy === 0) {
      return [randomInt(2, options?.extended ? 10 : 4), randomInt(options?.extended ? 78 : 7, cap)].sort((a, b) => a - b);
    }
    if (strategy === 1) {
      const high = randomInt(options?.extended ? 72 : 6, cap);
      return [clamp(high - randomInt(1, options?.extended ? 6 : 2), 2, cap - 1), high].sort((a, b) => a - b);
    }
    if (strategy === 2) {
      return [randomInt(options?.extended ? 12 : 3, options?.extended ? 42 : 7), randomInt(options?.extended ? 58 : 6, cap)].sort((a, b) => a - b);
    }
    if (strategy === 3) {
      const low = randomInt(2, options?.extended ? 8 : 3);
      const high = clamp(cap - randomInt(0, options?.extended ? 12 : 2), low + 1, cap);
      return [low, high];
    }
    return pickSpacedRandomValues(2, {
      min: 2,
      max: cap,
      minGap: options?.extended ? 6 : 2,
      bias: options?.extended ? 'mixed' : 'high',
    });
  }

  if (mode === 'interference-trace') {
    const strategy = randomInt(0, 4);
    if (strategy === 0) {
      return [randomInt(2, options?.extended ? 18 : 5), randomInt(options?.extended ? 30 : 5, cap)].sort((a, b) => a - b);
    }
    if (strategy === 1) {
      const high = randomInt(options?.extended ? 45 : 6, cap);
      return [clamp(high - randomInt(1, options?.extended ? 8 : 2), 2, cap - 1), high].sort((a, b) => a - b);
    }
    if (strategy === 2) {
      const base = randomInt(options?.extended ? 18 : 3, options?.extended ? 70 : 8);
      return [base, clamp(base + randomInt(options?.extended ? 6 : 1, options?.extended ? 18 : 3), base + 1, cap)];
    }
    if (strategy === 3) {
      const low = randomInt(2, options?.extended ? 12 : 4);
      const high = randomInt(options?.extended ? 52 : 6, cap);
      return [low, high].sort((a, b) => a - b);
    }
    return pickSpacedRandomValues(2, {
      min: 2,
      max: cap,
      minGap: options?.extended ? 5 : 2,
      bias: 'mixed',
    });
  }

  return buildBroadRandomPulseCounts(count, options);
}

function computeRandomSpeed(
  mode: GeometryMode,
  pulses: number[],
  options?: { extended?: boolean },
): number {
  if (options?.extended) {
    let speed = computeRandomPlusSpeed(pulses);
    if (mode === 'sweep') speed += 0.35;
    if (mode === 'interference-trace') speed += 0.15;
    speed += randomInt(-2, 3) * 0.18;
    return clamp(speed, 1.9, 7.8);
  }

  const avgPulse = average(pulses);
  const spread = maxGap(pulses);
  let speed = mode === 'sweep' ? 2.1 : mode === 'interference-trace' ? 1.5 : 1.2;
  speed += randomInt(-2, 3) * 0.12;
  if (spread >= 4) speed += 0.25;
  if (avgPulse >= 6) speed += 0.2;
  if (avgPulse <= 3.5) speed -= 0.1;
  return clamp(speed, 0.95, mode === 'sweep' ? 3.6 : 3.1);
}

function buildHarmonyAssignments(
  count: number,
  scaleLength: number,
  options?: { extended?: boolean },
): Array<{ degree: number; register: -1 | 0 | 1 }> {
  const patterns: Array<Array<{ degree: number; register: -1 | 0 | 1 }>> = [
    Array.from({ length: count }, (_, index) => ({ degree: (index * 2) % Math.max(1, scaleLength), register: index === 0 ? -1 : index === count - 1 ? 1 : 0 })),
    Array.from({ length: count }, (_, index) => ({ degree: (index * 3) % Math.max(1, scaleLength), register: index > Math.floor(count / 2) ? 1 : 0 })),
    Array.from({ length: count }, (_, index) => ({ degree: (index + (options?.extended ? 1 : 0)) % Math.max(1, scaleLength), register: index === 0 ? -1 : 0 })),
    Array.from({ length: count }, (_, index) => ({ degree: ((count - index - 1) * 2) % Math.max(1, scaleLength), register: index === count - 1 ? 1 : 0 })),
  ];
  return randomItem(patterns);
}

function shouldRejectCandidate(
  candidate: RandomHistoryEntry,
  history: RandomHistoryEntry[],
): boolean {
  if (!history.length) {
    return false;
  }
  const last = history[history.length - 1]!;
  if (directionSignature(candidate.directions) === directionSignature(last.directions)) {
    if (colorSignature(candidate.colors) === colorSignature(last.colors)) {
      return true;
    }
    if (isNearPulseRepeat(candidate.pulses, last.pulses)) {
      return true;
    }
  }
  return history.some((entry) => {
    if (isNearPulseRepeat(candidate.pulses, entry.pulses)) {
      return true;
    }
    if (colorSignature(candidate.colors) === colorSignature(entry.colors) && directionSignature(candidate.directions) === directionSignature(entry.directions)) {
      return true;
    }
    return Math.abs(candidate.speedBucket - entry.speedBucket) <= 0 && isNearPulseRepeat(candidate.pulses, entry.pulses);
  });
}

function computeRandomPlusSpeed(pulses: number[]): number {
  const maxPulse = Math.max(...pulses);
  const averagePulse = pulses.reduce((sum, pulse) => sum + pulse, 0) / Math.max(1, pulses.length);
  const highCount = pulses.filter((pulse) => pulse >= 20).length;

  let speed = 1.8;
  if (averagePulse >= 18) speed += 0.9;
  if (averagePulse >= 28) speed += 1.2;
  if (highCount >= 2) speed += 0.8;
  if (highCount >= 4) speed += 0.6;
  if (maxPulse >= 40) speed += 1.1;
  if (maxPulse >= 70) speed += 1.0;
  if (maxPulse >= 90) speed += 0.6;

  return Math.max(1.8, Math.min(7.4, speed));
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return Math.max(1, x);
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

function lcmForPulseCounts(values: number[]): number {
  return values.reduce((acc, value) => lcm(acc, Math.max(1, value)), 1);
}

export function createScenePreviewDataUrl(
  snapshot: SceneSnapshot,
  size = 160,
  options?: {
    oversample?: number;
    format?: 'image/jpeg' | 'image/png';
    cycleFactor?: number;
    scaleRatio?: number;
  },
): string {
  const oversample = Math.max(1, options?.oversample ?? 1);
  const cycleFactor = Math.min(1, Math.max(0.35, options?.cycleFactor ?? 1));
  const scaleRatio = Math.min(0.42, Math.max(0.3, options?.scaleRatio ?? 0.39));
  const renderSize = Math.round(size * oversample);
  const center = renderSize / 2;
  const canvas = document.createElement('canvas');
  canvas.width = renderSize;
  canvas.height = renderSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const getInterferencePoint = (
    innerPoint: { x: number; y: number },
    outerPoint: { x: number; y: number },
  ) => ({
    x: center + (outerPoint.x - center) - (innerPoint.x - center),
    y: center + (outerPoint.y - center) - (innerPoint.y - center),
  });

  const getScenePreviewOrbits = () =>
    snapshot.orbits.map((orbit) => ({
      id: crypto.randomUUID(),
      pulseCount: orbit.pulseCount,
      radius: orbit.radius,
      direction: orbit.direction,
      color: orbit.color,
      harmonyDegree: orbit.harmonyDegree,
      harmonyRegister: orbit.harmonyRegister,
      phase: 0,
      lastTriggerBeat: -1,
    })) satisfies Orbit[];

  const traceOrbits = getScenePreviewOrbits();
  const cycleBeats = Math.min(840, Math.max(60, lcmForPulseCounts(traceOrbits.map((orbit) => orbit.pulseCount))));
  const maxRadius = Math.max(...traceOrbits.map((orbit) => orbit.radius), 1);
  const standardScale = (renderSize * scaleRatio) / maxRadius;
  const totalPairs = Math.max(1, (traceOrbits.length * (traceOrbits.length - 1)) / 2);
  const normalizedInterference = normalizeInterferenceSettings(
    traceOrbits,
    snapshot.interferenceSettings
      ? {
          sourceOrbitAId:
            snapshot.interferenceSettings.sourceOrbitAIndex != null
              ? traceOrbits[snapshot.interferenceSettings.sourceOrbitAIndex]?.id ?? null
              : null,
          sourceOrbitBId:
            snapshot.interferenceSettings.sourceOrbitBIndex != null
              ? traceOrbits[snapshot.interferenceSettings.sourceOrbitBIndex]?.id ?? null
              : null,
          showConnectors: snapshot.interferenceSettings.showConnectors,
        }
      : undefined,
  );

  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, renderSize, renderSize);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = Math.max(1, oversample);
  ctx.beginPath();
  ctx.moveTo(center, 0);
  ctx.lineTo(center, renderSize);
  ctx.moveTo(0, center);
  ctx.lineTo(renderSize, center);
  ctx.stroke();

  const drawOrbitRings = () => {
    for (const orbit of traceOrbits) {
      ctx.strokeStyle = `${orbit.color}26`;
      ctx.lineWidth = Math.max(1, oversample * 0.85);
      ctx.beginPath();
      ctx.arc(center, center, Math.max(8, orbit.radius * standardScale), 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  if (snapshot.traceMode && traceOrbits.length >= 2) {
    if (snapshot.geometryMode === 'sweep') {
      const innerOrbit = traceOrbits.find((orbit) => orbit.id === normalizedInterference.sourceOrbitAId);
      const outerOrbit = traceOrbits.find((orbit) => orbit.id === normalizedInterference.sourceOrbitBId);
      const innerRadius = 1;
      const outerRadius = 2;
      const maxModelRadius = innerRadius + outerRadius;
      const sweepScale = Math.max(1, (renderSize / 2 - 14 * oversample) / maxModelRadius);
      const pairCycle = Math.min(
        720,
        Math.max(36, lcmForPulseCounts([innerOrbit?.pulseCount ?? 1, outerOrbit?.pulseCount ?? 1])),
      );
      const previewCycle = Math.max(24, pairCycle * cycleFactor);
      const steps = Math.min(4200, Math.max(900, Math.round(previewCycle * 9)));
      let previousPoint: { x: number; y: number } | null = null;

      if (innerOrbit && outerOrbit && innerOrbit.id !== outerOrbit.id) {
        ctx.strokeStyle = '#32CD32';
        ctx.lineWidth = Math.max(1, oversample * 0.9);
        ctx.globalAlpha = 0.94;
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * (previewCycle * Math.PI * 2);
          const innerAngle = innerOrbit.direction * innerOrbit.pulseCount * t - Math.PI / 2;
          const outerAngle = outerOrbit.direction * outerOrbit.pulseCount * t - Math.PI / 2;
          const point = {
            x: center + (outerRadius * Math.cos(outerAngle) - innerRadius * Math.cos(innerAngle)) * sweepScale,
            y: center + (outerRadius * Math.sin(outerAngle) - innerRadius * Math.sin(innerAngle)) * sweepScale,
          };
          if (previousPoint) {
            ctx.beginPath();
            ctx.moveTo(previousPoint.x, previousPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
          }
          previousPoint = point;
        }
        ctx.globalAlpha = 1;
      }
    } else if (snapshot.geometryMode === 'interference-trace') {
      const innerOrbit = traceOrbits.find((orbit) => orbit.id === normalizedInterference.sourceOrbitAId);
      const outerOrbit = traceOrbits.find((orbit) => orbit.id === normalizedInterference.sourceOrbitBId);
      let previousPoint: { x: number; y: number } | null = null;
      const beatsWindow = Math.max(24, cycleBeats * cycleFactor);
      const steps = Math.min(4200, Math.max(1400, beatsWindow * 8));

      if (innerOrbit && outerOrbit && innerOrbit.id !== outerOrbit.id) {
        ctx.strokeStyle = '#32CD32';
        ctx.lineWidth = Math.max(1, oversample * 0.9);
        ctx.globalAlpha = 0.92;
        for (let i = 0; i <= steps; i++) {
          const beats = (i / steps) * beatsWindow;
          const innerPoint = resonancePositionAtBeats(
            { ...innerOrbit, radius: innerOrbit.radius * standardScale },
            beats,
            center,
            center,
          );
          const outerPoint = resonancePositionAtBeats(
            { ...outerOrbit, radius: outerOrbit.radius * standardScale },
            beats,
            center,
            center,
          );
          const point = getInterferencePoint(innerPoint, outerPoint);
          if (previousPoint) {
            ctx.beginPath();
            ctx.moveTo(previousPoint.x, previousPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
          }
          previousPoint = point;
        }
        ctx.globalAlpha = 1;
      }
    } else {
      const beatsWindow = Math.max(24, cycleBeats * cycleFactor);
      const steps = Math.min(3200, Math.max(1100, beatsWindow * 5));

      for (let step = 0; step <= steps; step++) {
        const beats = (step / steps) * beatsWindow;
        const samplePoints = traceOrbits.map((orbit) => {
          const pos = resonancePositionAtBeats(
            { ...orbit, radius: orbit.radius * standardScale },
            beats,
            center,
            center,
          );
          return { ...pos, color: orbit.color };
        });

        for (let i = 0; i < samplePoints.length; i++) {
          for (let j = i + 1; j < samplePoints.length; j++) {
            ctx.strokeStyle = samplePoints[i].color;
            ctx.globalAlpha = 0.46 / totalPairs;
            ctx.lineWidth = Math.max(0.9, oversample * 0.85);
            ctx.beginPath();
            ctx.moveTo(samplePoints[i].x, samplePoints[i].y);
            ctx.lineTo(samplePoints[j].x, samplePoints[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  drawOrbitRings();

  for (const orbit of traceOrbits) {
    const pos = resonancePositionAtBeats(
      { ...orbit, radius: orbit.radius * standardScale },
      0,
      center,
      center,
    );
    ctx.fillStyle = orbit.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, Math.max(2.6, oversample * 2.2), 0, Math.PI * 2);
    ctx.fill();
  }

  if (options?.format === 'image/png') {
    return canvas.toDataURL('image/png');
  }

  return canvas.toDataURL('image/jpeg', 0.82);
}

export const BUILT_IN_SCENES: BuiltInScene[] = [
  {
    id: 'glass_cathedral',
    name: 'Glass Cathedral',
    description: 'Bright, crystalline symmetry with open pentatonic voicing.',
    snapshot: {
      orbits: [
        { pulseCount: 3, radius: 96, direction: 1, color: '#00FFAA', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 4, radius: 156, direction: -1, color: '#FF3366', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 5, radius: 216, direction: 1, color: '#3388FF', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 7, radius: 276, direction: -1, color: '#FFAA00', harmonyDegree: 1, harmonyRegister: 1 },
      ],
      speedMultiplier: DEFAULT_SCENE_SPEED,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'C',
        scaleName: 'majorPentatonic',
        mappingMode: 'orbit-index',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'prime_ritual',
    name: 'Prime Ritual',
    description: 'Prime pulse counts and darker modal tension for denser lattices.',
    snapshot: {
      orbits: [
        { pulseCount: 2, radius: 90, direction: 1, color: '#00FFAA', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 3, radius: 150, direction: -1, color: '#AA44FF', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 5, radius: 210, direction: 1, color: '#FF3366', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 7, radius: 270, direction: -1, color: '#3388FF', harmonyDegree: 6, harmonyRegister: 1 },
      ],
      speedMultiplier: DEFAULT_SCENE_SPEED,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'D',
        scaleName: 'dorian',
        mappingMode: 'pulse-count',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'rose_engine',
    name: 'Rose Engine',
    description: 'Floral interference with soft chromatic tension and layered radii.',
    snapshot: {
      orbits: [
        { pulseCount: 4, radius: 84, direction: 1, color: '#44FF88', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 6, radius: 138, direction: -1, color: '#FF4488', harmonyDegree: 3, harmonyRegister: 0 },
        { pulseCount: 9, radius: 198, direction: 1, color: '#88CCFF', harmonyDegree: 5, harmonyRegister: 1 },
        { pulseCount: 12, radius: 258, direction: -1, color: '#FFCC00', harmonyDegree: 7, harmonyRegister: 1 },
      ],
      speedMultiplier: DEFAULT_SCENE_SPEED,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'A',
        scaleName: 'lydian',
        mappingMode: 'radius',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'blue_mandala',
    name: 'Blue Mandala',
    description: 'A contemplative, slower field tuned for dense circular memory.',
    snapshot: {
      orbits: [
        { pulseCount: 5, radius: 108, direction: 1, color: '#00CCFF', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 8, radius: 176, direction: -1, color: '#3388FF', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 13, radius: 244, direction: 1, color: '#88CCFF', harmonyDegree: 4, harmonyRegister: 1 },
      ],
      speedMultiplier: DEFAULT_SCENE_SPEED,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'original',
        rootNote: 'C',
        scaleName: 'majorPentatonic',
        mappingMode: 'color-hue',
        manualOrbitRoles: false,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'dorian_bloom',
    name: 'Dorian Bloom',
    description: 'Balanced floral motion with a lifted minor color and gentle expansion.',
    snapshot: {
      orbits: [
        { pulseCount: 3, radius: 92, direction: 1, color: '#44FF88', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 5, radius: 152, direction: -1, color: '#00CCFF', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 8, radius: 212, direction: 1, color: '#FF4488', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 13, radius: 272, direction: -1, color: '#FFCC00', harmonyDegree: 6, harmonyRegister: 1 },
      ],
      speedMultiplier: DEFAULT_SCENE_SPEED,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'G',
        scaleName: 'dorian',
        mappingMode: 'orbit-index',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'silent_cosmology',
    name: 'Silent Cosmology',
    description: 'Wide radii and restrained motion for spacious, observatory-like geometry.',
    snapshot: {
      orbits: [
        { pulseCount: 4, radius: 118, direction: 1, color: '#88CCFF', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 7, radius: 196, direction: -1, color: '#3388FF', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 11, radius: 274, direction: 1, color: '#00FFAA', harmonyDegree: 4, harmonyRegister: 0 },
      ],
      speedMultiplier: DEFAULT_SCENE_SPEED,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'F',
        scaleName: 'lydian',
        mappingMode: 'radius',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'metallic_whorl',
    name: 'Metallic Whorl',
    description: 'Sharper rotational density with whole-tone shimmer and bright outer spokes.',
    snapshot: {
      orbits: [
        { pulseCount: 6, radius: 86, direction: 1, color: '#FFAA00', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 8, radius: 142, direction: -1, color: '#FF6600', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 10, radius: 198, direction: 1, color: '#AA44FF', harmonyDegree: 4, harmonyRegister: 1 },
        { pulseCount: 15, radius: 254, direction: -1, color: '#00CCFF', harmonyDegree: 6, harmonyRegister: 1 },
      ],
      speedMultiplier: DEFAULT_SCENE_SPEED,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'E',
        scaleName: 'wholeTone',
        mappingMode: 'pulse-count',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'aeolian_tide',
    name: 'Aeolian Tide',
    description: 'A darker rolling field that feels tidal, cyclical, and slightly melancholic.',
    snapshot: {
      orbits: [
        { pulseCount: 5, radius: 102, direction: 1, color: '#00FFAA', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 7, radius: 162, direction: -1, color: '#3388FF', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 9, radius: 222, direction: 1, color: '#FF3366', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 14, radius: 282, direction: -1, color: '#AA44FF', harmonyDegree: 6, harmonyRegister: 1 },
      ],
      speedMultiplier: DEFAULT_SCENE_SPEED,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'E',
        scaleName: 'aeolian',
        mappingMode: 'color-hue',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
];

for (const scene of BUILT_IN_SCENES) {
  scene.thumbnailDataUrl = BUILT_IN_SCENE_ASSET_MAP[scene.id] ?? createScenePreviewDataUrl(scene.snapshot);
}

function normalizeSceneInterferenceSettings(
  orbitCount: number,
  settings?: Partial<SceneInterferenceSettings> | null,
): SceneInterferenceSettings {
  if (orbitCount <= 0) {
    return {
      sourceOrbitAIndex: null,
      sourceOrbitBIndex: null,
      showConnectors: settings?.showConnectors ?? true,
    };
  }

  if (orbitCount === 1) {
    return {
      sourceOrbitAIndex: 0,
      sourceOrbitBIndex: null,
      showConnectors: settings?.showConnectors ?? true,
    };
  }

  const safeIndex = (value: number | null | undefined) =>
    typeof value === 'number' && value >= 0 && value < orbitCount ? value : null;

  let sourceOrbitAIndex = safeIndex(settings?.sourceOrbitAIndex) ?? 0;
  let sourceOrbitBIndex = safeIndex(settings?.sourceOrbitBIndex) ?? 1;

  if (sourceOrbitAIndex === sourceOrbitBIndex) {
    sourceOrbitBIndex = sourceOrbitAIndex === 0 ? 1 : 0;
  }

  return {
    sourceOrbitAIndex,
    sourceOrbitBIndex,
    showConnectors: settings?.showConnectors ?? true,
  };
}

function resolveLiveInterferenceSettings(
  orbits: Orbit[],
  settings?: Partial<SceneInterferenceSettings> | null,
): InterferenceSettings {
  const normalizedScene = normalizeSceneInterferenceSettings(orbits.length, settings);
  return normalizeInterferenceSettings(orbits, {
    sourceOrbitAId:
      normalizedScene.sourceOrbitAIndex != null ? orbits[normalizedScene.sourceOrbitAIndex]?.id ?? null : null,
    sourceOrbitBId:
      normalizedScene.sourceOrbitBIndex != null ? orbits[normalizedScene.sourceOrbitBIndex]?.id ?? null : null,
    showConnectors: normalizedScene.showConnectors,
  });
}

function serializeInterferenceSettings(
  orbits: Orbit[],
  settings: InterferenceSettings,
): SceneInterferenceSettings {
  const normalized = normalizeInterferenceSettings(orbits, settings);
  return normalizeSceneInterferenceSettings(orbits.length, {
    sourceOrbitAIndex: orbits.findIndex((orbit) => orbit.id === normalized.sourceOrbitAId),
    sourceOrbitBIndex: orbits.findIndex((orbit) => orbit.id === normalized.sourceOrbitBId),
    showConnectors: normalized.showConnectors,
  });
}

function loadSavedScenes(): SavedScene[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SCENES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SavedScene[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedScenes(scenes: SavedScene[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenes));
}

function downloadSceneFile(scene: SavedScene): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: ImportedSceneFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scene,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = scene.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  anchor.href = url;
  anchor.download = `${safeName || 'orbital-scene'}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

function normalizeImportedScene(value: unknown): SavedScene | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const maybeWrapper = value as Partial<ImportedSceneFile>;
  const scene = maybeWrapper.scene ?? value;
  if (!scene || typeof scene !== 'object') {
    return null;
  }

  const candidate = scene as Partial<SavedScene>;
  if (
    typeof candidate.name !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    !candidate.snapshot ||
    typeof candidate.snapshot !== 'object'
  ) {
    return null;
  }

  const snapshot = candidate.snapshot as Partial<SceneSnapshot>;
  if (
    !Array.isArray(snapshot.orbits) ||
    typeof snapshot.speedMultiplier !== 'number' ||
    typeof snapshot.traceMode !== 'boolean' ||
    !snapshot.harmonySettings ||
    typeof snapshot.harmonySettings !== 'object'
  ) {
    return null;
  }

  return {
    id: typeof candidate.id === 'string' ? candidate.id : globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}`,
    name: candidate.name,
    updatedAt: candidate.updatedAt,
    thumbnailDataUrl: typeof candidate.thumbnailDataUrl === 'string' ? candidate.thumbnailDataUrl : undefined,
    snapshot: {
      orbits: snapshot.orbits as SceneOrbitSnapshot[],
      speedMultiplier: snapshot.speedMultiplier,
      traceMode: snapshot.traceMode,
      harmonySettings: snapshot.harmonySettings as HarmonySettings,
      geometryMode:
        snapshot.geometryMode === 'interference-trace'
          ? 'interference-trace'
          : snapshot.geometryMode === 'sweep'
            ? 'sweep'
            : 'standard-trace',
      interferenceSettings: normalizeSceneInterferenceSettings(
        snapshot.orbits.length,
        snapshot.interferenceSettings as Partial<SceneInterferenceSettings> | undefined,
      ),
    },
  };
}

function applySceneSnapshot(
  engineState: EngineState,
  snapshot: SceneSnapshot,
  setTraceMode: (traceMode: boolean) => void,
  setHarmonySettings: (settings: HarmonySettings) => void,
  setGeometryMode: (mode: GeometryMode) => void,
  setInterferenceSettings: (settings: InterferenceSettings) => void,
  clearTraces: () => void,
): void {
  stopAllAudio();
  engineState.playing = false;
  engineState.speedMultiplier = snapshot.speedMultiplier;
  engineState.orbits = snapshot.orbits.map((orbit) => createOrbit(orbit));
  resetEngine(engineState);
  setTraceMode(snapshot.traceMode);
  setHarmonySettings(snapshot.harmonySettings);
  setGeometryMode(snapshot.geometryMode);
  setInterferenceSettings(
    resolveLiveInterferenceSettings(
      engineState.orbits,
      snapshot.interferenceSettings,
    ),
  );
  clearTraces();
}

function launchLoadedState(
  engineState: EngineState,
  closeSidebar: () => void,
  rerender: () => void,
): void {
  resumeAudio();
  engineState.playing = true;
  engineState.lastTimestamp = -1;
  closeSidebar();
  rerender();
}

function OrbitalPolymeter() {
  const isMobile = useIsMobile();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const captureMode = searchParams?.get('captureMode') === '1';
  const captureSceneId = searchParams?.get('captureScene');
  const captureSpeed = Math.max(0.5, Math.min(3, Number(searchParams?.get('captureSpeed') ?? '1') || 1));
  const captureBeatsParam = Number(searchParams?.get('captureBeats') ?? '');
  const siteSceneId = searchParams?.get('scene');
  const [engineState] = useState<EngineState>(() => {
    const state = createEngineState();
    state.orbits = DEFAULT_ORBITS.map((def) => createOrbit(def));
    state.playing = true;
    return state;
  });

  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [traceMode, setTraceMode] = useState(true);
  const [showPlanets, setShowPlanets] = useState(true);
  const [topStatusVisible, setTopStatusVisible] = useState(true);
  const [canvasHudVisible, setCanvasHudVisible] = useState(true);
  const [muted, setMuted] = useState(() => getAudioMuted());
  const [harmonySettings, setHarmonySettings] = useState<HarmonySettings>(DEFAULT_HARMONY_SETTINGS);
  const [geometryMode, setGeometryMode] = useState<GeometryMode>('standard-trace');
  const [interferenceSettings, setInterferenceSettings] = useState<InterferenceSettings>(() =>
    normalizeInterferenceSettings(engineState.orbits, DEFAULT_INTERFERENCE_SETTINGS),
  );
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>(loadSavedScenes);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [radialMenu, setRadialMenu] = useState<{
    orbitId: string;
    x: number;
    y: number;
  } | null>(null);
  const [mobileScenesOpen, setMobileScenesOpen] = useState(false);
  const [mobileCustomizeOpen, setMobileCustomizeOpen] = useState(false);
  const [mobileSoundOpen, setMobileSoundOpen] = useState(false);
  const [helpStepIndex, setHelpStepIndex] = useState(0);
  const [guideRect, setGuideRect] = useState<DOMRect | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureLoadedRef = useRef(false);
  const siteSceneLoadedRef = useRef(false);
  const recentRandomSignaturesRef = useRef<Record<string, RandomHistoryEntry[]>>({});
  const guideSteps = isMobile ? MOBILE_START_GUIDE : DESKTOP_START_GUIDE;
  const currentGuideStep = guideSteps[Math.min(helpStepIndex, guideSteps.length - 1)];
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const guideCalloutHeight = isMobile ? 230 : 220;
  const guideCalloutWidth = isMobile ? Math.max(320, viewportWidth - 24) : 360;
  const guideCalloutStyle = (() => {
    const base = {
      background: 'rgba(17, 17, 22, 0.92)',
      backdropFilter: 'blur(16px)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
    } as const;

    if (!guideRect) {
      return isMobile
        ? { ...base, left: 12, right: 12, bottom: 24 }
        : { ...base, right: 24, bottom: 32, width: guideCalloutWidth };
    }

    if (isMobile) {
      const fitsBelow = guideRect.bottom + guideCalloutHeight + 28 < viewportHeight;
      return {
        ...base,
        left: 12,
        right: 12,
        top: fitsBelow ? Math.min(viewportHeight - guideCalloutHeight - 24, guideRect.bottom + 18) : undefined,
        bottom: fitsBelow ? undefined : Math.max(24, viewportHeight - guideRect.top + 18),
      };
    }

    const canFitRight = guideRect.right + guideCalloutWidth + 32 < viewportWidth;
    const canFitLeft = guideRect.left - guideCalloutWidth - 32 > 0;
    const top = Math.min(viewportHeight - guideCalloutHeight - 24, Math.max(24, guideRect.top - 8));

    if (canFitRight) {
      return {
        ...base,
        width: guideCalloutWidth,
        left: guideRect.right + 18,
        top,
      };
    }

    if (canFitLeft) {
      return {
        ...base,
        width: guideCalloutWidth,
        left: guideRect.left - guideCalloutWidth - 18,
        top,
      };
    }

    const fitsBelow = guideRect.bottom + guideCalloutHeight + 28 < viewportHeight;
    return {
      ...base,
      width: guideCalloutWidth,
      left: Math.min(viewportWidth - guideCalloutWidth - 24, Math.max(24, guideRect.left + guideRect.width / 2 - guideCalloutWidth / 2)),
      top: fitsBelow ? Math.min(viewportHeight - guideCalloutHeight - 24, guideRect.bottom + 18) : undefined,
      bottom: fitsBelow ? undefined : Math.max(24, viewportHeight - guideRect.top + 18),
    };
  })();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedTopStatusVisible = window.localStorage.getItem(TOP_STATUS_VISIBLE_STORAGE_KEY);
    const storedCanvasHudVisible = window.localStorage.getItem(CANVAS_HUD_VISIBLE_STORAGE_KEY);
    if (storedTopStatusVisible != null) {
      setTopStatusVisible(storedTopStatusVisible !== '0');
    }
    if (storedCanvasHudVisible != null) {
      setCanvasHudVisible(storedCanvasHudVisible !== '0');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(TOP_STATUS_VISIBLE_STORAGE_KEY, topStatusVisible ? '1' : '0');
  }, [topStatusVisible]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(CANVAS_HUD_VISIBLE_STORAGE_KEY, canvasHudVisible ? '1' : '0');
  }, [canvasHudVisible]);

  useEffect(() => {
    if (!presentationMode) {
      return;
    }

    setSidebarOpen(false);
    setHelpOpen(false);
    setRadialMenu(null);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresentationMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationMode]);

  useEffect(() => {
    if (!helpOpen || !isMobile) {
      return;
    }

    if (currentGuideStep?.target === 'mobile-scenes') {
      setMobileScenesOpen(true);
    }
    if (
      currentGuideStep?.target === 'mobile-customize' ||
      currentGuideStep?.target === 'mobile-layers' ||
      currentGuideStep?.target === 'mobile-direction' ||
      currentGuideStep?.target === 'mobile-trail' ||
      currentGuideStep?.target === 'mobile-markers'
    ) {
      setMobileCustomizeOpen(true);
    }
    if (
      currentGuideStep?.target === 'mobile-sound' ||
      currentGuideStep?.target === 'mobile-audio'
    ) {
      setMobileSoundOpen(true);
    }
  }, [currentGuideStep, helpOpen, isMobile]);

  useEffect(() => {
    if (!helpOpen || !currentGuideStep) {
      setGuideRect(null);
      return;
    }

    const updateGuideRect = () => {
      const element = document.querySelector<HTMLElement>(`[data-guide="${currentGuideStep.target}"]`);
      setGuideRect(element?.getBoundingClientRect() ?? null);
    };

    updateGuideRect();
    window.addEventListener('resize', updateGuideRect);
    window.addEventListener('scroll', updateGuideRect, true);
    return () => {
      window.removeEventListener('resize', updateGuideRect);
      window.removeEventListener('scroll', updateGuideRect, true);
    };
  }, [currentGuideStep, helpOpen]);

  const handleTogglePresentation = useCallback(() => {
    setPresentationMode((current) => {
      const next = !current;
      if (!isMobile) {
        if (next && document.documentElement.requestFullscreen) {
          void document.documentElement.requestFullscreen().catch(() => {});
        } else if (!next && document.fullscreenElement && document.exitFullscreen) {
          void document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, [isMobile]);

  const openStartGuide = useCallback(() => {
    setHelpStepIndex(0);
    setHelpOpen(true);
  }, []);

  const closeStartGuide = useCallback(() => {
    setHelpOpen(false);
  }, []);

  const handleTogglePlay = useCallback(() => {
    resumeAudio();
    engineState.playing = !engineState.playing;
    if (!engineState.playing) {
      engineState.lastTimestamp = -1;
    }
    rerender();
  }, [engineState, rerender]);

  const handleToggleTrace = useCallback(() => {
    setTraceMode((t) => !t);
  }, []);

  const handleTogglePlanets = useCallback(() => {
    setShowPlanets((current) => !current);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted(toggleAudioMute());
  }, []);

  const handleClearTraces = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (canvasEl && (canvasEl as any).__clearTraces) {
      (canvasEl as any).__clearTraces();
    }
    rerender();
  }, [rerender]);

  useEffect(() => {
    if (captureMode || !siteSceneId || siteSceneLoadedRef.current) {
      return;
    }

    const scene = BUILT_IN_SCENES.find((entry) => entry.id === siteSceneId);
    if (!scene) {
      return;
    }

    siteSceneLoadedRef.current = true;
    applySceneSnapshot(
      engineState,
      scene.snapshot,
      setTraceMode,
      setHarmonySettings,
      setGeometryMode,
      setInterferenceSettings,
      handleClearTraces,
    );
    launchLoadedState(engineState, () => setSidebarOpen(false), rerender);
  }, [
    captureMode,
    engineState,
    handleClearTraces,
    rerender,
    siteSceneId,
  ]);

  useEffect(() => {
    if (!captureMode || !captureSceneId || captureLoadedRef.current) {
      return;
    }

    const scene = BUILT_IN_SCENES.find((entry) => entry.id === captureSceneId);
    if (!scene) {
      return;
    }

    captureLoadedRef.current = true;
    applySceneSnapshot(
      engineState,
      scene.snapshot,
      setTraceMode,
      setHarmonySettings,
      setGeometryMode,
      setInterferenceSettings,
      handleClearTraces,
    );
    engineState.speedMultiplier = captureSpeed;
    const captureBeats = Number.isFinite(captureBeatsParam) && captureBeatsParam > 0
      ? captureBeatsParam
      : scene.snapshot.geometryMode === 'standard-trace'
        ? 220
        : scene.snapshot.geometryMode === 'interference-trace'
          ? 140
          : 48;
    stepEngineByBeats(engineState, captureBeats, 0, 0);
    engineState.playing = false;
    engineState.lastTimestamp = -1;
    rerender();
  }, [
    captureBeatsParam,
    captureMode,
    captureSceneId,
    captureSpeed,
    engineState,
    handleClearTraces,
    rerender,
  ]);

  const handleSpeedChange = useCallback(
    (speed: number) => {
      engineState.speedMultiplier = Math.max(0.1, Math.min(10, speed));
      resetEngine(engineState);
      handleClearTraces();
      rerender();
    },
    [engineState, handleClearTraces, rerender],
  );

  const handleHarmonyChange = useCallback((updates: Partial<HarmonySettings>) => {
    setHarmonySettings((current) => ({ ...current, ...updates }));
  }, []);

  const handleReset = useCallback(() => {
    stopAllAudio();
    engineState.playing = false;
    resetEngine(engineState);
    handleClearTraces();
    rerender();
  }, [engineState, handleClearTraces, rerender]);

  const handleStepForward = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) {
      return;
    }

    resumeAudio();
    engineState.playing = false;

    const dpr = window.devicePixelRatio || 1;
    const centerX = canvasEl.width / dpr / 2;
    const centerY = canvasEl.height / dpr / 2;
    stepEngineByBeats(engineState, MANUAL_STEP_BEATS, centerX, centerY);
    rerender();
  }, [engineState, rerender]);

  const handleUpdateOrbit = useCallback(
    (
      id: string,
      updates: Partial<Pick<Orbit, 'pulseCount' | 'radius' | 'direction' | 'color' | 'harmonyDegree' | 'harmonyRegister'>>,
    ) => {
      const orbit = engineState.orbits.find((o) => o.id === id);
      if (orbit) {
        Object.assign(orbit, updates);
        setInterferenceSettings((current) => normalizeInterferenceSettings(engineState.orbits, current));
        if (typeof updates.direction === 'number') {
          resetEngine(engineState);
          handleClearTraces();
        }
        rerender();
      }
    },
    [engineState, handleClearTraces, rerender],
  );

  const handleDeleteOrbit = useCallback(
    (id: string) => {
      engineState.orbits = engineState.orbits.filter((o) => o.id !== id);
      setInterferenceSettings((current) => normalizeInterferenceSettings(engineState.orbits, current));
      rerender();
    },
    [engineState, rerender],
  );

  const handleAddOrbit = useCallback(() => {
    const colors = [
      '#00FFAA', '#FF3366', '#3388FF', '#FFAA00',
      '#AA44FF', '#FF6600', '#00CCFF', '#FF0088',
    ];
    const existingRadii = engineState.orbits.map((o) => o.radius);
    let newRadius = 120;
    while (existingRadii.some((r) => Math.abs(r - newRadius) < 30)) {
      newRadius += 60;
    }
    const newOrbit = createOrbit({
      pulseCount: 3 + Math.floor(Math.random() * 8),
      radius: Math.min(newRadius, 500),
      direction: Math.random() > 0.5 ? 1 : -1,
      color: colors[engineState.orbits.length % colors.length],
      harmonyDegree: engineState.orbits.length % 5,
      harmonyRegister: 0,
    });
    engineState.orbits.push(newOrbit);
    setInterferenceSettings((current) => normalizeInterferenceSettings(engineState.orbits, current));
    rerender();
  }, [engineState, rerender]);

  const handleLoadPreset = useCallback(
    (ratios: number[]) => {
      const colors = [
        '#00FFAA', '#FF3366', '#3388FF', '#FFAA00',
        '#AA44FF', '#FF6600', '#00CCFF', '#FF0088',
      ];
      engineState.orbits = ratios.map((pulseCount, idx) =>
        createOrbit({
          pulseCount,
          radius: 80 + idx * 60,
          direction: idx % 2 === 0 ? 1 : -1,
          color: colors[idx % colors.length],
          harmonyDegree: idx % 5,
          harmonyRegister: idx > 2 ? 1 : 0,
        }),
      );
      setInterferenceSettings((current) => normalizeInterferenceSettings(engineState.orbits, current));
      handleClearTraces();
      resumeAudio();
      engineState.playing = true;
      engineState.lastTimestamp = -1;
      setSidebarOpen(false);
      rerender();
    },
    [engineState, handleClearTraces, rerender],
  );

  const handleGeometryModeChange = useCallback(
    (mode: GeometryMode) => {
      if (geometryMode === mode) {
        return;
      }
      setGeometryMode(mode);
      resetEngine(engineState);
      handleClearTraces();
      rerender();
    },
    [engineState, geometryMode, handleClearTraces, rerender],
  );

  const handleInterferenceSettingsChange = useCallback(
    (updates: Partial<InterferenceSettings>) => {
      setInterferenceSettings((current) =>
        normalizeInterferenceSettings(engineState.orbits, {
          ...current,
          ...updates,
        }),
      );
      handleClearTraces();
    },
    [engineState.orbits, handleClearTraces],
  );

  const handleReverseDirections = useCallback(() => {
    engineState.orbits.forEach((orbit) => {
      orbit.direction = orbit.direction === 1 ? -1 : 1;
    });
    resetEngine(engineState);
    handleClearTraces();
    rerender();
  }, [engineState, handleClearTraces, rerender]);

  const handleAllClockwise = useCallback(() => {
    engineState.orbits.forEach((orbit) => {
      orbit.direction = 1;
    });
    resetEngine(engineState);
    handleClearTraces();
    rerender();
  }, [engineState, handleClearTraces, rerender]);

  const handleAlternateDirections = useCallback(() => {
    engineState.orbits.forEach((orbit, index) => {
      orbit.direction = index % 2 === 0 ? 1 : -1;
    });
    resetEngine(engineState);
    handleClearTraces();
    rerender();
  }, [engineState, handleClearTraces, rerender]);

  const handleOrbitLongPress = useCallback(
    (orbitId: string, x: number, y: number) => {
      setRadialMenu({ orbitId, x, y });
    },
    [],
  );

  const handleRadialColorChange = useCallback(
    (orbitId: string, color: string) => {
      handleUpdateOrbit(orbitId, { color });
    },
    [handleUpdateOrbit],
  );

  const handleAdjustQuickOrbit = useCallback(
    (orbitId: string, delta: number) => {
      const orbit = engineState.orbits.find((entry) => entry.id === orbitId);
      if (!orbit) {
        return;
      }
      orbit.pulseCount = Math.max(1, Math.min(1000, orbit.pulseCount + delta));
      handleClearTraces();
      rerender();
    },
    [engineState, handleClearTraces, rerender],
  );

  const handleSetQuickOrbit = useCallback(
    (orbitId: string, pulseCount: number) => {
      const orbit = engineState.orbits.find((entry) => entry.id === orbitId);
      if (!orbit) {
        return;
      }
      orbit.pulseCount = Math.max(1, Math.min(1000, pulseCount));
      handleClearTraces();
      rerender();
    },
    [engineState, handleClearTraces, rerender],
  );

  const handleToggleOrbitDirection = useCallback(
    (orbitId: string) => {
      const orbit = engineState.orbits.find((entry) => entry.id === orbitId);
      if (!orbit) {
        return;
      }
      orbit.direction = orbit.direction === 1 ? -1 : 1;
      resetEngine(engineState);
      handleClearTraces();
      rerender();
    },
    [engineState, handleClearTraces, rerender],
  );

  const applyRandomPattern = useCallback((options?: { extended?: boolean }) => {
    const isExtended = Boolean(options?.extended);
    const isSweepMode = geometryMode === 'sweep';
    const isPatternMode = geometryMode === 'interference-trace';
    const historyKey = `${geometryMode}:${isExtended ? 'plus' : 'base'}`;
    const recentEntries = recentRandomSignaturesRef.current[historyKey] ?? [];
    const nextCount =
      geometryMode === 'standard-trace'
        ? (isExtended ? randomInt(3, 5) : randomInt(3, 5))
        : 2;

    if (geometryMode === 'standard-trace') {
      if (engineState.orbits.length < nextCount) {
        while (engineState.orbits.length < nextCount) {
          engineState.orbits.push(createOrbit(DEFAULT_ORBITS[engineState.orbits.length % DEFAULT_ORBITS.length]));
        }
      } else if (engineState.orbits.length > nextCount) {
        engineState.orbits = engineState.orbits.slice(0, nextCount);
      }
    } else {
      if (engineState.orbits.length < nextCount) {
        while (engineState.orbits.length < nextCount) {
          engineState.orbits.push(createOrbit(DEFAULT_ORBITS[engineState.orbits.length % DEFAULT_ORBITS.length]));
        }
      } else if (engineState.orbits.length > nextCount) {
        engineState.orbits = engineState.orbits.slice(0, nextCount);
      }
    }

    let pulses = buildModeAwarePulses(geometryMode, engineState.orbits.length, options);
    let directions = buildModeAwareDirections(geometryMode, engineState.orbits.length, options);
    let colors = buildRandomColors(engineState.orbits.length, options);
    let speedMultiplier = computeRandomSpeed(geometryMode, pulses, options);
    let candidate: RandomHistoryEntry = {
      pulses,
      directions,
      colors,
      speedBucket: Math.round(speedMultiplier * 10),
    };

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const hasEnoughSpread =
        geometryMode === 'standard-trace'
          ? uniqueNumbers(pulses).length >= Math.max(3, engineState.orbits.length - 1) && maxGap(pulses) >= (isExtended ? 5 : 2)
          : Math.abs(pulses[1]! - pulses[0]!) >= (isExtended ? 4 : 2);
      if (hasEnoughSpread && !shouldRejectCandidate(candidate, recentEntries)) {
        break;
      }
      pulses = buildModeAwarePulses(geometryMode, engineState.orbits.length, options);
      directions = buildModeAwareDirections(geometryMode, engineState.orbits.length, options);
      colors = buildRandomColors(engineState.orbits.length, options);
      speedMultiplier = computeRandomSpeed(geometryMode, pulses, options);
      candidate = {
        pulses,
        directions,
        colors,
        speedBucket: Math.round(speedMultiplier * 10),
      };
    }

    const useKeyedHarmony = isExtended ? Math.random() > 0.15 : Math.random() > 0.35;
    const scaleNames = Object.keys(SCALE_PRESETS) as ScaleName[];
    const nextScale = randomItem(scaleNames.filter((scale) => scale !== 'chromatic'));
    const nextRoot = randomItem(NOTE_NAMES);
    const nextMappingMode = randomItem(
      isExtended ? RANDOM_MAPPING_MODES.filter((mode) => mode !== 'color-hue') : RANDOM_MAPPING_MODES,
    );
    const useManualOrbitRoles = useKeyedHarmony && (isExtended ? Math.random() > 0.7 : Math.random() > 0.45);
    const scaleLength = SCALE_PRESETS[nextScale].intervals.length;
    const harmonyAssignments = buildHarmonyAssignments(engineState.orbits.length, scaleLength, options);
    const pairCandidates =
      engineState.orbits.length <= 2
        ? [0, Math.max(1, engineState.orbits.length - 1)]
        : shuffleArray(Array.from({ length: engineState.orbits.length }, (_, index) => index)).slice(0, 2).sort((a, b) => a - b);

    engineState.orbits.forEach((orbit, index) => {
      orbit.pulseCount = pulses[index];
      orbit.direction = directions[index];
      orbit.color =
        isSweepMode || isPatternMode
          ? colors[index]
          : colors[index % colors.length];
      orbit.harmonyDegree = harmonyAssignments[index]?.degree ?? 0;
      orbit.harmonyRegister = harmonyAssignments[index]?.register ?? 0;
    });

    setHarmonySettings((current) => ({
      ...current,
      tonePreset: useKeyedHarmony ? 'scale-quantized' : 'original',
      rootNote: nextRoot,
      scaleName: nextScale,
      mappingMode: nextMappingMode,
      manualOrbitRoles: useManualOrbitRoles,
    }));

    setInterferenceSettings((current) =>
      normalizeInterferenceSettings(engineState.orbits, {
        ...current,
        sourceOrbitAId: engineState.orbits[pairCandidates[0]]?.id,
        sourceOrbitBId: engineState.orbits[pairCandidates[1]]?.id,
        showConnectors: isSweepMode ? false : isPatternMode ? true : isExtended ? Math.random() > 0.35 : Math.random() > 0.5,
      }),
    );

    resetEngine(engineState);
    handleClearTraces();
    engineState.speedMultiplier = speedMultiplier;
    recentRandomSignaturesRef.current[historyKey] = [...recentEntries, candidate].slice(-12);
    engineState.playing = true;
    engineState.lastTimestamp = -1;
    rerender();
  }, [engineState, geometryMode, handleClearTraces, rerender]);

  const handleRandomPattern = useCallback(() => {
    applyRandomPattern();
  }, [applyRandomPattern]);

  const handleRandomPatternPlus = useCallback(() => {
    applyRandomPattern({ extended: true });
  }, [applyRandomPattern]);

  const handleSaveScene = useCallback(() => {
    const run = async () => {
      const now = new Date().toISOString();
      const defaultName = `Scene ${savedScenes.length + 1}`;
      const snapshot: SceneSnapshot = {
        orbits: engineState.orbits.map(({ pulseCount, radius, direction, color, harmonyDegree, harmonyRegister }) => ({
          pulseCount,
          radius,
          direction,
          color,
          harmonyDegree,
          harmonyRegister,
        })),
        speedMultiplier: engineState.speedMultiplier,
        traceMode,
        harmonySettings,
        geometryMode,
        interferenceSettings: serializeInterferenceSettings(engineState.orbits, interferenceSettings),
      };
      const thumbnailDataUrl = await (canvasRef.current as any)?.__captureThumbnail?.();

      const newScene: SavedScene = {
        id: globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}`,
        name: defaultName,
        updatedAt: now,
        snapshot,
        thumbnailDataUrl,
      };

      setSavedScenes((current) => {
        const next = [newScene, ...current];
        persistSavedScenes(next);
        return next;
      });
    };

    void run();
  }, [engineState.orbits, engineState.speedMultiplier, geometryMode, harmonySettings, interferenceSettings, savedScenes.length, traceMode]);

  const handleSaveSceneAs = useCallback(
    (name: string) => {
      const run = async () => {
        const trimmedName = name.trim();
        const sceneName = trimmedName || `Scene ${savedScenes.length + 1}`;
        const now = new Date().toISOString();
        const snapshot: SceneSnapshot = {
          orbits: engineState.orbits.map(({ pulseCount, radius, direction, color, harmonyDegree, harmonyRegister }) => ({
            pulseCount,
            radius,
            direction,
            color,
            harmonyDegree,
            harmonyRegister,
          })),
          speedMultiplier: engineState.speedMultiplier,
          traceMode,
          harmonySettings,
          geometryMode,
          interferenceSettings: serializeInterferenceSettings(engineState.orbits, interferenceSettings),
        };
        const thumbnailDataUrl = await (canvasRef.current as any)?.__captureThumbnail?.();

        const newScene: SavedScene = {
          id: globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}`,
          name: sceneName,
          updatedAt: now,
          snapshot,
          thumbnailDataUrl,
        };

        setSavedScenes((current) => {
          const next = [newScene, ...current];
          persistSavedScenes(next);
          return next;
        });
      };

      void run();
    },
    [engineState.orbits, engineState.speedMultiplier, geometryMode, harmonySettings, interferenceSettings, savedScenes.length, traceMode],
  );

  const handleLoadScene = useCallback(
    (sceneId: string) => {
      const scene = savedScenes.find((entry) => entry.id === sceneId);
      if (!scene) {
        return;
      }
      applySceneSnapshot(
        engineState,
        scene.snapshot,
        setTraceMode,
        setHarmonySettings,
        setGeometryMode,
        setInterferenceSettings,
        handleClearTraces,
      );
      launchLoadedState(engineState, () => setSidebarOpen(false), rerender);
    },
    [engineState, handleClearTraces, rerender, savedScenes],
  );

  const handleLoadBuiltInScene = useCallback(
    (sceneId: string) => {
      const scene = BUILT_IN_SCENES.find((entry) => entry.id === sceneId);
      if (!scene) {
        return;
      }
      applySceneSnapshot(
        engineState,
        scene.snapshot,
        setTraceMode,
        setHarmonySettings,
        setGeometryMode,
        setInterferenceSettings,
        handleClearTraces,
      );
      launchLoadedState(engineState, () => setSidebarOpen(false), rerender);
    },
    [engineState, handleClearTraces, rerender],
  );

  const handleDeleteScene = useCallback((sceneId: string) => {
    setSavedScenes((current) => {
      const next = current.filter((scene) => scene.id !== sceneId);
      persistSavedScenes(next);
      return next;
    });
  }, []);

  const handleExportPng = useCallback((options: { aspect: 'landscape' | 'square' | 'portrait' | 'story'; scale: 1 | 2 | 4 }) => {
    const canvasEl = canvasRef.current;
    if (canvasEl && (canvasEl as any).__exportPng) {
      (canvasEl as any).__exportPng(options);
    }
  }, []);

  const handleExportVideo = useCallback(
    async (options: { durationSeconds: 8 | 12 }) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || !(canvasEl as any).__exportVideo || recordingVideo) {
        return;
      }

      try {
        setRecordingVideo(true);
        stopAllAudio();
        resetEngine(engineState);
        handleClearTraces();
        resumeAudio();
        engineState.playing = true;
        engineState.lastTimestamp = -1;
        rerender();
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await (canvasEl as any).__exportVideo(options);
      } catch (error) {
        console.error(error);
      } finally {
        setRecordingVideo(false);
      }
    },
    [engineState, handleClearTraces, recordingVideo, rerender],
  );

  const handleExportScene = useCallback(
    (sceneId: string) => {
      const scene = savedScenes.find((entry) => entry.id === sceneId);
      if (!scene) {
        return;
      }

      downloadSceneFile(scene);
    },
    [savedScenes],
  );

  const handleImportScene = useCallback(async (file: File) => {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const importedScene = normalizeImportedScene(parsed);
      if (!importedScene) {
        return;
      }

      const sceneWithFreshId: SavedScene = {
        ...importedScene,
        id: globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };

      setSavedScenes((current) => {
        const next = [sceneWithFreshId, ...current];
        persistSavedScenes(next);
        return next;
      });
    } catch {
      // Ignore invalid import files for now.
    }
  }, []);

  const normalizedPairSettings = normalizeInterferenceSettings(engineState.orbits, interferenceSettings);
  const activePairControls = (
    geometryMode === 'standard-trace'
      ? []
      : [normalizedPairSettings.sourceOrbitAId, normalizedPairSettings.sourceOrbitBId]
          .filter((orbitId): orbitId is string => Boolean(orbitId))
          .map((orbitId, index) => {
            const orbit = engineState.orbits.find((entry) => entry.id === orbitId);
            if (!orbit) {
              return null;
            }
            return {
              id: orbit.id,
              label: index === 0 ? 'Pair A' : 'Pair B',
              pulseCount: orbit.pulseCount,
              color: orbit.color,
            };
          })
          .filter((orbit): orbit is { id: string; label: string; pulseCount: number; color: string } => Boolean(orbit))
  );
  const desktopQuickOrbitControls =
    geometryMode === 'standard-trace'
      ? engineState.orbits.map((orbit, index) => ({
          id: orbit.id,
          label: `Orbit ${index + 1}`,
          pulseCount: orbit.pulseCount,
          color: orbit.color,
        }))
      : activePairControls.map(({ id, label, pulseCount, color }) => ({
          id,
          label,
          pulseCount,
          color,
        }));
  const mobileQuickOrbits =
    geometryMode === 'standard-trace'
      ? engineState.orbits.map((orbit, index) => ({
          id: orbit.id,
          label: `Orbit ${index + 1}`,
          pulseCount: orbit.pulseCount,
          direction: orbit.direction,
          color: orbit.color,
        }))
      : activePairControls.map((orbit) => {
          const match = engineState.orbits.find((entry) => entry.id === orbit.id);
          return {
            ...orbit,
            direction: match?.direction ?? 1,
            color: match?.color ?? orbit.color,
          };
        });
  const modeDescription =
    geometryMode === 'standard-trace'
      ? 'Shared multi-orbit string field.'
      : geometryMode === 'interference-trace'
        ? 'Live derived path from the selected pair.'
        : 'Finite sampled sweep from the selected pair.';
  const allClockwise = engineState.orbits.every((orbit) => orbit.direction === 1);
  const presentationSoundLabel = muted
    ? 'Muted'
    : harmonySettings.tonePreset === 'original'
      ? 'Original Tones'
      : `${harmonySettings.rootNote} ${SCALE_PRESETS[harmonySettings.scaleName].label}`;
  const presentationModeLabel =
    geometryMode === 'standard-trace'
      ? 'Standard'
      : geometryMode === 'interference-trace'
        ? 'Interference'
        : 'Sweep';
  if (isMobile) {
    if (presentationMode) {
      return (
        <div className="fixed inset-0 overflow-hidden bg-[#111116] select-none">
        <OrbitalCanvas
          ref={canvasRef}
          engineState={engineState}
          traceMode={traceMode}
          showPlanets={showPlanets}
          showHudStats={isMobile ? canvasHudVisible : false}
          onToggleHudStats={() => setCanvasHudVisible((visible) => !visible)}
          harmonySettings={harmonySettings}
          geometryMode={geometryMode}
          interferenceSettings={interferenceSettings}
          presentationMode={presentationMode}
          className="absolute inset-0 w-full h-full"
          />

          <TransportBar
            playing={engineState.playing}
            speedMultiplier={engineState.speedMultiplier}
            traceMode={traceMode}
            showPlanets={showPlanets}
            muted={muted}
            allClockwise={allClockwise}
            presentationMode={presentationMode}
            showHelp={false}
            geometryMode={geometryMode}
            tonePreset={harmonySettings.tonePreset}
            rootNote={harmonySettings.rootNote}
            scaleName={harmonySettings.scaleName}
            quickOrbitControls={desktopQuickOrbitControls}
            onAdjustQuickOrbit={handleAdjustQuickOrbit}
            onSetQuickOrbit={handleSetQuickOrbit}
            onGeometryModeChange={handleGeometryModeChange}
            onReverseDirections={handleReverseDirections}
            onAllClockwise={handleAllClockwise}
            onAlternateDirections={handleAlternateDirections}
            onTogglePlay={handleTogglePlay}
            onStepForward={handleStepForward}
            onClearTraces={handleClearTraces}
            onSpeedChange={handleSpeedChange}
            onToggleTrace={handleToggleTrace}
            onTogglePlanets={handleTogglePlanets}
            onToggleMute={handleToggleMute}
            onToggleHelp={() => (helpOpen ? closeStartGuide() : openStartGuide())}
            onTogglePresentation={handleTogglePresentation}
            onRandomPattern={handleRandomPattern}
            onRandomPatternPlus={handleRandomPatternPlus}
        onSoundModeChange={(tonePreset) => handleHarmonyChange({ tonePreset })}
        onRootNoteChange={(rootNote) => handleHarmonyChange({ rootNote })}
        onScaleChange={(scaleName) => handleHarmonyChange({ scaleName })}
        onAddOrbit={handleAddOrbit}
        onDeleteOrbit={handleDeleteOrbit}
        onReset={handleReset}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
        </div>
      );
    }

    return (
      <div className="min-h-[100svh] overflow-y-auto bg-[#111116] pt-3 pb-8 select-none">
        <div className="space-y-3">
          <div className="space-y-3">
            <div data-guide="mobile-colors" className="relative h-[76svh] min-h-[540px] overflow-hidden">
              <OrbitalCanvas
                ref={canvasRef}
                engineState={engineState}
                traceMode={traceMode}
                showPlanets={showPlanets}
                showHudStats={canvasHudVisible}
                onToggleHudStats={() => setCanvasHudVisible((visible) => !visible)}
                harmonySettings={harmonySettings}
                geometryMode={geometryMode}
                interferenceSettings={interferenceSettings}
                presentationMode={presentationMode}
                onOrbitLongPress={handleOrbitLongPress}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>

          <div className="px-4 space-y-4">
            <div
              data-guide="mobile-playback"
              className="relative z-10 rounded-[28px] border px-4 py-5 space-y-4"
              style={{ background: 'rgba(17,17,22,0.9)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Playback
                </div>
                <div className="flex items-center gap-2">
                  <button
                    data-guide="mobile-present"
                    onClick={handleTogglePresentation}
                    type="button"
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    aria-label="Presentation mode"
                  >
                    <Maximize2 size={17} />
                  </button>
                  <button
                    onClick={() => (helpOpen ? closeStartGuide() : openStartGuide())}
                    className="relative z-20 h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}
                    aria-label={helpOpen ? 'Close start guide' : 'Open start guide'}
                    type="button"
                  >
                    <CircleHelp size={18} />
                  </button>
                  <button
                    data-guide="mobile-menu"
                    onClick={() => setSidebarOpen(true)}
                    type="button"
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    aria-label="Open menu"
                  >
                    <Menu size={17} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={handleTogglePlay}
                  className="px-4 py-4 rounded-2xl flex items-center justify-center gap-2"
                  style={{
                    background: engineState.playing ? 'rgba(255,51,102,0.18)' : 'rgba(0,255,170,0.18)',
                    border: `1px solid ${engineState.playing ? 'rgba(255,51,102,0.35)' : 'rgba(0,255,170,0.35)'}`,
                    color: engineState.playing ? '#FF3366' : '#00FFAA',
                  }}
                >
                  {engineState.playing ? <Pause size={20} /> : <Play size={20} />}
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em]">{engineState.playing ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-4 rounded-2xl flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,170,0,0.14)', border: '1px solid rgba(255,170,0,0.26)', color: '#FFAA00' }}
                >
                  <RotateCcw size={17} />
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em]">Reset</span>
                </button>
                <button
                  data-guide="mobile-audio"
                  onClick={handleToggleMute}
                  className="px-4 py-4 rounded-2xl flex items-center justify-center gap-2"
                  style={{ background: muted ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.76)' }}
                >
                  {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em]">{muted ? 'Muted' : 'Audio'}</span>
                </button>
              </div>
              <div data-guide="mobile-speed" className="space-y-2">
                <div className="flex items-center justify-between text-[12px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  <span>Speed</span>
                  <span className="font-mono">{engineState.speedMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={engineState.speedMultiplier}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-full accent-white"
                />
              </div>
            </div>

            <div
              data-guide="mobile-customize"
              className="rounded-[28px] border"
              style={{ background: 'rgba(17,17,22,0.9)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="flex items-center justify-between gap-3 px-4 py-4"
                onClick={() => setMobileCustomizeOpen((open) => !open)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setMobileCustomizeOpen((open) => !open);
                  }
                }}
              >
                <div className="text-left">
                  <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Customize Pattern
                  </div>
                  <div className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Layers, pattern, trail, and markers.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[
                      { key: 'standard-trace' as const, label: 'A', color: '#00FFAA' },
                      { key: 'interference-trace' as const, label: 'B', color: '#88CCFF' },
                      { key: 'sweep' as const, label: 'C', color: '#FFAA00' },
                    ].map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleGeometryModeChange(mode.key);
                        }}
                        className="h-8 w-8 rounded-lg text-[11px] font-mono uppercase tracking-[0.12em]"
                        style={{
                          background: geometryMode === mode.key ? `${mode.color}20` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${geometryMode === mode.key ? `${mode.color}55` : 'rgba(255,255,255,0.08)'}`,
                          color: geometryMode === mode.key ? mode.color : 'rgba(255,255,255,0.7)',
                        }}
                        aria-label={`Switch to ${mode.key === 'standard-trace' ? 'Standard' : mode.key === 'interference-trace' ? 'Interference' : 'Sweep'} mode`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMobileCustomizeOpen((open) => !open);
                    }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.62)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    aria-label={mobileCustomizeOpen ? 'Collapse customize pattern' : 'Expand customize pattern'}
                  >
                    {mobileCustomizeOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {mobileCustomizeOpen && (
                <div className="space-y-4 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="space-y-3 rounded-2xl border p-3" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.48)' }}>
                      Geometry
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'standard-trace' as const, label: 'Standard', color: '#00FFAA' },
                        { key: 'interference-trace' as const, label: 'Interference', color: '#88CCFF' },
                        { key: 'sweep' as const, label: 'Sweep', color: '#FFAA00' },
                      ].map((mode) => (
                        <button
                          key={mode.key}
                          onClick={() => handleGeometryModeChange(mode.key)}
                          className="px-3 py-3 rounded-xl text-[11px] font-mono uppercase tracking-[0.14em]"
                          style={{
                            background: geometryMode === mode.key ? `${mode.color}1a` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${geometryMode === mode.key ? `${mode.color}55` : 'rgba(255,255,255,0.08)'}`,
                            color: geometryMode === mode.key ? mode.color : 'rgba(255,255,255,0.74)',
                          }}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        data-guide="mobile-trail"
                        onClick={handleToggleTrace}
                        className="px-3 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                        style={{
                          background: traceMode ? 'rgba(0,255,170,0.14)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${traceMode ? 'rgba(0,255,170,0.28)' : 'rgba(255,255,255,0.08)'}`,
                          color: traceMode ? '#00FFAA' : 'rgba(255,255,255,0.72)',
                        }}
                      >
                        {traceMode ? 'Trace On' : 'Trace Off'}
                      </button>
                      <button
                        data-guide="mobile-markers"
                        onClick={handleTogglePlanets}
                        className="px-3 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                        style={{
                          background: showPlanets ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)',
                          border: `1px solid ${showPlanets ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)'}`,
                          color: 'rgba(255,255,255,0.72)',
                        }}
                      >
                        {showPlanets ? 'Markers On' : 'Markers Off'}
                      </button>
                    </div>
                  </div>

                  <div data-guide="mobile-layers" className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.48)' }}>
                      Layers
                    </div>
                    {geometryMode === 'standard-trace' && (
                      <button
                        onClick={handleAddOrbit}
                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{ color: '#00FFAA', background: 'rgba(0,255,170,0.08)', border: '1px solid rgba(0,255,170,0.22)' }}
                        title="Add layer"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>

                  {mobileQuickOrbits.map((orbit) => {
                    const layerLabel =
                      geometryMode === 'standard-trace'
                        ? orbit.label.replace('Orbit', 'Layer')
                        : orbit.label.replace('Pair', 'Layer');

                    return (
                      <div
                        key={orbit.id}
                        className="rounded-2xl border p-3 space-y-3"
                        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                      >
                        <div data-guide="mobile-layers" className="flex items-center justify-between gap-3">
                          <div className="text-[12px] font-mono uppercase tracking-[0.14em]" style={{ color: orbit.color }}>
                            {layerLabel}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              value={orbit.pulseCount}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => handleSetQuickOrbit(orbit.id, parseInt(e.target.value) || 1)}
                              className="w-20 rounded-xl border px-2 py-2 text-center text-[14px] font-mono focus:outline-none"
                              style={{ color: 'rgba(255,255,255,0.84)', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                            />
                            <button
                              data-guide="mobile-direction"
                              onClick={() => handleToggleOrbitDirection(orbit.id)}
                              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.72)' }}
                              title={orbit.direction === 1 ? `Set ${layerLabel} counterclockwise` : `Set ${layerLabel} clockwise`}
                            >
                              {orbit.direction === 1 ? (
                                <RotateCcw size={16} />
                              ) : (
                                <RotateCcw size={16} style={{ transform: 'scaleX(-1)' }} />
                              )}
                            </button>
                            {geometryMode === 'standard-trace' && engineState.orbits.length > 1 && (
                              <button
                                onClick={() => handleDeleteOrbit(orbit.id)}
                                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                title={`Remove ${layerLabel}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdjustQuickOrbit(orbit.id, -1)}
                            className="h-11 w-11 rounded-xl flex items-center justify-center"
                            style={{ color: 'rgba(255,255,255,0.76)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            title={`Lower ${layerLabel}`}
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={Math.min(orbit.pulseCount, 10)}
                            onChange={(e) => handleSetQuickOrbit(orbit.id, parseInt(e.target.value) || 1)}
                            className="flex-1"
                            style={{ accentColor: orbit.color }}
                          />
                          <button
                            onClick={() => handleAdjustQuickOrbit(orbit.id, 1)}
                            className="h-11 w-11 rounded-xl flex items-center justify-center"
                            style={{ color: 'rgba(255,255,255,0.76)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            title={`Raise ${layerLabel}`}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              data-guide="mobile-scenes"
              className="rounded-[28px] border"
              style={{
                background: 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.86))',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-4"
                onClick={() => setMobileScenesOpen((open) => !open)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setMobileScenesOpen((open) => !open);
                  }
                }}
              >
                <div className="text-left">
                  <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Scenes
                  </div>
                  <div className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                    Tap a pattern to begin.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRandomPattern();
                    }}
                    type="button"
                    className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{ color: '#88CCFF', background: 'rgba(51,136,255,0.12)', border: '1px solid rgba(51,136,255,0.22)' }}
                  >
                    Random
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRandomPatternPlus();
                    }}
                    type="button"
                    className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{ color: '#FFAA00', background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.22)' }}
                    title="Extended random pattern with curated values up to 100"
                  >
                    Random+
                  </button>
                  <button
                    onClick={() => setMobileScenesOpen((open) => !open)}
                    type="button"
                    onClickCapture={(event) => event.stopPropagation()}
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.62)' }}
                    aria-label={mobileScenesOpen ? 'Collapse scenes' : 'Expand scenes'}
                  >
                    {mobileScenesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {mobileScenesOpen && (
                <div className="space-y-4 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none]">
                    <div className="flex gap-3 px-1 snap-x snap-mandatory">
                      {BUILT_IN_SCENES.map((scene) => (
                        <button
                          key={scene.id}
                          onClick={() => handleLoadBuiltInScene(scene.id)}
                          className="min-w-[220px] max-w-[220px] snap-start overflow-hidden rounded-2xl border text-left"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            borderColor: 'rgba(255,255,255,0.09)',
                          }}
                        >
                          <div className="aspect-square w-full overflow-hidden bg-[#0f1016]">
                            <img
                              src={scene.thumbnailDataUrl}
                              alt={scene.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="space-y-1 px-4 py-4">
                            <div className="text-[12px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.86)' }}>
                              {scene.name}
                            </div>
                            <div className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
                              {scene.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              data-guide="mobile-sound"
              className="rounded-[28px] border"
              style={{ background: 'rgba(17,17,22,0.9)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="flex items-center justify-between gap-3 px-4 py-4"
                onClick={() => setMobileSoundOpen((open) => !open)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setMobileSoundOpen((open) => !open);
                  }
                }}
              >
                <div className="text-left">
                  <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Sound
                  </div>
                  <div className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Tone, key, and scale.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleHarmonyChange({ tonePreset: 'original' });
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em]"
                      style={{
                        background: harmonySettings.tonePreset === 'original' ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: harmonySettings.tonePreset === 'original' ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.56)',
                      }}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleHarmonyChange({ tonePreset: 'scale-quantized' });
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em]"
                      style={{
                        background: harmonySettings.tonePreset === 'scale-quantized' ? 'rgba(0,255,170,0.16)' : 'transparent',
                        color: harmonySettings.tonePreset === 'scale-quantized' ? '#00FFAA' : 'rgba(255,255,255,0.56)',
                      }}
                    >
                      Keyed
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMobileSoundOpen((open) => !open);
                    }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.62)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    aria-label={mobileSoundOpen ? 'Collapse sound' : 'Expand sound'}
                  >
                    {mobileSoundOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {mobileSoundOpen && (
                <div className="space-y-3 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => handleHarmonyChange({ tonePreset: harmonySettings.tonePreset === 'original' ? 'scale-quantized' : 'original' })}
                    className="w-full px-3 py-3 rounded-xl text-[11px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: harmonySettings.tonePreset === 'scale-quantized' ? 'rgba(0,255,170,0.12)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${harmonySettings.tonePreset === 'scale-quantized' ? 'rgba(0,255,170,0.28)' : 'rgba(255,255,255,0.1)'}`,
                      color: harmonySettings.tonePreset === 'scale-quantized' ? '#00FFAA' : 'rgba(255,255,255,0.74)',
                    }}
                  >
                    {harmonySettings.tonePreset === 'original' ? 'Original Tones' : 'Keyed Harmony'}
                  </button>
                  {harmonySettings.tonePreset === 'scale-quantized' && (
                    <div className="grid grid-cols-[92px,1fr] gap-2">
                      <select
                        value={harmonySettings.rootNote}
                        onChange={(e) => handleHarmonyChange({ rootNote: e.target.value as RootNote })}
                        className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-[13px] font-mono focus:outline-none"
                        style={{ color: 'rgba(255,255,255,0.82)' }}
                      >
                        {NOTE_NAMES.map((note) => (
                          <option key={note} value={note} style={{ background: '#181820' }}>{note}</option>
                        ))}
                      </select>
                      <select
                        value={harmonySettings.scaleName}
                        onChange={(e) => handleHarmonyChange({ scaleName: e.target.value as ScaleName })}
                        className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-[13px] font-mono focus:outline-none"
                        style={{ color: 'rgba(255,255,255,0.82)' }}
                      >
                        {Object.entries(SCALE_PRESETS).map(([name, scale]) => (
                          <option key={name} value={name} style={{ background: '#181820' }}>{scale.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {helpOpen && !presentationMode && currentGuideStep && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/38 backdrop-blur-[2px]"
              onClick={closeStartGuide}
            />
            {guideRect && (
              <div
                className="fixed z-40 rounded-[22px] border shadow-[0_0_0_9999px_rgba(0,0,0,0.16)] transition-all duration-200"
                style={{
                  left: Math.max(8, guideRect.left - 8),
                  top: Math.max(8, guideRect.top - 8),
                  width: guideRect.width + 16,
                  height: guideRect.height + 16,
                  borderColor: 'rgba(0,255,170,0.42)',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 0 28px rgba(0,255,170,0.15)',
                }}
              />
            )}
            <div
              className="fixed z-40 left-3 right-3 rounded-2xl border p-4"
              style={guideCalloutStyle}
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: '#00FFAA' }}>
                {helpStepIndex === 0 ? 'Start Guide' : `Step ${helpStepIndex + 1} of ${guideSteps.length}`}
              </div>
              <div className="mt-2 text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {currentGuideStep.title}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
                {currentGuideStep.text}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={closeStartGuide}
                  className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{ color: 'rgba(255,255,255,0.62)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Done
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHelpStepIndex((current) => Math.max(0, current - 1))}
                    disabled={helpStepIndex === 0}
                    className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      color: helpStepIndex === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.72)',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (helpStepIndex >= guideSteps.length - 1) {
                        closeStartGuide();
                        return;
                      }
                      setHelpStepIndex((current) => Math.min(guideSteps.length - 1, current + 1));
                    }}
                    className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{ color: '#00FFAA', background: 'rgba(0,255,170,0.08)', border: '1px solid rgba(0,255,170,0.2)' }}
                  >
                    {helpStepIndex >= guideSteps.length - 1 ? 'Finish' : 'Next'}
                  </button>
                </div>
              </div>
              {helpStepIndex === guideSteps.length - 1 && (
                <div className="mt-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  You&apos;re ready to explore.
                </div>
              )}
            </div>
          </>
        )}

        <OrbitSidebar
          orbits={engineState.orbits}
          isOpen={sidebarOpen}
          harmonySettings={harmonySettings}
          geometryMode={geometryMode}
          interferenceSettings={interferenceSettings}
          builtInScenes={BUILT_IN_SCENES.map(({ id, name, description, thumbnailDataUrl }) => ({ id, name, description, thumbnailDataUrl }))}
          savedScenes={savedScenes}
          onClose={() => setSidebarOpen(false)}
          onUpdateOrbit={handleUpdateOrbit}
          onDeleteOrbit={handleDeleteOrbit}
          onAddOrbit={handleAddOrbit}
          onLoadPreset={handleLoadPreset}
          onReverseDirections={handleReverseDirections}
          onAllClockwise={handleAllClockwise}
          onAlternateDirections={handleAlternateDirections}
          onGeometryModeChange={handleGeometryModeChange}
          onInterferenceSettingsChange={handleInterferenceSettingsChange}
          onHarmonyChange={handleHarmonyChange}
          onSaveScene={handleSaveScene}
          onSaveSceneAs={handleSaveSceneAs}
          onLoadScene={handleLoadScene}
          onLoadBuiltInScene={handleLoadBuiltInScene}
          onDeleteScene={handleDeleteScene}
          onExportScene={handleExportScene}
          onImportScene={handleImportScene}
          onExportPng={handleExportPng}
          onExportVideo={handleExportVideo}
          isRecordingVideo={recordingVideo}
        />

        {radialMenu && (
          <RadialMenu
            x={radialMenu.x}
            y={radialMenu.y}
            orbitId={radialMenu.orbitId}
            orbitColor={engineState.orbits.find((o) => o.id === radialMenu.orbitId)?.color || '#ffffff'}
            orbitDegree={engineState.orbits.find((o) => o.id === radialMenu.orbitId)?.harmonyDegree}
            orbitRegister={engineState.orbits.find((o) => o.id === radialMenu.orbitId)?.harmonyRegister}
            harmonySettings={harmonySettings}
            onChangeColor={handleRadialColorChange}
            onChangeHarmony={handleHarmonyChange}
            onChangeOrbitRole={(orbitId, updates) => handleUpdateOrbit(orbitId, updates)}
            onDelete={handleDeleteOrbit}
            onClose={() => setRadialMenu(null)}
          />
        )}
      </div>
    );
  }

  if (captureMode) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-[#111116]">
        <OrbitalCanvas
          ref={canvasRef}
          engineState={engineState}
          traceMode={traceMode}
          showPlanets={showPlanets}
          showHudStats={canvasHudVisible}
          onToggleHudStats={() => setCanvasHudVisible((visible) => !visible)}
          harmonySettings={harmonySettings}
          geometryMode={geometryMode}
          interferenceSettings={interferenceSettings}
          presentationMode
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className={isMobile ? 'relative min-h-[100svh] overflow-y-auto bg-[#111116] select-none pb-8' : 'fixed inset-0 overflow-hidden bg-[#111116] select-none'}>
      {/* Canvas */}
      {isMobile && <div className="h-[68svh] min-h-[420px]" />}
      <div data-guide={!isMobile ? 'desktop-colors' : undefined}>
        <OrbitalCanvas
          ref={canvasRef}
          engineState={engineState}
          traceMode={traceMode}
          showPlanets={showPlanets}
          showHudStats={canvasHudVisible}
          onToggleHudStats={() => setCanvasHudVisible((visible) => !visible)}
          harmonySettings={harmonySettings}
          geometryMode={geometryMode}
          interferenceSettings={interferenceSettings}
          presentationMode={presentationMode}
          onOrbitLongPress={presentationMode ? undefined : handleOrbitLongPress}
          className={isMobile ? 'absolute inset-x-0 top-0 w-full h-[68svh] min-h-[420px]' : undefined}
        />
      </div>

      {/* Title */}
      {!presentationMode && (
      <div className={`fixed z-20 ${isMobile ? 'top-3 left-1/2 -translate-x-1/2 text-center' : 'top-4 left-5'}`}>
        <Link to="/" className="group inline-block">
          <h1
            className={`${isMobile ? 'text-[11px] tracking-[0.24em]' : 'text-sm tracking-[0.3em]'} font-light uppercase transition-colors group-hover:text-white/45`}
            style={{ color: 'rgba(255, 255, 255, 0.25)' }}
          >
            Orbital Polymeter
          </h1>
          <p
            className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} mt-1 font-mono transition-colors group-hover:text-white/20`}
            style={{ color: 'rgba(255, 255, 255, 0.12)' }}
          >
            Polyrhythmic Geometry Explorer
          </p>
        </Link>
      </div>
      )}

      {/* Help hint */}
      {!presentationMode && (
      <div className={`fixed z-20 pointer-events-none ${isMobile ? 'top-16 left-1/2 -translate-x-1/2' : 'top-4 right-5'}`}>
        <p
          className={`font-mono leading-relaxed ${isMobile ? 'text-[9px] text-center' : 'text-[10px] text-right'}`}
          style={{ color: 'rgba(255, 255, 255, 0.15)' }}
        >
          {isMobile ? (
            'Long-press an orbit to edit. Use Menu for deeper controls.'
          ) : (
            <>
              tap orbit for color controls
              <br />
              use help for mode guidance
            </>
          )}
        </p>
      </div>
      )}

      {helpOpen && !presentationMode && currentGuideStep && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/38 backdrop-blur-[2px]"
            onClick={closeStartGuide}
          />
          {guideRect && (
            <div
              className="fixed z-40 rounded-[22px] border shadow-[0_0_0_9999px_rgba(0,0,0,0.16)] transition-all duration-200"
              style={{
                left: Math.max(8, guideRect.left - 8),
                top: Math.max(8, guideRect.top - 8),
                width: guideRect.width + 16,
                height: guideRect.height + 16,
                borderColor: 'rgba(0,255,170,0.42)',
                boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 0 28px rgba(0,255,170,0.15)',
              }}
            />
          )}
          <div
            className={`fixed z-40 rounded-2xl border p-4 ${isMobile ? 'left-3 right-3' : 'w-[360px]'}`}
            style={guideCalloutStyle}
          >
            <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: '#00FFAA' }}>
              {helpStepIndex === 0 ? 'Start Guide' : `Step ${helpStepIndex + 1} of ${guideSteps.length}`}
            </div>
            <div className="mt-2 text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {currentGuideStep.title}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
              {currentGuideStep.text}
            </p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={closeStartGuide}
                className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{ color: 'rgba(255,255,255,0.62)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Done
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHelpStepIndex((current) => Math.max(0, current - 1))}
                  disabled={helpStepIndex === 0}
                  className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{
                    color: helpStepIndex === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.72)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (helpStepIndex >= guideSteps.length - 1) {
                      closeStartGuide();
                      return;
                    }
                    setHelpStepIndex((current) => Math.min(guideSteps.length - 1, current + 1));
                  }}
                  className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{ color: '#00FFAA', background: 'rgba(0,255,170,0.08)', border: '1px solid rgba(0,255,170,0.2)' }}
                >
                  {helpStepIndex >= guideSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
            {helpStepIndex === guideSteps.length - 1 && (
              <div className="mt-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                You&apos;re ready to explore.
              </div>
            )}
          </div>
        </>
      )}

      {isMobile && !presentationMode && (
        <div className="relative z-20 px-3 pb-28 space-y-3">
          <div
            className="rounded-3xl border px-4 py-4 space-y-4"
            style={{
              background: 'linear-gradient(180deg, rgba(17,17,22,0.92), rgba(17,17,22,0.78))',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Geometry
                  </div>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {modeDescription}
                  </p>
                </div>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.18em]"
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  More
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'standard-trace' as const, label: 'Standard', activeColor: '#00FFAA' },
                  { key: 'interference-trace' as const, label: 'Interference', activeColor: '#88CCFF' },
                  { key: 'sweep' as const, label: 'Sweep', activeColor: '#FFAA00' },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => handleGeometryModeChange(mode.key)}
                    className="px-3 py-3 rounded-xl text-[11px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: geometryMode === mode.key ? `${mode.activeColor}1f` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${geometryMode === mode.key ? `${mode.activeColor}55` : 'rgba(255,255,255,0.08)'}`,
                      color: geometryMode === mode.key ? mode.activeColor : 'rgba(255,255,255,0.74)',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {geometryMode !== 'standard-trace' && (
              <div
                className="rounded-2xl border px-3 py-3 space-y-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Driving Pair
                  </div>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Change the two orbits that drive the current derived shape.
                  </p>
                </div>
                {activePairControls.map((orbit) => (
                  <div
                    key={orbit.id}
                    className="rounded-xl border px-3 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {orbit.label}
                    </div>
                    <div className="grid grid-cols-[44px,1fr,44px] gap-3 items-center mt-3">
                      <button
                        onClick={() => handleAdjustQuickOrbit(orbit.id, -1)}
                        className="h-11 rounded-xl text-[18px] font-mono"
                        style={{ color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.07)' }}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={orbit.pulseCount}
                        onChange={(e) => handleSetQuickOrbit(orbit.id, parseInt(e.target.value) || 1)}
                        onFocus={(e) => e.currentTarget.select()}
                        className="h-11 rounded-xl border text-center text-[16px] font-mono focus:outline-none"
                        style={{
                          color: 'rgba(255,255,255,0.88)',
                          background: 'rgba(255,255,255,0.05)',
                          borderColor: 'rgba(255,255,255,0.1)',
                        }}
                      />
                      <button
                        onClick={() => handleAdjustQuickOrbit(orbit.id, 1)}
                        className="h-11 rounded-xl text-[18px] font-mono"
                        style={{ color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.07)' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={handleReverseDirections} className="px-3 py-3 rounded-xl text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Reverse
                  </button>
                  <button onClick={handleAllClockwise} className="px-3 py-3 rounded-xl text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: '#00FFAA', background: 'rgba(0,255,170,0.08)', border: '1px solid rgba(0,255,170,0.2)' }}>
                    All CW
                  </button>
                  <button onClick={handleAlternateDirections} className="px-3 py-3 rounded-xl text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: '#88CCFF', background: 'rgba(51,136,255,0.08)', border: '1px solid rgba(51,136,255,0.2)' }}>
                    Alternate
                  </button>
                </div>
              </div>
            )}

            <div
              className="rounded-2xl border px-3 py-3 space-y-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Sound
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Keep sound close at hand. Deeper harmony controls still live in Menu.
                </p>
              </div>
              <button
                onClick={() => handleHarmonyChange({ tonePreset: harmonySettings.tonePreset === 'original' ? 'scale-quantized' : 'original' })}
                className="w-full px-3 py-3 rounded-xl text-[11px] font-mono uppercase tracking-[0.14em]"
                style={{
                  background: harmonySettings.tonePreset === 'scale-quantized' ? 'rgba(0,255,170,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${harmonySettings.tonePreset === 'scale-quantized' ? 'rgba(0,255,170,0.28)' : 'rgba(255,255,255,0.1)'}`,
                  color: harmonySettings.tonePreset === 'scale-quantized' ? '#00FFAA' : 'rgba(255,255,255,0.74)',
                }}
              >
                {harmonySettings.tonePreset === 'original' ? 'Original Tones' : 'Keyed Harmony'}
              </button>
              {harmonySettings.tonePreset === 'scale-quantized' && (
                <div className="grid grid-cols-[92px,1fr] gap-2">
                  <select
                    value={harmonySettings.rootNote}
                    onChange={(e) => handleHarmonyChange({ rootNote: e.target.value as RootNote })}
                    className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-[13px] font-mono focus:outline-none"
                    style={{ color: 'rgba(255,255,255,0.82)' }}
                  >
                    {NOTE_NAMES.map((note) => (
                      <option key={note} value={note} style={{ background: '#181820' }}>{note}</option>
                    ))}
                  </select>
                  <select
                    value={harmonySettings.scaleName}
                    onChange={(e) => handleHarmonyChange({ scaleName: e.target.value as ScaleName })}
                    className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-[13px] font-mono focus:outline-none"
                    style={{ color: 'rgba(255,255,255,0.82)' }}
                  >
                    {Object.entries(SCALE_PRESETS).map(([name, scale]) => (
                      <option key={name} value={name} style={{ background: '#181820' }}>{scale.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transport Bar */}
      <div className={isMobile ? 'relative z-20 mt-0' : ''}>
        <TransportBar
          playing={engineState.playing}
          speedMultiplier={engineState.speedMultiplier}
          traceMode={traceMode}
          showPlanets={showPlanets}
          muted={muted}
          allClockwise={allClockwise}
          presentationMode={presentationMode}
          showHelp={helpOpen}
          geometryMode={geometryMode}
          tonePreset={harmonySettings.tonePreset}
          rootNote={harmonySettings.rootNote}
          scaleName={harmonySettings.scaleName}
          quickOrbitControls={desktopQuickOrbitControls}
          onAdjustQuickOrbit={handleAdjustQuickOrbit}
          onSetQuickOrbit={handleSetQuickOrbit}
          onGeometryModeChange={handleGeometryModeChange}
          onReverseDirections={handleReverseDirections}
          onAllClockwise={handleAllClockwise}
          onAlternateDirections={handleAlternateDirections}
          onTogglePlay={handleTogglePlay}
          onStepForward={handleStepForward}
          onClearTraces={handleClearTraces}
          onSpeedChange={handleSpeedChange}
          onToggleTrace={handleToggleTrace}
          onTogglePlanets={handleTogglePlanets}
          onToggleMute={handleToggleMute}
          onToggleHelp={() => (helpOpen ? closeStartGuide() : openStartGuide())}
          onTogglePresentation={handleTogglePresentation}
          onRandomPattern={handleRandomPattern}
          onRandomPatternPlus={handleRandomPatternPlus}
          onSoundModeChange={(tonePreset) => handleHarmonyChange({ tonePreset })}
          onRootNoteChange={(rootNote) => handleHarmonyChange({ rootNote })}
          onScaleChange={(scaleName) => handleHarmonyChange({ scaleName })}
          onAddOrbit={handleAddOrbit}
          onDeleteOrbit={handleDeleteOrbit}
          onReset={handleReset}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      </div>

      {/* Sidebar */}
      <OrbitSidebar
        orbits={engineState.orbits}
        isOpen={sidebarOpen && !presentationMode}
        harmonySettings={harmonySettings}
        geometryMode={geometryMode}
        interferenceSettings={interferenceSettings}
        builtInScenes={BUILT_IN_SCENES.map(({ id, name, description, thumbnailDataUrl }) => ({ id, name, description, thumbnailDataUrl }))}
        savedScenes={savedScenes}
        onClose={() => setSidebarOpen(false)}
        onUpdateOrbit={handleUpdateOrbit}
        onDeleteOrbit={handleDeleteOrbit}
        onAddOrbit={handleAddOrbit}
        onLoadPreset={handleLoadPreset}
        onReverseDirections={handleReverseDirections}
        onAllClockwise={handleAllClockwise}
        onAlternateDirections={handleAlternateDirections}
        onGeometryModeChange={handleGeometryModeChange}
        onInterferenceSettingsChange={handleInterferenceSettingsChange}
        onHarmonyChange={handleHarmonyChange}
        onSaveScene={handleSaveScene}
        onSaveSceneAs={handleSaveSceneAs}
        onLoadScene={handleLoadScene}
        onLoadBuiltInScene={handleLoadBuiltInScene}
        onDeleteScene={handleDeleteScene}
        onExportScene={handleExportScene}
        onImportScene={handleImportScene}
        onExportPng={handleExportPng}
        onExportVideo={handleExportVideo}
        isRecordingVideo={recordingVideo}
      />

      {/* Radial Menu */}
      {radialMenu && !presentationMode && (
        <RadialMenu
          x={radialMenu.x}
          y={radialMenu.y}
          orbitId={radialMenu.orbitId}
          orbitColor={
            engineState.orbits.find((o) => o.id === radialMenu.orbitId)?.color || '#ffffff'
          }
          orbitDegree={engineState.orbits.find((o) => o.id === radialMenu.orbitId)?.harmonyDegree}
          orbitRegister={engineState.orbits.find((o) => o.id === radialMenu.orbitId)?.harmonyRegister}
          harmonySettings={harmonySettings}
          onChangeColor={handleRadialColorChange}
          onChangeHarmony={handleHarmonyChange}
          onChangeOrbitRole={(orbitId, updates) => handleUpdateOrbit(orbitId, updates)}
          onDelete={handleDeleteOrbit}
          onClose={() => setRadialMenu(null)}
        />
      )}
    </div>
  );
}

export const Route = createFileRoute('/app')({
  component: OrbitalPolymeter,
});
