declare module 'https://esm.sh/@ffmpeg/ffmpeg@0.12.15' {
  export class FFmpeg {
    load(config?: { coreURL?: string; wasmURL?: string }): Promise<void>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    exec(args: string[]): Promise<number>;
    readFile(path: string): Promise<Uint8Array>;
    terminate(): void;
  }
}
