import unittest
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

from playlist_runner import export_playlist, folder_name, playlist_id


class PlaylistRunnerTests(unittest.TestCase):
    def test_accepts_shared_playlist(self):
        self.assertEqual(playlist_id("https://youtube.com/playlist?list=PLRdvEjyh0yFk&si=_rT0Q3wKqvfJ5f3i"),
                         "PLRdvEjyh0yFk")

    def test_rejects_non_youtube_host(self):
        with self.assertRaises(ValueError):
            playlist_id("https://youtube.com.example.com/playlist?list=PLRdvEjyh0yFk")

    def test_safe_folder(self):
        self.assertEqual(folder_name("My: Study / Songs", "fallback"), "My Study  Songs")

    def test_manifest_preserves_order_and_source_links(self):
        entries = [{"id": "firstid", "title": "First", "webpage_url": "https://www.youtube.com/watch?v=firstid"},
                   {"id": "secondid", "title": "Second", "webpage_url": "https://www.youtube.com/watch?v=secondid"}]
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)

            def fake_command(*args):
                if "--dump-single-json" in args:
                    return subprocess.CompletedProcess(args, 0, json.dumps({"title": "Study Set", "entries": entries}), "")
                folder = root / "Study Set"
                (folder / "001 - First [firstid].mp3").write_bytes(b"test")
                return subprocess.CompletedProcess(args, 0, "", "")

            with patch.dict(sys.modules, {"yt_dlp": object()}), patch("playlist_runner.shutil.which", return_value="/usr/bin/tool"), patch("playlist_runner.command", side_effect=fake_command):
                folder = export_playlist("https://youtube.com/playlist?list=PLRdvEjyh0yFk", root, True)
            data = json.loads((folder / "playlist.json").read_text())
            self.assertEqual([track["position"] for track in data["tracks"]], [1, 2])
            self.assertEqual([track["status"] for track in data["tracks"]], ["downloaded", "unavailable"])
            self.assertEqual(data["tracks"][0]["source_url"], entries[0]["webpage_url"])
            self.assertTrue(folder.with_suffix(".zip").exists())


if __name__ == "__main__":
    unittest.main()
