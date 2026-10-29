import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawCanvasDisplayBackground, DEFAULT_CANVAS_DISPLAY_SETTINGS } from '../src/lib/canvasDisplayThemes';

class Paint {
  gradients=0;
  particles:number[][]=[];
  save(){} restore(){} fillRect(){} beginPath(){} fill(){} stroke(){} moveTo(){} lineTo(){}
  arc(...values:number[]){this.particles.push(values);}
  createRadialGradient(){this.gradients++;return {addColorStop(){}};}
}

test('Study clean export backdrop removes radial bands while retaining exactly the same stars', () => {
  const normal=new Paint(),clean=new Paint();
  const settings={...DEFAULT_CANVAS_DISPLAY_SETTINGS,theme:'deep-space' as const,atmosphere:'stars' as const};
  drawCanvasDisplayBackground(normal as unknown as CanvasRenderingContext2D,1080,1920,settings,{seed:31});
  drawCanvasDisplayBackground(clean as unknown as CanvasRenderingContext2D,1080,1920,settings,{seed:31,hideBackdropBloom:true});
  assert.equal(normal.gradients,3,'normal backgrounds keep main bloom, side bloom and vignette');
  assert.equal(clean.gradients,0,'no radial gradients beneath export fills');
  assert.ok(clean.particles.length>30);
  assert.deepEqual(clean.particles,normal.particles,'stars keep their coordinates, radii and count');
});
