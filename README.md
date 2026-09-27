# Lok Transfer

A browser-based workspace for artists to convert **their own or licensed files** to MP3 or WAV. Multiple files export as a ZIP containing a named playlist folder, numbered tracks, and `playlist.json`. Audio stays on the device; the static site needs no upload server or account.

## Run

```bash
npm install
npm run dev
```

`npm run build` produces a static `dist/` directory for Vercel. Set framework preset to **Vite** (or Other with build command `npm run build` and output directory `dist`). The prebuild script copies the FFmpeg WebAssembly core into the static assets. No API keys or environment variables are needed for the baseline.

## What works today

- Import several local audio/video files with picker or drag and drop; rename tracks before export.
- Paste a direct file URL when the host permits cross-origin browser downloads; page/stream links are not direct media files.
- Convert serially on device to 192 kbps MP3 or 44.1 kHz stereo WAV. One track downloads as a file; multiple tracks download as a ZIP with a playlist folder.
- Keep files in playlist order with `01 - Title.mp3` naming and a machine-readable `lok.playlist.v1` manifest.
- Switch on Potato Mode to disable decorative animations, glow, transitions, and the hero ornament. Preference persists locally. Reduced-motion system preference also disables animations.

The browser controls where downloads land. On iPhone, use the browser share/download flow to save the ZIP to Files, then extract it in Files. A web page cannot silently create a folder in Files. Large media may exceed mobile browser memory; inputs are limited to 200 MB apiece, and ZIP generation also consumes memory. The WASM audio engine downloads on first conversion. MP3 conversion does not improve the quality of a compressed source.

## YouTube and other platforms

YouTube's terms and API policies restrict downloading and extracting streams outside their permitted routes. This product does not scrape or rip YouTube pages or playlists. Creators can download their own uploads using YouTube Studio, preferably use their original master, then import the local file here. Future platform adapters should only use an authorized download/export endpoint and should identify that permission in the interface. Do not send arbitrary URLs to a server-side downloader.

## Survivor 616 handoff

The ZIP manifest is the first integration contract:

```json
{
  "schema": "lok.playlist.v1",
  "name": "My Lok Playlist",
  "tracks": [{ "position": 1, "file": "01 - Demo.mp3", "title": "Demo", "originalName": "Demo.wav" }]
}
```

Next, Survivor 616's Sound Booth/DAW can offer **Import from Files**: accept one audio file or ZIP, parse the manifest, validate file paths/types and sizes, let the artist preview and choose tracks, then store them locally. A direct handoff can follow through the Web Share Target API or a verified same-origin/import bridge once the receiving app's import flow and origins are known. This site deliberately does not claim a working direct connection yet.

## Product roadmap

1. **Importer:** add waveform preview, trim points, metadata editor, duplicate detection, per-track failure retry, and a clear memory estimate on mobile.
2. **Artist workspace:** save non-sensitive session settings locally, allow album art and track ordering, export stem bundles and lossless FLAC where supported.
3. **Ecosystem:** complete Sound Booth ZIP ingestion, then optional GSix account library with explicit upload consent, quota, and deletion controls. Cross-app content stays local by default.
4. **Platforms:** integrate only sources with authorized media export APIs or artist-supplied download URLs. Playlist page metadata alone never grants audio download rights.
5. **Business:** keep conversion and local export available without payment. Optional paid value can be cloud sync/storage, collaboration, and advanced batch workflow after costs and rights are settled. Any actual small purchases require clear prices and a payment provider; none are implemented in this baseline.

## Architecture

Vite static UI → local file/direct CORS media fetch → FFmpeg WASM → Blob download or JSZip folder. No server processing and no database. A production GSix link can point to the Vercel deployment or embed the static app on an approved subdomain. The single-thread FFmpeg core is used for broad browser compatibility, including no cross-origin isolation requirement.
