#!/usr/bin/env python3
"""Build exact 30-second midpoint excerpts from private masters outside this repo."""
import argparse
import concurrent.futures
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("masters", type=Path, help="Private directory containing <beat-id>.mp3 or .wav")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
catalog = json.loads(subprocess.check_output([
    "node", "-e", "global.window={};require('./scripts/catalog.js');process.stdout.write(JSON.stringify(window.RAISEUP_BEATS))"
], cwd=root))


def build(beat):
    matches = [args.masters / (beat["id"] + ext) for ext in (".mp3", ".wav")]
    source = next((p for p in matches if p.is_file()), None)
    if source is None:
        raise FileNotFoundError(beat["id"])
    duration = float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(source)
    ]))
    if duration < 30:
        raise ValueError(f"{beat['id']}: master is shorter than 30 seconds")
    start = (duration - 30) / 2
    norm = "loudnorm=I=-14:TP=-1.5:LRA=11"
    measure = subprocess.run([
        "ffmpeg", "-hide_banner", "-ss", str(start), "-i", str(source), "-t", "30",
        "-af", norm + ":print_format=json", "-f", "null", "-"
    ], capture_output=True, text=True, check=True).stderr
    measured = json.loads(measure[measure.rfind("{"):measure.rfind("}") + 1])
    filters = (norm + f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}"
               f":measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}"
               f":offset={measured['target_offset']}:linear=true"
               ",afade=t=in:st=0:d=0.05,afade=t=out:st=29.5:d=0.5")
    target = root / beat["preview"].split("?")[0]
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-ss", str(start), "-i", str(source), "-t", "30",
        "-af", filters, "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "128k",
        "-map_metadata", "-1", "-metadata", f"title={beat['title']} - 30 Second Midpoint Preview",
        "-metadata", "artist=Raise Up Entertainment LLC", "-write_xing", "1", str(target)
    ], check=True)
    decoded = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(target), "-ar", "44100", "-ac", "2", "-f", "f32le", "pipe:1"
    ])
    seconds = len(decoded) / (4 * 2 * 44100)
    if abs(seconds - 30) > 0.002:
        raise ValueError(f"{beat['id']}: decoded length {seconds}")
    return {"id": beat["id"], "title": beat["title"], "master_seconds": round(duration, 3),
            "start_seconds": round(start, 3), "end_seconds": round(start + 30, 3),
            "decoded_preview_seconds": seconds, "preview": str(target.relative_to(root))}


with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    manifest = list(pool.map(build, catalog))
(root / "docs" / "preview-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Verified {len(manifest)} midpoint previews, each exactly 30 decoded seconds.")
