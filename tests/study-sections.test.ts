import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStudySectionLayers, createDefaultPolyrhythmStudy, cloneStudy, createPolyrhythmStudyCell, createPolyrhythmStudyPhrase } from '../src/lib/polyrhythmStudy';

test('sections gate any combination without removing shapes or changing their patterns', () => {
  const study = createDefaultPolyrhythmStudy();
  const before = JSON.stringify(study.layers);
  for (const enabledLayerIndices of [undefined, [], [0], [1], [0, 1]]) {
    const layers = getStudySectionLayers(study.layers, { enabledLayerIndices });
    assert.equal(layers.length, study.layers.length);
    layers.forEach((layer, index) => {
      assert.equal(layer.soundEnabled, study.layers[index].soundEnabled && (enabledLayerIndices === undefined || enabledLayerIndices.includes(index)));
      assert.equal(layer.id, study.layers[index].id);
      assert.deepEqual(layer.activeSteps, study.layers[index].activeSteps);
    });
  }
  assert.equal(JSON.stringify(study.layers), before);
});

test('section assignments survive saving and cloning, including silent sections and older scenes', () => {
  const study = createDefaultPolyrhythmStudy();
  const cell = createPolyrhythmStudyCell(study.layers, 'A');
  study.chainCells = [cell];
  study.chainPhrases = [undefined, [], [1]].map(enabledLayerIndices => ({ ...createPolyrhythmStudyPhrase(cell.id, 2), enabledLayerIndices }));
  const loaded = cloneStudy(JSON.parse(JSON.stringify(study)));
  assert.deepEqual(loaded.chainPhrases?.map(p => p.enabledLayerIndices), [undefined, [], [1]]);
  assert.ok(loaded.chainPhrases?.every(p => p.cellId === loaded.chainCells?.[0].id));
  loaded.chainPhrases![2].enabledLayerIndices!.push(0);
  assert.deepEqual(study.chainPhrases[2].enabledLayerIndices, [1]);
});
