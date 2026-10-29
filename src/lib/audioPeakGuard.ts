/** Unity gain for ordinary samples; a soft knee bounds exceptional transients. */
export function createAudioPeakGuardCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(2049);
  for (let index=0;index<curve.length;index++) {
    const sample=index/(curve.length-1)*2-1;
    const magnitude=Math.abs(sample);
    const guarded=magnitude<=0.75 ? magnitude : 0.75+0.15*(1-Math.exp(-(magnitude-0.75)/0.15));
    curve[index]=Math.sign(sample)*guarded;
  }
  return curve;
}
