import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawCanvasDisplayBackground, DEFAULT_CANVAS_DISPLAY_SETTINGS } from '../src/lib/canvasDisplayThemes';

class Paint {
  gradients=0; linearGradients=0; globalAlpha=1; alphas:number[]=[];
  washStops:any[][]=[];
  particles:number[][]=[];
  save(){} restore(){} fillRect(){} beginPath(){} fill(){} stroke(){} moveTo(){} lineTo(){}
  arc(...values:number[]){this.particles.push(values);this.alphas.push(this.globalAlpha);}
  createLinearGradient(){this.linearGradients++;return {addColorStop:(...stop:any[])=>this.washStops.push(stop)};}
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


test('Orbit export restores Space and Nebula colors without radial bloom and keeps stars readable', () => {
  for(const theme of ['deep-space','nebula'] as const) {
    const plain=new Paint(),exported=new Paint();
    const settings={...DEFAULT_CANVAS_DISPLAY_SETTINGS,theme,atmosphere:'stars' as const};
    drawCanvasDisplayBackground(plain as unknown as CanvasRenderingContext2D,1080,1920,settings,{seed:43,hideBackdropBloom:true});
    drawCanvasDisplayBackground(exported as unknown as CanvasRenderingContext2D,1080,1920,settings,{seed:43,hideBackdropBloom:true,exportBackground:true});
    assert.equal(exported.gradients,0,'no concentric gradient bands');
    assert.equal(exported.linearGradients,1,'restores theme color with a non-circular wash');
    assert.equal(exported.washStops.length,3);
    assert.equal(exported.particles.length,plain.particles.length);
    exported.particles.forEach((star,index)=>{
      assert.deepEqual(star.slice(0,2),plain.particles[index].slice(0,2),'preserves star positions');
      assert.ok(star[2]>plain.particles[index][2]*2,'cores survive HD compression and mobile downscaling');
      assert.ok(exported.alphas[index]>plain.alphas[index],'star cores stay visible');
    });
  }
});
