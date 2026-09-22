"""Build a verified gzip archive from bounded, read-only media transfers."""
import hashlib
import os
import subprocess
import tarfile
import tempfile
import time
from pathlib import PurePosixPath

CHUNK_BYTES = 4 * 1024 * 1024


def read_range(read_chunk, name, offset, length, sleep=time.sleep):
    for attempt in range(3):
        try:
            data = read_chunk(name, offset, length)
            if len(data) != length:
                raise OSError('Truncated media transfer: ' + name)
            return data
        except (OSError, subprocess.SubprocessError):
            if attempt == 2:
                raise
            sleep(attempt + 1)


def write_verified_archive(destination, inventory, sizes, read_chunk):
    if set(inventory) != set(sizes):
        raise ValueError('Media size/hash inventories differ')
    for name, size in sizes.items():
        path = PurePosixPath(name)
        if (path.is_absolute() or '..' in path.parts or str(path) != name
                or str(path) == '.' or not isinstance(size, int) or size < 0):
            raise ValueError('Unsafe media inventory entry')
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as output:
        with tarfile.open(fileobj=output, mode='w:gz') as archive:
            for name in sorted(inventory):
                digest = hashlib.sha256()
                # Only this new temporary transfer buffer is removed on close.
                with tempfile.TemporaryFile() as buffer:
                    for offset in range(0, sizes[name], CHUNK_BYTES):
                        length = min(CHUNK_BYTES, sizes[name] - offset)
                        data = read_range(read_chunk, name, offset, length)
                        digest.update(data)
                        buffer.write(data)
                    if digest.hexdigest() != inventory[name]:
                        raise ValueError('Media transfer hash mismatch: ' + name)
                    buffer.seek(0)
                    member = tarfile.TarInfo(name)
                    member.size = sizes[name]
                    member.mode = 0o600
                    archive.addfile(member, buffer)
        output.flush()
        os.fsync(output.fileno())
