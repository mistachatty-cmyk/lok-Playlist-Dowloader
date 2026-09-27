import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('node_modules/@ffmpeg/core/dist/umd');
const target = resolve('public/ffmpeg');
await mkdir(target, { recursive: true });
for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  await copyFile(resolve(source, file), resolve(target, file));
}
