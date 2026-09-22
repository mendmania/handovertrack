#!/usr/bin/env python3
"""Fixed, explicitly installed main-branch pull controller. Never executes downloaded code."""
import argparse
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile

REPO = 'mendmania/handovertrack'
WORKFLOW = '.github/workflows/release.yml'
COMPONENTS = ('worker', 'api', 'web')
HERE = Path(__file__).resolve().parent


def require(condition, message):
    if not condition:
        raise ValueError(message)


def private_file(path):
    value = path.lstat()
    require(stat.S_ISREG(value.st_mode) and value.st_uid == os.geteuid() and value.st_mode & 0o077 == 0,
            'Expected an operator-owned private regular file')


def save(path, value):
    temp = path.with_suffix('.tmp')
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump(value, stream, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temp, path)


def command(args, timeout=120, **kwargs):
    result = subprocess.run(args, capture_output=True, timeout=timeout, **kwargs)
    if result.returncode:
        # Child logs may include credentials. Never include raw stderr in the journal.
        raise RuntimeError('Operator command failed: ' + Path(args[0]).name)
    return result.stdout


def api(path, binary=False):
    raw = command(['gh', 'api', 'repos/' + REPO + '/' + path], timeout=60)
    require(len(raw) <= 2 * 1024 * 1024, 'GitHub response exceeds bound')
    return raw if binary else json.loads(raw)


def qualify(run, sha):
    require(run.get('head_sha') == sha and run.get('head_branch') == 'main'
            and run.get('status') == 'completed' and run.get('conclusion') == 'success'
            and run.get('path') == WORKFLOW and run.get('event') in ('push', 'workflow_dispatch')
            and run.get('repository', {}).get('full_name') == REPO
            and run.get('head_repository', {}).get('full_name') == REPO, 'Unqualified workflow run')


def parse_metadata(raw, sha):
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        require(archive.namelist() == ['release.json'] and archive.getinfo('release.json').file_size < 128 * 1024,
                'Unexpected release artifact contents')
        result = json.loads(archive.read('release.json'))
    require(result.get('source') == sha and re.fullmatch(r'ghcr.io/mendmania/handovertrack@sha256:[0-9a-f]{64}', result.get('image', '')),
            'Artifact identity mismatch')
    contract = result.get('database_contract')
    require(isinstance(contract, dict) and 0 < len(contract) < 100
            and all(re.fullmatch(r'[0-9]{3}_[a-z0-9_]+\.sql', k) and re.fullmatch('[0-9a-f]{64}', v) for k, v in contract.items()),
            'Invalid database contract')
    require(result.get('data_policy') == 'disposable-only' and result.get('platform') == 'linux/amd64', 'Invalid release contract')
    return result


