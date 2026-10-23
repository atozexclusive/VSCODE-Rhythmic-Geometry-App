import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOrbitAudioExportPlan } from '../src/lib/orbitAudioTimeline';
import { createOrbit, computeOrbitRotations, DEFAULT_ORBITS, type EngineState } from '../src/lib/orbitalEngine';

function state(counts: number[]): EngineState {
  return { orbits: counts.map((pulseCount, i) => ({ ...createOrbit({ ...DEFAULT_ORBITS[i % DEFAULT_ORBITS.length], pulseCount }), id: `orbit-${i}` })), playing: false, speedMultiplier: 12, baseBPM: 120, elapsedBeats: 0, lastTimestamp: -1 };
}

test('high-ratio Standard exports keep every analytically computed crossing', () => {
  const engine = state([97, 101, 997]);
  for (const plan of getOrbitAudioExportPlan(engine)) {
    const beatsPerSecond = engine.baseBPM / 60 * engine.speedMultiplier;
    for (let hit = 1; hit < 200; hit++) {
      const rotations = computeOrbitRotations(hit * plan.secondsPerHit * beatsPerSecond, plan.orbit.pulseCount);
      assert.ok(Math.abs(rotations - hit) < 1e-10);
    }
  }
});

test('Sweep uses its actual 48-beat, ten-turn parameter and selected sources', () => {
  const engine = state([97, 101, 997, 31]);
  const plans = getOrbitAudioExportPlan(engine, undefined, { geometryMode: 'sweep', interferenceSettings: { sourceOrbitAId: 'orbit-0', sourceOrbitBId: 'orbit-2' } });
  assert.deepEqual(plans.map((plan) => plan.orbitIndex), [0, 2]);
  for (const plan of plans) {
    const beatsAtHit = plan.secondsPerHit * 24;
    assert.ok(Math.abs(plan.orbit.pulseCount * beatsAtHit * 10 / 48 - 1) < 1e-12);
    assert.ok(plan.secondsPerHit < 0.03, 'high Sweep ratios must not wait several seconds like Standard');
  }
});

test('Interference exports only its selected audible source voices', () => {
  const engine = state([99, 100, 101, 103]);
  engine.orbits[2].soundEnabled = false;
  const plans = getOrbitAudioExportPlan(engine, undefined, { geometryMode: 'interference-trace', interferenceSettings: { sourceOrbitAId: 'orbit-1', sourceOrbitBId: 'orbit-2' } });
  assert.deepEqual(plans.map((plan) => plan.orbitIndex), [1]);
  assert.equal(plans[0].secondsPerHit, 100 / 24);
});

test('disabled turns-per-cycle settings cannot silently drop exported voices', () => {
  const engine = state([97, 101]);
  const normal = getOrbitAudioExportPlan(engine);
  const stale = getOrbitAudioExportPlan(engine, 'turns-per-cycle');
  assert.deepEqual(stale.map((plan) => plan.secondsPerHit), normal.map((plan) => plan.secondsPerHit));
});
