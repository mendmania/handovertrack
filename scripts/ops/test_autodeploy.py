"""Offline provenance, backup ordering, preservation and failure-hold checks."""
import argparse
import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('autodeploy', Path(__file__).with_name('autodeploy.py'))
auto = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auto)
SHA = 'a' * 40
OLD = 'local/runtime@sha256:' + 'b' * 64
NEW = 'ghcr.io/mendmania/handovertrack@sha256:' + 'c' * 64
CONTRACT = {'001_foundation.sql': 'd' * 64}
RELEASE = {'source': SHA, 'image': NEW, 'database_contract': CONTRACT, 'data_policy': 'disposable-only', 'platform': 'linux/amd64', 'version': 'main-1-' + SHA[:12]}
RUN = {'head_sha': SHA, 'head_branch': 'main', 'status': 'completed', 'conclusion': 'success', 'path': auto.WORKFLOW,
       'event': 'push', 'repository': {'full_name': auto.REPO}, 'head_repository': {'full_name': auto.REPO}, 'id': 123}


def artifact(value=RELEASE, name='release.json'):
    data = io.BytesIO()
    with zipfile.ZipFile(data, 'w') as z:
        z.writestr(name, json.dumps(value))
    return data.getvalue()


class ProvenanceTests(unittest.TestCase):
    def test_successful_same_repo_main_run(self):
        auto.qualify(RUN, SHA)
        self.assertEqual(auto.parse_metadata(artifact(), SHA), RELEASE)

    def test_failed_foreign_pr_or_wrong_source_run_refused(self):
        for field, value in [('event', 'pull_request'), ('head_sha', 'e' * 40), ('conclusion', 'failure'),
                             ('head_branch', 'feature'), ('path', '.github/workflows/other.yml'),
                             ('head_repository', {'full_name': 'stranger/fork'})]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                auto.qualify({**RUN, field: value}, SHA)

    def test_wrong_digest_source_contract_or_zip_refused(self):
        for change in [{'image': 'ghcr.io/mendmania/handovertrack:latest'}, {'source': 'f' * 40},
                       {'database_contract': {'../escape': 'd' * 64}}, {'data_policy': 'production'}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                auto.parse_metadata(artifact({**RELEASE, **change}), SHA)
        with self.assertRaises(ValueError):
            auto.parse_metadata(artifact(name='../release.json'), SHA)


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.calls = []
        args = argparse.Namespace(runtime=self.root, kubeconfig=self.root/'kube', backup_target=self.root/'backups', check_only=False, retry=False)
        self.c = auto.Controller(args)
        self.before = {n: {'metadata': {'namespace':'handovertrack','labels':{'app.kubernetes.io/part-of':'handovertrack'}},
            'spec': {'replicas':1,'template': {'metadata': {'annotations': {'keep':'yes','handovertrack.com/source':'0'*40}},
                'spec': {'containers':[{'image':OLD,'envFrom':[{'configMapRef':{'name':'runtime'}}]}], 'volumes':[{'name':'media','persistentVolumeClaim':{'claimName':'media'}}]}}},
            'status': {'availableReplicas':1}} for n in auto.COMPONENTS}
        self.current = copy.deepcopy(self.before)
        self.c.deployments = lambda: copy.deepcopy(self.current)
        self.c.contract = lambda: CONTRACT
        self.c.originals = lambda: {'photo': {'id':'photo','sha256':'unchanged','account_id':'owner'}}
        self.c.verify_image = lambda _r: self.calls.append('verify_image')
        self.c.backup = lambda: self.calls.append('backup') or self.root/'receipt.json'
        self.c.smoke = lambda: self.calls.append('smoke')
        self.fail = False
        def script(name, *_args, **_kwargs):
            self.calls.append(name)
            if name == 'release.py':
                if self.fail:
                    raise RuntimeError('simulated interrupted rollout')
                for d in self.current.values():
                    d['spec']['template']['spec']['containers'][0]['image'] = NEW
                    d['spec']['template']['metadata']['annotations']['handovertrack.com/source'] = SHA
        self.c.script = script
        self.policy = {'namespace':'handovertrack','data_policy':'disposable-only','enabled':True,'database_contract':CONTRACT}
        auto.save(self.root/'autodeploy-policy.json', self.policy)
        self.api_patch = patch.object(auto, 'api', return_value={'object':{'sha':SHA}})
        self.api_patch.start()
        self.addCleanup(self.api_patch.stop)

    def test_verified_backup_before_rollout_and_originals_preserved(self):
        self.c.deploy(RELEASE, 123, self.policy)
        self.assertEqual(self.calls, ['verify_image','backup','preflight.py','release.py','smoke'])
        state = json.loads((self.root/'autodeploy.json').read_text())
        self.assertEqual(state['status'], 'passed')
        self.assertEqual(state['preserved_accepted_originals'], 1)
        self.assertEqual(state['snapshot_scope'], 'on-node-release-safety-only')

    def test_schema_change_stops_before_download_or_backup(self):
        with self.assertRaises(ValueError):
            self.c.deploy({**RELEASE,'database_contract':{'002_new.sql':'f'*64}}, 123, self.policy)
        self.assertEqual(self.calls, [])

    def test_check_only_does_not_backup_or_deploy(self):
        self.c.args.check_only = True
        self.c.deploy(RELEASE, 123, self.policy)
        self.assertEqual(self.calls, ['verify_image'])
        self.assertEqual(json.loads((self.root/'autodeploy.json').read_text())['status'], 'eligible')

    def test_superseded_source_stops_before_maintenance(self):
        with patch.object(auto, 'api', return_value={'object':{'sha':'f'*40}}):
            self.c.deploy(RELEASE, 123, self.policy)
        self.assertEqual(self.calls, ['verify_image'])

    def test_backup_failure_never_calls_release(self):
        self.c.backup = lambda: (_ for _ in ()).throw(RuntimeError('failed backup'))
        with self.assertRaises(RuntimeError):
            self.c.deploy(RELEASE, 123, self.policy)
        self.assertNotIn('release.py', self.calls)
        self.assertEqual(json.loads((self.root/'autodeploy.json').read_text())['status'], 'failed-needs-review')

    def test_concurrent_workload_edit_stops_release(self):
        def backup():
            self.current['api']['spec']['replicas'] = 2
            return self.root/'receipt.json'
        self.c.backup = backup
        with self.assertRaises(RuntimeError):
            self.c.deploy(RELEASE, 123, self.policy)
        self.assertNotIn('release.py', self.calls)

    def test_interrupted_rollout_holds_even_if_new_main_exists(self):
        self.fail = True
        with self.assertRaises(RuntimeError):
            self.c.deploy(RELEASE, 123, self.policy)
        with patch.object(auto, 'api', side_effect=AssertionError('must remain held')):
            self.c.run()
        self.assertEqual(json.loads((self.root/'autodeploy.json').read_text())['status'], 'failed-needs-review')

    def test_lost_original_fails_post_rollout_verification(self):
        reads = iter([{'photo':{'sha256':'original'}}, {}])
        self.c.originals = lambda: next(reads)
        with self.assertRaises(RuntimeError):
            self.c.deploy(RELEASE, 123, self.policy)
        self.assertEqual(json.loads((self.root/'autodeploy.json').read_text())['status'], 'failed-needs-review')


if __name__ == '__main__':
    unittest.main()
