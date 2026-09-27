#!/usr/bin/env python3
"""Personal playlist export. Use only for media you are allowed to save."""

import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def playlist_id(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {
        "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"
    }:
        raise ValueError("Paste an HTTPS YouTube playlist link.")
    value = parse_qs(parsed.query).get("list", [""])[0]
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,}", value):
        raise ValueError("This link is missing a valid playlist ID.")
    return value


def folder_name(title: str, fallback: str) -> str:
    value = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", title).strip(" .")[:90]
    return value or fallback


def command(*args: str) -> subprocess.CompletedProcess[str]:
    runtime = ["--js-runtimes", "node"] if shutil.which("node") else []
    return subprocess.run([sys.executable, "-m", "yt_dlp", *runtime, *args],
                          text=True, capture_output=True, check=False)


def export_playlist(url: str, destination: Path, make_zip: bool = False) -> Path:
    identifier = playlist_id(url)
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("FFmpeg is required for MP3 conversion. Install it and retry.")
    if shutil.which("node") is None and shutil.which("deno") is None:
        raise RuntimeError("Node.js or Deno is required for reliable YouTube extraction. Install one and retry.")
    try:
        import yt_dlp  # noqa: F401
    except ImportError as error:
        raise RuntimeError('Install yt-dlp first: python -m pip install -U "yt-dlp[default]"') from error

    print("Reading playlist titles and order…", flush=True)
    preview = command("--flat-playlist", "--dump-single-json", "--skip-download", url)
    if preview.returncode or not preview.stdout.strip():
        raise RuntimeError("Could not read this playlist. It may be private, unavailable, or blocked.\n"
                           + preview.stderr.strip()[-1000:])
    try:
        metadata = json.loads(preview.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError("Could not parse the playlist metadata.") from error
    entries = metadata.get("entries") or []
    if not entries:
        raise RuntimeError("The playlist has no accessible entries. Check the link in YouTube.")
    folder = destination / folder_name(metadata.get("title") or "", f"Playlist {identifier}")
    folder.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {len(entries)} entries into {folder}…", flush=True)

    template = str(folder / "%(playlist_index)03d - %(title)s [%(id)s].%(ext)s")
    download = command("--yes-playlist", "--ignore-errors", "--extract-audio",
                       "--audio-format", "mp3", "--audio-quality", "192K",
                       "--no-overwrites", "--windows-filenames", "-o", template, url)
    if download.stdout:
        print(download.stdout[-4000:])
    if download.stderr:
        print(download.stderr[-2000:], file=sys.stderr)

    tracks = []
    mp3s = list(folder.glob("*.mp3"))
    for position, entry in enumerate(entries, 1):
        if not entry:
            continue
        video_id = entry.get("id") or ""
        prefix = f"{position:03d} - "
        match = next((file for file in mp3s if file.name.startswith(prefix)
                      and file.name.endswith(f"[{video_id}].mp3")), None)
        source = entry.get("webpage_url") or (f"https://www.youtube.com/watch?v={video_id}" if video_id else "")
        tracks.append({"position": position, "title": entry.get("title") or "Unavailable",
                       "source_url": source, "file": match.name if match else "",
                       "status": "downloaded" if match else "unavailable"})

    manifest = {"schema": "lok.playlist.v1", "name": folder.name,
                "source_playlist": url, "tracks": tracks}
    (folder / "playlist.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    with (folder / "tracklist.csv").open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=["position", "title", "source_url", "file", "status"])
        writer.writeheader()
        writer.writerows(tracks)

    if make_zip:
        archive = folder.parent / f"{folder.name}.zip"
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED) as output:
            for file in folder.iterdir():
                if file.is_file():
                    output.write(file, f"{folder.name}/{file.name}")
        print(f"ZIP: {archive}")
    completed = sum(track["status"] == "downloaded" for track in tracks)
    print(f"Saved {completed}/{len(tracks)} tracks. Folder: {folder}")
    if not completed:
        raise RuntimeError("No MP3s were saved. Check the downloader output and your access to the media.")
    if completed < len(tracks):
        print("See tracklist.csv for unavailable entries; retry after checking access.", file=sys.stderr)
    return folder


def main() -> int:
    parser = argparse.ArgumentParser(description="Save a YouTube playlist as ordered MP3s and a title/link manifest.")
    parser.add_argument("url", help="Full YouTube playlist URL")
    parser.add_argument("--output", type=Path, default=Path.home() / "Downloads" / "Lok Playlists")
    parser.add_argument("--zip", action="store_true", help="Also create a ZIP with the playlist folder")
    args = parser.parse_args()
    try:
        export_playlist(args.url, args.output.expanduser(), args.zip)
    except (ValueError, RuntimeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
