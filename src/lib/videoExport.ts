export interface CanvasRecordingFormat {
  mimeType: string;
  extension: 'mp4' | 'webm';
}

interface CanvasRecordingDownload {
  blob: Blob;
  extension: 'mp4' | 'webm';
  mimeType: string;
}

const RECORDING_FORMATS: CanvasRecordingFormat[] = [
  { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
  { mimeType: 'video/mp4;codecs=h264', extension: 'mp4' },
  { mimeType: 'video/mp4', extension: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
];

export function getCanvasRecordingFormat(): CanvasRecordingFormat {
  const supportedFormat = RECORDING_FORMATS.find((format) =>
    MediaRecorder.isTypeSupported(format.mimeType),
  );

  return supportedFormat ?? { mimeType: 'video/webm', extension: 'webm' };
}

async function toBlobUrl(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load video converter asset: ${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(new Blob([blob], { type: mimeType }));
}

async function convertWebmBlobToMp4(blob: Blob): Promise<Blob> {
  const { FFmpeg } = (await import(
    /* @vite-ignore */ 'https://esm.sh/@ffmpeg/ffmpeg@0.12.15'
  )) as { FFmpeg: new () => any };
  const ffmpeg = new FFmpeg();
  const coreBaseUrl = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
  const coreUrl = await toBlobUrl(`${coreBaseUrl}/ffmpeg-core.js`, 'text/javascript');
  const wasmUrl = await toBlobUrl(`${coreBaseUrl}/ffmpeg-core.wasm`, 'application/wasm');

  try {
    await ffmpeg.load({
      coreURL: coreUrl,
      wasmURL: wasmUrl,
    });
    await ffmpeg.writeFile('input.webm', new Uint8Array(await blob.arrayBuffer()));
    await ffmpeg.exec([
      '-i',
      'input.webm',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      'faststart',
      'output.mp4',
    ]);
    const data = await ffmpeg.readFile('output.mp4');
    return new Blob([data], { type: 'video/mp4' });
  } finally {
    ffmpeg.terminate();
    URL.revokeObjectURL(coreUrl);
    URL.revokeObjectURL(wasmUrl);
  }
}

export async function prepareCanvasRecordingDownload(
  blob: Blob,
  format: CanvasRecordingFormat,
): Promise<CanvasRecordingDownload> {
  if (format.extension === 'mp4') {
    return {
      blob,
      extension: 'mp4',
      mimeType: format.mimeType,
    };
  }

  try {
    const mp4Blob = await convertWebmBlobToMp4(blob);
    return {
      blob: mp4Blob,
      extension: 'mp4',
      mimeType: 'video/mp4',
    };
  } catch (error) {
    console.warn('MP4 conversion failed. Falling back to WebM.', error);
    return {
      blob,
      extension: 'webm',
      mimeType: format.mimeType,
    };
  }
}
