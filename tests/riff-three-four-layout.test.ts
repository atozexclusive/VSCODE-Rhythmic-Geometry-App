import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRiffCycleStudy } from '../src/lib/riffCycleStudy.ts';
import { getRiffCycleCanvasMetrics } from '../src/lib/riffCycleLayout.ts';

for (const mobile of [true, false]) {
  for (const viewMode of ['circular', 'unwrapped'] as const) {
    test(`Only live 3/4 gains the adjusted layout (${mobile}, ${viewMode})`, () => {
      const study = createRiffCycleStudy();
      study.viewMode = viewMode;
      const metrics = (exportLayout = false) => getRiffCycleCanvasMetrics(study, 600, 900, mobile, 0, 0, undefined, undefined, { exportLayout });
      for (const [numerator, denominator] of [[2,4],[3,8],[4,4],[5,4],[6,8],[7,8]]) {
        study.reference.numerator = numerator;
        study.reference.denominator = denominator;
        assert.deepEqual(metrics(), metrics(true), `${numerator}/${denominator} must remain unchanged`);
      }
      study.reference.numerator = 4;
      study.reference.denominator = 4;
      const four = metrics();
      study.reference.numerator = 3;
      const live = metrics();
      const exported = metrics(true);
      assert.ok(Math.abs(live.circleCenterY - four.circleCenterY - (mobile ? 18 : 24)) < 0.000001);
      assert.ok(live.outerRadius > exported.outerRadius);
      const frameRadius = exported.outerRadius * 1.15 / (mobile ? 1.025 : 1.03);
      assert.ok(Math.abs(live.outerRadius - frameRadius * 1.04) < 0.000001);
      const expectedInner = Math.min(frameRadius * (mobile ? (viewMode === 'unwrapped' ? 0.52 : 0.56) : 0.57), frameRadius * 0.5 - (mobile ? 14 : 18)) * 0.94;
      assert.ok(Math.abs(live.innerRadius - expectedInner) < 0.000001);
    });
  }
}
