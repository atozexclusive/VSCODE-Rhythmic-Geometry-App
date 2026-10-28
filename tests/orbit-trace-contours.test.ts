import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOrbitEnvelopePoint, drawOrbitTraceContours, invalidateOrbitTraceContours } from '../src/lib/orbitTraceContours';
import { DEFAULT_ORBITS, createOrbit } from '../src/lib/orbitalEngine';

test('contours follow the tangent envelope of the connecting segments', () => {
  let valid = 0;
  const radii: number[] = [];
  for (let beat = 0; beat < 12; beat += 0.01) {
    const moving = (r: number, rate: number) => {
      const angle = -Math.PI / 2 + beat * rate;
      return { x: r * Math.cos(angle), y: r * Math.sin(angle), vx: -r * Math.sin(angle) * rate, vy: r * Math.cos(angle) * rate };
    };
    const a = moving(90, 2 * Math.PI / 3), b = moving(150, -2 * Math.PI / 4);
    const p = getOrbitEnvelopePoint(a, b);
    if (!p) continue;
    valid++;
    const dx = b.x-a.x, dy = b.y-a.y;
    const fraction = ((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy);
    assert.ok(fraction >= -1e-9 && fraction <= 1+1e-9);
    assert.ok(Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx) < 1e-7);
    const derivative = -(a.vx*dy-a.vy*dx)+(p.x-a.x)*(b.vy-a.vy)-(p.y-a.y)*(b.vx-a.vx);
    assert.ok(Math.abs(derivative) < 1e-7, 'neighboring lines are tangent to this curve');
    radii.push(Math.hypot(p.x,p.y));
  }
  assert.ok(valid > 100);
  assert.ok(Math.max(...radii)-Math.min(...radii)>10, 'retains the curved shape rather than substituting an orbit ring');
  assert.equal(getOrbitEnvelopePoint({x:0,y:0,vx:1,vy:0},{x:1,y:0,vx:1,vy:0}),null);
});

class Paint {
  lines=0; draws=0;
  setTransform(){} beginPath(){} moveTo(){} lineTo(){this.lines++;} stroke(){} drawImage(){this.draws++;}
}
test('contour drawing is cached, bounded per frame, and clears on restart', () => {
  const previous=globalThis.document, created:any[]=[];
  Object.assign(globalThis,{document:{createElement(){const paint=new Paint();const canvas={width:0,height:0,paint,getContext:()=>paint};created.push(canvas);return canvas;}}});
  const source={width:2160,height:3840} as HTMLCanvasElement;
  const output=new Paint() as unknown as CanvasRenderingContext2D;
  const orbits=DEFAULT_ORBITS.map(orbit=>createOrbit(orbit));
  const draw=(beat:number)=>drawOrbitTraceContours(output,source,orbits,beat,1080,1920,540,960,1,'beats-per-turn',1);
  try {
    draw(200); assert.equal(created.length,1);
    assert.ok(created[0].paint.lines>0);
    assert.ok(created[0].paint.lines<=1200);
    assert.equal(created[0].height,1536);
    for(let i=0;i<100;i++)draw(200);
    const finished=created[0].paint.lines;
    draw(200); assert.equal(created[0].paint.lines,finished,'paused completed shape is reused');
    draw(0); assert.equal(created.length,2,'rewinding clears the contour history');
    invalidateOrbitTraceContours(source); draw(1); assert.equal(created.length,3);
    assert.deepEqual(source,{width:2160,height:3840});
  } finally {Object.assign(globalThis,{document:previous});}
});
