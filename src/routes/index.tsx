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
  DEFAULT_ORBITS,
} from '../lib/orbitalEngine';

const SCENES_STORAGE_KEY = 'orbital-polymeter-scenes';

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

function OrbitalPolymeter() {
  const [engineState] = useState<EngineState>(() => {
    const state = createEngineState();
    state.orbits = DEFAULT_ORBITS.map((def) => createOrbit(def));
    return state;
  });

  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [traceMode, setTraceMode] = useState(false);
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

  const handleHarmonyChange = useCallback((updates: Partial<HarmonySettings>) => {
    setHarmonySettings((current) => ({ ...current, ...updates }));
  }, []);

  const handleReset = useCallback(() => {
    stopAllAudio();
    engineState.playing = false;
    resetEngine(engineState);
    // Clear traces
    const canvasEl = document.querySelector('canvas');
    if (canvasEl && (canvasEl as any).__clearTraces) {
      (canvasEl as any).__clearTraces();
    }
    rerender();
  }, [engineState, rerender]);

  const handleUpdateOrbit = useCallback(
    (
      id: string,
      updates: Partial<Pick<Orbit, 'pulseCount' | 'radius' | 'direction' | 'color'>>,
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
        }),
      );
      rerender();
    },
    [engineState, rerender],
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
      orbits: engineState.orbits.map(({ pulseCount, radius, direction, color }) => ({
        pulseCount,
        radius,
        direction,
        color,
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
        orbits: engineState.orbits.map(({ pulseCount, radius, direction, color }) => ({
          pulseCount,
          radius,
          direction,
          color,
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

      stopAllAudio();
      engineState.playing = false;
      engineState.speedMultiplier = scene.snapshot.speedMultiplier;
      engineState.orbits = scene.snapshot.orbits.map((orbit) => createOrbit(orbit));
      resetEngine(engineState);
      setTraceMode(scene.snapshot.traceMode);
      setHarmonySettings(scene.snapshot.harmonySettings);

      const canvasEl = document.querySelector('canvas');
      if (canvasEl && (canvasEl as any).__clearTraces) {
        (canvasEl as any).__clearTraces();
      }

      rerender();
    },
    [engineState, rerender, savedScenes],
  );

  const handleDeleteScene = useCallback((sceneId: string) => {
    setSavedScenes((current) => {
      const next = current.filter((scene) => scene.id !== sceneId);
      persistSavedScenes(next);
      return next;
    });
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
      <div className="fixed top-4 left-5 z-20 pointer-events-none">
        <h1
          className="text-sm font-light tracking-[0.3em] uppercase"
          style={{ color: 'rgba(255, 255, 255, 0.25)' }}
        >
          Orbital Polymeter
        </h1>
        <p
          className="text-[10px] font-mono mt-1"
          style={{ color: 'rgba(255, 255, 255, 0.12)' }}
        >
          Polyrhythmic Geometry Explorer
        </p>
      </div>

      {/* Help hint */}
      <div className="fixed top-4 right-5 z-20 pointer-events-none">
        <p
          className="text-[10px] font-mono text-right leading-relaxed"
          style={{ color: 'rgba(255, 255, 255, 0.15)' }}
        >
          long-press orbit for options
          <br />
          use sidebar to manage orbits
        </p>
      </div>

      {/* Transport Bar */}
      <TransportBar
        playing={engineState.playing}
        speedMultiplier={engineState.speedMultiplier}
        traceMode={traceMode}
        onTogglePlay={handleTogglePlay}
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
        onDeleteScene={handleDeleteScene}
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
