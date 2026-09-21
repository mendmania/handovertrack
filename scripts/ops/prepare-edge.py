#!/usr/bin/env python3
"""Read current shared config; emit an additive candidate and concurrency-guarded patch.
Does not apply or restart anything. Candidate must be validated before operator apply.
"""
import argparse,hashlib,json,os,subprocess
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--kubeconfig',required=True); p.add_argument('--output-dir',required=True); a=p.parse_args()
k=['kubectl','--kubeconfig',a.kubeconfig,'--context','netcup-k3s-direct','-n','edge-caddy']
get=lambda args:json.loads(subprocess.check_output(k+args,text=True))
dep=get(['get','deployment','edge-caddy','-o','json'])
index,volume=next((i,v) for i,v in enumerate(dep['spec']['template']['spec']['volumes']) if v['name']=='caddyfile')
old=volume['configMap']['name']; cm=get(['get','configmap',old,'-o','json'])
base=cm['data']['Caddyfile']; assert 'handovertrack.com' not in base,'Hostname already exists; investigate ownership'
fragment=(Path(__file__).resolve().parents[2]/'infra/edge/Caddyfile.handovertrack').read_text()
candidate=base+'\n'+fragment; digest=hashlib.sha256(candidate.encode()).hexdigest(); name='handovertrack-edge-'+digest[:12]
directory=Path(a.output_dir); directory.mkdir(mode=0o700,parents=True,exist_ok=False)
def save(name,value):
    file=directory/name
    with open(file,'x') as f: os.chmod(file,0o600); f.write(value)
save('Caddyfile',candidate)
save('before.json',json.dumps({'deployment':dep,'configmap':cm}))
save('configmap.json',json.dumps({'apiVersion':'v1','kind':'ConfigMap','metadata':{'name':name,'namespace':'edge-caddy','labels':{'app.kubernetes.io/part-of':'handovertrack'}},'immutable':True,'data':{'Caddyfile':candidate}}))
patch=[{'op':'test','path':'/metadata/resourceVersion','value':dep['metadata']['resourceVersion']},
       {'op':'test','path':f'/spec/template/spec/volumes/{index}/configMap/name','value':old},
       {'op':'replace','path':f'/spec/template/spec/volumes/{index}/configMap/name','value':name}]
save('patch.json',json.dumps(patch))
save('receipt.json',json.dumps({'previous':old,'candidate':name,'sha256':digest,'volume_index':index}))
print('Prepared additive edge candidate. No mutation. Validate and recheck resourceVersion before apply.')
