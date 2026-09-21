#!/usr/bin/env python3
"""Create-only credentials for a NEW dedicated trial; never rotates existing data."""
import argparse,json,os,secrets,subprocess
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--kubeconfig',required=True); p.add_argument('--recovery-file',required=True); a=p.parse_args()
k=['kubectl','--kubeconfig',a.kubeconfig,'--context','netcup-k3s-direct','-n','handovertrack']
ns=json.loads(subprocess.check_output(k+['get','namespace','handovertrack','-o','json']))
assert ns['metadata']['labels'].get('app.kubernetes.io/part-of')=='handovertrack'
# Partial bootstrap must recover its saved secrets, never invent replacements.
for kind in ['secrets','pods','persistentvolumeclaims','statefulsets','deployments']:
    x=json.loads(subprocess.check_output(k+['get',kind,'-o','json']))
    if x['items']: raise SystemExit('Refusing nonempty bootstrap. Recover existing credentials explicitly.')
passwords={x:secrets.token_hex(32) for x in ['POSTGRES_PASSWORD','MIGRATOR_PASSWORD','RUNTIME_PASSWORD','AUTH_SECRET','SEED_PASSWORD']}
url=lambda role,key:f'postgresql://{role}:{passwords[key]}@database:5432/handovertrack'
data={'database-admin':{x:passwords[x] for x in ['POSTGRES_PASSWORD','MIGRATOR_PASSWORD','RUNTIME_PASSWORD']},
      'runtime':{'DATABASE_URL':url('htrack_runtime','RUNTIME_PASSWORD')},
      'migration':{'MIGRATION_DATABASE_URL':url('htrack_migrator','MIGRATOR_PASSWORD')},
      'auth':{'AUTH_SECRET':passwords['AUTH_SECRET']}, 'trial-accounts':{'SEED_PASSWORD':passwords['SEED_PASSWORD']}}
items=[{'apiVersion':'v1','kind':'Secret','metadata':{'name':name,'namespace':'handovertrack','labels':{'app.kubernetes.io/part-of':'handovertrack'}},'type':'Opaque','stringData':value} for name,value in data.items()]
payload=json.dumps({'apiVersion':'v1','kind':'List','items':items})
path=Path(a.recovery_file); path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f: f.write(payload); f.flush(); os.fsync(f.fileno())
# Output and errors suppressed: API errors can quote submitted secret values.
result=subprocess.run(k+['create','-f','-'],input=payload,text=True,capture_output=True)
if result.returncode: raise SystemExit('Create failed; preserve recovery file, inspect Secret names only, do not regenerate.')
print('Dedicated Secrets created; recovery file mode 0600. No values logged.')
