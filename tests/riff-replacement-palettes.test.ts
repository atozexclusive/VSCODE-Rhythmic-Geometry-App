import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triggerRiffPulse, triggerReferencePulse, triggerBackbeatAccent, triggerSubdivisionPulse, triggerResetCue } from '../src/lib/riffCycleAudio';
import { createRiffCycleStudy, cloneRiffCycleStudy } from '../src/lib/riffCycleStudy';
import { NOTE_NAMES, SCALE_PRESETS } from '../src/lib/audioEngine';

class Param {
  values: number[] = [];
  setValueAtTime(value: number) { this.values.push(value); }
  exponentialRampToValueAtTime(value: number) { this.values.push(value); }
}
class VoiceNode {
  type = ''; frequency = new Param(); gain = new Param(); Q = new Param();
  connections: VoiceNode[] = [];
  connect(node: VoiceNode) { this.connections.push(node); }
  disconnect() {} start() {} stop() {}
}
class Context {
  currentTime = 0;
  destination = new VoiceNode();
  oscillators: VoiceNode[] = [];
  createOscillator() { const node = new VoiceNode(); this.oscillators.push(node); return node; }
  createGain() { return new VoiceNode(); }
  createBiquadFilter() { return new VoiceNode(); }
}

for (const palette of ['muted-djent', 'metal-tick'] as const) {
  test(`${palette}: saved scenes retain palette and replacement voices stay in key`, () => {
    const study = createRiffCycleStudy();
    study.soundSettings = { ...study.soundSettings, palette, pitchMode: 'keyed', rootNote: 'D', scaleName: 'minorPentatonic', reverbAmount: 0, referenceReverbAmount: 0, subdivisionReverbAmount: 0 };
    const restored = cloneRiffCycleStudy(JSON.parse(JSON.stringify(study)));
    assert.equal(restored.soundSettings.palette, palette);
    for (const accented of [false, true]) {
      for (let phraseIndex = 0; phraseIndex < 15; phraseIndex += 1) {
        const context = new Context();
        triggerRiffPulse({ frequency: 120, gain: 0.12, accented, phraseIndex, sound: restored.soundSettings, target: { context: context as unknown as AudioContext, outputToSpeakers: true } });
        assert.ok(context.oscillators.length > 0);
        for (const node of context.oscillators) {
          assert.ok(['sine', 'triangle'].includes(node.type));
          // Pitch must remain in the selected scale, including every overtone.
          for (const frequency of node.frequency.values) {
            const midi = 69 + 12 * Math.log2(frequency / 440);
            assert.ok(Math.abs(midi - Math.round(midi)) < 0.0001);
            const degree = ((Math.round(midi) - NOTE_NAMES.indexOf('D')) % 12 + 12) % 12;
            assert.ok((SCALE_PRESETS.minorPentatonic.intervals as readonly number[]).includes(degree));
          }
          const output = node.connections[0].connections[0];
          assert.ok(output.gain.values.every((gain) => gain > 0 && gain <= 0.22));
          assert.ok(output.connections.includes(context.destination));
        }
      }
    }
  });

  test(`${palette}: timing cues use the softer sound in export output`, () => {
    const context = new Context();
    const destination = new VoiceNode();
    const target = { context: context as unknown as AudioContext, destination: destination as unknown as AudioNode, outputToSpeakers: false };
    const sound = { ...createRiffCycleStudy().soundSettings, palette, referenceReverbAmount: 0, subdivisionReverbAmount: 0 };
    triggerReferencePulse(sound, 0.055, 0, target);
    triggerBackbeatAccent(sound, 0.11, 0, target);
    triggerSubdivisionPulse(sound, 0.014, 0, target);
    triggerResetCue(sound, 0, target);
    assert.equal(context.oscillators.length, 4);
    for (const node of context.oscillators) {
      assert.ok(['sine', 'triangle'].includes(node.type));
      const output = node.connections[0].connections[0];
      assert.ok(output.connections.includes(destination));
      assert.ok(!output.connections.includes(context.destination));
    }
  });
}
