import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBasicStudyBeat, createRandomPolyrhythmStudy, createGeneratedStudyGroove, createRandomPlusPolyrhythmStudy } from '../src/lib/polyrhythmStudy';

test('generated beats retain drum anchors and aligned, editable melodic parts across varied arrangements', () => {
  const original = Math.random;
  let seed = 5729;
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  try {
    const families = new Set<string>();
    const arrangements = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const study = createGeneratedStudyGroove();
      families.add(study.name.split(' ').slice(0, -1).join(' '));
      const steps = study.layers[0].beatCount;
      const barSteps = steps / ((study.cycleBeats ?? 4) / 4);
      const perBeat = barSteps / 4;
      assert.ok([12, 16, 24, 32].includes(steps));
      assert.ok(study.layers.length >= 5 && study.layers.length <= 6);
      assert.equal(study.sharedGridEnabled, true);
      assert.equal(study.soundsLinked, false);
      assert.deepEqual(study.layers.slice(0, 3).map(layer => layer.voice), ['kick', 'snare', 'hi-hat']);
      for (let start = 0; start < steps; start += barSteps) {
        assert.ok(study.layers[0].activeSteps[start]);
        if (study.name.startsWith('Half-Time')) assert.ok(study.layers[1].activeSteps[start + 8]);
        else for (const beat of [1, 3]) assert.ok(study.layers[1].activeSteps[start + beat * perBeat]);
      }
      for (const layer of study.layers) {
        assert.equal(layer.beatCount, steps);
        assert.equal(layer.activeSteps.length, steps);
        assert.equal(layer.accents.length, steps);
        assert.ok(layer.activeSteps.some(Boolean));
        if (layer.voice === 'standard') {
          assert.equal(layer.soundSettings?.pitchMode, 'keyed');
          assert.equal(layer.noteSequence?.length, layer.activeSteps.filter(Boolean).length);
          assert.ok(layer.noteSequence?.every(chord => chord.length > 0 && chord.every(Number.isInteger)));
        }
      }
      arrangements.add(JSON.stringify([study.bpm, study.soundSettings, study.layers.map(l => [l.activeSteps, l.noteSequence])]));
    }
    assert.equal(families.size, 6);
    assert.ok(arrangements.size > 290);
    let grooves = 0;
    for (let i = 0; i < 150; i++) if (createRandomPlusPolyrhythmStudy().id.startsWith('generated-groove-')) grooves++;
    assert.ok(grooves > 50 && grooves < 130, `grooves ${grooves}: Random+ should mix beats and existing studies`);
  } finally { Math.random = original; }
});

test('regular Random includes simple drum beats alongside rhythm studies', () => {
  const original = Math.random;
  let seed = 104;
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  try {
    const names = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const beat = createBasicStudyBeat();
      names.add(beat.name);
      assert.equal(beat.layers.length, 3);
      assert.ok([12, 16].includes(beat.layers[0].beatCount));
      assert.equal(beat.cycleBeats, 4);
      assert.deepEqual(beat.layers.map(layer => layer.voice), ['kick', 'snare', 'hi-hat']);
      assert.ok(beat.layers.every(layer => layer.activeSteps.some(Boolean) && !layer.noteSequence));
      assert.ok(beat.layers[0].activeSteps[0]);
    }
    assert.equal(names.size, 4);
    let beats = 0;
    for (let i = 0; i < 200; i++) if (createRandomPolyrhythmStudy().id.startsWith('basic-beat-')) beats++;
    assert.ok(beats > 35 && beats < 110);
  } finally { Math.random = original; }
});
