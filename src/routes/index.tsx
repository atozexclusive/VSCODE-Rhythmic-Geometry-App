// ============================================================
// Orbital Polymeter — Main Application Route
// Orchestrates engine state, canvas, sidebar, transport bar
// ============================================================

import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useRef } from 'react';
import OrbitalCanvas from '../components/OrbitalCanvas';
import OrbitSidebar from '../components/OrbitSidebar';
import TransportBar from '../components/TransportBar';
import RadialMenu from '../components/RadialMenu';
import { useIsMobile } from '../hooks/use-mobile';
import {
  DEFAULT_HARMONY_SETTINGS,
  type HarmonySettings,
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
  stepEngineByBeats,
  DEFAULT_ORBITS,
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
  },
];

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

  const handleSaveScene = useCallback(() => {
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

    const newScene: SavedScene = {
      id: globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}`,
      name: defaultName,
      updatedAt: now,
      snapshot,
    };

    setSavedScenes((current) => {
      const next = [newScene, ...current];
      persistSavedScenes(next);
      return next;
    });
  }, [engineState.orbits, engineState.speedMultiplier, geometryMode, harmonySettings, interferenceSettings, savedScenes.length, traceMode]);

  const handleSaveSceneAs = useCallback(
    (name: string) => {
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

      const newScene: SavedScene = {
        id: globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}`,
        name: sceneName,
        updatedAt: now,
        snapshot,
      };

      setSavedScenes((current) => {
        const next = [newScene, ...current];
        persistSavedScenes(next);
        return next;
      });
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

  const handleExportPng = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (canvasEl && (canvasEl as any).__exportPng) {
      (canvasEl as any).__exportPng();
    }
  }, []);

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

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#111116] select-none">
      {/* Canvas */}
      <OrbitalCanvas
        ref={canvasRef}
        engineState={engineState}
        traceMode={traceMode}
        harmonySettings={harmonySettings}
        geometryMode={geometryMode}
        interferenceSettings={interferenceSettings}
        onOrbitLongPress={handleOrbitLongPress}
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
            'Tap an orbit to edit color. Use Help for mode guidance and Menu for deeper settings.'
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
            <div className="mt-3 space-y-3 text-[11px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.62)' }}>
              <p><span style={{ color: '#00FFAA' }}>Standard</span> connects all active orbits into a shared string-art field.</p>
              <p><span style={{ color: '#88CCFF' }}>Interference</span> traces one live path from the relationship between the selected pair.</p>
              <p><span style={{ color: '#FFAA00' }}>Sweep</span> plots a finite sampled figure from the selected pair using the old canonical sweep.</p>
              <p>Pair controls only matter in Interference and Sweep. They choose which two orbits generate the pair path.</p>
              <p><span style={{ color: '#00FFAA' }}>Trace</span> keeps drawing motion history so the full structure can accumulate.</p>
              <p>If you are new: pick a mode, press Play, try a built-in scene, then change one ratio at a time.</p>
            </div>
          </div>
        </>
      )}

      {/* Transport Bar */}
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

      {/* Sidebar */}
      <OrbitSidebar
        orbits={engineState.orbits}
        isOpen={sidebarOpen}
        harmonySettings={harmonySettings}
        geometryMode={geometryMode}
        interferenceSettings={interferenceSettings}
        builtInScenes={BUILT_IN_SCENES.map(({ id, name, description }) => ({ id, name, description }))}
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
