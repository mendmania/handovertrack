#!/usr/bin/env python3
"""Emit nonsecret, immutable metadata for the exact tested CI image."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


def metadata(source, image, root, run_number):
    if not re.fullmatch('[0-9a-f]{40}', source):
        raise ValueError('Full source SHA required')
    if not re.fullmatch(r'ghcr.io/mendmania/handovertrack@sha256:[0-9a-f]{64}', image):
        raise ValueError('Exact HandoverTrack registry digest required')
    contract = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                for p in sorted((root / 'packages/db/migrations').glob('*.sql'))}
    if not contract:
        raise ValueError('Missing database contract')
    return {'source': source, 'image': image, 'database_contract': contract,
            'data_policy': 'disposable-only', 'platform': 'linux/amd64',
            'version': f'main-{run_number}-{source[:12]}'}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source', required=True)
    p.add_argument('--image-file', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    root = Path(__file__).resolve().parents[2]
    if subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip() != a.source:
        raise SystemExit('Checkout does not match selected source')
    result = metadata(a.source, a.image_file.read_text().strip(), root, os.environ.get('GITHUB_RUN_NUMBER', 'local'))
    a.output.write_text(json.dumps(result, indent=2) + '\n')
