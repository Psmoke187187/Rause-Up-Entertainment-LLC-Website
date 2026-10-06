"""Check the disabled Android candidate and report exact bundled preview coverage."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile

PACKAGE = 'com.raiseupentertainment.app'


def check_gates(text):
    for field in ('BILLING_RELEASE_ENABLED', 'SERVER_VERIFICATION_READY'):
        declarations = re.findall(r"buildConfigField\s+'boolean',\s*'" + field + r"',\s*'([^']+)'", text)
        assert declarations == ['false'], f'{field} must remain literally false'
    declarations = re.findall(r"buildConfigField\s+'String',\s*'DELIVERY_API_ORIGIN',\s*'([^']+)'", text)
    assert declarations == ['""'], 'Delivery origin must remain empty'
    assert re.search(r"applicationId\s+'" + re.escape(PACKAGE) + "'", text)
    assert re.search(r'\btargetSdk\s+36\b', text)
    assert re.search(r'\bminSdk\s+23\b', text)


def preview_manifest(root, catalog):
    assets = root / 'app/src/main/assets'
    rows = json.loads((assets / 'preview-assets.json').read_text(encoding='utf-8'))
    assert isinstance(rows, list) and rows, 'Expected preview checksum manifest is required'
    names, products = set(), {item['id']: item for item in catalog['products']}
    expected = {}
    for row in rows:
        name = row['filename']
        assert re.fullmatch(r'[a-z0-9-]+\.mp3', name) and name not in names
        assert re.fullmatch(r'[a-f0-9]{64}', row['sha256'])
        assert type(row['size']) is int and 0 < row['size'] <= 2_000_000
        product = products[row['id']]
        assert product['previewUrl'].split('?', 1)[0] == f'https://raiseupentertainmentllc.com/assets/audio/previews/{name}'
        expected[name] = row
        names.add(name)
    assert {row['id'] for row in rows} == {item['id'] for item in catalog['products'] if item.get('previewUrl')}
    allowed_assets = {'android-catalog.json', 'preview-assets.json'} | {'previews/' + name for name in names}
    present, missing = [], []
    for path in assets.rglob('*'):
        if path.is_file():
            relative = path.relative_to(assets).as_posix()
            assert relative in allowed_assets, f'Unexpected bundled asset: {relative}'
    for name, row in expected.items():
        path = assets / 'previews' / name
        if not path.is_file():
            missing.append(name)
            continue
        payload = path.read_bytes()
        assert len(payload) == row['size'] and hashlib.sha256(payload).hexdigest() == row['sha256'], f'Preview mismatch: {name}'
        present.append(name)
    return expected, sorted(present), sorted(missing)


def check_archive(path, prefix, expected, present):
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, f'Corrupt build artifact: {path.name}'
        names = archive.namelist()
        clip_names = {name[len(prefix + 'previews/'):] for name in names if name.startswith(prefix + 'previews/') and not name.endswith('/')}
        assert clip_names == set(present), f'Artifact preview coverage differs: {path.name}'
        allowed = {prefix + 'android-catalog.json', prefix + 'preview-assets.json'} | {prefix + 'previews/' + name for name in present}
        assert all(name in allowed or name.endswith('/') for name in names if name.startswith(prefix)), f'Unexpected packaged asset: {path.name}'
        for name in present:
            payload = archive.read(prefix + 'previews/' + name)
            assert len(payload) == expected[name]['size'] and hashlib.sha256(payload).hexdigest() == expected[name]['sha256']
        bundled = json.loads(archive.read(prefix + 'android-catalog.json'))
        assert bundled['packageName'] == PACKAGE and bundled['billingEnabled'] is False
        if path.suffix == '.aab':
            assert not any(re.fullmatch(r'META-INF/[^/]+\.(RSA|DSA|EC|SF)', name, re.IGNORECASE) for name in names), 'Release AAB must remain unsigned'
    return {'filename': path.name, 'sizeBytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--artifacts', action='store_true')
    args = parser.parse_args()
    root = args.root.resolve()
    check_gates((root / 'app/build.gradle').read_text(encoding='utf-8-sig'))
    catalog = json.loads((root / 'app/src/main/assets/android-catalog.json').read_text(encoding='utf-8'))
    assert catalog['schemaVersion'] == 1 and catalog['packageName'] == PACKAGE and catalog['billingEnabled'] is False
    ids, play_ids = set(), set()
    for item in catalog['products']:
        assert item['id'] not in ids and item['googlePlayProductId'] not in play_ids
        assert item['type'] in {'beat', 'pack'} and item['googlePlayPurchaseOptionId'] == 'buy'
        identity = 'rue_' + item['type'] + '_' + hashlib.sha256(item['id'].encode()).hexdigest()[:20]
        assert identity == item['googlePlayProductId']
        ids.add(item['id']); play_ids.add(identity)
    expected, present, missing = preview_manifest(root, catalog)
    report = {'packageName': PACKAGE, 'candidateOnly': True, 'releaseBillingEnabled': False,
              'serverVerificationReady': False, 'deliveryOriginConfigured': False,
              'products': len(ids), 'expectedPreviewFiles': len(expected), 'bundledPreviewFiles': len(present),
              'allPreviewsBundled': not missing, 'missingPreviewFiles': missing,
              'previewNote': 'No preview is downloaded by this build. Missing excerpts require later owner-approved asset upload or verified website availability.',
              'signedForPlayUpload': False, 'providerPurchasesTested': False}
    if args.artifacts:
        configs = list((root / 'app/build/generated/source/buildConfig').rglob('BuildConfig.java'))
        assert len(configs) == 2, 'Both debug and release generated BuildConfig files are required'
        for path in configs:
            text = path.read_text(encoding='utf-8')
            for field in ('BILLING_RELEASE_ENABLED', 'SERVER_VERIFICATION_READY'):
                assert re.search(r'boolean\s+' + field + r'\s*=\s*false\s*;', text)
            assert re.search(r'String\s+DELIVERY_API_ORIGIN\s*=\s*""\s*;', text)
        report['debugApk'] = check_archive(root / 'app/build/outputs/apk/debug/app-debug.apk', 'assets/', expected, present)
        report['debugApk']['signing'] = 'Android debug signing only; not a Play release'
        report['unsignedReleaseAab'] = check_archive(root / 'app/build/outputs/bundle/release/app-release.aab', 'base/assets/', expected, present)
        report['unsignedReleaseAab']['signing'] = 'Unsigned; owner upload signing configuration still required'
    output = root / 'build/candidate-review.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
