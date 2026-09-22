import hashlib
import importlib.util
import io
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('restore_members', Path(__file__).with_name('restore-members.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RestoreMembersTests(unittest.TestCase):
    def archive(self, root, extra=None):
        archive = root / 'media.tar.gz'
        with tarfile.open(archive, 'w:gz') as out:
            directory = tarfile.TarInfo('./')
            directory.type = tarfile.DIRTYPE
            directory.mode = 0o777
            out.addfile(directory)
            file = tarfile.TarInfo('./asset/original.jpg')
            file.size = 5
            out.addfile(file, io.BytesIO(b'photo'))
            if extra is not None:
                out.addfile(extra, io.BytesIO(b''))
        return archive

    def test_fresh_extraction_preserves_root_mode_and_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            archive = self.archive(root)
            members = root / 'members'
            members.write_bytes(module.verified_members(archive, {'asset/original.jpg': hashlib.sha256(b'photo').hexdigest()}))
            destination = root / 'restore'
            destination.mkdir(mode=0o700)
            # Portable root-selection regression; the runbook's extra GNU tar
            # flags are separately exercised in the pinned Linux restore helper.
            subprocess.run(['tar', '--no-same-owner', '--no-recursion',
                            '--null', '-C', str(destination),
                            '-xzf', str(archive), '-T', str(members)], check=True, capture_output=True)
            self.assertEqual(destination.stat().st_mode & 0o777, 0o700)
            self.assertEqual((destination / 'asset/original.jpg').read_bytes(), b'photo')

    def test_rejects_unsafe_types_paths_duplicates_and_hash_mismatch(self):
        cases = [tarfile.TarInfo('../escape'), tarfile.TarInfo('/escape'),
                 tarfile.TarInfo('./asset/original.jpg'), tarfile.TarInfo('./link')]
        cases[-1].type = tarfile.SYMTYPE
        cases[-1].linkname = '/escape'
        for extra in cases + [None]:
            with self.subTest(extra=extra), tempfile.TemporaryDirectory() as folder:
                archive = self.archive(Path(folder), extra)
                with self.assertRaises(ValueError):
                    module.verified_members(archive, {'asset/original.jpg': 'incorrect' if extra is None else hashlib.sha256(b'photo').hexdigest()})


if __name__ == '__main__':
    unittest.main()
