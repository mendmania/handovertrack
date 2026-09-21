"""Exercise release maintenance gates without contacting a cluster."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('release.py')
spec = importlib.util.spec_from_file_location('release', SCRIPT)
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
NOW = 2_000_000_000
OLD = 'local/handovertrack@sha256:' + 'a' * 64
NEW = 'local/handovertrack@sha256:' + 'b' * 64


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.calls = []
        self.candidate = {'image': NEW, 'source': 'c' * 40,
                          'database_contract': {'001.sql': 'checksum'}}
        self.evidence = {'at_unix': NOW - 10, 'checks': dict.fromkeys([
            'node_ready', 'no_pressure', 'disk_40GiB_spare', 'inodes_1M_spare',
            'memory_4GiB_spare', 'cpu_1500m_schedulable', 'dns_direct_origin',
            'existing_sites_healthy'], True)}
        self.backup = {'namespace': 'handovertrack', 'consistent': True,
                       'hashes_verified': True, 'at_unix': NOW - 10, 'image': OLD}
        self.policy = {'namespace': 'handovertrack', 'data_policy': 'disposable-only',
                       'approved_source': self.candidate['source'], 'approved_image': NEW,
                       'database_contract': self.candidate['database_contract'],
                       'artifact_verified': True, 'preflight_file': str(self.root / 'preflight'),
                       'backup_receipt': str(self.root / 'backup')}
        self.deployment = {
            'metadata': {'namespace': 'handovertrack', 'resourceVersion': '123',
                         'labels': {'app.kubernetes.io/part-of': 'handovertrack'}},
            'spec': {'replicas': 1, 'template': {
                'metadata': {'annotations': {'keep': 'original'}},
                'spec': {'containers': [{'image': OLD}]}}},
            'status': {'availableReplicas': 1}}
        self.fail_rollout = False

    def kubectl(self, command, **kwargs):
        self.assertEqual(command[:7], ['kubectl', '--kubeconfig', 'explicit-config',
                                     '--context', 'netcup-k3s-direct', '-n', 'handovertrack'])
        args = command[8:]
        self.calls.append(args)
        if args[:2] == ['get', 'namespace']:
            return json.dumps({'metadata': {'labels': {'handovertrack.com/data-policy': 'disposable-only'}}})
        if args[0] == 'exec':
            return json.dumps(self.candidate['database_contract'])
        if args[:2] == ['get', 'deployment']:
            return json.dumps(self.deployment)
        if args[:2] == ['patch', 'deployment']:
            edits = json.loads(args[args.index('-p') + 1])
            self.assertEqual(edits[0], {'op': 'test', 'path': '/metadata/resourceVersion', 'value': '123'})
            self.assertEqual(edits[1]['value'], OLD)
            self.assertEqual(edits[2]['value'], NEW)
            self.assertEqual(edits[3]['value']['keep'], 'original')
            return '{}'
        if args[:2] == ['rollout', 'status']:
            if self.fail_rollout:
                raise subprocess.CalledProcessError(1, command)
            return 'healthy'
        self.fail('Unexpected kubectl operation: ' + repr(args))

    def run_release(self, apply=True):
        for name, value in [('candidate', self.candidate), ('policy', self.policy),
                            ('preflight', self.evidence), ('backup', self.backup)]:
            p = self.root / name
            p.write_text(json.dumps(value))
            p.chmod(0o600)
        args = ['release.py', '--kubeconfig', 'explicit-config',
                '--candidate', str(self.root / 'candidate'), '--policy', str(self.root / 'policy'),
                '--runtime', str(self.root / 'runtime')] + (['--apply'] if apply else [])
        with patch.object(sys, 'argv', args), patch.object(release.subprocess, 'check_output', self.kubectl), \
                patch.object(release.time, 'time', return_value=NOW):
            release.main()

    def mutations(self):
        return [x for x in self.calls if x[0] == 'patch' and '--dry-run=server' not in x]

    def test_apply_uses_time_and_preserves_guarded_patches(self):
        original = copy.deepcopy(self.deployment)
        self.run_release()
        self.assertEqual([x[2] for x in self.mutations()], ['worker', 'api', 'web'])
        receipt = json.loads((self.root / 'runtime/release.json').read_text())
        self.assertEqual(receipt['at_unix'], NOW)
        self.assertEqual(receipt['status'], 'awaiting-https-smoke')
        self.assertEqual(receipt['applied'], ['worker', 'api', 'web'])
        self.assertEqual(self.deployment, original)
        self.assertEqual((self.root / 'runtime/release.json').stat().st_mode & 0o777, 0o600)

    def test_default_is_check_only(self):
        self.run_release(apply=False)
        self.assertEqual(self.mutations(), [])
        self.assertFalse((self.root / 'runtime/release.json').exists())

    def test_stale_or_future_evidence_stops_before_mutation(self):
        for field, offset in [('preflight', -900), ('preflight', 1), ('backup', -3600), ('backup', 1)]:
            with self.subTest(field=field, offset=offset):
                self.evidence['at_unix'] = self.backup['at_unix'] = NOW - 10
                (self.evidence if field == 'preflight' else self.backup)['at_unix'] = NOW + offset
                with self.assertRaises(AssertionError):
                    self.run_release()
                self.assertEqual(self.mutations(), [])

    def test_failed_gate_and_wrong_backup_image_stop_before_mutation(self):
        self.evidence['checks']['dns_direct_origin'] = False
        with self.assertRaises(AssertionError):
            self.run_release()
        self.evidence['checks']['dns_direct_origin'] = True
        self.backup['image'] = NEW
        with self.assertRaises(AssertionError):
            self.run_release()
        self.assertEqual(self.mutations(), [])

    def test_rollout_failure_keeps_partial_receipt(self):
        self.fail_rollout = True
        with self.assertRaisesRegex(SystemExit, 'Release failed'):
            self.run_release()
        receipt = json.loads((self.root / 'runtime/release.json').read_text())
        self.assertEqual(receipt['status'], 'failed-needs-review')
        self.assertEqual(receipt['applied'], ['worker'])
        self.assertEqual([x[2] for x in self.mutations()], ['worker'])

    def test_optimized_python_is_rejected(self):
        result = subprocess.run([sys.executable, '-O', str(SCRIPT)], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Run without -O', result.stderr)

    def test_shared_policy_is_rejected(self):
        self.run_release(apply=False)
        self.calls.clear()
        (self.root / 'policy').chmod(0o644)
        with patch.object(sys, 'argv', ['release.py', '--kubeconfig', 'explicit-config',
                '--candidate', str(self.root / 'candidate'), '--policy', str(self.root / 'policy'),
                '--runtime', str(self.root / 'runtime')]), \
                patch.object(release.subprocess, 'check_output', self.kubectl):
            with self.assertRaisesRegex(AssertionError, 'owner-only'):
                release.main()
        self.assertEqual(self.calls, [])


if __name__ == '__main__':
    unittest.main()
