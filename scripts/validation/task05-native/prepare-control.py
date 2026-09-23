#!/usr/bin/env python3
"""Prepare one local control from an OFFLINE phone copy; never modifies the phone."""
import argparse
import datetime
import hashlib
import json
import sqlite3
import uuid
from pathlib import Path

if not __debug__:
    raise SystemExit('Refusing disabled preservation guards (python -O)')


def prepare(baseline, documents, server, media_id, kind):
    old = json.loads(baseline.read_text())
    accepted = json.loads(server.read_text())
    assert media_id not in {r['id'] for r in old['media']}, 'Never target a baseline photo'
    assert media_id not in {r['id'] for r in accepted['media']}, 'Never target an existing server asset'
    databases = list(documents.rglob('handovertrack-projects-v1.db'))
    assert len(databases) == 1
    db = sqlite3.connect(databases[0].resolve().as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    assert db.execute('pragma integrity_check').fetchone()[0] == 'ok'
    assert db.execute('pragma user_version').fetchone()[0] == 4
    assert not list(db.execute('pragma foreign_key_check'))
    rows = {r['id']: dict(r) for r in db.execute('select * from media_local')}
    queues = {r['media_id']: dict(r) for r in db.execute('select * from media_queue')}
    for row in old['media']:
        assert rows[row['id']] == row, 'Existing original metadata changed'
        path = documents / row['directory'] / 'original.jpg'
        assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
    for queue in old['queue']:
        assert queues[queue['media_id']] == queue, 'Existing receipt changed'
    row, queue = rows[media_id], queues[media_id]
    assert row['state'] == 'saved_local' and queue['state'] == 'pending'
    assert queue['attempts'] == 0 and queue['upload_id'] is None and queue['accepted_at'] is None
    assert all(row[k] == queue[k] for k in ['account_id', 'organization_id'])
    assert datetime.datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')).timestamp() > old['at_unix']
    directory = f"captures/{row['account_id']}/{row['organization_id']}/{media_id}"
    assert row['directory'] == directory
    path = documents / directory / 'original.jpg'
    assert path.stat().st_size == row['size'] and hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
    manifest = json.loads((path.parent / 'manifest.json').read_text())
    reservation = json.loads((path.parent / 'reservation.json').read_text())
    assert manifest['version'] == reservation['version'] == 1
    assert manifest['ticket'] == reservation['ticket']
    for key, column in [('id', 'id'), ('accountId', 'account_id'), ('organizationId', 'organization_id'), ('projectId', 'project_id'), ('createdAt', 'created_at'), ('directory', 'directory')]:
        assert manifest['ticket'][key] == row[column]
    assert all(manifest['original'][key] == row[key] for key in ['size', 'sha256', 'width', 'height'])
    return {'version': 1, 'caseId': str(uuid.uuid4()), 'kind': kind, 'action': 'arm', 'mediaId': media_id,
            'accountId': row['account_id'], 'organizationId': row['organization_id'], 'projectId': row['project_id'],
            'createdAt': row['created_at'], 'sha256': row['sha256'], 'size': row['size']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--phone-documents', type=Path, required=True)
    parser.add_argument('--server-snapshot', type=Path, required=True, help='Fresh read-only server media inventory')
    parser.add_argument('--media-id', required=True)
    parser.add_argument('--kind', choices=['cancel', 'terminate', 'completion'], required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    control = prepare(args.baseline, args.phone_documents, args.server_snapshot, args.media_id, args.kind)
    import os
    with os.fdopen(os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as stream:
        json.dump(control, stream, indent=2)
    print(f"Prepared local-only {control['kind']} control for {control['mediaId']}; not installed or armed on phone.")
