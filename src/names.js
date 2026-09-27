export function safeName(value, fallback = 'Untitled') {
  const cleaned = String(value ?? '').normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '').replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '').trim().slice(0, 90);
  return cleaned || fallback;
}

export function trackName(filename) {
  return safeName(filename.replace(/\.[^.]+$/, ''));
}

export function numberedName(index, title, extension) {
  return `${String(index + 1).padStart(2, '0')} - ${safeName(title)}.${extension}`;
}
