import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISTANT_PLANET_OPTIONS, normalizeDistantPlanets, drawDistantPlanet } from '../src/lib/distantPlanets';
import { normalizeCanvasDisplaySettings } from '../src/lib/canvasDisplayThemes';

test('planet choices preserve old Saturn/Earth defaults and normalize each slot independently', () => {
  assert.deepEqual(normalizeDistantPlanets(undefined),['saturn','earth']);
  assert.deepEqual(normalizeDistantPlanets(['venus','bad']),['venus','earth']);
  assert.deepEqual(normalizeDistantPlanets(['bad','mars'],['jupiter','neptune']),['jupiter','mars']);
  const settings=normalizeCanvasDisplaySettings({distantPlanets:['venus','neptune']});
  assert.deepEqual(settings.distantPlanets,['venus','neptune']);
  const roundTrip=normalizeCanvasDisplaySettings(JSON.parse(JSON.stringify(settings)));
  assert.deepEqual(roundTrip.distantPlanets,['venus','neptune']);
});

class Paint {
  globalAlpha=0.15; stack:number[]=[]; arcs:number[][]=[]; rings:number[][]=[]; stops:any[][]=[];
  save(){this.stack.push(this.globalAlpha);} restore(){this.globalAlpha=this.stack.pop()!;}
  createRadialGradient(...args:number[]){const stops:any[]=[];this.stops.push([args,stops]);return {addColorStop:(...stop:any[])=>stops.push(stop)};}
  beginPath(){} fill(){} stroke(){} clip(){} translate(){} scale(){} moveTo(){} bezierCurveTo(){} closePath(){}
  arc(...args:number[]){this.arcs.push(args);} ellipse(...args:number[]){this.rings.push(args);}
}

test('all worlds keep the caller’s slot and opacity, while Saturn/Earth retain their original details', () => {
  for (const {id} of DISTANT_PLANET_OPTIONS) {
    const paint=new Paint();
    drawDistantPlanet(paint as unknown as CanvasRenderingContext2D,id,150,240,47);
    assert.deepEqual(paint.arcs[0],[150,240,47,0,Math.PI*2]);
    assert.equal(paint.globalAlpha,0.15);
    assert.equal(paint.stack.length,0);
    assert.equal(paint.rings.length,id==='saturn'?2:0);
    if(id==='saturn') {
      assert.deepEqual(paint.stops[0][1],[[0,'#b9ac8b'],[0.55,'#726750'],[1,'#11151c']]);
      assert.deepEqual(paint.rings[0],[150,240,47*1.95,47*0.53,-0.35,0,Math.PI*2]);
    }
    if(id==='earth') assert.deepEqual(paint.stops[0][1],[[0,'#7194a3'],[0.5,'#345c73'],[1,'#0d151f']]);
  }
});
