import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STUDY_GROOVE_PRESETS, STUDY_MELODIC_GROOVES, STUDY_LAYER_VOICES, cloneStudy, createPolyrhythmSoundSettings } from '../src/lib/polyrhythmStudy';
import { buildPolyrhythmMidiFile } from '../src/lib/polyrhythmMidi';
import { getStudySequencePitches } from '../src/lib/studyPitch';
import { triggerPolyrhythmPulse } from '../src/lib/polyrhythmAudio';

const positions = (steps: boolean[]) => steps.flatMap((active, i) => active ? [i + 1] : []);

test('grooves load with aligned grids, independent percussion, and editable cloned patterns', () => {
  assert.equal(STUDY_GROOVE_PRESETS.length, 6);
  for (const preset of STUDY_GROOVE_PRESETS) {
    const study = cloneStudy(preset.study);
    assert.equal(preset.pro, undefined);
    assert.equal(preset.group, 'grooves');
    assert.equal(study.soundsLinked, false);
    assert.equal(study.ensembleView, true);
    assert.equal(new Set(study.layers.map(l => l.beatCount)).size, 1);
    for (const layer of study.layers) {
      assert.ok(STUDY_LAYER_VOICES.includes(layer.voice!));
      assert.notEqual(layer.voice, 'standard');
      assert.equal(layer.rotationOffset, 0);
      assert.equal(layer.activeSteps.length, layer.beatCount);
      assert.equal(layer.accents.length, layer.beatCount);
      assert.ok(layer.activeSteps.some(Boolean));
      assert.ok(layer.accents.every((accent, i) => !accent || layer.activeSteps[i]));
      assert.equal(layer.soundSettings?.reverbAmount, 0);
    }
    study.layers[0].activeSteps[0] = !study.layers[0].activeSteps[0];
    assert.notDeepEqual(study.layers[0].activeSteps, preset.study.layers[0].activeSteps);
    assert.equal(JSON.parse(JSON.stringify(study)).cycleBeats, study.cycleBeats);
  }
});

test('D&B, shuffle and two-bar son clave preserve their rhythmic placement', () => {
  const dnb = STUDY_GROOVE_PRESETS.find(p => p.id === 'groove-dnb')!.study;
  assert.deepEqual(positions(dnb.layers[0].activeSteps), [1, 11]);
  assert.deepEqual(positions(dnb.layers[1].activeSteps), [5, 13]);
  const shuffle = STUDY_GROOVE_PRESETS.find(p => p.id === 'groove-shuffle')!.study;
  assert.equal(shuffle.layers[0].beatCount, 12);
  assert.deepEqual(positions(shuffle.layers[2].activeSteps), [1, 3, 4, 6, 7, 9, 10, 12]);
  const clave = STUDY_GROOVE_PRESETS.find(p => p.id === 'groove-son-clave')!.study;
  assert.equal(clave.cycleBeats, 8);
  assert.deepEqual(positions(clave.layers[1].activeSteps), [5, 9, 17, 23, 29]);
});

function noteOns(bytes: Uint8Array) {
  let pos = 14;
  const result: { tick: number; channel: number; note: number }[] = [];
  const vlq = () => { let n = 0, b = 0; do { b = bytes[pos++]; n = (n << 7) | (b & 127); } while (b & 128); return n; };
  while (pos < bytes.length) {
    const length = bytes[pos + 4] * 2 ** 24 + (bytes[pos + 5] << 16) + (bytes[pos + 6] << 8) + bytes[pos + 7];
    pos += 8;
    const end = pos + length;
    let tick = 0;
    while (pos < end) {
      tick += vlq();
      const status = bytes[pos++];
      if (status === 255) { pos++; const size = vlq(); pos += size; }
      else { const note = bytes[pos++]; const velocity = bytes[pos++]; if ((status & 240) === 144 && velocity) result.push({tick, channel: status & 15, note}); }
    }
  }
  return result;
}

test('MIDI keeps the two-bar duration and exports drums on General MIDI channel 10', () => {
  const study = STUDY_GROOVE_PRESETS.find(p => p.id === 'groove-son-clave')!.study;
  const notes = noteOns(buildPolyrhythmMidiFile(study));
  assert.ok(notes.every(n => n.channel === 9));
  assert.deepEqual(notes.filter(n => n.note === 75).map(n => n.tick), [480, 960, 1920, 2640, 3360]);
  const backbeat = STUDY_GROOVE_PRESETS[0].study;
  assert.deepEqual(noteOns(buildPolyrhythmMidiFile(backbeat)).filter(n => n.note === 38).map(n => n.tick), [480, 1440]);
});

class Param {
  value = 0;
  setValueAtTime(n: number) { assert.ok(Number.isFinite(n)); this.value = n; }
  exponentialRampToValueAtTime(n: number) { assert.ok(n > 0 && Number.isFinite(n)); this.value = n; }
  linearRampToValueAtTime(n: number) { assert.ok(Number.isFinite(n)); this.value = n; }
}
class AudioNodeMock {
  playbackRate = new Param(); gain = new Param(); frequency = new Param(); Q = new Param(); threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  type = ''; buffer: unknown; started = -1; stopped = -1;
  connect() {} disconnect() {} addEventListener() {}
  start(time: number) { this.started = time; } stop(time: number) { this.stopped = time; }
}
class ContextMock {
  currentTime = 0; sampleRate = 48000; sources: AudioNodeMock[] = []; oscillators: AudioNodeMock[] = []; buffers = 0;
  createGain() { return new AudioNodeMock(); } createBiquadFilter() { return new AudioNodeMock(); } createDynamicsCompressor() { return new AudioNodeMock(); }
  createOscillator() { const node = new AudioNodeMock(); this.oscillators.push(node); return node; }
  createBufferSource() { const node = new AudioNodeMock(); this.sources.push(node); return node; }
  createBuffer(_channels: number, length: number) { this.buffers++; const data = new Float32Array(length); return { getChannelData: () => data }; }
}

