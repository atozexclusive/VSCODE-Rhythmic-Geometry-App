export interface CanvasRecordingFormat {
  mimeType: string;
  extension: 'mp4' | 'webm';
}

export type VideoExportDuration = 8 | 15 | 30 | 60;
export type VideoExportAspect = 'canvas' | 'shorts';

export const VIDEO_EXPORT_ASPECTS: Array<{
  value: VideoExportAspect;
  label: string;
}> = [
  { value: 'canvas', label: 'Canvas' },
  { value: 'shorts', label: 'Shorts 9:16' },
];

export const VIDEO_EXPORT_SIZES: Record<VideoExportAspect, { width: number; height: number } | null> = {
  canvas: null,
  shorts: { width: 1080, height: 1920 },
};

export const VIDEO_EXPORT_DURATIONS: Array<{
  value: VideoExportDuration;
  label: string;
}> = [
  { value: 8, label: '8s loop' },
  { value: 15, label: '15s clip' },
  { value: 30, label: '30s clip' },
  { value: 60, label: '1 min clip' },
];

export const CANVAS_RECORDING_FRAME_RATE = 60;
export const CANVAS_RECORDING_VIDEO_BITS_PER_SECOND = 24_000_000;
export const CANVAS_EXPORT_PREROLL_SECONDS = 1;
export const SHORTS_EXPORT_POINT_SCALE = 1.45;

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

export function addAudioToCanvasStream(
  canvasStream: MediaStream,
  audioStream: MediaStream | null | undefined,
): MediaStream {
  if (!audioStream) {
    return canvasStream;
  }

  audioStream.getAudioTracks().forEach((track) => {
    canvasStream.addTrack(track.clone());
  });

  return canvasStream;
}

export function recordMediaRecorderForDuration(
  recorder: MediaRecorder,
  durationSeconds: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const stopDelayMs = durationSeconds * 1000;
    const failSafeDelayMs = stopDelayMs + 5000;

    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(stopTimer);
      window.clearTimeout(failSafeTimer);
      callback();
    };

    const stopTimer = window.setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, stopDelayMs);
    const failSafeTimer = window.setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      settle(() => resolve());
    }, failSafeDelayMs);

    recorder.onerror = () => settle(() => reject(new Error('Recording failed.')));
    recorder.onstop = () => settle(() => resolve());
    recorder.start(1000);
  });
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
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      'faststart',
      '-shortest',
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
