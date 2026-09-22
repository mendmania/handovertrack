import hashlib
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from backup_media import CHUNK_BYTES, read_range, write_verified_archive


class BackupMediaTests(unittest.TestCase):
    def test_bounded_transfers_and_complete_regular_file_archive(self):
        data = b'a' * (CHUNK_BYTES + 19)
        files = {'original.jpg': data, 'accepted/original.jpg': data, 'empty': b''}
        inventory = {name: hashlib.sha256(value).hexdigest() for name, value in files.items()}
        calls = []
        def read(name, offset, length):
            calls.append(length)
            return files[name][offset:offset + length]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'media.tar.gz'
            write_verified_archive(output, inventory, {k: len(v) for k, v in files.items()}, read)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            with tarfile.open(output, 'r:gz') as archive:
                self.assertTrue(all(member.isfile() for member in archive))
                self.assertEqual({member.name: archive.extractfile(member).read() for member in archive}, files)
            self.assertEqual(calls, [CHUNK_BYTES, 19, CHUNK_BYTES, 19])
            with self.assertRaises(FileExistsError):
                write_verified_archive(output, inventory, {k: len(v) for k, v in files.items()}, read)

    def test_truncated_corrupt_and_unsafe_inputs_fail_closed(self):
        inventory = {'original.jpg': hashlib.sha256(b'photo').hexdigest()}
        for data in [b'phot', b'wrong']:
            with self.subTest(data=data), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / 'partial.tar.gz'
                with patch('backup_media.read_range', side_effect=lambda fn, *args: read_range(fn, *args, sleep=lambda _: None)):
                    with self.assertRaises((ValueError, OSError)):
                        write_verified_archive(output, inventory, {'original.jpg': 5}, lambda *args: data)
                self.assertTrue(output.exists())
        for name in ['../escape', '/absolute', './alias', 'a/../escape', '.']:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / 'media.tar.gz'
                with self.assertRaises(ValueError):
                    write_verified_archive(output, {name: 'unused'}, {name: 1}, lambda *args: b'x')
                self.assertFalse(output.exists())

    def test_read_retry_is_bounded_and_repeats_only_the_same_range(self):
        calls = []
        def read(*args):
            calls.append(args)
            if len(calls) == 1:
                raise ConnectionResetError('simulated reset')
            return b'p' if len(calls) == 2 else b'photo'
        self.assertEqual(read_range(read, 'original.jpg', 11, 5, sleep=lambda _: None), b'photo')
        self.assertEqual(calls, [('original.jpg', 11, 5)] * 3)
        calls.clear()
        def short(*args):
            calls.append(args)
            return b'p'
        with self.assertRaises(OSError):
            read_range(short, 'original.jpg', 11, 5, sleep=lambda _: None)
        self.assertEqual(len(calls), 3)


if __name__ == '__main__':
    unittest.main()
