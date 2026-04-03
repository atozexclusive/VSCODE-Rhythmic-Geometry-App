// ============================================================
// Orbital Polymeter — Main Application Route
// Orchestrates engine state, canvas, sidebar, transport bar
// ============================================================

import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useRef } from 'react';
import { CircleHelp, Menu, Minus, Pause, Play, Plus, RotateCcw, SkipForward, Trash2, Volume2, VolumeX } from 'lucide-react';
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
const MANUAL_STEP_BEATS = 0.25;
const DEFAULT_SCENE_SPEED = 3;
const HELP_SECTIONS = [
  {
    title: 'Modes',
    accent: '#00FFAA',
    items: [
      { label: 'Standard', color: '#00FFAA', text: 'Connects all active orbits into one shared string field.' },
      { label: 'Interference', color: '#88CCFF', text: 'Traces a live path from the relationship between Pair A and Pair B.' },
      { label: 'Sweep', color: '#FFAA00', text: 'Draws a finite sampled figure from the selected pair.' },
    ],
  },
  {
    title: 'Motion',
    accent: '#88CCFF',
    items: [
      { label: 'Play', color: '#00FFAA', text: 'Starts or pauses the full motion and sound.' },
      { label: 'Step', color: '#88CCFF', text: 'Advances one small beat without free-running playback.' },
      { label: 'Reset', color: '#FFAA00', text: 'Restarts motion from the beginning and clears the current path.' },
      { label: 'Trace', color: '#00FFAA', text: 'Keeps the path history visible so the form can accumulate.' },
    ],
  },
  {
    title: 'Editing',
    accent: '#FF3366',
    items: [
      { label: 'Long-Press Orbit', color: '#FF3366', text: 'Opens quick color and note-role editing for one orbit.' },
      { label: 'Pair A / Pair B', color: '#88CCFF', text: 'Only matters in Interference and Sweep. These two orbits drive the derived shape.' },
      { label: 'Menu', color: '#FFFFFF', text: 'Holds deeper orbit controls, scenes, sound settings, and exports.' },
    ],
  },
  {
    title: 'Sound',
    accent: '#FFAA00',
    items: [
      { label: 'Original Sound', color: '#FFFFFF', text: 'Uses the raw original tone behavior.' },
      { label: 'Scale Key', color: '#00FFAA', text: 'Locks notes to a key center and scale palette.' },
      { label: 'Audio', color: '#FFAA00', text: 'Mutes or restores the app without changing geometry.' },
    ],
  },
] as const;

type SceneOrbitSnapshot = Omit<Orbit, 'id' | 'phase' | 'lastTriggerBeat'>;

interface SceneInterferenceSettings {
  sourceOrbitAIndex: number | null;
  sourceOrbitBIndex: number | null;
  showConnectors: boolean;
}

