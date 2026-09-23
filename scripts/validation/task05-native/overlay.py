#!/usr/bin/env python3
"""Prepare a reversible local-only signed-build overlay; never installs/launches."""
import argparse
import hashlib
import json
import plistlib
from pathlib import Path

if not __debug__:
    raise SystemExit('Refusing disabled preservation guards (python -O)')

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent


def digest(data):
    return hashlib.sha256(data).hexdigest()


def apply(directory, baseline):
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    journal = directory / 'overlay.json'
    if journal.exists():
        raise ValueError('Existing overlay journal; inspect or restore it first')
    phone = json.loads(baseline.read_text())
    ids = [r['id'] for r in phone['media']]
    assert len(ids) == len(set(ids)) and ids
    from datetime import datetime, timezone
    cutoff = datetime.fromtimestamp(phone['at_unix'], timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    mobile = ROOT / 'apps/mobile'
    transport = mobile / 'src/capture/native-upload.ts'
    generated = mobile / 'src/capture/task05-faults.ts'
    test = mobile / 'src/capture/task05-faults.test.ts'
    delegate = (mobile / 'node_modules/expo-file-system/ios/Legacy/EXSessionTasks/EXSessionCancelableUploadTaskDelegate.m').resolve()
    info = mobile / 'ios/HandoverTrack/Info.plist'
    assert not generated.exists() and not test.exists()
    src = transport.read_text()
    assert src.count('return { api, async content(') == 1 and src.endswith('  } };\n}\n')
    src = "import { wrapTask05Transport } from './task05-faults';\n" + src.replace('return { api, async content(', 'return wrapTask05Transport({ api, async content(')
    src = src[:-len('  } };\n}\n')] + '  } });\n}\n'
    native = delegate.read_text()
    progress = '  if (_onSendCallback && bytesSent > 0) {'
    completion = '  if (error) {'
    assert native.count(progress) == native.count(completion) == 1
    native = native.replace(progress, (HERE / 'delegate.m.inc').read_text() + progress)
    native = native.replace(completion, (HERE / 'completion.m.inc').read_text() + completion)
    plist = plistlib.loads(info.read_bytes())
    assert 'Task05ValidationBuild' not in plist
    plist['Task05ValidationBuild'] = 'task05-native-faults-v1'
    package_path = mobile / 'package.json'
    package = json.loads(package_path.read_text())
    autolinking = package.setdefault('expo', {}).setdefault('autolinking', {})
    assert 'buildFromSource' not in autolinking
    # SDK 57 otherwise links a precompiled framework and silently ignores the
    # patched delegate source. Keep every other Expo module on its normal path.
    autolinking['buildFromSource'] = ['^expo-file-system$']
    template = (HERE / 'transport.ts.in').read_text().replace('__BASELINE_IDS__', json.dumps(ids)).replace('__NOT_BEFORE__', cutoff)
    changes = {transport: src.encode(), generated: template.encode(), delegate: native.encode(), info: plistlib.dumps(plist), test: (HERE / 'transport.test.ts.in').read_bytes(), package_path: (json.dumps(package, indent=2) + '\n').encode()}
    entries = []
    for index, (path, data) in enumerate(changes.items()):
        original = path.read_bytes() if path.exists() else None
        backup = directory / f'original-{index}'
        if original is not None:
            backup.write_bytes(original); backup.chmod(0o600)
        entries.append({'path': str(path), 'original': str(backup) if original is not None else None,
                        'before': digest(original) if original is not None else None, 'overlay': digest(data)})
    journal.write_text(json.dumps({'baseline': str(baseline.resolve()), 'cutoff': cutoff, 'entries': entries}, indent=2)); journal.chmod(0o600)
    for path, data in changes.items():
        path.write_bytes(data)
    print('Temporary overlay applied; original files retained. No device or server mutation.')


def restore(directory):
    journal = directory / 'overlay.json'
    data = json.loads(journal.read_text())
    # Validate EVERY current file before writing any; never overwrite operator edits.
    for e in data['entries']:
        path = Path(e['path'])
        assert path.exists() and digest(path.read_bytes()) == e['overlay'], f'Concurrent edit: {path}'
        if e['original']:
            assert digest(Path(e['original']).read_bytes()) == e['before']
    for e in data['entries']:
        path = Path(e['path'])
        if e['original']:
            path.write_bytes(Path(e['original']).read_bytes())
        else:
            path.unlink()
    (directory / 'restored.json').write_text(json.dumps({'restored': True, 'entries': data['entries']}, indent=2))
    print('Normal source/dependency/Info.plist restored byte-for-byte; evidence retained.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['apply', 'restore'])
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    if args.action == 'apply':
        assert args.baseline
        apply(args.directory.resolve(), args.baseline)
    else:
        restore(args.directory.resolve())
