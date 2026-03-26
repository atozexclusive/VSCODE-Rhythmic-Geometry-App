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
  resumeAudio,
  stopAllAudio,
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

const SCENES_STORAGE_KEY = 'orbital-polymeter-scenes';
const MANUAL_STEP_BEATS = 0.25;

type SceneOrbitSnapshot = Omit<Orbit, 'id' | 'phase' | 'lastTriggerBeat'>;

interface SceneSnapshot {
  orbits: SceneOrbitSnapshot[];
  speedMultiplier: number;
  traceMode: boolean;
  harmonySettings: HarmonySettings;
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
      speedMultiplier: 8,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'C',
        scaleName: 'majorPentatonic',
        mappingMode: 'orbit-index',
        manualOrbitRoles: true,
      },
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
      speedMultiplier: 10,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'D',
        scaleName: 'dorian',
        mappingMode: 'pulse-count',
        manualOrbitRoles: true,
      },
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
      speedMultiplier: 6,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'A',
        scaleName: 'lydian',
        mappingMode: 'radius',
        manualOrbitRoles: true,
      },
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
      speedMultiplier: 4,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'original',
        rootNote: 'C',
        scaleName: 'majorPentatonic',
        mappingMode: 'color-hue',
        manualOrbitRoles: false,
      },
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
      speedMultiplier: 5.5,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'G',
        scaleName: 'dorian',
        mappingMode: 'orbit-index',
        manualOrbitRoles: true,
      },
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
      speedMultiplier: 3.2,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'F',
        scaleName: 'lydian',
        mappingMode: 'radius',
        manualOrbitRoles: true,
      },
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
      speedMultiplier: 9,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'E',
        scaleName: 'wholeTone',
        mappingMode: 'pulse-count',
        manualOrbitRoles: true,
      },
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
      speedMultiplier: 6.8,
      traceMode: true,
      harmonySettings: {
        tonePreset: 'scale-quantized',
        rootNote: 'E',
        scaleName: 'aeolian',
        mappingMode: 'color-hue',
        manualOrbitRoles: true,
      },
    },
  },
];

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
    },
  };
}

function applySceneSnapshot(
  engineState: EngineState,
  snapshot: SceneSnapshot,
  setTraceMode: (traceMode: boolean) => void,
  setHarmonySettings: (settings: HarmonySettings) => void,
  clearTraces: () => void,
): void {
  stopAllAudio();
  engineState.playing = false;
  engineState.speedMultiplier = snapshot.speedMultiplier;
  engineState.orbits = snapshot.orbits.map((orbit) => createOrbit(orbit));
  resetEngine(engineState);
  setTraceMode(snapshot.traceMode);
  setHarmonySettings(snapshot.harmonySettings);
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
  const [traceMode, setTraceMode] = useState(true);
  const [harmonySettings, setHarmonySettings] = useState<HarmonySettings>(DEFAULT_HARMONY_SETTINGS);
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

  const handleSpeedChange = useCallback(
    (speed: number) => {
      engineState.speedMultiplier = speed;
      rerender();
    },
    [engineState, rerender],
  );

  const handleToggleTrace = useCallback(() => {
    setTraceMode((t) => !t);
  }, []);

  const handleClearTraces = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (canvasEl && (canvasEl as any).__clearTraces) {
      (canvasEl as any).__clearTraces();
    }
    rerender();
  }, [rerender]);

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
        rerender();
      }
    },
    [engineState, rerender],
  );

  const handleDeleteOrbit = useCallback(
    (id: string) => {
      engineState.orbits = engineState.orbits.filter((o) => o.id !== id);
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
      handleClearTraces();
      resumeAudio();
      engineState.playing = true;
      engineState.lastTimestamp = -1;
      setSidebarOpen(false);
      rerender();
    },
    [engineState, handleClearTraces, rerender],
  );

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
  }, [engineState.orbits, engineState.speedMultiplier, harmonySettings, savedScenes.length, traceMode]);

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
    [engineState.orbits, engineState.speedMultiplier, harmonySettings, savedScenes.length, traceMode],
  );

  const handleLoadScene = useCallback(
    (sceneId: string) => {
      const scene = savedScenes.find((entry) => entry.id === sceneId);
      if (!scene) {
        return;
      }
      applySceneSnapshot(engineState, scene.snapshot, setTraceMode, setHarmonySettings, handleClearTraces);
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
      applySceneSnapshot(engineState, scene.snapshot, setTraceMode, setHarmonySettings, handleClearTraces);
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

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#111116] select-none">
      {/* Canvas */}
      <OrbitalCanvas
        ref={canvasRef}
        engineState={engineState}
        traceMode={traceMode}
        harmonySettings={harmonySettings}
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
            'Hold an orbit to edit it. Use Menu for scenes, sound, and presets.'
          ) : (
            <>
              long-press orbit for options
              <br />
              use sidebar to manage orbits
            </>
          )}
        </p>
      </div>

      {/* Transport Bar */}
      <TransportBar
        playing={engineState.playing}
        speedMultiplier={engineState.speedMultiplier}
        traceMode={traceMode}
        onTogglePlay={handleTogglePlay}
        onStepForward={handleStepForward}
        onClearTraces={handleClearTraces}
        onSpeedChange={handleSpeedChange}
        onToggleTrace={handleToggleTrace}
        onReset={handleReset}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {/* Sidebar */}
      <OrbitSidebar
        orbits={engineState.orbits}
        isOpen={sidebarOpen}
        harmonySettings={harmonySettings}
        builtInScenes={BUILT_IN_SCENES.map(({ id, name, description }) => ({ id, name, description }))}
        savedScenes={savedScenes}
        onClose={() => setSidebarOpen(false)}
        onUpdateOrbit={handleUpdateOrbit}
        onDeleteOrbit={handleDeleteOrbit}
        onAddOrbit={handleAddOrbit}
        onLoadPreset={handleLoadPreset}
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
          onChangeColor={handleRadialColorChange}
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