test('new percussion schedules bounded voices and shaker reuses one noise buffer', () => {
  const context = new ContextMock();
  const target = { context: context as unknown as AudioContext, outputToSpeakers: false, destination: new AudioNodeMock() as unknown as AudioNode };
  for (const voice of ['clave', 'cascara', 'cowbell', 'shaker', 'shaker'] as const) {
    triggerPolyrhythmPulse({ voice, gain: 0.08, atTime: 2, frequency: 220, sound: createPolyrhythmSoundSettings({reverbAmount: 0}), layerIndex: 0, beatCount: 16, target });
  }
  assert.equal(context.oscillators.length, 7);
  assert.equal(context.sources.length, 2);
  assert.equal(context.buffers, 1);
  for (const source of [...context.sources, ...context.oscillators]) {
    assert.equal(source.started, 2);
    assert.ok(source.stopped > 2 && source.stopped < 2.25);
  }
});


test('musical grooves keep shared timing and transpose all authored notes with the key', () => {
  assert.equal(STUDY_MELODIC_GROOVES.length, 8);
  for (const preset of STUDY_MELODIC_GROOVES) {
    assert.ok(preset.study.layers.length <= 6);
    assert.equal(new Set(preset.study.layers.map(layer => layer.beatCount)).size, 1);
    const authored = preset.study.layers.filter(layer => layer.noteSequence?.length);
    assert.equal(authored.length, 2);
    for (const layer of authored) {
      assert.equal(layer.activeSteps.filter(Boolean).length, layer.noteSequence!.length);
      assert.equal(layer.soundSettings?.pitchMode, 'keyed');
      const sound = { ...preset.study.soundSettings, ...layer.soundSettings, rootNote: 'C' as const };
      const first = getStudySequencePitches(layer.noteSequence, sound, 0)!;
      const transposed = getStudySequencePitches(layer.noteSequence, { ...sound, rootNote: 'D' }, 0)!;
      first.forEach((hz, i) => assert.ok(Math.abs(transposed[i] / hz - 2 ** (2 / 12)) < 1e-9));
      assert.deepEqual(getStudySequencePitches(layer.noteSequence, sound, layer.noteSequence!.length), first);
    }
  }
});

test('chord stabs are full minor triads in audio pitch and MIDI, with matching octave changes', () => {
  const study = STUDY_MELODIC_GROOVES[0].study;
  const layer = study.layers[3];
  const sound = { ...study.soundSettings, ...layer.soundSettings };
  const midi = (hz: number) => Math.round(69 + 12 * Math.log2(hz / 440));
  assert.deepEqual(getStudySequencePitches(layer.noteSequence, sound, 0)!.map(midi), [48, 51, 55]);
  assert.deepEqual(getStudySequencePitches(layer.noteSequence, { ...sound, octaveShift: 1 }, 0)!.map(midi), [60, 63, 67]);
  const exported = noteOns(buildPolyrhythmMidiFile(study));
  assert.deepEqual(exported.filter(note => note.channel === 3 && note.tick === 240).map(note => note.note), [48, 51, 55]);
  const copy = cloneStudy(study);
  copy.layers[3].noteSequence![0][0] = 5;
  assert.equal(study.layers[3].noteSequence![0][0], 0);
});

test('one authored hit schedules simultaneous chord voices without scheduling a second root note', () => {
  const context = new ContextMock();
  const study = STUDY_MELODIC_GROOVES[0].study;
  const layer = study.layers[3];
  triggerPolyrhythmPulse({ noteSequence: layer.noteSequence, layerSound: layer.soundSettings,
    voice: 'standard', frequency: layer.pitchHz, gain: layer.gain, sound: study.soundSettings,
    layerIndex: 3, beatCount: 16, hitIndex: 0, atTime: 2,
    target: { context: context as unknown as AudioContext, outputToSpeakers: false } });
  assert.equal(context.sources.length, 3);
  assert.equal(context.oscillators.length, 0);
  assert.ok(context.sources.every(source => source.started === 2));
});


test('new stab scenes vary their groove and use the intended chord qualities', () => {
  const midi = (hz: number) => Math.round(69 + 12 * Math.log2(hz / 440));
  const chords = (id: string) => {
    const study = STUDY_MELODIC_GROOVES.find(p => p.id === id)!.study;
    const layer = study.layers[3];
    const sound = { ...study.soundSettings, ...layer.soundSettings };
    assert.equal(sound.palette, 'chorus-keys');
    return [0, 2].map(hit => getStudySequencePitches(layer.noteSequence, sound, hit)!.map(midi));
  };
  assert.deepEqual(chords('groove-velvet-breaks'), [[48, 51, 55, 58], [56, 60, 63, 67]]);
  assert.deepEqual(chords('groove-halftime-stabs'), [[50, 53, 57], [58, 62, 65]]);
  assert.deepEqual(chords('groove-dorian-shuffle-stabs'), [[57, 60, 64], [62, 66, 69]]);
  assert.deepEqual(chords('groove-sunrise-stabs'), [[53, 57, 60], [55, 59, 62]]);
  const halftime = STUDY_MELODIC_GROOVES.find(p => p.id === 'groove-halftime-stabs')!.study;
  assert.deepEqual(positions(halftime.layers[1].activeSteps), [9]);
  assert.equal(halftime.bpm, 154);
});
