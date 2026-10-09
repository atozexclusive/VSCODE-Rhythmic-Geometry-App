import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voiceToFrequency, DEFAULT_HARMONY_SETTINGS, type HarmonySettings } from '../src/lib/audioEngine';
import { createOrbit, DEFAULT_ORBITS, tick, resetEngine } from '../src/lib/orbitalEngine';
import { buildOrbitMidiFile } from '../src/lib/orbitMidi';
const voice = { orbitIndex: 0, pulseCount: 3, radius: 90, color: '#00FFAA' };
const harmony: HarmonySettings = { ...DEFAULT_HARMONY_SETTINGS, tonePreset: 'scale-quantized', mappingMode: 'orbit-index' };
const midi = (frequency: number) => Math.round(69 + 12 * Math.log2(frequency / 440));
const notes = (updates: Partial<HarmonySettings>, length = 6) => Array.from({ length }, (_, hitIndex) => midi(voiceToFrequency({ ...voice, hitIndex }, { ...harmony, ...updates })));
test('scale motion ascends, descends, bounces, and arpeggiates deterministically', () => {
  assert.deepEqual(notes({ noteMotion: 'ascending' }), [60,62,64,67,69,60]);
  assert.deepEqual(notes({ noteMotion: 'descending' }), [69,67,64,62,60,69]);
  assert.deepEqual(notes({ noteMotion: 'up-down' }, 9), [60,62,64,67,69,67,64,62,60]);
  assert.deepEqual(notes({ noteMotion: 'arpeggio' }), [60,64,69,62,67,60]);
  assert.deepEqual(notes({ noteMotion: 'fixed' }), [60,60,60,60,60,60]);
});
test('octave range and layer spacing change pitch without changing hits', () => {
  assert.deepEqual(notes({ noteMotion: 'ascending', arpeggioOctaves: 2 }), [60,62,64,67,69,72]);
  assert.deepEqual(notes({ octaveShift: -1 }, 1), [48]);
  assert.equal(midi(voiceToFrequency({ ...voice, orbitIndex: 2 }, { ...harmony, pitchSpacing: 'wide' })), 84);
  assert.equal(midi(voiceToFrequency({ ...voice, orbitIndex: 2 }, { ...harmony, pitchSpacing: 'close' })), 64);
  assert.equal(voiceToFrequency(voice, DEFAULT_HARMONY_SETTINGS), voiceToFrequency({ ...voice, hitIndex: 99 }, DEFAULT_HARMONY_SETTINGS));
});
test('restart resets hit indices and MIDI uses the same ascending scale', () => {
  const orbit = createOrbit(DEFAULT_ORBITS[0]);
  const state = { orbits: [orbit], playing: true, speedMultiplier: 1, elapsedBeats: 0, lastTimestamp: 0, baseBPM: 120 };
  orbit.lastTriggerBeat = 9; resetEngine(state); state.playing = true;
  tick(state, 100, 0, 0); tick(state, 120, 0, 0);
  assert.ok(orbit.lastTriggerBeat <= 0);
  const data = buildOrbitMidiFile([orbit], { ...harmony, noteMotion: 'ascending' }, 120, 3, { bars: 4 });
  const pitches: number[] = [];
  let i = 22;
  const variable = () => { let v = 0, b; do { b = data[i++]; v = (v << 7) | (b & 127); } while (b & 128); return v; };
  while (i < data.length) {
    variable(); const status = data[i++];
    if (status === 255) { i++; const n = variable(); i += n; }
    else { const note = data[i++]; const velocity = data[i++]; if (status === 144 && velocity > 0) pitches.push(note); }
  }
  assert.deepEqual(pitches.slice(0,6), [60,62,64,67,69,60]);
});
test('orbit impacts stay centered on the exact 12 o\'clock crossing', () => {
  const orbit = createOrbit({ ...DEFAULT_ORBITS[0], radius: 90, pulseCount: 3 });
  const state = { orbits: [orbit], playing: true, speedMultiplier: 1, elapsedBeats: 0, lastTimestamp: 0, baseBPM: 120 };
  const [impact] = tick(state, 100, 240, 180);

  assert.deepEqual(
    { x: impact.x, y: impact.y },
    { x: 240, y: 90 },
  );
});
