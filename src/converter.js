import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let engine;
let enginePromise;

export async function getEngine(onProgress) {
  if (!enginePromise) {
    engine = new FFmpeg();
    engine.on('progress', ({ progress }) => onProgress?.(Math.max(0, Math.min(1, progress))));
    enginePromise = engine.load({ coreURL: '/ffmpeg/ffmpeg-core.js', wasmURL: '/ffmpeg/ffmpeg-core.wasm' }).then(() => engine).catch(error => {
      enginePromise = undefined;
      engine = undefined;
      throw error;
    });
  }
  return enginePromise;
}

export async function convertFile(ffmpeg, file, format) {
  const input = `input-${crypto.randomUUID()}${file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '.bin'}`;
  const output = `output-${crypto.randomUUID()}.${format}`;
  try {
    await ffmpeg.writeFile(input, await fetchFile(file));
    const args = format === 'mp3'
      ? ['-i', input, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-y', output]
      : ['-i', input, '-vn', '-c:a', 'pcm_s16le', '-ar', '44100', '-ac', '2', '-y', output];
    const code = await ffmpeg.exec(args);
    if (code !== 0) throw new Error(`Converter exited with code ${code}`);
    const bytes = await ffmpeg.readFile(output);
    return new Blob([bytes], { type: format === 'mp3' ? 'audio/mpeg' : 'audio/wav' });
  } finally {
    await Promise.allSettled([ffmpeg.deleteFile(input), ffmpeg.deleteFile(output)]);
  }
}
