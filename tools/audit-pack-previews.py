#!/usr/bin/env python3
"""Check every active pack's preview files, decoding and waveform distinctness.

Requires Node.js, FFmpeg and FFprobe. Writes public preview information only.
Run from the repository root: python3 tools/audit-pack-previews.py
"""
import array
import concurrent.futures
import hashlib
import json
import math
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]


def run(*args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, check=True).stdout


def inspect(sample):
    path = ROOT / sample['src']
    if not path.is_file():
        raise ValueError('Missing preview: ' + sample['src'])
    metadata = json.loads(run('ffprobe', '-v', 'error', '-select_streams', 'a:0',
                              '-show_entries', 'stream=codec_name,sample_rate,channels,bits_per_sample',
                              '-of', 'json', str(path)))['streams'][0]
    # Canonical decoded PCM catches identical audio stored with different WAV headers.
    pcm = run('ffmpeg', '-v', 'error', '-xerror', '-i', str(path), '-map', '0:a:0',
              '-c:a', 'pcm_s16le', '-f', 's16le', '-')
    if not pcm or len(pcm) % 2:
        raise ValueError('Empty or incomplete audio: ' + sample['src'])
    values = array.array('h', pcm)
    if sys.byteorder != 'little':
        values.byteswap()
    peak = max(abs(min(values)), abs(max(values)))
    if peak <= 1:
        raise ValueError('Silent audio: ' + sample['src'])
    rate, channels = int(metadata['sample_rate']), int(metadata['channels'])
    duration = len(values) / (rate * channels)
    if duration < .01:
        raise ValueError('Audio too short: ' + sample['src'])
    return {**sample, 'durationSeconds': round(duration, 4), 'sampleRate': rate,
            'channels': channels, 'codec': metadata['codec_name'],
            'peakDBFS': round(20 * math.log10(peak / 32768), 2),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'decodedAudioSHA256': hashlib.sha256(pcm + str((rate, channels)).encode()).hexdigest()}


def main():
    source = """const fs=require('fs'),vm=require('vm');const c={window:{}};vm.createContext(c);
for(const f of ['packs-catalog','pack-previews'])vm.runInContext(fs.readFileSync('scripts/'+f+'.js','utf8'),c);
console.log(JSON.stringify(c.window));"""
    data = json.loads(run('node', '-e', source))
    packs, previews = data['RAISEUP_PACKS'], data['RAISEUP_PACK_PREVIEWS']
    results, errors = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for pack in packs:
            samples = previews.get(pack['id'], [])
            checked = []
            if len(samples) < 20:
                errors.append(pack['id'] + ': fewer than 20 previews')
            for sample, future in zip(samples, [pool.submit(inspect, s) for s in samples]):
                try:
                    checked.append(future.result())
                except Exception as exc:
                    errors.append(pack['id'] + ': ' + str(exc))
            hashes = [s['decodedAudioSHA256'] for s in checked]
            if len(hashes) != len(set(hashes)):
                errors.append(pack['id'] + ': duplicate decoded waveform')
            results.append({'id': pack['id'], 'title': pack['title'],
                            'previewCount': len(checked), 'distinctAudioCount': len(set(hashes)),
                            'samples': checked})
    report = {'packCount': len(packs), 'previewCount': sum(p['previewCount'] for p in results),
              'minimumPreviewsPerPack': min(p['previewCount'] for p in results),
              'errors': errors, 'packs': results}
    output = ROOT / 'docs/sound-pack-preview-audit.json'
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'packs'}, indent=2))
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
