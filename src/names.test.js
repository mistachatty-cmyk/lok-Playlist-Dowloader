import test from 'node:test';
import assert from 'node:assert/strict';
import { safeName, trackName, numberedName } from './names.js';

test('playlist and track names cannot escape the folder or use invalid filesystem characters', () => {
  assert.equal(safeName('../My / Playlist:*'), 'My Playlist');
  assert.equal(trackName('Live Take 02.wav'), 'Live Take 02');
  assert.equal(numberedName(2, 'First / Mix', 'mp3'), '03 - First Mix.mp3');
});
