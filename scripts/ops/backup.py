#!/usr/bin/env python3
"""Consistent download of the owned trial to an existing encrypted independent target.
Requires that the operator has verified target encryption/capacity and key custody.
No remote repository initialization, purchases, pruning or original deletion.
"""
import argparse,fcntl,hashlib,json,os,secrets,shutil,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--kubeconfig',required=True); p.add_argument('--target',required=True); p.add_argument('--runtime',required=True); a=p.parse_args()
k=['kubectl','--kubeconfig',a.kubeconfig,'--context','netcup-k3s-direct','-n','handovertrack','--request-timeout=60s']
def run(args,**kwargs): return subprocess.check_output(k+args,**kwargs)
def get(*args): return json.loads(run(list(args)))
base=Path(a.target).resolve(); assert base.is_dir(),'Select an existing verified encrypted target'
assert shutil.disk_usage(base).free>20*1024**3,'Keep at least 20 GiB free before downloading'
state=Path(a.runtime); state.mkdir(parents=True,mode=0o700,exist_ok=True)
with open(state/'release.lock','a') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    ns=get('get','namespace','handovertrack','-o','json'); assert ns['metadata']['labels']['app.kubernetes.io/part-of']=='handovertrack'
    deployments={n:get('get','deployment',n,'-o','json') for n in ['web','api','worker']}
    assert all(x['metadata']['labels']['app.kubernetes.io/part-of']=='handovertrack' for x in deployments.values())
    folder=base/('handovertrack-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'-'+secrets.token_hex(3)); folder.mkdir(mode=0o700)
    image=deployments['api']['spec']['template']['spec']['containers'][0]['image']; assert '@sha256:' in image
    helper='backup-'+secrets.token_hex(4); created=False; paused=[]
    receipt={'namespace':'handovertrack','at_unix':time.time(),'consistent':False,'hashes_verified':False,'image':image,'independent_restore_verified':False}
    def write(name,data):
        f=folder/name; f.write_bytes(data); f.chmod(0o600)
    try:
        for name,dep in deployments.items():
            run(['scale','deployment',name,'--current-replicas='+str(dep['spec']['replicas']),'--replicas=0']); paused.append(name)
        # Drain ALL owned writer pods before taking either half of the snapshot.
        for component in deployments:
            run(['wait','--for=delete','pod','-l','app.kubernetes.io/part-of=handovertrack,app.kubernetes.io/component='+component,'--timeout=180s'])
        pod={'apiVersion':'v1','kind':'Pod','metadata':{'name':helper,'namespace':'handovertrack','labels':{'app.kubernetes.io/part-of':'handovertrack','app.kubernetes.io/component':'backup'}},'spec':{'automountServiceAccountToken':False,'serviceAccountName':'runtime','restartPolicy':'Never','nodeSelector':{'kubernetes.io/hostname':'netcupmaniaserver'},'securityContext':{'runAsNonRoot':True,'runAsUser':1000,'runAsGroup':1000,'fsGroup':1000,'seccompProfile':{'type':'RuntimeDefault'}},'containers':[{'name':'backup','image':image,'command':['sleep','1800'],'securityContext':{'allowPrivilegeEscalation':False,'readOnlyRootFilesystem':True,'capabilities':{'drop':['ALL']}},'resources':{'requests':{'cpu':'100m','memory':'128Mi','ephemeral-storage':'128Mi'},'limits':{'cpu':'500m','memory':'256Mi','ephemeral-storage':'256Mi'}},'volumeMounts':[{'name':'media','mountPath':'/media','readOnly':True}]}],'volumes':[{'name':'media','persistentVolumeClaim':{'claimName':'media'}}]}}
        run(['create','-f','-'],input=json.dumps(pod).encode()); created=True
        run(['wait','--for=condition=Ready','pod/'+helper,'--timeout=120s'])
        db_size=int(run(['exec','database-0','--','psql','-U','postgres','-d','handovertrack','-At','-c',"SELECT pg_database_size('handovertrack')"]))
        media_size=int(run(['exec',helper,'--','node','-e',"const fs=require('fs');let n=0;function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){let q=p+'/'+e.name;if(e.isDirectory())walk(q);else if(e.isFile())n+=fs.statSync(q).size;else throw Error('Unexpected media file type')}}walk('/media');console.log(n)"]))
        assert shutil.disk_usage(base).free>20*1024**3+db_size*2+media_size*2, 'Insufficient independent target headroom'
        # Compress in the read-only helper before streaming. The archive still
        # contains full regular files for hardlinks, and every downloaded byte
        # is checked against the source inventory before a receipt is issued.
        for name,args in [('database.dump',['exec','database-0','--','pg_dump','-U','postgres','-d','handovertrack','-Fc']),('media.tar.gz',['exec',helper,'--','tar','--hard-dereference','-C','/media','-czf','-','.'])]:
            fd=os.open(folder/name,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
            with os.fdopen(fd,'wb') as out: subprocess.run(k+args,stdout=out,stderr=subprocess.DEVNULL,check=True); out.flush(); os.fsync(out.fileno())
        write('media-sha256.json', run(['exec',helper,'--','env','MEDIA_ROOT=/media','node','scripts/ops/media-inventory.mjs']))
        import tarfile
        expected=json.loads((folder/'media-sha256.json').read_text()); actual={}
        with tarfile.open(folder/'media.tar.gz', 'r:gz') as archive:
            for member in archive:
                if member.isdir(): continue
                assert member.isfile(), 'Unexpected archive member'
                h=hashlib.sha256(); stream=archive.extractfile(member)
                for chunk in iter(lambda:stream.read(1024*1024),b''): h.update(chunk)
                name=member.name[2:] if member.name.startswith('./') else member.name
                actual[name]=h.hexdigest()
        assert actual==expected, 'Source/download media checksums differ'
        # Exact named Secrets only; no shared-app or registry credentials.
        for kind,names in [('secret',['database-admin','runtime','migration','auth','trial-accounts']),('configmap',['runtime','database-init'])]:
            for name in names: write(kind+'-'+name+'.json',run(['get',kind,name,'-o','json']))
        write('deployments.json',json.dumps(deployments).encode())
        hashes={}
        for f in sorted(folder.iterdir()):
            h=hashlib.sha256()
            with f.open('rb') as src:
                for chunk in iter(lambda:src.read(1024*1024),b''): h.update(chunk)
            hashes[f.name]=h.hexdigest()
        receipt.update(consistent=True,hashes_verified=True,sha256=hashes)
        write('receipt.json',json.dumps(receipt,indent=2).encode())
        print('Consistent owned backup downloaded. Independent restore remains NOT RUN. Receipt: '+str(folder/'receipt.json'))
    finally:
        if created: subprocess.run(k+['delete','pod',helper,'--wait=true','--timeout=90s'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        errors=[]
        for name in paused:
            r=subprocess.run(k+['scale','deployment',name,'--current-replicas=0','--replicas='+str(deployments[name]['spec']['replicas'])],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            if r.returncode: errors.append(name)
        if errors: raise SystemExit('Writer resumption needs attention: '+','.join(errors))
