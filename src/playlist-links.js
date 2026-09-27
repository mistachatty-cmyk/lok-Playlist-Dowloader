const mediaExtension = /\.(mp3|wav|m4a|aac|flac|ogg|opus|mp4|mov|webm)$/i;

export function parsePlaylistLinks(input) {
  const entries = [];
  let pendingTitle = '';
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      pendingTitle = line.split(',').slice(1).join(',').trim();
      continue;
    }
    if (line.startsWith('#')) continue;
    const separator = line.indexOf('|');
    const title = separator < 0 ? pendingTitle : line.slice(0, separator).trim();
    const rawUrl = separator < 0 ? line : line.slice(separator + 1).trim();
    pendingTitle = '';
    let url;
    try { url = new URL(rawUrl); } catch { throw new Error(`Invalid URL on line ${entries.length + 1}`); }
    if (!['http:', 'https:'].includes(url.protocol) || !mediaExtension.test(url.pathname)) {
      throw new Error(`Use a direct audio or video file link on line ${entries.length + 1}`);
    }
    if (/(^|\.)(youtube\.com|youtu\.be)$/.test(url.hostname)) {
      throw new Error('YouTube playlist and video pages cannot be downloaded by this app.');
    }
    entries.push({ url: url.href, title });
    if (entries.length > 30) throw new Error('Import up to 30 links at a time.');
  }
  if (!entries.length) throw new Error('Paste at least one direct media file link.');
  return entries;
}
