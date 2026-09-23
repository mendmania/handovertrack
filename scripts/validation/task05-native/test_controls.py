import hashlib
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('prepare', HERE / 'prepare-control.py')
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class Controls(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.docs = self.root / 'Documents'
        self.docs.mkdir()
        self.db = sqlite3.connect(self.docs / 'handovertrack-projects-v1.db')
        self.addCleanup(self.db.close)
        self.db.executescript('''pragma user_version=4;
          create table media_local(id text,account_id text,organization_id text,project_id text,
            created_at text,directory text,state text,size integer,sha256 text,width integer,height integer);
          create table media_queue(media_id text,account_id text,organization_id text,state text,
            attempts integer,upload_id text,accepted_at text);''')
        self.old = self.capture('10000000-0000-4000-8000-000000000001', '2026-01-01T00:00:00.000Z', True)
        self.baseline = self.root / 'baseline.json'
        self.baseline.write_text(json.dumps({'at_unix':1780000000, 'media':[self.old[0]], 'queue':[self.old[1]]}))
        self.new = self.capture('10000000-0000-4000-8000-000000000002', '2099-01-01T00:00:00.000Z', False)
        self.server = self.root / 'server.json'
        self.server.write_text(json.dumps({'media':[{'id':self.old[0]['id']}]}))

    def capture(self, media_id, at, accepted):
        directory = f'captures/account/org/{media_id}'
        path = self.docs / directory
        path.mkdir(parents=True)
        original = b'immutable-fixture'
        (path / 'original.jpg').write_bytes(original)
        row = dict(id=media_id,account_id='account',organization_id='org',project_id='project',created_at=at,
                   directory=directory,state='saved_local',size=len(original),sha256=hashlib.sha256(original).hexdigest(),width=10,height=10)
        queue = dict(media_id=media_id,account_id='account',organization_id='org',state='server_accepted' if accepted else 'pending',
                     attempts=1 if accepted else 0,upload_id='existing-session' if accepted else None,accepted_at=at if accepted else None)
        ticket = dict(id=media_id,accountId='account',organizationId='org',projectId='project',createdAt=at,directory=directory)
        (path / 'reservation.json').write_text(json.dumps({'version':1,'ticket':ticket}))
        (path / 'manifest.json').write_text(json.dumps({'version':1,'ticket':ticket,'original':{k:row[k] for k in ['size','sha256','width','height']}}))
        self.db.execute('insert into media_local values('+','.join('?' for _ in row)+')',list(row.values()))
        self.db.execute('insert into media_queue values('+','.join('?' for _ in queue)+')',list(queue.values()))
        self.db.commit()
        return row, queue

    def run_control(self, media_id=None):
        return prepare.prepare(self.baseline,self.docs,self.server,media_id or self.new[0]['id'],'cancel')

    def test_new_verified_identity(self):
        control = self.run_control()
        self.assertEqual(control['mediaId'], self.new[0]['id'])
        self.assertEqual(control['sha256'], self.new[0]['sha256'])
        self.assertEqual(control['action'], 'arm')
        self.assertFalse((self.docs / 'task05-control.json').exists())

    def test_baseline_id_refused(self):
        with self.assertRaisesRegex(AssertionError,'baseline photo'):
            self.run_control(self.old[0]['id'])

    def test_server_id_refused(self):
        self.server.write_text(json.dumps({'media':[{'id':self.new[0]['id']}]}))
        with self.assertRaisesRegex(AssertionError,'existing server asset'):
            self.run_control()

    def test_changed_old_receipt_refused(self):
        self.db.execute("update media_queue set state='pending' where media_id=?",(self.old[0]['id'],));self.db.commit()
        with self.assertRaisesRegex(AssertionError,'Existing receipt changed'):
            self.run_control()

    def test_new_original_corruption_refused(self):
        (self.docs / self.new[0]['directory'] / 'original.jpg').write_bytes(b'changed')
        with self.assertRaises(AssertionError):self.run_control()

    def test_prior_attempt_refused(self):
        self.db.execute('update media_queue set attempts=1 where media_id=?',(self.new[0]['id'],));self.db.commit()
        with self.assertRaises(AssertionError):self.run_control()


if __name__ == '__main__':
    unittest.main()
