#!/usr/bin/env python3
"""Fresh, loopback-only Task09 containers. Refuse existing names/env/data."""
import os
from pathlib import Path
import secrets
import subprocess
import time

root = Path('.local/task09').resolve()
root.mkdir(exist_ok=True, parents=True, mode=0o700)
image = 'postgres:18.3@sha256:7e32e9833a6fb1c92c32552794cb6ed569d51b445a54907d35fc112ef39684db'
for label in ['source', 'restore']:
    if (root / (label + '.env')).exists():
        raise SystemExit('Preserve existing Task09 run; choose a clean checkout for another run')
    if subprocess.run(['docker', 'container', 'inspect', 'handovertrack-task09-' + label], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
        raise SystemExit('Existing Task09 container; refusing reuse')
created = []
try:
    for label, port in [('source', 55550), ('restore', 55551)]:
        env = dict(ALLOW_DEV_SEED='true', POSTGRES_PASSWORD=secrets.token_hex(24), MIGRATOR_PASSWORD=secrets.token_hex(24), RUNTIME_PASSWORD=secrets.token_hex(24), AUTH_SECRET=secrets.token_hex(32), SEED_PASSWORD=secrets.token_hex(24), POSTGRES_PORT=str(port), NODE_ENV='development', API_HOST='127.0.0.1', API_PORT='3391', WEB_ORIGIN='http://localhost:3390', AUTH_BASE_URL='http://localhost:3390', API_INTERNAL_URL='http://127.0.0.1:3391', NEXT_PUBLIC_WEB_ORIGIN='http://localhost:3390', EXPO_PUBLIC_API_URL='http://127.0.0.1:3391', MEDIA_ROOT=str(root / (label + '-media')), TASK07_ISOLATED='true', TASK08_ISOLATED='true', TASK09_ISOLATED='true', REPORT_TEST_OUTPUT=str(root))
        for prefix in ['', 'TEST_']:
            env[prefix+'DATABASE_URL'] = f"postgresql://htrack_runtime:{env['RUNTIME_PASSWORD']}@127.0.0.1:{port}/handovertrack_test"
            env[prefix+'MIGRATION_DATABASE_URL'] = f"postgresql://htrack_migrator:{env['MIGRATOR_PASSWORD']}@127.0.0.1:{port}/handovertrack_test"
        file = root / (label + '.env')
        fd = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as stream:
            stream.write('\n'.join(f'{k}={v}' for k, v in env.items())+'\n')
        name = 'handovertrack-task09-' + label
        volume = name + '-' + secrets.token_hex(6)
        subprocess.run(['docker', 'run', '-d', '--name', name, '--label', 'handovertrack.task=09', '--memory', '512m', '--cpus', '1', '-e', 'POSTGRES_PASSWORD', '-p', f'127.0.0.1:{port}:5432', '-v', volume+':/var/lib/postgresql', image], env={**os.environ, 'POSTGRES_PASSWORD': env['POSTGRES_PASSWORD']}, check=True, stdout=subprocess.DEVNULL)
        created.append(name)
        for _ in range(60):
            if subprocess.run(['docker', 'exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
                break
            time.sleep(0.25)
        else:
            raise SystemExit('Isolated PostgreSQL readiness failed; resources retained')
        subprocess.run(['node', '--env-file='+str(file), '--import', 'tsx', 'packages/db/src/bootstrap-local.ts'], check=True)
except BaseException:
    for name in created:
        subprocess.run(['docker', 'stop', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    raise
print('Fresh isolated Task09 containers ready; credentials are private local files.')
