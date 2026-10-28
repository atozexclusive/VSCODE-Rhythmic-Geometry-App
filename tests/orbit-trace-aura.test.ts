import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOrbitAuraSize, drawOrbitTraceAura, invalidateOrbitTraceAura } from '../src/lib/orbitTraceAura';

test('Aura caps its blur surface at 512 pixels while preserving portrait and landscape proportions', () => {
  for(const [width,height] of [[1080,1920],[1920,1080],[3840,2160],[390,580]]) {
    const size=getOrbitAuraSize(width,height);
    assert.ok(size.width<=512&&size.height<=512);
    assert.ok(Math.abs(size.width/size.height-width/height)<0.005);
    assert.ok(size.width*size.height*4<=512*512*4,'bounded halo backing memory');
  }
});

class Paint {
  filter='none'; globalAlpha=1; globalCompositeOperation='source-over'; imageSmoothingEnabled=false;
  draws:any[][]=[]; clears=0; stack:any[]=[];
  save(){this.stack.push([this.filter,this.globalAlpha,this.globalCompositeOperation,this.imageSmoothingEnabled]);}
  restore(){[this.filter,this.globalAlpha,this.globalCompositeOperation,this.imageSmoothingEnabled]=this.stack.pop();}
  clearRect(){this.clears++;}
  drawImage(...args:any[]){this.draws.push(args);}
}

test('Aura caches blur work, updates at most ten times per second, and never edits the trace source', () => {
  const previous=globalThis.document, created:{width:number;height:number;paint:Paint;getContext:()=>Paint}[]=[];
  Object.assign(globalThis,{document:{createElement(){const paint=new Paint();const canvas={width:0,height:0,paint,getContext:()=>paint};created.push(canvas);return canvas;}}});
  const source={width:1080,height:1920} as HTMLCanvasElement;
  const output=new Paint(),ctx=output as unknown as CanvasRenderingContext2D;
  try {
    drawOrbitTraceAura(ctx,source,0,1);
    assert.equal(created.length,1);assert.equal(created[0].paint.draws.length,1);
    for(let i=1;i<=6;i++)drawOrbitTraceAura(ctx,source,i*16,i+1);
    assert.equal(created[0].paint.draws.length,1,'no full frame blur loop');
    drawOrbitTraceAura(ctx,source,112,8);
    assert.equal(created[0].paint.draws.length,2);
    drawOrbitTraceAura(ctx,source,400,8);
    assert.equal(created[0].paint.draws.length,2,'paused traces reuse the halo');
    assert.equal(output.globalAlpha,1);assert.equal(output.globalCompositeOperation,'source-over');
    assert.deepEqual(source,{width:1080,height:1920});
    assert.ok(created[0].paint.draws.every(draw=>draw[0]===source));
    invalidateOrbitTraceAura(source);
    drawOrbitTraceAura(ctx,source,401,0);
    assert.equal(created.length,2,'restart drops the old cached glow immediately');
    source.width=1920;source.height=1080;
    drawOrbitTraceAura(ctx,source,402,0);
    assert.equal(created.length,3,'resized exports rebuild at the correct aspect');
    assert.equal(created[2].width,512);
  } finally {Object.assign(globalThis,{document:previous});}
});
