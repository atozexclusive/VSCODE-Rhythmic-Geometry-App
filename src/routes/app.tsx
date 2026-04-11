// ============================================================
// Rhythmic Geometry — Main Application Route
// Orchestrates engine state, canvas, sidebar, transport bar
// ============================================================

import { Link, createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useRef, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleHelp, Maximize2, Menu, Minus, Palette, Pause, Play, Plus, RotateCcw, Shuffle, Trash2, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import OrbitalCanvas from '../components/OrbitalCanvas';
import OrbitSidebar from '../components/OrbitSidebar';
import PolyrhythmCanvas from '../components/PolyrhythmCanvas';
import PolyrhythmSidebar, { PolyrhythmSceneThumbnail } from '../components/PolyrhythmSidebar';
import RiffCycleCanvas from '../components/RiffCycleCanvas';
import RiffCycleSidebar, { RiffSceneThumbnail } from '../components/RiffCycleSidebar';
import {
  StudyShellButton,
  StudyShellChip,
  StudyShellDock,
  StudyShellPanel,
} from '../components/StudyInstrumentShell';
import TransportBar from '../components/TransportBar';
import RadialMenu from '../components/RadialMenu';
import { useAuth } from '../components/auth-provider';
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
import {
  createExportRecord,
  deleteSavedSceneRecord,
  listExportRecords,
  listSavedSceneRecords,
  upsertSavedSceneRecord,
  type StoredExportRecord,
  type StoredSceneRecord,
} from '../lib/account-storage';
import { confirmStripeCheckout, startStripeCheckout } from '../lib/billing-client';
import {
  FREE_SCENE_SAVE_LIMIT,
  canUseProFeature,
  getMaxEditableRatio,
  getOrbitLimitForMode,
  isProPlan,
} from '../lib/entitlements';
import {
  POLYRHYTHM_LAYER_COLORS,
  POLYRHYTHM_PRESET_GROUP_META,
  POLYRHYTHM_PRESETS,
  cloneStudy,
  countActiveSteps,
  createRandomPlusPolyrhythmStudy,
  createRandomPolyrhythmStudy,
  createDefaultPolyrhythmStudy,
  createPolyrhythmLayer,
  invertLayerSteps,
  remixPolyrhythmStudy,
  rotateLayer,
  toggleLayerStep,
  updateLayerBeatCount,
  type PolyrhythmLayer,
  type PolyrhythmPresetGroup,
  type PolyrhythmSoundSettings,
  type PolyrhythmStudy,
} from '../lib/polyrhythmStudy';
import { resumePolyrhythmAudio } from '../lib/polyrhythmAudio';
import {
  DEFAULT_RIFF_CYCLE_PRESET_ID,
  RIFF_CYCLE_PRESETS,
  applyLandingStateToLastSlots,
  canEditRiffStep,
  clearLandingOverrides,
  clearRiffSteps,
  cloneRiffCycleStudy,
  createRandomPlusRiffCycleStudy,
  createRandomRiffCycleStudy,
  createDefaultRiffCycleStudy,
  getDisplayStepCount,
  getEffectiveRiffStepStateAtReferenceStep,
  getLandingSlotAtReferenceStep,
  getReferenceStepsPerBar,
  invertRiffSteps,
  remixRiffCycleStudy,
  rotateRiffSteps,
  setRiffStepActive,
  setLandingLength,
  setLandingOverride,
  toggleRiffAccent,
  toggleRiffStep,
  updateRiffStepCount,
  type ReferenceMeter,
  type RiffCycleStudy,
  type RiffCycleSoundSettings,
  type RiffPhrase,
} from '../lib/riffCycleStudy';
import { resumeRiffCycleAudio } from '../lib/riffCycleAudio';
import { getRangeValueFromClientX } from '../lib/touchSlider';

const SCENES_STORAGE_KEY = 'orbital-polymeter-scenes';
const TOP_STATUS_VISIBLE_STORAGE_KEY = 'orbital-polymeter-top-status-visible';
const CANVAS_HUD_VISIBLE_STORAGE_KEY = 'orbital-polymeter-canvas-hud-visible';
const MANUAL_STEP_BEATS = 0.25;
const DEFAULT_SCENE_SPEED = 3;
const PATTERN_MUTATION_COOLDOWN_MS = 140;
const INTERFERENCE_PREVIEW_WEIGHTS = [-1, 1, 1, -1] as const;
const DEFAULT_POLYRHYTHM_PRESET_ID = 'three-five';
interface StartGuideStep {
  target: string;
  title: string;
  text: string;
}

const MOBILE_START_GUIDE: StartGuideStep[] = [
  {
    target: 'mobile-scenes',
    title: 'Start Here',
    text: 'Scenes load strong starting points. Random builds fresh ratios, Random+ goes wider, and Remix refreshes the current one.',
  },
  {
    target: 'mobile-playback',
    title: 'Playback',
    text: 'This is the motion row: play starts, reset restarts, audio mutes, and speed changes how quickly the form develops.',
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
    text: 'Change pulse counts here. Tap a layer name or the color wheel to open its color editor. Small number shifts can produce very different forms.',
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
    text: 'Long-press an orbit or use the color wheel in Layers to change color and musical role. Color can also influence tone mapping in some modes.',
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
    text: 'This main row controls motion: play starts, reset restarts, Remix refreshes the current setup, and Random builds a new one.',
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

const MOBILE_RIFF_GUIDE: StartGuideStep[] = [
  {
    target: 'riff-mobile-edit',
    title: 'Edit',
    text: 'Edit keeps the quick controls close. Open Editor reveals the canvas lane only when you want to write directly.',
  },
  {
    target: 'riff-layer-1',
    title: 'Bar',
    text: 'Bar shapes the frame: meter, visible bars, grid, and the backbeat marker.',
  },
  {
    target: 'riff-layer-2',
    title: 'Riff',
    text: 'Riff shapes the moving pattern. Use Open Editor when you want the lane on the canvas.',
  },
  {
    target: 'riff-ending',
    title: 'Ending',
    text: 'Ending shapes the re-entry zone and gives you quick return tools.',
  },
  {
    target: 'riff-mobile-transport',
    title: 'Transport',
    text: 'Play, restart, and the random tools all live here so you can explore quickly.',
  },
  {
    target: 'riff-mobile-tempo',
    title: 'Tempo And Offset',
    text: 'Tempo stays centered. Offset nudges the phrase backward or forward one step at a time.',
  },
  {
    target: 'riff-mobile-audio',
    title: 'Audio',
    text: 'Audio holds listening focus, sound palette, keyed harmony, and view options.',
  },
  {
    target: 'riff-mobile-scenes',
    title: 'Scenes',
    text: 'Scenes load strong starting points without leaving the canvas.',
  },
  {
    target: 'riff-mobile-present',
    title: 'Present',
    text: 'Present reveals the lane and clears the chrome so you can focus on the riff and the fixed bar.',
  },
  {
    target: 'riff-mobile-menu',
    title: 'Menu',
    text: 'Open the full menu for scenes, export, and deeper controls.',
  },
];

const DESKTOP_RIFF_GUIDE: StartGuideStep[] = [
  {
    target: 'riff-desktop-transport',
    title: 'Start Here',
    text: 'This row drives the study: play, restart, and the random tools are the fastest way to explore new riffs.',
  },
  {
    target: 'riff-desktop-tempo',
    title: 'Tempo And Offset',
    text: 'Tempo is the center control. Offset moves the phrase against the bar without rewriting it.',
  },
  {
    target: 'riff-desktop-quick',
    title: 'Edit Focus',
    text: 'Use the left card to choose what you are editing right now.',
  },
  {
    target: 'riff-layer-1',
    title: 'Bar',
    text: 'Bar handles the fixed frame: meter, visible bars, grid, and bar marker.',
  },
  {
    target: 'riff-layer-2',
    title: 'Riff',
    text: 'Riff handles the moving pattern. The lower lane is still the main writing surface.',
  },
  {
    target: 'riff-ending',
    title: 'Ending',
    text: 'Ending shapes the return zone without changing the whole study surface.',
  },
  {
    target: 'riff-desktop-audio',
    title: 'Audio',
    text: 'Choose whether you want to hear the bar, the riff, or both together.',
  },
  {
    target: 'riff-desktop-sound',
    title: 'Sound',
    text: 'Original keeps the native Riff voice. Keyed Harmony opens root and scale controls.',
  },
  {
    target: 'riff-desktop-view',
    title: 'View',
    text: 'Swap between lane and circle, then use frame fill, labels, or phrase shape only when you need them.',
  },
  {
    target: 'riff-desktop-present',
    title: 'Present',
    text: 'Present strips back the chrome for showing, recording, or focused study.',
  },
  {
    target: 'riff-desktop-menu',
    title: 'Menu',
    text: 'Use Menu for scenes, export, and the deeper study settings.',
  },
];

const MOBILE_STUDY_GUIDE: StartGuideStep[] = [
  {
    target: 'study-mobile-playback',
    title: 'Playback',
    text: 'Play, restart, and audio stay in one compact card so the rings keep most of the screen.',
  },
  {
    target: 'study-mobile-tempo',
    title: 'Tempo',
    text: 'Tempo stays centered here, just like Riff, so speed changes are always easy to find.',
  },
  {
    target: 'study-mobile-edit',
    title: 'Edit',
    text: 'Edit keeps layer, stack, and mask controls close. Open Editor pulls the active ring into a larger focused view.',
  },
  {
    target: 'study-mobile-audio',
    title: 'Audio',
    text: 'Audio holds focus, sound palette, keyed harmony, and view controls without covering the canvas.',
  },
  {
    target: 'study-mobile-scenes',
    title: 'Scenes',
    text: 'Scenes keep presets, Random, Remix, and Random+ close at hand.',
  },
  {
    target: 'study-mobile-present',
    title: 'Present',
    text: 'Present strips the chrome back so the nested geometry can breathe.',
  },
  {
    target: 'study-mobile-menu',
    title: 'Menu',
    text: 'Open the full menu for scenes, sound, export, and deeper layer editing.',
  },
];

const DESKTOP_STUDY_GUIDE: StartGuideStep[] = [
  {
    target: 'study-desktop-transport',
    title: 'Start Here',
    text: 'This row now matches Riff: play, restart, and the random tools are the fastest way to explore a new study.',
  },
  {
    target: 'study-desktop-tempo',
    title: 'Tempo',
    text: 'Tempo stays centered so speed reads clearly between the quick edit and utility sides.',
  },
  {
    target: 'study-desktop-quick',
    title: 'Quick Edit',
    text: 'The left card is for structure only: layer, stack, and mask.',
  },
  {
    target: 'study-quick-layer',
    title: 'Layer',
    text: 'Layer selects the active ring and edits its beat count directly.',
  },
  {
    target: 'study-quick-stack',
    title: 'Stack',
    text: 'Stack changes the ring set itself: add or remove rings and move their radius.',
  },
  {
    target: 'study-quick-shape',
    title: 'Mask',
    text: 'Mask rotates, inverts, clears, and handles the selected step.',
  },
  {
    target: 'study-desktop-audio',
    title: 'Audio',
    text: 'Audio lets you hear the selected ring, the full stack, or mute the study entirely.',
  },
  {
    target: 'study-desktop-sound',
    title: 'Sound',
    text: 'Sound holds palette, keyed harmony, register, and root/scale.',
  },
  {
    target: 'study-desktop-view',
    title: 'View',
    text: 'View keeps the ring display clean with faint-step and label controls.',
  },
  {
    target: 'study-desktop-present',
    title: 'Present',
    text: 'Present reduces the chrome so the nested pattern becomes the main focus.',
  },
  {
    target: 'study-desktop-menu',
    title: 'Menu',
    text: 'Open the full menu for scenes, export, and deeper study editing.',
  },
];

type SceneOrbitSnapshot = Omit<Orbit, 'id' | 'phase' | 'lastTriggerBeat'>;

interface SceneInterferenceSettings {
  sourceOrbitAIndex: number | null;
  sourceOrbitBIndex: number | null;
  sourceOrbitCIndex?: number | null;
  sourceOrbitDIndex?: number | null;
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

interface ExportRecord {
  id: string;
  type: string;
  sceneName?: string | null;
  aspect?: string | null;
  scale?: number | null;
  durationSeconds?: number | null;
  createdAt: string;
}

interface ProPromptState {
  feature: import('../lib/entitlements').ProFeature;
  context?: 'launch-orbit-lock';
  title: string;
  body: string;
}

type ActiveSceneSource =
  | 'default'
  | 'built-in'
  | 'premium-built-in'
  | 'saved'
  | 'custom';

type AppSurface = 'orbital' | 'polyrhythm-study' | 'riff-cycle-study';
type RiffEditMode = 'phrase' | 'landing';

interface PolyrhythmStepSelection {
  layerId: string;
  stepIndex: number;
}

function sortSavedScenesByUpdatedAt(scenes: SavedScene[]): SavedScene[] {
  return [...scenes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function upsertSavedScene(scenes: SavedScene[], scene: SavedScene): SavedScene[] {
  return sortSavedScenesByUpdatedAt([scene, ...scenes.filter((entry) => entry.id !== scene.id)]);
}

interface ImportedSceneFile {
  version: 1;
  exportedAt: string;
  scene: SavedScene;
}

const DEFAULT_SCENE_SNAPSHOT: SceneSnapshot = {
  orbits: DEFAULT_ORBITS.map(({ pulseCount, radius, direction, color, harmonyDegree, harmonyRegister }) => ({
    pulseCount,
    radius,
    direction,
    color,
    harmonyDegree,
    harmonyRegister,
  })),
  speedMultiplier: 1,
  traceMode: true,
  harmonySettings: { ...DEFAULT_HARMONY_SETTINGS },
  geometryMode: 'standard-trace',
  interferenceSettings: {
    sourceOrbitAIndex: null,
    sourceOrbitBIndex: null,
    sourceOrbitCIndex: null,
    sourceOrbitDIndex: null,
    showConnectors: DEFAULT_INTERFERENCE_SETTINGS.showConnectors,
  },
};

const FREE_DEFAULT_SCENE_SNAPSHOT: SceneSnapshot = {
  ...DEFAULT_SCENE_SNAPSHOT,
  orbits: DEFAULT_SCENE_SNAPSHOT.orbits.slice(0, 3),
};

export interface BuiltInScene {
  id: string;
  name: string;
  description: string;
  snapshot: SceneSnapshot;
  thumbnailDataUrl: string;
}

const BUILT_IN_SCENE_ASSET_MAP: Partial<Record<string, string>> = {
  glass_cathedral: '/scene-captures/website_standard_replacement.png',
  prime_ritual: '/scene-captures/website_prime_ritual.png',
  rose_engine: '/scene-captures/website_rose_engine.png',
  blue_mandala: '/scene-captures/blue_mandala.jpg',
  dorian_bloom: '/scene-captures/dorian_bloom.jpg',
  silent_cosmology: '/scene-captures/silent_cosmology.jpg',
  metallic_whorl: '/scene-captures/website_metallic_whorl.png',
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

function ensurePulseArrayLength(
  values: number[],
  count: number,
  options?: { extended?: boolean },
): number[] {
  const cap = options?.extended ? 100 : 10;
  const minGap = options?.extended ? 4 : 1;
  const next = uniqueNumbers(values.filter((value) => Number.isFinite(value))).map((value) =>
    clamp(Math.round(value), 1, cap),
  );

  let guard = 0;
  while (next.length < count && guard < 200) {
    guard += 1;
    const candidate = randomInt(2, cap);
    if (next.every((value) => Math.abs(value - candidate) >= minGap)) {
      next.push(candidate);
    }
  }

  while (next.length < count) {
    const fallback = clamp(2 + next.length * Math.max(1, minGap), 1, cap);
    if (next.every((value) => Math.abs(value - fallback) >= minGap)) {
      next.push(fallback);
    } else {
      next.push(clamp(fallback + next.length, 1, cap));
    }
  }

  return sortAndSeparate(next.slice(0, count), minGap, cap).slice(0, count);
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
    if (count >= 4) {
      const strategy = randomInt(0, 4);
      if (strategy === 0) {
        return pickSpacedRandomValues(4, {
          min: 2,
          max: cap,
          minGap: options?.extended ? 8 : 2,
          bias: options?.extended ? 'mixed' : 'high',
        }).sort((a, b) => a - b);
      }
      if (strategy === 1) {
        const low = randomInt(2, options?.extended ? 8 : 3);
        const high = randomInt(options?.extended ? 48 : 7, cap);
        const midA = clamp(Math.round(low + (high - low) / 3), low + 1, high - 2);
        const midB = clamp(Math.round(low + ((high - low) * 2) / 3), midA + 1, high - 1);
        return [low, midA, midB, high].sort((a, b) => a - b);
      }
      if (strategy === 2) {
        return buildBroadRandomPulseCounts(count, {
          extended: options?.extended,
        })
          .slice(0, count)
          .sort((a, b) => a - b);
      }
      if (strategy === 3) {
        const base = randomInt(options?.extended ? 5 : 3, options?.extended ? 14 : 5);
        const step = randomInt(options?.extended ? 4 : 2, options?.extended ? 14 : 3);
        return [
          base,
          clamp(base + step, base + 1, cap - 2),
          clamp(base + step * 2, base + 2, cap - 1),
          clamp(base + step * 3, base + 3, cap),
        ].sort((a, b) => a - b);
      }
      return pickSpacedRandomValues(4, {
        min: 2,
        max: cap,
        minGap: options?.extended ? 6 : 2,
        bias: 'mixed',
      }).sort((a, b) => a - b);
    }

    if (count >= 3) {
      const strategy = randomInt(0, 4);
      if (strategy === 0) {
        const low = randomInt(2, options?.extended ? 10 : 4);
        const mid = randomInt(options?.extended ? 12 : 5, options?.extended ? 34 : 7);
        const high = randomInt(options?.extended ? 40 : 7, cap);
        return [low, mid, high].sort((a, b) => a - b);
      }
      if (strategy === 1) {
        const values = pickSpacedRandomValues(3, {
          min: 2,
          max: cap,
          minGap: options?.extended ? 8 : 2,
          bias: options?.extended ? 'mixed' : 'high',
        });
        return values.sort((a, b) => a - b);
      }
      if (strategy === 2) {
        const base = randomInt(options?.extended ? 6 : 3, options?.extended ? 16 : 5);
        const step = randomInt(options?.extended ? 6 : 2, options?.extended ? 18 : 3);
        return [
          base,
          clamp(base + step, base + 1, cap - 1),
          clamp(base + step * 2, base + 2, cap),
        ].sort((a, b) => a - b);
      }
      if (strategy === 3) {
        const low = randomInt(2, options?.extended ? 8 : 3);
        const high = randomInt(options?.extended ? 45 : 7, cap);
        const mid = clamp(Math.round((low + high) / 2), low + 1, high - 1);
        return [low, mid, high].sort((a, b) => a - b);
      }
      return buildBroadRandomPulseCounts(count, {
        extended: options?.extended,
      })
        .slice(0, count)
        .sort((a, b) => a - b);
    }

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
    if (count >= 4) {
      const strategy = randomInt(0, 4);
      if (strategy === 0) {
        return pickSpacedRandomValues(4, {
          min: 2,
          max: cap,
          minGap: options?.extended ? 6 : 2,
          bias: options?.extended ? 'mixed' : 'high',
        }).sort((a, b) => a - b);
      }
      if (strategy === 1) {
        const low = randomInt(2, options?.extended ? 10 : 4);
        const high = randomInt(options?.extended ? 42 : 7, cap);
        const midA = clamp(Math.round(low + (high - low) / 3), low + 1, high - 2);
        const midB = clamp(Math.round(low + ((high - low) * 2) / 3), midA + 1, high - 1);
        return [low, midA, midB, high].sort((a, b) => a - b);
      }
      if (strategy === 2) {
        return buildBroadRandomPulseCounts(count, {
          extended: options?.extended,
        })
          .slice(0, count)
          .sort((a, b) => a - b);
      }
      if (strategy === 3) {
        const base = randomInt(options?.extended ? 4 : 3, options?.extended ? 14 : 6);
        const step = randomInt(options?.extended ? 4 : 2, options?.extended ? 12 : 3);
        return [
          base,
          clamp(base + step, base + 1, cap - 2),
          clamp(base + step * 2, base + 2, cap - 1),
          clamp(base + step * 3, base + 3, cap),
        ].sort((a, b) => a - b);
      }
      return pickSpacedRandomValues(4, {
        min: 2,
        max: cap,
        minGap: options?.extended ? 5 : 2,
        bias: 'mixed',
      }).sort((a, b) => a - b);
    }

    if (count >= 3) {
      const strategy = randomInt(0, 4);
      if (strategy === 0) {
        const low = randomInt(2, options?.extended ? 8 : 4);
        const mid = randomInt(options?.extended ? 10 : 5, options?.extended ? 28 : 7);
        const high = randomInt(options?.extended ? 36 : 7, cap);
        return [low, mid, high].sort((a, b) => a - b);
      }
      if (strategy === 1) {
        return pickSpacedRandomValues(3, {
          min: 2,
          max: cap,
          minGap: options?.extended ? 6 : 2,
          bias: options?.extended ? 'mixed' : 'high',
        }).sort((a, b) => a - b);
      }
      if (strategy === 2) {
        const base = randomInt(options?.extended ? 4 : 3, options?.extended ? 14 : 6);
        const step = randomInt(options?.extended ? 4 : 2, options?.extended ? 12 : 3);
        return [
          base,
          clamp(base + step, base + 1, cap - 1),
          clamp(base + step * 2, base + 2, cap),
        ].sort((a, b) => a - b);
      }
      if (strategy === 3) {
        const low = randomInt(2, options?.extended ? 8 : 4);
        const high = randomInt(options?.extended ? 34 : 7, cap);
        const mid = clamp(Math.round((low + high) / 2), low + 1, high - 1);
        return [low, mid, high].sort((a, b) => a - b);
      }
      return buildBroadRandomPulseCounts(count, {
        extended: options?.extended,
      })
        .slice(0, count)
        .sort((a, b) => a - b);
    }

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
    points: Array<{ x: number; y: number }>,
  ) => ({
    x:
      center +
      points.reduce(
        (sum, point, index) => sum + (point.x - center) * (INTERFERENCE_PREVIEW_WEIGHTS[index] ?? 1),
        0,
      ),
    y:
      center +
      points.reduce(
        (sum, point, index) => sum + (point.y - center) * (INTERFERENCE_PREVIEW_WEIGHTS[index] ?? 1),
        0,
      ),
  });

  const blendHexColors = (colorA?: string, colorB?: string) => {
    const fallback = colorA ?? colorB ?? '#32CD32';
    if (!colorA || !colorB) {
      return fallback;
    }

    const parseHex = (value: string) => {
      const hex = value.replace('#', '');
      if (hex.length !== 6) {
        return null;
      }
      const parsed = Number.parseInt(hex, 16);
      if (Number.isNaN(parsed)) {
        return null;
      }
      return {
        r: (parsed >> 16) & 255,
        g: (parsed >> 8) & 255,
        b: parsed & 255,
      };
    };

    const a = parseHex(colorA);
    const b = parseHex(colorB);
    if (!a || !b) {
      return fallback;
    }

    const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
    return `#${toHex(Math.round((a.r + b.r) / 2))}${toHex(Math.round((a.g + b.g) / 2))}${toHex(
      Math.round((a.b + b.b) / 2),
    )}`;
  };

  const blendMultipleHexColors = (...colors: Array<string | null | undefined>) => {
    const filtered = colors.filter((color): color is string => Boolean(color));
    if (filtered.length === 0) {
      return '#32CD32';
    }
    return filtered.slice(1).reduce((mixed, color) => blendHexColors(mixed, color), filtered[0]);
  };

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
          sourceOrbitCId:
            snapshot.interferenceSettings.sourceOrbitCIndex != null
              ? traceOrbits[snapshot.interferenceSettings.sourceOrbitCIndex]?.id ?? null
              : null,
          sourceOrbitDId:
            snapshot.interferenceSettings.sourceOrbitDIndex != null
              ? traceOrbits[snapshot.interferenceSettings.sourceOrbitDIndex]?.id ?? null
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
      const activeInterferenceOrbits: typeof traceOrbits = [];
      for (const orbitId of [
        normalizedInterference.sourceOrbitAId,
        normalizedInterference.sourceOrbitBId,
        normalizedInterference.sourceOrbitCId,
        normalizedInterference.sourceOrbitDId,
      ]) {
        const orbit = traceOrbits.find((candidate) => candidate.id === orbitId);
        if (orbit && !activeInterferenceOrbits.some((candidate) => candidate.id === orbit.id)) {
          activeInterferenceOrbits.push(orbit);
        }
      }
      let previousPoint: { x: number; y: number } | null = null;
      const beatsWindow = Math.max(24, cycleBeats * cycleFactor);
      const steps = Math.min(4200, Math.max(1400, beatsWindow * 8));

      if (activeInterferenceOrbits.length >= 2) {
        ctx.strokeStyle = blendMultipleHexColors(...activeInterferenceOrbits.map((orbit) => orbit.color));
        ctx.lineWidth = Math.max(1, oversample * 0.9);
        ctx.globalAlpha = 0.92;
        for (let i = 0; i <= steps; i++) {
          const beats = (i / steps) * beatsWindow;
          const sampledPoints = activeInterferenceOrbits.map((orbit) =>
            resonancePositionAtBeats(
              { ...orbit, radius: orbit.radius * standardScale },
              beats,
              center,
              center,
            ),
          );
          const point = getInterferencePoint(sampledPoints);
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

export const PREMIUM_SCENES: BuiltInScene[] = [
  {
    id: 'fib_cascade',
    name: 'Fib Cascade',
    description: 'A golden-ratio staircase: 2, 3, 5, 8, 13, 21, 34 arranged into a clean luminous expansion.',
    snapshot: {
      orbits: [
        { pulseCount: 2, radius: 74, direction: 1, color: '#00FFAA', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 3, radius: 112, direction: -1, color: '#7CE7FF', harmonyDegree: 1, harmonyRegister: -1 },
        { pulseCount: 5, radius: 150, direction: 1, color: '#FF6AA2', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 8, radius: 188, direction: -1, color: '#9B7BFF', harmonyDegree: 3, harmonyRegister: 0 },
        { pulseCount: 13, radius: 226, direction: 1, color: '#6BF5D0', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 21, radius: 264, direction: -1, color: '#FFD166', harmonyDegree: 5, harmonyRegister: 1 },
        { pulseCount: 34, radius: 302, direction: 1, color: '#3388FF', harmonyDegree: 6, harmonyRegister: 1 },
      ],
      speedMultiplier: 2.2,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'F',
        scaleName: 'lydian',
        mappingMode: 'radius',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 2, sourceOrbitBIndex: 5, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'auric_bloom',
    name: 'Velvet Hex',
    description: 'A six-layer premium field built from soft non-Fibonacci spacing so the weave stays plush and readable.',
    snapshot: {
      orbits: [
        { pulseCount: 6, radius: 82, direction: 1, color: '#72F1B8', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 10, radius: 128, direction: -1, color: '#FF7A7A', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 15, radius: 174, direction: 1, color: '#6CC8FF', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 22, radius: 220, direction: -1, color: '#C084FC', harmonyDegree: 5, harmonyRegister: 0 },
        { pulseCount: 30, radius: 266, direction: 1, color: '#FFC857', harmonyDegree: 6, harmonyRegister: 1 },
        { pulseCount: 41, radius: 312, direction: -1, color: '#FF88C2', harmonyDegree: 1, harmonyRegister: 1 },
      ],
      speedMultiplier: 2.2,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'A',
        scaleName: 'majorPentatonic',
        mappingMode: 'radius',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 1, sourceOrbitBIndex: 3, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'cathedral_89',
    name: 'Meridian Drift',
    description: 'A tall, glassy premium field built from widening non-Fibonacci gaps that keep the outer skin clean.',
    snapshot: {
      orbits: [
        { pulseCount: 4, radius: 78, direction: 1, color: '#A7F3D0', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 9, radius: 124, direction: -1, color: '#7DD3FC', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 16, radius: 170, direction: 1, color: '#F9A8D4', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 27, radius: 216, direction: -1, color: '#C4B5FD', harmonyDegree: 5, harmonyRegister: 0 },
        { pulseCount: 43, radius: 262, direction: 1, color: '#FDE68A', harmonyDegree: 6, harmonyRegister: 1 },
        { pulseCount: 68, radius: 308, direction: -1, color: '#88CCFF', harmonyDegree: 1, harmonyRegister: 1 },
      ],
      speedMultiplier: 2.0,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'C',
        scaleName: 'lydian',
        mappingMode: 'pulse-count',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 2, sourceOrbitBIndex: 5, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'prime_constellation_x',
    name: 'Prime Constellation',
    description: 'Prime-number spacing with a bright outer starfield and tighter inner lattice.',
    snapshot: {
      orbits: [
        { pulseCount: 2, radius: 80, direction: 1, color: '#00FFAA', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 3, radius: 126, direction: -1, color: '#3388FF', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 5, radius: 172, direction: 1, color: '#FF3366', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 11, radius: 218, direction: -1, color: '#FFD166', harmonyDegree: 6, harmonyRegister: 0 },
        { pulseCount: 17, radius: 264, direction: 1, color: '#6BF5D0', harmonyDegree: 1, harmonyRegister: 1 },
        { pulseCount: 29, radius: 310, direction: -1, color: '#9B7BFF', harmonyDegree: 3, harmonyRegister: 1 },
      ],
      speedMultiplier: 2.3,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'A',
        scaleName: 'dorian',
        mappingMode: 'pulse-count',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 1, sourceOrbitBIndex: 5, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'tidal_55',
    name: 'Harmonic Ladder',
    description: 'A premium harmonic climb that feels architectural rather than chaotic, even with longer cycles.',
    snapshot: {
      orbits: [
        { pulseCount: 6, radius: 90, direction: 1, color: '#6AF0FF', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 12, radius: 138, direction: -1, color: '#FF9B7A', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 18, radius: 186, direction: 1, color: '#7D9CFF', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 27, radius: 234, direction: -1, color: '#72FFE1', harmonyDegree: 5, harmonyRegister: 0 },
        { pulseCount: 39, radius: 282, direction: 1, color: '#FFE17A', harmonyDegree: 6, harmonyRegister: 1 },
        { pulseCount: 54, radius: 330, direction: -1, color: '#FF7C8F', harmonyDegree: 1, harmonyRegister: 1 },
      ],
      speedMultiplier: 1.9,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'G',
        scaleName: 'minorPentatonic',
        mappingMode: 'radius',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 1, sourceOrbitBIndex: 4, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'centennial_halo',
    name: 'Twin Comet',
    description: 'A two-orbit premium interference study with a long uneven pair that stays bright and easy to read.',
    snapshot: {
      orbits: [
        { pulseCount: 24, radius: 154, direction: 1, color: '#7FD7FF', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 73, radius: 292, direction: -1, color: '#FF6699', harmonyDegree: 4, harmonyRegister: 1 },
      ],
      speedMultiplier: 2.7,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'B',
        scaleName: 'dorian',
        mappingMode: 'orbit-index',
        manualOrbitRoles: true,
      },
      geometryMode: 'interference-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'aurora_interference',
    name: 'Aurora Interference',
    description: 'A premium pair study where 34 and 55 weave a luminous interference braid.',
    snapshot: {
      orbits: [
        { pulseCount: 34, radius: 140, direction: 1, color: '#72F1B8', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 55, radius: 260, direction: 1, color: '#88CCFF', harmonyDegree: 4, harmonyRegister: 1 },
      ],
      speedMultiplier: 2.6,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'B',
        scaleName: 'lydian',
        mappingMode: 'orbit-index',
        manualOrbitRoles: true,
      },
      geometryMode: 'interference-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'sweep_arc_89',
    name: 'Sweep Arc 89',
    description: 'A high-range sweep built from 55 and 89 for a clean dramatic figure instead of random clutter.',
    snapshot: {
      orbits: [
        { pulseCount: 55, radius: 150, direction: 1, color: '#FFAA00', harmonyDegree: 0, harmonyRegister: 0 },
        { pulseCount: 89, radius: 290, direction: 1, color: '#3388FF', harmonyDegree: 4, harmonyRegister: 1 },
      ],
      speedMultiplier: 2.8,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'D',
        scaleName: 'wholeTone',
        mappingMode: 'pulse-count',
        manualOrbitRoles: true,
      },
      geometryMode: 'sweep',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 1, showConnectors: false },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'spiral_ledger',
    name: 'Spiral Ledger',
    description: 'Asymmetric higher-ratio spacing that still resolves into a readable premium field.',
    snapshot: {
      orbits: [
        { pulseCount: 7, radius: 86, direction: 1, color: '#A2FFE3', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 12, radius: 132, direction: -1, color: '#7AD7FF', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 19, radius: 178, direction: 1, color: '#FFA3CF', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 31, radius: 224, direction: -1, color: '#A58BFF', harmonyDegree: 5, harmonyRegister: 0 },
        { pulseCount: 48, radius: 270, direction: 1, color: '#FFE29D', harmonyDegree: 6, harmonyRegister: 1 },
        { pulseCount: 77, radius: 316, direction: -1, color: '#4FB4FF', harmonyDegree: 1, harmonyRegister: 1 },
      ],
      speedMultiplier: 2.1,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'F#',
        scaleName: 'dorian',
        mappingMode: 'radius',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 4, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
  {
    id: 'nocturne_97',
    name: 'Mirror Well',
    description: 'A darker premium field with asymmetrical spacing and one deep long-cycle outer ring.',
    snapshot: {
      orbits: [
        { pulseCount: 7, radius: 88, direction: 1, color: '#6CC8FF', harmonyDegree: 0, harmonyRegister: -1 },
        { pulseCount: 18, radius: 150, direction: -1, color: '#FF4488', harmonyDegree: 2, harmonyRegister: 0 },
        { pulseCount: 32, radius: 212, direction: 1, color: '#72F1B8', harmonyDegree: 4, harmonyRegister: 0 },
        { pulseCount: 49, radius: 274, direction: -1, color: '#FFCC00', harmonyDegree: 5, harmonyRegister: 0 },
        { pulseCount: 73, radius: 336, direction: 1, color: '#7D89FF', harmonyDegree: 6, harmonyRegister: 1 },
      ],
      speedMultiplier: 1.8,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'F',
        scaleName: 'aeolian',
        mappingMode: 'color-hue',
        manualOrbitRoles: true,
      },
      geometryMode: 'standard-trace',
      interferenceSettings: { sourceOrbitAIndex: 0, sourceOrbitBIndex: 3, showConnectors: true },
    },
    thumbnailDataUrl: '',
  },
];

for (const scene of [...BUILT_IN_SCENES, ...PREMIUM_SCENES]) {
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
      sourceOrbitCIndex: null,
      sourceOrbitDIndex: null,
      showConnectors: settings?.showConnectors ?? true,
    };
  }

  if (orbitCount === 1) {
    return {
      sourceOrbitAIndex: 0,
      sourceOrbitBIndex: null,
      sourceOrbitCIndex: null,
      sourceOrbitDIndex: null,
      showConnectors: settings?.showConnectors ?? true,
    };
  }

  const safeIndex = (value: number | null | undefined) =>
    typeof value === 'number' && value >= 0 && value < orbitCount ? value : null;

  let sourceOrbitAIndex = safeIndex(settings?.sourceOrbitAIndex) ?? 0;
  let sourceOrbitBIndex = safeIndex(settings?.sourceOrbitBIndex) ?? 1;
  let sourceOrbitCIndex = safeIndex(settings?.sourceOrbitCIndex) ?? null;
  let sourceOrbitDIndex = safeIndex(settings?.sourceOrbitDIndex) ?? null;

  if (sourceOrbitAIndex === sourceOrbitBIndex) {
    sourceOrbitBIndex = sourceOrbitAIndex === 0 ? 1 : 0;
  }

  if (
    sourceOrbitCIndex != null &&
    (sourceOrbitCIndex === sourceOrbitAIndex || sourceOrbitCIndex === sourceOrbitBIndex)
  ) {
    sourceOrbitCIndex = null;
  }

  if (sourceOrbitCIndex == null) {
    sourceOrbitDIndex = null;
  }

  if (
    sourceOrbitDIndex != null &&
    (sourceOrbitDIndex === sourceOrbitAIndex ||
      sourceOrbitDIndex === sourceOrbitBIndex ||
      sourceOrbitDIndex === sourceOrbitCIndex)
  ) {
    sourceOrbitDIndex = null;
  }

  return {
    sourceOrbitAIndex,
    sourceOrbitBIndex,
    sourceOrbitCIndex,
    sourceOrbitDIndex,
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
    sourceOrbitCId:
      normalizedScene.sourceOrbitCIndex != null ? orbits[normalizedScene.sourceOrbitCIndex]?.id ?? null : null,
    sourceOrbitDId:
      normalizedScene.sourceOrbitDIndex != null ? orbits[normalizedScene.sourceOrbitDIndex]?.id ?? null : null,
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
    sourceOrbitCIndex:
      normalized.sourceOrbitCId != null
        ? orbits.findIndex((orbit) => orbit.id === normalized.sourceOrbitCId)
        : null,
    sourceOrbitDIndex:
      normalized.sourceOrbitDId != null
        ? orbits.findIndex((orbit) => orbit.id === normalized.sourceOrbitDId)
        : null,
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

function mapStoredSceneRecord(record: StoredSceneRecord): SavedScene | null {
  const snapshot = record.snapshot as Partial<SceneSnapshot> | null;
  if (
    !snapshot ||
    !Array.isArray(snapshot.orbits) ||
    typeof snapshot.speedMultiplier !== 'number' ||
    typeof snapshot.traceMode !== 'boolean' ||
    !snapshot.harmonySettings ||
    typeof snapshot.harmonySettings !== 'object'
  ) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    updatedAt: record.updated_at,
    thumbnailDataUrl: record.thumbnail_data_url ?? undefined,
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

function mapStoredExportRecord(record: StoredExportRecord): ExportRecord {
  return {
    id: record.id,
    type: record.type,
    sceneName: record.scene_name,
    aspect: record.aspect,
    scale: record.scale,
    durationSeconds: record.duration_seconds,
    createdAt: record.created_at,
  };
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

function downloadRiffCycleSceneFile(name: string, study: RiffCycleStudy): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    type: 'riff-cycle-scene',
    name,
    study: cloneRiffCycleStudy(study),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  anchor.href = url;
  anchor.download = `${safeName || 'riff-cycle-scene'}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

function downloadPolyrhythmStudyFile(name: string, study: PolyrhythmStudy): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    type: 'polyrhythm-study-scene',
    name,
    study: cloneStudy(study),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  anchor.href = url;
  anchor.download = `${safeName || 'polyrhythm-study-scene'}.json`;
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
  const { user, enabled: authEnabled, loading: authLoading, effectivePlan, refreshAccount } = useAuth();
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

  const [appSurface, setAppSurface] = useState<AppSurface>('orbital');
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
  const [localSavedScenes, setLocalSavedScenes] = useState<SavedScene[]>(loadSavedScenes);
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>(loadSavedScenes);
  const [exportRecords, setExportRecords] = useState<ExportRecord[]>([]);
  const [cloudPersistenceLoading, setCloudPersistenceLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [checkoutSyncing, setCheckoutSyncing] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [radialMenu, setRadialMenu] = useState<{
    orbitId: string;
    x: number;
    y: number;
  } | null>(null);
  const [mobileScenesOpen, setMobileScenesOpen] = useState(false);
  const [mobileCustomizeOpen, setMobileCustomizeOpen] = useState(false);
  const [mobileSoundOpen, setMobileSoundOpen] = useState(false);
  const [activeMobileSliderId, setActiveMobileSliderId] = useState<string | null>(null);
  const [mobileSceneTab, setMobileSceneTab] = useState<'built-in' | 'saved' | 'premium'>('built-in');
  const [polyrhythmStudy, setPolyrhythmStudy] = useState<PolyrhythmStudy>(() =>
    createDefaultPolyrhythmStudy(),
  );
  const [activePolyrhythmPresetId, setActivePolyrhythmPresetId] = useState<string | null>(
    DEFAULT_POLYRHYTHM_PRESET_ID,
  );
  const [riffCycleStudy, setRiffCycleStudy] = useState<RiffCycleStudy>(() =>
    createDefaultRiffCycleStudy(),
  );
  const [activeRiffCyclePresetId, setActiveRiffCyclePresetId] = useState<string | null>(
    DEFAULT_RIFF_CYCLE_PRESET_ID,
  );
  const [selectedPolyrhythmLayerId, setSelectedPolyrhythmLayerId] = useState<string | null>(
    null,
  );
  const [selectedPolyrhythmStep, setSelectedPolyrhythmStep] =
    useState<PolyrhythmStepSelection | null>(null);
  const [polyrhythmRestartToken, setPolyrhythmRestartToken] = useState(0);
  const [polyrhythmQuickPanel, setPolyrhythmQuickPanel] = useState<'layer' | 'stack' | 'shape'>('layer');
  const [polyrhythmUtilityPanel, setPolyrhythmUtilityPanel] = useState<null | 'audio' | 'sound' | 'view'>('sound');
  const [polyrhythmMobileSection, setPolyrhythmMobileSection] =
    useState<null | 'edit' | 'audio' | 'scenes'>('scenes');
  const [polyrhythmMobileSceneTab, setPolyrhythmMobileSceneTab] =
    useState<'standard' | 'saved' | 'pro'>('standard');
  const [polyrhythmMobileSceneGroup, setPolyrhythmMobileSceneGroup] =
    useState<PolyrhythmPresetGroup>('two-layer');
  const [polyrhythmMobileEditTab, setPolyrhythmMobileEditTab] =
    useState<'layer' | 'stack' | 'shape'>('layer');
  const [polyrhythmMobileEditorOpen, setPolyrhythmMobileEditorOpen] = useState(false);
  const [selectedRiffCycleStep, setSelectedRiffCycleStep] = useState<number | null>(null);
  const [riffCycleRestartToken, setRiffCycleRestartToken] = useState(0);
  const [riffQuickPanel, setRiffQuickPanel] = useState<null | 'bar' | 'phrase' | 'return'>('phrase');
  const [riffUtilityPanel, setRiffUtilityPanel] = useState<null | 'audio' | 'sound' | 'view'>('sound');
  const [riffMobileSection, setRiffMobileSection] = useState<null | 'edit' | 'audio' | 'scenes'>('scenes');
  const [riffMobileSceneTab, setRiffMobileSceneTab] =
    useState<'standard' | 'saved' | 'pro'>('standard');
  const [riffMobileEditTab, setRiffMobileEditTab] = useState<'bar' | 'phrase' | 'return'>('phrase');
  const [riffMobileEditorOpen, setRiffMobileEditorOpen] = useState(false);
  const [riffMobileLaneBarsPerPage, setRiffMobileLaneBarsPerPage] = useState<1 | 2 | 'full'>(2);
  const [riffMobileLanePage, setRiffMobileLanePage] = useState(0);
  const [helpStepIndex, setHelpStepIndex] = useState(0);
  const [guideRect, setGuideRect] = useState<DOMRect | null>(null);
  const [guideMeasuredHeight, setGuideMeasuredHeight] = useState(230);
  const isSignedIn = Boolean(authEnabled && user);
  const hasProAccess = isProPlan(effectivePlan);
  const [proPrompt, setProPrompt] = useState<ProPromptState | null>(null);
  const riffMobileEffectiveBarsPerPage =
    riffMobileLaneBarsPerPage === 'full'
      ? riffCycleStudy.reference.barCountForDisplay
      : Math.min(riffMobileLaneBarsPerPage, riffCycleStudy.reference.barCountForDisplay);
  const riffMobileLanePageCount =
    riffMobileLaneBarsPerPage === 'full'
      ? 1
      : Math.max(1, Math.ceil(riffCycleStudy.reference.barCountForDisplay / riffMobileEffectiveBarsPerPage));
  const riffMobileStepsPerBar = getReferenceStepsPerBar(riffCycleStudy.reference);
  const riffMobileVisibleBarCount =
    riffMobileLaneBarsPerPage === 'full'
      ? riffCycleStudy.reference.barCountForDisplay
      : Math.min(
          riffMobileEffectiveBarsPerPage,
          Math.max(
            1,
            riffCycleStudy.reference.barCountForDisplay -
              riffMobileLanePage * riffMobileEffectiveBarsPerPage,
          ),
        );
  const riffMobileLaneStartBar =
    riffMobileLaneBarsPerPage === 'full'
      ? 1
      : riffMobileLanePage * riffMobileEffectiveBarsPerPage + 1;
  const riffMobileLaneEndBar =
    riffMobileLaneBarsPerPage === 'full'
      ? riffCycleStudy.reference.barCountForDisplay
      : Math.min(
          riffCycleStudy.reference.barCountForDisplay,
          riffMobileLaneStartBar + riffMobileVisibleBarCount - 1,
        );
  const riffMobileLaneStartStep =
    riffMobileLaneBarsPerPage === 'full'
      ? 0
      : (riffMobileLaneStartBar - 1) * riffMobileStepsPerBar;
  const riffMobileLaneStepCount =
    riffMobileLaneBarsPerPage === 'full'
      ? getDisplayStepCount(riffCycleStudy)
      : riffMobileVisibleBarCount * riffMobileStepsPerBar;
  const handleMobileSliderPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLInputElement>,
      sliderId: string,
      onValueChange: (value: number) => void,
    ) => {
      if (!isMobile || event.pointerType === 'mouse') {
        return;
      }

      event.preventDefault();
      const input = event.currentTarget;
      input.setPointerCapture?.(event.pointerId);
      setActiveMobileSliderId(sliderId);
      onValueChange(getRangeValueFromClientX(input, event.clientX));
    },
    [isMobile],
  );

  const handleMobileSliderPointerMove = useCallback(
    (
      event: ReactPointerEvent<HTMLInputElement>,
      sliderId: string,
      onValueChange: (value: number) => void,
    ) => {
      if (activeMobileSliderId !== sliderId) {
        return;
      }

      event.preventDefault();
      onValueChange(getRangeValueFromClientX(event.currentTarget, event.clientX));
    },
    [activeMobileSliderId],
  );

  const clearActiveMobileSlider = useCallback((sliderId: string) => {
    setActiveMobileSliderId((current) => (current === sliderId ? null : current));
  }, []);
  const handleAppSurfaceChange = useCallback(
    (nextSurface: AppSurface) => {
      if (nextSurface === appSurface) {
        return;
      }

      setSidebarOpen(false);
      setHelpOpen(false);
      setPresentationMode(false);
      setMobileScenesOpen(false);
      setMobileCustomizeOpen(false);
      setMobileSoundOpen(false);
      setRadialMenu(null);
      setProPrompt(null);

      if (nextSurface === 'polyrhythm-study' || nextSurface === 'riff-cycle-study') {
        stopAllAudio();
        engineState.playing = false;
        engineState.lastTimestamp = -1;
        rerender();
      }

      if (nextSurface !== 'polyrhythm-study') {
        setPolyrhythmStudy((current) => ({
          ...current,
          playing: false,
        }));
      }

      if (nextSurface !== 'riff-cycle-study') {
        setRiffCycleStudy((current) => ({
          ...current,
          playing: false,
        }));
      }

      setAppSurface(nextSurface);
    },
    [appSurface, engineState, rerender],
  );

  const handleLoadPolyrhythmPreset = useCallback((presetId: string) => {
    const preset = POLYRHYTHM_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    const nextStudy = {
      ...cloneStudy(preset.study),
      playing: polyrhythmStudy.playing,
    };
    setPolyrhythmStudy(nextStudy);
    setActivePolyrhythmPresetId(preset.id);
    setPolyrhythmMobileSceneTab('standard');
    setPolyrhythmMobileSceneGroup(preset.group);
    setSelectedPolyrhythmLayerId(nextStudy.layers[0]?.id ?? null);
    setSelectedPolyrhythmStep(null);
    setPolyrhythmRestartToken((value) => value + 1);
  }, [polyrhythmStudy.playing]);

  const handleResetPolyrhythmStudy = useCallback(() => {
    const preset =
      POLYRHYTHM_PRESETS.find((entry) => entry.id === activePolyrhythmPresetId) ??
      POLYRHYTHM_PRESETS.find((entry) => entry.id === DEFAULT_POLYRHYTHM_PRESET_ID) ??
      POLYRHYTHM_PRESETS[0];

    if (!preset) {
      const nextStudy = {
        ...createDefaultPolyrhythmStudy(),
        playing: polyrhythmStudy.playing,
      };
      setPolyrhythmStudy(nextStudy);
      setSelectedPolyrhythmLayerId(nextStudy.layers[0]?.id ?? null);
      setSelectedPolyrhythmStep(null);
      setPolyrhythmRestartToken((value) => value + 1);
      return;
    }

    const nextStudy = {
      ...cloneStudy(preset.study),
      playing: polyrhythmStudy.playing,
    };
    setPolyrhythmStudy(nextStudy);
    setSelectedPolyrhythmLayerId(nextStudy.layers[0]?.id ?? null);
    setSelectedPolyrhythmStep(null);
    setPolyrhythmRestartToken((value) => value + 1);
  }, [activePolyrhythmPresetId, polyrhythmStudy.playing]);

  const handleRestartPolyrhythmTransport = useCallback(() => {
    setPolyrhythmRestartToken((value) => value + 1);
  }, []);

  const handleTogglePolyrhythmPlayback = useCallback(() => {
    resumePolyrhythmAudio();
    if (polyrhythmStudy.playing) {
      setPolyrhythmRestartToken((value) => value + 1);
    }
    setPolyrhythmStudy((current) => ({
      ...current,
      playing: !current.playing,
    }));
  }, [polyrhythmStudy.playing]);

  const handlePolyrhythmBpmChange = useCallback((bpm: number) => {
    const nextBpm = Math.max(40, Math.min(180, Math.round(bpm || 40)));
    setPolyrhythmStudy((current) => ({
      ...current,
      bpm: nextBpm,
    }));
  }, []);

  const handleTogglePolyrhythmInactiveSteps = useCallback(() => {
    setPolyrhythmStudy((current) => ({
      ...current,
      showInactiveSteps: !current.showInactiveSteps,
    }));
  }, []);

  const handleTogglePolyrhythmStepLabels = useCallback(() => {
    setPolyrhythmStudy((current) => ({
      ...current,
      showStepLabels: !current.showStepLabels,
    }));
  }, []);

  const handleTogglePolyrhythmSound = useCallback(() => {
    resumePolyrhythmAudio();
    setPolyrhythmStudy((current) => ({
      ...current,
      soundEnabled: !current.soundEnabled,
    }));
  }, []);

  const handleUpdatePolyrhythmSoundSettings = useCallback(
    (updates: Partial<PolyrhythmSoundSettings>) => {
      resumePolyrhythmAudio();
      setPolyrhythmStudy((current) => ({
        ...current,
        soundSettings: {
          ...current.soundSettings,
          ...updates,
        },
      }));
    },
    [],
  );

  const handleSetPolyrhythmSoundFocus = useCallback(
    (focus: 'layer' | 'stack' | 'mute') => {
      resumePolyrhythmAudio();
      setPolyrhythmStudy((current) => ({
        ...current,
        soundEnabled: focus !== 'mute',
        layers: current.layers.map((layer) => ({
          ...layer,
          soundEnabled:
            focus === 'stack'
              ? true
              : focus === 'mute'
                ? layer.soundEnabled
                : layer.id === selectedPolyrhythmLayerId,
        })),
      }));
    },
    [selectedPolyrhythmLayerId],
  );

  const handleAddPolyrhythmLayer = useCallback(() => {
    let nextLayerId: string | null = null;
    setPolyrhythmStudy((current) => {
      const lastLayer = current.layers[current.layers.length - 1];
      const nextLayerIndex = current.layers.length;
      const nextBeatCount = Math.min(64, Math.max(6, (lastLayer?.beatCount ?? 8) + 2));
      const nextRadius = Math.max(78, (lastLayer?.radius ?? 230) - 34);
      const nextColor =
        POLYRHYTHM_LAYER_COLORS[nextLayerIndex % POLYRHYTHM_LAYER_COLORS.length];
      const nextLayer = createPolyrhythmLayer(nextBeatCount, {
        radius: nextRadius,
        rotationOffset: (nextLayerIndex * 12) % 360,
        color: nextColor,
        pitchHz: Math.min(960, 180 + nextLayerIndex * 66),
        gain: Math.max(0.04, 0.12 - nextLayerIndex * 0.01),
      });
      nextLayerId = nextLayer.id;

      return {
        ...current,
        layers: [
          ...current.layers,
          nextLayer,
        ],
      };
    });
    if (nextLayerId) {
      setSelectedPolyrhythmLayerId(nextLayerId);
      setSelectedPolyrhythmStep(null);
    }
  }, []);

  const handleRemovePolyrhythmLayer = useCallback((layerId: string) => {
    setPolyrhythmStudy((current) => {
      if (current.layers.length <= 1) {
        return current;
      }

      return {
        ...current,
        layers: current.layers.filter((layer) => layer.id !== layerId),
      };
    });
    setSelectedPolyrhythmStep((current) => (current?.layerId === layerId ? null : current));
  }, []);

  const handleUpdatePolyrhythmLayer = useCallback(
    (layerId: string, updates: Partial<PolyrhythmLayer>) => {
      setPolyrhythmStudy((current) => ({
        ...current,
        layers: current.layers.map((layer) => {
          if (layer.id !== layerId) {
            return layer;
          }

          return {
            ...layer,
            ...updates,
            radius:
              updates.radius == null
                ? layer.radius
                : Math.max(60, Math.min(320, Math.round(updates.radius))),
            rotationOffset:
              updates.rotationOffset == null
                ? layer.rotationOffset
                : ((updates.rotationOffset % 360) + 360) % 360,
            pitchHz:
              updates.pitchHz == null
                ? layer.pitchHz
                : Math.max(90, Math.min(1400, Math.round(updates.pitchHz))),
            gain:
              updates.gain == null
                ? layer.gain
                : Math.max(0.02, Math.min(0.28, Number(updates.gain))),
          };
        }),
      }));
    },
    [],
  );

  const handleSetPolyrhythmLayerBeatCount = useCallback(
    (layerId: string, beatCount: number) => {
      setPolyrhythmStudy((current) => ({
        ...current,
        layers: current.layers.map((layer) =>
          layer.id === layerId ? updateLayerBeatCount(layer, beatCount) : layer,
        ),
      }));
      setSelectedPolyrhythmStep((current) => {
        if (!current || current.layerId !== layerId) {
          return current;
        }
        return null;
      });
    },
    [],
  );

  const handleTogglePolyrhythmLayerStep = useCallback(
    (layerId: string, stepIndex: number) => {
      setPolyrhythmStudy((current) => ({
        ...current,
        layers: current.layers.map((layer) =>
          layer.id === layerId ? toggleLayerStep(layer, stepIndex) : layer,
        ),
      }));
    },
    [],
  );

  const handleSelectPolyrhythmLayer = useCallback((layerId: string) => {
    setSelectedPolyrhythmLayerId(layerId);
  }, []);

  const handleSelectPolyrhythmStep = useCallback(
    (selection: PolyrhythmStepSelection | null) => {
      setSelectedPolyrhythmStep(selection);
      if (selection) {
        setSelectedPolyrhythmLayerId(selection.layerId);
      }
    },
    [],
  );

  const handleClearPolyrhythmSelection = useCallback(() => {
    setSelectedPolyrhythmStep(null);
  }, []);

  const handleRotatePolyrhythmLayer = useCallback((layerId: string, stepOffset: number) => {
    setPolyrhythmStudy((current) => ({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId ? rotateLayer(layer, stepOffset) : layer,
      ),
    }));
  }, []);

  const handleInvertPolyrhythmLayerSteps = useCallback((layerId: string) => {
    setPolyrhythmStudy((current) => ({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId ? invertLayerSteps(layer) : layer,
      ),
    }));
  }, []);

  const handleClearPolyrhythmLayer = useCallback((layerId: string) => {
    setPolyrhythmStudy((current) => ({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              activeSteps: Array.from({ length: layer.beatCount }, () => false),
            }
          : layer,
      ),
    }));
    setSelectedPolyrhythmStep((current) => (current?.layerId === layerId ? null : current));
  }, []);

  const handleRandomPolyrhythmStudy = useCallback(() => {
    const nextStudy = {
      ...createRandomPolyrhythmStudy(),
      playing: polyrhythmStudy.playing,
    };
    setPolyrhythmStudy(nextStudy);
    setActivePolyrhythmPresetId(null);
    setSelectedPolyrhythmLayerId(nextStudy.layers[0]?.id ?? null);
    setSelectedPolyrhythmStep(null);
    setPolyrhythmRestartToken((value) => value + 1);
  }, [polyrhythmStudy.playing]);

  const handleRemixPolyrhythmStudy = useCallback(() => {
    setPolyrhythmStudy((current) => {
      const remixed = {
        ...remixPolyrhythmStudy(current),
        playing: current.playing,
      };
      setActivePolyrhythmPresetId(null);
      setSelectedPolyrhythmStep(null);
      setSelectedPolyrhythmLayerId((currentLayerId) => {
        const currentIndex = current.layers.findIndex((layer) => layer.id === currentLayerId);
        return remixed.layers[Math.max(0, currentIndex)]?.id ?? remixed.layers[0]?.id ?? null;
      });
      return remixed;
    });
    setPolyrhythmRestartToken((value) => value + 1);
  }, []);

  const handleRandomPlusPolyrhythmStudy = useCallback(() => {
    const nextStudy = {
      ...createRandomPlusPolyrhythmStudy(),
      playing: polyrhythmStudy.playing,
    };
    setPolyrhythmStudy(nextStudy);
    setActivePolyrhythmPresetId(null);
    setSelectedPolyrhythmLayerId(nextStudy.layers[0]?.id ?? null);
    setSelectedPolyrhythmStep(null);
    setPolyrhythmRestartToken((value) => value + 1);
  }, [polyrhythmStudy.playing]);

  const handleLoadRiffCyclePreset = useCallback((presetId: string) => {
    const preset = RIFF_CYCLE_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }
    setRiffCycleStudy({
      ...cloneRiffCycleStudy(preset.study),
      playing: riffCycleStudy.playing,
    });
    setActiveRiffCyclePresetId(preset.id);
    setRiffMobileSceneTab('standard');
    setSelectedRiffCycleStep(null);
    setRiffMobileLanePage(0);
    setRiffCycleRestartToken((value) => value + 1);
  }, [riffCycleStudy.playing]);

  const handleResetRiffCycleStudy = useCallback(() => {
    setRiffMobileLanePage(0);
    setRiffCycleRestartToken((value) => value + 1);
  }, []);

  const handleToggleRiffCyclePlayback = useCallback(() => {
    resumeRiffCycleAudio();
    if (riffCycleStudy.playing) {
      setRiffCycleRestartToken((value) => value + 1);
    }
    setRiffCycleStudy((current) => ({
      ...current,
      playing: !current.playing,
    }));
  }, [riffCycleStudy.playing]);

  const handleToggleRiffCycleSound = useCallback(() => {
    resumeRiffCycleAudio();
    setRiffCycleStudy((current) => ({
      ...current,
      soundEnabled: !current.soundEnabled,
    }));
  }, []);

  const handleToggleRiffReferenceSound = useCallback(() => {
    resumeRiffCycleAudio();
    setRiffCycleStudy((current) => ({
      ...current,
      referenceSoundEnabled: !current.referenceSoundEnabled,
    }));
  }, []);

  const handleToggleRiffBackbeatSound = useCallback(() => {
    resumeRiffCycleAudio();
    setRiffCycleStudy((current) => ({
      ...current,
      backbeatSoundEnabled: !current.backbeatSoundEnabled,
    }));
  }, []);

  const handleUpdateRiffSoundSettings = useCallback(
    (updates: Partial<RiffCycleSoundSettings>) => {
      resumeRiffCycleAudio();
      setRiffCycleStudy((current) => ({
        ...current,
        soundSettings: {
          ...current.soundSettings,
          ...updates,
        },
      }));
    },
    [],
  );

  const handleUpdateRiffReference = useCallback((updates: Partial<ReferenceMeter>) => {
    setRiffCycleStudy((current) => {
      const nextStudy = {
        ...current,
        reference: {
          ...current.reference,
          ...updates,
          numerator:
            updates.numerator == null
              ? current.reference.numerator
              : Math.max(2, Math.min(11, Math.round(updates.numerator))),
          denominator:
            updates.denominator == null
              ? current.reference.denominator
              : updates.denominator === 8
                ? 8
                : 4,
          subdivision:
            updates.subdivision == null
              ? current.reference.subdivision
              : ([8, 12, 16, 20, 32] as const).includes(updates.subdivision as 8 | 12 | 16 | 20 | 32)
                ? (updates.subdivision as 8 | 12 | 16 | 20 | 32)
                : current.reference.subdivision,
          bpm:
            updates.bpm == null
              ? current.reference.bpm
              : Math.max(45, Math.min(220, Math.round(updates.bpm))),
          barCountForDisplay:
            updates.barCountForDisplay == null
              ? current.reference.barCountForDisplay
              : Math.max(1, Math.min(8, Math.round(updates.barCountForDisplay))),
          backbeatBeat:
            updates.backbeatBeat == null
              ? current.reference.backbeatBeat
              : Math.max(
                  1,
                  Math.min(
                    updates.numerator == null
                      ? current.reference.numerator
                      : Math.round(updates.numerator),
                    Math.round(updates.backbeatBeat),
                  ),
                ),
        },
      };
      return setLandingLength(nextStudy, nextStudy.landingLength);
    });
  }, []);

  const handleUpdateRiffPhrase = useCallback((updates: Partial<RiffPhrase>) => {
    setRiffCycleStudy((current) => ({
      ...current,
      riff: {
        ...current.riff,
        ...updates,
        rotationOffset:
          updates.rotationOffset == null
            ? current.riff.rotationOffset
            : ((updates.rotationOffset % 360) + 360) % 360,
        pitchHz:
          updates.pitchHz == null
            ? current.riff.pitchHz
            : Math.max(80, Math.min(1600, Math.round(updates.pitchHz))),
        gain:
          updates.gain == null
            ? current.riff.gain
            : Math.max(0.02, Math.min(0.32, Number(updates.gain))),
        resetBars:
          updates.resetBars == null
            ? current.riff.resetBars
            : Math.max(1, Math.min(8, Math.round(updates.resetBars))),
      },
    }));
  }, []);

  const handleSetRiffPhraseStepCount = useCallback((stepCount: number) => {
    setRiffCycleStudy((current) => updateRiffStepCount(current, stepCount));
    setSelectedRiffCycleStep((current) =>
      current != null && current >= Math.max(3, Math.min(64, Math.round(stepCount || 0)))
        ? null
        : current,
    );
  }, []);

  const handleToggleRiffCycleStep = useCallback((stepIndex: number) => {
    setRiffCycleStudy((current) =>
      canEditRiffStep(current, stepIndex) ? toggleRiffStep(current, stepIndex) : current,
    );
  }, []);

  const handleSetRiffCycleStepActive = useCallback((stepIndex: number, active: boolean) => {
    setRiffCycleStudy((current) =>
      canEditRiffStep(current, stepIndex) ? setRiffStepActive(current, stepIndex, active) : current,
    );
  }, []);

  const handleSelectRiffCycleStep = useCallback((stepIndex: number | null) => {
    setSelectedRiffCycleStep(stepIndex);
  }, []);

  const handleToggleRiffCycleAccent = useCallback((stepIndex: number) => {
    setRiffCycleStudy((current) =>
      canEditRiffStep(current, stepIndex) ? toggleRiffAccent(current, stepIndex) : current,
    );
  }, []);

  const handleRotateRiffCycle = useCallback((stepOffset: number) => {
    setRiffCycleStudy((current) => rotateRiffSteps(current, stepOffset));
  }, []);

  const handleInvertRiffCycle = useCallback(() => {
    setRiffCycleStudy((current) => invertRiffSteps(current));
  }, []);

  const handleClearRiffCycle = useCallback(() => {
    setRiffCycleStudy((current) => clearRiffSteps(current));
  }, []);

  const handleToggleRiffViewMode = useCallback(() => {
    setRiffCycleStudy((current) => ({
      ...current,
      viewMode: current.viewMode === 'unwrapped' ? 'circular' : 'unwrapped',
    }));
  }, []);

  const handleToggleRiffAlignmentMarkers = useCallback(() => {
    setRiffCycleStudy((current) => ({
      ...current,
      showAlignmentMarkers: !current.showAlignmentMarkers,
    }));
  }, []);

  const handleToggleRiffStepLabels = useCallback(() => {
    setRiffCycleStudy((current) => ({
      ...current,
      showStepLabels: !current.showStepLabels,
    }));
  }, []);

  const handleToggleRiffPhraseBody = useCallback(() => {
    setRiffCycleStudy((current) => ({
      ...current,
      showPhraseRing: !current.showPhraseRing,
    }));
  }, []);

  const handleToggleRiffEmphasisMode = useCallback(() => {
    setRiffCycleStudy((current) => ({
      ...current,
      emphasisMode: current.emphasisMode === 'analysis' ? 'groove' : 'analysis',
    }));
  }, []);

  const handleToggleRiffLandingEdit = useCallback(() => {
    setRiffCycleStudy((current) => ({
      ...current,
      landingEditEnabled: !current.landingEditEnabled,
      tailEditEnabled: false,
    }));
  }, []);

  const handleSetRiffEditMode = useCallback((mode: RiffEditMode) => {
    setRiffCycleStudy((current) => ({
      ...current,
      tailEditEnabled: false,
      landingEditEnabled: mode === 'landing',
    }));
  }, []);

  const handleSetRiffLandingLength = useCallback((landingLength: number) => {
    setRiffCycleStudy((current) => setLandingLength(current, landingLength));
  }, []);

  const handleClearRiffLanding = useCallback(() => {
    setRiffCycleStudy((current) => clearLandingOverrides(current));
  }, []);

  const handleMuteLastLandingSteps = useCallback((count: number) => {
    setRiffCycleStudy((current) => applyLandingStateToLastSlots(current, count, 'rest'));
  }, []);

  const handleAccentLastLandingSteps = useCallback((count: number) => {
    setRiffCycleStudy((current) => applyLandingStateToLastSlots(current, count, 'accent'));
  }, []);

  const handleSetRiffLandingStepActive = useCallback((slotIndex: number, active: boolean) => {
    setRiffCycleStudy((current) =>
      setLandingOverride(current, slotIndex, active ? 'on' : 'rest'),
    );
  }, []);

  const handleToggleRiffLandingAccent = useCallback((slotIndex: number) => {
    setRiffCycleStudy((current) =>
      setLandingOverride(
        current,
        slotIndex,
        current.landingOverrides[slotIndex] === 'accent' ? 'on' : 'accent',
      ),
    );
  }, []);

  const handleSetRiffSoundFocus = useCallback((focus: 'bar' | 'riff' | 'full') => {
    resumeRiffCycleAudio();
    setRiffCycleStudy((current) => ({
      ...current,
      soundEnabled: true,
      referenceSoundEnabled: focus !== 'riff',
      backbeatSoundEnabled: focus !== 'riff',
      riff: {
        ...current.riff,
        soundEnabled: focus !== 'bar',
      },
    }));
  }, []);

  const handleRandomRiffCycleStudy = useCallback(() => {
    setRiffCycleStudy({
      ...createRandomRiffCycleStudy(),
      playing: riffCycleStudy.playing,
    });
    setActiveRiffCyclePresetId(null);
    setSelectedRiffCycleStep(null);
    setRiffMobileLanePage(0);
    setRiffCycleRestartToken((value) => value + 1);
  }, [riffCycleStudy.playing]);

  const handleRemixRiffCycleStudy = useCallback(() => {
    setRiffCycleStudy((current) => {
      const remixed = remixRiffCycleStudy(current);
      setActiveRiffCyclePresetId(null);
      setSelectedRiffCycleStep((currentStep) =>
        currentStep != null && currentStep < remixed.riff.stepCount ? currentStep : null,
      );
      setRiffMobileLanePage(0);
      return remixed;
    });
    setRiffCycleRestartToken((value) => value + 1);
  }, []);

  const handleRandomPlusRiffCycleStudy = useCallback(() => {
    setRiffCycleStudy({
      ...createRandomPlusRiffCycleStudy(),
      playing: riffCycleStudy.playing,
    });
    setActiveRiffCyclePresetId(null);
    setSelectedRiffCycleStep(null);
    setRiffMobileLanePage(0);
    setRiffCycleRestartToken((value) => value + 1);
  }, [riffCycleStudy.playing]);
  const [activeSceneSource, setActiveSceneSource] = useState<ActiveSceneSource>('default');
  const [launchOrbitLockActive, setLaunchOrbitLockActive] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const guideCalloutRef = useRef<HTMLDivElement | null>(null);
  const captureLoadedRef = useRef(false);
  const siteSceneLoadedRef = useRef(false);
  const lastPatternMutationAtRef = useRef(0);
  const recentRandomSignaturesRef = useRef<Record<string, RandomHistoryEntry[]>>({});
  const guideSteps =
    appSurface === 'riff-cycle-study'
      ? isMobile
        ? MOBILE_RIFF_GUIDE
        : DESKTOP_RIFF_GUIDE
      : appSurface === 'polyrhythm-study'
        ? isMobile
          ? MOBILE_STUDY_GUIDE
          : DESKTOP_STUDY_GUIDE
      : isMobile
        ? MOBILE_START_GUIDE
        : DESKTOP_START_GUIDE;
  const currentGuideStep = guideSteps[Math.min(helpStepIndex, guideSteps.length - 1)];
  const mobileCanvasFrameStyle = isMobile
    ? ({
        width: '100%',
        height: 'min(76svh, 640px)',
        minHeight: '540px',
      } as const)
    : undefined;
  const handleExportRiffCyclePng = useCallback(
    (options: { aspect: 'landscape' | 'square' | 'portrait' | 'story'; scale: 1 | 2 | 4 }) => {
      const canvasEl = canvasRef.current;
      if (canvasEl && (canvasEl as any).__exportPng) {
        void (canvasEl as any).__exportPng(options);
        toast.success('Riff Cycle PNG exported.');
      } else {
        toast.error('Could not export Riff Cycle image.');
      }
    },
    [],
  );
  const handleExportRiffCycleScene = useCallback(() => {
    downloadRiffCycleSceneFile(riffCycleStudy.name || 'Riff Cycle Scene', riffCycleStudy);
    toast.success('Riff Cycle scene exported.');
  }, [riffCycleStudy]);
  const handleExportPolyrhythmPng = useCallback(
    (options: { aspect: 'landscape' | 'square' | 'portrait' | 'story'; scale: 1 | 2 | 4 }) => {
      const canvasEl = canvasRef.current;
      if (canvasEl && (canvasEl as any).__exportPng) {
        void (canvasEl as any).__exportPng(options);
        toast.success('Study PNG exported.');
      } else {
        toast.error('Could not export Study image.');
      }
    },
    [],
  );
  const handleExportPolyrhythmScene = useCallback(() => {
    downloadPolyrhythmStudyFile(polyrhythmStudy.name || 'Polyrhythm Study', polyrhythmStudy);
    toast.success('Study scene exported.');
  }, [polyrhythmStudy]);
  const viewportWidth = typeof window !== 'undefined' ? window.visualViewport?.width ?? window.innerWidth : 1280;
  const viewportHeight = typeof window !== 'undefined' ? window.visualViewport?.height ?? window.innerHeight : 800;
  const guideCalloutHeight = isMobile ? guideMeasuredHeight : 220;
  const guideCalloutWidth = isMobile ? Math.max(320, viewportWidth - 24) : 360;
  const mobileChevronButtonBaseStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'rgba(255,255,255,0.88)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  } as const;

  useEffect(() => {
    const firstLayer = polyrhythmStudy.layers[0];
    if (!firstLayer) {
      setSelectedPolyrhythmLayerId(null);
      setSelectedPolyrhythmStep(null);
      return;
    }

    const selectedLayerStillExists = polyrhythmStudy.layers.some(
      (layer) => layer.id === selectedPolyrhythmLayerId,
    );

    if (!selectedLayerStillExists) {
      setSelectedPolyrhythmLayerId(firstLayer.id);
    }

    setSelectedPolyrhythmStep((current) => {
      if (!current) {
        return current;
      }
      const layer = polyrhythmStudy.layers.find((entry) => entry.id === current.layerId);
      if (!layer || current.stepIndex >= layer.beatCount) {
        return null;
      }
      return current;
    });
  }, [polyrhythmStudy.layers, selectedPolyrhythmLayerId]);

  useEffect(() => {
    setSelectedRiffCycleStep((current) => {
      if (current == null) {
        return current;
      }
      return current >= riffCycleStudy.riff.stepCount ? null : current;
    });
  }, [riffCycleStudy.riff.stepCount]);
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
      const safePadding = 12;
      const maxHeight = Math.max(220, viewportHeight - safePadding * 2);
      const preferredBelowTop = guideRect.bottom + 18;
      const preferredAboveTop = guideRect.top - guideCalloutHeight - 18;
      const fitsBelow = preferredBelowTop + guideCalloutHeight <= viewportHeight - safePadding;
      const fitsAbove = preferredAboveTop >= safePadding;
      const preferredTop = fitsBelow
        ? preferredBelowTop
        : fitsAbove
          ? preferredAboveTop
          : guideRect.top + guideRect.height / 2 - guideCalloutHeight / 2;
      const clampedTop = Math.min(
        Math.max(safePadding, preferredTop),
        Math.max(safePadding, viewportHeight - guideCalloutHeight - safePadding),
      );

        return {
          ...base,
          left: 12,
          right: 12,
          top: clampedTop,
          maxHeight,
          overflowY: 'auto' as const,
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
  const openProPrompt = useCallback((feature: import('../lib/entitlements').ProFeature) => {
    const featureCopy: Record<import('../lib/entitlements').ProFeature, ProPromptState> = {
      'save-scenes': {
        feature: 'save-scenes',
        title: 'Save More With Pro',
        body: `Free keeps up to ${FREE_SCENE_SAVE_LIMIT} saved scenes. Pro turns Rhythmic Geometry into a lasting personal sketchbook.`,
      },
      export: {
        feature: 'export',
        title: 'Export Belongs To Pro',
        body: 'Pro unlocks stills, loops, and scene exports so what you make can leave the canvas.',
      },
      'random-plus': {
        feature: 'random-plus',
        title: 'Random+ Goes Further',
        body: 'Random+ opens a wider field of ratios, color movement, and motion than base Random.',
      },
      remix: {
        feature: 'remix',
        title: 'Remix Needs Pro',
        body: 'Remix reshapes the current study while keeping its core identity intact.',
      },
      'scene-editing': {
        feature: 'scene-editing',
        title: 'Editing Opens Up In Pro',
        body: 'Free is for exploring finished scenes. Pro unlocks shaping, tuning, and making them your own.',
      },
      'high-ratios': {
        feature: 'high-ratios',
        title: 'Deeper Ratios Need Pro',
        body: 'Free editing goes to 10. Pro opens the longer cycles and stranger balance points beyond it.',
      },
      'extra-orbits': {
        feature: 'extra-orbits',
        title: 'More Bodies, More Structure',
        body: 'Free keeps the system tight. Pro opens deeper multi-body studies across every mode.',
      },
      'color-editing': {
        feature: 'color-editing',
        title: 'Color Shaping Needs Pro',
        body: 'Pro unlocks direct color control so the image feels authored, not just discovered.',
      },
      'sound-editing': {
        feature: 'sound-editing',
        title: 'Sound Control Needs Pro',
        body: 'Free lets you hear the system. Pro lets you tune it with key, scale, tone, and role control.',
      },
      'pro-scenes': {
        feature: 'pro-scenes',
        title: 'This Study Is Included With Pro',
        body: 'Pro scenes are part of the full instrument and open only with Pro access.',
      },
    };
    setProPrompt(featureCopy[feature]);
  }, []);

  const requireProFeature = useCallback(
    (feature: import('../lib/entitlements').ProFeature, action: () => void) => {
      if (canUseProFeature(effectivePlan, feature)) {
        action();
        return;
      }
      openProPrompt(feature);
    },
    [effectivePlan, openProPrompt],
  );
  const beginStripeUpgrade = useCallback(async () => {
    if (!isSignedIn) {
      setSidebarOpen(true);
      toast.message('Sign in to unlock Pro and keep it with your account.');
      return;
    }

    if (checkoutSyncing) {
      setProPrompt(null);
      toast.message('Your purchase is still settling. Give it a moment, then refresh if Pro does not appear.');
      return;
    }

    if (hasProAccess) {
      setProPrompt(null);
      toast.message('Pro is already active on this account. If this still looks stale, refresh the page.');
      return;
    }

    setBillingLoading(true);
    try {
      setProPrompt(null);
      await startStripeCheckout();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start Stripe checkout.');
    } finally {
      setBillingLoading(false);
    }
  }, [checkoutSyncing, hasProAccess, isSignedIn]);
  const isPremiumSceneEditingLocked =
    (activeSceneSource === 'built-in' || activeSceneSource === 'premium-built-in') &&
    !canUseProFeature(effectivePlan, 'scene-editing');
  const freeOrbitLimit = getOrbitLimitForMode('free', geometryMode);
  const lockedLaunchOrbitId =
    launchOrbitLockActive && !canUseProFeature(effectivePlan, 'extra-orbits') && engineState.orbits.length > freeOrbitLimit
      ? engineState.orbits[freeOrbitLimit]?.id ?? null
      : null;
  const requireUnlockedSceneEditing = useCallback(() => {
    if (!isPremiumSceneEditingLocked) {
      return false;
    }
    openProPrompt('scene-editing');
    return true;
  }, [isPremiumSceneEditingLocked, openProPrompt]);
  const requireUnlockedLaunchOrbit = useCallback((orbitId: string) => {
    if (orbitId !== lockedLaunchOrbitId) {
      return false;
    }
    setProPrompt({
      feature: 'extra-orbits',
      context: 'launch-orbit-lock',
      title: 'That Launch Orbit Needs Pro',
      body: 'The 4th orbit in the default launch canvas is a Pro teaser. Free can keep the 3-orbit core, randomize into a new pattern, or reset back to a clean 3-orbit canvas.',
    });
    return true;
  }, [lockedLaunchOrbitId]);
  const triggerPatternMutation = useCallback((action: () => void) => {
    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    if (now - lastPatternMutationAtRef.current < PATTERN_MUTATION_COOLDOWN_MS) {
      return false;
    }
    lastPatternMutationAtRef.current = now;
    action();
    return true;
  }, []);

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

    const url = new URL(window.location.href);
    const checkoutState = url.searchParams.get('checkout');
    const sessionId = url.searchParams.get('session_id');
    const billingState = url.searchParams.get('billing');

    if (!checkoutState && !billingState) {
      return;
    }

    void (async () => {
      if (checkoutState === 'success' && sessionId) {
        setCheckoutSyncing(true);
        toast.message('Payment received. Unlocking Pro now. This can take a moment.');
        try {
          await confirmStripeCheckout(sessionId);
          await refreshAccount();
          toast.success('Pro unlocked. Refreshing…');
          window.setTimeout(() => {
            window.location.replace(url.pathname);
          }, 900);
          return;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not confirm checkout.');
        } finally {
          setCheckoutSyncing(false);
        }
      } else if (checkoutState === 'success') {
        toast.success('Purchase complete. Pro should appear in a moment.');
      } else if (checkoutState === 'canceled') {
        toast.message('Checkout canceled.');
      } else if (billingState === 'portal') {
        toast.message('Returned to your account.');
      }

      url.searchParams.delete('checkout');
      url.searchParams.delete('session_id');
      url.searchParams.delete('billing');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    })();
  }, [refreshAccount]);

  useEffect(() => {
    if (!proPrompt || !hasProAccess) {
      return;
    }
    setProPrompt(null);
  }, [hasProAccess, proPrompt]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(CANVAS_HUD_VISIBLE_STORAGE_KEY, canvasHudVisible ? '1' : '0');
  }, [canvasHudVisible]);

  useEffect(() => {
    persistSavedScenes(localSavedScenes);
  }, [localSavedScenes]);

  const refreshAccountPersistence = useCallback(async () => {
    if (!user?.id) {
      setSavedScenes(localSavedScenes);
      setExportRecords([]);
      return;
    }

    const [sceneRecords, exportRows] = await Promise.all([
      listSavedSceneRecords(user.id),
      listExportRecords(user.id),
    ]);

    setSavedScenes(
      sceneRecords
        .map(mapStoredSceneRecord)
        .filter((scene): scene is SavedScene => Boolean(scene)),
    );
    setExportRecords(exportRows.map(mapStoredExportRecord));
  }, [localSavedScenes, user?.id]);

  useEffect(() => {
    if (!isSignedIn) {
      setSavedScenes(localSavedScenes);
      setExportRecords([]);
      setCloudPersistenceLoading(false);
      return;
    }

    let active = true;
    setCloudPersistenceLoading(true);

    void refreshAccountPersistence()
      .then(() => {
        if (!active) {
          return;
        }
      })
      .catch((error) => {
        console.error(error);
        if (!active) {
          return;
        }
        toast.error('Could not load account scenes.');
        setSavedScenes([]);
        setExportRecords([]);
      })
      .finally(() => {
        if (active) {
          setCloudPersistenceLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isSignedIn, refreshAccountPersistence]);

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
    if (!isMobile || appSurface !== 'riff-cycle-study' || presentationMode) {
      setRiffMobileEditorOpen(false);
    }
  }, [appSurface, isMobile, presentationMode]);

  useEffect(() => {
    if (!isMobile || appSurface !== 'polyrhythm-study' || presentationMode) {
      setPolyrhythmMobileEditorOpen(false);
    }
  }, [appSurface, isMobile, presentationMode]);

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
    if (!helpOpen || appSurface !== 'riff-cycle-study') {
      return;
    }

    if (isMobile && currentGuideStep?.target === 'riff-mobile-edit') {
      setRiffMobileSection('edit');
      setRiffMobileEditTab('phrase');
      return;
    }
    if (currentGuideStep?.target === 'riff-layer-1') {
      if (isMobile) {
        setRiffMobileSection('edit');
        setRiffMobileEditTab('bar');
      } else {
        setRiffQuickPanel('bar');
      }
      return;
    }
    if (currentGuideStep?.target === 'riff-layer-2') {
      if (isMobile) {
        setRiffMobileSection('edit');
        setRiffMobileEditTab('phrase');
      } else {
        setRiffQuickPanel('phrase');
      }
      handleSetRiffEditMode('phrase');
      return;
    }
    if (currentGuideStep?.target === 'riff-ending') {
      if (isMobile) {
        setRiffMobileSection('edit');
        setRiffMobileEditTab('return');
      } else {
        setRiffQuickPanel('return');
      }
      handleSetRiffEditMode('landing');
      return;
    }
    if (isMobile && currentGuideStep?.target === 'riff-mobile-audio') {
      setRiffMobileSection('audio');
      return;
    }
    if (isMobile && currentGuideStep?.target === 'riff-mobile-scenes') {
      setRiffMobileSection('scenes');
      return;
    }
    if (currentGuideStep?.target === 'riff-desktop-audio') {
      setRiffUtilityPanel('audio');
      return;
    }
    if (currentGuideStep?.target === 'riff-desktop-sound') {
      setRiffUtilityPanel('sound');
      return;
    }
    if (currentGuideStep?.target === 'riff-desktop-view') {
      setRiffUtilityPanel('view');
    }
  }, [appSurface, currentGuideStep, handleSetRiffEditMode, helpOpen, isMobile]);

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

  useEffect(() => {
    if (!helpOpen) {
      return;
    }

    const updateGuideHeight = () => {
      const nextHeight = guideCalloutRef.current?.getBoundingClientRect().height;
      if (nextHeight) {
        setGuideMeasuredHeight(nextHeight);
      }
    };

    updateGuideHeight();
    window.addEventListener('resize', updateGuideHeight);
    window.visualViewport?.addEventListener('resize', updateGuideHeight);
    return () => {
      window.removeEventListener('resize', updateGuideHeight);
      window.visualViewport?.removeEventListener('resize', updateGuideHeight);
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

  useEffect(() => {
    if (!isMobile || appSurface !== 'riff-cycle-study') {
      return;
    }
    setRiffMobileLaneBarsPerPage((current) => {
      if (riffCycleStudy.reference.subdivision >= 20 && current !== 'full') {
        return 1;
      }
      if (current === 'full') {
        return current;
      }
      return Math.max(
        1,
        Math.min(current, riffCycleStudy.reference.barCountForDisplay),
      ) as 1 | 2;
    });
  }, [
    appSurface,
    isMobile,
    riffCycleStudy.reference.barCountForDisplay,
    riffCycleStudy.reference.subdivision,
  ]);

  useEffect(() => {
    setRiffMobileLanePage((current) => Math.min(current, Math.max(0, riffMobileLanePageCount - 1)));
  }, [riffMobileLanePageCount]);

  useEffect(() => {
    if (
      !isMobile ||
      appSurface !== 'riff-cycle-study' ||
      riffMobileEditTab !== 'return' ||
      riffCycleStudy.playing
    ) {
      return;
    }
    setRiffMobileLanePage(Math.max(0, riffMobileLanePageCount - 1));
  }, [
    appSurface,
    isMobile,
    riffCycleStudy.playing,
    riffMobileEditTab,
    riffMobileLanePageCount,
  ]);

  const handleRiffMobileReferenceStepChange = useCallback(
    (referenceStep: number) => {
      if (
        !isMobile ||
        appSurface !== 'riff-cycle-study' ||
        riffMobileLaneBarsPerPage === 'full' ||
        (!presentationMode && !riffMobileEditorOpen)
      ) {
        return;
      }

      const stepsPerBar = getReferenceStepsPerBar(riffCycleStudy.reference);
      const currentBar = Math.floor(referenceStep / stepsPerBar);
      const nextPage = Math.floor(currentBar / Math.max(1, riffMobileEffectiveBarsPerPage));
      setRiffMobileLanePage((current) =>
        current === nextPage ? current : Math.min(riffMobileLanePageCount - 1, nextPage),
      );
    },
    [
      appSurface,
      isMobile,
      presentationMode,
      riffMobileEditorOpen,
      riffMobileLaneBarsPerPage,
      riffMobileEffectiveBarsPerPage,
      riffMobileLanePageCount,
      riffCycleStudy.reference,
    ],
  );

  const openStartGuide = useCallback(() => {
    setHelpStepIndex(0);
    setHelpOpen(true);
  }, []);

  const closeStartGuide = useCallback(() => {
    setHelpOpen(false);
  }, []);

  const handleToggleHelpGuide = useCallback(() => {
    if (helpOpen) {
      closeStartGuide();
      return;
    }
    setSidebarOpen(false);
    setRadialMenu(null);
    openStartGuide();
  }, [closeStartGuide, helpOpen, openStartGuide]);

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
    if (requireUnlockedSceneEditing()) {
      return;
    }
    requireProFeature('sound-editing', () => {
      setHarmonySettings((current) => ({ ...current, ...updates }));
      setActiveSceneSource('custom');
    });
  }, [requireProFeature, requireUnlockedSceneEditing]);

  const handleReset = useCallback(() => {
    stopAllAudio();
    engineState.playing = false;
    resetEngine(engineState);
    handleClearTraces();
    rerender();
  }, [engineState, handleClearTraces, rerender]);

  const handleHardReset = useCallback(() => {
    stopAllAudio();
    if (getAudioMuted()) {
      toggleAudioMute();
    }
    setMuted(false);
    setSidebarOpen(false);
    setHelpOpen(false);
    setPresentationMode(false);
    setTraceMode(DEFAULT_SCENE_SNAPSHOT.traceMode);
    setShowPlanets(true);
    setTopStatusVisible(true);
    setCanvasHudVisible(true);
    setMobileScenesOpen(false);
    setMobileCustomizeOpen(false);
    setMobileSoundOpen(false);
    setHelpStepIndex(0);
    setRadialMenu(null);
    applySceneSnapshot(
      engineState,
      DEFAULT_SCENE_SNAPSHOT,
      setTraceMode,
      setHarmonySettings,
      setGeometryMode,
      setInterferenceSettings,
      handleClearTraces,
    );
    setActiveSceneSource('default');
    setLaunchOrbitLockActive(true);
    rerender();
  }, [engineState, handleClearTraces, rerender]);

  const resetToFreeDefaultCanvas = useCallback(() => {
    applySceneSnapshot(
      engineState,
      FREE_DEFAULT_SCENE_SNAPSHOT,
      setTraceMode,
      setHarmonySettings,
      setGeometryMode,
      setInterferenceSettings,
      handleClearTraces,
    );
    setActiveSceneSource('custom');
    setLaunchOrbitLockActive(false);
    setProPrompt(null);
    rerender();
  }, [engineState, handleClearTraces, rerender]);

  const makeEditableCopyFromCurrentScene = useCallback(() => {
    const freeOrbitLimit = getOrbitLimitForMode('free', geometryMode);
    if (engineState.orbits.length > freeOrbitLimit) {
      engineState.orbits = engineState.orbits.slice(0, freeOrbitLimit);
      setInterferenceSettings((current) => normalizeInterferenceSettings(engineState.orbits, current));
      resetEngine(engineState);
      handleClearTraces();
    }
    setActiveSceneSource('custom');
    setLaunchOrbitLockActive(false);
    setProPrompt(null);
    rerender();
  }, [engineState, geometryMode, handleClearTraces, rerender]);

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
      if (requireUnlockedSceneEditing()) {
        return;
      }
      if (requireUnlockedLaunchOrbit(id)) {
        return;
      }
      if (
        (typeof updates.color === 'string' ||
          typeof updates.harmonyDegree === 'number' ||
          typeof updates.harmonyRegister === 'number')
      ) {
        const feature =
          typeof updates.color === 'string' ? 'color-editing' : 'sound-editing';
        if (!canUseProFeature(effectivePlan, feature)) {
          openProPrompt(feature);
          return;
        }
      }

      const orbit = engineState.orbits.find((o) => o.id === id);
      if (orbit) {
        if (typeof updates.pulseCount === 'number' && updates.pulseCount > getMaxEditableRatio(effectivePlan)) {
          openProPrompt('high-ratios');
          return;
        }
        Object.assign(orbit, updates);
        setInterferenceSettings((current) => normalizeInterferenceSettings(engineState.orbits, current));
        if (typeof updates.direction === 'number' || typeof updates.pulseCount === 'number') {
          resetEngine(engineState);
          handleClearTraces();
        }
        setActiveSceneSource('custom');
        rerender();
      }
    },
    [effectivePlan, engineState, handleClearTraces, openProPrompt, requireUnlockedLaunchOrbit, requireUnlockedSceneEditing, rerender],
  );

  const handleDeleteOrbit = useCallback(
    (id: string) => {
      if (requireUnlockedSceneEditing()) {
        return;
      }
      if (requireUnlockedLaunchOrbit(id)) {
        return;
      }
      engineState.orbits = engineState.orbits.filter((o) => o.id !== id);
      setInterferenceSettings((current) => normalizeInterferenceSettings(engineState.orbits, current));
      resetEngine(engineState);
      handleClearTraces();
      setActiveSceneSource('custom');
      rerender();
    },
    [engineState, handleClearTraces, requireUnlockedLaunchOrbit, requireUnlockedSceneEditing, rerender],
  );

  const handleAddOrbit = useCallback(() => {
    if (requireUnlockedSceneEditing()) {
      return;
    }
    const modeOrbitLimit = getOrbitLimitForMode(effectivePlan, geometryMode);
    if (engineState.orbits.length >= modeOrbitLimit) {
      openProPrompt('extra-orbits');
      return;
    }
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
    setInterferenceSettings((current) =>
      normalizeInterferenceSettings(engineState.orbits, {
        ...current,
        sourceOrbitCId:
          (geometryMode === 'sweep' || geometryMode === 'interference-trace') && !current.sourceOrbitCId
            ? newOrbit.id
            : current.sourceOrbitCId,
        sourceOrbitDId:
          (geometryMode === 'sweep' || geometryMode === 'interference-trace') &&
          current.sourceOrbitCId &&
          !current.sourceOrbitDId
            ? newOrbit.id
            : current.sourceOrbitDId,
      }),
    );
    resetEngine(engineState);
    handleClearTraces();
    setActiveSceneSource('custom');
    rerender();
  }, [effectivePlan, engineState, geometryMode, handleClearTraces, openProPrompt, requireUnlockedSceneEditing, rerender]);

  const handleLoadPreset = useCallback(
    (ratios: number[]) => {
      if (requireUnlockedSceneEditing()) {
        return;
      }
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
      setActiveSceneSource('custom');
      setLaunchOrbitLockActive(false);
      setSidebarOpen(false);
      rerender();
    },
    [engineState, handleClearTraces, requireUnlockedSceneEditing, rerender],
  );

  const handleGeometryModeChange = useCallback(
    (mode: GeometryMode) => {
      if (requireUnlockedSceneEditing()) {
        return;
      }
      if (geometryMode === mode) {
        return;
      }
      setGeometryMode(mode);
      resetEngine(engineState);
      handleClearTraces();
      setActiveSceneSource('custom');
      rerender();
    },
    [engineState, geometryMode, handleClearTraces, requireUnlockedSceneEditing, rerender],
  );

  const handleInterferenceSettingsChange = useCallback(
    (updates: Partial<InterferenceSettings>) => {
      if (requireUnlockedSceneEditing()) {
        return;
      }
      if (
        (geometryMode === 'interference-trace' || geometryMode === 'sweep') &&
        (updates.sourceOrbitCId != null || updates.sourceOrbitDId != null) &&
        !canUseProFeature(effectivePlan, 'extra-orbits')
      ) {
        openProPrompt('extra-orbits');
        return;
      }
      setInterferenceSettings((current) =>
        normalizeInterferenceSettings(engineState.orbits, {
          ...current,
          ...updates,
        }),
      );
      resetEngine(engineState);
      handleClearTraces();
      setActiveSceneSource('custom');
      rerender();
    },
    [effectivePlan, engineState, geometryMode, handleClearTraces, openProPrompt, requireUnlockedSceneEditing, rerender],
  );

  const handleReverseDirections = useCallback(() => {
    if (requireUnlockedSceneEditing()) {
      return;
    }
    engineState.orbits.forEach((orbit) => {
      orbit.direction = orbit.direction === 1 ? -1 : 1;
    });
    resetEngine(engineState);
    handleClearTraces();
    setActiveSceneSource('custom');
    rerender();
  }, [engineState, handleClearTraces, requireUnlockedSceneEditing, rerender]);

  const handleAllClockwise = useCallback(() => {
    if (requireUnlockedSceneEditing()) {
      return;
    }
    engineState.orbits.forEach((orbit) => {
      orbit.direction = 1;
    });
    resetEngine(engineState);
    handleClearTraces();
    setActiveSceneSource('custom');
    rerender();
  }, [engineState, handleClearTraces, requireUnlockedSceneEditing, rerender]);

  const handleAlternateDirections = useCallback(() => {
    if (requireUnlockedSceneEditing()) {
      return;
    }
    engineState.orbits.forEach((orbit, index) => {
      orbit.direction = index % 2 === 0 ? 1 : -1;
    });
    resetEngine(engineState);
    handleClearTraces();
    setActiveSceneSource('custom');
    rerender();
  }, [engineState, handleClearTraces, requireUnlockedSceneEditing, rerender]);

  const handleOrbitLongPress = useCallback(
    (orbitId: string, x: number, y: number) => {
      if (requireUnlockedLaunchOrbit(orbitId)) {
        return;
      }
      setRadialMenu({ orbitId, x, y });
    },
    [requireUnlockedLaunchOrbit],
  );

  const handleOpenOrbitEditor = useCallback((orbitId: string) => {
    if (requireUnlockedSceneEditing()) {
      return;
    }
    if (requireUnlockedLaunchOrbit(orbitId)) {
      return;
    }
    if (!canUseProFeature(effectivePlan, 'color-editing')) {
      openProPrompt('color-editing');
      return;
    }
    const x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
    const y = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
    setRadialMenu({ orbitId, x, y });
  }, [effectivePlan, openProPrompt, requireUnlockedLaunchOrbit, requireUnlockedSceneEditing]);

  const handleRadialColorChange = useCallback(
    (orbitId: string, color: string) => {
      if (!canUseProFeature(effectivePlan, 'color-editing')) {
        openProPrompt('color-editing');
        return;
      }
      handleUpdateOrbit(orbitId, { color });
    },
    [effectivePlan, handleUpdateOrbit, openProPrompt],
  );

  const handleAdjustQuickOrbit = useCallback(
    (orbitId: string, delta: number) => {
      if (requireUnlockedSceneEditing()) {
        return;
      }
      if (requireUnlockedLaunchOrbit(orbitId)) {
        return;
      }
      const orbit = engineState.orbits.find((entry) => entry.id === orbitId);
      if (!orbit) {
        return;
      }
      const nextPulseCount = Math.max(1, Math.min(1000, orbit.pulseCount + delta));
      if (nextPulseCount > getMaxEditableRatio(effectivePlan)) {
        openProPrompt('high-ratios');
        return;
      }
      orbit.pulseCount = nextPulseCount;
      resetEngine(engineState);
      handleClearTraces();
      setActiveSceneSource('custom');
      rerender();
    },
    [effectivePlan, engineState, handleClearTraces, openProPrompt, requireUnlockedLaunchOrbit, requireUnlockedSceneEditing, rerender],
  );

  const handleSetQuickOrbit = useCallback(
    (orbitId: string, pulseCount: number) => {
      if (requireUnlockedSceneEditing()) {
        return;
      }
      if (requireUnlockedLaunchOrbit(orbitId)) {
        return;
      }
      const orbit = engineState.orbits.find((entry) => entry.id === orbitId);
      if (!orbit) {
        return;
      }
      const nextPulseCount = Math.max(1, Math.min(1000, pulseCount));
      if (nextPulseCount > getMaxEditableRatio(effectivePlan)) {
        openProPrompt('high-ratios');
        return;
      }
      orbit.pulseCount = nextPulseCount;
      resetEngine(engineState);
      handleClearTraces();
      setActiveSceneSource('custom');
      rerender();
    },
    [effectivePlan, engineState, handleClearTraces, openProPrompt, requireUnlockedLaunchOrbit, requireUnlockedSceneEditing, rerender],
  );

  const handleToggleOrbitDirection = useCallback(
    (orbitId: string) => {
      if (requireUnlockedSceneEditing()) {
        return;
      }
      if (requireUnlockedLaunchOrbit(orbitId)) {
        return;
      }
      const orbit = engineState.orbits.find((entry) => entry.id === orbitId);
      if (!orbit) {
        return;
      }
      orbit.direction = orbit.direction === 1 ? -1 : 1;
      resetEngine(engineState);
      handleClearTraces();
      setActiveSceneSource('custom');
      rerender();
    },
    [engineState, handleClearTraces, requireUnlockedLaunchOrbit, requireUnlockedSceneEditing, rerender],
  );

  const applyRandomPattern = useCallback((options?: { extended?: boolean }) => {
    const isExtended = Boolean(options?.extended);
    const isFreeBaseRandom = !isExtended && !isProPlan(effectivePlan);
    const isSweepMode = geometryMode === 'sweep';
    const isPatternMode = geometryMode === 'interference-trace';
    const normalizedCurrentSettings = normalizeInterferenceSettings(engineState.orbits, interferenceSettings);
    const hasInterferenceTriad =
      isPatternMode &&
      normalizedCurrentSettings.sourceOrbitCId != null &&
      normalizedCurrentSettings.sourceOrbitCId !== normalizedCurrentSettings.sourceOrbitAId &&
      normalizedCurrentSettings.sourceOrbitCId !== normalizedCurrentSettings.sourceOrbitBId;
    const hasInterferenceQuad =
      isPatternMode &&
      normalizedCurrentSettings.sourceOrbitDId != null &&
      normalizedCurrentSettings.sourceOrbitDId !== normalizedCurrentSettings.sourceOrbitAId &&
      normalizedCurrentSettings.sourceOrbitDId !== normalizedCurrentSettings.sourceOrbitBId &&
      normalizedCurrentSettings.sourceOrbitDId !== normalizedCurrentSettings.sourceOrbitCId;
    const hasSweepTriad =
      isSweepMode &&
      normalizedCurrentSettings.sourceOrbitCId != null &&
    normalizedCurrentSettings.sourceOrbitCId !== normalizedCurrentSettings.sourceOrbitAId &&
    normalizedCurrentSettings.sourceOrbitCId !== normalizedCurrentSettings.sourceOrbitBId;
    const hasSweepQuad =
      isSweepMode &&
      normalizedCurrentSettings.sourceOrbitDId != null &&
      normalizedCurrentSettings.sourceOrbitDId !== normalizedCurrentSettings.sourceOrbitAId &&
      normalizedCurrentSettings.sourceOrbitDId !== normalizedCurrentSettings.sourceOrbitBId &&
      normalizedCurrentSettings.sourceOrbitDId !== normalizedCurrentSettings.sourceOrbitCId;
    const historyKey = `${geometryMode}:${isExtended ? 'plus' : 'base'}`;
    const recentEntries = recentRandomSignaturesRef.current[historyKey] ?? [];
    const nextCount =
      geometryMode === 'standard-trace'
        ? (isExtended ? randomInt(3, 5) : randomInt(3, 5))
        : isSweepMode
          ? hasSweepQuad
            ? 4
            : hasSweepTriad
              ? 3
              : 2
          : isPatternMode
            ? hasInterferenceQuad
              ? 4
              : hasInterferenceTriad
                ? 3
              : 2
          : 2;
    const cappedNextCount = isFreeBaseRandom
      ? Math.min(nextCount, getOrbitLimitForMode('free', geometryMode))
      : nextCount;

    if (geometryMode === 'standard-trace') {
      if (engineState.orbits.length < cappedNextCount) {
        while (engineState.orbits.length < cappedNextCount) {
          engineState.orbits.push(createOrbit(DEFAULT_ORBITS[engineState.orbits.length % DEFAULT_ORBITS.length]));
        }
      } else if (engineState.orbits.length > cappedNextCount) {
        engineState.orbits = engineState.orbits.slice(0, cappedNextCount);
      }
    } else {
      if (engineState.orbits.length < cappedNextCount) {
        while (engineState.orbits.length < cappedNextCount) {
          engineState.orbits.push(createOrbit(DEFAULT_ORBITS[engineState.orbits.length % DEFAULT_ORBITS.length]));
        }
      } else if (engineState.orbits.length > cappedNextCount) {
        engineState.orbits = engineState.orbits.slice(0, cappedNextCount);
      }
    }

    let pulses = ensurePulseArrayLength(
      buildModeAwarePulses(geometryMode, engineState.orbits.length, options),
      engineState.orbits.length,
      options,
    );
    let directions = buildModeAwareDirections(geometryMode, engineState.orbits.length, options);
    let colors = isFreeBaseRandom
      ? engineState.orbits.map((orbit) => orbit.color)
      : buildRandomColors(engineState.orbits.length, options);
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
          : isSweepMode && engineState.orbits.length >= 3
            ? uniqueNumbers(pulses).length >= engineState.orbits.length && maxGap(pulses) >= (isExtended ? 8 : 2)
            : isPatternMode && engineState.orbits.length >= 3
              ? uniqueNumbers(pulses).length >= engineState.orbits.length && maxGap(pulses) >= (isExtended ? 6 : 2)
            : Math.abs(pulses[1]! - pulses[0]!) >= (isExtended ? 4 : 2);
      if (hasEnoughSpread && !shouldRejectCandidate(candidate, recentEntries)) {
        break;
      }
      pulses = ensurePulseArrayLength(
        buildModeAwarePulses(geometryMode, engineState.orbits.length, options),
        engineState.orbits.length,
        options,
      );
      directions = buildModeAwareDirections(geometryMode, engineState.orbits.length, options);
      colors = isFreeBaseRandom
        ? engineState.orbits.map((orbit) => orbit.color)
        : buildRandomColors(engineState.orbits.length, options);
      speedMultiplier = computeRandomSpeed(geometryMode, pulses, options);
      candidate = {
        pulses,
        directions,
        colors,
        speedBucket: Math.round(speedMultiplier * 10),
      };
    }

    const useKeyedHarmony = isFreeBaseRandom ? harmonySettings.tonePreset === 'scale-quantized' : isExtended ? Math.random() > 0.15 : Math.random() > 0.35;
    const scaleNames = Object.keys(SCALE_PRESETS) as ScaleName[];
    const nextScale = randomItem(scaleNames.filter((scale) => scale !== 'chromatic'));
    const nextRoot = randomItem(NOTE_NAMES);
    const nextMappingMode = randomItem(
      isExtended ? RANDOM_MAPPING_MODES.filter((mode) => mode !== 'color-hue') : RANDOM_MAPPING_MODES,
    );
    const useManualOrbitRoles = useKeyedHarmony && (isExtended ? Math.random() > 0.7 : Math.random() > 0.45);
    const scaleLength = SCALE_PRESETS[nextScale].intervals.length;
    const harmonyAssignments = buildHarmonyAssignments(engineState.orbits.length, scaleLength, options);
    const selectedCandidates =
      geometryMode === 'standard-trace'
        ? []
          : engineState.orbits.length <= 2
            ? [0, Math.max(1, engineState.orbits.length - 1)]
          : shuffleArray(Array.from({ length: engineState.orbits.length }, (_, index) => index))
              .slice(
                0,
                isSweepMode
                  ? hasSweepQuad
                    ? 4
                    : hasSweepTriad
                      ? 3
                      : 2
                  : isPatternMode
                    ? hasInterferenceQuad
                      ? 4
                      : hasInterferenceTriad
                        ? 3
                        : 2
                    : 2,
              )
              .sort((a, b) => a - b);

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

    if (!isFreeBaseRandom) {
      setHarmonySettings((current) => ({
        ...current,
        tonePreset: useKeyedHarmony ? 'scale-quantized' : 'original',
        rootNote: nextRoot,
        scaleName: nextScale,
        mappingMode: nextMappingMode,
        manualOrbitRoles: useManualOrbitRoles,
      }));
    }

    setInterferenceSettings((current) =>
      normalizeInterferenceSettings(engineState.orbits, {
        ...current,
        sourceOrbitAId: engineState.orbits[selectedCandidates[0]]?.id,
        sourceOrbitBId: engineState.orbits[selectedCandidates[1]]?.id,
        sourceOrbitCId:
          (isSweepMode && (hasSweepTriad || hasSweepQuad)) ||
          (isPatternMode && (hasInterferenceTriad || hasInterferenceQuad))
            ? engineState.orbits[selectedCandidates[2] ?? 2]?.id ?? null
            : null,
        sourceOrbitDId:
          (isSweepMode && hasSweepQuad) || (isPatternMode && hasInterferenceQuad)
            ? engineState.orbits[selectedCandidates[3] ?? 3]?.id ?? null
            : null,
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
  }, [effectivePlan, engineState, geometryMode, handleClearTraces, harmonySettings.tonePreset, interferenceSettings, rerender]);

  const handleRandomPattern = useCallback(() => {
    triggerPatternMutation(() => {
      applyRandomPattern();
      setActiveSceneSource('custom');
      setLaunchOrbitLockActive(false);
    });
  }, [applyRandomPattern, triggerPatternMutation]);

  const handleRandomPatternPlus = useCallback(() => {
    if (requireUnlockedSceneEditing()) {
      return;
    }
    requireProFeature('random-plus', () => {
      triggerPatternMutation(() => {
        applyRandomPattern({ extended: true });
        setActiveSceneSource('custom');
        setLaunchOrbitLockActive(false);
      });
    });
  }, [applyRandomPattern, requireProFeature, requireUnlockedSceneEditing, triggerPatternMutation]);

  const handleRemixPattern = useCallback(() => {
    if (requireUnlockedSceneEditing()) {
      return;
    }
    if (!canUseProFeature(effectivePlan, 'remix')) {
      openProPrompt('remix');
      return;
    }
    if (!triggerPatternMutation(() => {})) {
      return;
    }
    const useKeyedHarmony = Math.random() > 0.3;
    const scaleNames = Object.keys(SCALE_PRESETS) as ScaleName[];
    const nextScale = randomItem(scaleNames.filter((scale) => scale !== 'chromatic'));
    const nextRoot = randomItem(NOTE_NAMES);
    const nextMappingMode = randomItem(RANDOM_MAPPING_MODES.filter((mode) => mode !== 'color-hue'));
    const directions = buildModeAwareDirections(geometryMode, engineState.orbits.length, {
      extended: geometryMode !== 'standard-trace' && Math.random() > 0.5,
    });
    const colors = buildRandomColors(engineState.orbits.length, {
      extended: geometryMode !== 'standard-trace' && Math.random() > 0.5,
    });
    const speedMultiplier = computeRandomSpeed(
      geometryMode,
      engineState.orbits.map((orbit) => orbit.pulseCount),
      {
        extended: geometryMode !== 'standard-trace' && Math.random() > 0.5,
      },
    );
    const useManualOrbitRoles = useKeyedHarmony && Math.random() > 0.55;
    const scaleLength = SCALE_PRESETS[nextScale].intervals.length;
    const harmonyAssignments = buildHarmonyAssignments(engineState.orbits.length, scaleLength, {
      extended: useKeyedHarmony && Math.random() > 0.5,
    });

    engineState.orbits.forEach((orbit, index) => {
      orbit.direction = directions[index] ?? orbit.direction;
      orbit.color = colors[index % colors.length] ?? orbit.color;
      orbit.harmonyDegree = harmonyAssignments[index]?.degree ?? orbit.harmonyDegree;
      orbit.harmonyRegister = harmonyAssignments[index]?.register ?? orbit.harmonyRegister;
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
        showConnectors:
          geometryMode === 'sweep'
            ? false
            : geometryMode === 'interference-trace'
              ? true
              : current.showConnectors,
      }),
    );

    resetEngine(engineState);
    handleClearTraces();
    engineState.speedMultiplier = speedMultiplier;
    engineState.playing = true;
    engineState.lastTimestamp = -1;
    setActiveSceneSource('custom');
    setLaunchOrbitLockActive(false);
    rerender();
  }, [effectivePlan, engineState, geometryMode, handleClearTraces, openProPrompt, requireUnlockedSceneEditing, rerender, triggerPatternMutation]);

  const buildCurrentSceneSnapshot = useCallback((): SceneSnapshot => ({
    orbits: engineState.orbits.map(
      ({ pulseCount, radius, direction, color, harmonyDegree, harmonyRegister }) => ({
        pulseCount,
        radius,
        direction,
        color,
        harmonyDegree,
        harmonyRegister,
      }),
    ),
    speedMultiplier: engineState.speedMultiplier,
    traceMode,
    harmonySettings,
    geometryMode,
    interferenceSettings: serializeInterferenceSettings(
      engineState.orbits,
      interferenceSettings,
    ),
  }), [
    engineState.orbits,
    engineState.speedMultiplier,
    geometryMode,
    harmonySettings,
    interferenceSettings,
    traceMode,
  ]);

  const captureSceneThumbnail = useCallback(async () => {
    return (canvasRef.current as any)?.__captureThumbnail?.();
  }, []);

  const recordExportForAccount = useCallback(
    async (record: {
      type: string;
      sceneName?: string | null;
      snapshot?: SceneSnapshot | null;
      aspect?: string | null;
      scale?: number | null;
      durationSeconds?: number | null;
    }) => {
      if (!user?.id) {
        return;
      }

      try {
        const created = await createExportRecord(user.id, {
          type: record.type,
          scene_name: record.sceneName ?? null,
          snapshot: record.snapshot ?? null,
          aspect: record.aspect ?? null,
          scale: record.scale ?? null,
          duration_seconds: record.durationSeconds ?? null,
        });

        setExportRecords((current) => [
          mapStoredExportRecord(created),
          ...current.filter((entry) => entry.id !== created.id),
        ].slice(0, 12));
      } catch (error) {
        console.error(error);
        toast.error('Could not save export history to your account.');
      }
    },
    [user?.id],
  );

  const handleSaveScene = useCallback(() => {
    const run = async () => {
      if (!canUseProFeature(effectivePlan, 'save-scenes') && savedScenes.length >= FREE_SCENE_SAVE_LIMIT) {
        openProPrompt('save-scenes');
        return;
      }
      const now = new Date().toISOString();
      const defaultName = `Scene ${savedScenes.length + 1}`;
      const snapshot = buildCurrentSceneSnapshot();
      const thumbnailDataUrl = await captureSceneThumbnail();

      const newScene: SavedScene = {
        id: globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}`,
        name: defaultName,
        updatedAt: now,
        snapshot,
        thumbnailDataUrl,
      };

      if (isSignedIn && user?.id) {
        try {
          const stored = await upsertSavedSceneRecord(user.id, {
            id: newScene.id,
            name: newScene.name,
            snapshot: newScene.snapshot,
            thumbnail_data_url: newScene.thumbnailDataUrl ?? null,
            updated_at: newScene.updatedAt,
          });
          const mapped = mapStoredSceneRecord(stored) ?? newScene;
          setSavedScenes((current) => upsertSavedScene(current, mapped));
          toast.success('Scene saved to your account.');
        } catch (error) {
          console.error(error);
          toast.error('Could not save scene to your account.');
        }
        return;
      }

      setLocalSavedScenes((current) => {
        const next = upsertSavedScene(current, newScene);
        setSavedScenes(next);
        return next;
      });
      toast.success('Scene saved on this device.');
    };

    void run();
  }, [buildCurrentSceneSnapshot, captureSceneThumbnail, effectivePlan, isSignedIn, openProPrompt, savedScenes.length, user?.id]);

  const handleSaveSceneAs = useCallback(
    (name: string) => {
      const run = async () => {
        if (!canUseProFeature(effectivePlan, 'save-scenes') && savedScenes.length >= FREE_SCENE_SAVE_LIMIT) {
          openProPrompt('save-scenes');
          return;
        }
        const trimmedName = name.trim();
        const sceneName = trimmedName || `Scene ${savedScenes.length + 1}`;
        const now = new Date().toISOString();
        const snapshot = buildCurrentSceneSnapshot();
        const thumbnailDataUrl = await captureSceneThumbnail();

        const newScene: SavedScene = {
          id: globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}`,
          name: sceneName,
          updatedAt: now,
          snapshot,
          thumbnailDataUrl,
        };

        if (isSignedIn && user?.id) {
          try {
            const stored = await upsertSavedSceneRecord(user.id, {
              id: newScene.id,
              name: newScene.name,
              snapshot: newScene.snapshot,
              thumbnail_data_url: newScene.thumbnailDataUrl ?? null,
              updated_at: newScene.updatedAt,
            });
            const mapped = mapStoredSceneRecord(stored) ?? newScene;
            setSavedScenes((current) => upsertSavedScene(current, mapped));
            toast.success('Scene saved to your account.');
          } catch (error) {
            console.error(error);
            toast.error('Could not save scene to your account.');
          }
          return;
        }

        setLocalSavedScenes((current) => {
          const next = upsertSavedScene(current, newScene);
          setSavedScenes(next);
          return next;
        });
        toast.success('Scene saved on this device.');
      };

      void run();
    },
    [buildCurrentSceneSnapshot, captureSceneThumbnail, effectivePlan, isSignedIn, openProPrompt, savedScenes.length, user?.id],
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
      setActiveSceneSource('saved');
      setLaunchOrbitLockActive(false);
    },
    [engineState, handleClearTraces, rerender, savedScenes],
  );

  const handleLoadBuiltInScene = useCallback(
    (sceneId: string) => {
      const scene = [...BUILT_IN_SCENES, ...PREMIUM_SCENES].find((entry) => entry.id === sceneId);
      if (!scene) {
        return;
      }
      const isPremiumScene = PREMIUM_SCENES.some((entry) => entry.id === sceneId);
      if (isPremiumScene && !canUseProFeature(effectivePlan, 'pro-scenes')) {
        openProPrompt('pro-scenes');
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
      setActiveSceneSource(isPremiumScene ? 'premium-built-in' : 'built-in');
      setLaunchOrbitLockActive(false);
      if (!isPremiumScene && !canUseProFeature(effectivePlan, 'scene-editing')) {
        toast.message('Built-in scenes are preview-only in Free mode. Pro unlocks editing.');
      }
    },
    [effectivePlan, engineState, handleClearTraces, openProPrompt, rerender],
  );

  const handleDeleteScene = useCallback((sceneId: string) => {
    const run = async () => {
      if (isSignedIn && user?.id) {
        try {
          await deleteSavedSceneRecord(user.id, sceneId);
          setSavedScenes((current) => current.filter((scene) => scene.id !== sceneId));
        } catch (error) {
          console.error(error);
          toast.error('Could not delete account scene.');
        }
        return;
      }

      setLocalSavedScenes((current) => {
        const next = current.filter((scene) => scene.id !== sceneId);
        setSavedScenes(next);
        return next;
      });
    };

    void run();
  }, [isSignedIn, user?.id]);

  const handleExportPng = useCallback((options: { aspect: 'landscape' | 'square' | 'portrait' | 'story'; scale: 1 | 2 | 4 }) => {
    if (!canUseProFeature(effectivePlan, 'export')) {
      openProPrompt('export');
      return;
    }
    const canvasEl = canvasRef.current;
    if (canvasEl && (canvasEl as any).__exportPng) {
      (canvasEl as any).__exportPng(options);
      void recordExportForAccount({
        type: 'png',
        sceneName: 'Current Scene',
        snapshot: buildCurrentSceneSnapshot(),
        aspect: options.aspect,
        scale: options.scale,
      });
    }
  }, [buildCurrentSceneSnapshot, effectivePlan, openProPrompt, recordExportForAccount]);

  const handleExportVideo = useCallback(
    async (options: { durationSeconds: 8 | 12 }) => {
      if (!canUseProFeature(effectivePlan, 'export')) {
        openProPrompt('export');
        return;
      }
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
        await recordExportForAccount({
          type: 'webm',
          sceneName: 'Current Scene',
          snapshot: buildCurrentSceneSnapshot(),
          durationSeconds: options.durationSeconds,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setRecordingVideo(false);
      }
    },
    [buildCurrentSceneSnapshot, effectivePlan, engineState, handleClearTraces, openProPrompt, recordExportForAccount, recordingVideo, rerender],
  );

  const handleExportScene = useCallback(
    (sceneId: string) => {
      if (!canUseProFeature(effectivePlan, 'export')) {
        openProPrompt('export');
        return;
      }
      const scene = savedScenes.find((entry) => entry.id === sceneId);
      if (!scene) {
        return;
      }

      downloadSceneFile(scene);
      void recordExportForAccount({
        type: 'scene-json',
        sceneName: scene.name,
        snapshot: scene.snapshot,
      });
    },
    [effectivePlan, openProPrompt, recordExportForAccount, savedScenes],
  );

  const handleImportScene = useCallback(async (file: File) => {
    try {
      if (!canUseProFeature(effectivePlan, 'save-scenes') && savedScenes.length >= FREE_SCENE_SAVE_LIMIT) {
        openProPrompt('save-scenes');
        return;
      }
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

      if (isSignedIn && user?.id) {
        try {
          const stored = await upsertSavedSceneRecord(user.id, {
            id: sceneWithFreshId.id,
            name: sceneWithFreshId.name,
            snapshot: sceneWithFreshId.snapshot,
            thumbnail_data_url: sceneWithFreshId.thumbnailDataUrl ?? null,
            updated_at: sceneWithFreshId.updatedAt,
          });
          const mapped = mapStoredSceneRecord(stored) ?? sceneWithFreshId;
          setSavedScenes((current) => upsertSavedScene(current, mapped));
          toast.success('Imported to your account scenes.');
        } catch (error) {
          console.error(error);
          toast.error('Could not import scene to your account.');
        }
        return;
      }

      setLocalSavedScenes((current) => {
        const next = upsertSavedScene(current, sceneWithFreshId);
        setSavedScenes(next);
        return next;
      });
      toast.success('Scene imported on this device.');
    } catch {
      toast.error('That file could not be imported as a scene.');
    }
  }, [effectivePlan, isSignedIn, openProPrompt, savedScenes.length, user?.id]);

  const handleImportLocalScenes = useCallback(() => {
    const run = async () => {
      if (!user?.id || localSavedScenes.length === 0) {
        return;
      }
      if (!canUseProFeature(effectivePlan, 'save-scenes')) {
        const remainingFreeSlots = Math.max(0, FREE_SCENE_SAVE_LIMIT - savedScenes.length);
        if (remainingFreeSlots <= 0 || localSavedScenes.length > remainingFreeSlots) {
          openProPrompt('save-scenes');
          return;
        }
      }

      try {
        await Promise.all(
          localSavedScenes.map((scene) =>
            upsertSavedSceneRecord(user.id, {
              id: scene.id,
              name: scene.name,
              snapshot: scene.snapshot,
              thumbnail_data_url: scene.thumbnailDataUrl ?? null,
              updated_at: scene.updatedAt,
            }),
          ),
        );
        await refreshAccountPersistence();
        toast.success('Local scenes imported to your account.');
      } catch (error) {
        console.error(error);
        toast.error('Could not import local scenes.');
      }
    };

    void run();
  }, [effectivePlan, localSavedScenes, openProPrompt, refreshAccountPersistence, savedScenes.length, user?.id]);

  const normalizedPairSettings = normalizeInterferenceSettings(engineState.orbits, interferenceSettings);
  const hasInterferenceTriad =
    geometryMode === 'interference-trace' &&
    normalizedPairSettings.sourceOrbitCId != null &&
    normalizedPairSettings.sourceOrbitCId !== normalizedPairSettings.sourceOrbitAId &&
    normalizedPairSettings.sourceOrbitCId !== normalizedPairSettings.sourceOrbitBId;
  const hasInterferenceQuad =
    geometryMode === 'interference-trace' &&
    normalizedPairSettings.sourceOrbitDId != null &&
    normalizedPairSettings.sourceOrbitDId !== normalizedPairSettings.sourceOrbitAId &&
    normalizedPairSettings.sourceOrbitDId !== normalizedPairSettings.sourceOrbitBId &&
    normalizedPairSettings.sourceOrbitDId !== normalizedPairSettings.sourceOrbitCId;
  const hasSweepTriad =
    geometryMode === 'sweep' &&
    normalizedPairSettings.sourceOrbitCId != null &&
    normalizedPairSettings.sourceOrbitCId !== normalizedPairSettings.sourceOrbitAId &&
    normalizedPairSettings.sourceOrbitCId !== normalizedPairSettings.sourceOrbitBId;
  const hasSweepQuad =
    geometryMode === 'sweep' &&
    normalizedPairSettings.sourceOrbitDId != null &&
    normalizedPairSettings.sourceOrbitDId !== normalizedPairSettings.sourceOrbitAId &&
    normalizedPairSettings.sourceOrbitDId !== normalizedPairSettings.sourceOrbitBId &&
    normalizedPairSettings.sourceOrbitDId !== normalizedPairSettings.sourceOrbitCId;
  const canAddSweepOrbit =
    geometryMode === 'sweep' &&
    !hasSweepQuad &&
    engineState.orbits.length < 6;
  const canAddInterferenceOrbit =
    geometryMode === 'interference-trace' &&
    !hasInterferenceQuad &&
    engineState.orbits.length < 6;
  const activePairControls = (
    geometryMode === 'standard-trace'
      ? []
      : [
          normalizedPairSettings.sourceOrbitAId,
          normalizedPairSettings.sourceOrbitBId,
          ...((hasSweepTriad || hasInterferenceTriad) ? [normalizedPairSettings.sourceOrbitCId] : []),
          ...((hasSweepQuad || hasInterferenceQuad) ? [normalizedPairSettings.sourceOrbitDId] : []),
        ]
          .filter((orbitId): orbitId is string => Boolean(orbitId))
          .map((orbitId, index) => {
            const orbit = engineState.orbits.find((entry) => entry.id === orbitId);
            if (!orbit) {
              return null;
            }
            return {
              id: orbit.id,
              label:
                geometryMode === 'sweep'
                  ? index === 0
                    ? 'Sweep A'
                    : index === 1
                      ? 'Sweep B'
                      : index === 2
                        ? 'Sweep C'
                        : 'Sweep D'
                  : geometryMode === 'interference-trace'
                    ? index === 0
                      ? 'Interference A'
                      : index === 1
                        ? 'Interference B'
                        : index === 2
                          ? 'Interference C'
                          : 'Interference D'
                  : index === 0
                    ? 'Pair A'
                    : 'Pair B',
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
  const mobileQuickOrbitSliderMax = Math.min(
    getMaxEditableRatio(effectivePlan),
    geometryMode === 'standard-trace' ? 32 : 100,
  );
  const modeDescription =
    geometryMode === 'standard-trace'
      ? 'Shared multi-orbit string field.'
      : geometryMode === 'interference-trace'
        ? hasInterferenceQuad
          ? 'Live derived path from the selected quartet.'
          : hasInterferenceTriad
            ? 'Live derived path from the selected triad.'
            : 'Live derived path from the selected pair.'
        : hasSweepQuad
          ? 'Finite sampled sweep from the selected quartet.'
          : hasSweepTriad
            ? 'Finite sampled sweep from the selected triad.'
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
  const proPromptOverlay = proPrompt ? (
    <>
      <button
        type="button"
        aria-label="Close Pro prompt"
        className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm"
        onClick={() => setProPrompt(null)}
      />
      <div className="fixed inset-x-4 bottom-6 z-[100] mx-auto max-w-md rounded-[1.6rem] border border-white/10 bg-[#10131b]/94 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:bottom-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: '#FFAA00' }}>
          Go Further
        </div>
        <div className="mt-3 text-xl font-light text-white">
          {proPrompt.title}
        </div>
        <p className="mt-3 text-sm leading-7 text-white/58">
          {proPrompt.body}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {proPrompt.feature === 'scene-editing' && activeSceneSource === 'built-in' ? (
            <button
              type="button"
              onClick={() => {
                makeEditableCopyFromCurrentScene();
                toast.message('Scene copied into a free editable study.');
              }}
              className="inline-flex items-center justify-center rounded-full border border-[#00FFAA]/24 bg-[#00FFAA]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#00FFAA] transition hover:bg-[#00FFAA]/16"
            >
              Make Editable Copy
            </button>
          ) : null}
          {proPrompt.context === 'launch-orbit-lock' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  triggerPatternMutation(() => {
                    applyRandomPattern();
                    setActiveSceneSource('custom');
                    setProPrompt(null);
                  });
                }}
                className="inline-flex items-center justify-center rounded-full border border-[#66CCFF]/24 bg-[#66CCFF]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#88CCFF] transition hover:bg-[#66CCFF]/16"
              >
                Random Fresh Canvas
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToFreeDefaultCanvas();
                  toast.message('Returned to a clean 3-orbit study.');
                }}
                className="inline-flex items-center justify-center rounded-full border border-[#00FFAA]/24 bg-[#00FFAA]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#00FFAA] transition hover:bg-[#00FFAA]/16"
              >
                Reset To 3 Orbits
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (isSignedIn && !hasProAccess) {
                void beginStripeUpgrade();
                return;
              }
              setProPrompt(null);
              if (!isSignedIn) {
                setSidebarOpen(true);
              }
            }}
            disabled={billingLoading || checkoutSyncing}
            className="inline-flex items-center justify-center rounded-full border border-[#FFAA00]/24 bg-[#FFAA00]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#FFAA00] transition hover:bg-[#FFAA00]/16 disabled:opacity-60"
          >
            {billingLoading
              ? 'Opening Checkout…'
              : checkoutSyncing
                ? 'Processing Purchase…'
                : hasProAccess
                  ? 'Pro Active'
                  : isSignedIn
                    ? 'Unlock Pro'
                    : 'Open Account'}
          </button>
          <button
            type="button"
            onClick={() => setProPrompt(null)}
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/72 transition hover:border-white/18 hover:text-white"
          >
            Stay In Free
          </button>
        </div>
      </div>
    </>
  ) : null;
  const appSurfaceToggle = !captureMode && !isMobile ? (
    <div
      className="fixed z-20 left-1/2 top-3 -translate-x-1/2"
    >
      <div
        className="inline-flex rounded-full border border-white/8 bg-[#111116]/70 p-[0.2rem] shadow-[0_8px_22px_rgba(0,0,0,0.22)] backdrop-blur-lg"
      >
        {([
          ['orbital', 'Orbit'],
          ['polyrhythm-study', 'Study'],
          ['riff-cycle-study', 'Riff'],
        ] as const).map(([surfaceId, label]) => {
          const active = appSurface === surfaceId;
          return (
            <button
              key={surfaceId}
              type="button"
              onClick={() => handleAppSurfaceChange(surfaceId)}
              className="rounded-full px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-[0.14em] transition-all"
              style={{
                background: active ? 'rgba(114,241,184,0.1)' : 'transparent',
                color: active ? '#72F1B8' : 'rgba(255,255,255,0.44)',
                border: active ? '1px solid rgba(114,241,184,0.18)' : '1px solid transparent',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;
  const polyrhythmLayerCount = polyrhythmStudy.layers.length;
  const polyrhythmStepCount = polyrhythmStudy.layers.reduce(
    (count, layer) => count + layer.beatCount,
    0,
  );
  const polyrhythmActiveCount = polyrhythmStudy.layers.reduce(
    (count, layer) =>
      count + countActiveSteps(layer),
    0,
  );
  const selectedPolyrhythmLayer =
    polyrhythmStudy.layers.find((layer) => layer.id === selectedPolyrhythmLayerId) ??
    polyrhythmStudy.layers[0] ??
    null;
  const selectedPolyrhythmStepActive =
    selectedPolyrhythmLayer &&
    selectedPolyrhythmStep?.layerId === selectedPolyrhythmLayer.id
      ? Boolean(selectedPolyrhythmLayer.activeSteps[selectedPolyrhythmStep.stepIndex])
      : null;
  const polyrhythmSoundFocus =
    !polyrhythmStudy.soundEnabled
      ? 'mute'
      : selectedPolyrhythmLayer &&
          polyrhythmStudy.layers.every((layer) =>
            layer.id === selectedPolyrhythmLayer.id ? layer.soundEnabled : !layer.soundEnabled,
          )
        ? 'layer'
        : polyrhythmStudy.layers.every((layer) => layer.soundEnabled)
          ? 'stack'
          : 'stack';
  const polyrhythmAudioSummary =
    polyrhythmSoundFocus === 'mute'
      ? 'Muted'
      : polyrhythmSoundFocus === 'layer'
        ? 'Solo'
        : 'All';
  const polyrhythmSoundSummary =
    polyrhythmStudy.soundSettings.pitchMode === 'keyed'
      ? `${polyrhythmStudy.soundSettings.rootNote} ${SCALE_PRESETS[polyrhythmStudy.soundSettings.scaleName].label}`
      : 'Original';
  const polyrhythmViewSummary =
    polyrhythmStudy.showStepLabels
      ? 'Labels'
      : polyrhythmStudy.showInactiveSteps
        ? 'Faint'
        : 'Clean';
  const riffEditMode: RiffEditMode = riffCycleStudy.landingEditEnabled
    ? 'landing'
    : 'phrase';
  const riffSoundFocus =
    riffCycleStudy.referenceSoundEnabled && riffCycleStudy.backbeatSoundEnabled && !riffCycleStudy.riff.soundEnabled
      ? 'bar'
      : !riffCycleStudy.referenceSoundEnabled && !riffCycleStudy.backbeatSoundEnabled && riffCycleStudy.riff.soundEnabled
        ? 'riff'
        : 'full';
  const riffAudioSummary =
    riffSoundFocus === 'bar' ? 'Bar Only' : riffSoundFocus === 'riff' ? 'Riff Only' : 'Bar + Riff';
  const riffSoundSummary =
    riffCycleStudy.soundSettings.pitchMode === 'keyed'
      ? `${riffCycleStudy.soundSettings.rootNote} ${SCALE_PRESETS[riffCycleStudy.soundSettings.scaleName].label}`
      : 'Original';
  const riffViewSummary =
    riffCycleStudy.viewMode === 'unwrapped'
      ? 'Lane'
      : riffCycleStudy.showStepLabels
        ? 'Labels'
        : riffCycleStudy.showPhraseRing
          ? 'Shape'
          : 'Circle';
  const riffQuickFocusLabel =
    riffQuickPanel === 'bar'
      ? 'Bar'
      : riffQuickPanel === 'return'
        ? 'Ending'
        : riffEditMode === 'landing'
          ? 'Ending'
          : 'Riff';
  if (!captureMode && appSurface === 'polyrhythm-study') {
    const activePolyrhythmPreset =
      POLYRHYTHM_PRESETS.find((preset) => preset.id === activePolyrhythmPresetId) ?? null;
    const polyrhythmLayerSummary = selectedPolyrhythmLayer
      ? `${selectedPolyrhythmLayer.beatCount} steps · ${countActiveSteps(selectedPolyrhythmLayer)} on`
      : 'Select a ring';
    const polyrhythmStackSummary = `${polyrhythmLayerCount} rings · ${polyrhythmActiveCount} on`;
    const polyrhythmShapeSummary = selectedPolyrhythmStep
      ? `Step ${selectedPolyrhythmStep.stepIndex + 1}`
      : selectedPolyrhythmLayer
        ? `${Math.round(selectedPolyrhythmLayer.rotationOffset)}°`
        : 'Select a step';
    const polyrhythmEditorHint =
      polyrhythmStudy.layers.some((layer) => layer.beatCount > 20)
        ? 'Tap steps to toggle them. Landscape gives the ring more room.'
        : 'Tap steps to toggle them. Use the chips above to switch rings.';
    const groupedPolyrhythmPresets = (['one-layer', 'two-layer', 'advanced'] as const).map((group) => ({
      group,
      presets: POLYRHYTHM_PRESETS.filter((preset) => preset.group === group),
    }));
    const filteredPolyrhythmMobilePresets =
      groupedPolyrhythmPresets.find(({ group }) => group === polyrhythmMobileSceneGroup)?.presets ??
      [];
    const polyrhythmMobileEditorTab = polyrhythmMobileEditTab === 'shape' ? 'shape' : 'layer';
    const polyrhythmMobileCanvasStyle = {
      width: '100%',
      height: 'min(72svh, 620px)',
      minHeight: '460px',
    } as const;

    if (isMobile && !presentationMode) {
      return (
        <div className="min-h-[100svh] overflow-y-auto bg-[#111116] pt-2 pb-7 select-none">
          <div className="space-y-2">
            <div className="relative overflow-hidden" style={polyrhythmMobileCanvasStyle}>
              <PolyrhythmCanvas
                study={polyrhythmStudy}
                restartToken={polyrhythmRestartToken}
                selectedLayerId={selectedPolyrhythmLayer?.id ?? null}
                selectedStep={selectedPolyrhythmStep}
                externalCanvasRef={canvasRef}
                onSelectLayer={handleSelectPolyrhythmLayer}
                onSelectStep={handleSelectPolyrhythmStep}
                onToggleStep={handleTogglePolyrhythmLayerStep}
                onClearSelection={handleClearPolyrhythmSelection}
                className="absolute inset-0 h-full w-full"
              />
            </div>

            <div className="px-4 flex flex-col gap-3">
              <div
                data-guide="study-mobile-playback"
                className="relative z-10 rounded-[28px] border px-4 py-4 space-y-3"
                style={{ background: 'rgba(17,17,22,0.9)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/50">
                    Playback
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      data-guide="study-mobile-present"
                      onClick={handleTogglePresentation}
                      type="button"
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      aria-label="Presentation mode"
                    >
                      <Maximize2 size={17} />
                    </button>
                    <button
                      onClick={handleToggleHelpGuide}
                      type="button"
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      aria-label={helpOpen ? 'Close help' : 'Open help'}
                    >
                      <CircleHelp size={17} />
                    </button>
                    <button
                      data-guide="study-mobile-menu"
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

                <div className="grid grid-cols-3 gap-2">
                  <StudyShellButton
                    tone={polyrhythmStudy.playing ? 'red' : 'green'}
                    highlighted
                    icon={polyrhythmStudy.playing ? <Pause size={16} /> : <Play size={16} />}
                    onClick={handleTogglePolyrhythmPlayback}
                    className="w-full"
                  >
                    {polyrhythmStudy.playing ? 'Pause' : 'Play'}
                  </StudyShellButton>
                  <StudyShellButton
                    tone="amber"
                    highlighted
                    icon={<RotateCcw size={15} />}
                    onClick={handleRestartPolyrhythmTransport}
                    className="w-full"
                  >
                    Restart
                  </StudyShellButton>
                  <StudyShellButton
                    tone="blue"
                    highlighted={polyrhythmStudy.soundEnabled}
                    icon={polyrhythmStudy.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    onClick={handleTogglePolyrhythmSound}
                    data-guide="study-mobile-audio"
                    className="w-full"
                  >
                    Audio
                  </StudyShellButton>
                </div>

                <div data-guide="study-mobile-tempo" className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/48">
                      Speed
                    </div>
                    <div className="text-[14px] font-light text-white">
                      {polyrhythmStudy.bpm}
                      <span className="ml-1 text-[8px] font-mono uppercase tracking-[0.14em] text-white/36">
                        BPM
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="180"
                    step="1"
                    value={polyrhythmStudy.bpm}
                    onChange={(event) => handlePolyrhythmBpmChange(parseInt(event.target.value, 10) || polyrhythmStudy.bpm)}
                    onPointerDown={(event) =>
                      handleMobileSliderPointerDown(event, 'study-tempo', (value) =>
                        handlePolyrhythmBpmChange(Math.round(value)),
                      )
                    }
                    onPointerMove={(event) =>
                      handleMobileSliderPointerMove(event, 'study-tempo', (value) =>
                        handlePolyrhythmBpmChange(Math.round(value)),
                      )
                    }
                    onPointerUp={() => clearActiveMobileSlider('study-tempo')}
                    onPointerCancel={() => clearActiveMobileSlider('study-tempo')}
                    onBlur={() => clearActiveMobileSlider('study-tempo')}
                    data-dragging={activeMobileSliderId === 'study-tempo'}
                    className="touch-slider w-full"
                    style={{ ['--slider-accent' as string]: '#ffffff' }}
                    aria-label="Set study tempo"
                  />
                </div>
              </div>

              <div
                data-guide="study-mobile-edit"
                className="rounded-[28px] border"
                style={{
                  order: 2,
                  background:
                    polyrhythmMobileSection === 'edit'
                      ? 'linear-gradient(180deg, rgba(17,17,22,0.96), rgba(17,17,22,0.9))'
                      : 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.86))',
                  borderColor:
                    polyrhythmMobileSection === 'edit'
                      ? `${selectedPolyrhythmLayer?.color ?? '#7FD7FF'}24`
                      : 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setPolyrhythmMobileSection((current) => (current === 'edit' ? null : 'edit'))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: polyrhythmMobileSection === 'edit' ? (selectedPolyrhythmLayer?.color ?? '#72F1B8') : 'rgba(255,255,255,0.5)' }}>
                      Edit
                    </div>
                    <div className="mt-1 text-[12px]" style={{ color: polyrhythmMobileSection === 'edit' ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.42)' }}>
                      {polyrhythmMobileEditTab === 'layer'
                        ? polyrhythmLayerSummary
                        : polyrhythmMobileEditTab === 'stack'
                          ? polyrhythmStackSummary
                          : polyrhythmShapeSummary}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {([
                        ['layer', 'Layer'],
                        ['stack', 'Stack'],
                        ['shape', 'Mask'],
                      ] as const).map(([tabId, label]) => {
                        const active = polyrhythmMobileEditTab === tabId;
                        return (
                          <button
                            key={tabId}
                            type="button"
                            data-guide={tabId === 'layer' ? 'study-quick-layer' : tabId === 'stack' ? 'study-quick-stack' : 'study-quick-shape'}
                            onClick={() => {
                              setPolyrhythmMobileEditTab(tabId);
                              setPolyrhythmQuickPanel(tabId);
                              setPolyrhythmMobileSection('edit');
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em]"
                            style={{
                              background: active ? `${selectedPolyrhythmLayer?.color ?? '#72F1B8'}16` : 'transparent',
                              color: active ? selectedPolyrhythmLayer?.color ?? '#72F1B8' : 'rgba(255,255,255,0.5)',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPolyrhythmMobileSection((current) => (current === 'edit' ? null : 'edit'))}
                      className="h-10 min-w-10 rounded-xl flex items-center justify-center px-2.5 shrink-0 active:scale-[0.97]"
                      style={{
                        ...mobileChevronButtonBaseStyle,
                        background: polyrhythmMobileSection === 'edit' ? `${selectedPolyrhythmLayer?.color ?? '#72F1B8'}14` : mobileChevronButtonBaseStyle.background,
                        border: polyrhythmMobileSection === 'edit' ? `1px solid ${selectedPolyrhythmLayer?.color ?? '#72F1B8'}36` : mobileChevronButtonBaseStyle.border,
                        color: polyrhythmMobileSection === 'edit' ? selectedPolyrhythmLayer?.color ?? '#72F1B8' : mobileChevronButtonBaseStyle.color,
                      }}
                      aria-label={polyrhythmMobileSection === 'edit' ? 'Collapse edit' : 'Expand edit'}
                    >
                      {polyrhythmMobileSection === 'edit' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {polyrhythmMobileSection === 'edit' ? (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {polyrhythmMobileEditTab === 'layer' ? (
                      <div className="space-y-3">
                        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none]">
                          <div className="flex gap-2 px-1">
                            {polyrhythmStudy.layers.map((layer, index) => {
                              const active = layer.id === selectedPolyrhythmLayer?.id;
                              return (
                                <StudyShellButton
                                  key={layer.id}
                                  size="compact"
                                  tone="neutral"
                                  highlighted={active}
                                  onClick={() => {
                                    handleSelectPolyrhythmLayer(layer.id);
                                    setSelectedPolyrhythmStep(null);
                                  }}
                                  style={
                                    active
                                      ? {
                                          background: `${layer.color}16`,
                                          borderColor: `${layer.color}44`,
                                          color: layer.color,
                                          boxShadow: `0 0 0 1px ${layer.color}22 inset`,
                                        }
                                      : undefined
                                  }
                                >
                                  L{index + 1}
                                </StudyShellButton>
                              );
                            })}
                          </div>
                        </div>

                        {selectedPolyrhythmLayer ? (
                          <>
                            <div className="space-y-1.5">
                              <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Steps</div>
                              <div className="flex items-center gap-2">
                                <StudyShellButton size="square" onClick={() => handleSetPolyrhythmLayerBeatCount(selectedPolyrhythmLayer.id, selectedPolyrhythmLayer.beatCount - 1)}>
                                  <Minus size={14} />
                                </StudyShellButton>
                                <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-center text-[14px] font-light text-white">
                                  {selectedPolyrhythmLayer.beatCount}
                                </div>
                                <StudyShellButton size="square" onClick={() => handleSetPolyrhythmLayerBeatCount(selectedPolyrhythmLayer.id, selectedPolyrhythmLayer.beatCount + 1)}>
                                  <Plus size={14} />
                                </StudyShellButton>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">
                                <span>Color</span>
                                <span>{countActiveSteps(selectedPolyrhythmLayer)} On</span>
                              </div>
                              <div className="grid grid-cols-6 gap-2">
                                {POLYRHYTHM_LAYER_COLORS.slice(0, 12).map((color) => {
                                  const active = selectedPolyrhythmLayer.color === color;
                                  return (
                                    <button
                                      key={color}
                                      type="button"
                                      onClick={() => handleUpdatePolyrhythmLayer(selectedPolyrhythmLayer.id, { color })}
                                      className="h-9 rounded-lg border transition-transform active:scale-[0.97]"
                                      style={{
                                        background: `${color}18`,
                                        borderColor: active ? `${color}aa` : `${color}44`,
                                        boxShadow: active ? `0 0 0 1px ${color}aa inset` : 'none',
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            <StudyShellButton
                              tone="blue"
                              highlighted
                              onClick={() => {
                                setPolyrhythmMobileEditTab('layer');
                                setPolyrhythmMobileEditorOpen(true);
                              }}
                              className="w-full"
                            >
                              Open Editor
                            </StudyShellButton>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {polyrhythmMobileEditTab === 'stack' ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <StudyShellButton tone="blue" highlighted icon={<Plus size={15} />} onClick={handleAddPolyrhythmLayer} className="w-full">
                            Add Ring
                          </StudyShellButton>
                          <StudyShellButton
                            tone="red"
                            highlighted={Boolean(selectedPolyrhythmLayer && polyrhythmStudy.layers.length > 1)}
                            icon={<Trash2 size={15} />}
                            onClick={() =>
                              selectedPolyrhythmLayer &&
                              polyrhythmStudy.layers.length > 1 &&
                              handleRemovePolyrhythmLayer(selectedPolyrhythmLayer.id)
                            }
                            disabled={!selectedPolyrhythmLayer || polyrhythmStudy.layers.length <= 1}
                            className="w-full"
                          >
                            Remove
                          </StudyShellButton>
                        </div>

                        {selectedPolyrhythmLayer ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">
                              <span>Radius</span>
                              <span>{selectedPolyrhythmLayer.radius}</span>
                            </div>
                            <input
                              type="range"
                              min="70"
                              max="320"
                              step="2"
                              value={selectedPolyrhythmLayer.radius}
                              onChange={(event) =>
                                handleUpdatePolyrhythmLayer(selectedPolyrhythmLayer.id, {
                                  radius: parseInt(event.target.value, 10) || 70,
                                })
                              }
                              className="touch-slider w-full"
                              style={{ ['--slider-accent' as string]: selectedPolyrhythmLayer.color }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {polyrhythmMobileEditTab === 'shape' ? (
                      <div className="space-y-3">
                        {selectedPolyrhythmLayer ? (
                          <>
                            <div className="grid grid-cols-4 gap-2">
                              <StudyShellButton size="compact" onClick={() => handleRotatePolyrhythmLayer(selectedPolyrhythmLayer.id, -1)}>
                                <ChevronLeft size={14} />
                              </StudyShellButton>
                              <StudyShellButton size="compact" onClick={() => handleRotatePolyrhythmLayer(selectedPolyrhythmLayer.id, 1)}>
                                <ChevronRight size={14} />
                              </StudyShellButton>
                              <StudyShellButton size="compact" tone="amber" highlighted onClick={() => handleInvertPolyrhythmLayerSteps(selectedPolyrhythmLayer.id)}>
                                Invert
                              </StudyShellButton>
                              <StudyShellButton size="compact" tone="red" highlighted onClick={() => handleClearPolyrhythmLayer(selectedPolyrhythmLayer.id)}>
                                Clear
                              </StudyShellButton>
                            </div>
                            {selectedPolyrhythmStep?.layerId === selectedPolyrhythmLayer.id ? (
                              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                                  Step {selectedPolyrhythmStep.stepIndex + 1}
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <StudyShellButton
                                    size="compact"
                                    highlighted={!selectedPolyrhythmStepActive}
                                    onClick={() => {
                                      if (selectedPolyrhythmStepActive) {
                                        handleTogglePolyrhythmLayerStep(selectedPolyrhythmLayer.id, selectedPolyrhythmStep.stepIndex);
                                      }
                                    }}
                                  >
                                    Off
                                  </StudyShellButton>
                                  <StudyShellButton
                                    size="compact"
                                    tone="green"
                                    highlighted={Boolean(selectedPolyrhythmStepActive)}
                                    onClick={() => {
                                      if (!selectedPolyrhythmStepActive) {
                                        handleTogglePolyrhythmLayerStep(selectedPolyrhythmLayer.id, selectedPolyrhythmStep.stepIndex);
                                      }
                                    }}
                                  >
                                    On
                                  </StudyShellButton>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-white/42">Tap a ring step on the canvas to edit it here.</div>
                            )}
                            <StudyShellButton
                              tone="blue"
                              highlighted
                              onClick={() => {
                                setPolyrhythmMobileEditTab('shape');
                                setPolyrhythmMobileEditorOpen(true);
                              }}
                              className="w-full"
                            >
                              Open Editor
                            </StudyShellButton>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div
                data-guide="study-mobile-audio"
                className="rounded-[28px] border"
                style={{
                  order: 4,
                  background:
                    polyrhythmMobileSection === 'audio'
                      ? 'linear-gradient(180deg, rgba(17,17,22,0.96), rgba(17,17,22,0.9))'
                      : 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.86))',
                  borderColor:
                    polyrhythmMobileSection === 'audio'
                      ? 'rgba(0,255,170,0.18)'
                      : 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setPolyrhythmMobileSection((current) => (current === 'audio' ? null : 'audio'))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: polyrhythmMobileSection === 'audio' ? '#00FFAA' : 'rgba(255,255,255,0.5)' }}>
                      Audio
                    </div>
                    <div className="mt-1 text-[12px]" style={{ color: polyrhythmMobileSection === 'audio' ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.42)' }}>
                      {polyrhythmAudioSummary} · {polyrhythmSoundSummary}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {([
                        ['free', 'Original'],
                        ['keyed', 'Keyed'],
                      ] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleUpdatePolyrhythmSoundSettings({
                              pitchMode: mode as PolyrhythmSoundSettings['pitchMode'],
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em]"
                          style={{
                            background:
                              polyrhythmStudy.soundSettings.pitchMode === mode
                                ? 'rgba(0,255,170,0.14)'
                                : 'transparent',
                            color:
                              polyrhythmStudy.soundSettings.pitchMode === mode
                                ? '#00FFAA'
                                : 'rgba(255,255,255,0.5)',
                            boxShadow:
                              polyrhythmStudy.soundSettings.pitchMode === mode
                                ? '0 0 0 1px rgba(0,255,170,0.22) inset'
                                : 'none',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPolyrhythmMobileSection((current) => (current === 'audio' ? null : 'audio'))}
                      className="h-10 min-w-10 rounded-xl flex items-center justify-center px-2.5 shrink-0 active:scale-[0.97]"
                      style={{
                        ...mobileChevronButtonBaseStyle,
                        background: polyrhythmMobileSection === 'audio' ? 'rgba(0,255,170,0.1)' : mobileChevronButtonBaseStyle.background,
                        border: polyrhythmMobileSection === 'audio' ? '1px solid rgba(0,255,170,0.2)' : mobileChevronButtonBaseStyle.border,
                        color: polyrhythmMobileSection === 'audio' ? '#00FFAA' : mobileChevronButtonBaseStyle.color,
                      }}
                      aria-label={polyrhythmMobileSection === 'audio' ? 'Collapse audio' : 'Expand audio'}
                    >
                      {polyrhythmMobileSection === 'audio' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {polyrhythmMobileSection === 'audio' ? (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="space-y-2">
                      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Audio</div>
                      <div className="grid grid-cols-3 gap-2">
                        <StudyShellButton size="compact" tone="blue" highlighted={polyrhythmSoundFocus === 'layer'} onClick={() => handleSetPolyrhythmSoundFocus('layer')}>
                          Solo
                        </StudyShellButton>
                        <StudyShellButton size="compact" tone="blue" highlighted={polyrhythmSoundFocus === 'stack'} onClick={() => handleSetPolyrhythmSoundFocus('stack')}>
                          All
                        </StudyShellButton>
                        <StudyShellButton size="compact" tone="blue" highlighted={polyrhythmSoundFocus === 'mute'} onClick={() => handleSetPolyrhythmSoundFocus('mute')}>
                          Mute
                        </StudyShellButton>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Sound</div>
                      <div className="grid grid-cols-2 gap-2">
                        <StudyShellButton size="compact" tone="green" highlighted={polyrhythmStudy.soundSettings.pitchMode === 'free'} onClick={() => handleUpdatePolyrhythmSoundSettings({ pitchMode: 'free' })}>
                          Original
                        </StudyShellButton>
                        <StudyShellButton size="compact" tone="green" highlighted={polyrhythmStudy.soundSettings.pitchMode === 'keyed'} onClick={() => handleUpdatePolyrhythmSoundSettings({ pitchMode: 'keyed' })}>
                          Keyed
                        </StudyShellButton>
                      </div>
                      <select
                        value={polyrhythmStudy.soundSettings.palette}
                        onChange={(event) => handleUpdatePolyrhythmSoundSettings({ palette: event.target.value as PolyrhythmSoundSettings['palette'] })}
                        className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[12px] font-mono uppercase tracking-[0.12em] text-white outline-none"
                      >
                        {[
                          ['study-pulse', 'Study Pulse'],
                          ['glass-tick', 'Glass Tick'],
                          ['wood', 'Wood'],
                          ['soft-synth', 'Soft Synth'],
                          ['bright-marker', 'Bright Marker'],
                        ].map(([id, label]) => (
                          <option key={id} value={id} style={{ background: '#181820' }}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <StudyShellButton size="compact" tone="amber" highlighted={polyrhythmStudy.soundSettings.register === 'tight'} onClick={() => handleUpdatePolyrhythmSoundSettings({ register: 'tight' })}>
                          Tight
                        </StudyShellButton>
                        <StudyShellButton size="compact" tone="amber" highlighted={polyrhythmStudy.soundSettings.register === 'wide'} onClick={() => handleUpdatePolyrhythmSoundSettings({ register: 'wide' })}>
                          Wide
                        </StudyShellButton>
                      </div>
                      {polyrhythmStudy.soundSettings.pitchMode === 'keyed' ? (
                        <div className="grid grid-cols-[82px,1fr] gap-2">
                          <select
                            value={polyrhythmStudy.soundSettings.rootNote}
                            onChange={(event) => handleUpdatePolyrhythmSoundSettings({ rootNote: event.target.value as RootNote })}
                            className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[12px] font-mono uppercase tracking-[0.12em] text-white outline-none"
                          >
                            {NOTE_NAMES.map((note) => (
                              <option key={note} value={note} style={{ background: '#181820' }}>
                                {note}
                              </option>
                            ))}
                          </select>
                          <select
                            value={polyrhythmStudy.soundSettings.scaleName}
                            onChange={(event) => handleUpdatePolyrhythmSoundSettings({ scaleName: event.target.value as ScaleName })}
                            className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[12px] font-mono uppercase tracking-[0.12em] text-white outline-none"
                          >
                            {Object.entries(SCALE_PRESETS).map(([name, scale]) => (
                              <option key={name} value={name} style={{ background: '#181820' }}>
                                {scale.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">View</div>
                      <div className="grid grid-cols-2 gap-2">
                        <StudyShellButton size="compact" tone="blue" highlighted={polyrhythmStudy.showInactiveSteps} onClick={handleTogglePolyrhythmInactiveSteps}>
                          Faint
                        </StudyShellButton>
                        <StudyShellButton size="compact" tone="amber" highlighted={Boolean(polyrhythmStudy.showStepLabels)} onClick={handleTogglePolyrhythmStepLabels}>
                          Labels
                        </StudyShellButton>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                data-guide="study-mobile-scenes"
                className="rounded-[28px] border"
                style={{
                  order: 3,
                  background:
                    polyrhythmMobileSection === 'scenes'
                      ? 'linear-gradient(180deg, rgba(17,17,22,0.96), rgba(17,17,22,0.9))'
                      : 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.86))',
                  borderColor:
                    polyrhythmMobileSection === 'scenes'
                      ? 'rgba(51,136,255,0.18)'
                      : 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setPolyrhythmMobileSection((current) => (current === 'scenes' ? null : 'scenes'))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: polyrhythmMobileSection === 'scenes' ? '#88CCFF' : 'rgba(255,255,255,0.5)' }}>
                      Scenes
                    </div>
                    <div className="mt-1 text-[12px]" style={{ color: polyrhythmMobileSection === 'scenes' ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.42)' }}>
                      {activePolyrhythmPreset?.name ?? 'Custom Study'}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRandomPolyrhythmStudy();
                      }}
                      className="px-2.5 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{ color: '#88CCFF', background: 'rgba(51,136,255,0.12)', border: '1px solid rgba(51,136,255,0.22)' }}
                    >
                      Random
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemixPolyrhythmStudy();
                      }}
                      className="px-2.5 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{ color: '#B6A0FF', background: 'rgba(182,160,255,0.12)', border: '1px solid rgba(182,160,255,0.22)' }}
                    >
                      Remix
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRandomPlusPolyrhythmStudy();
                      }}
                      className="px-2.5 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{ color: '#FFAA00', background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.22)' }}
                    >
                      Random+
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolyrhythmMobileSection((current) => (current === 'scenes' ? null : 'scenes'))}
                      className="h-10 min-w-10 rounded-xl flex items-center justify-center px-2.5 shrink-0 active:scale-[0.97]"
                      style={{
                        ...mobileChevronButtonBaseStyle,
                        background: polyrhythmMobileSection === 'scenes' ? 'rgba(51,136,255,0.12)' : mobileChevronButtonBaseStyle.background,
                        border: polyrhythmMobileSection === 'scenes' ? '1px solid rgba(51,136,255,0.22)' : mobileChevronButtonBaseStyle.border,
                        color: polyrhythmMobileSection === 'scenes' ? '#88CCFF' : mobileChevronButtonBaseStyle.color,
                      }}
                      aria-label={polyrhythmMobileSection === 'scenes' ? 'Collapse scenes' : 'Expand scenes'}
                    >
                      {polyrhythmMobileSection === 'scenes' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {polyrhythmMobileSection === 'scenes' ? (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2 rounded-2xl border p-1" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                      {([
                        { key: 'standard', label: 'Standard', color: '#88CCFF' },
                        { key: 'saved', label: 'Saved', color: '#00FFAA' },
                        { key: 'pro', label: 'Pro', color: '#FFAA00' },
                      ] as const).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setPolyrhythmMobileSceneTab(tab.key)}
                          className="flex-1 rounded-xl px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                          style={{
                            background: polyrhythmMobileSceneTab === tab.key ? `${tab.color}14` : 'transparent',
                            border: `1px solid ${polyrhythmMobileSceneTab === tab.key ? `${tab.color}45` : 'transparent'}`,
                            color: polyrhythmMobileSceneTab === tab.key ? tab.color : 'rgba(255,255,255,0.48)',
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {polyrhythmMobileSceneTab === 'standard' ? (
                      <>
                        <div className="flex items-center gap-2 rounded-2xl border p-1" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                          {groupedPolyrhythmPresets.map(({ group }) => (
                            <button
                              key={group}
                              type="button"
                              onClick={() => setPolyrhythmMobileSceneGroup(group)}
                              className="flex-1 rounded-xl px-2.5 py-2 text-[10px] font-mono uppercase tracking-[0.13em]"
                              style={{
                                background:
                                  polyrhythmMobileSceneGroup === group
                                    ? 'rgba(114,241,184,0.12)'
                                    : 'transparent',
                                border: `1px solid ${polyrhythmMobileSceneGroup === group ? 'rgba(114,241,184,0.24)' : 'transparent'}`,
                                color:
                                  polyrhythmMobileSceneGroup === group
                                    ? '#72F1B8'
                                    : 'rgba(255,255,255,0.48)',
                              }}
                            >
                              {POLYRHYTHM_PRESET_GROUP_META[group].label}
                            </button>
                          ))}
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5">
                          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/56">
                            {POLYRHYTHM_PRESET_GROUP_META[polyrhythmMobileSceneGroup].label}
                          </div>
                          <div className="mt-1 text-[11px] text-white/42">
                            {POLYRHYTHM_PRESET_GROUP_META[polyrhythmMobileSceneGroup].description}
                          </div>
                        </div>

                        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none]">
                          <div className="flex gap-3 px-1 snap-x snap-mandatory">
                            {filteredPolyrhythmMobilePresets.map((preset) => {
                              const active = preset.id === activePolyrhythmPresetId;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => handleLoadPolyrhythmPreset(preset.id)}
                                  className="min-w-[178px] max-w-[178px] snap-start overflow-hidden rounded-2xl border p-3 text-left"
                                  style={{
                                    background: active
                                      ? 'linear-gradient(180deg, rgba(114,241,184,0.08), rgba(255,255,255,0.03))'
                                      : 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.028))',
                                    borderColor: active ? 'rgba(114,241,184,0.22)' : 'rgba(255,255,255,0.1)',
                                  }}
                                >
                                  <PolyrhythmSceneThumbnail preset={preset} className="h-24 w-full" />
                                  <div className="mt-3 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div
                                        className="text-[11px] font-mono uppercase tracking-[0.16em]"
                                        style={{ color: active ? '#72F1B8' : 'rgba(255,255,255,0.84)' }}
                                      >
                                        {preset.name}
                                      </div>
                                      <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/34">
                                        {preset.study.displayStyle === 'shared' ? 'Shared' : 'Nested'} · {preset.study.layers.length}L
                                      </div>
                                    </div>
                                    {active ? (
                                      <span className="rounded-lg border border-[#72F1B8]/30 bg-[#72F1B8]/12 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-[#72F1B8]">
                                        Loaded
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 text-[10px] leading-relaxed text-white/42">
                                    {preset.description}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : null}

                    {polyrhythmMobileSceneTab === 'saved' ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4 text-center">
                        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/56">No Saved Scenes Yet</div>
                        <div className="mt-2 text-[11px] text-white/42">
                          Save slots for Study scenes are not wired yet.
                        </div>
                      </div>
                    ) : null}

                    {polyrhythmMobileSceneTab === 'pro' ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4 text-center">
                        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/56">Pro Packs</div>
                        <div className="mt-2 text-[11px] text-white/42">
                          More Study scene packs are coming.
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <StudyShellButton tone="amber" highlighted onClick={() => handleExportPolyrhythmPng({ aspect: 'square', scale: 2 })} className="w-full">
                        Export PNG
                      </StudyShellButton>
                      <StudyShellButton tone="neutral" highlighted onClick={handleExportPolyrhythmScene} className="w-full">
                        Export Study
                      </StudyShellButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {polyrhythmMobileEditorOpen ? (
            <div className="fixed inset-0 z-40 bg-[#111116]">
              <div
                className="flex h-full flex-col px-4"
                style={{
                  paddingTop: 'max(env(safe-area-inset-top), 0.75rem)',
                  paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-[11px] font-mono uppercase tracking-[0.22em]"
                      style={{ color: selectedPolyrhythmLayer?.color ?? '#7FD7FF' }}
                    >
                      Study Editor
                    </div>
                    <div className="mt-1 text-[12px] text-white/46">
                      {polyrhythmEditorHint}
                    </div>
                  </div>
                  <StudyShellButton
                    size="compact"
                    tone="neutral"
                    highlighted
                    onClick={() => setPolyrhythmMobileEditorOpen(false)}
                  >
                    Done
                  </StudyShellButton>
                </div>

                <div className="-mx-1 mb-3 overflow-x-auto pb-1 [scrollbar-width:none]">
                  <div className="flex gap-2 px-1">
                    {polyrhythmStudy.layers.map((layer, index) => {
                      const active = layer.id === selectedPolyrhythmLayer?.id;
                      return (
                        <StudyShellButton
                          key={layer.id}
                          size="compact"
                          tone="neutral"
                          highlighted={active}
                          onClick={() => {
                            handleSelectPolyrhythmLayer(layer.id);
                            setSelectedPolyrhythmStep(null);
                          }}
                          style={
                            active
                              ? {
                                  background: `${layer.color}16`,
                                  borderColor: `${layer.color}44`,
                                  color: layer.color,
                                  boxShadow: `0 0 0 1px ${layer.color}22 inset`,
                                }
                              : undefined
                          }
                        >
                          L{index + 1}
                        </StudyShellButton>
                      );
                    })}
                  </div>
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-[#12131a]">
                  <PolyrhythmCanvas
                    study={polyrhythmStudy}
                    restartToken={polyrhythmRestartToken}
                    selectedLayerId={selectedPolyrhythmLayer?.id ?? null}
                    selectedStep={selectedPolyrhythmStep}
                    displayLayerId={selectedPolyrhythmLayer?.id ?? null}
                    soloLayerDisplay
                    onSelectLayer={handleSelectPolyrhythmLayer}
                    onSelectStep={handleSelectPolyrhythmStep}
                    onToggleStep={handleTogglePolyrhythmLayerStep}
                    onClearSelection={handleClearPolyrhythmSelection}
                    className="absolute inset-0 h-full w-full"
                  />
                </div>

                <StudyShellPanel className="mt-3 space-y-3">
                  <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/[0.03] p-1">
                    {([
                      ['layer', 'Layer'],
                      ['shape', 'Mask'],
                    ] as const).map(([tabId, label]) => {
                      const active = polyrhythmMobileEditorTab === tabId;
                      return (
                        <button
                          key={tabId}
                          type="button"
                          onClick={() => setPolyrhythmMobileEditTab(tabId)}
                          className="flex-1 rounded-lg px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em]"
                          style={{
                            background: active ? `${selectedPolyrhythmLayer?.color ?? '#7FD7FF'}16` : 'transparent',
                            color: active ? selectedPolyrhythmLayer?.color ?? '#7FD7FF' : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {polyrhythmMobileEditorTab === 'layer' ? (
                    selectedPolyrhythmLayer ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">
                            <span>Steps</span>
                            <span>{countActiveSteps(selectedPolyrhythmLayer)} On</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StudyShellButton
                              size="square"
                              onClick={() =>
                                handleSetPolyrhythmLayerBeatCount(
                                  selectedPolyrhythmLayer.id,
                                  selectedPolyrhythmLayer.beatCount - 1,
                                )
                              }
                            >
                              <Minus size={14} />
                            </StudyShellButton>
                            <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-center text-[14px] font-light text-white">
                              {selectedPolyrhythmLayer.beatCount}
                            </div>
                            <StudyShellButton
                              size="square"
                              onClick={() =>
                                handleSetPolyrhythmLayerBeatCount(
                                  selectedPolyrhythmLayer.id,
                                  selectedPolyrhythmLayer.beatCount + 1,
                                )
                              }
                            >
                              <Plus size={14} />
                            </StudyShellButton>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Color</div>
                          <div className="grid grid-cols-6 gap-2">
                            {POLYRHYTHM_LAYER_COLORS.slice(0, 12).map((color) => {
                              const active = selectedPolyrhythmLayer.color === color;
                              return (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() =>
                                    handleUpdatePolyrhythmLayer(selectedPolyrhythmLayer.id, {
                                      color,
                                    })
                                  }
                                  className="h-9 rounded-lg border transition-transform active:scale-[0.97]"
                                  style={{
                                    background: `${color}18`,
                                    borderColor: active ? `${color}aa` : `${color}44`,
                                    boxShadow: active ? `0 0 0 1px ${color}aa inset` : 'none',
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null
                  ) : selectedPolyrhythmLayer ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <StudyShellButton
                          size="compact"
                          onClick={() => handleRotatePolyrhythmLayer(selectedPolyrhythmLayer.id, -1)}
                        >
                          <ChevronLeft size={14} />
                        </StudyShellButton>
                        <StudyShellButton
                          size="compact"
                          onClick={() => handleRotatePolyrhythmLayer(selectedPolyrhythmLayer.id, 1)}
                        >
                          <ChevronRight size={14} />
                        </StudyShellButton>
                        <StudyShellButton
                          size="compact"
                          tone="amber"
                          highlighted
                          onClick={() => handleInvertPolyrhythmLayerSteps(selectedPolyrhythmLayer.id)}
                        >
                          Invert
                        </StudyShellButton>
                        <StudyShellButton
                          size="compact"
                          tone="red"
                          highlighted
                          onClick={() => handleClearPolyrhythmLayer(selectedPolyrhythmLayer.id)}
                        >
                          Clear
                        </StudyShellButton>
                      </div>

                      {selectedPolyrhythmStep?.layerId === selectedPolyrhythmLayer.id ? (
                        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                            Step {selectedPolyrhythmStep.stepIndex + 1}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <StudyShellButton
                              size="compact"
                              highlighted={!selectedPolyrhythmStepActive}
                              onClick={() => {
                                if (selectedPolyrhythmStepActive) {
                                  handleTogglePolyrhythmLayerStep(
                                    selectedPolyrhythmLayer.id,
                                    selectedPolyrhythmStep.stepIndex,
                                  );
                                }
                              }}
                            >
                              Off
                            </StudyShellButton>
                            <StudyShellButton
                              size="compact"
                              tone="green"
                              highlighted={Boolean(selectedPolyrhythmStepActive)}
                              onClick={() => {
                                if (!selectedPolyrhythmStepActive) {
                                  handleTogglePolyrhythmLayerStep(
                                    selectedPolyrhythmLayer.id,
                                    selectedPolyrhythmStep.stepIndex,
                                  );
                                }
                              }}
                            >
                              On
                            </StudyShellButton>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-white/42">
                          Tap a ring step above to edit it here.
                        </div>
                      )}
                    </div>
                  ) : null}
                </StudyShellPanel>
              </div>
            </div>
          ) : null}

          {appSurfaceToggle}

          {helpOpen && currentGuideStep ? (
            <>
              <div className="fixed inset-0 z-30 bg-black/42" onClick={closeStartGuide} />
              {guideRect ? (
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
              ) : null}
              <div ref={guideCalloutRef} className="fixed z-40 left-3 right-3 rounded-2xl border p-4" style={guideCalloutStyle}>
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
              </div>
            </>
          ) : null}

          <PolyrhythmSidebar
            isOpen={sidebarOpen}
            study={polyrhythmStudy}
            currentSurface={appSurface}
            activePresetId={activePolyrhythmPresetId}
            selectedLayerId={selectedPolyrhythmLayer?.id ?? null}
            selectedStep={selectedPolyrhythmStep}
            onClose={() => setSidebarOpen(false)}
            onSurfaceChange={handleAppSurfaceChange}
            onLoadPreset={handleLoadPolyrhythmPreset}
            onResetStudy={handleResetPolyrhythmStudy}
            onTogglePlay={handleTogglePolyrhythmPlayback}
            onBpmChange={handlePolyrhythmBpmChange}
            onToggleStudySound={handleTogglePolyrhythmSound}
            onUpdateSoundSettings={handleUpdatePolyrhythmSoundSettings}
            onSetSoundFocus={handleSetPolyrhythmSoundFocus}
            onToggleInactiveSteps={handleTogglePolyrhythmInactiveSteps}
            onToggleStepLabels={handleTogglePolyrhythmStepLabels}
            onAddLayer={handleAddPolyrhythmLayer}
            onSelectLayer={handleSelectPolyrhythmLayer}
            onSelectStep={handleSelectPolyrhythmStep}
            onRemoveLayer={handleRemovePolyrhythmLayer}
            onRotateLayer={handleRotatePolyrhythmLayer}
            onInvertLayerSteps={handleInvertPolyrhythmLayerSteps}
            onClearLayer={handleClearPolyrhythmLayer}
            onUpdateLayer={handleUpdatePolyrhythmLayer}
            onSetLayerBeatCount={handleSetPolyrhythmLayerBeatCount}
            onToggleLayerStep={handleTogglePolyrhythmLayerStep}
            onExportPng={handleExportPolyrhythmPng}
            onExportScene={handleExportPolyrhythmScene}
          />
        </div>
      );
    }

    return (
      <div
        className={
          isMobile
            ? 'relative min-h-[100svh] overflow-hidden bg-[#111116] select-none'
            : 'fixed inset-0 overflow-hidden bg-[#111116] select-none'
        }
      >
        <PolyrhythmCanvas
          study={polyrhythmStudy}
          restartToken={polyrhythmRestartToken}
          selectedLayerId={selectedPolyrhythmLayer?.id ?? null}
          selectedStep={selectedPolyrhythmStep}
          externalCanvasRef={canvasRef}
          onSelectLayer={handleSelectPolyrhythmLayer}
          onSelectStep={handleSelectPolyrhythmStep}
          onToggleStep={handleTogglePolyrhythmLayerStep}
          onClearSelection={handleClearPolyrhythmSelection}
        />
        <div className="pointer-events-none fixed inset-x-0 top-0 h-40 bg-gradient-to-b from-black/35 via-black/12 to-transparent" />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#111116] via-[#111116]/90 to-transparent" />

        {!presentationMode ? appSurfaceToggle : null}
        {!presentationMode ? (
        <div data-guide="study-desktop-quick" className="fixed z-20 left-6 top-20 w-[16.75rem]">
          <StudyShellPanel className="space-y-2">
            <div className="px-0.5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/42">
                Quick Edit
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['layer', 'Layer'],
                ['stack', 'Stack'],
                ['shape', 'Mask'],
              ] as const).map(([panelId, label]) => {
                const active = polyrhythmQuickPanel === panelId;
                return (
                  <button
                    key={panelId}
                    type="button"
                    data-guide={panelId === 'layer' ? 'study-quick-layer' : panelId === 'stack' ? 'study-quick-stack' : 'study-quick-shape'}
                    onClick={() => setPolyrhythmQuickPanel((current) => (current === panelId ? current : panelId))}
                    className="flex items-center justify-center rounded-xl border px-3 py-2.5 text-center transition-all"
                    style={{
                      background: active ? `${selectedPolyrhythmLayer?.color ?? '#72F1B8'}14` : 'rgba(255,255,255,0.03)',
                      borderColor: active ? `${selectedPolyrhythmLayer?.color ?? '#72F1B8'}34` : 'rgba(255,255,255,0.08)',
                      color: active ? selectedPolyrhythmLayer?.color ?? '#72F1B8' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              {polyrhythmQuickPanel === 'layer' ? (
                <div className="space-y-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">Layer</div>
                  <div className="flex flex-wrap gap-2">
                    {polyrhythmStudy.layers.map((layer, index) => {
                      const active = layer.id === selectedPolyrhythmLayer?.id;
                      return (
                        <StudyShellButton
                          key={layer.id}
                          size="compact"
                          tone="neutral"
                          highlighted={active}
                          onClick={() => {
                            handleSelectPolyrhythmLayer(layer.id);
                            setSelectedPolyrhythmStep(null);
                          }}
                          style={
                            active
                              ? {
                                  background: `${layer.color}16`,
                                  borderColor: `${layer.color}44`,
                                  color: layer.color,
                                  boxShadow: `0 0 0 1px ${layer.color}22 inset`,
                                }
                              : undefined
                          }
                        >
                          L{index + 1}
                        </StudyShellButton>
                      );
                    })}
                  </div>
                  {selectedPolyrhythmLayer ? (
                    <div className="space-y-2">
                      <div className="text-[10px] text-white/44">{polyrhythmLayerSummary}</div>
                      <div className="flex items-center gap-2">
                        <StudyShellButton size="square" onClick={() => handleSetPolyrhythmLayerBeatCount(selectedPolyrhythmLayer.id, selectedPolyrhythmLayer.beatCount - 1)}>
                          <Minus size={14} />
                        </StudyShellButton>
                        <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-center text-[14px] font-light text-white">
                          {selectedPolyrhythmLayer.beatCount}
                        </div>
                        <StudyShellButton size="square" onClick={() => handleSetPolyrhythmLayerBeatCount(selectedPolyrhythmLayer.id, selectedPolyrhythmLayer.beatCount + 1)}>
                          <Plus size={14} />
                        </StudyShellButton>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {polyrhythmQuickPanel === 'stack' ? (
                <div className="space-y-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">Stack</div>
                  <div className="grid grid-cols-2 gap-2">
                    <StudyShellButton tone="blue" highlighted icon={<Plus size={14} />} onClick={handleAddPolyrhythmLayer} className="w-full">
                      Add Ring
                    </StudyShellButton>
                    <StudyShellButton
                      tone="red"
                      highlighted={Boolean(selectedPolyrhythmLayer && polyrhythmStudy.layers.length > 1)}
                      icon={<Trash2 size={14} />}
                      disabled={!selectedPolyrhythmLayer || polyrhythmStudy.layers.length <= 1}
                      onClick={() =>
                        selectedPolyrhythmLayer &&
                        polyrhythmStudy.layers.length > 1 &&
                        handleRemovePolyrhythmLayer(selectedPolyrhythmLayer.id)
                      }
                      className="w-full"
                    >
                      Remove
                    </StudyShellButton>
                  </div>
                  {selectedPolyrhythmLayer ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                        <span>Radius</span>
                        <span>{selectedPolyrhythmLayer.radius}</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="320"
                        step="2"
                        value={selectedPolyrhythmLayer.radius}
                        onChange={(event) =>
                          handleUpdatePolyrhythmLayer(selectedPolyrhythmLayer.id, {
                            radius: parseInt(event.target.value, 10) || 70,
                          })
                        }
                        className="w-full"
                        style={{ accentColor: selectedPolyrhythmLayer.color }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {polyrhythmQuickPanel === 'shape' ? (
                <div className="space-y-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">Mask</div>
                  {selectedPolyrhythmLayer ? (
                    <>
                      <div className="grid grid-cols-4 gap-2">
                        <StudyShellButton size="compact" onClick={() => handleRotatePolyrhythmLayer(selectedPolyrhythmLayer.id, -1)}>
                          <ChevronLeft size={14} />
                        </StudyShellButton>
                        <StudyShellButton size="compact" onClick={() => handleRotatePolyrhythmLayer(selectedPolyrhythmLayer.id, 1)}>
                          <ChevronRight size={14} />
                        </StudyShellButton>
                        <StudyShellButton size="compact" tone="amber" highlighted onClick={() => handleInvertPolyrhythmLayerSteps(selectedPolyrhythmLayer.id)}>
                          Invert
                        </StudyShellButton>
                        <StudyShellButton size="compact" tone="red" highlighted onClick={() => handleClearPolyrhythmLayer(selectedPolyrhythmLayer.id)}>
                          Clear
                        </StudyShellButton>
                      </div>
                      {selectedPolyrhythmStep?.layerId === selectedPolyrhythmLayer.id ? (
                        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                            Step {selectedPolyrhythmStep.stepIndex + 1}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <StudyShellButton
                              size="compact"
                              highlighted={!selectedPolyrhythmStepActive}
                              onClick={() => {
                                if (selectedPolyrhythmStepActive) {
                                  handleTogglePolyrhythmLayerStep(selectedPolyrhythmLayer.id, selectedPolyrhythmStep.stepIndex);
                                }
                              }}
                            >
                              Off
                            </StudyShellButton>
                            <StudyShellButton
                              size="compact"
                              tone="green"
                              highlighted={Boolean(selectedPolyrhythmStepActive)}
                              onClick={() => {
                                if (!selectedPolyrhythmStepActive) {
                                  handleTogglePolyrhythmLayerStep(selectedPolyrhythmLayer.id, selectedPolyrhythmStep.stepIndex);
                                }
                              }}
                            >
                              On
                            </StudyShellButton>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/42">Tap a ring step to edit it here.</div>
                      )}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </StudyShellPanel>
        </div>
        ) : null}

        {!isMobile && !presentationMode ? (
          <div className="fixed right-6 top-20 z-20 w-[18rem]">
            <StudyShellPanel className="space-y-2">
              <div data-guide="study-desktop-audio" className="rounded-xl border border-white/8 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setPolyrhythmUtilityPanel((current) => (current === 'audio' ? null : 'audio'))}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">Audio</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/58">{polyrhythmAudioSummary}</div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/56">
                    {polyrhythmUtilityPanel === 'audio' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {polyrhythmUtilityPanel === 'audio' ? (
                  <div className="border-t border-white/8 px-3 pb-3 pt-2">
                    <div className="grid grid-cols-3 gap-2">
                      <StudyShellButton size="compact" tone="blue" highlighted={polyrhythmSoundFocus === 'layer'} onClick={() => handleSetPolyrhythmSoundFocus('layer')}>
                        Solo
                      </StudyShellButton>
                      <StudyShellButton size="compact" tone="blue" highlighted={polyrhythmSoundFocus === 'stack'} onClick={() => handleSetPolyrhythmSoundFocus('stack')}>
                        All
                      </StudyShellButton>
                      <StudyShellButton size="compact" tone="blue" highlighted={polyrhythmSoundFocus === 'mute'} onClick={() => handleSetPolyrhythmSoundFocus('mute')}>
                        Mute
                      </StudyShellButton>
                    </div>
                  </div>
                ) : null}
              </div>

              <div data-guide="study-desktop-sound" className="rounded-xl border border-white/8 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setPolyrhythmUtilityPanel((current) => (current === 'sound' ? null : 'sound'))}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">Sound</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/58">{polyrhythmSoundSummary}</div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/56">
                    {polyrhythmUtilityPanel === 'sound' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {polyrhythmUtilityPanel === 'sound' ? (
                  <div className="space-y-2 border-t border-white/8 px-3 pb-3 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <StudyShellButton size="compact" tone="green" highlighted={polyrhythmStudy.soundSettings.pitchMode === 'free'} onClick={() => handleUpdatePolyrhythmSoundSettings({ pitchMode: 'free' })}>
                        Original
                      </StudyShellButton>
                      <StudyShellButton size="compact" tone="green" highlighted={polyrhythmStudy.soundSettings.pitchMode === 'keyed'} onClick={() => handleUpdatePolyrhythmSoundSettings({ pitchMode: 'keyed' })}>
                        Keyed
                      </StudyShellButton>
                    </div>
                    <select
                      value={polyrhythmStudy.soundSettings.palette}
                      onChange={(event) => handleUpdatePolyrhythmSoundSettings({ palette: event.target.value as PolyrhythmSoundSettings['palette'] })}
                      className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white outline-none"
                    >
                      <option value="study-pulse" style={{ background: '#181820' }}>Study Pulse</option>
                      <option value="glass-tick" style={{ background: '#181820' }}>Glass Tick</option>
                      <option value="wood" style={{ background: '#181820' }}>Wood</option>
                      <option value="soft-synth" style={{ background: '#181820' }}>Soft Synth</option>
                      <option value="bright-marker" style={{ background: '#181820' }}>Bright Marker</option>
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <StudyShellButton size="compact" tone="amber" highlighted={polyrhythmStudy.soundSettings.register === 'tight'} onClick={() => handleUpdatePolyrhythmSoundSettings({ register: 'tight' })}>
                        Tight
                      </StudyShellButton>
                      <StudyShellButton size="compact" tone="amber" highlighted={polyrhythmStudy.soundSettings.register === 'wide'} onClick={() => handleUpdatePolyrhythmSoundSettings({ register: 'wide' })}>
                        Wide
                      </StudyShellButton>
                    </div>
                    {polyrhythmStudy.soundSettings.pitchMode === 'keyed' ? (
                      <div className="grid grid-cols-[72px,1fr] gap-2">
                        <select
                          value={polyrhythmStudy.soundSettings.rootNote}
                          onChange={(event) => handleUpdatePolyrhythmSoundSettings({ rootNote: event.target.value as RootNote })}
                          className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white outline-none"
                        >
                          {NOTE_NAMES.map((note) => (
                            <option key={note} value={note} style={{ background: '#181820' }}>
                              {note}
                            </option>
                          ))}
                        </select>
                        <select
                          value={polyrhythmStudy.soundSettings.scaleName}
                          onChange={(event) => handleUpdatePolyrhythmSoundSettings({ scaleName: event.target.value as ScaleName })}
                          className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white outline-none"
                        >
                          {Object.entries(SCALE_PRESETS).map(([name, scale]) => (
                            <option key={name} value={name} style={{ background: '#181820' }}>
                              {scale.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div data-guide="study-desktop-view" className="rounded-xl border border-white/8 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setPolyrhythmUtilityPanel((current) => (current === 'view' ? null : 'view'))}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">View</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/58">{polyrhythmViewSummary}</div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/56">
                    {polyrhythmUtilityPanel === 'view' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {polyrhythmUtilityPanel === 'view' ? (
                  <div className="border-t border-white/8 px-3 pb-3 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <StudyShellButton size="compact" tone="blue" highlighted={polyrhythmStudy.showInactiveSteps} onClick={handleTogglePolyrhythmInactiveSteps}>
                        Faint
                      </StudyShellButton>
                      <StudyShellButton size="compact" tone="amber" highlighted={Boolean(polyrhythmStudy.showStepLabels)} onClick={handleTogglePolyrhythmStepLabels}>
                        Labels
                      </StudyShellButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </StudyShellPanel>
          </div>
        ) : null}

        {isMobile && presentationMode ? (
          <div className="fixed z-20 left-5 right-5 bottom-5">
            <StudyShellPanel className="space-y-2.5">
              <div className="flex items-center justify-center gap-2">
                <div className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: `${selectedPolyrhythmLayer?.color ?? '#72F1B8'}12`, borderColor: `${selectedPolyrhythmLayer?.color ?? '#72F1B8'}26`, color: selectedPolyrhythmLayer?.color ?? '#72F1B8' }}>
                  Study
                </div>
                <StudyShellButton size="square" tone={polyrhythmStudy.playing ? 'red' : 'green'} highlighted icon={polyrhythmStudy.playing ? <Pause size={16} /> : <Play size={16} />} onClick={handleTogglePolyrhythmPlayback} />
                <StudyShellButton size="square" tone="amber" highlighted icon={<RotateCcw size={16} />} onClick={handleRestartPolyrhythmTransport} />
                <StudyShellButton size="square" tone="blue" highlighted icon={<Shuffle size={16} />} onClick={handleRandomPolyrhythmStudy} />
                <StudyShellButton
                  size="square"
                  tone="neutral"
                  highlighted
                  icon={<Shuffle size={16} />}
                  onClick={handleRemixPolyrhythmStudy}
                  style={{ background: 'rgba(182,160,255,0.14)', borderColor: 'rgba(182,160,255,0.3)', color: '#B6A0FF', boxShadow: '0 0 0 1px rgba(182,160,255,0.16) inset' }}
                />
                <StudyShellButton size="square" tone="amber" highlighted icon={<Shuffle size={16} />} onClick={handleRandomPlusPolyrhythmStudy} />
              </div>
              <div className="flex items-center justify-center gap-2">
                <StudyShellButton size="compact" tone="blue" highlighted={polyrhythmStudy.showInactiveSteps} onClick={handleTogglePolyrhythmInactiveSteps}>
                  Faint
                </StudyShellButton>
                <StudyShellButton size="compact" tone="amber" highlighted={Boolean(polyrhythmStudy.showStepLabels)} onClick={handleTogglePolyrhythmStepLabels}>
                  Labels
                </StudyShellButton>
                <StudyShellButton size="square" tone="blue" highlighted={polyrhythmStudy.soundEnabled} icon={polyrhythmStudy.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />} onClick={handleTogglePolyrhythmSound} />
                <StudyShellButton size="square" tone="green" highlighted icon={<Maximize2 size={16} />} onClick={handleTogglePresentation} />
              </div>
            </StudyShellPanel>
          </div>
        ) : (
          <div className={`fixed z-20 ${isMobile ? 'left-3 right-3 bottom-6' : 'left-6 right-6 bottom-6'}`}>
            <StudyShellDock className={isMobile ? 'space-y-3' : 'grid grid-cols-[auto_minmax(28rem,1fr)_auto] items-center gap-3'}>
              <div data-guide={isMobile ? 'study-mobile-playback' : 'study-desktop-transport'} className={`flex items-center gap-2 ${isMobile ? 'flex-wrap justify-between' : 'flex-nowrap'}`}>
                <StudyShellButton tone={polyrhythmStudy.playing ? 'red' : 'green'} highlighted icon={polyrhythmStudy.playing ? <Pause size={15} /> : <Play size={15} />} onClick={handleTogglePolyrhythmPlayback}>
                  {polyrhythmStudy.playing ? 'Pause' : 'Play'}
                </StudyShellButton>
                <StudyShellButton tone="amber" highlighted icon={<RotateCcw size={15} />} onClick={handleRestartPolyrhythmTransport}>
                  Restart
                </StudyShellButton>
                <StudyShellButton tone="blue" highlighted icon={<Shuffle size={15} />} onClick={handleRandomPolyrhythmStudy}>
                  Random
                </StudyShellButton>
                <StudyShellButton
                  tone="neutral"
                  highlighted
                  icon={<Shuffle size={15} />}
                  onClick={handleRemixPolyrhythmStudy}
                  style={{ background: 'rgba(182,160,255,0.14)', borderColor: 'rgba(182,160,255,0.3)', color: '#B6A0FF', boxShadow: '0 0 0 1px rgba(182,160,255,0.16) inset' }}
                >
                  Remix
                </StudyShellButton>
                <StudyShellButton tone="amber" highlighted icon={<Shuffle size={15} />} onClick={handleRandomPlusPolyrhythmStudy}>
                  Random+
                </StudyShellButton>
              </div>

              <div data-guide={isMobile ? 'study-mobile-tempo' : 'study-desktop-tempo'} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5">
                <div className="flex items-center gap-4">
                  <div className="min-w-[4.5rem] shrink-0">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">Tempo</div>
                    <div className="mt-1 text-[18px] font-light leading-none text-white">{polyrhythmStudy.bpm}</div>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="180"
                    step="1"
                    value={polyrhythmStudy.bpm}
                    onChange={(event) => handlePolyrhythmBpmChange(parseInt(event.target.value, 10) || polyrhythmStudy.bpm)}
                    onPointerDown={(event) =>
                      handleMobileSliderPointerDown(event, 'study-desktop-tempo', (value) =>
                        handlePolyrhythmBpmChange(Math.round(value)),
                      )
                    }
                    onPointerMove={(event) =>
                      handleMobileSliderPointerMove(event, 'study-desktop-tempo', (value) =>
                        handlePolyrhythmBpmChange(Math.round(value)),
                      )
                    }
                    onPointerUp={() => clearActiveMobileSlider('study-desktop-tempo')}
                    onPointerCancel={() => clearActiveMobileSlider('study-desktop-tempo')}
                    onBlur={() => clearActiveMobileSlider('study-desktop-tempo')}
                    data-dragging={activeMobileSliderId === 'study-desktop-tempo'}
                    className="touch-slider w-full"
                    style={{ ['--slider-accent' as string]: '#ffffff' }}
                    aria-label="Set study tempo"
                  />
                </div>
              </div>

              <div className={`flex items-center gap-2 ${isMobile ? 'justify-between' : 'justify-end'}`}>
                <StudyShellButton tone="blue" highlighted icon={<Plus size={15} />} onClick={handleAddPolyrhythmLayer}>
                  Add Ring
                </StudyShellButton>
                <StudyShellButton
                  tone="blue"
                  highlighted={polyrhythmStudy.soundEnabled}
                  icon={polyrhythmStudy.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  onClick={handleTogglePolyrhythmSound}
                  data-guide={isMobile ? 'study-mobile-audio' : undefined}
                >
                  {polyrhythmStudy.soundEnabled ? 'Audio On' : 'Audio Off'}
                </StudyShellButton>
                <StudyShellButton
                  tone="green"
                  highlighted={presentationMode}
                  icon={<Maximize2 size={15} />}
                  onClick={handleTogglePresentation}
                  data-guide={isMobile ? 'study-mobile-present' : 'study-desktop-present'}
                >
                  Present
                </StudyShellButton>
                <StudyShellButton
                  tone="neutral"
                  highlighted={helpOpen}
                  icon={<CircleHelp size={15} />}
                  onClick={handleToggleHelpGuide}
                >
                  Help
                </StudyShellButton>
                <StudyShellButton
                  size="square"
                  icon={<Menu size={15} />}
                  onClick={() => setSidebarOpen(true)}
                  data-guide={isMobile ? 'study-mobile-menu' : 'study-desktop-menu'}
                  aria-label="Open study menu"
                  title="Open study menu"
                />
              </div>
            </StudyShellDock>
          </div>
        )}

        <PolyrhythmSidebar
          isOpen={sidebarOpen && !presentationMode}
          study={polyrhythmStudy}
          currentSurface={appSurface}
          activePresetId={activePolyrhythmPresetId}
          selectedLayerId={selectedPolyrhythmLayer?.id ?? null}
          selectedStep={selectedPolyrhythmStep}
          onClose={() => setSidebarOpen(false)}
          onSurfaceChange={handleAppSurfaceChange}
          onLoadPreset={handleLoadPolyrhythmPreset}
          onResetStudy={handleResetPolyrhythmStudy}
          onTogglePlay={handleTogglePolyrhythmPlayback}
          onBpmChange={handlePolyrhythmBpmChange}
          onToggleStudySound={handleTogglePolyrhythmSound}
          onUpdateSoundSettings={handleUpdatePolyrhythmSoundSettings}
          onSetSoundFocus={handleSetPolyrhythmSoundFocus}
          onToggleInactiveSteps={handleTogglePolyrhythmInactiveSteps}
          onToggleStepLabels={handleTogglePolyrhythmStepLabels}
          onAddLayer={handleAddPolyrhythmLayer}
          onSelectLayer={handleSelectPolyrhythmLayer}
          onSelectStep={handleSelectPolyrhythmStep}
          onRemoveLayer={handleRemovePolyrhythmLayer}
          onRotateLayer={handleRotatePolyrhythmLayer}
          onInvertLayerSteps={handleInvertPolyrhythmLayerSteps}
          onClearLayer={handleClearPolyrhythmLayer}
          onUpdateLayer={handleUpdatePolyrhythmLayer}
          onSetLayerBeatCount={handleSetPolyrhythmLayerBeatCount}
          onToggleLayerStep={handleTogglePolyrhythmLayerStep}
          onExportPng={handleExportPolyrhythmPng}
          onExportScene={handleExportPolyrhythmScene}
        />
      </div>
    );
  }
  if (!captureMode && appSurface === 'riff-cycle-study') {
    if (isMobile && !presentationMode) {
      const activeRiffPreset =
        RIFF_CYCLE_PRESETS.find((preset) => preset.id === activeRiffCyclePresetId) ?? null;
      const riffMobileCanvasStyle = {
        width: '100%',
        height: 'min(72svh, 620px)',
        minHeight: '460px',
      } as const;
      const riffMobileEditSummary =
        riffMobileEditTab === 'bar'
          ? 'Bar'
          : riffMobileEditTab === 'phrase'
            ? 'Riff'
            : 'Ending';
      const riffMobileEditDetail =
        riffMobileEditTab === 'bar'
          ? `${riffCycleStudy.reference.numerator}/${riffCycleStudy.reference.denominator} · ${riffCycleStudy.reference.barCountForDisplay} bars`
          : riffMobileEditTab === 'phrase'
            ? `${riffCycleStudy.riff.stepCount} step riff`
            : `${riffCycleStudy.landingLength} step return`;
      const riffMobileSoundSummary =
        riffCycleStudy.soundSettings.pitchMode === 'keyed'
          ? `${riffCycleStudy.soundSettings.rootNote} ${SCALE_PRESETS[riffCycleStudy.soundSettings.scaleName].label}`
          : 'Original';
      const riffMobileDisplaySteps = getDisplayStepCount(riffCycleStudy);
      const riffMobileLaneWindowLabel =
        riffMobileLaneBarsPerPage === 'full'
          ? 'All Bars'
          : riffMobileLaneStartBar === riffMobileLaneEndBar
            ? `Bar ${riffMobileLaneStartBar}`
            : `Bars ${riffMobileLaneStartBar}-${riffMobileLaneEndBar}`;
      const riffMobileLanePageLabels = Array.from({ length: riffMobileLanePageCount }, (_, index) => {
        const startBar = index * riffMobileEffectiveBarsPerPage + 1;
        const endBar = Math.min(
          riffCycleStudy.reference.barCountForDisplay,
          startBar + riffMobileEffectiveBarsPerPage - 1,
        );
        return {
          index,
          label: startBar === endBar ? `${startBar}` : `${startBar}-${endBar}`,
        };
      });
      const riffMobileEditorTab = riffMobileEditTab === 'return' ? 'return' : 'phrase';
      const riffMobileEditorActionLabel =
        riffMobileEditorTab === 'phrase' ? 'Clear Pattern' : 'Clear Ending';
      const riffMobileEditorHint =
        riffMobileDisplaySteps > 48
          ? 'Tap hit. Hold accent. Landscape helps on longer phrases.'
          : 'Tap hit. Hold accent.';

      return (
        <div className="min-h-[100svh] overflow-y-auto bg-[#111116] pt-2 pb-7 select-none">
          <div className="space-y-2">
            <div
              className="relative overflow-hidden"
              style={riffMobileCanvasStyle}
            >
              <RiffCycleCanvas
                study={riffCycleStudy}
                viewModeOverride="circular"
                selectedStep={selectedRiffCycleStep}
                restartToken={riffCycleRestartToken}
                externalCanvasRef={canvasRef}
                onSelectStep={handleSelectRiffCycleStep}
                onSetStepActive={handleSetRiffCycleStepActive}
                onToggleAccent={handleToggleRiffCycleAccent}
                onSetLandingStepActive={handleSetRiffLandingStepActive}
                onToggleLandingAccent={handleToggleRiffLandingAccent}
                className="absolute inset-0 h-full w-full"
              />
            </div>

            <div className="px-4 flex flex-col gap-3">
              <div
                data-guide="riff-mobile-transport"
                className="relative z-10 rounded-[28px] border px-4 py-4 space-y-3"
                style={{ background: 'rgba(17,17,22,0.9)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/50">
                    Playback
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      data-guide="riff-mobile-present"
                      onClick={handleTogglePresentation}
                      type="button"
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      aria-label="Presentation mode"
                    >
                      <Maximize2 size={17} />
                    </button>
                    <button
                      onClick={handleToggleHelpGuide}
                      type="button"
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      aria-label={helpOpen ? 'Close help' : 'Open help'}
                    >
                      <CircleHelp size={17} />
                    </button>
                    <button
                      data-guide="riff-mobile-menu"
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

                <div className="grid grid-cols-3 gap-2">
                  <StudyShellButton
                    tone={riffCycleStudy.playing ? 'red' : 'green'}
                    highlighted
                    icon={riffCycleStudy.playing ? <Pause size={16} /> : <Play size={16} />}
                    onClick={handleToggleRiffCyclePlayback}
                    className="w-full"
                  >
                    {riffCycleStudy.playing ? 'Pause' : 'Play'}
                  </StudyShellButton>
                  <StudyShellButton
                    tone="amber"
                    highlighted
                    icon={<RotateCcw size={15} />}
                    onClick={handleResetRiffCycleStudy}
                    className="w-full"
                  >
                    Restart
                  </StudyShellButton>
                  <StudyShellButton
                    tone="blue"
                    highlighted={riffCycleStudy.soundEnabled}
                    icon={riffCycleStudy.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    onClick={handleToggleRiffCycleSound}
                    data-guide="riff-mobile-audio"
                    className="w-full"
                  >
                    Audio
                  </StudyShellButton>
                </div>

                <div data-guide="riff-mobile-tempo" className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/48">
                      Speed
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/36">
                        Offset
                      </span>
                      <StudyShellButton
                        size="square"
                        icon={<ChevronLeft size={15} />}
                        onClick={() => handleRotateRiffCycle(-1)}
                        aria-label="Move phrase back one step"
                      />
                      <StudyShellButton
                        size="square"
                        icon={<ChevronRight size={15} />}
                        onClick={() => handleRotateRiffCycle(1)}
                        aria-label="Move phrase forward one step"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="45"
                      max="220"
                      step="1"
                      value={riffCycleStudy.reference.bpm}
                      onChange={(event) =>
                        handleUpdateRiffReference({
                          bpm: parseInt(event.target.value, 10) || riffCycleStudy.reference.bpm,
                        })
                      }
                      onPointerDown={(event) =>
                        handleMobileSliderPointerDown(event, 'riff-tempo', (value) =>
                          handleUpdateRiffReference({ bpm: Math.round(value) }),
                        )
                      }
                      onPointerMove={(event) =>
                        handleMobileSliderPointerMove(event, 'riff-tempo', (value) =>
                          handleUpdateRiffReference({ bpm: Math.round(value) }),
                        )
                      }
                      onPointerUp={() => clearActiveMobileSlider('riff-tempo')}
                      onPointerCancel={() => clearActiveMobileSlider('riff-tempo')}
                      onBlur={() => clearActiveMobileSlider('riff-tempo')}
                      data-dragging={activeMobileSliderId === 'riff-tempo'}
                      className="touch-slider w-full"
                      style={{ ['--slider-accent' as string]: '#ffffff' }}
                      aria-label="Set riff cycle tempo"
                    />
                    <div className="w-12 shrink-0 text-right">
                      <div className="text-[14px] font-light leading-none text-white">
                        {riffCycleStudy.reference.bpm}
                      </div>
                      <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.14em] text-white/34">
                        BPM
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                data-guide="riff-mobile-edit"
                className="rounded-[28px] border"
                style={{
                  order: 2,
                  background:
                    riffMobileSection === 'edit'
                      ? 'linear-gradient(180deg, rgba(17,17,22,0.96), rgba(17,17,22,0.9))'
                      : 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.86))',
                  borderColor:
                    riffMobileSection === 'edit'
                      ? `${riffCycleStudy.riff.color}24`
                      : 'rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  style={{
                    background:
                      riffMobileSection === 'edit'
                        ? `linear-gradient(180deg, ${riffCycleStudy.riff.color}10, rgba(255,255,255,0))`
                        : 'transparent',
                    boxShadow:
                      riffMobileSection === 'edit'
                        ? `inset 0 1px 0 ${riffCycleStudy.riff.color}14`
                        : 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setRiffMobileSection((current) => (current === 'edit' ? null : 'edit'))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div
                      className="text-[11px] font-mono uppercase tracking-[0.22em]"
                      style={{ color: riffMobileSection === 'edit' ? riffCycleStudy.riff.color : 'rgba(255,255,255,0.5)' }}
                    >
                      Edit
                    </div>
                    <div
                      className="mt-1 text-[12px]"
                      style={{
                        color:
                          riffMobileSection === 'edit'
                            ? 'rgba(255,255,255,0.62)'
                            : 'rgba(255,255,255,0.42)',
                      }}
                    >
                      {riffMobileEditDetail}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <button
                        type="button"
                        data-guide="riff-layer-1"
                        onClick={() => {
                          setRiffMobileEditTab('bar');
                          setRiffMobileSection('edit');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em]"
                        style={{
                          background: riffMobileEditTab === 'bar' ? 'rgba(255,136,194,0.14)' : 'transparent',
                          color: riffMobileEditTab === 'bar' ? '#FF88C2' : 'rgba(255,255,255,0.5)',
                          boxShadow:
                            riffMobileEditTab === 'bar'
                              ? '0 0 0 1px rgba(255,136,194,0.22) inset'
                              : 'none',
                        }}
                      >
                        Bar
                      </button>
                      <button
                        type="button"
                        data-guide="riff-layer-2"
                        onClick={() => {
                          handleSetRiffEditMode('phrase');
                          setRiffMobileEditTab('phrase');
                          setRiffMobileSection('edit');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em]"
                        style={{
                          background: riffMobileEditTab === 'phrase' ? `${riffCycleStudy.riff.color}16` : 'transparent',
                          color: riffMobileEditTab === 'phrase' ? riffCycleStudy.riff.color : 'rgba(255,255,255,0.5)',
                          boxShadow:
                            riffMobileEditTab === 'phrase'
                              ? `0 0 0 1px ${riffCycleStudy.riff.color}2a inset`
                              : 'none',
                        }}
                      >
                        Riff
                      </button>
                      <button
                        type="button"
                        data-guide="riff-ending"
                        onClick={() => {
                          handleSetRiffEditMode('landing');
                          setRiffMobileEditTab('return');
                          setRiffMobileSection('edit');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em]"
                        style={{
                          background: riffMobileEditTab === 'return' ? 'rgba(127,215,255,0.16)' : 'transparent',
                          color: riffMobileEditTab === 'return' ? '#7FD7FF' : 'rgba(255,255,255,0.5)',
                          boxShadow:
                            riffMobileEditTab === 'return'
                              ? '0 0 0 1px rgba(127,215,255,0.24) inset'
                              : 'none',
                        }}
                      >
                        Ending
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRiffMobileSection((current) => (current === 'edit' ? null : 'edit'))}
                      className="h-10 min-w-10 rounded-xl flex items-center justify-center px-2.5 shrink-0 active:scale-[0.97]"
                      style={{
                        ...mobileChevronButtonBaseStyle,
                        background: riffMobileSection === 'edit' ? `${riffCycleStudy.riff.color}14` : mobileChevronButtonBaseStyle.background,
                        border: riffMobileSection === 'edit' ? `1px solid ${riffCycleStudy.riff.color}36` : mobileChevronButtonBaseStyle.border,
                        color: riffMobileSection === 'edit' ? riffCycleStudy.riff.color : mobileChevronButtonBaseStyle.color,
                      }}
                      aria-label={riffMobileSection === 'edit' ? 'Collapse edit' : 'Expand edit'}
                    >
                      {riffMobileSection === 'edit' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {riffMobileSection === 'edit' ? (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {riffMobileEditTab === 'bar' ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Meter</div>
                          <div className="flex items-center gap-2">
                            <StudyShellButton
                              size="square"
                              onClick={() =>
                                handleUpdateRiffReference({
                                  numerator: Math.max(2, riffCycleStudy.reference.numerator - 1),
                                })
                              }
                            >
                              <Minus size={14} />
                            </StudyShellButton>
                            <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-center text-[14px] font-light text-white">
                              {riffCycleStudy.reference.numerator}/{riffCycleStudy.reference.denominator}
                            </div>
                            <StudyShellButton
                              size="square"
                              onClick={() =>
                                handleUpdateRiffReference({
                                  numerator: Math.min(11, riffCycleStudy.reference.numerator + 1),
                                })
                              }
                            >
                              <Plus size={14} />
                            </StudyShellButton>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Bars</div>
                          <div className="flex items-center gap-2">
                            <StudyShellButton
                              size="square"
                              onClick={() =>
                                handleUpdateRiffReference({
                                  barCountForDisplay: Math.max(1, riffCycleStudy.reference.barCountForDisplay - 1),
                                })
                              }
                            >
                              <Minus size={14} />
                            </StudyShellButton>
                            <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-center text-[14px] font-light text-white">
                              {riffCycleStudy.reference.barCountForDisplay}
                            </div>
                            <StudyShellButton
                              size="square"
                              onClick={() =>
                                handleUpdateRiffReference({
                                  barCountForDisplay: Math.min(8, riffCycleStudy.reference.barCountForDisplay + 1),
                                })
                              }
                            >
                              <Plus size={14} />
                            </StudyShellButton>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Grid</div>
                          <div className="grid grid-cols-2 gap-2">
                            {[4, 8].map((value) => (
                              <StudyShellButton
                                key={value}
                                size="compact"
                                highlighted={riffCycleStudy.reference.denominator === value}
                                onClick={() =>
                                  handleUpdateRiffReference({
                                    denominator: value as ReferenceMeter['denominator'],
                                  })
                                }
                              >
                                /{value}
                              </StudyShellButton>
                            ))}
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {[8, 12, 16, 20, 32].map((value) => (
                              <StudyShellButton
                                key={value}
                                size="compact"
                                highlighted={riffCycleStudy.reference.subdivision === value}
                                onClick={() =>
                                  handleUpdateRiffReference({
                                    subdivision: value as ReferenceMeter['subdivision'],
                                  })
                                }
                              >
                                {value}
                              </StudyShellButton>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Backbeat</div>
                          <div className="grid grid-cols-4 gap-2">
                            <StudyShellButton
                              size="compact"
                              tone="pink"
                              highlighted={!riffCycleStudy.reference.showBackbeat}
                              onClick={() => handleUpdateRiffReference({ showBackbeat: false })}
                            >
                              Off
                            </StudyShellButton>
                            {Array.from(
                              { length: Math.max(0, Math.min(6, riffCycleStudy.reference.numerator)) },
                              (_, index) => index + 1,
                            ).map((beat) => (
                              <StudyShellButton
                                key={beat}
                                size="compact"
                                tone="pink"
                                highlighted={
                                  riffCycleStudy.reference.showBackbeat &&
                                  riffCycleStudy.reference.backbeatBeat === beat
                                }
                                onClick={() =>
                                  handleUpdateRiffReference({
                                    showBackbeat: true,
                                    backbeatBeat: beat,
                                  })
                                }
                              >
                                {beat}
                              </StudyShellButton>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {riffMobileEditTab === 'phrase' ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Riff Length</div>
                          <div className="flex items-center gap-2">
                            <StudyShellButton
                              size="square"
                              onClick={() =>
                                handleSetRiffPhraseStepCount(Math.max(3, riffCycleStudy.riff.stepCount - 1))
                              }
                            >
                              <Minus size={14} />
                            </StudyShellButton>
                            <div
                              className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-center text-[14px] font-light"
                              style={{
                                background: `${riffCycleStudy.riff.color}12`,
                                borderColor: `${riffCycleStudy.riff.color}30`,
                                color: riffCycleStudy.riff.color,
                              }}
                            >
                              {riffCycleStudy.riff.stepCount} steps
                            </div>
                            <StudyShellButton
                              size="square"
                              onClick={() =>
                                handleSetRiffPhraseStepCount(Math.min(64, riffCycleStudy.riff.stepCount + 1))
                              }
                            >
                              <Plus size={14} />
                            </StudyShellButton>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Pattern Tools</div>
                          <div className="grid grid-cols-2 gap-2">
                            <StudyShellButton
                              size="compact"
                              onClick={() => handleRotateRiffCycle(-1)}
                            >
                              Back 1
                            </StudyShellButton>
                            <StudyShellButton
                              size="compact"
                              onClick={() => handleRotateRiffCycle(1)}
                            >
                              Fwd 1
                            </StudyShellButton>
                            <StudyShellButton
                              size="compact"
                              tone="amber"
                              highlighted
                              onClick={handleInvertRiffCycle}
                            >
                              Invert
                            </StudyShellButton>
                            <StudyShellButton
                              size="compact"
                              tone="red"
                              highlighted={riffCycleStudy.riff.activeSteps.some(Boolean)}
                              icon={<Trash2 size={13} />}
                              onClick={handleClearRiffCycle}
                            >
                              Clear Pattern
                            </StudyShellButton>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <StudyShellButton
                            tone="blue"
                            highlighted
                            onClick={() => {
                              handleSetRiffEditMode('phrase');
                              setRiffMobileEditorOpen(true);
                            }}
                            className="w-full"
                          >
                            Open Editor
                          </StudyShellButton>
                        </div>
                      </div>
                    ) : null}

                    {riffMobileEditTab === 'return' ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Return</div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: 'free', label: 'Free' },
                              { value: 'per-bar', label: '1 Bar' },
                              { value: 'every-2-bars', label: '2 Bars' },
                              { value: 'every-4-bars', label: '4 Bars' },
                            ].map((option) => (
                              <StudyShellButton
                                key={option.value}
                                size="compact"
                                tone="amber"
                                highlighted={riffCycleStudy.riff.resetMode === option.value}
                                onClick={() =>
                                  handleUpdateRiffPhrase({
                                    resetMode: option.value as RiffPhrase['resetMode'],
                                  })
                                }
                              >
                                {option.label}
                              </StudyShellButton>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <StudyShellButton
                            size="compact"
                            tone="blue"
                            highlighted={riffCycleStudy.landingOverrides.some((value) => value !== 'inherit')}
                            onClick={() => handleMuteLastLandingSteps(1)}
                          >
                            Mute Last
                          </StudyShellButton>
                          <StudyShellButton
                            size="compact"
                            tone="amber"
                            highlighted={riffCycleStudy.landingOverrides.some((value) => value === 'accent')}
                            onClick={() => handleAccentLastLandingSteps(1)}
                          >
                            Accent Last
                          </StudyShellButton>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <StudyShellButton
                            tone="blue"
                            highlighted
                            onClick={() => {
                              handleSetRiffEditMode('landing');
                              setRiffMobileEditorOpen(true);
                            }}
                            className="w-full"
                          >
                            Open Editor
                          </StudyShellButton>
                          <StudyShellButton
                            size="compact"
                            tone="blue"
                            highlighted={riffCycleStudy.landingOverrides.some((value) => value !== 'inherit')}
                            icon={<RotateCcw size={13} />}
                            onClick={handleClearRiffLanding}
                            className="w-full"
                          >
                            Clear Ending
                          </StudyShellButton>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div
                data-guide="riff-mobile-audio"
                className="rounded-[28px] border"
                style={{
                  order: 4,
                  background:
                    riffMobileSection === 'audio'
                      ? 'linear-gradient(180deg, rgba(17,17,22,0.96), rgba(17,17,22,0.9))'
                      : 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.86))',
                  borderColor:
                    riffMobileSection === 'audio'
                      ? 'rgba(0,255,170,0.18)'
                      : 'rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  style={{
                    background:
                      riffMobileSection === 'audio'
                        ? 'linear-gradient(180deg, rgba(0,255,170,0.08), rgba(255,255,255,0))'
                        : 'transparent',
                    boxShadow:
                      riffMobileSection === 'audio'
                        ? 'inset 0 1px 0 rgba(0,255,170,0.08)'
                        : 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setRiffMobileSection((current) => (current === 'audio' ? null : 'audio'))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div
                      className="text-[11px] font-mono uppercase tracking-[0.22em]"
                      style={{ color: riffMobileSection === 'audio' ? '#00FFAA' : 'rgba(255,255,255,0.5)' }}
                    >
                      Audio
                    </div>
                    <div
                      className="mt-1 text-[12px]"
                      style={{
                        color:
                          riffMobileSection === 'audio'
                            ? 'rgba(255,255,255,0.62)'
                            : 'rgba(255,255,255,0.42)',
                      }}
                    >
                      {riffAudioSummary} · {riffMobileSoundSummary}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {([
                        ['free', 'Original'],
                        ['keyed', 'Keyed'],
                      ] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleUpdateRiffSoundSettings({
                              pitchMode: mode as RiffCycleSoundSettings['pitchMode'],
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em]"
                          style={{
                            background:
                              riffCycleStudy.soundSettings.pitchMode === mode
                                ? 'rgba(0,255,170,0.14)'
                                : 'transparent',
                            color:
                              riffCycleStudy.soundSettings.pitchMode === mode
                                ? '#00FFAA'
                                : 'rgba(255,255,255,0.5)',
                            boxShadow:
                              riffCycleStudy.soundSettings.pitchMode === mode
                                ? '0 0 0 1px rgba(0,255,170,0.22) inset'
                                : 'none',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRiffMobileSection((current) => (current === 'audio' ? null : 'audio'))}
                      className="h-10 min-w-10 rounded-xl flex items-center justify-center px-2.5 shrink-0 active:scale-[0.97]"
                      style={{
                        ...mobileChevronButtonBaseStyle,
                        background: riffMobileSection === 'audio' ? 'rgba(0,255,170,0.1)' : mobileChevronButtonBaseStyle.background,
                        border: riffMobileSection === 'audio' ? '1px solid rgba(0,255,170,0.2)' : mobileChevronButtonBaseStyle.border,
                        color: riffMobileSection === 'audio' ? '#00FFAA' : mobileChevronButtonBaseStyle.color,
                      }}
                      aria-label={riffMobileSection === 'audio' ? 'Collapse audio' : 'Expand audio'}
                    >
                      {riffMobileSection === 'audio' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {riffMobileSection === 'audio' ? (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="space-y-2">
                      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Listen</div>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { id: 'bar', label: 'Bar', tone: 'pink' },
                          { id: 'riff', label: 'Riff', tone: 'blue' },
                          { id: 'full', label: 'Both', tone: 'green' },
                        ] as const).map((focus) => (
                          <StudyShellButton
                            key={focus.id}
                            size="compact"
                            tone={focus.tone}
                            highlighted={riffSoundFocus === focus.id}
                            onClick={() => handleSetRiffSoundFocus(focus.id)}
                          >
                            {focus.label}
                          </StudyShellButton>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Pitch</div>
                      <div className="grid grid-cols-2 gap-2">
                        <StudyShellButton
                          size="compact"
                          tone="neutral"
                          highlighted={riffCycleStudy.soundSettings.pitchMode === 'free'}
                          onClick={() => handleUpdateRiffSoundSettings({ pitchMode: 'free' })}
                        >
                          Original
                        </StudyShellButton>
                        <StudyShellButton
                          size="compact"
                          tone="green"
                          highlighted={riffCycleStudy.soundSettings.pitchMode === 'keyed'}
                          onClick={() => handleUpdateRiffSoundSettings({ pitchMode: 'keyed' })}
                        >
                          Keyed
                        </StudyShellButton>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1.1fr,0.9fr] gap-2">
                      <select
                        value={riffCycleStudy.soundSettings.palette}
                        onChange={(event) =>
                          handleUpdateRiffSoundSettings({
                            palette: event.target.value as RiffCycleSoundSettings['palette'],
                          })
                        }
                        className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[12px] font-mono uppercase tracking-[0.12em] text-white outline-none"
                      >
                        <option value="architectural" style={{ background: '#181820' }}>Architectural</option>
                        <option value="deep-architectural" style={{ background: '#181820' }}>Deep Arch</option>
                        <option value="muted-djent" style={{ background: '#181820' }}>Muted Djent</option>
                        <option value="dry-synth" style={{ background: '#181820' }}>Dry Synth</option>
                        <option value="metal-tick" style={{ background: '#181820' }}>Metal Tick</option>
                        <option value="low-pulse" style={{ background: '#181820' }}>Low Pulse</option>
                      </select>
                      <select
                        value={riffCycleStudy.soundSettings.register}
                        onChange={(event) =>
                          handleUpdateRiffSoundSettings({
                            register: event.target.value as RiffCycleSoundSettings['register'],
                          })
                        }
                        className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[12px] font-mono uppercase tracking-[0.12em] text-white outline-none"
                      >
                        <option value="low" style={{ background: '#181820' }}>Low</option>
                        <option value="mid-low" style={{ background: '#181820' }}>Mid-Low</option>
                        <option value="wide" style={{ background: '#181820' }}>Wide</option>
                      </select>
                    </div>

                    {riffCycleStudy.soundSettings.pitchMode === 'keyed' ? (
                      <div className="grid grid-cols-[82px,1fr] gap-2">
                        <select
                          value={riffCycleStudy.soundSettings.rootNote}
                          onChange={(event) =>
                            handleUpdateRiffSoundSettings({
                              rootNote: event.target.value as RiffCycleSoundSettings['rootNote'],
                            })
                          }
                          className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[12px] font-mono uppercase tracking-[0.12em] text-white outline-none"
                        >
                          {NOTE_NAMES.map((note) => (
                            <option key={note} value={note} style={{ background: '#181820' }}>
                              {note}
                            </option>
                          ))}
                        </select>
                        <select
                          value={riffCycleStudy.soundSettings.scaleName}
                          onChange={(event) =>
                            handleUpdateRiffSoundSettings({
                              scaleName: event.target.value as RiffCycleSoundSettings['scaleName'],
                            })
                          }
                          className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[12px] font-mono uppercase tracking-[0.12em] text-white outline-none"
                        >
                          {Object.entries(SCALE_PRESETS).map(([name, scale]) => (
                            <option key={name} value={name} style={{ background: '#181820' }}>
                              {scale.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">View</div>
                      <div className="grid grid-cols-2 gap-2">
                        <StudyShellButton
                          size="compact"
                          tone="blue"
                          highlighted={riffCycleStudy.viewMode === 'unwrapped'}
                          onClick={() => setRiffCycleStudy((current) => ({ ...current, viewMode: 'unwrapped' }))}
                        >
                          Lane
                        </StudyShellButton>
                        <StudyShellButton
                          size="compact"
                          tone="blue"
                          highlighted={riffCycleStudy.viewMode === 'circular'}
                          onClick={() => setRiffCycleStudy((current) => ({ ...current, viewMode: 'circular' }))}
                        >
                          Circle
                        </StudyShellButton>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <StudyShellButton
                          size="compact"
                          tone="amber"
                          highlighted={riffCycleStudy.emphasisMode === 'groove'}
                          onClick={handleToggleRiffEmphasisMode}
                        >
                          Fill
                        </StudyShellButton>
                        <StudyShellButton
                          size="compact"
                          tone="amber"
                          highlighted={Boolean(riffCycleStudy.showStepLabels)}
                          onClick={handleToggleRiffStepLabels}
                        >
                          Labels
                        </StudyShellButton>
                        <StudyShellButton
                          size="compact"
                          tone="green"
                          highlighted={Boolean(riffCycleStudy.showPhraseRing)}
                          onClick={handleToggleRiffPhraseBody}
                        >
                          Shape
                        </StudyShellButton>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                data-guide="riff-mobile-scenes"
                className="rounded-[28px] border"
                style={{
                  order: 3,
                  background:
                    riffMobileSection === 'scenes'
                      ? 'linear-gradient(180deg, rgba(17,17,22,0.96), rgba(17,17,22,0.9))'
                      : 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.86))',
                  borderColor:
                    riffMobileSection === 'scenes'
                      ? 'rgba(51,136,255,0.18)'
                      : 'rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  style={{
                    background:
                      riffMobileSection === 'scenes'
                        ? 'linear-gradient(180deg, rgba(51,136,255,0.09), rgba(255,255,255,0))'
                        : 'transparent',
                    boxShadow:
                      riffMobileSection === 'scenes'
                        ? 'inset 0 1px 0 rgba(51,136,255,0.08)'
                        : 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setRiffMobileSection((current) => (current === 'scenes' ? null : 'scenes'))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div
                      className="text-[11px] font-mono uppercase tracking-[0.22em]"
                      style={{ color: riffMobileSection === 'scenes' ? '#88CCFF' : 'rgba(255,255,255,0.5)' }}
                    >
                      Scenes
                    </div>
                    <div
                      className="mt-1 text-[12px]"
                      style={{
                        color:
                          riffMobileSection === 'scenes'
                            ? 'rgba(255,255,255,0.62)'
                            : 'rgba(255,255,255,0.42)',
                      }}
                    >
                      {activeRiffPreset?.name ?? 'Custom Study'}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRandomRiffCycleStudy();
                      }}
                      className="px-2.5 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{ color: '#88CCFF', background: 'rgba(51,136,255,0.12)', border: '1px solid rgba(51,136,255,0.22)' }}
                    >
                      Random
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemixRiffCycleStudy();
                      }}
                      className="px-2.5 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{ color: '#B6A0FF', background: 'rgba(182,160,255,0.12)', border: '1px solid rgba(182,160,255,0.22)' }}
                    >
                      Remix
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRandomPlusRiffCycleStudy();
                      }}
                      className="px-2.5 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{ color: '#FFAA00', background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.22)' }}
                    >
                      Random+
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiffMobileSection((current) => (current === 'scenes' ? null : 'scenes'))}
                      className="h-10 min-w-10 rounded-xl flex items-center justify-center px-2.5 shrink-0 active:scale-[0.97]"
                      style={{
                        ...mobileChevronButtonBaseStyle,
                        background: riffMobileSection === 'scenes' ? 'rgba(51,136,255,0.12)' : mobileChevronButtonBaseStyle.background,
                        border: riffMobileSection === 'scenes' ? '1px solid rgba(51,136,255,0.22)' : mobileChevronButtonBaseStyle.border,
                        color: riffMobileSection === 'scenes' ? '#88CCFF' : mobileChevronButtonBaseStyle.color,
                      }}
                      aria-label={riffMobileSection === 'scenes' ? 'Collapse scenes' : 'Expand scenes'}
                    >
                      {riffMobileSection === 'scenes' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {riffMobileSection === 'scenes' ? (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2 rounded-2xl border p-1" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                      {([
                        { key: 'standard', label: 'Standard', color: '#88CCFF' },
                        { key: 'saved', label: 'Saved', color: '#00FFAA' },
                        { key: 'pro', label: 'Pro', color: '#FFAA00' },
                      ] as const).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setRiffMobileSceneTab(tab.key)}
                          className="flex-1 rounded-xl px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                          style={{
                            background: riffMobileSceneTab === tab.key ? `${tab.color}14` : 'transparent',
                            border: `1px solid ${riffMobileSceneTab === tab.key ? `${tab.color}45` : 'transparent'}`,
                            color: riffMobileSceneTab === tab.key ? tab.color : 'rgba(255,255,255,0.48)',
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {riffMobileSceneTab === 'standard' ? (
                      <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none]">
                        <div className="flex gap-3 px-1 snap-x snap-mandatory">
                          {RIFF_CYCLE_PRESETS.map((preset) => {
                            const active = activeRiffCyclePresetId === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleLoadRiffCyclePreset(preset.id)}
                                className="min-w-[178px] max-w-[178px] snap-start overflow-hidden rounded-2xl border p-3 text-left"
                                style={{
                                  background: active
                                    ? `${preset.study.riff.color}10`
                                    : 'rgba(255,255,255,0.04)',
                                  borderColor: active
                                    ? `${preset.study.riff.color}34`
                                    : 'rgba(255,255,255,0.09)',
                                }}
                              >
                                <RiffSceneThumbnail preset={preset} className="h-24 w-full" />
                                <div className="mt-3 flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/86">
                                      {preset.name}
                                    </div>
                                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/34">
                                      {preset.study.reference.numerator}/{preset.study.reference.denominator} · {preset.study.riff.stepCount}
                                    </div>
                                  </div>
                                  {active ? (
                                    <span
                                      className="rounded-lg border px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em]"
                                      style={{
                                        borderColor: `${preset.study.riff.color}36`,
                                        background: `${preset.study.riff.color}16`,
                                        color: preset.study.riff.color,
                                      }}
                                    >
                                      Loaded
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-2 text-[10px] leading-relaxed text-white/42">
                                  {preset.description}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {riffMobileSceneTab === 'saved' ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4 text-center">
                        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/56">No Saved Scenes Yet</div>
                        <div className="mt-2 text-[11px] text-white/42">
                          Save slots for Riff scenes are not wired yet.
                        </div>
                      </div>
                    ) : null}

                    {riffMobileSceneTab === 'pro' ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4 text-center">
                        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/56">Pro Packs</div>
                        <div className="mt-2 text-[11px] text-white/42">
                          More Riff scene packs are coming.
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <StudyShellButton
                        tone="amber"
                        highlighted
                        onClick={() => handleExportRiffCyclePng({ aspect: 'square', scale: 2 })}
                        className="w-full"
                      >
                        Export PNG
                      </StudyShellButton>
                      <StudyShellButton
                        tone="neutral"
                        highlighted
                        onClick={handleExportRiffCycleScene}
                        className="w-full"
                      >
                        Export Scene
                      </StudyShellButton>
                    </div>
                  </div>
                ) : null}
              </div>

              {riffMobileEditorOpen ? (
                <div className="fixed inset-0 z-30 bg-[#111116]/98 backdrop-blur-sm">
                  <div className="flex h-full flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/46">
                          Editor
                        </div>
                        <div className="mt-1 text-[13px] text-white/62">
                          {riffMobileEditSummary}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRiffMobileEditorOpen(false)}
                        className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/72"
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
                      >
                        Done
                      </button>
                    </div>

                    <div className="mt-3 text-[11px] text-white/42">
                      {riffMobileEditorHint}
                    </div>

                    <div
                      className="mt-4 flex items-center gap-2 rounded-2xl border p-1.5"
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleSetRiffEditMode('phrase');
                          setRiffMobileEditTab('phrase');
                        }}
                        className="flex-1 rounded-xl px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{
                          background: riffMobileEditorTab === 'phrase' ? `${riffCycleStudy.riff.color}14` : 'transparent',
                          border: `1px solid ${riffMobileEditorTab === 'phrase' ? `${riffCycleStudy.riff.color}42` : 'transparent'}`,
                          color: riffMobileEditorTab === 'phrase' ? riffCycleStudy.riff.color : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        Riff
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSetRiffEditMode('landing');
                          setRiffMobileEditTab('return');
                        }}
                        className="flex-1 rounded-xl px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{
                          background: riffMobileEditorTab === 'return' ? 'rgba(127,215,255,0.14)' : 'transparent',
                          border: `1px solid ${riffMobileEditorTab === 'return' ? 'rgba(127,215,255,0.32)' : 'transparent'}`,
                          color: riffMobileEditorTab === 'return' ? '#7FD7FF' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        Ending
                      </button>
                      <StudyShellButton
                        size="compact"
                        tone={riffMobileEditorTab === 'phrase' ? 'red' : 'blue'}
                        highlighted={
                          riffMobileEditorTab === 'phrase'
                            ? riffCycleStudy.riff.activeSteps.some(Boolean)
                            : riffCycleStudy.landingOverrides.some((value) => value !== 'inherit')
                        }
                        onClick={
                          riffMobileEditorTab === 'phrase'
                            ? handleClearRiffCycle
                            : handleClearRiffLanding
                        }
                        className="shrink-0"
                      >
                        {riffMobileEditorActionLabel}
                      </StudyShellButton>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        {([
                          { value: 1 as const, label: '1 Bar' },
                          { value: 2 as const, label: '2 Bars' },
                          { value: 'full' as const, label: 'Full' },
                        ]).map((option) => (
                          <StudyShellButton
                            key={option.label}
                            size="compact"
                            tone="blue"
                            highlighted={riffMobileLaneBarsPerPage === option.value}
                            onClick={() => {
                              setRiffMobileLaneBarsPerPage(option.value);
                              if (option.value === 'full') {
                                setRiffMobileLanePage(0);
                              }
                            }}
                          >
                            {option.label}
                          </StudyShellButton>
                        ))}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/42">
                        {riffMobileLaneWindowLabel}
                      </div>
                    </div>

                    {riffMobileLaneBarsPerPage !== 'full' && riffMobileLanePageCount > 1 ? (
                      <div className="-mx-0.5 mt-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                        <div className="flex gap-1.5 px-0.5">
                          {riffMobileLanePageLabels.map((page) => (
                            <StudyShellButton
                              key={page.index}
                              size="compact"
                              tone="amber"
                              highlighted={riffMobileLanePage === page.index}
                              onClick={() => setRiffMobileLanePage(page.index)}
                            >
                              {page.label}
                            </StudyShellButton>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div
                      className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[28px] border"
                      style={{ background: 'rgba(17,17,22,0.96)', borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                      <RiffCycleCanvas
                        study={riffCycleStudy}
                        viewModeOverride="unwrapped"
                        laneWindowStartStep={riffMobileLaneStartStep}
                        laneWindowStepCount={riffMobileLaneStepCount}
                        onReferenceStepChange={handleRiffMobileReferenceStepChange}
                        selectedStep={selectedRiffCycleStep}
                        restartToken={riffCycleRestartToken}
                        externalCanvasRef={canvasRef}
                        onSelectStep={handleSelectRiffCycleStep}
                        onSetStepActive={handleSetRiffCycleStepActive}
                        onToggleAccent={handleToggleRiffCycleAccent}
                        onSetLandingStepActive={handleSetRiffLandingStepActive}
                        onToggleLandingAccent={handleToggleRiffLandingAccent}
                        className="absolute inset-0 h-full w-full"
                      />
                    </div>
                  </div>
                </div>
                ) : null}
            </div>
          </div>

          {appSurfaceToggle}

          {helpOpen && currentGuideStep ? (
            <>
              <div
                className="fixed inset-0 z-30 bg-black/42"
                onClick={closeStartGuide}
              />
              {guideRect ? (
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
              ) : null}
              <div
                ref={guideCalloutRef}
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
              </div>
            </>
          ) : null}

        <RiffCycleSidebar
          isOpen={sidebarOpen}
          study={riffCycleStudy}
          currentSurface={appSurface}
          activePresetId={activeRiffCyclePresetId}
          selectedStep={selectedRiffCycleStep}
          onClose={() => setSidebarOpen(false)}
          onSurfaceChange={handleAppSurfaceChange}
          onLoadPreset={handleLoadRiffCyclePreset}
            onResetStudy={handleResetRiffCycleStudy}
            onToggleSound={handleToggleRiffCycleSound}
            onToggleReferenceSound={handleToggleRiffReferenceSound}
            onToggleBackbeatSound={handleToggleRiffBackbeatSound}
            onUpdateSoundSettings={handleUpdateRiffSoundSettings}
            onUpdateReference={handleUpdateRiffReference}
            onUpdateRiff={handleUpdateRiffPhrase}
            onSetRiffStepCount={handleSetRiffPhraseStepCount}
            onToggleStep={handleToggleRiffCycleStep}
            onToggleAccent={handleToggleRiffCycleAccent}
            onSelectStep={handleSelectRiffCycleStep}
            onRotateRiff={handleRotateRiffCycle}
            onInvertRiff={handleInvertRiffCycle}
            onClearRiff={handleClearRiffCycle}
            onToggleViewMode={handleToggleRiffViewMode}
            onToggleAlignmentMarkers={handleToggleRiffAlignmentMarkers}
            onToggleStepLabels={handleToggleRiffStepLabels}
            onTogglePhraseBody={handleToggleRiffPhraseBody}
            onToggleEmphasisMode={handleToggleRiffEmphasisMode}
            onSetEditMode={handleSetRiffEditMode}
            onSetSoundFocus={handleSetRiffSoundFocus}
            onToggleLandingEdit={handleToggleRiffLandingEdit}
            onSetLandingLength={handleSetRiffLandingLength}
            onClearLanding={handleClearRiffLanding}
            onMuteLastLandingHit={() => handleMuteLastLandingSteps(1)}
            onMuteLastTwoLandingHits={() => handleMuteLastLandingSteps(2)}
            onAccentLastLandingHit={() => handleAccentLastLandingSteps(1)}
            onAccentLastTwoLandingHits={() => handleAccentLastLandingSteps(2)}
            onExportPng={handleExportRiffCyclePng}
            onExportScene={handleExportRiffCycleScene}
          />
        </div>
      );
    }

    return (
      <div
        className={
          isMobile
            ? 'relative min-h-[100svh] overflow-hidden bg-[#111116] select-none'
            : 'fixed inset-0 overflow-hidden bg-[#111116] select-none'
        }
      >
        <RiffCycleCanvas
          study={riffCycleStudy}
          viewModeOverride={isMobile && presentationMode ? 'unwrapped' : undefined}
          layoutBottomInset={isMobile && presentationMode ? 96 : 0}
          laneWindowStartStep={isMobile && presentationMode ? riffMobileLaneStartStep : undefined}
          laneWindowStepCount={isMobile && presentationMode ? riffMobileLaneStepCount : undefined}
          onReferenceStepChange={isMobile ? handleRiffMobileReferenceStepChange : undefined}
          selectedStep={selectedRiffCycleStep}
          restartToken={riffCycleRestartToken}
          externalCanvasRef={canvasRef}
          onSelectStep={handleSelectRiffCycleStep}
          onSetStepActive={handleSetRiffCycleStepActive}
          onToggleAccent={handleToggleRiffCycleAccent}
          onSetLandingStepActive={handleSetRiffLandingStepActive}
          onToggleLandingAccent={handleToggleRiffLandingAccent}
        />
        <div className="pointer-events-none fixed inset-x-0 top-0 h-40 bg-gradient-to-b from-black/42 via-black/14 to-transparent" />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#111116] via-[#111116]/92 to-transparent" />
        {!presentationMode ? appSurfaceToggle : null}
        {!presentationMode ? (
        <div
          data-guide={isMobile ? 'riff-mobile-quick' : 'riff-desktop-quick'}
          className={`fixed z-20 ${isMobile ? 'left-3 right-3 top-16' : 'left-6 top-20 w-[16.75rem]'}`}
        >
          <StudyShellPanel className="space-y-2">
            <div className="flex items-center justify-between gap-3 px-0.5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/42">
                Edit Focus
              </div>
              <div
                className="rounded-full border px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em]"
                style={{
                  background:
                    riffQuickFocusLabel === 'Bar'
                      ? 'rgba(255,136,194,0.12)'
                      : riffQuickFocusLabel === 'Ending'
                        ? 'rgba(127,215,255,0.12)'
                        : `${riffCycleStudy.riff.color}12`,
                  borderColor:
                    riffQuickFocusLabel === 'Bar'
                      ? 'rgba(255,136,194,0.22)'
                      : riffQuickFocusLabel === 'Ending'
                        ? 'rgba(127,215,255,0.22)'
                        : `${riffCycleStudy.riff.color}28`,
                  color:
                    riffQuickFocusLabel === 'Bar'
                      ? '#FF88C2'
                      : riffQuickFocusLabel === 'Ending'
                        ? '#7FD7FF'
                        : riffCycleStudy.riff.color,
                }}
              >
                {riffQuickFocusLabel}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRiffQuickPanel((current) => (current === 'bar' ? null : 'bar'))}
                className="flex items-center justify-center rounded-xl border px-3 py-2.5 text-center transition-all"
                style={{
                  background:
                    riffQuickPanel === 'bar'
                      ? 'linear-gradient(180deg, rgba(255,136,194,0.18), rgba(255,136,194,0.08))'
                      : 'rgba(255,255,255,0.03)',
                  borderColor:
                    riffQuickPanel === 'bar' ? 'rgba(255,136,194,0.28)' : 'rgba(255,255,255,0.08)',
                  color: riffQuickPanel === 'bar' ? '#FF88C2' : 'rgba(255,255,255,0.68)',
                  boxShadow:
                    riffQuickPanel === 'bar'
                      ? '0 0 0 1px rgba(255,136,194,0.18) inset, 0 12px 28px rgba(0,0,0,0.22)'
                      : 'none',
                }}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Bar
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSetRiffEditMode('phrase');
                  setRiffQuickPanel((current) => (current === 'phrase' ? null : 'phrase'));
                }}
                className="flex items-center justify-center rounded-xl border px-3 py-2.5 text-center transition-all"
                style={{
                  background:
                    riffQuickPanel === 'phrase' || (riffQuickPanel == null && riffEditMode === 'phrase')
                      ? `${riffCycleStudy.riff.color}12`
                      : 'rgba(255,255,255,0.03)',
                  borderColor:
                    riffQuickPanel === 'phrase' || (riffQuickPanel == null && riffEditMode === 'phrase')
                      ? `${riffCycleStudy.riff.color}36`
                      : 'rgba(255,255,255,0.08)',
                  color:
                    riffQuickPanel === 'phrase' || (riffQuickPanel == null && riffEditMode === 'phrase')
                      ? riffCycleStudy.riff.color
                      : 'rgba(255,255,255,0.68)',
                  boxShadow:
                    riffQuickPanel === 'phrase' || (riffQuickPanel == null && riffEditMode === 'phrase')
                      ? `0 0 0 1px ${riffCycleStudy.riff.color}1f inset, 0 12px 28px rgba(0,0,0,0.22)`
                      : 'none',
                }}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Riff
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSetRiffEditMode('landing');
                  setRiffQuickPanel((current) => (current === 'return' ? null : 'return'));
                }}
                className="flex items-center justify-center rounded-xl border px-3 py-2.5 text-center transition-all"
                style={{
                  background:
                    riffQuickPanel === 'return' || (riffQuickPanel == null && riffEditMode === 'landing')
                      ? 'rgba(127,215,255,0.12)'
                      : 'rgba(255,255,255,0.03)',
                  borderColor:
                    riffQuickPanel === 'return' || (riffQuickPanel == null && riffEditMode === 'landing')
                      ? 'rgba(127,215,255,0.24)'
                      : 'rgba(255,255,255,0.08)',
                  color:
                    riffQuickPanel === 'return' || (riffQuickPanel == null && riffEditMode === 'landing')
                      ? '#7FD7FF'
                      : 'rgba(255,255,255,0.68)',
                  boxShadow:
                    riffQuickPanel === 'return' || (riffQuickPanel == null && riffEditMode === 'landing')
                      ? '0 0 0 1px rgba(127,215,255,0.18) inset, 0 12px 28px rgba(0,0,0,0.22)'
                      : 'none',
                }}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Ending
                </span>
              </button>
            </div>

            {riffQuickPanel === 'bar' ? (
              <div
                data-guide="riff-layer-1"
                className="rounded-xl border border-white/8 bg-white/[0.03] p-2 space-y-2"
              >
                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Meter
                  </div>
                  <div className="flex items-center gap-2">
                    <StudyShellButton
                      size="square"
                      onClick={() =>
                        handleUpdateRiffReference({
                          numerator: Math.max(2, riffCycleStudy.reference.numerator - 1),
                        })
                      }
                      aria-label="Decrease bar numerator"
                    >
                      <Minus size={14} />
                    </StudyShellButton>
                    <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-center text-[14px] font-light text-white">
                      {riffCycleStudy.reference.numerator}/{riffCycleStudy.reference.denominator}
                    </div>
                    <StudyShellButton
                      size="square"
                      onClick={() =>
                        handleUpdateRiffReference({
                          numerator: Math.min(11, riffCycleStudy.reference.numerator + 1),
                        })
                      }
                      aria-label="Increase bar numerator"
                    >
                      <Plus size={14} />
                    </StudyShellButton>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Bars
                  </div>
                  <div className="flex items-center gap-2">
                    <StudyShellButton
                      size="square"
                      onClick={() =>
                        handleUpdateRiffReference({
                          barCountForDisplay: Math.max(1, riffCycleStudy.reference.barCountForDisplay - 1),
                        })
                      }
                      aria-label="Show fewer bars"
                    >
                      <Minus size={14} />
                    </StudyShellButton>
                    <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-center text-[14px] font-light text-white">
                      {riffCycleStudy.reference.barCountForDisplay}
                    </div>
                    <StudyShellButton
                      size="square"
                      onClick={() =>
                        handleUpdateRiffReference({
                          barCountForDisplay: Math.min(8, riffCycleStudy.reference.barCountForDisplay + 1),
                        })
                      }
                      aria-label="Show more bars"
                    >
                      <Plus size={14} />
                    </StudyShellButton>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Grid
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[4, 8].map((value) => (
                      <StudyShellButton
                        key={value}
                        size="compact"
                        highlighted={riffCycleStudy.reference.denominator === value}
                        onClick={() => {
                          handleUpdateRiffReference({
                            denominator: value as ReferenceMeter['denominator'],
                          });
                          setRiffQuickPanel(null);
                        }}
                      >
                        /{value}
                      </StudyShellButton>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[8, 12, 16, 20, 32].map((value) => (
                      <StudyShellButton
                        key={value}
                        size="compact"
                        highlighted={riffCycleStudy.reference.subdivision === value}
                        onClick={() => {
                          handleUpdateRiffReference({
                            subdivision: value as ReferenceMeter['subdivision'],
                          });
                          setRiffQuickPanel(null);
                        }}
                      >
                        {value}
                      </StudyShellButton>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Bar Marker
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <StudyShellButton
                      size="compact"
                      tone="pink"
                      highlighted={!riffCycleStudy.reference.showBackbeat}
                      onClick={() => {
                        handleUpdateRiffReference({
                          showBackbeat: false,
                        });
                        setRiffQuickPanel(null);
                      }}
                    >
                      Off
                    </StudyShellButton>
                    {Array.from(
                      { length: Math.max(0, Math.min(6, riffCycleStudy.reference.numerator)) },
                      (_, index) => index + 1,
                    ).map((beat) => (
                      <StudyShellButton
                        key={beat}
                        size="compact"
                        tone="pink"
                        highlighted={
                          riffCycleStudy.reference.showBackbeat &&
                          riffCycleStudy.reference.backbeatBeat === beat
                        }
                        onClick={() => {
                          handleUpdateRiffReference({
                            showBackbeat: true,
                            backbeatBeat: beat,
                          });
                          setRiffQuickPanel(null);
                        }}
                      >
                        {beat}
                      </StudyShellButton>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {riffQuickPanel === 'phrase' ? (
              <div
                data-guide="riff-layer-2"
                className="rounded-xl border border-white/8 bg-white/[0.03] p-2 space-y-2"
              >
                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Riff Length
                  </div>
                  <div className="flex items-center gap-2">
                    <StudyShellButton
                      size="square"
                      onClick={() =>
                        handleSetRiffPhraseStepCount(Math.max(3, riffCycleStudy.riff.stepCount - 1))
                      }
                      aria-label="Shorten phrase"
                    >
                      <Minus size={14} />
                    </StudyShellButton>
                    <div
                      className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-center text-[14px] font-light"
                      style={{
                        background: `${riffCycleStudy.riff.color}12`,
                        borderColor: `${riffCycleStudy.riff.color}30`,
                        color: riffCycleStudy.riff.color,
                      }}
                    >
                      {riffCycleStudy.riff.stepCount} steps
                    </div>
                    <StudyShellButton
                      size="square"
                      onClick={() =>
                        handleSetRiffPhraseStepCount(Math.min(64, riffCycleStudy.riff.stepCount + 1))
                      }
                      aria-label="Lengthen phrase"
                    >
                      <Plus size={14} />
                    </StudyShellButton>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Pattern Tools
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <StudyShellButton
                      size="compact"
                      onClick={() => handleRotateRiffCycle(-1)}
                    >
                      Back 1
                    </StudyShellButton>
                    <StudyShellButton
                      size="compact"
                      onClick={() => handleRotateRiffCycle(1)}
                    >
                      Fwd 1
                    </StudyShellButton>
                    <StudyShellButton
                      size="compact"
                      tone="amber"
                      highlighted
                      onClick={handleInvertRiffCycle}
                    >
                      Invert
                    </StudyShellButton>
                    <StudyShellButton
                      size="compact"
                      tone="red"
                      highlighted={riffCycleStudy.riff.activeSteps.some(Boolean)}
                      icon={<Trash2 size={13} />}
                      onClick={() => {
                        handleClearRiffCycle();
                        setRiffQuickPanel(null);
                      }}
                    >
                      Clear Pattern
                    </StudyShellButton>
                  </div>
                </div>
              </div>
            ) : null}

            {riffQuickPanel === 'return' ? (
              <div
                data-guide="riff-ending"
                className="rounded-xl border border-white/8 bg-white/[0.03] p-2 space-y-2"
              >
                <div className="space-y-1">
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Return
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'free', label: 'Free' },
                      { value: 'per-bar', label: '1 Bar' },
                      { value: 'every-2-bars', label: '2 Bars' },
                      { value: 'every-4-bars', label: '4 Bars' },
                    ].map((option) => (
                      <StudyShellButton
                        key={option.value}
                        size="compact"
                        tone="amber"
                        highlighted={riffCycleStudy.riff.resetMode === option.value}
                        onClick={() => {
                          handleUpdateRiffPhrase({
                            resetMode: option.value as RiffPhrase['resetMode'],
                          });
                          setRiffQuickPanel(null);
                        }}
                      >
                        {option.label}
                      </StudyShellButton>
                    ))}
                  </div>
                </div>
                <StudyShellButton
                  size="compact"
                  tone="blue"
                  highlighted={riffCycleStudy.landingOverrides.some((value) => value !== 'inherit')}
                  icon={<RotateCcw size={13} />}
                  onClick={() => {
                    handleClearRiffLanding();
                    setRiffQuickPanel(null);
                  }}
                  className="w-full"
                >
                  Clear Ending
                </StudyShellButton>
              </div>
            ) : null}
          </StudyShellPanel>
        </div>
        ) : null}

        {!isMobile && !presentationMode ? (
          <div className="fixed right-6 top-20 z-20 w-[18rem]">
            <StudyShellPanel className="space-y-3">
              <div
                data-guide="riff-desktop-audio"
                className="rounded-xl border"
                style={{
                  background:
                    riffUtilityPanel === 'audio'
                      ? 'linear-gradient(180deg, rgba(0,255,170,0.1), rgba(255,255,255,0.03))'
                      : 'rgba(255,255,255,0.03)',
                  borderColor:
                    riffUtilityPanel === 'audio'
                      ? 'rgba(0,255,170,0.18)'
                      : 'rgba(255,255,255,0.08)',
                  boxShadow:
                    riffUtilityPanel === 'audio'
                      ? '0 0 0 1px rgba(0,255,170,0.08) inset, 0 12px 28px rgba(0,0,0,0.22)'
                      : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => setRiffUtilityPanel((current) => (current === 'audio' ? null : 'audio'))}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <div
                      className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.16em]"
                      style={{
                        color:
                          riffUtilityPanel === 'audio'
                            ? '#72F1B8'
                            : 'rgba(255,255,255,0.42)',
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      Audio
                    </div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/58">
                      {riffAudioSummary}
                    </div>
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl border text-white/56"
                    style={{
                      background:
                        riffUtilityPanel === 'audio'
                          ? 'rgba(0,255,170,0.12)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor:
                        riffUtilityPanel === 'audio'
                          ? 'rgba(0,255,170,0.22)'
                          : 'rgba(255,255,255,0.08)',
                      color:
                        riffUtilityPanel === 'audio'
                          ? '#72F1B8'
                          : 'rgba(255,255,255,0.56)',
                    }}
                  >
                    {riffUtilityPanel === 'audio' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {riffUtilityPanel === 'audio' ? (
                  <div className="border-t border-white/8 px-3 pb-3 pt-2">
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'bar', label: 'Bar', tone: 'pink' },
                        { id: 'riff', label: 'Riff', tone: 'blue' },
                        { id: 'full', label: 'Both', tone: 'green' },
                      ] as const).map((focus) => (
                        <StudyShellButton
                          key={focus.id}
                          size="compact"
                          tone={focus.tone}
                          highlighted={riffSoundFocus === focus.id}
                          onClick={() => handleSetRiffSoundFocus(focus.id)}
                        >
                          {focus.label}
                        </StudyShellButton>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                data-guide="riff-desktop-sound"
                className="rounded-xl border"
                style={{
                  background:
                    riffUtilityPanel === 'sound'
                      ? 'linear-gradient(180deg, rgba(136,204,255,0.11), rgba(255,255,255,0.03))'
                      : 'rgba(255,255,255,0.03)',
                  borderColor:
                    riffUtilityPanel === 'sound'
                      ? 'rgba(136,204,255,0.18)'
                      : 'rgba(255,255,255,0.08)',
                  boxShadow:
                    riffUtilityPanel === 'sound'
                      ? '0 0 0 1px rgba(136,204,255,0.08) inset, 0 12px 28px rgba(0,0,0,0.22)'
                      : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => setRiffUtilityPanel((current) => (current === 'sound' ? null : 'sound'))}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <div
                      className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.16em]"
                      style={{
                        color:
                          riffUtilityPanel === 'sound'
                            ? '#88CCFF'
                            : 'rgba(255,255,255,0.42)',
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      Sound
                    </div>
                    <div className="mt-1 truncate text-[10px] font-mono uppercase tracking-[0.14em] text-white/58">
                      {riffSoundSummary}
                    </div>
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl border text-white/56"
                    style={{
                      background:
                        riffUtilityPanel === 'sound'
                          ? 'rgba(136,204,255,0.12)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor:
                        riffUtilityPanel === 'sound'
                          ? 'rgba(136,204,255,0.22)'
                          : 'rgba(255,255,255,0.08)',
                      color:
                        riffUtilityPanel === 'sound'
                          ? '#88CCFF'
                          : 'rgba(255,255,255,0.56)',
                    }}
                  >
                    {riffUtilityPanel === 'sound' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {riffUtilityPanel === 'sound' ? (
                  <div className="border-t border-white/8 px-3 pb-3 pt-2 space-y-2">
                    <div className="grid grid-cols-[1.15fr,0.85fr] gap-2">
                      <div className="space-y-1">
                        <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-white/34">
                          Palette
                        </div>
                        <select
                          value={riffCycleStudy.soundSettings.palette}
                          onChange={(event) =>
                            handleUpdateRiffSoundSettings({
                              palette: event.target.value as RiffCycleSoundSettings['palette'],
                            })
                          }
                          className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white outline-none"
                        >
                          <option value="architectural" style={{ background: '#181820' }}>Architectural</option>
                          <option value="deep-architectural" style={{ background: '#181820' }}>Deep Arch</option>
                          <option value="muted-djent" style={{ background: '#181820' }}>Muted Djent</option>
                          <option value="dry-synth" style={{ background: '#181820' }}>Dry Synth</option>
                          <option value="metal-tick" style={{ background: '#181820' }}>Metal Tick</option>
                          <option value="low-pulse" style={{ background: '#181820' }}>Low Pulse</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-white/34">
                          Pitch
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <StudyShellButton
                            size="compact"
                            tone="neutral"
                            highlighted={riffCycleStudy.soundSettings.pitchMode === 'free'}
                            onClick={() =>
                              handleUpdateRiffSoundSettings({
                                pitchMode: 'free',
                              })
                            }
                          >
                            Original
                          </StudyShellButton>
                          <StudyShellButton
                            size="compact"
                            tone="green"
                            highlighted={riffCycleStudy.soundSettings.pitchMode === 'keyed'}
                            onClick={() =>
                              handleUpdateRiffSoundSettings({
                                pitchMode: 'keyed',
                              })
                            }
                          >
                            Keyed
                          </StudyShellButton>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-white/34">
                        Register
                      </div>
                      <select
                        value={riffCycleStudy.soundSettings.register}
                        onChange={(event) =>
                          handleUpdateRiffSoundSettings({
                            register: event.target.value as RiffCycleSoundSettings['register'],
                          })
                        }
                        className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white outline-none"
                      >
                        <option value="low" style={{ background: '#181820' }}>Low</option>
                        <option value="mid-low" style={{ background: '#181820' }}>Mid-Low</option>
                        <option value="wide" style={{ background: '#181820' }}>Wide</option>
                      </select>
                    </div>
                    {riffCycleStudy.soundSettings.pitchMode === 'keyed' ? (
                      <div className="grid grid-cols-[72px,1fr] gap-2">
                        <div className="space-y-1">
                          <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-white/34">
                            Key
                          </div>
                          <select
                            value={riffCycleStudy.soundSettings.rootNote}
                            onChange={(event) =>
                              handleUpdateRiffSoundSettings({
                                rootNote: event.target.value as RiffCycleSoundSettings['rootNote'],
                              })
                            }
                            className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white outline-none"
                          >
                            {NOTE_NAMES.map((note) => (
                              <option key={note} value={note} style={{ background: '#181820' }}>
                                {note}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-white/34">
                            Scale
                          </div>
                          <select
                            value={riffCycleStudy.soundSettings.scaleName}
                            onChange={(event) =>
                              handleUpdateRiffSoundSettings({
                                scaleName: event.target.value as RiffCycleSoundSettings['scaleName'],
                              })
                            }
                            className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white outline-none"
                          >
                            {Object.entries(SCALE_PRESETS).map(([name, scale]) => (
                              <option key={name} value={name} style={{ background: '#181820' }}>
                                {scale.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div
                data-guide="riff-desktop-view"
                className="rounded-xl border"
                style={{
                  background:
                    riffUtilityPanel === 'view'
                      ? 'linear-gradient(180deg, rgba(255,184,107,0.11), rgba(255,255,255,0.03))'
                      : 'rgba(255,255,255,0.03)',
                  borderColor:
                    riffUtilityPanel === 'view'
                      ? 'rgba(255,184,107,0.18)'
                      : 'rgba(255,255,255,0.08)',
                  boxShadow:
                    riffUtilityPanel === 'view'
                      ? '0 0 0 1px rgba(255,184,107,0.08) inset, 0 12px 28px rgba(0,0,0,0.22)'
                      : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => setRiffUtilityPanel((current) => (current === 'view' ? null : 'view'))}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <div
                      className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.16em]"
                      style={{
                        color:
                          riffUtilityPanel === 'view'
                            ? '#FFB86B'
                            : 'rgba(255,255,255,0.42)',
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      View
                    </div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-white/58">
                      {riffViewSummary}
                    </div>
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl border text-white/56"
                    style={{
                      background:
                        riffUtilityPanel === 'view'
                          ? 'rgba(255,184,107,0.12)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor:
                        riffUtilityPanel === 'view'
                          ? 'rgba(255,184,107,0.22)'
                          : 'rgba(255,255,255,0.08)',
                      color:
                        riffUtilityPanel === 'view'
                          ? '#FFB86B'
                          : 'rgba(255,255,255,0.56)',
                    }}
                  >
                    {riffUtilityPanel === 'view' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>
                {riffUtilityPanel === 'view' ? (
                  <div className="border-t border-white/8 px-3 pb-3 pt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <StudyShellButton
                        size="compact"
                        tone="blue"
                        highlighted={riffCycleStudy.viewMode === 'unwrapped'}
                        onClick={() =>
                          setRiffCycleStudy((current) => ({
                            ...current,
                            viewMode: 'unwrapped',
                          }))
                        }
                      >
                        Lane
                      </StudyShellButton>
                      <StudyShellButton
                        size="compact"
                        tone="blue"
                        highlighted={riffCycleStudy.viewMode === 'circular'}
                        onClick={() =>
                          setRiffCycleStudy((current) => ({
                            ...current,
                            viewMode: 'circular',
                          }))
                        }
                      >
                        Circle
                      </StudyShellButton>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <StudyShellButton
                        size="compact"
                        tone="amber"
                        highlighted={riffCycleStudy.emphasisMode === 'groove'}
                        onClick={handleToggleRiffEmphasisMode}
                      >
                        Fill
                      </StudyShellButton>
                      <StudyShellButton
                        size="compact"
                        tone="amber"
                        highlighted={Boolean(riffCycleStudy.showStepLabels)}
                        onClick={handleToggleRiffStepLabels}
                      >
                        Labels
                      </StudyShellButton>
                      <StudyShellButton
                        size="compact"
                        tone="green"
                        highlighted={Boolean(riffCycleStudy.showPhraseRing)}
                        onClick={handleToggleRiffPhraseBody}
                      >
                        Shape
                      </StudyShellButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </StudyShellPanel>
          </div>
        ) : null}

        {isMobile && presentationMode ? (
          <div className="fixed z-20 left-5 right-5 bottom-5">
            <StudyShellPanel className="space-y-2.5">
              <div className="flex items-center justify-center gap-2">
                <div
                  className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{
                    background:
                      riffEditMode === 'landing'
                        ? 'rgba(127,215,255,0.12)'
                        : `${riffCycleStudy.riff.color}12`,
                    borderColor:
                      riffEditMode === 'landing'
                        ? 'rgba(127,215,255,0.24)'
                        : `${riffCycleStudy.riff.color}26`,
                    color: riffEditMode === 'landing' ? '#7FD7FF' : riffCycleStudy.riff.color,
                  }}
                >
                  {riffEditMode === 'landing' ? 'Ending' : 'Riff'}
                </div>
                <StudyShellButton
                  size="square"
                  tone={riffCycleStudy.playing ? 'red' : 'green'}
                  highlighted
                  icon={riffCycleStudy.playing ? <Pause size={16} /> : <Play size={16} />}
                  onClick={handleToggleRiffCyclePlayback}
                  aria-label={riffCycleStudy.playing ? 'Pause riff cycle' : 'Play riff cycle'}
                  title={riffCycleStudy.playing ? 'Pause' : 'Play'}
                />
                <StudyShellButton
                  size="square"
                  tone="amber"
                  highlighted
                  icon={<RotateCcw size={16} />}
                  onClick={handleResetRiffCycleStudy}
                  aria-label="Restart riff cycle"
                  title="Restart"
                />
                <StudyShellButton
                  size="square"
                  tone="blue"
                  highlighted
                  icon={<Shuffle size={16} />}
                  onClick={handleRandomRiffCycleStudy}
                  aria-label="Random riff cycle study"
                  title="Random"
                />
                <StudyShellButton
                  size="square"
                  tone="neutral"
                  highlighted
                  icon={<Shuffle size={16} />}
                  onClick={handleRemixRiffCycleStudy}
                  aria-label="Remix riff cycle study"
                  title="Remix"
                  style={{
                    background: 'rgba(182,160,255,0.14)',
                    borderColor: 'rgba(182,160,255,0.3)',
                    color: '#B6A0FF',
                    boxShadow: '0 0 0 1px rgba(182,160,255,0.16) inset',
                  }}
                />
                <StudyShellButton
                  size="square"
                  tone="amber"
                  highlighted
                  icon={<Shuffle size={16} />}
                  onClick={handleRandomPlusRiffCycleStudy}
                  aria-label="Random plus riff cycle study"
                  title="Random+"
                />
              </div>

              <div className="flex items-center justify-center gap-2">
                <StudyShellButton
                  size="compact"
                  tone="amber"
                  highlighted={riffCycleStudy.emphasisMode === 'groove'}
                  onClick={handleToggleRiffEmphasisMode}
                  title="Toggle frame fill"
                >
                  Fill
                </StudyShellButton>
                <StudyShellButton
                  size="square"
                  tone="blue"
                  highlighted={riffCycleStudy.soundEnabled}
                  icon={riffCycleStudy.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  onClick={handleToggleRiffCycleSound}
                  data-guide="riff-mobile-audio"
                  aria-label={riffCycleStudy.soundEnabled ? 'Mute riff cycle sound' : 'Enable riff cycle sound'}
                  title={riffCycleStudy.soundEnabled ? 'Audio On' : 'Audio Off'}
                />
                <StudyShellButton
                  size="square"
                  tone="green"
                  highlighted
                  icon={<Maximize2 size={16} />}
                  onClick={handleTogglePresentation}
                  data-guide="riff-mobile-present"
                  aria-label="Exit presentation mode"
                  title="Exit Present"
                />
              </div>
            </StudyShellPanel>
          </div>
        ) : (
          <div className={`fixed z-20 ${isMobile ? 'left-3 right-3 bottom-6' : 'left-6 right-6 bottom-6'}`}>
            <StudyShellDock
              className={
                isMobile
                  ? 'space-y-3'
                  : 'grid grid-cols-[auto_minmax(24rem,1fr)_auto] items-center gap-3'
              }
            >
              <div
                data-guide={isMobile ? 'riff-mobile-transport' : 'riff-desktop-transport'}
                className={`flex items-center gap-2 ${isMobile ? 'flex-wrap justify-between' : 'flex-nowrap'}`}
              >
                <StudyShellButton
                  tone={riffCycleStudy.playing ? 'red' : 'green'}
                  highlighted
                  icon={riffCycleStudy.playing ? <Pause size={15} /> : <Play size={15} />}
                  onClick={handleToggleRiffCyclePlayback}
                >
                  {riffCycleStudy.playing ? 'Pause' : 'Play'}
                </StudyShellButton>
                <StudyShellButton
                  tone="amber"
                  highlighted
                  icon={<RotateCcw size={15} />}
                  onClick={handleResetRiffCycleStudy}
                >
                  Restart
                </StudyShellButton>
                <StudyShellButton
                  tone="blue"
                  highlighted
                  icon={<Shuffle size={15} />}
                  onClick={handleRandomRiffCycleStudy}
                >
                  Random
                </StudyShellButton>
                <StudyShellButton
                  tone="neutral"
                  highlighted
                  icon={<Shuffle size={15} />}
                  onClick={handleRemixRiffCycleStudy}
                  style={{
                    background: 'rgba(182,160,255,0.14)',
                    borderColor: 'rgba(182,160,255,0.3)',
                    color: '#B6A0FF',
                    boxShadow: '0 0 0 1px rgba(182,160,255,0.16) inset',
                  }}
                >
                  Remix
                </StudyShellButton>
                <StudyShellButton
                  tone="amber"
                  highlighted
                  icon={<Shuffle size={15} />}
                  onClick={handleRandomPlusRiffCycleStudy}
                >
                  Random+
                </StudyShellButton>
              </div>

              <div
                data-guide={isMobile ? 'riff-mobile-tempo' : 'riff-desktop-tempo'}
                className={`rounded-2xl border border-white/8 bg-white/[0.03] ${
                  isMobile ? 'px-3 py-2.5' : 'min-w-[30rem] px-4 py-2.5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 text-[10px] font-mono uppercase tracking-[0.18em] text-white/42">
                    Tempo
                  </div>
                  <input
                    type="range"
                    min="45"
                    max="220"
                    step="1"
                    value={riffCycleStudy.reference.bpm}
                    onChange={(event) =>
                      handleUpdateRiffReference({
                        bpm: parseInt(event.target.value, 10) || riffCycleStudy.reference.bpm,
                      })
                    }
                    onPointerDown={(event) =>
                      handleMobileSliderPointerDown(event, 'riff-tempo', (value) =>
                        handleUpdateRiffReference({ bpm: Math.round(value) }),
                      )
                    }
                    onPointerMove={(event) =>
                      handleMobileSliderPointerMove(event, 'riff-tempo', (value) =>
                        handleUpdateRiffReference({ bpm: Math.round(value) }),
                      )
                    }
                    onPointerUp={() => clearActiveMobileSlider('riff-tempo')}
                    onPointerCancel={() => clearActiveMobileSlider('riff-tempo')}
                    onBlur={() => clearActiveMobileSlider('riff-tempo')}
                    data-dragging={activeMobileSliderId === 'riff-tempo'}
                    className="touch-slider w-full"
                    style={{ ['--slider-accent' as string]: '#ffffff' }}
                    aria-label="Set riff cycle tempo"
                  />
                  <div className="min-w-[54px] shrink-0 text-right">
                    <div className="text-[16px] font-light leading-none text-white">
                      {riffCycleStudy.reference.bpm}
                    </div>
                    <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.16em] text-white/34">
                      BPM
                    </div>
                  </div>
                  <div className="ml-1 flex items-center gap-2 border-l border-white/8 pl-3">
                    <div className="shrink-0 text-[10px] font-mono uppercase tracking-[0.18em] text-white/42">
                      Offset
                    </div>
                    <StudyShellButton
                      size="square"
                      icon={<ChevronLeft size={16} />}
                      onClick={() => handleRotateRiffCycle(-1)}
                      aria-label="Move phrase back one step"
                      title="Move phrase back one step"
                    />
                    <StudyShellButton
                      size="square"
                      icon={<ChevronRight size={16} />}
                      onClick={() => handleRotateRiffCycle(1)}
                      aria-label="Move phrase forward one step"
                      title="Move phrase forward one step"
                    />
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-2 ${isMobile ? 'justify-between' : 'justify-end'}`}>
                {isMobile ? (
                  <>
                    <StudyShellButton
                      size="compact"
                      tone="amber"
                      highlighted={Boolean(riffCycleStudy.showStepLabels)}
                      onClick={handleToggleRiffStepLabels}
                    >
                      Labels
                    </StudyShellButton>
                  </>
                ) : null}
                <StudyShellButton
                  tone="blue"
                  highlighted={riffCycleStudy.soundEnabled}
                  icon={riffCycleStudy.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  onClick={handleToggleRiffCycleSound}
                  data-guide={isMobile ? 'riff-mobile-audio' : undefined}
                >
                  {riffCycleStudy.soundEnabled ? 'Sound On' : 'Sound Off'}
                </StudyShellButton>
                <StudyShellButton
                  tone="green"
                  highlighted={presentationMode}
                  icon={<Maximize2 size={15} />}
                  onClick={handleTogglePresentation}
                  data-guide={isMobile ? 'riff-mobile-present' : 'riff-desktop-present'}
                >
                  Present
                </StudyShellButton>
                <StudyShellButton
                  tone="neutral"
                  highlighted={helpOpen}
                  icon={<CircleHelp size={15} />}
                  onClick={handleToggleHelpGuide}
                >
                  Help
                </StudyShellButton>
                <StudyShellButton
                  size="square"
                  icon={<Menu size={15} />}
                  onClick={() => {
                    setRiffQuickPanel(null);
                    setSidebarOpen(true);
                  }}
                  data-guide={isMobile ? 'riff-mobile-menu' : 'riff-desktop-menu'}
                  aria-label="Open riff cycle menu"
                  title="Open riff cycle menu"
                />
              </div>
            </StudyShellDock>
          </div>
        )}

        {helpOpen && !presentationMode && currentGuideStep ? (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/42"
              onClick={closeStartGuide}
            />
            {guideRect ? (
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
            ) : null}
            <div
              ref={guideCalloutRef}
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
              {helpStepIndex === guideSteps.length - 1 ? (
                <div className="mt-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  You&apos;re ready to explore.
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        <RiffCycleSidebar
          isOpen={sidebarOpen && !presentationMode}
          study={riffCycleStudy}
          currentSurface={appSurface}
          activePresetId={activeRiffCyclePresetId}
          selectedStep={selectedRiffCycleStep}
          onClose={() => setSidebarOpen(false)}
          onSurfaceChange={handleAppSurfaceChange}
          onLoadPreset={handleLoadRiffCyclePreset}
          onResetStudy={handleResetRiffCycleStudy}
          onToggleSound={handleToggleRiffCycleSound}
          onToggleReferenceSound={handleToggleRiffReferenceSound}
          onToggleBackbeatSound={handleToggleRiffBackbeatSound}
          onUpdateSoundSettings={handleUpdateRiffSoundSettings}
          onUpdateReference={handleUpdateRiffReference}
          onUpdateRiff={handleUpdateRiffPhrase}
          onSetRiffStepCount={handleSetRiffPhraseStepCount}
          onToggleStep={handleToggleRiffCycleStep}
          onToggleAccent={handleToggleRiffCycleAccent}
          onSelectStep={handleSelectRiffCycleStep}
          onRotateRiff={handleRotateRiffCycle}
          onInvertRiff={handleInvertRiffCycle}
          onClearRiff={handleClearRiffCycle}
          onToggleViewMode={handleToggleRiffViewMode}
          onToggleAlignmentMarkers={handleToggleRiffAlignmentMarkers}
          onToggleStepLabels={handleToggleRiffStepLabels}
          onTogglePhraseBody={handleToggleRiffPhraseBody}
          onToggleEmphasisMode={handleToggleRiffEmphasisMode}
          onSetEditMode={handleSetRiffEditMode}
          onSetSoundFocus={handleSetRiffSoundFocus}
          onToggleLandingEdit={handleToggleRiffLandingEdit}
          onSetLandingLength={handleSetRiffLandingLength}
          onClearLanding={handleClearRiffLanding}
          onMuteLastLandingHit={() => handleMuteLastLandingSteps(1)}
          onMuteLastTwoLandingHits={() => handleMuteLastLandingSteps(2)}
          onAccentLastLandingHit={() => handleAccentLastLandingSteps(1)}
          onAccentLastTwoLandingHits={() => handleAccentLastLandingSteps(2)}
          onExportPng={handleExportRiffCyclePng}
          onExportScene={handleExportRiffCycleScene}
        />
      </div>
    );
  }
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
            onOpenOrbitEditor={handleOpenOrbitEditor}
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
            onToggleHelp={handleToggleHelpGuide}
            onTogglePresentation={handleTogglePresentation}
            onRandomPattern={handleRandomPattern}
            onRemixPattern={handleRemixPattern}
            onRandomPatternPlus={handleRandomPatternPlus}
            onSoundModeChange={(tonePreset) => handleHarmonyChange({ tonePreset })}
            onRootNoteChange={(rootNote) => handleHarmonyChange({ rootNote })}
            onScaleChange={(scaleName) => handleHarmonyChange({ scaleName })}
            onAddOrbit={handleAddOrbit}
            onDeleteOrbit={handleDeleteOrbit}
            onReset={handleReset}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
          {proPromptOverlay}
        </div>
      );
    }

    return (
      <div className="min-h-[100svh] overflow-y-auto bg-[#111116] pt-2 pb-7 select-none">
        <div className="space-y-2">
          <div
            data-guide="mobile-colors"
            className="relative overflow-hidden"
            style={mobileCanvasFrameStyle}
          >
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

          <div className="px-4 space-y-3">
            <div
              data-guide="mobile-playback"
              className="relative z-10 rounded-[28px] border px-4 py-4 space-y-3"
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
                    onClick={handleToggleHelpGuide}
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleTogglePlay}
                  className="px-4 py-3 rounded-2xl flex items-center justify-center gap-2"
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
                  className="px-4 py-3 rounded-2xl flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,170,0,0.14)', border: '1px solid rgba(255,170,0,0.26)', color: '#FFAA00' }}
                >
                  <RotateCcw size={17} />
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em]">Reset</span>
                </button>
                <button
                  data-guide="mobile-audio"
                  onClick={handleToggleMute}
                  className="px-4 py-3 rounded-2xl flex items-center justify-center gap-2"
                  style={{ background: muted ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.76)' }}
                >
                  {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em]">{muted ? 'Muted' : 'Audio'}</span>
                </button>
              </div>
              <div data-guide="mobile-speed" className="space-y-1">
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
                  onPointerDown={(event) =>
                    handleMobileSliderPointerDown(event, 'speed', (value) => handleSpeedChange(value))
                  }
                  onPointerMove={(event) =>
                    handleMobileSliderPointerMove(event, 'speed', (value) => handleSpeedChange(value))
                  }
                  onPointerUp={() => clearActiveMobileSlider('speed')}
                  onPointerCancel={() => clearActiveMobileSlider('speed')}
                  onBlur={() => clearActiveMobileSlider('speed')}
                  data-dragging={activeMobileSliderId === 'speed'}
                  className="touch-slider w-full"
                  style={{ ['--slider-accent' as string]: '#ffffff' }}
                />
              </div>
            </div>

            <div
              data-guide="mobile-customize"
              className="rounded-[28px] border"
              style={{
                background: mobileCustomizeOpen
                  ? 'linear-gradient(180deg, rgba(17,17,22,0.96), rgba(17,17,22,0.9))'
                  : 'rgba(17,17,22,0.9)',
                borderColor: mobileCustomizeOpen ? 'rgba(0,255,170,0.18)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="flex items-center justify-between gap-3 px-4 py-3"
                style={{
                  background: mobileCustomizeOpen ? 'linear-gradient(180deg, rgba(0,255,170,0.08), rgba(255,255,255,0))' : 'transparent',
                  boxShadow: mobileCustomizeOpen ? 'inset 0 1px 0 rgba(0,255,170,0.08)' : 'none',
                }}
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
                  <div
                    className="text-[11px] font-mono uppercase tracking-[0.22em]"
                    style={{ color: mobileCustomizeOpen ? '#00FFAA' : 'rgba(255,255,255,0.5)' }}
                  >
                    Customize Pattern
                  </div>
                  <div
                    className="mt-1 text-[12px]"
                    style={{ color: mobileCustomizeOpen ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.4)' }}
                  >
                    Shape the form.
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
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
                    className="h-10 min-w-10 rounded-xl flex items-center justify-center px-2.5 shrink-0 active:scale-[0.97]"
                    style={{
                      ...mobileChevronButtonBaseStyle,
                      background: mobileCustomizeOpen ? 'rgba(0,255,170,0.1)' : mobileChevronButtonBaseStyle.background,
                      border: mobileCustomizeOpen ? '1px solid rgba(0,255,170,0.2)' : mobileChevronButtonBaseStyle.border,
                      color: mobileCustomizeOpen ? '#00FFAA' : mobileChevronButtonBaseStyle.color,
                    }}
                    aria-label={mobileCustomizeOpen ? 'Collapse customize pattern' : 'Expand customize pattern'}
                    title={mobileCustomizeOpen ? 'Collapse section' : 'Expand section'}
                  >
                      {mobileCustomizeOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {mobileCustomizeOpen && (
                <div className="space-y-3 border-t px-4 pb-3 pt-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
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
                    {(geometryMode === 'standard-trace' || canAddSweepOrbit || canAddInterferenceOrbit) && (
                      <button
                        onClick={handleAddOrbit}
                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{ color: '#00FFAA', background: 'rgba(0,255,170,0.08)', border: '1px solid rgba(0,255,170,0.22)' }}
                        title={
                          geometryMode === 'sweep'
                            ? 'Add sweep layer'
                            : geometryMode === 'interference-trace'
                              ? 'Add interference layer'
                              : 'Add layer'
                        }
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
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenOrbitEditor(orbit.id)}
                              className="text-[12px] font-mono uppercase tracking-[0.14em] transition-opacity active:scale-[0.98]"
                              style={{ color: orbit.color }}
                              title={`Edit ${layerLabel} color`}
                            >
                              {layerLabel}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenOrbitEditor(orbit.id)}
                              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 active:scale-[0.97]"
                              style={{
                                color: orbit.color,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.09)',
                              }}
                              title={`Open ${layerLabel} color picker`}
                              aria-label={`Open ${layerLabel} color picker`}
                            >
                              <Palette size={14} />
                            </button>
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
                            {(((geometryMode === 'sweep' && (orbit.label === 'Sweep C' || orbit.label === 'Sweep D')) ||
                              (geometryMode === 'interference-trace' &&
                                (orbit.label === 'Interference C' || orbit.label === 'Interference D')))) && (
                              <button
                                onClick={() => handleDeleteOrbit(orbit.id)}
                                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ color: 'rgba(255,120,150,0.92)', background: 'rgba(255,70,110,0.08)', border: '1px solid rgba(255,70,110,0.16)' }}
                                title={`Delete ${layerLabel}`}
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
                            max={String(mobileQuickOrbitSliderMax)}
                            step="1"
                            value={Math.min(orbit.pulseCount, mobileQuickOrbitSliderMax)}
                            onChange={(e) => handleSetQuickOrbit(orbit.id, parseInt(e.target.value) || 1)}
                            onPointerDown={(event) =>
                              handleMobileSliderPointerDown(event, `orbit-${orbit.id}`, (value) =>
                                handleSetQuickOrbit(orbit.id, Math.round(value) || 1),
                              )
                            }
                            onPointerMove={(event) =>
                              handleMobileSliderPointerMove(event, `orbit-${orbit.id}`, (value) =>
                                handleSetQuickOrbit(orbit.id, Math.round(value) || 1),
                              )
                            }
                            onPointerUp={() => clearActiveMobileSlider(`orbit-${orbit.id}`)}
                            onPointerCancel={() => clearActiveMobileSlider(`orbit-${orbit.id}`)}
                            onBlur={() => clearActiveMobileSlider(`orbit-${orbit.id}`)}
                            data-dragging={activeMobileSliderId === `orbit-${orbit.id}`}
                            className="touch-slider flex-1"
                            style={{ ['--slider-accent' as string]: orbit.color }}
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
                background: mobileScenesOpen
                  ? 'linear-gradient(180deg, rgba(17,17,22,0.96), rgba(17,17,22,0.9))'
                  : 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.86))',
                borderColor: mobileScenesOpen ? 'rgba(51,136,255,0.18)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: mobileScenesOpen ? 'linear-gradient(180deg, rgba(51,136,255,0.09), rgba(255,255,255,0))' : 'transparent',
                  boxShadow: mobileScenesOpen ? 'inset 0 1px 0 rgba(51,136,255,0.08)' : 'none',
                }}
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
                  <div
                    className="text-[11px] font-mono uppercase tracking-[0.22em]"
                    style={{ color: mobileScenesOpen ? '#88CCFF' : 'rgba(255,255,255,0.5)' }}
                  >
                    Scenes
                  </div>
                  <div
                    className="mt-1 text-[12px]"
                    style={{ color: mobileScenesOpen ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.42)' }}
                  >
                    Built-in scenes and quick generators.
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
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
                      handleRemixPattern();
                    }}
                    type="button"
                    className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{ color: '#00FFAA', background: 'rgba(0,255,170,0.12)', border: '1px solid rgba(0,255,170,0.22)' }}
                    title="Refresh color, direction, sound, and speed while keeping the current ratios"
                  >
                    Remix
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
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMobileScenesOpen((open) => !open);
                    }}
                    className="h-10 min-w-10 rounded-xl flex items-center justify-center px-2.5 shrink-0 active:scale-[0.97]"
                    style={{
                      ...mobileChevronButtonBaseStyle,
                      background: mobileScenesOpen ? 'rgba(51,136,255,0.12)' : mobileChevronButtonBaseStyle.background,
                      border: mobileScenesOpen ? '1px solid rgba(51,136,255,0.22)' : mobileChevronButtonBaseStyle.border,
                      color: mobileScenesOpen ? '#88CCFF' : mobileChevronButtonBaseStyle.color,
                    }}
                    aria-label={mobileScenesOpen ? 'Collapse scenes' : 'Expand scenes'}
                    title={mobileScenesOpen ? 'Collapse section' : 'Expand section'}
                  >
                    {mobileScenesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {mobileScenesOpen && (
                <div className="space-y-3 border-t px-4 pb-3 pt-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 rounded-2xl border p-1" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    {[
                      { key: 'built-in' as const, label: 'Scenes', color: '#88CCFF' },
                      { key: 'saved' as const, label: 'Saved', color: '#00FFAA' },
                      { key: 'premium' as const, label: 'Pro', color: '#FFAA00' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setMobileSceneTab(tab.key)}
                        className="flex-1 rounded-xl px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{
                          background: mobileSceneTab === tab.key ? `${tab.color}14` : 'transparent',
                          border: `1px solid ${mobileSceneTab === tab.key ? `${tab.color}45` : 'transparent'}`,
                          color: mobileSceneTab === tab.key ? tab.color : 'rgba(255,255,255,0.48)',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveScene}
                      className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{ color: '#00FFAA', background: 'rgba(0,255,170,0.1)', border: '1px solid rgba(0,255,170,0.22)' }}
                    >
                      Save Scene
                    </button>
                    {isSignedIn && localSavedScenes.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleImportLocalScenes}
                        className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{ color: '#88CCFF', background: 'rgba(51,136,255,0.1)', border: '1px solid rgba(51,136,255,0.22)' }}
                      >
                        Import Local Scenes
                      </button>
                    ) : null}
                  </div>

                  {mobileSceneTab === 'built-in' ? (
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
                  ) : null}

                  {mobileSceneTab === 'saved' ? (
                    cloudPersistenceLoading ? (
                      <div className="rounded-2xl border px-4 py-4 text-[11px] leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.44)' }}>
                        Loading saved scenes…
                      </div>
                    ) : savedScenes.length === 0 ? (
                      <div className="rounded-2xl border px-4 py-4 text-[11px] leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.44)' }}>
                        {isSignedIn ? 'No account scenes yet. Save one to keep it with your account.' : 'No local scenes yet. Save one on this device or sign in for account scenes.'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {savedScenes.map((scene) => (
                          <div
                            key={scene.id}
                            className="rounded-2xl border overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.09)' }}
                          >
                            {scene.thumbnailDataUrl ? (
                              <div className="aspect-[4/3] w-full overflow-hidden bg-[#0f1016]">
                                <img src={scene.thumbnailDataUrl} alt={scene.name} className="h-full w-full object-cover" />
                              </div>
                            ) : null}
                            <div className="space-y-2 px-4 py-4">
                              <div className="text-[12px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.86)' }}>
                                {scene.name}
                              </div>
                              <div className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
                                {new Date(scene.updatedAt).toLocaleString()}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleLoadScene(scene.id)}
                                  className="px-3 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                                  style={{ color: '#88CCFF', background: 'rgba(51,136,255,0.1)', border: '1px solid rgba(51,136,255,0.22)' }}
                                >
                                  Load
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteScene(scene.id)}
                                  className="px-3 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-[0.14em]"
                                  style={{ color: 'rgba(255,120,150,0.92)', background: 'rgba(255,70,110,0.08)', border: '1px solid rgba(255,70,110,0.16)' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}

                  {mobileSceneTab === 'premium' ? (
                    <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none]">
                      <div className="flex gap-3 px-1 snap-x snap-mandatory">
                        {PREMIUM_SCENES.map((scene) => (
                          <button
                            key={scene.id}
                            onClick={() => handleLoadBuiltInScene(scene.id)}
                            className="min-w-[220px] max-w-[220px] snap-start overflow-hidden rounded-2xl border text-left"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              borderColor: 'rgba(255,170,0,0.12)',
                            }}
                          >
                            <div className="relative aspect-square w-full overflow-hidden bg-[#0f1016]">
                              <img
                                src={scene.thumbnailDataUrl}
                                alt={scene.name}
                                className="h-full w-full object-cover"
                              />
                              <div
                                className="absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                                style={{ background: 'rgba(255,170,0,0.14)', border: '1px solid rgba(255,170,0,0.24)', color: '#FFAA00' }}
                              >
                                Pro
                              </div>
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
                  ) : null}
                </div>
              )}
            </div>

            <div
              data-guide="mobile-sound"
              className="rounded-[28px] border"
              style={{
                background: 'rgba(17,17,22,0.9)',
                borderColor: mobileSoundOpen ? 'rgba(0,255,170,0.18)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="flex items-center justify-between gap-3 px-4 py-3"
                style={{
                  background: mobileSoundOpen ? 'linear-gradient(180deg, rgba(0,255,170,0.08), rgba(255,255,255,0))' : 'transparent',
                  boxShadow: mobileSoundOpen ? 'inset 0 1px 0 rgba(0,255,170,0.08)' : 'none',
                }}
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
                  <div
                    className="text-[11px] font-mono uppercase tracking-[0.22em]"
                    style={{ color: mobileSoundOpen ? '#00FFAA' : 'rgba(255,255,255,0.5)' }}
                  >
                    Sound
                  </div>
                  <div
                    className="mt-1 text-[12px]"
                    style={{ color: mobileSoundOpen ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.4)' }}
                  >
                    Tone and harmony.
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
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
                    className="h-10 min-w-10 rounded-xl flex items-center justify-center px-2.5 shrink-0 active:scale-[0.97]"
                    style={{
                      ...mobileChevronButtonBaseStyle,
                      background: mobileSoundOpen ? 'rgba(0,255,170,0.1)' : mobileChevronButtonBaseStyle.background,
                      border: mobileSoundOpen ? '1px solid rgba(0,255,170,0.2)' : mobileChevronButtonBaseStyle.border,
                      color: mobileSoundOpen ? '#00FFAA' : mobileChevronButtonBaseStyle.color,
                    }}
                    aria-label={mobileSoundOpen ? 'Collapse sound' : 'Expand sound'}
                    title={mobileSoundOpen ? 'Collapse section' : 'Expand section'}
                  >
                    {mobileSoundOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {mobileSoundOpen && (
                <div className="space-y-3 border-t px-4 pb-3 pt-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
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

            <div
              className="rounded-[22px] border px-3 py-3"
              style={{
                background: 'rgba(17,17,22,0.82)',
                borderColor: 'rgba(255,90,120,0.12)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.46)' }}>
                    Reset Everything
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Restore defaults.
                  </div>
                </div>
                <button
                  onClick={handleHardReset}
                  className="shrink-0 px-3 py-2 rounded-xl flex items-center justify-center gap-1.5"
                  style={{
                    background: 'rgba(255,70,110,0.1)',
                    border: '1px solid rgba(255,70,110,0.18)',
                    color: 'rgba(255,160,180,0.92)',
                  }}
                >
                  <RotateCcw size={14} />
                  <span className="text-[10px] font-mono uppercase tracking-[0.12em]">Hard Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {proPromptOverlay}

        {helpOpen && !presentationMode && currentGuideStep && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/42"
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
              ref={guideCalloutRef}
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
          currentSurface={appSurface}
          harmonySettings={harmonySettings}
          geometryMode={geometryMode}
          interferenceSettings={interferenceSettings}
          builtInScenes={BUILT_IN_SCENES.map(({ id, name, description, thumbnailDataUrl, snapshot }) => ({ id, name, description, thumbnailDataUrl, geometryMode: snapshot.geometryMode }))}
          premiumScenes={PREMIUM_SCENES.map(({ id, name, description, thumbnailDataUrl, snapshot }) => ({ id, name, description, thumbnailDataUrl, geometryMode: snapshot.geometryMode }))}
          savedScenes={savedScenes.map(({ id, name, updatedAt, thumbnailDataUrl, snapshot }) => ({ id, name, updatedAt, thumbnailDataUrl, geometryMode: snapshot.geometryMode }))}
          exportRecords={exportRecords}
          signedIn={isSignedIn}
          accountPersistenceLoading={authLoading || cloudPersistenceLoading}
          localSceneCount={localSavedScenes.length}
          onClose={() => setSidebarOpen(false)}
          onSurfaceChange={handleAppSurfaceChange}
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
          onImportLocalScenes={handleImportLocalScenes}
          onLoadScene={handleLoadScene}
          onLoadBuiltInScene={handleLoadBuiltInScene}
          onDeleteScene={handleDeleteScene}
          onExportScene={handleExportScene}
          onImportScene={handleImportScene}
          onExportPng={handleExportPng}
          onExportVideo={handleExportVideo}
          isRecordingVideo={recordingVideo}
          onHardReset={handleHardReset}
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
      {isMobile && <div style={mobileCanvasFrameStyle} />}
      <div
        data-guide={!isMobile ? 'desktop-colors' : undefined}
        className={isMobile ? 'absolute inset-x-0 top-0 overflow-hidden' : undefined}
        style={isMobile ? mobileCanvasFrameStyle : undefined}
      >
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
          className={isMobile ? 'absolute inset-0 w-full h-full' : undefined}
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
            Rhythmic Geometry
          </h1>
          <p
            className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} mt-1 font-mono transition-colors group-hover:text-white/20`}
            style={{ color: 'rgba(255, 255, 255, 0.12)' }}
          >
            Living structure from rhythm
          </p>
        </Link>
      </div>
      )}

      {appSurfaceToggle}

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
            className="fixed inset-0 z-30 bg-black/42"
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
            ref={guideCalloutRef}
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
          onOpenOrbitEditor={handleOpenOrbitEditor}
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
          onToggleHelp={handleToggleHelpGuide}
          onTogglePresentation={handleTogglePresentation}
          onRandomPattern={handleRandomPattern}
          onRemixPattern={handleRemixPattern}
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
        currentSurface={appSurface}
        harmonySettings={harmonySettings}
        geometryMode={geometryMode}
        interferenceSettings={interferenceSettings}
        builtInScenes={BUILT_IN_SCENES.map(({ id, name, description, thumbnailDataUrl, snapshot }) => ({ id, name, description, thumbnailDataUrl, geometryMode: snapshot.geometryMode }))}
        premiumScenes={PREMIUM_SCENES.map(({ id, name, description, thumbnailDataUrl, snapshot }) => ({ id, name, description, thumbnailDataUrl, geometryMode: snapshot.geometryMode }))}
        savedScenes={savedScenes.map(({ id, name, updatedAt, thumbnailDataUrl, snapshot }) => ({ id, name, updatedAt, thumbnailDataUrl, geometryMode: snapshot.geometryMode }))}
        exportRecords={exportRecords}
        signedIn={isSignedIn}
        accountPersistenceLoading={authLoading || cloudPersistenceLoading}
        localSceneCount={localSavedScenes.length}
        onClose={() => setSidebarOpen(false)}
        onSurfaceChange={handleAppSurfaceChange}
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
        onImportLocalScenes={handleImportLocalScenes}
        onLoadScene={handleLoadScene}
        onLoadBuiltInScene={handleLoadBuiltInScene}
        onDeleteScene={handleDeleteScene}
        onExportScene={handleExportScene}
        onImportScene={handleImportScene}
        onExportPng={handleExportPng}
        onExportVideo={handleExportVideo}
        isRecordingVideo={recordingVideo}
        onHardReset={handleHardReset}
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

      {proPromptOverlay}
    </div>
  );
}

export const Route = createFileRoute('/app')({
  component: OrbitalPolymeter,
});