class Controller:
    def __init__(self, args):
        self.args = args
        self.runtime = args.runtime.resolve()
        self.runtime.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.k = ['kubectl', '--kubeconfig', str(args.kubeconfig), '--context', 'netcup-k3s-direct',
                  '--request-timeout=60s', '-n', 'handovertrack']

    def kube(self, *args):
        return command(self.k + list(args), timeout=300)

    def get(self, *args):
        return json.loads(self.kube(*args, '-o', 'json'))

    def status(self, status, **values):
        record = {'status': status, 'at_unix': time.time(), **values}
        save(self.runtime / 'autodeploy.json', record)
        print(json.dumps(record), flush=True)

    def deployments(self):
        deployments = {n: self.get('get', 'deployment', n) for n in COMPONENTS}
        for d in deployments.values():
            require(d['metadata']['namespace'] == 'handovertrack'
                    and d['metadata']['labels']['app.kubernetes.io/part-of'] == 'handovertrack'
                    and d['spec']['replicas'] == d['status'].get('availableReplicas') == 1
                    and len(d['spec']['template']['spec']['containers']) == 1, 'Unexpected or unhealthy source deployment')
        require(len({d['spec']['template']['spec']['containers'][0]['image'] for d in deployments.values()}) == 1,
                'Source images differ; inspect interrupted deployment')
        return deployments

    def contract(self):
        return json.loads(self.kube('exec', 'database-0', '--', 'psql', '-U', 'postgres', '-d', 'handovertrack', '-At', '-c',
                                    "select coalesce(json_object_agg(name,checksum),'{}'::json) from schema_migrations"))

    def originals(self):
        rows = json.loads(self.kube('exec', 'database-0', '--', 'psql', '-U', 'postgres', '-d', 'handovertrack', '-At', '-c',
            "select coalesce(json_agg(t),'[]'::json) from (select id,upload_id,account_id,organization_id,project_id,size,sha256,width,height,accepted_at from media_uploads where state='accepted' order by id) t"))
        return {r['id']: r for r in rows}

    def verify_image(self, release):
        # A fresh empty config ensures no other application's registry credential is reused.
        config = self.runtime / 'anonymous-docker'
        config.mkdir(mode=0o700, exist_ok=True)
        require(not (config / 'config.json').exists(), 'Anonymous registry configuration was changed')
        env = {**os.environ, 'DOCKER_CONFIG': str(config)}
        command(['docker', 'pull', '--platform', 'linux/amd64', release['image']], timeout=600, env=env)
        image = json.loads(command(['docker', 'inspect', release['image']], env=env))[0]
        require(image['Architecture'] == 'amd64' and image['Os'] == 'linux'
                and image['Config']['Labels'].get('org.opencontainers.image.revision') == release['source']
                and image['Config']['Labels'].get('org.opencontainers.image.source') == 'https://github.com/' + REPO,
                'Downloaded image provenance mismatch')

    def script(self, script, *args, timeout=1800):
        return command([sys.executable, str(HERE / script), *map(str, args)], timeout=timeout)

    def backup(self):
        target = self.args.backup_target.resolve()
        require(target.is_dir() and target.stat().st_mode & 0o077 == 0, 'Private snapshot target required')
        before = set(target.glob('handovertrack-*/receipt.json'))
        self.script('backup.py', '--kubeconfig', self.args.kubeconfig, '--runtime', self.runtime,
                    '--target', target, '--on-node-disposable')
        added = set(target.glob('handovertrack-*/receipt.json')) - before
        require(len(added) == 1, 'Expected exactly one fresh backup receipt')
        path = added.pop()
        receipt = json.loads(path.read_text())
        require(receipt.get('consistent') is True and receipt.get('hashes_verified') is True, 'Backup did not verify')
        for name, expected in receipt['sha256'].items():
            require(Path(name).name == name, 'Unsafe backup receipt path')
            h = hashlib.sha256()
            with (path.parent / name).open('rb') as stream:
                for data in iter(lambda: stream.read(4 * 1024 * 1024), b''):
                    h.update(data)
            require(h.hexdigest() == expected, 'Retained backup hash mismatch')
        for name in COMPONENTS:
            self.kube('rollout', 'status', 'deployment/' + name, '--timeout=180s')
        return path

    def smoke(self):
        for route, status in [('/sign-in', 200), ('/v1/me', 401)]:
            request = urllib.request.Request('https://handovertrack.com' + route)
            try:
                response = urllib.request.urlopen(request, timeout=20)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                require(response.code == status, 'Public HTTPS smoke failed')
                if route == '/v1/me':
                    require('no-store' in response.headers.get('Cache-Control', ''), 'Private response cache guard missing')
        self.kube('exec', 'deploy/api', '--', 'node', '-e',
                  "fetch('http://127.0.0.1:3301/health/ready',{signal:AbortSignal.timeout(10000)}).then(r=>process.exit(r.status===200?0:1))")
        self.kube('exec', 'deploy/worker', '--', 'node', '-e',
                  "process.exit(Date.now()-Number(require('fs').readFileSync('/tmp/worker-heartbeat','utf8'))<60000?0:1)")

    def deploy(self, release, run_id, policy):
        before = self.deployments()
        require(self.contract() == release['database_contract'] == policy['database_contract'], 'Schema change requires reviewed migration')
        originals = self.originals()
        self.verify_image(release)
        if self.args.check_only:
            self.status('eligible', source=release['source'], image=release['image'], run_id=run_id)
            return
        sha = release['source']
        if api('git/ref/heads/main')['object']['sha'] != sha:
            self.status('superseded', source=sha)
            return
        stamp = str(int(time.time())) + '-' + sha[:12]
        save(self.runtime / ('before-' + stamp + '.json'), before)
        # Persist before starting maintenance; an interrupted or failed operation
        # is held on future polls until an operator explicitly retries it.
        self.status('deploying', source=sha, image=release['image'], stage='backup', run_id=run_id)
        try:
            snapshot = self.backup()
            current = self.deployments()
            require(all(current[n]['spec'] == before[n]['spec'] for n in COMPONENTS), 'Concurrent workload change during backup')
            if api('git/ref/heads/main')['object']['sha'] != sha:
                self.status('superseded', source=sha, backup_receipt=str(snapshot))
                return
            preflight = self.runtime / ('preflight-' + stamp + '.json')
            self.script('preflight.py', '--kubeconfig', self.args.kubeconfig, '--existing-trial', '--output', preflight)
            candidate = self.runtime / ('candidate-' + stamp + '.json')
            exact_policy = self.runtime / ('policy-' + stamp + '.json')
            save(candidate, release)
            save(exact_policy, {'namespace': 'handovertrack', 'data_policy': 'disposable-only',
                'approved_source': sha, 'approved_image': release['image'], 'database_contract': policy['database_contract'],
                'artifact_verified': True, 'preflight_file': str(preflight), 'backup_receipt': str(snapshot)})
            self.status('deploying', source=sha, image=release['image'], stage='rollout', run_id=run_id, backup_receipt=str(snapshot))
            self.script('release.py', '--kubeconfig', self.args.kubeconfig, '--candidate', candidate,
                        '--policy', exact_policy, '--runtime', self.runtime, '--apply')
            self.smoke()
            after = self.deployments()
            expected = json.loads(json.dumps(before))
            for name in COMPONENTS:
                template = expected[name]['spec']['template']
                template['spec']['containers'][0]['image'] = release['image']
                template['metadata'].setdefault('annotations', {})['handovertrack.com/source'] = sha
                require(after[name]['spec'] == expected[name]['spec'], 'Unexpected workload change')
            now = self.originals()
            require(all(now.get(key) == value for key, value in originals.items()), 'Accepted original identity changed')
            record = {'source': sha, 'image': release['image'], 'version': release['version'], 'run_id': run_id,
                      'backup_receipt': str(snapshot), 'snapshot_scope': 'on-node-release-safety-only',
                      'preserved_accepted_originals': len(originals), 'https_smoke': 'PASS', 'schema_changed': False}
            save(self.runtime / ('passed-' + stamp + '.json'), record)
            self.status('passed', **record)
        except (Exception, KeyboardInterrupt) as error:
            self.status('failed-needs-review', source=sha, image=release['image'], error_type=type(error).__name__, run_id=run_id)
            raise RuntimeError('Deployment held; inspect private receipts. No data restore or destructive cleanup.') from None

    def run(self):
        path = self.runtime / 'autodeploy-policy.json'
        private_file(path)
        policy = json.loads(path.read_text())
        require(policy.get('namespace') == 'handovertrack' and policy.get('data_policy') == 'disposable-only', 'Wrong deployment policy')
        if policy.get('enabled') is not True:
            print('Automatic deployment disabled.')
            return
        prior = self.runtime / 'autodeploy.json'
        previous = json.loads(prior.read_text()) if prior.exists() else {}
        if previous.get('status') in ('deploying', 'failed-needs-review') and not self.args.retry:
            print('Previous deployment interrupted/failed; explicit operator --retry required.')
            return
        sha = api('git/ref/heads/main')['object']['sha']
        require(re.fullmatch('[0-9a-f]{40}', sha), 'Invalid main commit')
        current = self.deployments()
        if all(d['spec']['template']['metadata'].get('annotations', {}).get('handovertrack.com/source') == sha for d in current.values()):
            print('Current main already deployed; no action.')
            return
        runs = api('actions/workflows/release.yml/runs?head_sha=' + sha + '&per_page=10')['workflow_runs']
        good = []
        for run in runs:
            try:
                qualify(run, sha)
                good.append(run)
            except ValueError:
                pass
        if not good:
            print('Waiting for successful exact-main validation and publication.')
            return
        run = good[0]
        artifacts = api('actions/runs/' + str(run['id']) + '/artifacts')['artifacts']
        matches = [a for a in artifacts if a['name'] == 'handovertrack-release' and not a['expired']]
        require(len(matches) == 1 and matches[0]['size_in_bytes'] <= 256 * 1024, 'Missing/bounded release artifact required')
        release = parse_metadata(api('actions/artifacts/' + str(matches[0]['id']) + '/zip', binary=True), sha)
        self.deploy(release, run['id'], policy)


def main():
    require(__debug__, 'Do not disable safety assertions with python -O')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kubeconfig', type=Path, required=True)
    parser.add_argument('--runtime', type=Path, required=True)
    parser.add_argument('--backup-target', type=Path, required=True)
    parser.add_argument('--check-only', action='store_true')
    parser.add_argument('--retry', action='store_true')
    args = parser.parse_args()
    controller = Controller(args)
    private_file(args.kubeconfig)
    with (controller.runtime / 'autodeploy.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('Another automatic deployment is active.')
            return
        controller.run()


if __name__ == '__main__':
    def stop(_signal, _frame):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, stop)
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        raise SystemExit('HandoverTrack autodeploy stopped: ' + type(error).__name__ + '. Inspect private receipts; credentials are not logged.') from None
