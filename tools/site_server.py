"""Serve the app on scratch copies of a few songs, for the site's screenshots.

Run it from the app's repo, so it uses the app's Python and packages:

    uv run --directory <path to the app's repo> python <path to this file> [--port 8002]

It copies the songs named in SONGS from the app's songs/ folder into renders/site/songs/: the
score, the plan, the critics' rounds, the mix and the stems, but not the render cache, which is
gigabytes and only speeds up a re-render. Your own songs/ folder is only read. Stars, tags, kits,
snippets and ensembles get fresh copies (or none), as scripts/e2e_server.py does for the tests.
"""

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from harness import config

# A spread of genres and sizes, so the song list and the gallery show what the app makes.
SONGS = [
    "deep_dark_funk_with_a_groovy_baseline_an",  # Deep Cut Pocket: funk, 4 tracks
    "funky_chiptunes_battle_puzzle_minor_keys",  # Pixel Battle Puzzle: chiptune
    "progressive_contemplative_techno_at_128",  # Glass Circuits: techno
    "simcity_09_resort_steel_drums",  # Beachfront Resort: 8 tracks
    "give_me_a_reggae_version_of_three_blind_take2",  # Blind Mice One Drop: reggae
    "simcity_05_skyline_at_night",  # Skyline at Night
    "retro_chip_tunes_funk_where_the_melody_a",  # Chip Funk Evolution: 8 tracks
    "moody_bass_heavy_funk_track_with_minimal",  # Pocket Noir
    "deep_psychedelic_funk_new",  # Cosmic Slap
    "simcity_06_old_town_ragtime",  # City Planner's Ragtime
]

ROOT = config.RENDERS / "site"
MODEL = "qwen3:14b"
SKIP = {"cache", "versions", "meta.json"}  # the render cache; old versions; per-user state


def copy_song(src: Path, dst: Path) -> None:
    if dst.exists():
        return  # copied on an earlier run: the stems are hundreds of MB
    def ignore(folder: str, names: list[str]) -> set[str]:
        return {n for n in names if n in SKIP}
    shutil.copytree(src, dst, ignore=ignore)


def neutral(songs: Path) -> None:
    """The songs were made on the author's own LLM router, and record its model names: on the
    copies, say the model a reader would run (the README's Ollama example) instead."""
    for f in songs.rglob("*.json*"):
        text = f.read_text(encoding="utf-8")
        new = re.sub(r'"(\w*model)": *"[^"]+"', rf'"\1": "{MODEL}"', text)
        if new != text:
            f.write_text(new, encoding="utf-8")


def prepare() -> dict:
    songs = ROOT / "songs"
    songs.mkdir(parents=True, exist_ok=True)
    for name in SONGS:
        copy_song(config.ROOT / "songs" / name, songs / name)
    jukebox = config.ROOT / "songs" / "_jukebox"
    if jukebox.exists() and not (songs / "_jukebox").exists():
        shutil.copytree(jukebox, songs / "_jukebox")
    neutral(songs)
    kits = ROOT / "kits"
    shutil.rmtree(kits, ignore_errors=True)
    shutil.copytree(config.ROOT / "kits", kits)
    tagged = ROOT / "tags.json"
    shutil.copy(config.ROOT / "tags" / "sounds.json", tagged)
    for d in ("snippets", "ensembles"):
        (ROOT / d).mkdir(exist_ok=True)
    return {**os.environ, "SMS_SONGS": str(songs), "SMS_KITS": str(kits),
            "SMS_SNIPPETS": str(ROOT / "snippets"), "SMS_STARS": str(ROOT / "stars.json"),
            "SMS_ENSEMBLES": str(ROOT / "ensembles"), "SMS_TAGS": str(tagged),
            "SMS_EXPORTS": str(ROOT / "exports")}


if __name__ == "__main__":
    env = prepare()
    port = sys.argv[sys.argv.index("--port") + 1] if "--port" in sys.argv else "8002"
    sys.exit(subprocess.call([sys.executable, "-m", "uvicorn", "server.app:app", "--port", port],
                             env=env, cwd=config.ROOT))
