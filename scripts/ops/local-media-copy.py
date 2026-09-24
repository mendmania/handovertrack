#!/usr/bin/env python3
"""Only synthetic Task09 local roots; actual verified archive/restore primitives."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tarfile
from backup_media import write_verified_archive

mode, root_arg, backup_arg = sys.argv[1:]
root, backup = Path(root_arg).resolve(), Path(backup_arg).resolve()
if '.local' not in root.parts or 'task09' not in root.parts or '.local' not in backup.parts or 'task09' not in backup.parts:
    raise SystemExit('Only explicit .local/task09 synthetic paths accepted')
if mode == 'backup':
    inventory, sizes = {}, {}
    for path in sorted(root.rglob('*')):
        if path.is_symlink():
            raise ValueError('Symlink rejected')
        if path.is_file():
            name = path.relative_to(root).as_posix()
            inventory[name] = hashlib.sha256(path.read_bytes()).hexdigest()
            sizes[name] = path.stat().st_size
    def chunk(name, offset, length):
        with (root / name).open('rb') as stream:
            stream.seek(offset)
            return stream.read(length)
    write_verified_archive(backup / 'media.tar.gz', inventory, sizes, chunk)
    with (backup / 'inventory.json').open('x') as stream:
        json.dump(inventory, stream, sort_keys=True)
    os.chmod(backup / 'inventory.json', 0o600)
elif mode == 'restore':
    if root.exists():
        raise ValueError('Fresh destination required')
    spec = importlib.util.spec_from_file_location('members', Path(__file__).with_name('restore-members.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    inventory = json.loads((backup / 'inventory.json').read_text())
    names = module.verified_members(backup / 'media.tar.gz', inventory).decode().split('\0')[:-1]
    root.mkdir(mode=0o700)
    with tarfile.open(backup / 'media.tar.gz', 'r:gz') as archive:
        for name in names:
            dest = root / name
            dest.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with dest.open('xb') as out, archive.extractfile(name) as stream:
                while data := stream.read(1024 * 1024):
                    out.write(data)
                out.flush()
                os.fsync(out.fileno())
            os.chmod(dest, 0o600)
            if hashlib.sha256(dest.read_bytes()).hexdigest() != inventory[name]:
                raise ValueError('Restored bytes differ')
else:
    raise ValueError('Unknown mode')
print(json.dumps({'mode': mode, 'files': len(inventory), 'result': 'PASS'}))
