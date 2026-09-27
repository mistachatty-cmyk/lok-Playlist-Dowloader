import './style.css';
import './effects.css';
import JSZip from 'jszip';
import { getEngine, convertFile } from './converter.js';
import { safeName, trackName, numberedName } from './names.js';
import { parsePlaylistLinks } from './playlist-links.js';

const $ = selector => document.querySelector(selector);
const state = { tracks: [], busy: false };
const maxBytes = 200 * 1024 * 1024;
let preparedCommand = '';
$('#youtube-prepare').addEventListener('click', () => {
  const feedback = $('#youtube-feedback');
  try {
    const parsed = new URL($('#youtube-url').value.trim());
    const id = parsed.searchParams.get('list');
    if (parsed.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(parsed.hostname) || !/^[A-Za-z0-9_-]{10,}$/.test(id || '')) {
      throw new Error('Paste a full HTTPS YouTube playlist link containing a list ID.');
    }
    preparedCommand = `python tools/playlist_runner.py "https://www.youtube.com/playlist?list=${id}" --zip`;
    $('#runner-command').textContent = preparedCommand;
    $('#runner-steps').hidden = false;
    feedback.textContent = 'Command prepared. Follow the desktop steps below to save the playlist.';
    feedback.classList.remove('error');
    $('#runner-steps').scrollIntoView({ behavior: potato.checked ? 'instant' : 'smooth', block: 'nearest' });
  } catch (error) {
    $('#runner-steps').hidden = true;
    feedback.textContent = error.message;
    feedback.classList.add('error');
  }
});
$('#copy-command').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(preparedCommand);
    $('#copy-command').textContent = 'Copied';
  } catch { $('#copy-command').textContent = 'Select the command to copy'; }
});
const potato = $('#potato');
try { potato.checked = localStorage.getItem('lok-transfer-potato') === '1'; } catch {}
document.documentElement.classList.toggle('potato', potato.checked);
potato.addEventListener('change', () => {
  document.documentElement.classList.toggle('potato', potato.checked);
  try { localStorage.setItem('lok-transfer-potato', potato.checked ? '1' : '0'); } catch {}
});

function message(value, isError = false) {
  $('#feedback').textContent = value;
  $('#feedback').classList.toggle('error', isError);
}

function render() {
  $('#count').textContent = `(${state.tracks.length})`;
  $('#convert').disabled = state.busy || !state.tracks.length;
  $('#clear').disabled = state.busy || !state.tracks.length;
  $('#browse').disabled = state.busy;
  $('#add-url').disabled = state.busy;
  $('#bulk-add').disabled = state.busy;
  $('#queue').innerHTML = '';
  if (!state.tracks.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = '<span class="empty-wave">▥</span><strong>Nothing on the deck yet</strong><span>Add a file to begin your playlist.</span>';
    $('#queue').append(empty);
    return;
  }
  state.tracks.forEach((track, index) => {
    const row = document.createElement('div');
    row.className = 'track';
    const number = document.createElement('span'); number.className = 'track-number'; number.textContent = String(index + 1).padStart(2, '0');
    const icon = document.createElement('span'); icon.className = 'track-icon'; icon.textContent = '♫';
    const details = document.createElement('div'); details.className = 'track-details';
    const input = document.createElement('input'); input.value = track.title; input.setAttribute('aria-label', `Title for track ${index + 1}`); input.disabled = state.busy;
    input.addEventListener('input', () => { track.title = input.value; });
    const sub = document.createElement('span'); sub.textContent = `${track.file.name} · ${(track.file.size / 1024 / 1024).toFixed(1)} MB`;
    details.append(input, sub);
    const remove = document.createElement('button'); remove.className = 'remove'; remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remove track'; remove.setAttribute('aria-label', `Remove track ${index + 1}`); remove.disabled = state.busy;
    remove.addEventListener('click', () => { state.tracks.splice(index, 1); render(); });
    row.append(number, icon, details, remove); $('#queue').append(row);
  });
}

function addFiles(files) {
  const accepted = [...files].filter(file => file.type.startsWith('audio/') || file.type.startsWith('video/') || /\.(mp3|wav|m4a|aac|flac|ogg|opus|mp4|mov|webm)$/i.test(file.name));
  const sized = accepted.filter(file => file.size <= maxBytes && file.size > 0);
  state.tracks.push(...sized.map(file => ({ file, title: trackName(file.name) })));
  render();
  if (sized.length !== files.length) message(`Added ${sized.length} file(s). Unsupported, empty, or files over 200 MB were skipped.`, true);
  else message(`${sized.length} file(s) added. Edit track names before export if needed.`);
}

function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function progress(fraction, label) {
  $('#progress').hidden = false;
  $('#progress-fill').style.width = `${Math.round(fraction * 100)}%`;
  $('#progress-label').textContent = label;
}

