import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaylistLinks } from './playlist-links.js';

test('imports a titled list and M3U entries in order', () => {
  const entries = parsePlaylistLinks('Demo | https://artist.example/demo.mp3\n#EXTM3U\n#EXTINF:123,Next Take\nhttps://artist.example/next.wav');
  assert.deepEqual(entries.map(item => item.title), ['Demo', 'Next Take']);
});

test('rejects streaming page links', () => {
  assert.throws(() => parsePlaylistLinks('https://youtube.com/playlist?list=PLsample'), /direct audio/);
});
