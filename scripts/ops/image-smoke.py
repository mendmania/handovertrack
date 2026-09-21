#!/usr/bin/env python3
"""Local container validation using ONLY owned disposable tmpfs fixtures.
No host ports, existing DBs/volumes, registry credentials or cluster changes.
"""
import argparse,json,os,secrets,subprocess,tempfile,time
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--image',required=True); a=p.parse_args()
PROBE_IMAGE='node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6'
root=Path(__file__).resolve().parents[2]; prefix='handovertrack-smoke-'+secrets.token_hex(4); containers=[]
def run(*args):
    r=subprocess.run(['docker',*args],capture_output=True,text=True,timeout=120)
    if r.returncode: raise RuntimeError('Docker operation failed: '+args[0]+'; inspect only the owned smoke containers')
    return r.stdout.strip()
def launch(name,*args):
    result=run('run','-d','--name',prefix+'-'+name,'--network',prefix,*args); containers.append(prefix+'-'+name); return result
try:
    run('network','create','--internal',prefix)
    with tempfile.TemporaryDirectory(prefix=prefix) as directory:
        directory=Path(directory)
        pw={k:secrets.token_hex(24) for k in ['admin','migrator','runtime','auth','seed']}
        def env(name,values):
            file=directory/name; file.write_text('\n'.join(k+'='+v for k,v in values.items())+'\n'); file.chmod(0o600); return str(file)
        admin=env('admin.env',{'POSTGRES_PASSWORD':pw['admin'],'MIGRATOR_PASSWORD':pw['migrator'],'RUNTIME_PASSWORD':pw['runtime'],'PGDATA':'/var/lib/postgresql/18/docker','POSTGRES_USER':'postgres'})
        launch('database','--user','999:999','--read-only','--tmpfs','/var/lib/postgresql:uid=999,gid=999,mode=0700','--tmpfs','/var/run/postgresql:uid=999,gid=999','--tmpfs','/tmp','--env-file',admin,'--mount','type=bind,src='+str(root/'scripts/ops/init-db.sh')+',dst=/docker-entrypoint-initdb.d/init-db.sh,readonly','postgres:18.3@sha256:7e32e9833a6fb1c92c32552794cb6ed569d51b445a54907d35fc112ef39684db')
        for _ in range(60):
            try: run('exec',prefix+'-database','pg_isready','-U','postgres'); break
            except RuntimeError: time.sleep(1)
        else: raise RuntimeError('Database did not become ready')
        base={'NODE_ENV':'production','DATABASE_URL':'postgresql://htrack_runtime:'+pw['runtime']+'@'+prefix+'-database:5432/handovertrack','AUTH_SECRET':pw['auth'],'AUTH_BASE_URL':'https://handovertrack.com','WEB_ORIGIN':'https://handovertrack.com','API_HOST':'0.0.0.0','API_PORT':'3301','MEDIA_ROOT':'/media','MEDIA_RESERVE_BYTES':'0','WORKER_HEARTBEAT_FILE':'/tmp/worker-heartbeat','WORKER_HEARTBEAT_MS':'1000'}
        migration='postgresql://htrack_migrator:'+pw['migrator']+'@'+prefix+'-database:5432/handovertrack'
        migrate_env=env('migration.env',{'MIGRATION_DATABASE_URL':migration})
        for _ in range(2): run('run','--rm','--platform','linux/amd64','--network',prefix,'--env-file',migrate_env,a.image,'node','node_modules/tsx/dist/cli.mjs','packages/db/src/migrate.ts')
        # Offline development provisioning only, never a served sign-up endpoint.
        seed_env=env('seed.env',{**base,'NODE_ENV':'development','ALLOW_DEV_SEED':'true','SEED_PASSWORD':pw['seed'],'MIGRATION_DATABASE_URL':migration})
        run('run','--rm','--platform','linux/amd64','--network',prefix,'--env-file',seed_env,a.image,'node','node_modules/tsx/dist/cli.mjs','packages/db/src/seed.ts')
        runtime_env=env('runtime.env',base)
        common=['--platform','linux/amd64','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','768m','--cpus','1','--tmpfs','/tmp:uid=1000,gid=1000','--tmpfs','/media:uid=1000,gid=1000','--env-file',runtime_env]
        launch('api',*common,a.image,'node','apps/api/dist/main.js')
        launch('worker',*common,a.image,'node','apps/worker/dist/main.js')
        web_env=env('web.env',{'NODE_ENV':'production','API_INTERNAL_URL':'http://'+prefix+'-api:3301'})
        launch('web','--platform','linux/amd64','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','0.5','--tmpfs','/tmp:uid=1000,gid=1000','--tmpfs','/app/apps/web/.next/cache:uid=1000,gid=1000','--env-file',web_env,a.image,'node','apps/web/node_modules/next/dist/bin/next','start','apps/web','--hostname','0.0.0.0','--port','3300')
        for _ in range(8):
            try:
                run('run','--rm','--network',prefix,PROBE_IMAGE,'node','-e',"fetch('http://"+prefix+"-api:3301/health/ready',{signal:AbortSignal.timeout(5000)}).then(r=>process.exit(r.status===200?0:1))")
                run('run','--rm','--network',prefix,PROBE_IMAGE,'node','-e',"fetch('http://"+prefix+"-web:3300/sign-in',{signal:AbortSignal.timeout(5000)}).then(r=>process.exit(r.status===200?0:1))")
                break
            except RuntimeError: time.sleep(1)
        else: raise RuntimeError('App readiness failed')
        run('exec',prefix+'-worker','node','-e',"process.exit(Date.now()-Number(require('fs').readFileSync('/tmp/worker-heartbeat','utf8'))<10000?0:1)")
        run('run','--rm','--network',prefix,PROBE_IMAGE,'node','-e',"fetch('http://"+prefix+"-api:3301/v1/me',{signal:AbortSignal.timeout(5000)}).then(r=>{process.exit(r.status===401&&r.headers.get('cache-control')?.includes('no-store')?0:1)})")
        print('PASS local AMD64 image: nonroot read-only PostgreSQL initialization, migrations twice, isolated provisioning, API/Next readiness, worker heartbeat, private unauthorized response. No cluster or native evidence.')
except Exception as e:
    print(str(e)); raise SystemExit(1)
finally:
    for name in reversed(containers):
        log=subprocess.run(['docker','logs',name],capture_output=True).stdout
        errors=subprocess.run(['docker','logs',name],capture_output=True).stderr
        file=root/'.local'/(name+'.log'); file.write_bytes(log+errors); file.chmod(0o600)
        subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    subprocess.run(['docker','network','rm',prefix],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
