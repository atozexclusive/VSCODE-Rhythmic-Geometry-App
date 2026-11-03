import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRandomPlusRiffCycleStudy, createRandomRiffCycleStudy } from '../src/lib/riffCycleStudy';

test('Random+ mixes its existing variety with longer sixteenth and triplet phrases below 50 steps', () => {
  const originalRandom = Math.random;
  let seed = 613;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  try {
    const counts = new Set<number>();
    const grids = new Set<number>();
    const meters = new Set<number>();
    const returns = new Set<string>();
    const longGrids = new Map<number, Set<number>>();
    let longer = 0;
    for (let i = 0; i < 2000; i++) {
      const study = createRandomPlusRiffCycleStudy();
      const count = study.riff.stepCount;
      counts.add(count);
      grids.add(study.reference.subdivision);
      meters.add(study.reference.numerator);
      returns.add(study.riff.resetMode);
      assert.ok(count < 50);
      assert.equal(study.riff.activeSteps.length, count);
      assert.equal(study.riff.accents.length, count);
      assert.ok(study.riff.activeSteps.some(Boolean));
      if (count > 17) {
        const positions = study.riff.activeSteps.flatMap((active, index) => active ? [index] : []);
        assert.ok(positions.filter(index => index < count / 2).length >= 2, 'first half retains a phrase');
        assert.ok(positions.filter(index => index >= count / 2).length >= 2, 'second half is not left empty');
        const longestGap = Math.max(...positions.map((position, index) =>
          (positions[(index + 1) % positions.length] - position + count) % count));
        assert.ok(longestGap <= 8, `a ${count}-step phrase must not leave half the circle empty`);
      }
      assert.ok(study.riff.accents.every((accent, index) => !accent || study.riff.activeSteps[index]));
      if (count >= 22 && count !== 23) {
        longer++;
        const seen = longGrids.get(count) ?? new Set<number>();
        seen.add(study.reference.subdivision);
        longGrids.set(count, seen);
        assert.ok([12, 16].includes(study.reference.subdivision));
      }
    }
    for (const count of [11, 13, 15, 17, 19, 21, 23, 22, 24, 26, 27, 28, 30, 32, 33, 35, 36]) assert.ok(counts.has(count));
    for (const count of [22, 27, 28, 30]) {
      assert.ok(longGrids.get(count)?.has(16));
      assert.ok(longGrids.get(count)?.has(12));
    }
    for (const grid of [12, 16, 20, 32]) assert.ok(grids.has(grid));
    assert.equal(meters.size, 4);
    assert.equal(returns.size, 6);
    assert.ok(longer > 800 && longer < 1200);
    for (let i = 0; i < 100; i++) {
      const standard = createRandomRiffCycleStudy();
      assert.ok([9, 11, 13, 15, 17].includes(standard.riff.stepCount));
      assert.ok([12, 16].includes(standard.reference.subdivision));
    }
  } finally {
    Math.random = originalRandom;
  }
});