async function addDirectUrl() {
  const raw = $('#source-url').value.trim();
  let url;
  try { url = new URL(raw); } catch { return message('Enter a valid direct file URL.', true); }
  if (!['https:', 'http:'].includes(url.protocol)) return message('Use an HTTP or HTTPS file URL.', true);
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)music\.youtube\.com$/i.test(url.hostname)) return message('YouTube page links cannot be imported. Download your own upload in YouTube Studio, then add the file.', true);
  if (!/\.(mp3|wav|m4a|aac|flac|ogg|opus|mp4|mov|webm)$/i.test(url.pathname)) return message('This needs to be a direct audio or video file link, ending in a supported extension.', true);
  state.busy = true; render(); message('Fetching the file directly to your browser…');
  try {
    const response = await fetch(url.href, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
    const length = Number(response.headers.get('content-length'));
    if (length > maxBytes) throw new Error('File exceeds the 200 MB limit');
    const blob = await response.blob();
    if (blob.size > maxBytes) throw new Error('File exceeds the 200 MB limit');
    const name = decodeURIComponent(url.pathname.split('/').pop());
    addFiles([new File([blob], name, { type: blob.type || 'audio/*' })]);
    $('#source-url').value = '';
  } catch (error) { message(`Could not fetch that file. The source may block browser access. ${error.message}`, true); }
  finally { state.busy = false; render(); }
}

async function importPlaylistLinks() {
  let entries;
  try { entries = parsePlaylistLinks($('#bulk-input').value); }
  catch (error) { return message(error.message, true); }
  state.busy = true; render();
  const failed = [];
  let added = 0;
  let totalBytes = 0;
  for (const [index, entry] of entries.entries()) {
    message(`Fetching direct file ${index + 1} of ${entries.length}…`);
    try {
      const response = await fetch(entry.url, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const length = Number(response.headers.get('content-length'));
      if (length > maxBytes || totalBytes + length > 500 * 1024 * 1024) throw new Error('File or playlist exceeds browser memory limit');
      const blob = await response.blob();
      if (blob.size > maxBytes || totalBytes + blob.size > 500 * 1024 * 1024) throw new Error('File or playlist exceeds browser memory limit');
      if (blob.type.includes('text/html')) throw new Error('Link returned a web page, not a media file');
      const path = new URL(entry.url).pathname;
      const filename = decodeURIComponent(path.split('/').pop());
      const file = new File([blob], filename, { type: blob.type || 'audio/*' });
      state.tracks.push({ file, title: entry.title ? safeName(entry.title) : trackName(filename) });
      totalBytes += blob.size;
      added++;
    } catch (error) { failed.push(`Line ${index + 1}: ${error.message}`); }
  }
  state.busy = false; render();
  message(`Imported ${added} of ${entries.length} files.${failed.length ? ` ${failed.join('; ')}` : ' Ready to convert.'}`, failed.length > 0);
}

async function convert() {
  if (state.busy || !state.tracks.length) return;
  state.busy = true; render();
  const format = $('#format').value;
  const folder = safeName($('#playlist').value, 'My Lok Playlist');
  const tracks = state.tracks.map(track => ({ ...track }));
  const done = [];
  const failures = [];
  try {
    message('Loading the audio engine. The first run may take a moment…');
    const ffmpeg = await getEngine(p => progress((done.length + p) / tracks.length, `Converting ${done.length + 1} of ${tracks.length}`));
    for (const [index, track] of tracks.entries()) {
      progress(index / tracks.length, `Converting ${index + 1} of ${tracks.length}: ${track.title}`);
      try {
        const blob = await convertFile(ffmpeg, track.file, format);
        done.push({ blob, name: numberedName(index, track.title, format), source: track.file.name, title: safeName(track.title), position: index + 1 });
      } catch (error) {
        failures.push(`${track.file.name}: ${error.message}`);
      }
    }
    if (!done.length) throw new Error(failures.join('; ') || 'No tracks converted');
    if (done.length === 1) save(done[0].blob, done[0].name);
    else {
      message('Packing your playlist folder…');
      const zip = new JSZip();
      const directory = zip.folder(folder);
      for (const track of done) directory.file(track.name, track.blob);
      directory.file('playlist.json', JSON.stringify({ schema: 'lok.playlist.v1', name: folder, tracks: done.map(track => ({ position: track.position, file: track.name, title: track.title, originalName: track.source })) }, null, 2));
      const archive = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, metadata => progress(metadata.percent / 100, 'Packing the playlist…'));
      save(archive, `${folder}.zip`);
    }
    progress(1, `Finished ${done.length} track(s)`);
    message(`Saved ${done.length === 1 ? 'your track' : `${done.length} tracks in ${folder}.zip`}.${failures.length ? ` ${failures.length} failed: ${failures.join('; ')}` : ' Check your browser downloads or Files app.'}`, failures.length > 0);
  } catch (error) {
    message(`Conversion stopped after ${done.length} track(s): ${error.message}. Try smaller files or a desktop browser.`, true);
  } finally { state.busy = false; render(); }
}

$('#browse').addEventListener('click', event => { event.stopPropagation(); $('#files').click(); });
$('#dropzone').addEventListener('click', () => { if (!state.busy) $('#files').click(); });
$('#dropzone').addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); if (!state.busy) $('#files').click(); } });
$('#files').addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
$('#dropzone').addEventListener('dragover', event => { event.preventDefault(); $('#dropzone').classList.add('dragging'); });
$('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.remove('dragging'));
$('#dropzone').addEventListener('drop', event => { event.preventDefault(); $('#dropzone').classList.remove('dragging'); if (!state.busy) addFiles(event.dataTransfer.files); });
$('#add-url').addEventListener('click', addDirectUrl);
$('#bulk-add').addEventListener('click', importPlaylistLinks);
$('#source-url').addEventListener('keydown', event => { if (event.key === 'Enter') addDirectUrl(); });
$('#clear').addEventListener('click', () => { state.tracks = []; render(); message('Playlist cleared.'); $('#progress').hidden = true; });
$('#convert').addEventListener('click', convert);