interface SceneSnapshot {
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

interface BuiltInScene {
  id: string;
  name: string;
  description: string;
  snapshot: SceneSnapshot;
  thumbnailDataUrl: string;
}

function createSceneThumbnailSvg(snapshot: SceneSnapshot): string {
  const size = 160;
  const center = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
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
  const maxRadius = Math.max(...traceOrbits.map((orbit) => orbit.radius), 1);
  const standardScale = (size * 0.39) / maxRadius;
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
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(center, 0);
  ctx.lineTo(center, size);
  ctx.moveTo(0, center);
  ctx.lineTo(size, center);
  ctx.stroke();

  const drawOrbitRings = () => {
    for (const orbit of traceOrbits) {
      ctx.strokeStyle = `${orbit.color}26`;
      ctx.lineWidth = 1;
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
      const sweepScale = Math.max(1, (size / 2 - 14) / maxModelRadius);
      const steps = 420;
      let previousPoint: { x: number; y: number } | null = null;

      if (innerOrbit && outerOrbit && innerOrbit.id !== outerOrbit.id) {
        ctx.strokeStyle = '#32CD32';
        ctx.lineWidth = 0.9;
        ctx.globalAlpha = 0.88;
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * (20 * Math.PI);
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
      const beatsWindow = Math.max(48, Math.max(...traceOrbits.map((orbit) => orbit.pulseCount)) * 10);
      const steps = 420;

      if (innerOrbit && outerOrbit && innerOrbit.id !== outerOrbit.id) {
        ctx.strokeStyle = '#32CD32';
        ctx.lineWidth = 0.9;
        ctx.globalAlpha = 0.85;
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
      const beatsWindow = Math.max(36, Math.max(...traceOrbits.map((orbit) => orbit.pulseCount)) * 8);
      const steps = 240;

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
            ctx.globalAlpha = 0.34 / totalPairs;
            ctx.lineWidth = 0.8;
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
    ctx.arc(pos.x, pos.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/jpeg', 0.78);
}

const BUILT_IN_SCENES: BuiltInScene[] = [
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
  scene.thumbnailDataUrl = createSceneThumbnailSvg(scene.snapshot);
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
  const [engineState] = useState<EngineState>(() => {
    const state = createEngineState();
    state.orbits = DEFAULT_ORBITS.map((def) => createOrbit(def));
    return state;
  });

  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [traceMode, setTraceMode] = useState(true);
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
            };
          })
          .filter((orbit): orbit is { id: string; label: string; pulseCount: number } => Boolean(orbit))
  );
  const mobileQuickOrbits =
    geometryMode === 'standard-trace'
      ? engineState.orbits.map((orbit, index) => ({
          id: orbit.id,
          label: `Orbit ${index + 1}`,
          pulseCount: orbit.pulseCount,
          direction: orbit.direction,
        }))
      : activePairControls.map((orbit) => {
          const match = engineState.orbits.find((entry) => entry.id === orbit.id);
          return {
            ...orbit,
            direction: match?.direction ?? 1,
          };
        });
  const modeDescription =
    geometryMode === 'standard-trace'
      ? 'Shared multi-orbit string field.'
      : geometryMode === 'interference-trace'
        ? 'Live derived path from the selected pair.'
        : 'Finite sampled sweep from the selected pair.';

  if (isMobile) {
    return (
      <div className="min-h-[100svh] overflow-y-auto bg-[#111116] pt-3 pb-8 select-none">
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="relative h-[76svh] min-h-[540px] overflow-hidden">
              <OrbitalCanvas
                ref={canvasRef}
                engineState={engineState}
                traceMode={traceMode}
                harmonySettings={harmonySettings}
                geometryMode={geometryMode}
                interferenceSettings={interferenceSettings}
                onOrbitLongPress={handleOrbitLongPress}
                className="absolute inset-0 w-full h-full"
              />
            </div>
            <div className="h-6" />
          </div>

          <div className="mt-14 px-3 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleTogglePlay}
                className="px-2 py-3 rounded-xl flex flex-col items-center gap-1"
                style={{
                  background: engineState.playing ? 'rgba(255,51,102,0.18)' : 'rgba(0,255,170,0.18)',
                  border: `1px solid ${engineState.playing ? 'rgba(255,51,102,0.35)' : 'rgba(0,255,170,0.35)'}`,
                  color: engineState.playing ? '#FF3366' : '#00FFAA',
                }}
              >
                {engineState.playing ? <Pause size={19} /> : <Play size={19} />}
                <span className="text-[10px] font-mono uppercase tracking-[0.14em]">{engineState.playing ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={handleStepForward}
                className="px-2 py-3 rounded-xl flex flex-col items-center gap-1"
                style={{ background: 'rgba(51,136,255,0.12)', border: '1px solid rgba(51,136,255,0.25)', color: '#88CCFF' }}
              >
                <SkipForward size={19} />
                <span className="text-[10px] font-mono uppercase tracking-[0.14em]">Step</span>
              </button>
              <button
                onClick={handleReset}
                className="px-2 py-3 rounded-xl flex flex-col items-center gap-1"
                style={{ background: 'rgba(255,170,0,0.14)', border: '1px solid rgba(255,170,0,0.26)', color: '#FFAA00' }}
              >
                <RotateCcw size={19} />
                <span className="text-[10px] font-mono uppercase tracking-[0.14em]">Reset</span>
              </button>
              <button
                onClick={handleToggleMute}
                className="px-2 py-3 rounded-xl flex flex-col items-center gap-1"
                style={{ background: muted ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.76)' }}
              >
                {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                <span className="text-[10px] font-mono uppercase tracking-[0.14em]">{muted ? 'Muted' : 'Audio'}</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.32)' }}>
                Long-press an orbit to edit color or note role.
              </div>
              <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {engineState.speedMultiplier.toFixed(1)}x
              </div>
            </div>
          </div>

          <div
            className="-mt-2 rounded-2xl border p-4 space-y-4"
            style={{ background: 'rgba(17,17,22,0.88)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.48)' }}>
                  Orbits
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Quick ratio controls on the main page. Use Menu for deeper orbit editing.
                </p>
                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Sliders stay in the 1-10 range for touch control. Type any higher number directly.
                </p>
              </div>
              {geometryMode === 'standard-trace' && (
                <button
                  onClick={handleAddOrbit}
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ color: '#00FFAA', background: 'rgba(0,255,170,0.08)', border: '1px solid rgba(0,255,170,0.22)' }}
                  title="Add orbit"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            {mobileQuickOrbits.map((orbit) => (
              <div
                key={orbit.id}
                className="rounded-xl border p-3 space-y-3"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] font-mono uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.78)' }}>
                    {orbit.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleOrbitDirection(orbit.id)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.72)' }}
                    >
                      {orbit.direction === 1 ? 'CW' : 'CCW'}
                    </button>
                    {geometryMode === 'standard-trace' && engineState.orbits.length > 1 && (
                      <button
                        onClick={() => handleDeleteOrbit(orbit.id)}
                        className="h-9 w-9 rounded-xl flex items-center justify-center"
                        style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        title={`Remove ${orbit.label}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAdjustQuickOrbit(orbit.id, -1)}
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.76)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    title={`Lower ${orbit.label}`}
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
                    className="flex-1 accent-white"
                  />
                  <button
                    onClick={() => handleAdjustQuickOrbit(orbit.id, 1)}
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.76)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    title={`Raise ${orbit.label}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Type for 11+
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={orbit.pulseCount}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => handleSetQuickOrbit(orbit.id, parseInt(e.target.value) || 1)}
                    className="w-20 px-2 py-2 rounded-xl border text-center text-[14px] font-mono focus:outline-none"
                    style={{ color: 'rgba(255,255,255,0.84)', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl border p-4 space-y-4"
            style={{ background: 'rgba(17,17,22,0.88)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.48)' }}>
                Geometry & Tempo
              </div>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Choose the drawing method, then shape speed and direction.
              </p>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.48)' }}>
                  {geometryMode === 'standard-trace' ? 'Standard' : geometryMode === 'interference-trace' ? 'Interference' : 'Sweep'}
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {modeDescription}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleTrace}
                  className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{
                    background: traceMode ? 'rgba(0,255,170,0.14)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${traceMode ? 'rgba(0,255,170,0.28)' : 'rgba(255,255,255,0.08)'}`,
                    color: traceMode ? '#00FFAA' : 'rgba(255,255,255,0.72)',
                  }}
                >
                  {traceMode ? 'Trace On' : 'Trace Off'}
                </button>
                <button
                  onClick={() => setHelpOpen((open) => !open)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}
                >
                  <CircleHelp size={18} />
                </button>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}
                >
                  <Menu size={18} />
                </button>
              </div>
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
            <div>
              <div className="flex items-center justify-between text-[11px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
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
                className="w-full mt-2 accent-white"
              />
            </div>
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

          <div
            className="rounded-2xl border p-4 space-y-4"
            style={{ background: 'rgba(17,17,22,0.88)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.48)' }}>
                Sound
              </div>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Keep the main musical choices close. Deeper harmony still lives in Menu.
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
              {harmonySettings.tonePreset === 'original' ? 'Original Sound' : 'Scale Key'}
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

          <div
            className="rounded-2xl border p-4 space-y-4"
            style={{ background: 'rgba(17,17,22,0.88)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.48)' }}>
                  Presets & Scenes
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Quick ratio starts below. Open Menu for built-in scenes, save, export, and scene files.
                </p>
              </div>
              <button
                onClick={() => setSidebarOpen(true)}
                className="px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Open Menu
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESET_RATIOS).slice(0, 6).map(([label, preset]) => (
                <button
                  key={label}
                  onClick={() => handleLoadPreset(preset)}
                  className="px-3 py-2 rounded-xl text-[11px] font-mono"
                  style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {helpOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/35 backdrop-blur-sm" onClick={() => setHelpOpen(false)} />
            <div
              className="fixed left-3 right-3 bottom-6 z-40 rounded-2xl border p-4"
              style={{
                background: 'rgba(17,17,22,0.94)',
                backdropFilter: 'blur(16px)',
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Quick Help
              </div>
              <div className="mt-3 space-y-3">
                {HELP_SECTIONS.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-xl border px-3 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: section.accent }}>
                      {section.title}
                    </div>
                    <div className="mt-2 space-y-2">
                      {section.items.map((item) => (
                        <div key={item.label} className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
                          <span style={{ color: item.color }}>{item.label}</span>
                          <span style={{ color: 'rgba(255,255,255,0.44)' }}> — </span>
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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

  return (
    <div className={isMobile ? 'relative min-h-[100svh] overflow-y-auto bg-[#111116] select-none pb-8' : 'fixed inset-0 overflow-hidden bg-[#111116] select-none'}>
      {/* Canvas */}
      {isMobile && <div className="h-[68svh] min-h-[420px]" />}
      <OrbitalCanvas
        ref={canvasRef}
        engineState={engineState}
        traceMode={traceMode}
        harmonySettings={harmonySettings}
        geometryMode={geometryMode}
        interferenceSettings={interferenceSettings}
        onOrbitLongPress={handleOrbitLongPress}
        className={isMobile ? 'absolute inset-x-0 top-0 w-full h-[68svh] min-h-[420px]' : undefined}
      />

      {/* Title */}
      <div className={`fixed z-20 pointer-events-none ${isMobile ? 'top-3 left-1/2 -translate-x-1/2 text-center' : 'top-4 left-5'}`}>
        <h1
          className={`${isMobile ? 'text-[11px] tracking-[0.24em]' : 'text-sm tracking-[0.3em]'} font-light uppercase`}
          style={{ color: 'rgba(255, 255, 255, 0.25)' }}
        >
          Orbital Polymeter
        </h1>
        <p
          className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} font-mono mt-1`}
          style={{ color: 'rgba(255, 255, 255, 0.12)' }}
        >
          Polyrhythmic Geometry Explorer
        </p>
      </div>

      {/* Help hint */}
      <div className={`fixed z-20 pointer-events-none ${isMobile ? 'top-16 left-1/2 -translate-x-1/2' : 'top-4 right-5'}`}>
        <p
          className={`font-mono leading-relaxed ${isMobile ? 'text-[9px] text-center' : 'text-[10px] text-right'}`}
          style={{ color: 'rgba(255, 255, 255, 0.15)' }}
        >
          {isMobile ? (
            'Long-press an orbit to edit. Use Menu for deeper settings.'
          ) : (
            <>
              tap orbit for color controls
              <br />
              use help for mode guidance
            </>
          )}
        </p>
      </div>

      {helpOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
            onClick={() => setHelpOpen(false)}
          />
          <div
            className={`fixed z-40 rounded-2xl border ${isMobile ? 'left-3 right-3 bottom-36 p-4' : 'right-6 bottom-28 w-[360px] p-5'}`}
            style={{
              background: 'rgba(17, 17, 22, 0.9)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
            }}
          >
            <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Quick Help
            </div>
            <div className="mt-3 space-y-3">
              {HELP_SECTIONS.map((section) => (
                <div
                  key={section.title}
                  className="rounded-xl border px-3 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: section.accent }}>
                    {section.title}
                  </div>
                  <div className="mt-2 space-y-2">
                    {section.items.map((item) => (
                      <div key={item.label} className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
                        <span style={{ color: item.color }}>{item.label}</span>
                        <span style={{ color: 'rgba(255,255,255,0.44)' }}> — </span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {isMobile && (
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
                    Pair Ratios
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
                {harmonySettings.tonePreset === 'original' ? 'Original Sound' : 'Scale Key'}
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
          muted={muted}
          showHelp={helpOpen}
          geometryMode={geometryMode}
          tonePreset={harmonySettings.tonePreset}
          rootNote={harmonySettings.rootNote}
          scaleName={harmonySettings.scaleName}
          quickOrbitControls={activePairControls}
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
          onToggleMute={handleToggleMute}
          onToggleHelp={() => setHelpOpen((open) => !open)}
          onSoundModeChange={(tonePreset) => handleHarmonyChange({ tonePreset })}
          onRootNoteChange={(rootNote) => handleHarmonyChange({ rootNote })}
          onScaleChange={(scaleName) => handleHarmonyChange({ scaleName })}
          onReset={handleReset}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      </div>

      {/* Sidebar */}
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

      {/* Radial Menu */}
      {radialMenu && (
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

export const Route = createFileRoute('/')({
  component: OrbitalPolymeter,
});
