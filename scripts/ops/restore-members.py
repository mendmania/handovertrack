#!/usr/bin/env python3
"""Verify a media archive and select regular files without restoring PVC-root metadata."""
import argparse
import hashlib
import json
import os
import tarfile
from pathlib import Path, PurePosixPath


def verified_members(archive_path, inventory):
    actual = {}
    names = []
    with tarfile.open(archive_path, 'r:gz') as archive:
        for member in archive:
            path = PurePosixPath(member.name)
            if path.is_absolute() or '..' in path.parts:
                raise ValueError('Unsafe archive path')
            if member.isdir():
                continue
            if not member.isfile() or str(path) == '.':
                raise ValueError('Archive must contain only directories and regular files')
            key = str(path)
            if key in actual:
                raise ValueError('Duplicate archive file')
            digest = hashlib.sha256()
            with archive.extractfile(member) as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(chunk)
            actual[key] = digest.hexdigest()
            names.append(member.name)
    if actual != inventory:
        raise ValueError('Archive and source inventory differ')
    return b''.join(name.encode('utf-8') + b'\0' for name in names)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True)
    parser.add_argument('--inventory', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    members = verified_members(args.archive, json.loads(Path(args.inventory).read_text()))
    fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as out:
        out.write(members)
        out.flush()
        os.fsync(out.fileno())
    print('Verified regular-file member list saved; backup archive is unchanged.')


if __name__ == '__main__':
    main()
