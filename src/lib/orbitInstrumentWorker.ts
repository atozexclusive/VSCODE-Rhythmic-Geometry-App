import { renderOrbitInstrumentLayers, type OrbitDesignedInstrument } from './orbitInstrumentSamples';

type Request = { id: number; instrument: OrbitDesignedInstrument; frequency: number; sampleRate: number; speed: number };
const renderer = globalThis as unknown as {
  onmessage: (event: MessageEvent<Request>) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
renderer.onmessage = ({ data }) => {
  try {
    const first = renderOrbitInstrumentLayers(data.instrument, data.frequency, data.sampleRate, data.speed);
    const second = renderOrbitInstrumentLayers(data.instrument, data.frequency, data.sampleRate, data.speed, Math.PI / 2);
    const channels = [...first, ...second];
    renderer.postMessage({ id: data.id, channels }, channels.map(channel => channel.buffer));
  } catch { renderer.postMessage({ id: data.id }); }
};
